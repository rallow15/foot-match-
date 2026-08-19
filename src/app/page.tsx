import Link from "next/link";
import { fetchAnnoncesLanding } from "@/lib/queries";

export const metadata = {
  title: "Matchs Amicaux — Trouvez un club pour un match amical",
  description:
    "La plateforme qui met en relation les clubs amateurs de football pour organiser des matchs amicaux. Proposez, cherchez, contactez.",
};

// ISR : la landing est regénérée au maximum toutes les 60 s.
export const revalidate = 60;

const steps = [
  {
    n: "01",
    title: "Inscrivez votre club",
    text: "Renseignez votre club, téléversez votre licence et patientez le temps de la vérification manuelle.",
  },
  {
    n: "02",
    title: "Publiez une annonce",
    text: "Date, horaire, catégorie, niveau, stade et arbitre : en quelques clics votre recherche est en ligne.",
  },
  {
    n: "03",
    title: "Trouvez un adversaire",
    text: "Recherchez parmi les annonces ouvertes et contactez le club qui correspond à vos critères.",
  },
  {
    n: "04",
    title: "Organisez le match",
    text: "Le site met en relation, le reste se règle directement par téléphone ou WhatsApp.",
  },
];

export default async function Home() {
  const latest = await fetchAnnoncesLanding(3);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow text-accent">Matchs amicaux · Football amateur</p>
          <h1 className="headline mt-3 max-w-3xl text-5xl text-paper sm:text-6xl md:text-7xl">
            Trouvez un adversaire.
            <span className="block text-accent">Organisez un match.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            La plateforme dédiée aux clubs amateurs de football pour publier,
            rechercher et organiser des matchs amicaux en toute simplicité.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/annonces" prefetch className="btn-accent">
              Rechercher un match
            </Link>
            <Link href="/dashboard/annonces/nouvelle" prefetch className="btn-ghost">
              Proposer un match
            </Link>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
            <div>
              <dt className="headline text-3xl text-accent">0€</dt>
              <dd className="mt-1 text-xs text-muted">Gratuit pour les clubs</dd>
            </div>
            <div>
              <dt className="headline text-3xl text-paper">2 min</dt>
              <dd className="mt-1 text-xs text-muted">Pour publier une annonce</dd>
            </div>
            <div>
              <dt className="headline text-3xl text-paper">100%</dt>
              <dd className="mt-1 text-xs text-muted">Clubs vérifiés</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="eyebrow text-accent">Comment ça marche</p>
        <h2 className="headline mt-2 text-3xl text-paper sm:text-4xl">
          Quatre étapes pour jouer
        </h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.n} className="card card-hover p-6">
              <p className="headline text-4xl text-accent">{s.n}</p>
              <h3 className="headline mt-3 text-xl text-paper">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* DERNIERES ANNONCES */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="eyebrow text-accent">Dernières annonces</p>
              <h2 className="headline mt-2 text-3xl text-paper">
                Les clubs cherchent un adversaire
              </h2>
            </div>
            <Link href="/annonces" prefetch className="btn-ghost text-sm">
              Voir toutes les annonces →
            </Link>
          </div>

          {latest.length === 0 ? (
            <p className="mt-6 text-muted">Aucune annonce pour le moment.</p>
          ) : (
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((a) => (
                <li key={a.id} className="card card-hover p-5">
                  <Link href={`/annonces/${a.id}`} className="group block">
                    <p className="eyebrow">{a.equipe.categorie}</p>
                    <p className="headline mt-1 text-xl text-paper group-hover:text-accent">
                      {a.equipe.niveau ?? "Niveau non précisé"}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {a.date} · {a.heure} · {a.domicileExterieur}
                    </p>
                    <p className="mt-1 text-xs text-muted-2">{a.club.nom} · {a.club.ville}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="card flex flex-col items-center gap-4 p-8 text-center">
          <p className="headline text-2xl text-paper">Prêt à trouver un adversaire ?</p>
          <p className="max-w-lg text-sm text-muted">
            Rejoignez les clubs amateurs qui utilisent Matchs Amicaux pour
            organiser leurs matchs amicaux sans friction.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/annonces" prefetch className="btn-accent">
              Rechercher un match
            </Link>
            <Link href="/dashboard/annonces/nouvelle" prefetch className="btn-ghost">
              Proposer un match
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
