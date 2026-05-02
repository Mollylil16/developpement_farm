import type { Location } from '../../types/marketplace';

type NominatimAddress = Record<string, string | undefined>;

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  address?: NominatimAddress;
};

function pickCity(address?: NominatimAddress): string | undefined {
  if (!address) return undefined;
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.suburb ||
    address.county ||
    address.state_district
  );
}

function pickRegion(address?: NominatimAddress): string | undefined {
  if (!address) return undefined;
  return address.state || address.region || address.country;
}

/**
 * Géocodage "texte → coordonnées" (sans utiliser le GPS).
 * On utilise Nominatim (OpenStreetMap) en best-effort.
 */
export async function geocodePlaceToLocation(query: string): Promise<Location | null> {
  const q = (query || '').trim();
  if (!q) return null;

  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=` +
    encodeURIComponent(q);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult[];
    const first = data?.[0];
    if (!first) return null;

    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const city = pickCity(first.address) || q.split(',')[0]?.trim() || 'Inconnu';
    const region = pickRegion(first.address) || q.split(',')[1]?.trim() || 'Inconnu';
    const address = first.display_name || q;

    return {
      latitude: lat,
      longitude: lng,
      address,
      city,
      region,
    };
  } catch {
    return null;
  }
}


