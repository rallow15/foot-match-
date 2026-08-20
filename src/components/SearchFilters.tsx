"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES, niveauxForCategorie } from "@/lib/referential";
import { LIGUES, districtsForLigue } from "@/lib/ligues";
import { VilleAutocomplete } from "./VilleAutocomplete";

export interface FilterInitial {
  categorie?: string;
  niveau?: string;
  dateFrom?: string;
  dateTo?: string;
  dom?: string;
  stade?: string;
  arbitre?: string;
  ligue?: string;
  district?: string;
  ville?: string;
  latitude?: string;
  longitude?: string;
  rayon?: string;
}

export function SearchFilters({ initial }: { initial: FilterInitial }) {
  const [categorie, setCategorie] = useState(initial.categorie ?? "");
  const [niveau, setNiveau] = useState(initial.niveau ?? "");
  const niveaux = categorie ? niveauxForCategorie(categorie) : [];

  const [ligue, setLigue] = useState(initial.ligue ?? "");
  const [district, setDistrict] = useState(initial.district ?? "");
  const districts = ligue ? districtsForLigue(ligue) : [];

  // Scroll automatique vers les résultats lorsqu’une recherche est active
  // (la page recharge avec des filtres après un clic sur "Rechercher").
  useEffect(() => {
    const hasActiveFilters = Object.values(initial).some(
      (v) => v !== undefined && v !== null && String(v).trim().length > 0,
    );
    if (!hasActiveFilters) return;
    const el = document.getElementById("annonces-results");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [initial]);

  return (
    <form method="get" action="/annonces" className="card mt-8 grid gap-5 p-5 md:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="label" htmlFor="categorie">Catégorie *</label>
        <select
          id="categorie"
          name="categorie"
          className="input"
          value={categorie}
          onChange={(e) => {
            setCategorie(e.target.value);
            setNiveau(""); // reset : les niveaux dépendent de la catégorie
          }}
        >
          <option value="">Toutes les catégories</option>
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
        <select id="niveau" name="niveau" className="input" value={niveau} onChange={(e) => setNiveau(e.target.value)}>
          <option value="">Tous niveaux</option>
          {niveaux.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {niveaux.length === 0 ? (
          <p className="mt-1 text-xs text-muted-2">
            Sélectionnez d&apos;abord une catégorie pour filtrer par niveau.
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-2">{niveaux.length} niveau(x) possible(s) pour cette catégorie.</p>
        )}
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
            setDistrict(""); // reset : le district dépend de la ligue
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
        {ligue && districts.length > 0 && (
          <p className="mt-1 text-xs text-muted-2">{districts.length} district(s) dans cette ligue.</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="dom">Domicile / Extérieur</label>
        <select id="dom" name="dom" className="input" defaultValue={initial.dom ?? ""}>
          <option value="">Indifférent</option>
          <option value="domicile">À domicile</option>
          <option value="exterieur">À l&apos;extérieur</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="dateFrom">À partir du</label>
        <input id="dateFrom" name="dateFrom" type="date" className="input" defaultValue={initial.dateFrom ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="dateTo">Jusqu&apos;au</label>
        <input id="dateTo" name="dateTo" type="date" className="input" defaultValue={initial.dateTo ?? ""} />
      </div>

      <div className="flex items-end gap-6 pb-1">
        <label className="flex items-center gap-2 text-sm text-paper">
          <input type="checkbox" name="stade" value="1" defaultChecked={initial.stade === "1"} className="h-4 w-4 accent-[var(--accent)]" />
          Stade dispo
        </label>
        <label className="flex items-center gap-2 text-sm text-paper">
          <input type="checkbox" name="arbitre" value="1" defaultChecked={initial.arbitre === "1"} className="h-4 w-4 accent-[var(--accent)]" />
          Arbitre dispo
        </label>
      </div>

      <div className="lg:col-span-3 border-t border-line pt-4">
        <VilleAutocomplete
          initialVille={initial.ville}
          initialLat={initial.latitude}
          initialLng={initial.longitude}
          initialRayon={initial.rayon}
        />
      </div>

      <div className="lg:col-span-3 flex justify-end gap-3 border-t border-line pt-4">
        <Link href="/annonces" className="btn-ghost">Réinitialiser</Link>
        <button type="submit" className="btn-accent">Rechercher</button>
      </div>
    </form>
  );
}