"use client";

import { useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "onboarding_seen";

function isOnboardingVisible(statut: string): boolean {
  if (statut !== "valide") return false;
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function OnboardingBanner({ statut }: { statut: string }) {
  const [visible, setVisible] = useState(() => isOnboardingVisible(statut));

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div className="card mt-6 border-accent/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display uppercase text-accent">Votre compte est validé 🎉</p>
          <p className="mt-2 text-sm text-paper">
            Trois étapes pour trouver un match :
          </p>
          <ol className="mt-2 list-decimal pl-5 text-sm text-muted">
            <li>Vérifiez vos équipes ci-dessous.</li>
            <li>
              <Link href="/dashboard/annonces/nouvelle" className="text-accent hover:underline">
                Publiez une annonce
              </Link>{" "}
              avec date, horaire et catégorie.
            </li>
            <li>
              Consultez{" "}
              <Link href="/annonces" className="text-accent hover:underline">
                les annonces des autres clubs
              </Link>{" "}
              pour les contacter.
            </li>
          </ol>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-muted hover:text-paper"
          aria-label="Masquer"
        >
          Masquer
        </button>
      </div>
    </div>
  );
}
