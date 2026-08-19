import Link from "next/link";
import { fetchMatchsConfirmes } from "@/lib/queries";
import { getCategorie, DOM_EXT_LABEL } from "@/lib/referential";
import { LIGUES, districtsForLigue } from "@/lib/ligues";
import { formatDateLongFR } from "@/lib/utils";

export const metadata = {
  title: "Matchs confirmés — Matchs Amicaux",
  description:
    "Découvrez les matchs amicaux confirmés entre clubs amateurs de football.",
};

// Les filtres rendent la page dynamique, mais la requête DB est cachée.
export const revalidate = 60;

export default async function MatchsConfirmesPage({
  searchParams,
}: {
  searchParams: Promise<{ ligue?: string; district?: string }>;
}) {
  const params = await searchParams;
  const ligue = typeof params.ligue === "string" ? params.ligue : "";
  const requestedDistrict =
    typeof params.district === "string" ? params.district : "";

  const availableDistricts = ligue ? districtsForLigue(ligue) : [];
  const district = availableDistricts.includes(requestedDistrict)
    ? requestedDistrict
    : "";

  const annonces = await fetchMatchsConfirmes(ligue, district);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Matchs amicaux · Football amateur</p>
      <h1 className="headline title-bar mt-1 text-3xl text-paper">
        Matchs confirmés
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Les matchs amicaux organisés entre clubs via Matchs Amicaux.
      </p>

      <form
        method="get"
        action="/matchs-confirmees"
        className="card mt-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label htmlFor="ligue" className="label">
            Ligue
          </label>
          <select
            id="ligue"
            name="ligue"
            className="input"
            defaultValue={ligue}
          >
            <option value="">Toutes les ligues</option>
            {LIGUES.map((l) => (
              <option key={l.ligue} value={l.ligue}>
                {l.ligue}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="district" className="label">
            District (sous-ligue)
          </label>
          <select
            id="district"
            name="district"
            className="input"
            defaultValue={district}
            disabled={availableDistricts.length === 0}
          >
            <option value="">Tous les districts</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-3">
          <button type="submit" className="btn-accent">
            Filtrer
          </button>
          <Link href="/matchs-confirmees" className="btn-ghost">
            Réinitialiser
          </Link>
        </div>
      </form>

      {annonces.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="headline text-2xl text-paper">
            Aucun match confirmé pour cette sélection
          </p>
          <p className="mt-2 text-muted">
            Essayez d’élargir la zone géographique ou revenez plus tard.
          </p>
          <Link href="/annonces" className="btn-accent mt-4 inline-block">
            Rechercher un match
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {annonces.map((a) => {
            const cat = getCategorie(a.equipe.categorie);
            const dom = a.domicileExterieur as keyof typeof DOM_EXT_LABEL;

            return (
              <li key={a.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">
                      {cat?.groupe === "jeunes" ? "Jeunes" : "Adultes / Loisirs"}
                    </p>
                    <h2 className="headline mt-1 text-2xl text-paper">
                      {cat?.label}
                    </h2>
                    {a.equipe.niveau && (
                      <p className="mt-1 text-sm text-muted-2">
                        {a.equipe.niveau}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="headline text-xl text-accent">
                      {a.adversaireNom ? `VS ${a.adversaireNom}` : "VS"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-1 text-sm text-muted">
                  <p>
                    📅 {formatDateLongFR(a.date)} · {a.heure}
                  </p>
                  <p>
                    📍 {DOM_EXT_LABEL[dom] ?? dom} · {a.club.ville}
                  </p>
                  <p>
                    🏟️ {a.club.nom}
                    {a.stadeDispo && a.stadeNom ? ` · ${a.stadeNom}` : ""}
                  </p>
                  {(a.club.ligue || a.club.district) && (
                    <p>
                      📌 {a.club.ligue}
                      {a.club.district ? ` · ${a.club.district}` : ""}
                    </p>
                  )}
                </div>

                {a.note && (
                  <p className="mt-3 text-sm italic leading-relaxed text-muted">
                    « {a.note} »
                  </p>
                )}

                <div className="mt-4 border-t border-line pt-4">
                  <Link
                    href={`/annonces/${a.id}`}
                    className="text-sm text-accent hover:underline"
                  >
                    Voir l’annonce →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
