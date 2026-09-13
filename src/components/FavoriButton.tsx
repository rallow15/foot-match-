"use client";

import { useActionState } from "react";
import { toggleFavoriAction, type ActionState } from "@/app/actions";

interface Props {
  type: "annonce" | "club";
  cibleId: string;
  initial?: boolean;
  className?: string;
}

export function FavoriButton({ type, cibleId, initial = false, className = "" }: Props) {
  const [state, formAction, pending] = useActionState(toggleFavoriAction, { ok: initial } as ActionState);
  const isFavori = Boolean(state?.ok ?? initial);

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="cibleId" value={cibleId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={isFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
        title={isFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
        className={`inline-flex items-center justify-center rounded-sm border border-line p-2 text-paper transition-colors hover:bg-ink-4 ${
          isFavori ? "text-danger border-danger/50" : ""
        } disabled:opacity-50`}
      >
        {pending ? (
          <span className="h-5 w-5 animate-pulse rounded-full bg-muted-2" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isFavori ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={isFavori ? 0 : 2}
            className="h-5 w-5"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        )}
      </button>
    </form>
  );
}
