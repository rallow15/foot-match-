"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/actions";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function LoginForm({ redirect }: { redirect?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined as ActionState);

  return (
    <form action={formAction} className="card w-full p-6">
      <p className="eyebrow text-accent text-center">Espace club</p>
      <h1 className="headline mt-1 text-center text-2xl text-paper">Connexion</h1>

      <div className="mt-4 space-y-3">
        <GoogleSignInButton mode="login" redirect={redirect} />
      </div>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] uppercase tracking-wide text-muted">ou par email</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
      </div>

      <div className="mt-2 text-right">
        <Link href="/mot-de-passe-oublie" className="text-sm text-muted hover:text-accent hover:underline">
          Mot de passe oublié ?
        </Link>
      </div>

      {redirect && <input type="hidden" name="redirect" value={redirect} />}

      {state?.error && (
        <p className="mt-3 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent mt-4 w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </button>

      <p className="mt-4 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-accent hover:underline">
          Inscrire mon club
        </Link>
      </p>
      {process.env.NODE_ENV === "development" && (
        <p className="mt-3 text-center text-xs text-muted-2">
          Comptes démo : <code className="text-muted">contact@aslyonfoot.fr</code> / <code className="text-muted">club1234</code>
        </p>
      )}
    </form>
  );
}