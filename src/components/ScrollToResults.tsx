"use client";

import { useEffect } from "react";

export function ScrollToResults() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#annonces-results") {
      const el = document.getElementById("annonces-results");
      if (el) {
        // Le header sticky fait 64px (h-16). On aligne le haut du résultat
      // juste sous le header, sans marge supplémentaire.
      const headerOffset = 64;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: "auto" });
      }
    }
  }, []);

  return null;
}
