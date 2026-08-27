import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";

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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Matchs Amicaux",
    startupImage: {
      url: "/icon-512x512.png",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

// Layout racine statique : ne contient que le squelette HTML/CSS commun.
// Le Header, Footer et main sont gérés par les layouts de chaque groupe :
// - (public)/layout.tsx  : Header client + Footer pour les pages publiques
// - (private)/layout.tsx : Header serveur + Footer pour les pages protégées
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        {children}
      </body>
    </html>
  );
}
