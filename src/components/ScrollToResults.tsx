"use client";

import { useEffect } from "react";

export function ScrollToResults() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#annonces-results") {
      const el = document.getElementById("annonces-results");
      if (el) {
        // On laisse une petite marge sous le header sticky (h-16 = 64px + gap)
      const headerOffset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: "auto" });
      }
    }
  }, []);

  return null;
}
