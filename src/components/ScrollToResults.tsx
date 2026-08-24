"use client";

import { useEffect } from "react";

export function ScrollToResults() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#annonces-results") {
      const el = document.getElementById("annonces-results");
      if (el) {
        // Le header sticky fait ~64px. On place le haut du résultat pile
      // sous le header avec un petit espace visuel.
      const headerOffset = 84;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: "auto" });
      }
    }
  }, []);

  return null;
}
