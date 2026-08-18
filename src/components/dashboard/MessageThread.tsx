"use client";

import { useActionState, useRef, useEffect } from "react";
import { sendMessageAction, type ActionState } from "@/app/actions";
import { ClubAvatar } from "@/components/ClubAvatar";
import { formatDateLongFR, relTime } from "@/lib/utils";
import { getCategorie, DOM_EXT_LABEL } from "@/lib/referential";

interface Message {
  id: string;
  auteurClubId: string;
  contenu: string;
  createdAt: Date;
  auteur: { id: string; nom: string; logoUrl: string | null };
}

interface Conversation {
  id: string;
  demandeurClubId: string;
  destinataireId: string;
  annonce: {
    id: string;
    date: string;
    heure: string;
    domicileExterieur: string;
    equipe: { categorie: string };
    club: { id: string; nom: string };
  };
  demandeur: { id: string; nom: string; logoUrl: string | null };
  destinataire: { id: string; nom: string; logoUrl: string | null };
  messages: Message[];
}

interface Props {
  conversation: Conversation;
  currentClubId: string;
}

export function MessageThread({ conversation, currentClubId }: Props) {
  const [state, formAction, pending] = useActionState(sendMessageAction, undefined as ActionState);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  const other = conversation.demandeurClubId === currentClubId ? conversation.destinataire : conversation.demandeur;
  const cat = getCategorie(conversation.annonce.equipe.categorie);
  const dom = conversation.annonce.domicileExterieur as keyof typeof DOM_EXT_LABEL;

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="border-b border-line bg-gradient-to-br from-ink-3 to-ink-2 px-5 py-4">
        <div className="flex items-center gap-3">
          <ClubAvatar club={{ nom: other.nom, logoUrl: other.logoUrl }} size={48} />
          <div>
            <p className="headline text-lg text-paper">{other.nom}</p>
            <p className="text-xs text-muted-2">
              {cat?.label} · {formatDateLongFR(conversation.annonce.date)} · {conversation.annonce.heure} · {DOM_EXT_LABEL[dom] ?? dom}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {conversation.messages.length === 0 && (
          <p className="text-center text-sm text-muted">Aucun message pour l&apos;instant.</p>
        )}
        {conversation.messages.map((m) => {
          const isMe = m.auteurClubId === currentClubId;
          return (
            <div key={m.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
              <ClubAvatar club={{ nom: m.auteur.nom, logoUrl: m.auteur.logoUrl }} size={36} />
              <div className={`max-w-[80%] rounded-sm px-4 py-3 ${isMe ? "bg-accent text-ink" : "bg-ink-3 text-paper"}`}>
                <p className="text-sm leading-relaxed">{m.contenu}</p>
                <p className={`mt-1 text-xs ${isMe ? "text-ink/70" : "text-muted-2"}`}>{relTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form action={formAction} className="border-t border-line px-5 py-4">
        <input type="hidden" name="contactLogId" value={conversation.id} />
        <div className="flex gap-3">
          <textarea
            name="contenu"
            rows={2}
            className="input flex-1 resize-none"
            placeholder="Écrivez votre message…"
            required
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={pending}
            className="btn-accent self-end"
          >
            {pending ? "Envoi…" : "Envoyer"}
          </button>
        </div>
        {state?.error && (
          <p className="mt-2 text-sm text-danger">{state.error}</p>
        )}
      </form>
    </div>
  );
}
