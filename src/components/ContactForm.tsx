"use client";

import { useActionState } from "react";
import { contacterAction, type ActionState } from "@/app/actions";

interface Props {
  annonceId: string;
}

export function ContactForm({ annonceId }: Props) {
  const [state, formAction, pending] = useActionState(contacterAction, undefined as ActionState);

  if (state?.ok) {
    // Coordonnées du club annonceur révélées après mise en relation (cf. PRD 5.4).
    // Elles proviennent du ActionState (serveur), pas de props — on évite ainsi
    // la fuite des coordonnées dans la payload RSC avant toute demande.
    const tel = state.tel ?? "";
    const email = state.email ?? "";
    const wa = tel.replace(/[^0-9]/g, "");
    return (
      <div className="card border-accent/40 p-6">
        <p className="headline text-2xl text-accent">Demande envoyée ✓</p>
        <p className="mt-2 text-sm text-muted">
          Le club a été notifié avec vos coordonnées. Vous pouvez aussi le recontacter
          directement :
        </p>
        <div className="mt-4 space-y-2">
          {tel && (
            <a href={`tel:${tel}`} className="btn-ghost w-full justify-start">
              📞 {tel}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="btn-ghost w-full justify-start">
              ✉ {email}
            </a>
          )}
          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent("Bonjour, je vous contacte suite à votre annonce de match amical.")}`}
              target="_blank"
              rel="noreferrer"
              className="btn-accent w-full"
            >
              Ouvrir dans WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="card p-6">
      <input type="hidden" name="annonceId" value={annonceId} />
      <p className="headline text-2xl text-paper">Contacter le club</p>
      <p className="mt-2 text-sm text-muted">
        Envoyez vos coordonnées (email + téléphone) au club annonceur. Ajoutez un
        message optionnel.
      </p>
      <div className="mt-4">
        <label className="label" htmlFor="message">Message (optionnel)</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="input"
          placeholder="Ex. Bonjour, notre équipe U15 est intéressée pour le samedi 14h. Dispo pour échanger par téléphone."
        />
      </div>
      {state?.error && (
        <p className="mt-3 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-accent mt-5 w-full">
        {pending ? "Envoi…" : "Envoyer mes coordonnées"}
      </button>
    </form>
  );
}