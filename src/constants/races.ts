/**
 * Constantes pour les races porcines et leurs performances moyennes
 */

export interface RacePerformance {
  nom: string;
  porceletsParPorteeMoyen: number;
  description?: string;
}

/**
 * Performances moyennes des races de truies reproductrices
 * Source : Moyennes observées en élevage porcin
 */
export const RACES_PERFORMANCES: Record<string, RacePerformance> = {
  'Large White': {
    nom: 'Large White',
    porceletsParPorteeMoyen: 12,
    description: 'Race prolifique, excellente reproductrice',
  },
  Landrace: {
    nom: 'Landrace',
    porceletsParPorteeMoyen: 11,
    description: 'Bonne prolificité, longue durée de lactation',
  },
  Duroc: {
    nom: 'Duroc',
    porceletsParPorteeMoyen: 10,
    description: 'Viande de qualité, prolificité moyenne',
  },
  Piétrain: {
    nom: 'Piétrain',
    porceletsParPorteeMoyen: 9,
    description: 'Excellente conformation, prolificité modérée',
  },
  Hampshire: {
    nom: 'Hampshire',
    porceletsParPorteeMoyen: 10,
    description: 'Rustique, prolificité moyenne',
  },
  Berkshire: {
    nom: 'Berkshire',
    porceletsParPorteeMoyen: 9,
    description: 'Viande marbrée, prolificité modérée',
  },
  Yorkshire: {
    nom: 'Yorkshire',
    porceletsParPorteeMoyen: 12,
    description: 'Très prolifique, similaire à Large White',
  },
  Croisée: {
    nom: 'Croisée',
    porceletsParPorteeMoyen: 11,
    description: 'Vigueur hybride, bonne prolificité',
  },
  Locale: {
    nom: 'Locale',
    porceletsParPorteeMoyen: 8,
    description: 'Race locale adaptée, prolificité variable',
  },
};

/**
 * Liste des races pour les sélecteurs
 */
export const RACES_LIST = Object.keys(RACES_PERFORMANCES);

/**
 * Obtenir la performance d'une race
 */
export function getPerformanceRace(race?: string): RacePerformance | null {
  if (!race) return null;
  return RACES_PERFORMANCES[race] || null;
}

/**
 * Calculer la moyenne pondérée des porcelets par portée basée sur les truies disponibles
 */
export function calculerMoyennePorceletsSelonRaces(truies: Array<{ race?: string }>): number {
  if (truies.length === 0) return 11; // Valeur par défaut

  let totalPorcelets = 0;
  let nombreTruiesAvecRace = 0;

  truies.forEach((truie) => {
    const performance = getPerformanceRace(truie.race);
    if (performance) {
      totalPorcelets += performance.porceletsParPorteeMoyen;
      nombreTruiesAvecRace++;
    }
  });

  // Si aucune truie n'a de race définie, retourner la valeur par défaut
  if (nombreTruiesAvecRace === 0) return 11;

  // Retourner la moyenne pondérée
  return Math.round((totalPorcelets / nombreTruiesAvecRace) * 10) / 10; // Arrondi à 1 décimale
}
