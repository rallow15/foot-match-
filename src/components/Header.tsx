"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Rechercher" },
  { href: "/comment-ca-marche", label: "Comment ça marche" },
];

interface HeaderProps {
  club?: {
    id: string;
    nom: string;
    role: "club" | "admin";
  } | null;
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
    <div className="absolute left-0 right-0 top-16 z-50 border-b border-line bg-ink shadow-lg md:hidden">
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
            <LogoutButton className="w-full" />
          </div>
        ) : (
          <>
            <MobileNavItem href="/login" onClick={onClose}>Se connecter</MobileNavItem>
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
      onClick={onClick}
      className="rounded-sm px-3 py-3 text-sm font-medium text-muted transition-colors hover:bg-ink-3 hover:text-paper"
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-muted hover:text-paper focus:outline-none focus:ring-2 focus:ring-accent md:hidden"
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

export function Header({ club }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = club?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-paper ${
                pathname === link.href ? "text-paper" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
          {club && club.role === "club" && (
            <Link
              href="/dashboard"
              className={`transition-colors hover:text-paper ${
                pathname?.startsWith("/dashboard") ? "text-paper" : ""
              }`}
            >
              Mon espace
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className={`transition-colors hover:text-accent ${
                pathname?.startsWith("/admin") ? "text-accent" : ""
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
                  className="hidden text-sm text-muted hover:text-paper sm:inline"
                >
                  {club.nom}
                </Link>
              ) : (
                <span className="hidden text-sm text-muted sm:inline">{club.nom}</span>
              )}
              <LogoutButton className="hidden md:inline" />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden text-sm md:inline">
                Se connecter
              </Link>
              <Link href="/inscription" className="btn-accent text-sm">
                Inscrire mon club
              </Link>
            </>
          )}

          <HamburgerButton isOpen={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
        </div>
      </div>

      <div id="mobile-menu">
        <MobileMenu isOpen={menuOpen} club={club} onClose={() => setMenuOpen(false)} />
      </div>
    </header>
  );
}
