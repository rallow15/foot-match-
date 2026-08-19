import { redirect } from "next/navigation";
import { getCurrentClub } from "@/lib/auth";
import { Header } from "@/components/Header";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const club = await getCurrentClub();
  if (!club) redirect("/login");
  if (club.role !== "club" && club.role !== "admin") redirect("/login");

  return (
    <>
      <Header club={{ id: club.id, nom: club.nom, role: club.role }} />
      {children}
    </>
  );
}
