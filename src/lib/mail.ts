import nodemailer from "nodemailer";

function transporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null; // fallback console
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });
}

export interface ContactMailData {
  to: string; // club annonceur
  annonceLabel: string;
  demandeurClub: string;
  demandeurEmail: string;
  demandeurTelephone: string;
  message?: string;
}

export async function sendContactNotification(data: ContactMailData) {
  const from = process.env.SMTP_FROM ?? "Matchs Amicaux <no-reply@matchs-amicaux.local>";
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const subject = `Demande de match — ${data.annonceLabel}`;
  const text = `Bonjour,

Le club "${data.demandeurClub}" souhaite vous contacter au sujet de votre annonce :
${data.annonceLabel}

Ses coordonnées :
- Email : ${data.demandeurEmail}
- Téléphone : ${data.demandeurTelephone}

${data.message ? `Message du demandeur :\n${data.message}\n\n` : ""}Vous pouvez le recontacter directement (téléphone / WhatsApp).

— ${appUrl}`;

  const t = transporter();
  if (!t) {
    // Pas de SMTP configuré : on logge côté serveur (visible en dev).
    console.log("\n[MAIL · fallback console] -------------------------");
    console.log(`To: ${data.to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("[MAIL] -------------------------------------------\n");
    return;
  }
  await t.sendMail({ from, to: data.to, subject, text });
}

export interface PasswordResetMailData {
  to: string; // club demandeur
  resetUrl: string; // lien signé (porte le token clair)
}

export async function sendPasswordResetEmail(data: PasswordResetMailData) {
  const from = process.env.SMTP_FROM ?? "Matchs Amicaux <no-reply@matchs-amicaux.local>";
  const subject = "Réinitialisation de votre mot de passe — Matchs Amicaux";
  const text = `Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe sur Matchs Amicaux.

Cliquez sur le lien suivant pour choisir un nouveau mot de passe (valable 15 minutes) :
${data.resetUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe restera inchangé.

— Matchs Amicaux`;

  const t = transporter();
  if (!t) {
    // Pas de SMTP configuré : on logge côté serveur (visible en dev / logs Vercel).
    console.log("\n[MAIL · fallback console · RESET] -------------------------");
    console.log(`To: ${data.to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("[MAIL] -------------------------------------------\n");
    return;
  }
  await t.sendMail({ from, to: data.to, subject, text });
}

export interface RegistrationMailData {
  to: string; // email du club qui vient de s'inscrire
  nom: string; // nom du club
}

// Email de confirmation d'inscription : accusé de réception envoyé au club à la
// création de son compte. Rappelle que la licence est en vérification manuelle
// et que la publication/contact est débloquée à la validation.
export async function sendRegistrationConfirmationEmail(data: RegistrationMailData) {
  const from = process.env.SMTP_FROM ?? "Matchs Amicaux <no-reply@matchs-amicaux.local>";
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const subject = "Bienvenue sur Matchs Amicaux — inscription confirmée";
  const text = `Bonjour,

Votre club « ${data.nom} » est bien inscrit sur Matchs Amicaux. Merci !

Votre licence de dirigeant / éducateur est en cours de vérification manuelle.
Vous pouvez vous connecter dès maintenant, mais la publication d'annonces et
la prise de contact avec d'autres clubs seront débloquées une fois votre
compte validé.

Se connecter : ${appUrl}/login

— Matchs Amicaux`;

  const t = transporter();
  if (!t) {
    // Pas de SMTP configuré : on logge côté serveur (visible en dev / logs Vercel).
    console.log("\n[MAIL · fallback console · INSCRIPTION] -------------------------");
    console.log(`To: ${data.to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("[MAIL] -------------------------------------------\n");
    return;
  }
  await t.sendMail({ from, to: data.to, subject, text });
}

export interface AccountValidatedMailData {
  to: string; // email du club validé
  nom: string; // nom du club
}

// Email "compte validé" : envoyé au club quand l'admin valide sa licence. Il
// peut alors publier des annonces et contacter d'autres clubs.
export async function sendAccountValidatedEmail(data: AccountValidatedMailData) {
  const from = process.env.SMTP_FROM ?? "Matchs Amicaux <no-reply@matchs-amicaux.local>";
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const subject = "Votre compte Matchs Amicaux est validé 🎉";
  const text = `Bonjour,

Bonne nouvelle : votre club « ${data.nom} » est désormais vérifié sur Matchs Amicaux.

Vous pouvez dès maintenant publier des annonces et contacter d'autres clubs
pour organiser vos matchs amicaux.

Accéder à mon espace : ${appUrl}/dashboard

— Matchs Amicaux`;

  const t = transporter();
  if (!t) {
    // Pas de SMTP configuré : on logge côté serveur (visible en dev / logs Vercel).
    console.log("\n[MAIL · fallback console · VALIDATION] -------------------------");
    console.log(`To: ${data.to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("[MAIL] -------------------------------------------\n");
    return;
  }
  await t.sendMail({ from, to: data.to, subject, text });
}

export interface AccountRefusedMailData {
  to: string; // email du club refusé
  nom: string; // nom du club
  motif: string; // motif du refus
}

// Email "compte refusé" : envoyé au club quand l'admin refuse sa licence, avec
// le motif pour qu'il puisse corriger et recréer un compte.
export async function sendAccountRefusedEmail(data: AccountRefusedMailData) {
  const from = process.env.SMTP_FROM ?? "Matchs Amicaux <no-reply@matchs-amicaux.local>";
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const subject = "Votre inscription Matchs Amicaux n'a pas pu être validée";
  const text = `Bonjour,

Votre demande d'inscription pour le club « ${data.nom} » n'a pas pu être validée.

Motif : ${data.motif}

Vous pouvez corriger votre inscription en recréant un compte avec une licence
de dirigeant / éducateur valide : ${appUrl}/inscription

— Matchs Amicaux`;

  const t = transporter();
  if (!t) {
    // Pas de SMTP configuré : on logge côté serveur (visible en dev / logs Vercel).
    console.log("\n[MAIL · fallback console · REFUS] -------------------------");
    console.log(`To: ${data.to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("[MAIL] -------------------------------------------\n");
    return;
  }
  await t.sendMail({ from, to: data.to, subject, text });
}