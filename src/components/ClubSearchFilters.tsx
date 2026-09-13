"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES, niveauxForCategorie } from "@/lib/referential";
import { LIGUES, districtsForLigue } from "@/lib/ligues";
import { DEPARTEMENT_ENTRIES, isValidDepartement } from "@/lib/departements";
import { VilleAutocomplete } from "./VilleAutocomplete";

export interface ClubFilterInitial {
  categorie?: string;
  niveau?: string;
  ligue?: string;
  district?: string;
  departement?: string;
  ville?: string;
  latitude?: string;
  longitude?: string;
  rayon?: string;
}

export function ClubSearchFilters({ initial }: { initial: ClubFilterInitial }) {
  const [categorie, setCategorie] = useState(initial.categorie ?? "");
  const [niveau, setNiveau] = useState(initial.niveau ?? "");
  const niveaux = categorie ? niveauxForCategorie(categorie) : [];

  const [ligue, setLigue] = useState(initial.ligue ?? "");
  const [district, setDistrict] = useState(initial.district ?? "");
  const districts = ligue ? districtsForLigue(ligue) : [];

  const safeDepartement = isValidDepartement(initial.departement) ? initial.departement! : "";
  const [departement, setDepartement] = useState(safeDepartement);

  return (
    <form method="get" action="/clubs" className="card mt-8 grid gap-5 p-5 md:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="label" htmlFor="categorie">Catégorie d&apos;équipe *</label>
        <select
          id="categorie"
          name="categorie"
          required
          className="input"
          value={categorie}
          onChange={(e) => {
            setCategorie(e.target.value);
            setNiveau("");
          }}
        >
          <option value="">Choisir une catégorie</option>
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
        <label className="label" htmlFor="niveau">Niveau</label>
        <select
          id="niveau"
          name="niveau"
          className="input"
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          disabled={niveaux.length === 0}
        >
          <option value="">Tous les niveaux</option>
          {niveaux.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="ligue">Ligue</label>
        <select
          id="ligue"
          name="ligue"
          className="input"
          value={ligue}
          onChange={(e) => {
            setLigue(e.target.value);
            setDistrict("");
          }}
        >
          <option value="">Toutes les ligues</option>
          {LIGUES.map((l) => (
            <option key={l.ligue} value={l.ligue}>{l.ligue}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="district">District (sous-ligue)</label>
        <select
          id="district"
          name="district"
          className="input"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          disabled={districts.length === 0}
        >
          <option value="">Tous les districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="departement">Département</label>
        <select
          id="departement"
          name="departement"
          className="input"
          value={departement}
          onChange={(e) => setDepartement(e.target.value)}
        >
          <option value="">Tous les départements</option>
          {DEPARTEMENT_ENTRIES.map((d) => (
            <option key={d.numero} value={d.numero}>{d.numero} - {d.nom}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2 lg:col-span-3">
        <VilleAutocomplete
          initialVille={initial.ville}
          initialLat={initial.latitude}
          initialLng={initial.longitude}
          initialRayon={initial.rayon}
        />
      </div>

      <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 border-t border-line pt-4">
        <Link href="/clubs" className="btn-ghost">Réinitialiser</Link>
        <button type="submit" className="btn-accent">Rechercher des clubs</button>
      </div>
    </form>
  );
}
