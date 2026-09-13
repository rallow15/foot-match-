"use client";

import { useActionState, useState } from "react";
import { signalerAnnonceAction, type ActionState } from "@/app/actions";

interface Props {
  annonceId: string;
}

export function SignalementForm({ annonceId }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(signalerAnnonceAction, undefined as ActionState);

  if (state?.ok) {
    return (
      <p className="mt-4 text-xs text-muted-2">
        Signalement envoyé. Notre équipe de modération l’examinera.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-muted-2 underline hover:text-danger"
        >
          Signaler cette annonce
        </button>
      ) : (
        <form action={formAction} className="card mt-2 border-danger/30 p-4">
          <input type="hidden" name="annonceId" value={annonceId} />
          <p className="text-sm text-paper">Signaler cette annonce</p>
          <label className="label mt-2" htmlFor="motif">Motif</label>
          <textarea
            id="motif"
            name="motif"
            rows={3}
            className="input"
            placeholder="Ex. contenu inapproprié, annonce frauduleuse…"
            maxLength={500}
            required
          />
          {state?.error && (
            <p className="mt-2 text-xs text-danger">{state.error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-xs-ghost">
              Annuler
            </button>
            <button type="submit" disabled={pending} className="btn-xs-danger">
              {pending ? "Envoi…" : "Signaler"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
