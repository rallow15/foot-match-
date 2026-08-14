import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Réinitialisation du mot de passe — Matchs Amicaux",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="card w-full max-w-md p-7 text-center">
          <p className="eyebrow text-accent">Espace club</p>
          <h1 className="headline mt-2 text-3xl text-paper">Lien invalide</h1>
          <p className="mt-3 text-sm text-muted">
            Ce lien de réinitialisation est incomplet ou a déjà expiré.
          </p>
          <p className="mt-5 text-sm text-muted">
            <Link href="/mot-de-passe-oublie" className="text-accent hover:underline">
              Redemander un lien
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}