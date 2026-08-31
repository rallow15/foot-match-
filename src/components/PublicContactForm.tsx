"use client";

import { useActionState, useState } from "react";
import { sendPublicContactAction, type ActionState } from "@/app/actions";

export function PublicContactForm() {
  const [state, formAction, pending] = useActionState(
    sendPublicContactAction,
    undefined as ActionState,
  );

  // Champs contrôlés pour persister les valeurs en cas d'erreur serveur.
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");

  if (state?.ok) {
    return (
      <div className="card border-accent/40 p-6">
        <p className="headline text-2xl text-accent">Message envoyé ✓</p>
        <p className="mt-2 text-sm text-muted">
          Merci pour votre message. Nous vous répondrons dès que possible sur
          l&apos;adresse email indiquée.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card p-6">
      <p className="headline text-2xl text-paper">Nous contacter</p>
      <p className="mt-2 text-sm text-muted">
        Une question, une suggestion ou un problème ? Envoyez-nous un message,
        nous vous répondrons rapidement.
      </p>

      <div className="mt-6 grid gap-4">
        <div>
          <label className="label" htmlFor="nom">Nom *</label>
          <input
            id="nom"
            name="nom"
            type="text"
            required
            className="input"
            placeholder="Ex. Jean Dupont"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="email">Email *</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="votre@email.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="sujet">Sujet *</label>
          <input
            id="sujet"
            name="sujet"
            type="text"
            required
            className="input"
            placeholder="Ex. Problème d'inscription"
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="message">Message *</label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            className="input"
            placeholder="Décrivez votre demande en quelques lignes..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent mt-6 w-full">
        {pending ? "Envoi…" : "Envoyer le message"}
      </button>
    </form>
  );
}
