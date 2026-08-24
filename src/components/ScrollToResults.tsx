"use client";

import { useEffect } from "react";

export function ScrollToResults() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isSearch = new URLSearchParams(window.location.search).toString().length > 0;
    if (!isSearch) return;

    const el = document.getElementById("annonces-results");
    if (!el) return;

    // Le header sticky fait 64px (h-16). On aligne le haut du résultat
    // juste sous le header, sans marge supplémentaire.
    const headerOffset = 64;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "auto" });
  }, []);

  return null;
}
