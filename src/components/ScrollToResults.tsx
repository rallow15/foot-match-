"use client";

import { useEffect } from "react";

export function ScrollToResults() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#annonces-results") {
      const el = document.getElementById("annonces-results");
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
      }
    }
  }, []);

  return null;
}
