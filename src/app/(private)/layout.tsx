import { getCurrentClub } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({
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
    <>
      <Header club={headerClub} />
      <main className="relative z-10 flex-1 fade-in">{children}</main>
      <Footer />
    </>
  );
}
