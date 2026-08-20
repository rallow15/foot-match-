import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Matchs Amicaux",
    short_name: "Matchs Amicaux",
    description:
      "Plateforme de mise en relation entre clubs amateurs de football pour organiser des matchs amicaux.",
    start_url: "/",
    display: "standalone",
    background_color: "#E0F2FE",
    theme_color: "#E0F2FE",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
