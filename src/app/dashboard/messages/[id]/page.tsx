import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClub } from "@/lib/auth";
import { fetchConversation } from "@/lib/queries";
import { MessageThread } from "@/components/dashboard/MessageThread";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const club = await getCurrentClub();
  if (!club) redirect("/login");
  if (club.role === "admin") redirect("/admin");

  const conversation = await fetchConversation(id, club.id);
  if (!conversation) notFound();

  // Marquer comme lu côté serveur au chargement de la page.
  const isDemandeur = conversation.demandeurClubId === club.id;
  await prisma.contactLog.update({
    where: { id: conversation.id },
    data: isDemandeur ? { demandeurReadAt: new Date() } : { destinataireReadAt: new Date() },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/messages" className="text-sm text-muted hover:text-paper">
        ← Retour aux messages
      </Link>

      <div className="mt-4">
        <MessageThread conversation={conversation} currentClubId={club.id} />
      </div>
    </div>
  );
}
