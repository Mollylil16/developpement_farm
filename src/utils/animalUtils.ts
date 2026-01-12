/**
 * Utilitaires pour la gestion des animaux
 */

import type { ProductionAnimal, ProductionPesee } from '../types/production';

/**
 * Récupère le poids actuel d'un animal
 * @param animal L'animal
 * @param pesees Liste des pesées de l'animal
 * @returns Le poids actuel (dernière pesée ou poids initial)
 */
export function getAnimalCurrentWeight(
  animal: ProductionAnimal,
  pesees: ProductionPesee[]
): number {
  if (pesees.length > 0) {
    // Trier les pesées par date (la plus récente en premier)
    const peseesTriees = [...pesees].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return peseesTriees[0].poids_kg;
  }
  return animal.poids_initial || 0;
}

/**
 * Détermine la catégorie d'un animal (Truie, Verrat, ou Porcelet)
 * @param animal L'animal à catégoriser
 * @returns La catégorie de l'animal
 *
 * Note: reproducteur vient de SQLite comme INTEGER (0/1), donc on le convertit en boolean
 */
export function getCategorieAnimal(animal: ProductionAnimal): 'truie' | 'verrat' | 'porcelet' {
  const isReproducteur = Boolean(animal.reproducteur); // Convertit 1 → true, 0 → false
  const isMale = animal.sexe?.toLowerCase() === 'male';
  const isFemelle = animal.sexe?.toLowerCase() === 'femelle';

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
export function filterActiveAnimals(
  animaux: ProductionAnimal[],
  projetId?: string
): ProductionAnimal[] {
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
 * @param exclureReproducteurs Si true, exclut les reproducteurs du calcul (par défaut: false)
 * @returns Poids total en kg
 */
export function calculatePoidsTotalAnimauxActifs(
  animaux: ProductionAnimal[],
  peseesParAnimal: Record<string, Array<{ date: string; poids_kg: number }>>,
  poidsMoyenProjet: number = 0,
  exclureReproducteurs: boolean = false
): number {
  let animauxActifs = animaux.filter((animal) => animal.statut?.toLowerCase() === 'actif');

  // Exclure les reproducteurs si demandé (pour les calculs de revenus prévisionnels)
  if (exclureReproducteurs) {
    animauxActifs = animauxActifs.filter((animal) => !animal.reproducteur);
  }

  let poidsTotal = 0;

  animauxActifs.forEach((animal) => {
    const pesees = peseesParAnimal[animal.id] || [];
    if (pesees.length > 0) {
      // Trier les pesées par date (la plus récente en premier)
      const peseesTriees = [...pesees].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
  colors?: {
    success: string;
    error: string;
    warning: string;
    secondary: string;
    textSecondary: string;
  }
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

/**
 * Détermine la catégorie de poids d'un animal selon son poids actuel
 * Règles métier :
 * - Porcelet : poids entre 7 kg et 25 kg (inclus)
 * - Croissance : poids entre 25 kg (exclus) et 60 kg (inclus)
 * - Finition : poids supérieur à 60 kg
 *
 * @param poidsKg Le poids de l'animal en kilogrammes
 * @returns La catégorie de poids : 'porcelet' | 'croissance' | 'finition'
 */
export function getCategoriePoids(poidsKg: number): 'porcelet' | 'croissance' | 'finition' {
  if (poidsKg < 7) {
    // Si le poids est inférieur à 7 kg, on considère comme porcelet (nouveau-né)
    return 'porcelet';
  } else if (poidsKg >= 7 && poidsKg <= 25) {
    return 'porcelet';
  } else if (poidsKg > 25 && poidsKg <= 60) {
    return 'croissance';
  } else {
    // poidsKg > 60
    return 'finition';
  }
}

/**
 * Compte les animaux par catégorie de poids (Porcelets, Croissance, Finition)
 * @param animaux Liste des animaux à compter
 * @param peseesParAnimal Objet contenant les pesées par animal (id -> pesées[])
 * @returns Objet avec le nombre de porcelets, croissance et finition
 */
export function countAnimalsByPoidsCategory(
  animaux: ProductionAnimal[],
  peseesParAnimal: Record<string, Array<{ date: string; poids_kg: number }>>
): {
  porcelets: number;
  croissance: number;
  finition: number;
} {
  let porcelets = 0;
  let croissance = 0;
  let finition = 0;

  animaux.forEach((animal) => {
    // Ne compter que les animaux actifs et non reproducteurs
    if (animal.statut?.toLowerCase() !== 'actif' || animal.reproducteur) {
      return;
    }

    // Récupérer le poids actuel
    const pesees = peseesParAnimal[animal.id] || [];
    let poidsActuel = animal.poids_initial || 0;

    if (pesees.length > 0) {
      // Trier les pesées par date (la plus récente en premier)
      const peseesTriees = [...pesees].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      poidsActuel = peseesTriees[0].poids_kg;
    }

    // Déterminer la catégorie selon le poids
    const categorie = getCategoriePoids(poidsActuel);
    if (categorie === 'porcelet') {
      porcelets++;
    } else if (categorie === 'croissance') {
      croissance++;
    } else {
      finition++;
    }
  });

  return { porcelets, croissance, finition };
}

/**
 * Calcule l'évolution du poids d'un animal sur une période
 * @param pesees Liste des pesées de l'animal (triées par date)
 * @param periodeJours Nombre de jours pour calculer l'évolution (défaut: 7)
 * @returns Objet contenant l'évolution du poids en kg et le pourcentage d'évolution
 */
export function getEvolutionPoids(
  pesees: ProductionPesee[],
  periodeJours: number = 7
): { poidsGagne: number; pourcentageEvolution: number; evolutions: Array<{ date: string; poids_kg: number }> } {
  if (pesees.length === 0) {
    return { poidsGagne: 0, pourcentageEvolution: 0, evolutions: [] };
  }

  // Trier les pesées par date (plus ancienne en premier)
  const peseesTriees = [...pesees].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const maintenant = new Date();
  const dateLimite = new Date(maintenant.getTime() - periodeJours * 24 * 60 * 60 * 1000);

  // Filtrer les pesées dans la période
  const peseesPeriode = peseesTriees.filter(
    (pesee) => new Date(pesee.date).getTime() >= dateLimite.getTime()
  );

  if (peseesPeriode.length < 2) {
    // Pas assez de pesées pour calculer une évolution
    return { poidsGagne: 0, pourcentageEvolution: 0, evolutions: peseesTriees.map(p => ({ date: p.date, poids_kg: p.poids_kg })) };
  }

  const poidsInitial = peseesPeriode[0].poids_kg;
  const poidsFinal = peseesPeriode[peseesPeriode.length - 1].poids_kg;
  const poidsGagne = poidsFinal - poidsInitial;
  const pourcentageEvolution = poidsInitial > 0 ? (poidsGagne / poidsInitial) * 100 : 0;

  return {
    poidsGagne,
    pourcentageEvolution,
    evolutions: peseesTriees.map(p => ({ date: p.date, poids_kg: p.poids_kg })),
  };
}

/**
 * Estime le poids actuel d'un animal en se basant sur la dernière pesée et le GMQ
 * @param animal L'animal
 * @param pesees Liste des pesées de l'animal
 * @param gmqJour GMQ en kg/jour (optionnel, calculé automatiquement si non fourni)
 * @returns Poids estimé en kg et date de dernière pesée
 */
export function getPoidsActuelEstime(
  animal: ProductionAnimal,
  pesees: ProductionPesee[],
  gmqJour?: number
): { poidsEstime: number; dateDernierePesee: string | null; source: 'pesee' | 'estimation' | 'initial' } {
  if (pesees.length > 0) {
    // Trier les pesées par date (la plus récente en premier)
    const peseesTriees = [...pesees].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const dernierePesee = peseesTriees[0];
    const dateDernierePesee = new Date(dernierePesee.date);
    const maintenant = new Date();
    const joursDepuisDernierePesee = Math.floor(
      (maintenant.getTime() - dateDernierePesee.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Si la dernière pesée date de moins de 3 jours, utiliser directement le poids
    if (joursDepuisDernierePesee < 3) {
      return {
        poidsEstime: dernierePesee.poids_kg,
        dateDernierePesee: dernierePesee.date,
        source: 'pesee',
      };
    }

    // Calculer le GMQ si non fourni
    let gmq = gmqJour;
    if (!gmq && peseesTriees.length >= 2) {
      const premierePesee = peseesTriees[peseesTriees.length - 1];
      const differencePoids = dernierePesee.poids_kg - premierePesee.poids_kg;
      const differenceJours =
        (new Date(dernierePesee.date).getTime() - new Date(premierePesee.date).getTime()) /
        (1000 * 60 * 60 * 24);

      if (differenceJours > 0) {
        gmq = differencePoids / differenceJours;
      }
    }

    // Utiliser le GMQ moyen si disponible, sinon utiliser une valeur par défaut selon la catégorie
    if (!gmq || gmq <= 0) {
      const categorie = getCategoriePoids(dernierePesee.poids_kg);
      // Valeurs moyennes de GMQ par catégorie (kg/jour)
      gmq = categorie === 'porcelet' ? 0.3 : categorie === 'croissance' ? 0.6 : 0.4;
    }

    // Estimer le poids en ajoutant le GMQ multiplié par le nombre de jours
    const poidsEstime = dernierePesee.poids_kg + gmq * joursDepuisDernierePesee;

    return {
      poidsEstime: Math.max(poidsEstime, dernierePesee.poids_kg), // Ne pas estimer moins que la dernière pesée
      dateDernierePesee: dernierePesee.date,
      source: 'estimation',
    };
  }

  // Pas de pesées, utiliser le poids initial
  return {
    poidsEstime: animal.poids_initial || 0,
    dateDernierePesee: null,
    source: 'initial',
  };
}