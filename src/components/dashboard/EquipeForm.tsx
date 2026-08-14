"use client";

import { useActionState } from "react";
import { createEquipeAction, type ActionState } from "@/app/actions";
import { CATEGORIES } from "@/lib/referential";

export function EquipeForm() {
  const [state, formAction, pending] = useActionState(createEquipeAction, undefined as ActionState);

  return (
    <form action={formAction} className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="eq-cat">Catégorie</label>
        <select id="eq-cat" name="categorie" className="input" defaultValue="">
          <option value="" disabled>Choisir…</option>
          <optgroup label="Jeunes">
            {CATEGORIES.filter((c) => c.groupe === "jeunes").map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </optgroup>
          <optgroup label="Adultes / Loisirs">
            {CATEGORIES.filter((c) => c.groupe === "adultes").map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </optgroup>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="eq-niv">Niveau (optionnel)</label>
        <select id="eq-niv" name="niveau" className="input" defaultValue="">
          <option value="">—</option>
          <option>Départemental</option>
          <option>Régional</option>
          <option>National</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-accent">
        {pending ? "…" : "Ajouter"}
      </button>
      {state?.error && (
        <p className="sm:col-span-3 text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}