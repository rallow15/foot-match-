import Link from "next/link";
import { Logo } from "./Logo";
import { getCurrentClub } from "@/lib/auth";
import { logoutAction } from "@/app/actions";

export async function Header() {
  const club = await getCurrentClub();
  const isAdmin = club?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
          <Link href="/" className="transition-colors hover:text-paper">
            Rechercher
          </Link>
          <Link href="/comment-ca-marche" className="transition-colors hover:text-paper">
            Comment ça marche
          </Link>
          {club && club.role === "club" && (
            <Link href="/dashboard" className="transition-colors hover:text-paper">
              Mon espace
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="transition-colors hover:text-accent">
              Validation
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {club ? (
            <>
              {club.role === "club" ? (
                <Link href="/dashboard/profil" className="hidden text-sm text-muted hover:text-paper sm:inline">
                  {club.nom}
                </Link>
              ) : (
                <span className="hidden text-sm text-muted sm:inline">
                  {club.nom}
                </span>
              )}
              <form action={logoutAction}>
                <button className="btn-ghost text-sm" type="submit">
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm">
                Se connecter
              </Link>
              <Link href="/inscription" className="btn-accent text-sm">
                Inscrire mon club
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}