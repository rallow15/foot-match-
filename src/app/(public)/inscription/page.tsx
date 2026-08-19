import { RegisterForm } from "@/components/auth/RegisterForm";

// CSP par nonce : la page doit être rendue dynamiquement pour que Next injecte
// le nonce par requête dans ses scripts inline. Une page statique n'aurait pas
// de nonce et ses scripts seraient bloqués par la CSP.
export const dynamic = "force-dynamic";

export default function InscriptionPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-14 sm:px-6">
      <RegisterForm />
    </div>
  );
}