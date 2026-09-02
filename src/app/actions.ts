"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSession,
  getCurrentClub,
  hashPassword,
  hashOpaqueToken,
  newOpaqueToken,
  logout,
  touchActivity,
  verifyPassword,
  verifyPasswordAgainstDummy,
  revokeAllSessions,
} from "@/lib/auth";
import { geocode } from "@/lib/geo";
import { sendContactNotification, sendPasswordResetEmail, sendRegistrationConfirmationEmail, sendAccountValidatedEmail, sendAccountRefusedEmail, sendAdminNewRegistrationEmail, sendPasswordChangedEmail, sendPublicContactEmail } from "@/lib/mail";
import { isValidLigue, isValidDistrict } from "@/lib/ligues";
import { rateLimit, rateLimitByAccount, LOGIN_RATE_LIMIT, LOGIN_EMAIL_RATE_LIMIT, REGISTER_RATE_LIMIT, CONTACT_RATE_LIMIT, PUBLIC_CONTACT_RATE_LIMIT, UPLOAD_RATE_LIMIT, PASSWORD_RESET_RATE_LIMIT, RESET_SUBMIT_RATE_LIMIT } from "@/lib/rate-limit";
import { getClientIpAsync } from "@/lib/ip";
import { consumePendingOAuthProfile } from "@/lib/oauth-state";
import {
  DOM_EXT,
  STATUT_ANNONCE,
  getCategorie,
  isValidCategorie,
  isValidNiveauFor,
} from "@/lib/referential";
import { saveUpload, deleteUpload } from "@/lib/upload";
import {
  isValidCodePostal,
  isValidDate,
  isValidEmail,
  isValidHeure,
  isValidTelephone,
  normalizeHeure,
  validateLength,
  validatePassword,
  LIMITS,
} from "@/lib/validation";
import { todayISO } from "@/lib/utils";

export type ActionState = {
  ok?: boolean;
  error?: string;
  // Coordonnées du club annonceur, renvoyées uniquement après une mise en
  // relation effective (cf. Fix fuite de coordonnées). Jamais tirées du client.
  tel?: string;
  email?: string;
} | undefined;

/* --- Helpers --- */

async function getClientIp(): Promise<string> {
  return getClientIpAsync();
}

/* ---------------- Auth ---------------- */

// Verrouillage temporaire du compte après N échecs consécutifs (anti brute-
// force, y compris multi-IP : l'état est en base). Cf. schema.prisma
// (failedLoginAttempts / lockedUntil sur Club).
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

