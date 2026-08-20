"use client";

import { useActionState } from "react";
import { logoutAction } from "@/app/actions";

export function LogoutButton({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const [, formAction, pending] = useActionState(logoutAction, undefined);
  const btnClass =
    variant === "light" ? "btn-ghost-on-blue" : "btn-ghost";

  return (
    <form action={formAction} className={className}>
      <button className={`${btnClass} text-sm w-full text-left`} type="submit" disabled={pending}>
        {pending ? "Déconnexion…" : "Déconnexion"}
      </button>
    </form>
  );
}
