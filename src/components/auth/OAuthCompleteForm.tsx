"use client";

import { useActionState, useState } from "react";
import { completeOAuthRegisterAction, type ActionState } from "@/app/actions";
import { LIGUES, districtsForLigue } from "@/lib/ligues";

export function OAuthCompleteForm() {
  const [state, formAction, pending] = useActionState(
    completeOAuthRegisterAction,
    undefined as ActionState,
  );

  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ligue, setLigue] = useState("");
  const [district, setDistrict] = useState("");
  const [telephone, setTelephone] = useState("");
  const [licenceName, setLicenceName] = useState("");

  const districts = ligue ? districtsForLigue(ligue) : [];

  return (
    <form action={formAction} className="card w-full max-w-2xl p-7">
      <p className="eyebrow text-accent">Compte Google lié</p>
      <h1 className="headline mt-2 text-3xl text-paper">Compléter l&apos;inscription</h1>
      <p className="mt-2 text-sm text-muted">
        Votre compte Google est bien reconnu. Pour finaliser votre inscription,
        indiquez les informations de votre club et téléversez votre licence de
        dirigeant/éducateur.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nom">Nom du club *</label>
          <input
            id="nom"
            name="nom"
            required
            className="input"
            placeholder="Ex. AS Lyon Foot"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="ville">Ville *</label>
          <input
            id="ville"
            name="ville"
            required
            className="input"
            placeholder="Ex. Lyon"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="codePostal">Code postal *</label>
          <input
            id="codePostal"
            name="codePostal"
            required
            className="input"
            placeholder="69000"
            value={codePostal}
            onChange={(e) => setCodePostal(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="ligue">Ligue *</label>
          <select
            id="ligue"
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
          <label className="label" htmlFor="district">District (sous-ligue) *</label>
          <select
            id="district"
            name="district"
            required
            className="input"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={districts.length === 0}
          >
            <option value="" disabled>
              {districts.length === 0 ? "Choisir d'abord la ligue…" : "Choisir le district…"}
            </option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="telephone">Téléphone *</label>
          <input
            id="telephone"
            name="telephone"
            required
            className="input"
            placeholder="06 12 34 56 78"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="licence">
            Licence dirigeant/éducateur *{" "}
            <span className="text-muted-2 normal-case tracking-normal">(PDF, JPG, PNG — max 8 Mo)</span>
          </label>
          <input
            id="licence"
            name="licence"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="block w-full text-sm text-muted file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-line file:bg-ink-3 file:px-4 file:py-2 file:text-paper hover:file:bg-ink-4"
            onChange={(e) => setLicenceName(e.target.files?.[0]?.name ?? "")}
          />
          {licenceName && (
            <p className="mt-1 text-xs text-muted-2">
              Fichier sélectionné : {licenceName}
            </p>
          )}
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent mt-6 w-full">
        {pending ? "Finalisation…" : "Finaliser l'inscription"}
      </button>
    </form>
  );
}
