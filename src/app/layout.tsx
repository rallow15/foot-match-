import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { BackgroundVideo } from "@/components/BackgroundVideo";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const barlow = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Matchs Amicaux — Trouvez un club pour un match amical",
  description:
    "La plateforme qui met en relation les clubs amateurs de football pour organiser des matchs amicaux. Proposez, cherchez, contactez.",
};

// Layout racine : structure commune (fonts, fond, footer). Le Header est fourni
// par les layouts des groupes de routes : (public) pour le header anonyme,
// (private) pour le header connecté. Ainsi les pages publiques restent statiques
// et cacheables par le CDN/ISR.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${barlow.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <BackgroundVideo />
        <main className="relative z-10 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}