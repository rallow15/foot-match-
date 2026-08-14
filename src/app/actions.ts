"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  createSession,
  getCurrentClub,
  hashPassword,
  logout,
  touchActivity,
  verifyPassword,
} from "@/lib/auth";
import { geocode } from "@/lib/geo";
import { sendContactNotification } from "@/lib/mail";
import { isValidLigue, isValidDistrict } from "@/lib/ligues";
import { rateLimit, LOGIN_RATE_LIMIT, REGISTER_RATE_LIMIT, CONTACT_RATE_LIMIT, UPLOAD_RATE_LIMIT } from "@/lib/rate-limit";
import {
  DOM_EXT,
  STATUT_ANNONCE,
  getCategorie,
  isValidCategorie,
  isValidNiveauFor,
} from "@/lib/referential";
import { saveUpload } from "@/lib/upload";
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

export type ActionState = {
  ok?: boolean;
  error?: string;
  // Coordonnées du club annonceur, renvoyées uniquement après une mise en
  // relation effective (cf. Fix fuite de coordonnées). Jamais tirées du client.
  tel?: string;
  email?: string;
} | undefined;

/* --- Helpers --- */

// IP client pour le rate limiting.
// En production derrière Vercel, `x-vercel-forwarded-for` est l'IP réelle du
// client, non falsifiable par le requérant. On privilégie donc cette en-tête ;
// à défaut on prend la dernière IP de `x-forwarded-for` (proxy de confiance le
// plus proche, moins falsifiable que la première). Le rate limiting reste
// « best-effort » : in-memory et mono-instance (cf. rate-limit.ts).
async function getClientIp(): Promise<string> {
  const h = await headers();
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return h.get("x-real-ip")?.trim() ?? "unknown";
}

/* ---------------- Auth ---------------- */

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting
  const ip = await getClientIp();
  if (!rateLimit(ip, REGISTER_RATE_LIMIT)) {
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

  let licenceUrl: string | null = null;
  try {
    licenceUrl = await saveUpload(licence, "licence");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!licenceUrl) return { error: "La licence de dirigeant/éducateur est obligatoire." };

  // Géocodage de la ville
  const geo = (await geocode(`${ville} ${codePostal}`)) ?? (await geocode(ville));
  if (!geo) return { error: "Ville introuvable. Vérifiez le nom et le code postal." };

  const hash = await hashPassword(password);
  try {
    const club = await prisma.club.create({
      data: {
        nom,
        ville: geo.ville,
        codePostal: geo.codePostal || codePostal,
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
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      return { error: "Un compte existe déjà avec cet email." };
    return { error: "Erreur lors de la création du compte." };
  }

  revalidatePath("/");
  redirect("/dashboard?welcome=1");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting
  const ip = await getClientIp();
  if (!rateLimit(ip, LOGIN_RATE_LIMIT)) {
    return { error: "Trop de tentatives. Réessayez dans un instant." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email et mot de passe requis." };

  // Prévention DoS bcrypt : refuser les mots de passe trop longs sans révéler la raison
  if (password.length > LIMITS.PASSWORD_MAX) {
    return { error: "Identifiants incorrects." };
  }

  const club = await prisma.club.findUnique({ where: { email } });
  if (!club || !(await verifyPassword(password, club.passwordHash)))
    return { error: "Identifiants incorrects." };

  await createSession(club.id);
  revalidatePath("/");

  const redirectTo = String(formData.get("redirect") ?? "").trim();
  // On n'accepte qu'un chemin interne : on refuse les URLs protocol-relatives
  // (ex. "//evil.com") qui redirigeraient hors-site (open redirect).
  const dest =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : club.role === "admin"
        ? "/admin"
        : "/dashboard";
  redirect(dest);
}

export async function logoutAction(): Promise<void> {
  await logout();
  revalidatePath("/");
  redirect("/");
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
  await prisma.equipe.deleteMany({ where: { id, clubId: club.id } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/* ---------------- Annonces ---------------- */

export async function createAnnonceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
  redirect("/dashboard");
}

export async function updateAnnonceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const club = await getCurrentClub();
  if (!club || club.role !== "club") return { error: "Non autorisé." };
  const id = String(formData.get("id") ?? "");

  const annonce = await prisma.annonce.findFirst({ where: { id, clubId: club.id } });
  if (!annonce) return { error: "Annonce introuvable." };

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

  await prisma.annonce.update({
    where: { id },
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
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function setAnnonceStatutAction(formData: FormData): Promise<void> {
  const club = await getCurrentClub();
  if (!club) return;
  const id = String(formData.get("id") ?? "");
  const statut = String(formData.get("statut") ?? "");
  if (!STATUT_ANNONCE.includes(statut as never)) return;
  await prisma.annonce.updateMany({ where: { id, clubId: club.id }, data: { statut } });
  await touchActivity(club.id);
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteAnnonceAction(formData: FormData): Promise<void> {
  const club = await getCurrentClub();
  if (!club) return;
  const id = String(formData.get("id") ?? "");
  await prisma.annonce.deleteMany({ where: { id, clubId: club.id } });
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/* ---------------- Mise en contact ---------------- */

export async function contacterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting
  const ip = await getClientIp();
  if (!rateLimit(ip, CONTACT_RATE_LIMIT)) {
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
    include: { equipe: true, club: true },
  });
  if (!annonce || annonce.statut !== "ouvert") return { error: "Annonce non disponible." };
  if (annonce.clubId === club.id) return { error: "Vous ne pouvez pas contacter votre propre annonce." };

  await prisma.contactLog.create({
    data: {
      annonceId: annonce.id,
      demandeurClubId: club.id,
      destinataireId: annonce.clubId,
      message: message || null,
    },
  });
  await touchActivity(club.id);

  await sendContactNotification({
    to: annonce.club.email,
    annonceLabel: `${annonce.equipe.categorie} · ${annonce.date} · ${annonce.heure}`,
    demandeurClub: club.nom,
    demandeurEmail: club.email,
    demandeurTelephone: club.telephone,
    message: message || undefined,
  });

  revalidatePath(`/annonces/${annonce.id}`);
  // Coordonnées du club annonceur révélées au demandeur uniquement après une
  // mise en relation effective (cf. PRD). Elles proviennent du serveur, jamais
  // du client — évite la fuite via les props du composant avant contact.
  return { ok: true, tel: annonce.club.telephone, email: annonce.club.email };
}

/* ---------------- Admin (vérification licences) ---------------- */

export async function adminValidateAction(formData: FormData): Promise<void> {
  const me = await getCurrentClub();
  if (!me || me.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  await prisma.club.updateMany({ where: { id, role: "club" }, data: { statutVerification: "valide", refusMotif: null } });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function adminRefuseAction(formData: FormData): Promise<void> {
  const me = await getCurrentClub();
  if (!me || me.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  const motif = String(formData.get("motif") ?? "").trim().slice(0, LIMITS.REFUS_MOTIF_MAX);
  await prisma.club.updateMany({
    where: { id, role: "club" },
    data: { statutVerification: "refuse", refusMotif: motif || "Licence non valide." },
  });
  revalidatePath("/admin");
  redirect("/admin");
}

/* ---------------- Profil club : logo ---------------- */

export async function updateLogoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Rate limiting
  const ip = await getClientIp();
  if (!rateLimit(ip, UPLOAD_RATE_LIMIT)) {
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

  await prisma.club.update({ where: { id: club.id }, data: { logoUrl: url } });
  await touchActivity(club.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profil");
  revalidatePath(`/clubs/${club.id}`);
  revalidatePath("/");
  return { ok: true };
}