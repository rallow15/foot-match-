"use client";

import { useActionState } from "react";
import { updateLogoAction, type ActionState } from "@/app/actions";

export function LogoForm() {
  const [state, formAction, pending] = useActionState(updateLogoAction, undefined as ActionState);

  return (
    <form action={formAction} className="card grid gap-4 p-6">
      <div>
        <label className="label" htmlFor="logo">Logo du club</label>
        <p className="mt-1 text-xs text-muted-2">PNG, JPG ou WebP — max 8 Mo. Affiché sur vos annonces et votre profil public.</p>
        <input
          id="logo"
          name="logo"
          type="file"
          required
          accept=".png,.jpg,.jpeg,.webp"
          className="mt-3 block w-full text-sm text-muted file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-line file:bg-ink-3 file:px-4 file:py-2 file:text-paper hover:file:bg-ink-4"
        />
      </div>

      {state?.error && (
        <p className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          Logo mis à jour ✓
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent">
        {pending ? "Enregistrement…" : "Mettre à jour le logo"}
      </button>
    </form>
  );
}