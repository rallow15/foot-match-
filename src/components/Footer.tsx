import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative z-10 mt-20 border-t border-line bg-ink-2">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            La plateforme qui met en relation les clubs amateurs de football pour
            organiser des matchs amicaux. Proposez, cherchez, contactez — le reste
            se règle par téléphone ou WhatsApp.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-3">Plateforme</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/annonces" className="hover:text-paper">Rechercher un match</Link></li>
            <li><Link href="/matchs-confirmees" className="hover:text-paper">Matchs confirmés</Link></li>
            <li><Link href="/inscription" className="hover:text-paper">Inscrire mon club</Link></li>
            <li><Link href="/comment-ca-marche" className="hover:text-paper">Comment ça marche</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">À propos</p>
          <ul className="space-y-2 text-sm text-muted">
            <li className="text-muted-2">MVP — zone de lancement ciblée</li>
            <li className="text-muted-2">Vérification manuelle des licences</li>
            <li className="text-muted-2">Pas de gestion de résultats</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-2 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Matchs Amicaux — démo MVP</p>
          <p>Fait pour le foot amateur</p>
        </div>
      </div>
    </footer>
  );
}