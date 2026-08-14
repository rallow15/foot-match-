// Géoloc : distance haversine + géocodage via l'API officielle française (adresse.data.gouv.fr).

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // rayon terre km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface GeoResult {
  label: string;
  ville: string;
  codePostal: string;
  latitude: number;
  longitude: number;
}

// Géocode une ville/code postal via l'API adresse (BAN). Côté serveur.
export async function geocode(q: string): Promise<GeoResult | null> {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    q,
  )}&type=municipality&limit=1`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{
        properties: { label: string; name: string; postcode: string };
        geometry: { coordinates: [number, number] };
      }>;
    };
    const feat = data.features?.[0];
    if (!feat) return null;
    return {
      label: feat.properties.label,
      ville: feat.properties.name,
      codePostal: feat.properties.postcode,
      latitude: feat.geometry.coordinates[1],
      longitude: feat.geometry.coordinates[0],
    };
  } catch {
    return null;
  }
}

// Autocomplete de villes pour les inputs (appelé côté client depuis la barre de filtre).
export async function autocompleteVilles(q: string): Promise<GeoResult[]> {
  if (q.trim().length < 3) return [];
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    q,
  )}&type=municipality&limit=6`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: Array<{
        properties: { label: string; name: string; postcode: string };
        geometry: { coordinates: [number, number] };
      }>;
    };
    return (data.features ?? []).map((feat) => ({
      label: feat.properties.label,
      ville: feat.properties.name,
      codePostal: feat.properties.postcode,
      latitude: feat.geometry.coordinates[1],
      longitude: feat.geometry.coordinates[0],
    }));
  } catch {
    return [];
  }
}