// Valide qu'un chemin de redirection est bien interne (anti open-redirect).
// On rejette :
//  - ce qui ne commence pas par "/"
//  - "//host" (autorité)
//  - "/\host" : les navigateurs normalisent '\' en '/', donc "/\host" devient
//    "//host" -> redirige vers host. C'est le contournement classique du test
//    `!startsWith("//")`.
//  - toute présence de ":" (bloque les schémas / "/http:..." / data:).
function safeRedirectPath(value: string): string | null {
  if (!value.startsWith("/")) return null;
  if (value[1] === "/" || value[1] === "\\") return null;
  if (value.includes(":")) return null;
  return value;
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting
  const ip = await getClientIp();
  if (!(await rateLimit(ip, "register", REGISTER_RATE_LIMIT))) {
    return { error: "Trop de tentatives. Réessayez dans un instant." };
  }

  const nom = String(formData.get("nom") ?? "").trim();
  const ville = String(formData.get("ville") ?? "").trim();
  const codePostal = String(formData.get("codePostal") ?? "").trim();
  const ligue = String(formData.get("ligue") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const licence = formData.get("licence") as File | null;

  if (!nom || !ville || !codePostal || !telephone || !email || !password)
    return { error: "Tous les champs marqués d'un * sont obligatoires." };

  // Validations de longueur
  const nomCheck = validateLength(nom, "Nom", LIMITS.NOM_MAX);
  if (!nomCheck.valid) return { error: nomCheck.error! };
  const villeCheck = validateLength(ville, "Ville", LIMITS.VILLE_MAX);
  if (!villeCheck.valid) return { error: villeCheck.error! };
  const telCheck = validateLength(telephone, "Téléphone", LIMITS.TELEPHONE_MAX);
  if (!telCheck.valid) return { error: telCheck.error! };

  // Validations de format
  if (!isValidLigue(ligue)) return { error: "Ligue obligatoire." };
  if (!isValidDistrict(ligue, district)) return { error: "District (sous-ligue) invalide pour cette ligue." };
  if (!isValidCodePostal(codePostal)) return { error: "Code postal invalide (5 chiffres requis)." };
  if (!isValidTelephone(telephone)) return { error: "Numéro de téléphone invalide." };
  if (!isValidEmail(email)) return { error: "Email invalide." };
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) return { error: pwCheck.error! };

  // Pré-vérification de l'email AVANT l'upload de la licence : si un compte
  // existe déjà, on échoue tôt sans stocker de fichier orphelin dans Supabase.
  // (Une race reste possible -> le catch P2002 ci-dessous gère le cas résiduel.)
  const existing = await prisma.club.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    // Message constant : ne pas révéler l'existence du compte (anti-énumération).
    return { error: "L'inscription n'a pas pu être finalisée." };
  }

  // Géocodage de la ville (avant l'upload, idem : on évite un fichier orphelin
  // si la ville est introuvable).
  // On garde le code postal saisi par l'utilisateur : l'API BAN renvoie le code
  // postal principal de la commune, pas les codes postaux secondaires (ex. 13013
  // -> 13001). La coordonnée GPS reste suffisamment précise pour la recherche par
  // rayon au niveau de la commune.
  const geo = (await geocode(`${ville} ${codePostal}`)) ?? (await geocode(ville));
  if (!geo) return { error: "Ville introuvable. Vérifiez le nom et le code postal." };
  const codePostalFinal = isValidCodePostal(codePostal) ? codePostal : geo.codePostal;

  let licenceUrl: string | null = null;
  try {
    licenceUrl = await saveUpload(licence, "licence");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!licenceUrl) return { error: "La licence de dirigeant/éducateur est obligatoire." };

  const hash = await hashPassword(password);
  try {
    const club = await prisma.club.create({
      data: {
        nom,
        ville: geo.ville,
        codePostal: codePostalFinal,
        latitude: geo.latitude,
        longitude: geo.longitude,
        ligue,
        district,
        telephone,
        email,
        passwordHash: hash,
        licenceFichierUrl: licenceUrl,
        role: "club",
        statutVerification: "en_attente",
      },
    });
    await createSession(club.id);

    // Email de confirmation d'inscription (fire-and-forget : un souci SMTP
    // ne doit pas faire échouer l'inscription, déjà persistée en base).
    await sendRegistrationConfirmationEmail({ to: email, nom }).catch(() => {});
    // Notification admin : prévient la boîte de modération qu'une licence est à
    // valider. Fire-and-forget (même raison).
    await sendAdminNewRegistrationEmail({
      nom,
      email,
      ville: geo.ville,
      telephone,
    }).catch(() => {});
  } catch (e) {
    // Message constant : ne pas révéler l'existence d'un compte (anti-énumération).
    if ((e as { code?: string }).code === "P2002")
      return { error: "L'inscription n'a pas pu être finalisée." };
    return { error: "Erreur lors de la création du compte." };
  }

  revalidatePath("/");
  redirect("/dashboard?welcome=1");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting
  const ip = await getClientIp();
  if (!(await rateLimit(ip, "login", LOGIN_RATE_LIMIT))) {
    return { error: "Trop de tentatives. Réessayez dans un instant." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email et mot de passe requis." };

  // Rate-limit par identifiant saisi (même si l'email n'existe pas) pour
  // compliquer les attaques distribuées ciblant un compte.
  if (!(await rateLimitByAccount(email, "login-email", LOGIN_EMAIL_RATE_LIMIT))) {
    return { error: "Trop de tentatives. Réessayez dans un instant." };
  }

  // Prévention DoS bcrypt : refuser les mots de passe trop longs sans révéler la raison
  if (password.length > LIMITS.PASSWORD_MAX) {
    return { error: "Identifiants incorrects." };
  }

  const club = await prisma.club.findUnique({ where: { email } });

  // Verrouillage actif ? On vérifie AVANT le bcrypt pour ne rien laisser fuir.
  // On garde le même message générique qu'un échec classique pour ne pas révéler
  // l'existence du compte ni son état de verrouillage (anti-énumération).
  const now = new Date();
  const isLocked = club?.lockedUntil && club.lockedUntil > now;
  // Verrouillage expiré : on réarme le compteur avant de retenter.
  if (club?.lockedUntil && club.lockedUntil <= now) {
    await prisma.club
      .update({ where: { id: club.id }, data: { failedLoginAttempts: 0, lockedUntil: null } })
      .catch(() => {});
  }

  // Vérification du mot de passe. Si l'email n'existe pas ou est verrouillé,
  // on exécute quand même un bcrypt factice pour égaliser le temps de réponse
  // (anti-énumération par oracle de timing).
  const passwordOk = club && !isLocked
    ? await verifyPassword(password, club.passwordHash)
    : await verifyPasswordAgainstDummy(password).then(() => false);

  if (!club || !passwordOk || isLocked) {
    if (club) {
      const attempts = (club.failedLoginAttempts ?? 0) + 1;
      const lock = attempts >= MAX_FAILED_LOGINS;
      await prisma.club
        .update({
          where: { id: club.id },
          data: {
            failedLoginAttempts: attempts,
            lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
          },
        })
        .catch(() => {});
    }
    return { error: "Identifiants incorrects." };
  }

  // Succès : on réinitialise le compteur d'échecs.
  await prisma.club
    .update({ where: { id: club.id }, data: { failedLoginAttempts: 0, lockedUntil: null } })
    .catch(() => {});

  // Si le compte était verrouillé (cas normalement impossible ici car on
  // refuse le login pendant le verrou), on empêche la connexion.
  if (isLocked) {
    return { error: "Identifiants incorrects." };
  }

  await createSession(club.id);
  revalidatePath("/");

  const redirectTo = String(formData.get("redirect") ?? "").trim();
  const fallback = club.role === "admin" ? "/admin" : "/dashboard";
  // safeRedirectPath rejette les open-redirects (//host, /\host, schémas).
  const dest = safeRedirectPath(redirectTo) ?? fallback;
  redirect(dest);
}

export async function logoutAction(): Promise<void> {
  await logout();
  revalidatePath("/");
  redirect("/");
}

/* ---------------- Mot de passe oublié ---------------- */

// Durée de validité d'un lien de réinitialisation.
const RESET_TOKEN_MINUTES = 15;

// Réponse constante pour ne pas révéler si un email existe (anti-énumération).
const RESET_REQUEST_OK = { ok: true as const };

export async function requestPasswordResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  // Même si l'email est invalide, on renvoie le message générique ok pour ne
  // pas divulguer d'information sur les comptes existants.
  if (!isValidEmail(email)) return RESET_REQUEST_OK;

  // On récupère le club AVANT le rate-limit pour pouvoir limiter par compte.
  // L'existence du compte n'est pas révélée au client (même réponse ok).
  const club = await prisma.club.findUnique({ where: { email }, select: { id: true } });
  if (!club) return RESET_REQUEST_OK;

  // Rate limiting par IP ET par compte (anti email-bombing, y compris distribué).
  const ip = await getClientIp();
  const [ipOk, accountOk] = await Promise.all([
    rateLimit(ip, "password-reset", PASSWORD_RESET_RATE_LIMIT),
    rateLimitByAccount(club.id, "password-reset", { maxRequests: 2, windowMs: 3_600_000 }), // 2 demandes / heure par compte
  ]);
  if (!ipOk || !accountOk) {
    return RESET_REQUEST_OK; // ne pas révéler que la limite a été atteinte
  }

  // Invalide les tokens non-utilisés précédents : un seul lien actif à la fois
  // (réduit la surface d'attaque si plusieurs emails ont été générés).
  await prisma.passwordResetToken
    .deleteMany({ where: { clubId: club.id, usedAt: null } })
    .catch(() => {});

  // Nettoyage opportuniste des tokens expirés de ce club (fire-and-forget)
  await prisma.passwordResetToken
    .deleteMany({ where: { clubId: club.id, expiresAt: { lt: new Date() } } })
    .catch(() => {});

  const token = newOpaqueToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: { clubId: club.id, tokenHash: hashOpaqueToken(token), expiresAt },
  });

  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  // Envoi (ou fallback console si SMTP non configuré — utile en dev).
  await sendPasswordResetEmail({ to: email, resetUrl }).catch(() => {});

  // Message générique constant : ne révèle pas l'existence du compte.
  return RESET_REQUEST_OK;
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting (anti spam de tokens aléatoires -> DoS de lookups DB).
  const ip = await getClientIp();
  if (!(await rateLimit(ip, "reset-submit", RESET_SUBMIT_RATE_LIMIT))) {
    return { error: "Trop de tentatives. Réessayez dans un instant." };
  }

  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { error: "Lien invalide ou expiré." };
  if (password !== confirm) return { error: "Les mots de passe ne correspondent pas." };
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) return { error: pwCheck.error! };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: { club: { select: { id: true, email: true, nom: true } } },
  });
  if (!record) return { error: "Lien invalide ou expiré." };
  if (record.usedAt) {
    return { error: "Ce lien a déjà été utilisé. Redemandez un nouveau lien de réinitialisation." };
  }
  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
    return { error: "Lien expiré. Redemandez un nouveau lien de réinitialisation." };
  }

  const newHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.club.update({
      where: { id: record.clubId },
      data: {
        passwordHash: newHash,
        // Réarme le verrouillage login : un utilisateur qui change son mot de
        // passe (y compris depuis un compte temporairement verrouillé) doit
        // pouvoir se reconnecter immédiatement.
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    // Marque le token comme utilisé (audit) — usage unique.
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Invalide toutes les sessions du club : force la reconnexion et empêche
    // une session volée de survivre au changement de mot de passe.
    prisma.session.deleteMany({ where: { clubId: record.clubId } }),
  ]);

  // Notifie le propriétaire du compte qu'un changement de mot de passe vient
  // d'être effectué (fire-and-forget : la transaction est déjà validée).
  await sendPasswordChangedEmail({ to: record.club.email, nom: record.club.nom }).catch(() => {});

  revalidatePath("/login");
  redirect("/login?reset=ok");
}

