import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackgroundVideo } from "@/components/BackgroundVideo";
import { getCurrentClub } from "@/lib/auth";

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

// Layout racine dynamique : le header reflète l'état de connexion sur toutes les
// pages. Les pages publiques perdent le cache CDN/ISR statique, mais l'expérience
// utilisateur est cohérente (pas de header "déconnecté" sur les pages publiques).
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const club = await getCurrentClub();
  const headerClub = club
    ? {
        id: club.id,
        nom: club.nom,
        role: club.role as "club" | "admin",
      }
    : null;

  return (
    <html
      lang="fr"
      className={`${inter.variable} ${barlow.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <BackgroundVideo />
        <Header club={headerClub} />
        <main className="relative z-10 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}