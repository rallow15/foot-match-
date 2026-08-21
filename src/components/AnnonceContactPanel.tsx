"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContactForm } from "./ContactForm";

interface Club {
  id: string;
  nom: string;
  role: "club" | "admin";
}

interface Props {
  annonceId: string;
  annonceClubId: string;
}

export function AnnonceContactPanel({ annonceId, annonceClubId }: Props) {
  const [club, setClub] = useState<Club | null | undefined>(undefined);

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

  if (club === undefined) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    );
  }

  const isOwn = club?.id === annonceClubId;
  const canContact =
    !!club && club.role === "club" && !isOwn;

  if (isOwn) {
    return (
      <div className="card p-6 text-center">
        <p className="headline text-xl text-paper">C&apos;est votre annonce</p>
        <p className="mt-2 text-sm text-muted">Gérez-la depuis votre espace club.</p>
        <Link href="/dashboard" className="btn-ghost mt-4">Mon espace</Link>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="card p-6 text-center">
        <p className="headline text-xl text-paper">Connectez-vous pour contacter</p>
        <p className="mt-2 text-sm text-muted">La mise en relation est réservée aux clubs vérifiés.</p>
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/login" className="btn-accent">Se connecter</Link>
          <Link href="/inscription" className="btn-ghost">Inscrire mon club</Link>
        </div>
      </div>
    );
  }

  return <ContactForm annonceId={annonceId} />;
}
