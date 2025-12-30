import * as ExpoLocation from 'expo-location';
import type { Location } from '../../types/marketplace';

export async function resolveLocationFromCoords(params: {
  latitude: number;
  longitude: number;
  fallbackText?: string;
}): Promise<Location> {
  const { latitude, longitude, fallbackText } = params;

  let addressText = fallbackText?.trim() || '';
  let city = '';
  let region = '';

  try {
    const addresses = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
    const addr = addresses?.[0];
    if (addr) {
      city = (addr.city || addr.subregion || addr.district || '').trim();
      region = (addr.region || addr.country || '').trim();
      const parts = [addr.name, addr.street, addr.city, addr.region, addr.country].filter(Boolean);
      addressText = (parts.join(', ') || addressText).trim();
    }
  } catch {
    // best-effort
  }

  const finalCity = city || addressText.split(',')[0]?.trim() || 'Inconnu';
  const finalRegion =
    region || addressText.split(',')[1]?.trim() || addressText.split(',')[0]?.trim() || 'Inconnu';
  const finalAddress = addressText || `${finalCity}, ${finalRegion}`;

  return {
    latitude,
    longitude,
    address: finalAddress,
    city: finalCity,
    region: finalRegion,
  };
}


