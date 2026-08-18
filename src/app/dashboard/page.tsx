import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClub } from "@/lib/auth";
import { fetchMyAnnonces, fetchMyEquipes } from "@/lib/queries";
import { formatDateLongFR } from "@/lib/utils";
import { getCategorie, DOM_EXT_LABEL } from "@/lib/referential";
import { StatutAnnonceBadge, StatutVerifBadge, NiveauBadge } from "@/components/Badges";
import { EquipeForm } from "@/components/dashboard/EquipeForm";
import {
  deleteAnnonceAction,
  deleteEquipeAction,
  setAnnonceStatutAction,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const club = await getCurrentClub();
  if (!club) redirect("/login");
  if (club.role === "admin") redirect("/admin");

  const sp = await searchParams;
  const welcome = "welcome" in sp;
  const equipeErr = "equipe_err" in sp;
  const isValide = club.statutVerification === "valide";

  const [equipes, annonces] = await Promise.all([
    fetchMyEquipes(club.id),
    fetchMyAnnonces(club.id),
  ]);

  const ouvertes = annonces.filter((a) => a.statut === "ouvert");
  const passees = annonces.filter((a) => a.statut !== "ouvert");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* En-tête club */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-accent">Mon espace</p>
          <h1 className="headline mt-1 text-4xl text-paper">{club.nom}</h1>
          <p className="mt-1 text-sm text-muted">
            📍 {club.district} · {club.ville} ({club.codePostal}) · {club.telephone} · {club.email}
          </p>
          <p className="mt-0.5 text-xs text-muted-2">Ligue {club.ligue}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatutVerifBadge statut={club.statutVerification} />
          <div className="flex gap-3 text-xs">
            <Link href="/dashboard/messages" className="text-muted hover:text-accent">
              Messages →
            </Link>
            <Link href="/dashboard/profil" className="text-muted hover:text-accent">
              Profil & logo →
            </Link>
          </div>
        </div>
      </div>

      {/* Bannière statut */}
      {equipeErr && (
        <div className="card mt-6 border-danger/40 p-4 text-sm text-paper">
          <span className="font-display uppercase text-danger">Suppression impossible.</span>{" "}
          Cette équipe a encore des annonces ouvertes. Marquez-les « pourvu » /
          « annulé » (ou supprimez-les) avant de retirer l&apos;équipe.
        </div>
      )}
      {welcome && (
        <div className="card mt-6 border-accent/40 p-4 text-sm text-paper">
          <span className="font-display uppercase text-accent">Compte créé.</span>{" "}
          Votre licence est en cours de vérification. Vous recevrez un email dès
          validation. En attendant, vous pouvez créer vos équipes.
        </div>
      )}
      {club.statutVerification === "en_attente" && !welcome && (
        <div className="card mt-6 border-gold/40 p-4 text-sm text-muted">
          <span className="font-display uppercase text-gold">En attente de vérification.</span>{" "}
          Votre licence de dirigeant/éducateur est en attente de contrôle manuel.
          Vous pouvez préparer vos équipes — la publication d&apos;annonces sera
          débloquée à la validation.
        </div>
      )}
      {club.statutVerification === "refuse" && (
        <div className="card mt-6 border-danger/40 p-4 text-sm text-muted">
          <span className="font-display uppercase text-danger">Compte refusé.</span>{" "}
          Motif : {club.refusMotif ?? "non précisé"}. Vous pouvez corriger votre
          inscription en recréant un compte avec une licence valide.
        </div>
      )}

      {/* Stats rapides */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="headline text-3xl text-accent">{ouvertes.length}</p>
          <p className="mt-1 text-xs text-muted">Annonces ouvertes</p>
        </div>
        <div className="card p-4">
          <p className="headline text-3xl text-paper">{equipes.length}</p>
          <p className="mt-1 text-xs text-muted">Équipes</p>
        </div>
        <div className="card p-4">
          <p className="headline text-3xl text-paper">{passees.length}</p>
          <p className="mt-1 text-xs text-muted">Annonces pourvues/annulées</p>
        </div>
      </div>

      {/* Équipes */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="headline title-bar text-2xl text-paper">Mes équipes</h2>
        </div>
        {equipes.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucune équipe pour le moment.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {equipes.map((e) => (
              <li key={e.id} className="card flex items-center justify-between p-4">
                <div>
                  <p className="headline text-lg text-paper">{getCategorie(e.categorie)?.label ?? e.categorie}</p>
                  <div className="mt-1.5">{e.niveau ? <NiveauBadge niveau={e.niveau} /> : <span className="text-xs text-muted-2">Niveau non précisé</span>}</div>
                </div>
                <form action={deleteEquipeAction} className="inline">
                  <input type="hidden" name="id" value={e.id} />
                  <button className="btn-danger text-xs" type="submit" title="Supprimer l'équipe">
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {isValide && (
          <div className="mt-4">
            <EquipeForm />
          </div>
        )}
      </section>

      {/* Annonces */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="headline title-bar text-2xl text-paper">Mes annonces</h2>
          {isValide && (
            <Link href="/dashboard/annonces/nouvelle" className="btn-accent text-sm">
              + Nouvelle annonce
            </Link>
          )}
        </div>

        {!isValide && (
          <p className="card mt-4 p-4 text-sm text-muted">
            La publication d&apos;annonces est débloquée une fois votre compte validé.
          </p>
        )}

        {isValide && ouvertes.length === 0 && passees.length === 0 && (
          <p className="mt-4 text-sm text-muted">Aucune annonce pour le moment.</p>
        )}

        <div className="mt-4 space-y-3">
          {[...ouvertes, ...passees].map((a) => {
            const cat = getCategorie(a.equipe.categorie);
            return (
              <div key={a.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="headline text-xl text-paper">{cat?.label}</span>
                    {a.equipe.niveau && <NiveauBadge niveau={a.equipe.niveau} />}
                    <StatutAnnonceBadge statut={a.statut} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDateLongFR(a.date)} · {a.heure} · {DOM_EXT_LABEL[a.domicileExterieur as keyof typeof DOM_EXT_LABEL] ?? a.domicileExterieur}
                    {a.stadeDispo ? ` · stade ${a.stadeNom}` : ""}
                    {a.arbitreDispo ? " · arbitre" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.statut === "ouvert" && (
                    <>
                      <form action={setAnnonceStatutAction} className="inline">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="statut" value="pourvu" />
                        <button className="btn-ghost text-xs" type="submit">Marquer pourvu</button>
                      </form>
                      <form action={setAnnonceStatutAction} className="inline">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="statut" value="annule" />
                        <button className="btn-ghost text-xs" type="submit">Annuler</button>
                      </form>
                      <Link href={`/dashboard/annonces/${a.id}/modifier`} className="btn-ghost text-xs">
                        Modifier
                      </Link>
                    </>
                  )}
                  <form action={deleteAnnonceAction} className="inline">
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn-danger text-xs" type="submit">Supprimer</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}