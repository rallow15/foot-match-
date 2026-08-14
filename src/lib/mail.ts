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