"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction, type ActionState } from "@/app/actions";
import { LIGUES, districtsForLigue } from "@/lib/ligues";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, undefined as ActionState);

  // Champs contrôlés : leur valeur persiste après une erreur serveur.
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ligue, setLigue] = useState("");
  const [district, setDistrict] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Le fichier ne peut pas être réinjecté dans l'input (sécurité navigateur),
  // on garde juste un libellé pour l'utilisateur.
  const [licenceName, setLicenceName] = useState("");

  const districts = ligue ? districtsForLigue(ligue) : [];

  return (
    <form action={formAction} encType="multipart/form-data" className="card w-full p-6">
      <p className="eyebrow text-accent text-center">Nouveau club</p>
      <h1 className="headline mt-1 text-center text-2xl text-paper">Inscrire mon club</h1>

      <div className="mt-4 space-y-3">
        <GoogleSignInButton mode="register" />
        <p className="text-center text-[11px] text-muted">
          Inscription rapide — aucun mot de passe à mémoriser.
        </p>
      </div>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] uppercase tracking-wide text-muted">ou par email</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3 lg:space-y-0">
        {/* Colonne gauche — club */}
        <div className="space-y-3">
          <div>
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
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
                <option value="" disabled>Choisir…</option>
                {LIGUES.map((l) => (
                  <option key={l.ligue} value={l.ligue}>{l.ligue}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="district">District *</label>
              <select
                id="district"
                name="district"
                required
                className="input"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={districts.length === 0}
              >
                <option value="" disabled>{districts.length === 0 ? "Ligue d'abord" : "Choisir…"}</option>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Colonne droite — contact / compte */}
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
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
            <div>
              <label className="label" htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="contact@club.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="password">Mot de passe * <span className="text-muted-2">(min. 8)</span></label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              className="input"
              aria-describedby="password-help"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p id="password-help" className="mt-1 text-[11px] text-muted-2">
              3 types : minuscule, majuscule, chiffre, symbole.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="licence">
              Licence * <span className="text-muted-2">(PDF/JPG/PNG, max 8 Mo)</span>
            </label>
            <input
              id="licence"
              name="licence"
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="block w-full text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-sm file:border file:border-line file:bg-ink-3 file:px-3 file:py-1.5 file:text-paper hover:file:bg-ink-4"
              onChange={(e) => setLicenceName(e.target.files?.[0]?.name ?? "")}
            />
            {licenceName && (
              <p className="mt-1 text-[11px] text-muted-2">
                Fichier sélectionné : {licenceName}
              </p>
            )}
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="mt-3 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent mt-4 w-full">
        {pending ? "Création…" : "Créer le compte"}
      </button>

      <p className="mt-4 text-center text-[11px] text-muted">
        Compte vérifié manuellement avant activation.
      </p>

      <p className="mt-3 text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
