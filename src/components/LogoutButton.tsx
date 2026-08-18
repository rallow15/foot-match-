"use client";

import { useActionState } from "react";
import { logoutAction } from "@/app/actions";

export function LogoutButton({ className }: { className?: string }) {
  const [, formAction, pending] = useActionState(logoutAction, undefined);

  return (
    <form action={formAction} className={className}>
      <button className="btn-ghost text-sm w-full text-left" type="submit" disabled={pending}>
        {pending ? "Déconnexion…" : "Déconnexion"}
      </button>
    </form>
  );
}
