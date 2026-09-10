import { RegisterForm } from "@/components/auth/RegisterForm";

// CSP par nonce : la page doit être rendue dynamiquement pour que Next injecte
// le nonce par requête dans ses scripts inline. Une page statique n'aurait pas
// de nonce et ses scripts seraient bloqués par la CSP.
export const dynamic = "force-dynamic";

function isAppleEnabled(): boolean {
  return Boolean(
    process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY_BASE64,
  );
}

export default function InscriptionPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-10 sm:px-6 lg:max-w-5xl">
      <RegisterForm appleEnabled={isAppleEnabled()} />
    </div>
  );
}