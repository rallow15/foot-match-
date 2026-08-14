// Référentiel géographique FFF : 13 Ligues régionales et leurs Districts (sous-ligues).
// Source : organisation FFF (Ligue régionale → District).
// Note : la liste ci-dessous couvre les districts fournis pour le MVP.

export interface LigueDef {
  ligue: string;
  districts: string[];
}

export const LIGUES: LigueDef[] = [
  {
    ligue: "Auvergne-Rhône-Alpes",
    districts: [
      "Ain", "Allier", "Cantal", "Drôme-Ardèche", "Haute-Loire",
      "Haute-Savoie-Pays de Gex", "Isère", "Loire", "Lyon-Rhône",
      "Savoie", "Puy-de-Dôme",
    ],
  },
  {
    ligue: "Bourgogne-Franche-Comté",
    districts: [
      "Côte-d'Or", "Doubs-Territoire de Belfort", "Jura", "Haute-Saône",
      "Saône-et-Loire", "Yonne",
    ],
  },
  {
    ligue: "Bretagne",
    districts: ["Côtes-d'Armor", "Finistère", "Ille-et-Vilaine", "Morbihan"],
  },
  {
    ligue: "Centre-Val de Loire",
    districts: [
      "Cher", "Eure-et-Loir", "Indre", "Indre-et-Loire",
      "Loir-et-Cher", "Loiret",
    ],
  },
  {
    ligue: "Grand Est",
    districts: [
      "Alsace (Bas-Rhin / Haut-Rhin)", "Ardennes", "Aube", "Marne",
      "Haute-Marne", "Meurthe-et-Moselle", "Meuse", "Moselle", "Vosges",
    ],
  },
  {
    ligue: "Hauts-de-France",
    districts: [
      "Aisne", "Artois", "Côte d'Opale", "Escaut", "Flandres",
      "Oise", "Somme",
    ],
  },
  {
    ligue: "Méditerranée",
    districts: ["Alpes", "Côte d'Azur", "Provence", "Var"],
  },
  {
    ligue: "Normandie",
    districts: ["Calvados", "Eure", "Manche", "Orne", "Seine-Maritime"],
  },
  {
    ligue: "Nouvelle-Aquitaine",
    districts: [
      "Charente", "Charente-Maritime", "Corrèze", "Creuse", "Dordogne",
      "Gironde", "Landes", "Lot-et-Garonne", "Pyrénées-Atlantiques",
      "Deux-Sèvres", "Vienne", "Haute-Vienne",
    ],
  },
  {
    ligue: "Occitanie",
    districts: [
      "Ariège", "Aude", "Aveyron", "Gard-Lozère", "Haute-Garonne",
      "Gers", "Hérault", "Lot", "Pyrénées-Orientales", "Tarn",
      "Tarn-et-Garonne",
    ],
  },
  {
    ligue: "Paris Île-de-France",
    districts: [
      "Seine-et-Marne", "Yvelines", "Essonne", "Hauts-de-Seine",
      "Seine-Saint-Denis", "Val-de-Marne", "Val-d'Oise", "Paris",
    ],
  },
  {
    ligue: "Pays de la Loire",
    districts: ["Loire-Atlantique", "Maine-et-Loire", "Mayenne", "Sarthe", "Vendée"],
  },
];

export const LIGUE_NAMES = LIGUES.map((l) => l.ligue);

export function getLigue(name: string): LigueDef | undefined {
  return LIGUES.find((l) => l.ligue === name);
}

export function districtsForLigue(ligue: string): string[] {
  return getLigue(ligue)?.districts ?? [];
}

export function isValidLigue(ligue: string): boolean {
  return LIGUE_NAMES.includes(ligue);
}

export function isValidDistrict(ligue: string, district: string): boolean {
  return districtsForLigue(ligue).includes(district);
}