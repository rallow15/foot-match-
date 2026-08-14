import Image from "next/image";

interface ClubAvatarProps {
  club: { nom: string; logoUrl: string | null };
  size?: number;
  className?: string;
}

// Initiales (jusqu'à 2) pour le fallback sans logo.
function initials(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Avatar de club : logo servi publiquement via /api/logos/* si présent,
// sinon fallback sur les initiales (fond ink-4, texte accent).
export function ClubAvatar({ club, size = 40, className = "" }: ClubAvatarProps) {
  const font = Math.round(size * 0.4);
  if (club.logoUrl) {
    return (
      <Image
        src={club.logoUrl}
        alt={`Logo ${club.nom}`}
        width={size}
        height={size}
        className={`shrink-0 rounded-full border border-line object-cover ${className}`}
        unoptimized
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-line bg-ink-4 font-display font-bold text-accent ${className}`}
      style={{ width: size, height: size, fontSize: font, letterSpacing: "0.02em" }}
      aria-hidden
    >
      {initials(club.nom)}
    </div>
  );
}