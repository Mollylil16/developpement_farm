/**
 * Utilitaires pour la gestion des animaux
 */

import { ProductionAnimal } from '../types';

/**
 * Détermine la catégorie d'un animal (Truie, Verrat, ou Porcelet)
 * @param animal L'animal à catégoriser
 * @returns La catégorie de l'animal
 */
export function getCategorieAnimal(animal: ProductionAnimal): 'truie' | 'verrat' | 'porcelet' {
  const isReproducteur = animal.reproducteur === true;
  const isMale = animal.sexe === 'male';
  const isFemelle = animal.sexe === 'femelle';

  if (isMale && isReproducteur) {
    return 'verrat';
  } else if (isFemelle && isReproducteur) {
    return 'truie';
  } else {
    // Mâle non reproducteur, femelle non reproductrice, ou sexe indéterminé → porcelet
    return 'porcelet';
  }
}

/**
 * Compte les animaux par catégorie (Truies, Verrats, Porcelets)
 * @param animaux Liste des animaux à compter
 * @returns Objet avec le nombre de truies, verrats et porcelets
 */
export function countAnimalsByCategory(animaux: ProductionAnimal[]): {
  truies: number;
  verrats: number;
  porcelets: number;
} {
  let truies = 0;
  let verrats = 0;
  let porcelets = 0;

  animaux.forEach((animal) => {
    const categorie = getCategorieAnimal(animal);
    if (categorie === 'truie') {
      truies++;
    } else if (categorie === 'verrat') {
      verrats++;
    } else {
      porcelets++;
    }
  });

  return { truies, verrats, porcelets };
}

/**
 * Filtre les animaux actifs de manière robuste (insensible à la casse)
 * @param animaux Liste des animaux à filtrer
 * @param projetId ID du projet (optionnel, pour filtrer par projet)
 * @returns Liste des animaux actifs
 */
export function filterActiveAnimals(animaux: ProductionAnimal[], projetId?: string): ProductionAnimal[] {
  let filtered = animaux.filter((animal) => animal.statut?.toLowerCase() === 'actif');
  if (projetId) {
    filtered = filtered.filter((animal) => animal.projet_id === projetId);
  }
  return filtered;
}

/**
 * Calcule le poids total des animaux actifs en utilisant :
 * 1. La dernière pesée si disponible
 * 2. Le poids initial si pas de pesée
 * 3. Le poids moyen du projet comme fallback
 * @param animaux Liste des animaux
 * @param peseesParAnimal Objet contenant les pesées par animal (id -> pesées[])
 * @param poidsMoyenProjet Poids moyen du projet à utiliser comme fallback
 * @returns Poids total en kg
 */
export function calculatePoidsTotalAnimauxActifs(
  animaux: ProductionAnimal[],
  peseesParAnimal: Record<string, Array<{ date: string; poids_kg: number }>>,
  poidsMoyenProjet: number = 0
): number {
  const animauxActifs = animaux.filter((animal) => animal.statut?.toLowerCase() === 'actif');
  
  let poidsTotal = 0;
  
  animauxActifs.forEach((animal) => {
    const pesees = peseesParAnimal[animal.id] || [];
    if (pesees.length > 0) {
      // Trier les pesées par date (la plus récente en premier)
      const peseesTriees = [...pesees].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      poidsTotal += peseesTriees[0].poids_kg;
    } else if (animal.poids_initial) {
      poidsTotal += animal.poids_initial;
    } else {
      // Utiliser le poids moyen du projet comme approximation
      poidsTotal += poidsMoyenProjet;
    }
  });
  
  return poidsTotal;
}

/**
 * Calcule l'âge d'un animal à partir de sa date de naissance
 * @param dateNaissance Date de naissance de l'animal (format ISO)
 * @returns String formatée de l'âge (ex: "5 jours", "3 mois", "2 ans") ou null
 */
export function calculerAge(dateNaissance?: string): string | null {
  if (!dateNaissance) return null;
  try {
    const date = new Date(dateNaissance);
    const maintenant = new Date();
    const jours = Math.floor((maintenant.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (jours < 0) return null; // Date future invalide
    
    if (jours < 30) return `${jours} jour${jours > 1 ? 's' : ''}`;
    const mois = Math.floor(jours / 30);
    if (mois < 12) return `${mois} mois`;
    const annees = Math.floor(mois / 12);
    return `${annees} an${annees > 1 ? 's' : ''}`;
  } catch {
    return null;
  }
}

/**
 * Retourne la couleur associée à un statut d'animal
 * @param statut Le statut de l'animal
 * @param colors Objet contenant les couleurs du thème
 * @returns La couleur hexadécimale correspondant au statut
 */
export function getStatutColor(
  statut: string,
  colors?: { success: string; error: string; warning: string; secondary: string; textSecondary: string }
): string {
  // Valeurs par défaut si colors n'est pas fourni
  const defaultColors = {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    secondary: '#9E9E9E',
    textSecondary: '#757575',
  };

  const safeColors = colors || defaultColors;

  switch (statut?.toLowerCase()) {
    case 'actif':
      return safeColors.success;
    case 'mort':
      return safeColors.error;
    case 'vendu':
      return safeColors.warning;
    case 'offert':
      return safeColors.secondary;
    default:
      return safeColors.textSecondary;
  }
}