/* ---------------- Équipes ---------------- */

export async function createEquipeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const club = await getCurrentClub();
  if (!club || club.role !== "club") return { error: "Non autorisé." };
  if (club.statutVerification !== "valide")
    return { error: "Votre compte doit être validé pour ajouter une équipe." };

  const categorie = String(formData.get("categorie") ?? "");
  const niveau = String(formData.get("niveau") ?? "");
  if (!isValidCategorie(categorie)) return { error: "Catégorie invalide." };
  if (niveau && !isValidNiveauFor(categorie, niveau)) return { error: "Niveau invalide pour cette catégorie." };

  await prisma.equipe.create({ data: { clubId: club.id, categorie, niveau: niveau || null } });
  await touchActivity(club.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteEquipeAction(formData: FormData): Promise<void> {
  const club = await getCurrentClub();
  if (!club) return;
  const id = String(formData.get("id") ?? "");
  // Garde anti-perte de données : supprimer une équipe supprime en cascade ses
  // annonces (onDelete: Cascade). On bloque tant qu'il reste des annonces
  // ouvertes — l'utilisateur doit d'abord les marquer confirmées/annulées ou les
  // supprimer explicitement. Le statut « passé » (confirmé/annulé) reste
  // supprimable : c'est du nettoyage d'archive, pas une perte de match actif.
  const ouvertes = await prisma.annonce.count({
    where: { equipeId: id, clubId: club.id, statut: "ouvert" },
  });
  if (ouvertes > 0) {
    redirect("/dashboard?equipe_err=1");
  }
  await prisma.equipe.deleteMany({ where: { id, clubId: club.id } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/* ---------------- Annonces ---------------- */

export async function createAnnonceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting anti-spam d'annonces (10/min par IP).
  const ip = await getClientIp();
  if (!(await rateLimit(ip, "create-annonce", { maxRequests: 10, windowMs: 60_000 }))) {
    return { error: "Trop de publications. Réessayez dans un instant." };
  }

  const club = await getCurrentClub();
  if (!club || club.role !== "club") return { error: "Non autorisé." };
  if (club.statutVerification !== "valide")
    return { error: "Votre compte doit être validé pour publier une annonce." };

  const equipeId = String(formData.get("equipeId") ?? "");
  const date = String(formData.get("date") ?? "");
  const heure = normalizeHeure(String(formData.get("heure") ?? ""));
  const dom = String(formData.get("domicileExterieur") ?? "");
  const stadeDispo = formData.get("stadeDispo") === "on";
  const stadeNom = String(formData.get("stadeNom") ?? "").trim();
  const arbitreDispo = formData.get("arbitreDispo") === "on";
  const niveauSouhaite = String(formData.get("niveauSouhaite") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!equipeId || !date || !heure) return { error: "Équipe, date et horaire sont obligatoires." };
  if (!isValidDate(date)) return { error: "Date invalide (format AAAA-MM-JJ)." };
  if (date < todayISO()) return { error: "La date ne peut pas être antérieure à aujourd'hui." };
  if (!isValidHeure(heure)) return { error: "Horaire invalide (ex. 13, 14:00 ou 14:00-16:00)." };
  if (!DOM_EXT.includes(dom as never)) return { error: "Domicile/Extérieur invalide." };
  if (stadeDispo && !stadeNom) return { error: "Indiquez le nom du stade si le stade est disponible." };
  if (stadeNom) {
    const check = validateLength(stadeNom, "Nom du stade", LIMITS.STADE_NOM_MAX);
    if (!check.valid) return { error: check.error! };
  }
  if (note) {
    const check = validateLength(note, "Note", LIMITS.NOTE_MAX);
    if (!check.valid) return { error: check.error! };
  }
  // l'équipe doit appartenir au club
  const equipe = await prisma.equipe.findFirst({ where: { id: equipeId, clubId: club.id } });
  if (!equipe) return { error: "Équipe introuvable." };

  if (niveauSouhaite) {
    const cat = getCategorie(equipe.categorie);
    if (cat && !cat.niveaux.includes(niveauSouhaite))
      return { error: "Niveau souhaité incompatible avec la catégorie de l'équipe." };
  }

  await prisma.annonce.create({
    data: {
      equipeId,
      clubId: club.id,
      date,
      heure,
      domicileExterieur: dom,
      stadeDispo,
      stadeNom: stadeDispo ? stadeNom : null,
      stadeVille: stadeDispo ? club.ville : null,
      arbitreDispo,
      niveauSouhaite: niveauSouhaite || null,
      note: note || null,
      statut: "ouvert",
    },
  });
  await touchActivity(club.id);
  revalidatePath("/");
  revalidatePath("/dashboard");
  updateTag("annonces");
  updateTag("landing");
  updateTag("clubs");
  redirect("/dashboard");
}

export async function updateAnnonceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const club = await getCurrentClub();
  if (!club || club.role !== "club") return { error: "Non autorisé." };
  if (club.statutVerification !== "valide")
    return { error: "Votre compte doit être validé pour modifier une annonce." };
  const id = String(formData.get("id") ?? "");

  const annonce = await prisma.annonce.findFirst({ where: { id, clubId: club.id } });
  if (!annonce) return { error: "Annonce introuvable." };
  if (annonce.date < todayISO()) return { error: "Cette annonce est passée et ne peut plus être modifiée." };

  const date = String(formData.get("date") ?? "");
  const heure = normalizeHeure(String(formData.get("heure") ?? ""));
  const dom = String(formData.get("domicileExterieur") ?? "");
  const stadeDispo = formData.get("stadeDispo") === "on";
  const stadeNom = String(formData.get("stadeNom") ?? "").trim();
  const arbitreDispo = formData.get("arbitreDispo") === "on";
  const niveauSouhaite = String(formData.get("niveauSouhaite") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!date || !heure) return { error: "Date et horaire sont obligatoires." };
  if (!isValidDate(date)) return { error: "Date invalide (format AAAA-MM-JJ)." };
  if (date < todayISO()) return { error: "La date ne peut pas être antérieure à aujourd'hui." };
  if (!isValidHeure(heure)) return { error: "Horaire invalide (ex. 13, 14:00 ou 14:00-16:00)." };
  if (!DOM_EXT.includes(dom as never)) return { error: "Domicile/Extérieur invalide." };
  if (stadeDispo && !stadeNom) return { error: "Indiquez le nom du stade si le stade est disponible." };
  if (stadeNom) {
    const check = validateLength(stadeNom, "Nom du stade", LIMITS.STADE_NOM_MAX);
    if (!check.valid) return { error: check.error! };
  }
  if (note) {
    const check = validateLength(note, "Note", LIMITS.NOTE_MAX);
    if (!check.valid) return { error: check.error! };
  }
  // La vérification d'ownership est refaite dans la requête d'écriture
  // (updateMany) pour éviter toute TOCTOU/race condition.
  const { count } = await prisma.annonce.updateMany({
    where: { id, clubId: club.id },
    data: {
      date,
      heure,
      domicileExterieur: dom,
      stadeDispo,
      stadeNom: stadeDispo ? stadeNom : null,
      stadeVille: stadeDispo ? club.ville : null,
      arbitreDispo,
      niveauSouhaite: niveauSouhaite || null,
      note: note || null,
    },
  });
  if (count === 0) return { error: "Annonce introuvable." };
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/annonces/" + id);
  updateTag("annonces");
  updateTag("landing");
  updateTag("matchs-confirmes");
  updateTag("clubs");
  redirect("/dashboard");
}

export async function setAnnonceStatutAction(formData: FormData): Promise<void> {
  const club = await getCurrentClub();
  if (!club || club.role !== "club") return;
  if (club.statutVerification !== "valide") return;
  const id = String(formData.get("id") ?? "");
  const statut = String(formData.get("statut") ?? "");
  if (!STATUT_ANNONCE.includes(statut as never)) return;

  const data: Record<string, unknown> = { statut };
  if (statut === "confirme") {
    const adversaireNom = String(formData.get("adversaireNom") ?? "").trim();
    if (!adversaireNom) {
      redirect("/dashboard?adversaire_err=1");
    }
    const check = validateLength(adversaireNom, "Nom de l'adversaire", LIMITS.ADVERSAIRE_NOM_MAX);
    if (!check.valid) {
      redirect("/dashboard?adversaire_err=1");
    }
    data.adversaireNom = adversaireNom;
  }

  await prisma.annonce.updateMany({ where: { id, clubId: club.id }, data });
  await touchActivity(club.id);
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/matchs-confirmees");
  revalidatePath("/annonces/" + id);
  updateTag("annonces");
  updateTag("landing");
  updateTag("matchs-confirmes");
  updateTag("clubs");
  redirect("/dashboard");
}

export async function deleteAnnonceAction(formData: FormData): Promise<void> {
  const club = await getCurrentClub();
  if (!club || club.role !== "club") return;
  if (club.statutVerification !== "valide") return;
  const id = String(formData.get("id") ?? "");
  await prisma.annonce.deleteMany({ where: { id, clubId: club.id } });
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/annonces/" + id);
  updateTag("annonces");
  updateTag("landing");
  updateTag("matchs-confirmes");
  updateTag("clubs");
  redirect("/dashboard");
}

/* ---------------- Mise en contact ---------------- */

export async function contacterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting
  const ip = await getClientIp();
  if (!(await rateLimit(ip, "contact", CONTACT_RATE_LIMIT))) {
    return { error: "Trop de demandes. Réessayez dans un instant." };
  }

  const club = await getCurrentClub();
  if (!club) return { error: "Vous devez être connecté pour contacter un club." };
  if (club.statutVerification !== "valide")
    return { error: "Votre compte doit être validé pour contacter un club." };

  const annonceId = String(formData.get("annonceId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (message) {
    const check = validateLength(message, "Message", LIMITS.MESSAGE_MAX);
    if (!check.valid) return { error: check.error! };
  }

  const annonce = await prisma.annonce.findUnique({
    where: { id: annonceId },
    include: { equipe: true, club: { select: { id: true, email: true, telephone: true } } },
  });
  if (!annonce || annonce.statut !== "ouvert") return { error: "Annonce non disponible." };
  // Auto-expiration : on ne contacte pas une annonce à date passée (anti
  // annonces fantômes + anti-harcèlement sur des annonces périmées dont les
  // coordonnées resteraient révélables).
  if (annonce.date < todayISO()) return { error: "Cette annonce est expirée." };
  if (annonce.clubId === club.id) return { error: "Vous ne pouvez pas contacter votre propre annonce." };

  await touchActivity(club.id);
  // L'email est await (pour laisser le temps à l'envoi sur Vercel avant la
  // fin de la fonction) mais son échec ne remonte pas à l'utilisateur.
  await sendContactNotification({
    to: annonce.club.email,
    annonceLabel: `${annonce.equipe.categorie} · ${annonce.date} · ${annonce.heure}`,
    demandeurClub: club.nom,
    demandeurEmail: club.email,
    demandeurTelephone: club.telephone,
    message: message || undefined,
  }).catch(() => {});

  revalidatePath(`/annonces/${annonce.id}`);
  // Coordonnées du club annonceur révélées au demandeur uniquement après une
  // demande effective (cf. PRD). Elles proviennent du serveur, jamais du client
  // — évite la fuite via les props du composant avant contact.
  return { ok: true, tel: annonce.club.telephone, email: annonce.club.email };
}

/* ---------------- Formulaire de contact public ---------------- */

export async function sendPublicContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting strict : formulaire public, non authentifié.
  const ip = await getClientIp();
  if (!(await rateLimit(ip, "public-contact", PUBLIC_CONTACT_RATE_LIMIT))) {
    return { error: "Trop de messages envoyés. Réessayez plus tard." };
  }

  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sujet = String(formData.get("sujet") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!nom || !email || !sujet || !message) {
    return { error: "Tous les champs sont obligatoires." };
  }

  const nomCheck = validateLength(nom, "Nom", LIMITS.NOM_MAX);
  if (!nomCheck.valid) return { error: nomCheck.error! };
  const sujetCheck = validateLength(sujet, "Sujet", LIMITS.NOM_MAX);
  if (!sujetCheck.valid) return { error: sujetCheck.error! };
  const messageCheck = validateLength(message, "Message", LIMITS.MESSAGE_MAX);
  if (!messageCheck.valid) return { error: messageCheck.error! };
  if (!isValidEmail(email)) return { error: "Email invalide." };

  // Relai email vers l'administrateur / support (fire-and-forget : un souci SMTP
  // ne doit pas afficher une erreur technique au visiteur).
  await sendPublicContactEmail({ nom, email, sujet, message }).catch(() => {});

  return { ok: true };
}

/* ---------------- Admin (vérification licences) ---------------- */

export async function adminValidateAction(formData: FormData): Promise<void> {
  const me = await getCurrentClub();
  if (!me || me.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  // Récupère email + nom du club (role: club) pour l'email de notification.
  const club = await prisma.club.findFirst({
    where: { id, role: "club" },
    select: { email: true, nom: true },
  });
  if (!club) return;
  await prisma.club.updateMany({ where: { id, role: "club" }, data: { statutVerification: "valide", refusMotif: null } });
  // Email "compte validé" (fire-and-forget : la validation est déjà faite).
  await sendAccountValidatedEmail({ to: club.email, nom: club.nom }).catch(() => {});
  revalidatePath("/admin");
  redirect("/admin");
}

export async function adminRefuseAction(formData: FormData): Promise<void> {
  const me = await getCurrentClub();
  if (!me || me.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  const motif = String(formData.get("motif") ?? "").trim().slice(0, LIMITS.REFUS_MOTIF_MAX);
  const motifFinal = motif || "Licence non valide.";
  // Récupère email + nom du club (role: club) pour l'email de notification.
  const club = await prisma.club.findFirst({
    where: { id, role: "club" },
    select: { email: true, nom: true },
  });
  if (!club) return;
  await prisma.club.updateMany({
    where: { id, role: "club" },
    data: { statutVerification: "refuse", refusMotif: motifFinal },
  });
  // Email "compte refusé" (fire-and-forget : le refus est déjà fait).
  await sendAccountRefusedEmail({ to: club.email, nom: club.nom, motif: motifFinal }).catch(() => {});
  revalidatePath("/admin");
  redirect("/admin");
}

// Suppression définitive d'un club par l'admin. Supprime le club ET tout ce qui
// en dépend (équipes, annonces, contacts, sessions, tokens de reset) grâce aux
// `onDelete: Cascade` du schéma. Nettoie aussi best-effort les fichiers Storage
// (logo public + licence privée) — un orphan ne doit pas bloquer la suppression.
// Jamais un compte admin : on filtre `role: "club"`.
export async function adminDeleteClubAction(formData: FormData): Promise<void> {
  const me = await getCurrentClub();
  if (!me || me.role !== "admin") return;
  const id = String(formData.get("id") ?? "");

  // Récupère les URL des fichiers à nettoyer (et verrouille role: club).
  const club = await prisma.club.findFirst({
    where: { id, role: "club" },
    select: { logoUrl: true, licenceFichierUrl: true },
  });
  if (!club) return;

  // Suppression du club — les cascades DB font le reste pour les relations.
  await prisma.club.delete({ where: { id } });

  // Nettoyage Storage best-effort (après la suppression DB : un orphan fichier
  // n'empêche pas la suppression du compte, et l'inverse non plus).
  await Promise.all([
    deleteUpload("logo", club.logoUrl),
    deleteUpload("licence", club.licenceFichierUrl),
  ]).catch(() => {});

  revalidatePath("/admin");
  revalidatePath("/annonces");
  redirect("/admin");
}

/* ---------------- Profil club ---------------- */

export async function updateProfilAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const club = await getCurrentClub();
  if (!club || club.role !== "club") return { error: "Non autorisé." };

  const nom = String(formData.get("nom") ?? "").trim();
  const ville = String(formData.get("ville") ?? "").trim();
  const codePostal = String(formData.get("codePostal") ?? "").trim();
  const ligue = String(formData.get("ligue") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!nom || !ville || !codePostal || !telephone || !email) {
    return { error: "Tous les champs marqués d'un * sont obligatoires." };
  }

  const nomCheck = validateLength(nom, "Nom", LIMITS.NOM_MAX);
  if (!nomCheck.valid) return { error: nomCheck.error! };
  const villeCheck = validateLength(ville, "Ville", LIMITS.VILLE_MAX);
  if (!villeCheck.valid) return { error: villeCheck.error! };
  const telCheck = validateLength(telephone, "Téléphone", LIMITS.TELEPHONE_MAX);
  if (!telCheck.valid) return { error: telCheck.error! };

  if (!isValidLigue(ligue)) return { error: "Ligue obligatoire." };
  if (!isValidDistrict(ligue, district)) return { error: "District invalide pour cette ligue." };
  if (!isValidCodePostal(codePostal)) return { error: "Code postal invalide (5 chiffres requis)." };
  if (!isValidTelephone(telephone)) return { error: "Numéro de téléphone invalide." };
  if (!isValidEmail(email)) return { error: "Email invalide." };

  // Si l'email change, vérifier qu'il n'est pas déjà utilisé par un autre club.
  const emailChanged = email !== club.email;
  if (emailChanged) {
    const existing = await prisma.club.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      // Message constant : ne pas révéler l'existence d'un autre compte.
      return { error: "La mise à jour n'a pas pu être effectuée." };
    }
  }

  // Géocodage pour récupérer la ville normalisée et les coordonnées GPS.
  // Le code postal saisi est conservé s'il est valide.
  const geo = (await geocode(`${ville} ${codePostal}`)) ?? (await geocode(ville));
  if (!geo) return { error: "Ville introuvable. Vérifiez le nom et le code postal." };
  const codePostalFinal = isValidCodePostal(codePostal) ? codePostal : geo.codePostal;

  await prisma.club.update({
    where: { id: club.id },
    data: {
      nom,
      ville: geo.ville,
      codePostal: codePostalFinal,
      latitude: geo.latitude,
      longitude: geo.longitude,
      ligue,
      district,
      telephone,
      email,
    },
  });
  await touchActivity(club.id);

  // Si l'email a changé, on révoque toutes les sessions : un attaquant qui aurait
  // volé la session ne peut plus la conserver après un changement d'email.
  if (emailChanged) {
    await revokeAllSessions(club.id);
    await logout();
    revalidatePath("/");
    redirect("/login?email_changed=1");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profil");
  revalidatePath(`/clubs/${club.id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function logoutAllDevicesAction(): Promise<void> {
  const club = await getCurrentClub();
  if (!club) return;

  await revokeAllSessions(club.id);
  // Supprime aussi le cookie courant.
  await logout();

  revalidatePath("/");
  redirect("/login");
}

/* ---------------- Profil club : logo ---------------- */

export async function updateLogoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting
  const ip = await getClientIp();
  if (!(await rateLimit(ip, "upload", UPLOAD_RATE_LIMIT))) {
    return { error: "Trop de tentatives. Réessayez dans un instant." };
  }

  const club = await getCurrentClub();
  if (!club || club.role !== "club") return { error: "Non autorisé." };

  const file = formData.get("logo") as File | null;
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "Sélectionnez une image." };
  }

  // Côté serveur : on n'accepte que des images (la licence peut être un PDF,
  // mais un logo doit rester une image).
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (!/^\.(png|jpe?g|webp)$/.test(ext)) {
    return { error: "Format de logo non autorisé (PNG, JPG ou WebP)." };
  }

  let url: string;
  try {
    const saved = await saveUpload(file, "logo");
    if (!saved) return { error: "Le fichier n'a pas pu être enregistré." };
    // saveUpload renvoie l'URL publique Supabase (bucket public "logos"),
    // servie directement par le CDN Supabase — stockée telle quelle.
    url = saved;
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Supprime l'ancien logo du bucket (best-effort) avant de stocker la nouvelle URL.
  // On garde l'ancienne URL en mémoire pour ne pas la perdre en cas d'échec DB.
  const oldLogoUrl = club.logoUrl;
  await prisma.club.update({ where: { id: club.id }, data: { logoUrl: url } });
  if (oldLogoUrl) {
    await deleteUpload("logo", oldLogoUrl).catch(() => {});
  }
  await touchActivity(club.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profil");
  revalidatePath(`/clubs/${club.id}`);
  revalidatePath("/");
  return { ok: true };
}

/* ---------------- OAuth — complétion d'inscription ---------------- */

export async function completeOAuthRegisterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  if (!(await rateLimit(ip, "oauth-register", REGISTER_RATE_LIMIT))) {
    return { error: "Trop de tentatives. Réessayez dans un instant." };
  }

  const pending = await consumePendingOAuthProfile();
  if (!pending) {
    return { error: "Session d'inscription expirée. Veuillez recommencer." };
  }

  const nom = String(formData.get("nom") ?? "").trim();
  const ville = String(formData.get("ville") ?? "").trim();
  const codePostal = String(formData.get("codePostal") ?? "").trim();
  const ligue = String(formData.get("ligue") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const licence = formData.get("licence") as File | null;

  if (!nom || !ville || !codePostal || !telephone || !ligue || !district) {
    return { error: "Tous les champs marqués d'un * sont obligatoires." };
  }

  const nomCheck = validateLength(nom, "Nom", LIMITS.NOM_MAX);
  if (!nomCheck.valid) return { error: nomCheck.error! };
  const villeCheck = validateLength(ville, "Ville", LIMITS.VILLE_MAX);
  if (!villeCheck.valid) return { error: villeCheck.error! };
  const telCheck = validateLength(telephone, "Téléphone", LIMITS.TELEPHONE_MAX);
  if (!telCheck.valid) return { error: telCheck.error! };

  if (!isValidLigue(ligue)) return { error: "Ligue obligatoire." };
  if (!isValidDistrict(ligue, district)) return { error: "District invalide pour cette ligue." };
  if (!isValidCodePostal(codePostal)) return { error: "Code postal invalide (5 chiffres requis)." };
  if (!isValidTelephone(telephone)) return { error: "Numéro de téléphone invalide." };

  const existing = await prisma.club.findUnique({
    where: { email: pending.email },
    select: { id: true },
  });
  if (existing) {
    return { error: "L'inscription n'a pas pu être finalisée." };
  }

  const geo = (await geocode(`${ville} ${codePostal}`)) ?? (await geocode(ville));
  if (!geo) return { error: "Ville introuvable. Vérifiez le nom et le code postal." };
  const codePostalFinal = isValidCodePostal(codePostal) ? codePostal : geo.codePostal;

  let licenceUrl: string | null = null;
  try {
    licenceUrl = await saveUpload(licence, "licence");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!licenceUrl) return { error: "La licence de dirigeant/éducateur est obligatoire." };

  try {
    const club = await prisma.club.create({
      data: {
        nom,
        ville: geo.ville,
        codePostal: codePostalFinal,
        latitude: geo.latitude,
        longitude: geo.longitude,
        ligue,
        district,
        telephone,
        email: pending.email,
        passwordHash: null,
        licenceFichierUrl: licenceUrl,
        role: "club",
        statutVerification: "en_attente",
        oauthProvider: pending.provider,
        oauthProviderId: pending.providerId,
        oauthName: pending.name ?? null,
        oauthPicture: pending.picture ?? null,
      },
    });
    await createSession(club.id);

    await sendRegistrationConfirmationEmail({ to: pending.email, nom }).catch(() => {});
    await sendAdminNewRegistrationEmail({
      nom,
      email: pending.email,
      ville: geo.ville,
      telephone,
    }).catch(() => {});
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      return { error: "L'inscription n'a pas pu être finalisée." };
    return { error: "Erreur lors de la création du compte." };
  }

  revalidatePath("/");
  redirect("/dashboard?welcome=1");
}