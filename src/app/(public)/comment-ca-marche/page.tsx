import Link from "next/link";

const steps = [
  {
    n: "01",
    title: "Inscrivez votre club",
    text: "Renseignez le nom, la ville et les coordonnées du club. Téléversez une licence de dirigeant/éducateur en cours de validité. Votre compte est vérifié manuellement pour éviter les faux clubs.",
  },
  {
    n: "02",
    title: "Créez vos équipes",
    text: "Un club peut avoir plusieurs équipes (ex. une U15 et une Seniors). Pour chacune, choisissez la catégorie d'âge et le niveau (Départemental, Régional, National).",
  },
  {
    n: "03",
    title: "Publiez une annonce",
    text: "Date, horaire, domicile/extérieur, stade disponible, arbitre disponible, niveau souhaité, note libre. En quelques clics votre recherche est en ligne.",
  },
  {
    n: "04",
    title: "Cherchez un match",
    text: "Filtrez par catégorie, date, distance autour d'une ville, stade/arbitre disponible. Les annonces ouvertes les plus proches dans le temps remontent en premier.",
  },
  {
    n: "05",
    title: "Contactez",
    text: "Un clic sur « Contacter le club » envoie vos coordonnées au club annonceur, qui vous notifie. Le reste se règle par téléphone ou WhatsApp — le site sort de l'équation.",
  },
];

export default function CommentCaMarchePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <p className="eyebrow text-accent">Guide</p>
      <h1 className="headline mt-2 max-w-2xl text-4xl text-paper sm:text-5xl">
        Comment ça marche
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Une plateforme simple de matchmaking de matchs amicaux. Pas de gestion de
        résultats, pas de compétition — juste de la mise en relation.
      </p>

      <ol className="mt-10 grid gap-5 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.n} className="card card-hover p-6">
            <p className="headline text-4xl text-accent">{s.n}</p>
            <h2 className="headline mt-3 text-xl text-paper">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="card mt-10 flex flex-col items-center gap-4 p-8 text-center">
        <p className="headline text-2xl text-paper">Prêt à trouver un adversaire ?</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/annonces" className="btn-accent">Rechercher un match</Link>
          <Link href="/inscription" className="btn-ghost">Inscrire mon club</Link>
        </div>
      </div>
    </div>
  );
}