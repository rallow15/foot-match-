"use client";

import { logoutAction } from "@/app/actions";

export function LogoutLink({ className }: { className?: string }) {
  return (
    <form action={logoutAction} className={className}>
      <button type="submit" className="btn-ghost text-sm w-full text-left">
        Déconnexion
      </button>
    </form>
  );
}
