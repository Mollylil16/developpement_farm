import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredFarmLocation = {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  region?: string;
  updatedAt: string;
};

function keyForProject(projetId: string) {
  return `farm_location:${projetId}`;
}

export async function getFarmLocation(projetId: string): Promise<StoredFarmLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(keyForProject(projetId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFarmLocation;
    if (typeof parsed?.lat !== 'number' || typeof parsed?.lng !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setFarmLocation(projetId: string, location: Omit<StoredFarmLocation, 'updatedAt'>) {
  const payload: StoredFarmLocation = { ...location, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(keyForProject(projetId), JSON.stringify(payload));
}

export async function clearFarmLocation(projetId: string) {
  await AsyncStorage.removeItem(keyForProject(projetId));
}


