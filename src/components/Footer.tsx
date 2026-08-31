import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative z-0 mt-12 border-t border-line bg-[#E0F2FE]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-ink">
            La plateforme qui met en relation les clubs amateurs de football pour
            organiser des matchs amicaux.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-2 text-[0.65rem] text-ink-2">Plateforme</p>
          <ul className="space-y-1.5 text-xs text-ink">
            <li><Link href="/annonces" className="hover:text-ink-2 transition-colors">Rechercher</Link></li>
            <li><Link href="/matchs-confirmees" className="hover:text-ink-2 transition-colors">Confirmés</Link></li>
            <li><Link href="/inscription" className="hover:text-ink-2 transition-colors">Inscription</Link></li>
            <li><Link href="/comment-ca-marche" className="hover:text-ink-2 transition-colors">Comment ça marche</Link></li>
            <li><Link href="/ajouter-ecran-accueil" className="hover:text-ink-2 transition-colors">Installer l’app</Link></li>
            <li><Link href="/contact" className="hover:text-ink-2 transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-2 text-[0.65rem] text-ink-2">À propos</p>
          <ul className="space-y-1.5 text-xs text-ink-2">
            <li className="text-ink-2">MVP lancement ciblé</li>
            <li className="text-ink-2">Licences vérifiées manuellement</li>
            <li className="text-ink-2">Sans gestion de résultats</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3 text-[11px] text-ink-2 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Matchs Amicaux — MVP</p>
          <p>Fait pour le foot amateur</p>
        </div>
      </div>
    </footer>
  );
}