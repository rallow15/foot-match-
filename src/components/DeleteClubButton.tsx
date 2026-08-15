"use client";

import { useFormStatus } from "react-dom";

interface Props {
  clubId: string;
  clubNom: string;
  action: (formData: FormData) => void;
}

// Bouton de suppression d'un club (réservé admin). Composant client pour la
// confirmation navigateur avant l'envoi de l'action serveur destructive.
export function DeleteClubButton({ clubId, clubNom, action }: Props) {
  const { pending } = useFormStatus();

  return (
    <form
      action={action}
      className="sm:ml-auto"
      onSubmit={(e) => {
        if (
          !confirm(
            `Supprimer définitivement « ${clubNom} » ?\nÉquipes, annonces, contacts et sessions seront effacés.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={clubId} />
      <button
        className="btn-ghost text-sm text-muted-2 hover:text-danger"
        type="submit"
        disabled={pending}
      >
        {pending ? "Suppression…" : "Supprimer"}
      </button>
    </form>
  );
}