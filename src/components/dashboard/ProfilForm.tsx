"use client";

import { useActionState, useState } from "react";
import { updateProfilAction, type ActionState } from "@/app/actions";
import { LIGUES, districtsForLigue } from "@/lib/ligues";

interface ClubData {
  id: string;
  nom: string;
  ville: string;
  codePostal: string;
  ligue: string;
  district: string;
  telephone: string;
  email: string;
}

interface Props {
  club: ClubData;
}

export function ProfilForm({ club }: Props) {
  const [state, formAction, pending] = useActionState(updateProfilAction, undefined as ActionState);

  const [nom, setNom] = useState(club.nom);
  const [ville, setVille] = useState(club.ville);
  const [codePostal, setCodePostal] = useState(club.codePostal);
  const [ligue, setLigue] = useState(club.ligue);
  const [district, setDistrict] = useState(club.district);
  const [telephone, setTelephone] = useState(club.telephone);
  const [email, setEmail] = useState(club.email);

  const districts = ligue ? districtsForLigue(ligue) : [];

  return (
    <form action={formAction} className="card grid gap-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="profil-nom">Nom du club *</label>
          <input
            id="profil-nom"
            name="nom"
            required
            className="input"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="profil-ville">Ville *</label>
          <input
            id="profil-ville"
            name="ville"
            required
            className="input"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="profil-codePostal">Code postal *</label>
          <input
            id="profil-codePostal"
            name="codePostal"
            required
            className="input"
            value={codePostal}
            onChange={(e) => setCodePostal(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="profil-ligue">Ligue *</label>
          <select
            id="profil-ligue"
            name="ligue"
            required
            className="input"
            value={ligue}
            onChange={(e) => {
              setLigue(e.target.value);
              setDistrict("");
            }}
          >
            <option value="" disabled>Choisir la ligue…</option>
            {LIGUES.map((l) => (
              <option key={l.ligue} value={l.ligue}>{l.ligue}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="profil-district">District (sous-ligue) *</label>
          <select
            id="profil-district"
            name="district"
            required
            className="input"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={districts.length === 0}
          >
            <option value="" disabled>{districts.length === 0 ? "Choisir d'abord la ligue…" : "Choisir le district…"}</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="profil-telephone">Téléphone *</label>
          <input
            id="profil-telephone"
            name="telephone"
            required
            className="input"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="profil-email">Email *</label>
          <input
            id="profil-email"
            name="email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-sm border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          Profil mis à jour ✓
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent">
        {pending ? "Enregistrement…" : "Mettre à jour le profil"}
      </button>
    </form>
  );
}
