"use client";

import { useActionState } from "react";
import { saveMatchResultAction, type ActionState } from "@/app/actions";

interface Props {
  annonceId: string;
}

export function MatchResultForm({ annonceId }: Props) {
  const [state, formAction, pending] = useActionState(saveMatchResultAction, undefined as ActionState);

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:items-end">
      <input type="hidden" name="annonceId" value={annonceId} />
      <div className="flex flex-wrap gap-2">
        <input
          name="adversaireNom"
          className="input text-sm"
          placeholder="Nom de l'adversaire"
        />
        <input
          name="scoreDomicile"
          type="number"
          min={0}
          max={99}
          className="input w-20 text-sm"
          placeholder="Dom."
        />
        <span className="self-center text-muted">-</span>
        <input
          name="scoreExterieur"
          type="number"
          min={0}
          max={99}
          className="input w-20 text-sm"
          placeholder="Ext."
        />
      </div>
      <textarea
        name="commentaire"
        rows={2}
        className="input text-sm"
        placeholder="Commentaire (optionnel)"
      />
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      {state?.ok && <p className="text-xs text-accent">Résultat enregistré ✓</p>}
      <button type="submit" disabled={pending} className="btn-accent text-xs">
        {pending ? "Enregistrement…" : "Enregistrer le résultat"}
      </button>
    </form>
  );
}
