// Référentiel figé — catégories d'âge, niveaux, enums de statut.
// Source unique de vérité partagée entre formulaires, recherche et seed.

export type Groupe = "jeunes" | "adultes";

export interface CategorieDef {
  value: string;
  label: string;
  groupe: Groupe;
  niveaux: string[]; // niveaux possibles pour cette catégorie
}

export const CATEGORIES: CategorieDef[] = [
  // Jeunes — niveaux affinés d'après les règlements FFF / Ligues 2025-2026 :
  //  - U6→U11 : compétitions officielles essentiellement départementales (plateaux/district, à 8).
  //  - Dès U13 : championnats de Ligue (Régional) possibles.
  //  - National = Championnat National U17 & U19 uniquement (donc U16/U17 et U18/U19).
  { value: "U6/U7", label: "U6/U7", groupe: "jeunes", niveaux: ["Départemental"] },
  { value: "U8/U9", label: "U8/U9", groupe: "jeunes", niveaux: ["Départemental"] },
  { value: "U10/U11", label: "U10/U11", groupe: "jeunes", niveaux: ["Départemental"] },
  { value: "U12/U13", label: "U12/U13", groupe: "jeunes", niveaux: ["Départemental", "Régional"] },
  { value: "U14/U15", label: "U14/U15", groupe: "jeunes", niveaux: ["Départemental", "Régional"] },
  { value: "U16/U17", label: "U16/U17", groupe: "jeunes", niveaux: ["Départemental", "Régional", "National"] },
  { value: "U18/U19", label: "U18/U19", groupe: "jeunes", niveaux: ["Départemental", "Régional", "National"] },
  // Adultes / Loisirs
  { value: "Seniors", label: "Seniors", groupe: "adultes", niveaux: ["Régional", "Départemental"] },
  { value: "Vétérans/Loisirs", label: "Vétérans / Loisirs", groupe: "adultes", niveaux: [] },
];

export const CATEGORIE_VALUES = CATEGORIES.map((c) => c.value);

export function getCategorie(value: string): CategorieDef | undefined {
  return CATEGORIES.find((c) => c.value === value);
}

export function niveauxForCategorie(value: string): string[] {
  return getCategorie(value)?.niveaux ?? [];
}

export function isValidCategorie(value: string): boolean {
  return CATEGORIE_VALUES.includes(value);
}

export function isValidNiveauFor(categorie: string, niveau: string): boolean {
  return niveauxForCategorie(categorie).includes(niveau);
}

// Statuts de vérification du compte club
export const STATUT_VERIF = ["en_attente", "valide", "refuse"] as const;
export type StatutVerif = (typeof STATUT_VERIF)[number];
export const STATUT_VERIF_LABEL: Record<StatutVerif, string> = {
  en_attente: "En attente de vérification",
  valide: "Validé",
  refuse: "Refusé",
};

// Domicile / extérieur
export const DOM_EXT = ["domicile", "exterieur", "indifferent"] as const;
export type DomExt = (typeof DOM_EXT)[number];
export const DOM_EXT_LABEL: Record<DomExt, string> = {
  domicile: "À domicile",
  exterieur: "À l'extérieur",
  indifferent: "Indifférent",
};

// Statut d'annonce
export const STATUT_ANNONCE = ["ouvert", "pourvu", "annule"] as const;
export type StatutAnnonce = (typeof STATUT_ANNONCE)[number];
export const STATUT_ANNONCE_LABEL: Record<StatutAnnonce, string> = {
  ouvert: "Ouvert",
  pourvu: "Pourvu",
  annule: "Annulé",
};

// Niveaux globaux (pour libellés)
export const NIVEAU_LABEL: Record<string, string> = {
  Départemental: "Départemental (District)",
  Régional: "Régional (Ligue)",
  National: "National",
};