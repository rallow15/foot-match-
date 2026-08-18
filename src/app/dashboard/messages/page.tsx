import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClub } from "@/lib/auth";
import { fetchConversations } from "@/lib/queries";
import { formatDateLongFR, relTime } from "@/lib/utils";
import { getCategorie, DOM_EXT_LABEL } from "@/lib/referential";
import { ClubAvatar } from "@/components/ClubAvatar";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const club = await getCurrentClub();
  if (!club) redirect("/login");
  if (club.role === "admin") redirect("/admin");

  const conversations = await fetchConversations(club.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Mon espace</p>
      <h1 className="headline title-bar mt-1 text-3xl text-paper">Mes messages</h1>

      {conversations.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="headline text-xl text-paper">Aucun message</p>
          <p className="mt-2 text-sm text-muted">
            Contactez un club sur une annonce pour démarrer une conversation.
          </p>
          <Link href="/annonces" className="btn-accent mt-4 inline-block">Rechercher un match</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {conversations.map((c) => {
            const other = c.demandeurClubId === club.id ? c.destinataire : c.demandeur;
            const annonce = c.annonce;
            const cat = getCategorie(annonce.equipe.categorie);
            const dom = annonce.domicileExterieur as keyof typeof DOM_EXT_LABEL;
            const lastMessage = c.messages[c.messages.length - 1];
            const isUnread = (() => {
              if (!lastMessage || lastMessage.auteurClubId === club.id) return false;
              const readAt = c.demandeurClubId === club.id ? c.demandeurReadAt : c.destinataireReadAt;
              return !readAt || lastMessage.createdAt > readAt;
            })();

            return (
              <li key={c.id}>
                <Link
                  href={`/dashboard/messages/${c.id}`}
                  className={`card card-hover flex items-start gap-4 p-4 ${isUnread ? "border-accent/60" : ""}`}
                >
                  <ClubAvatar club={{ nom: other.nom, logoUrl: other.logoUrl }} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-paper">{other.nom}</span>
                      {isUnread && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-ink">Nouveau</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {cat?.label} · {formatDateLongFR(annonce.date)} · {DOM_EXT_LABEL[dom] ?? dom}
                    </p>
                    {lastMessage && (
                      <p className="mt-1 truncate text-sm text-muted-2">
                        <span className={isUnread ? "text-paper" : ""}>
                          {lastMessage.auteurClubId === club.id ? "Vous : " : ""}
                          {lastMessage.contenu}
                        </span>
                      </p>
                    )}
                  </div>
                  {lastMessage && (
                    <span className="hidden text-xs text-muted-2 sm:inline">{relTime(lastMessage.createdAt)}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
