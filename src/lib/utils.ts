import { getCategorie, DOM_EXT_LABEL, STATUT_ANNONCE_LABEL } from "./referential";

export function formatDateFR(iso: string): string {
  // iso = yyyy-mm-dd
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatDateLongFR(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function annonceLabel(args: {
  categorie: string;
  date: string;
  heure: string;
}): string {
  const cat = getCategorie(args.categorie)?.label ?? args.categorie;
  return `${cat} · ${formatDateFR(args.date)} · ${args.heure}`;
}

export function relTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mn = Math.round(diff / 60000);
  if (mn < 1) return "à l'instant";
  if (mn < 60) return `il y a ${mn} min`;
  const h = Math.round(mn / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j < 30) return `il y a ${j} j`;
  return date.toLocaleDateString("fr-FR");
}

export function domExtLabel(v: string): string {
  return (DOM_EXT_LABEL as Record<string, string>)[v] ?? v;
}

export function statutAnnonceLabel(v: string): string {
  return (STATUT_ANNONCE_LABEL as Record<string, string>)[v] ?? v;
}