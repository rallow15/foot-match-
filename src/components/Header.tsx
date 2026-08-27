"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Accueil" },
  { href: "/annonces", label: "Rechercher" },
  { href: "/matchs-confirmees", label: "Matchs confirmés" },
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/ajouter-ecran-accueil", label: "Installer l’app" },
];

interface ClubInfo {
  id: string;
  nom: string;
  role: "club" | "admin";
}

interface HeaderProps {
  // undefined  = l'état n'est pas encore connu, le header le chargera côté client
  // null       = l'utilisateur est déconnecté
  // { ... }    = l'utilisateur est connecté (fourni par les pages privées)
  club?: ClubInfo | null;
}

function useClubFromApi(initialClub: ClubInfo | null | undefined) {
  const [club, setClub] = useState<ClubInfo | null | undefined>(initialClub);

  useEffect(() => {
    // Si le layout fournit déjà une valeur (pages privées), on ne refait pas l'appel.
    if (initialClub !== undefined) return;

    let cancelled = false;

    fetch("/api/me", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error("me fetch failed");
        return res.json();
      })
      .then((data: { club: ClubInfo | null }) => {
        if (!cancelled) setClub(data.club ?? null);
      })
      .catch(() => {
        if (!cancelled) setClub(null);
      });

    return () => {
      cancelled = true;
    };
  }, [initialClub]);

  return club;
}

function MobileMenu({
  isOpen,
  club,
  onClose,
}: {
  isOpen: boolean;
  club?: HeaderProps["club"];
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute left-0 right-0 top-16 z-50 border-b border-line bg-[#E0F2FE] shadow-lg md:hidden">
      <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
        {NAV_LINKS.map((link) => (
          <MobileNavItem key={link.href} href={link.href} onClick={onClose}>
            {link.label}
          </MobileNavItem>
        ))}
        {club?.role === "club" && (
          <MobileNavItem href="/dashboard" onClick={onClose}>
            Mon espace
          </MobileNavItem>
        )}
        {club?.role === "admin" && (
          <MobileNavItem href="/admin" onClick={onClose}>
            Validation
          </MobileNavItem>
        )}
        {club ? (
          <div className="mt-2 border-t border-line pt-2">
            <LogoutButton className="w-full" variant="accent" />
          </div>
        ) : (
          <>
            <MobileNavItem href="/login" onClick={onClose}>
              Se connecter
            </MobileNavItem>
            <MobileNavItem href="/inscription" onClick={onClose}>
              Inscrire mon club
            </MobileNavItem>
          </>
        )}
      </nav>
    </div>
  );
}

function MobileNavItem({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={onClick}
      className="rounded-sm px-3 py-3 text-sm font-medium text-ink transition-colors hover:bg-[#B9E6FE] hover:text-ink-2"
    >
      {children}
    </Link>
  );
}

function HamburgerButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink hover:text-ink-2 focus:outline-none focus:ring-2 focus:ring-accent md:hidden"
      aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
      aria-expanded={isOpen}
      aria-controls="mobile-menu"
    >
      <div className="flex h-5 w-6 flex-col justify-between">
        <span
          className={`block h-0.5 rounded-full bg-current transition-transform duration-200 ${
            isOpen ? "translate-y-2.25 rotate-45" : ""
          }`}
        />
        <span
          className={`block h-0.5 rounded-full bg-current transition-opacity duration-200 ${
            isOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block h-0.5 rounded-full bg-current transition-transform duration-200 ${
            isOpen ? "-translate-y-2.25 -rotate-45" : ""
          }`}
        />
      </div>
    </button>
  );
}

function HeaderSkeleton() {
  return (
    <>
      <nav className="hidden items-center gap-7 text-sm font-medium text-ink md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            className="transition-colors hover:text-ink-2"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden h-8 w-24 animate-pulse rounded bg-line md:inline" />
        <div className="h-9 w-28 animate-pulse rounded bg-accent/30" />
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm md:hidden">
          <div className="flex h-5 w-6 flex-col justify-between">
            <span className="block h-0.5 rounded-full bg-ink/50" />
            <span className="block h-0.5 rounded-full bg-ink/50" />
            <span className="block h-0.5 rounded-full bg-ink/50" />
          </div>
        </div>
      </div>
    </>
  );
}

export function Header({ club: initialClub }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const club = useClubFromApi(initialClub);
  const isAdmin = club?.role === "admin";
  const isLoading = club === undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#E0F2FE]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        {isLoading ? (
          <HeaderSkeleton />
        ) : (
          <>
            <nav className="hidden items-center gap-7 text-sm font-medium text-ink md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  className={`transition-colors hover:text-ink-2 ${
                    pathname === link.href ? "text-ink-2" : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {club && club.role === "club" && (
                <Link
                  href="/dashboard"
                  prefetch
                  className={`transition-colors hover:text-ink-2 ${
                    pathname?.startsWith("/dashboard") ? "text-ink-2" : ""
                  }`}
                >
                  Mon espace
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  prefetch
                  className={`transition-colors hover:text-ink-2 ${
                    pathname?.startsWith("/admin") ? "text-ink-2" : ""
                  }`}
                >
                  Validation
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {club ? (
                <>
                  {club.role === "club" ? (
                    <Link
                      href="/dashboard/profil"
                      className="hidden text-sm text-ink hover:text-ink-2 sm:inline"
                    >
                      {club.nom}
                    </Link>
                  ) : (
                    <span className="hidden text-sm text-ink sm:inline">{club.nom}</span>
                  )}
                  <LogoutButton className="hidden md:inline" variant="accent" />
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost-light hidden text-sm md:inline">
                    Se connecter
                  </Link>
                  <Link href="/inscription" className="btn-accent text-sm">
                    Inscrire mon club
                  </Link>
                </>
              )}

              <HamburgerButton isOpen={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
            </div>
          </>
        )}
      </div>

      <div id="mobile-menu">
        <MobileMenu isOpen={menuOpen} club={club} onClose={() => setMenuOpen(false)} />
      </div>
    </header>
  );
}
