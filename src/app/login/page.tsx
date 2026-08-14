import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const redirect = typeof sp.redirect === "string" ? sp.redirect : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
      <LoginForm redirect={redirect} />
    </div>
  );
}