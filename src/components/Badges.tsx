import { STATUT_VERIF_LABEL, STATUT_ANNONCE_LABEL } from "@/lib/referential";

export function StatutAnnonceBadge({ statut }: { statut: string }) {
  const label = STATUT_ANNONCE_LABEL[statut as keyof typeof STATUT_ANNONCE_LABEL] ?? statut;
  if (statut === "ouvert") return <span className="chip-accent">{label}</span>;
  if (statut === "confirme") return <span className="chip-muted">{label}</span>;
  return <span className="chip-danger">{label}</span>;
}

export function StatutVerifBadge({ statut }: { statut: string }) {
  const label = STATUT_VERIF_LABEL[statut as keyof typeof STATUT_VERIF_LABEL] ?? statut;
  if (statut === "valide")
    return (
      <span className="chip-accent">
        <span className="stat-dot bg-accent" />
        {label}
      </span>
    );
  if (statut === "refuse") return <span className="chip-danger">{label}</span>;
  return (
    <span className="chip-gold">
      <span className="stat-dot bg-gold" />
      {label}
    </span>
  );
}

export function NiveauBadge({ niveau }: { niveau: string }) {
  if (!niveau) return null;
  if (niveau === "National")
    return <span className="chip-gold">{niveau}</span>;
  return <span className="chip-muted">{niveau}</span>;
}

export function VerifiedBadge() {
  return (
    <span className="chip-accent" title="Club vérifié">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Vérifié
    </span>
  );
}