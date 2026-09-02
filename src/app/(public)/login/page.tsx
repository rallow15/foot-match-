import { LoginForm } from "@/components/auth/LoginForm";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_invalid: "Lien de connexion invalide ou expiré. Veuillez réessayer.",
  oauth_email_unverified: "Votre adresse Google n'est pas vérifiée.",
  oauth_email_exists: "Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.",
  oauth_failed: "La connexion avec Google a échoué. Veuillez réessayer.",
  rate_limit: "Trop de tentatives. Réessayez dans un instant.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const redirect = typeof sp.redirect === "string" ? sp.redirect : undefined;
  const reset = sp.reset === "ok";
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const errorMessage = error ? OAUTH_ERRORS[error] : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        {reset && (
          <p className="mb-4 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-center text-sm text-accent">
            Votre mot de passe a été modifié. Connectez-vous.
          </p>
        )}
        {errorMessage && (
          <p className="mb-4 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
            {errorMessage}
          </p>
        )}
      </div>
      <LoginForm redirect={redirect} />
    </div>
  );
}