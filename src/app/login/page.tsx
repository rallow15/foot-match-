import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const redirect = typeof sp.redirect === "string" ? sp.redirect : undefined;
  const reset = sp.reset === "ok";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-md">
        {reset && (
          <p className="mb-4 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-center text-sm text-accent">
            Votre mot de passe a été modifié. Connectez-vous.
          </p>
        )}
      </div>
      <LoginForm redirect={redirect} />
    </div>
  );
}