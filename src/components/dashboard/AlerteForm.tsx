"use client";

import { useActionState, useState } from "react";
import { createAlerteAction, deleteAlerteAction, type ActionState } from "@/app/actions";
import { CATEGORIES } from "@/lib/referential";
import { LIGUES, districtsForLigue } from "@/lib/ligues";
import { VilleAutocomplete } from "@/components/VilleAutocomplete";

interface AlerteData {
  id: string;
  categorie?: string | null;
  ligue?: string | null;
  district?: string | null;
  rayonKm?: number | null;
}

interface Props {
  alertes: AlerteData[];
}

export function AlerteForm({ alertes }: Props) {
  const [state, formAction, pending] = useActionState(createAlerteAction, undefined as ActionState);
  const [categorie, setCategorie] = useState("");
  const [ligue, setLigue] = useState("");
  const districts = ligue ? districtsForLigue(ligue) : [];

  return (
    <div className="card p-6">
      <p className="headline text-xl text-paper">Alertes email</p>
      <p className="mt-1 text-sm text-muted">
        Recevez un email quotidien avec les nouvelles annonces correspondant à vos critères.
      </p>

      {alertes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {alertes.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-sm border border-line p-3">
              <span className="text-sm text-paper">
                {a.categorie ?? "Toutes catégories"}
                {a.ligue && ` · ${a.ligue}`}
                {a.district && ` · ${a.district}`}
                {a.rayonKm && ` · ${a.rayonKm} km`}
              </span>
              <form action={deleteAlerteAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-xs text-danger hover:underline">Supprimer</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="alerte-categorie">Catégorie</label>
            <select
              id="alerte-categorie"
              name="categorie"
              className="input"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
            >
              <option value="">Toutes</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="alerte-ligue">Ligue</label>
            <select
              id="alerte-ligue"
              name="ligue"
              className="input"
              value={ligue}
              onChange={(e) => {
                setLigue(e.target.value);
              }}
            >
              <option value="">Toutes</option>
              {LIGUES.map((l) => (
                <option key={l.ligue} value={l.ligue}>{l.ligue}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="alerte-district">District</label>
            <select id="alerte-district" name="district" className="input" disabled={districts.length === 0}>
              <option value="">Tous</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <VilleAutocomplete />
          <p className="mt-2 text-xs text-muted-2">
            Le rayon est optionnel. S’il est renseigné, vous ne recevrez que les annonces dans ce périmètre.
          </p>
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.ok && <p className="text-sm text-accent">Alerte créée ✓</p>}

        <button type="submit" disabled={pending} className="btn-accent">
          {pending ? "Création…" : "Créer une alerte"}
        </button>
      </form>
    </div>
  );
}
