"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type ActionState } from "@/app/actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    undefined as ActionState,
  );

  return (
    <form action={formAction} className="card w-full max-w-md p-7">
      <p className="eyebrow text-accent">Espace club</p>
      <h1 className="headline mt-2 text-3xl text-paper">Mot de passe oublié</h1>
      <p className="mt-2 text-sm text-muted">
        Saisissez l&apos;email de votre club : un lien de réinitialisation vous sera envoyé
        (valable 15 minutes).
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
          />
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="mt-4 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent mt-6 w-full">
        {pending ? "Envoi…" : "Envoyer le lien"}
      </button>

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}