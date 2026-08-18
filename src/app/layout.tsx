import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackgroundVideo } from "@/components/BackgroundVideo";
import { getCurrentClub } from "@/lib/auth";
import { countUnreadConversations } from "@/lib/queries";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const club = await getCurrentClub();
  const clubLite = club ? { id: club.id, nom: club.nom, role: club.role as "club" | "admin" } : null;
  const unreadCount = clubLite ? await countUnreadConversations(clubLite.id) : 0;

  return (
    <html
      lang="fr"
      className={`${inter.variable} ${barlow.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <BackgroundVideo />
        <Header club={clubLite} unreadCount={unreadCount} />
        <main className="relative z-10 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}