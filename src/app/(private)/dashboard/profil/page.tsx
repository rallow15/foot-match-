import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClub } from "@/lib/auth";
import { ClubAvatar } from "@/components/ClubAvatar";
import { LogoForm } from "@/components/dashboard/LogoForm";
import { ProfilForm } from "@/components/dashboard/ProfilForm";
import { LogoutAllDevicesButton } from "@/components/dashboard/LogoutAllDevicesButton";
import { StatutVerifBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const club = await getCurrentClub();
  if (!club) redirect("/login");
  if (club.role === "admin") redirect("/admin");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-accent">Mon espace</p>
      <h1 className="headline title-bar mt-1 text-3xl text-paper">Profil</h1>

      {/* Aperçu profil public */}
      <section className="card mt-6 p-6">
        <div className="flex items-center gap-4">
          <ClubAvatar club={{ nom: club.nom, logoUrl: club.logoUrl }} size={72} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="headline text-2xl text-paper">{club.nom}</h2>
              <StatutVerifBadge statut={club.statutVerification} />
            </div>
            <p className="mt-1 text-sm text-muted">
              📍 {club.district} · {club.ville} ({club.codePostal})
            </p>
            <p className="mt-0.5 text-xs text-muted-2">Ligue {club.ligue}</p>
          </div>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <Link href={`/clubs/${club.id}`} className="btn-ghost text-sm">
            Voir mon profil public →
          </Link>
        </div>
      </section>

      {/* Informations du club */}
      <section className="mt-8">
        <h2 className="headline text-xl text-paper">Informations du club</h2>
        <p className="mt-1 text-sm text-muted">
          Modifiez les informations visibles sur votre profil public et vos annonces.
        </p>
        <div className="mt-4">
          <ProfilForm club={club} />
        </div>
      </section>

      {/* Gestion du logo */}
      <section className="mt-10">
        <h2 className="headline text-xl text-paper">Logo</h2>
        <p className="mt-1 text-sm text-muted">
          Votre logo apparaît sur vos annonces et votre profil public.
        </p>
        <div className="mt-4">
          <LogoForm />
        </div>
      </section>

      {/* Sécurité */}
      <section className="mt-10">
        <h2 className="headline text-xl text-paper">Sécurité</h2>
        <p className="mt-1 text-sm text-muted">
          Si vous pensez que votre compte a été utilisé sur un autre appareil sans votre accord, déconnectez-le partout.
        </p>
        <LogoutAllDevicesButton />
      </section>
    </div>
  );
}