"use client";

import { useActionState } from "react";
import { submitAvisAction, type ActionState } from "@/app/actions";

interface Props {
  annonceId: string;
  adversaireNom: string;
}

export function AvisForm({ annonceId, adversaireNom }: Props) {
  const [state, formAction, pending] = useActionState(submitAvisAction, undefined as ActionState);

  if (state?.ok) {
    return (
      <div className="card border-accent/40 p-6">
        <p className="headline text-2xl text-accent">Merci pour votre avis ✓</p>
        <p className="mt-2 text-sm text-muted">Votre note a bien été enregistrée.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card border-gold/40 p-6">
      <input type="hidden" name="annonceId" value={annonceId} />
      <p className="headline text-2xl text-paper">Noter le match</p>
      <p className="mt-2 text-sm text-muted">
        Vous avez affronté <span className="text-paper">{adversaireNom}</span>. Donnez une note de 1 à 5.
      </p>
      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name="note" value={n} required className="peer sr-only" />
            <span className="inline-block rounded-sm border border-line px-3 py-2 text-paper peer-checked:border-accent peer-checked:bg-accent peer-checked:text-[#04210f] hover:bg-ink-4">
              {n} ★
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4">
        <label className="label" htmlFor="commentaire">Commentaire (optionnel)</label>
        <textarea
          id="commentaire"
          name="commentaire"
          rows={3}
          className="input"
          placeholder="Ex. Très bon accueil, match fair-play…"
          maxLength={500}
        />
      </div>
      {state?.error && (
        <p className="mt-3 text-sm text-danger">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-accent mt-5">
        {pending ? "Envoi…" : "Envoyer mon avis"}
      </button>
    </form>
  );
}
