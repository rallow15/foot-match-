"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { LogoutLink } from "./LogoutLink";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/annonces", label: "Rechercher" },
  { href: "/matchs-confirmees", label: "Matchs confirmés" },
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/ajouter-ecran-accueil", label: "Installer l’app" },
];

interface Club {
  id: string;
  nom: string;
  role: "club" | "admin";
}

export function HeaderStatic() {
  const [club, setClub] = useState<Club | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setClub(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setClub(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#E0F2FE]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} prefetch className="transition-colors hover:text-ink-2">
              {link.label}
            </Link>
          ))}
          {club?.role === "club" && (
            <Link href="/dashboard" prefetch className="transition-colors hover:text-ink-2">
              Mon espace
            </Link>
          )}
          {club?.role === "admin" && (
            <Link href="/admin" prefetch className="transition-colors hover:text-ink-2">
              Validation
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {club ? (
            <>
              <span className="hidden text-sm text-ink sm:inline">{club.nom}</span>
              <LogoutLink className="hidden md:inline" />
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
        </div>
      </div>
    </header>
  );
}
