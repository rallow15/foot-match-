"use client";

import { useActionState, useState } from "react";
import {
  createAnnonceAction,
  updateAnnonceAction,
  type ActionState,
} from "@/app/actions";
import { niveauxForCategorie, DOM_EXT } from "@/lib/referential";

interface EquipeLite {
  id: string;
  categorie: string;
  niveau: string | null;
}

interface AnnonceFormProps {
  equipes: EquipeLite[];
  mode: "create" | "edit";
  annonceId?: string;
  initial?: {
    equipeId: string;
    date: string;
    heure: string;
    domicileExterieur: string;
    stadeDispo: boolean;
    stadeNom: string;
    arbitreDispo: boolean;
    niveauSouhaite: string;
    note: string;
  };
}

export function AnnonceForm({ equipes, mode, annonceId, initial }: AnnonceFormProps) {
  const action = mode === "edit" ? updateAnnonceAction : createAnnonceAction;
  const [state, formAction, pending] = useActionState(action, undefined as ActionState);

  const [equipeId, setEquipeId] = useState(initial?.equipeId ?? equipes[0]?.id ?? "");
  const [stadeDispo, setStadeDispo] = useState(initial?.stadeDispo ?? false);

  const selectedEquipe = equipes.find((e) => e.id === equipeId);
  const niveaux = selectedEquipe ? niveauxForCategorie(selectedEquipe.categorie) : [];

  if (equipes.length === 0) {
    return (
      <div className="card p-6 text-center text-muted">
        Ajoutez d&apos;abord une équipe à votre club pour pouvoir créer une annonce.
      </div>
    );
  }

  return (
    <form action={formAction} className="card grid gap-4 p-6">
      {mode === "edit" && annonceId && <input type="hidden" name="id" value={annonceId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="equipeId">Équipe (catégorie) *</label>
          <select
            id="equipeId"
            name="equipeId"
            className="input"
            value={equipeId}
            onChange={(e) => setEquipeId(e.target.value)}
          >
            {equipes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.categorie}{e.niveau ? ` — ${e.niveau}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="domicileExterieur">Domicile / Extérieur *</label>
          <select
            id="domicileExterieur"
            name="domicileExterieur"
            className="input"
            defaultValue={initial?.domicileExterieur ?? "domicile"}
          >
            {DOM_EXT.map((d) => (
              <option key={d} value={d}>
                {d === "domicile" ? "À domicile" : d === "exterieur" ? "À l'extérieur" : "Indifférent"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">Date *</label>
          <input id="date" name="date" type="date" required className="input" defaultValue={initial?.date ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="heure">Horaire * <span className="text-muted-2 normal-case tracking-normal">(ex. 14:00 ou 14:00-16:00)</span></label>
          <input id="heure" name="heure" required className="input" defaultValue={initial?.heure ?? ""} placeholder="14:00" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="flex items-center gap-2 text-sm text-paper">
            <input
              type="checkbox"
              name="stadeDispo"
              checked={stadeDispo}
              onChange={(e) => setStadeDispo(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Stade disponible
          </label>
          {stadeDispo && (
            <input
              name="stadeNom"
              className="input mt-2"
              placeholder="Nom du stade"
              defaultValue={initial?.stadeNom ?? ""}
              required
            />
          )}
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-paper">
            <input
              type="checkbox"
              name="arbitreDispo"
              defaultChecked={initial?.arbitreDispo ?? false}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Arbitre disponible
          </label>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="niveauSouhaite">Niveau souhaité (optionnel)</label>
        <select id="niveauSouhaite" name="niveauSouhaite" className="input" defaultValue={initial?.niveauSouhaite ?? ""}>
          <option value="">Indifférent</option>
          {niveaux.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {niveaux.length === 0 && (
          <p className="mt-1 text-xs text-muted-2">— Pas de niveau défini pour cette catégorie —</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="note">Note libre (optionnel)</label>
        <textarea
          id="note"
          name="note"
          rows={3}
          className="input"
          placeholder="Ex. terrain synthétique, match à 20h max, vestiaires…"
          defaultValue={initial?.note ?? ""}
        />
      </div>

      {state?.error && (
        <p className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent">
        {pending ? "Enregistrement…" : mode === "edit" ? "Mettre à jour l'annonce" : "Publier l'annonce"}
      </button>
    </form>
  );
}