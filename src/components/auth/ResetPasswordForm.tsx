"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/app/actions";
import { LIMITS } from "@/lib/validation";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    undefined as ActionState,
  );

  return (
    <form action={formAction} className="card w-full max-w-md p-7">
      <p className="eyebrow text-accent">Espace club</p>
      <h1 className="headline mt-2 text-3xl text-paper">Nouveau mot de passe</h1>
      <p className="mt-2 text-sm text-muted">
        Choisissez un nouveau mot de passe pour votre compte. Vous serez reconnecté ensuite.
      </p>

      <input type="hidden" name="token" value={token} />

      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="password">Nouveau mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={LIMITS.PASSWORD_MIN}
            maxLength={LIMITS.PASSWORD_MAX}
            className="input"
            aria-describedby="password-help"
          />
          <p id="password-help" className="mt-1 text-xs text-muted-2">
            Min. {LIMITS.PASSWORD_MIN} caractères, dont 3 types parmi : minuscule, majuscule, chiffre, symbole.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirmer le mot de passe</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={LIMITS.PASSWORD_MIN}
            maxLength={LIMITS.PASSWORD_MAX}
            className="input"
          />
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent mt-6 w-full">
        {pending ? "Enregistrement…" : "Modifier mon mot de passe"}
      </button>

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}