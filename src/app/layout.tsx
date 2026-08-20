import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
        <div
          className="fixed inset-0 z-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(1200px 600px at 80% -10%, rgba(46, 224, 106, 0.10), transparent 60%), " +
              "radial-gradient(1000px 500px at 0% 0%, rgba(45, 125, 246, 0.12), transparent 55%), " +
              "linear-gradient(180deg, #0a1115 0%, #0d1418 100%)",
          }}
        />
        <Header club={headerClub} />
        <main className="relative z-10 flex-1 fade-in">{children}</main>
        <Footer />
      </body>
    </html>
  );
}