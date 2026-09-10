"use client";

import { useActionState } from "react";
import { contacterClubAction, type ActionState } from "@/app/actions";

interface Props {
  clubId: string;
}

export function ClubContactForm({ clubId }: Props) {
  const [state, formAction, pending] = useActionState(contacterClubAction, undefined as ActionState);

  if (state?.ok) {
    const tel = state.tel ?? "";
    const email = state.email ?? "";
    const wa = tel.replace(/[^0-9]/g, "");
    return (
      <div className="card border-accent/40 p-6">
        <p className="headline text-2xl text-accent">Demande envoyée ✓</p>
        <p className="mt-2 text-sm text-muted">
          Le club a été notifié par email avec vos coordonnées. Vous pouvez le
          recontacter directement :
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
              href={`https://wa.me/${wa}?text=${encodeURIComponent("Bonjour, je vous contacte via Matchs Amicaux pour organiser un match amical.")}`}
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
      <input type="hidden" name="clubId" value={clubId} />
      <p className="headline text-2xl text-paper">Contacter ce club</p>
      <p className="mt-2 text-sm text-muted">
        Envoyez vos coordonnées (email + téléphone) au club. Ajoutez un message optionnel.
      </p>
      <div className="mt-4">
        <label className="label" htmlFor="message">Message (optionnel)</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="input"
          placeholder="Ex. Bonjour, notre équipe U15 recherche un match amical pour le mois prochain. Êtes-vous intéressés ?"
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
