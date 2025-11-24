/**
 * Utilitaires pour la gestion des vaccinations
 */

/**
 * Parse animal_ids depuis la base de données
 * animal_ids peut être soit une string JSON, soit déjà un tableau
 */
export function parseAnimalIds(animal_ids: any): string[] {
  if (!animal_ids) {
    return [];
  }

  try {
    // Si c'est déjà un tableau, le retourner
    if (Array.isArray(animal_ids)) {
      return animal_ids;
    }

    // Si c'est une string, parser le JSON
    if (typeof animal_ids === 'string') {
      const parsed = JSON.parse(animal_ids);
      return Array.isArray(parsed) ? parsed : [];
    }

    return [];
  } catch (error) {
    console.warn('Erreur parsing animal_ids:', error);
    return [];
  }
}

/**
 * Vérifie si un animal est inclus dans la liste d'animal_ids
 */
export function animalIncludedInVaccination(animal_ids: any, animalId: string): boolean {
  const ids = parseAnimalIds(animal_ids);
  return ids.includes(animalId);
}

