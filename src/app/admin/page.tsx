import { redirect } from "next/navigation";
import { getCurrentClub } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchPendingClubs } from "@/lib/queries";
import { relTime } from "@/lib/utils";
import { adminRefuseAction, adminValidateAction } from "@/app/actions";
import { StatutVerifBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentClub();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/dashboard");

  const [pending, recent] = await Promise.all([
    fetchPendingClubs(),
    prisma.club.findMany({
      where: { role: "club", statutVerification: { in: ["valide", "refuse"] } },
      orderBy: { derniereActiviteAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Administration</p>
      <h1 className="headline title-bar mt-1 text-3xl text-paper">Vérification des licences</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="En attente" value={pending.length} accent />
        <Stat label="Validés" value={await prisma.club.count({ where: { role: "club", statutVerification: "valide" } })} />
        <Stat label="Total clubs" value={await prisma.club.count({ where: { role: "club" } })} />
      </div>

      {/* File d'attente */}
      <section className="mt-10">
        <h2 className="headline text-2xl text-paper">File d&apos;attente</h2>

        {pending.length === 0 ? (
          <p className="card mt-4 p-6 text-sm text-muted">
            Aucun club en attente de vérification. 🎉
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pending.map((c) => (
              <li key={c.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="headline text-xl text-paper">{c.nom}</h3>
                      <StatutVerifBadge statut={c.statutVerification} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      📍 {c.ville} ({c.codePostal}) · {c.telephone} · {c.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-2">Inscrit {relTime(c.createdAt)}</p>
                  </div>

                  {c.licenceFichierUrl && (
                    <a
                      href={c.licenceFichierUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost text-sm"
                    >
                      Voir la licence
                    </a>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row">
                  <form action={adminValidateAction} className="inline">
                    <input type="hidden" name="id" value={c.id} />
                    <button className="btn-accent text-sm" type="submit">Valider le club</button>
                  </form>
                  <form action={adminRefuseAction} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="motif"
                      className="input sm:max-w-xs"
                      placeholder="Motif du refus (optionnel)"
                    />
                    <button className="btn-danger text-sm" type="submit">Refuser</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Décisions récentes */}
      {recent.length > 0 && (
        <section className="mt-12">
          <h2 className="headline text-2xl text-paper">Décisions récentes</h2>
          <ul className="mt-4 space-y-2">
            {recent.map((c) => (
              <li key={c.id} className="card flex items-center justify-between p-4">
                <span className="text-paper">{c.nom}</span>
                <StatutVerifBadge statut={c.statutVerification} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className={`headline text-3xl ${accent ? "text-accent" : "text-paper"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}