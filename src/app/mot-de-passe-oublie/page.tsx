import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

// CSP par nonce : rendu dynamique requis pour l'injection du nonce.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mot de passe oublié — Matchs Amicaux",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
      <ForgotPasswordForm />
    </div>
  );
}