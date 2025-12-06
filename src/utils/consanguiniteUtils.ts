/**
 * Utilitaires pour la détection de consanguinité dans l'élevage porcin
 */

import { ProductionAnimal } from '../types/production';

/**
 * Types de risques de consanguinité
 */
export enum RisqueConsanguinite {
  PARENT_ENFANT = 'PARENT_ENFANT',
  FRERE_SOEUR = 'FRERE_SOEUR',
  DEMI_FRERE_SOEUR = 'DEMI_FRERE_SOEUR',
  GRAND_PARENT_PETIT_ENFANT = 'GRAND_PARENT_PETIT_ENFANT',
  AUCUN = 'AUCUN',
}

/**
 * Résultat de la détection de consanguinité
 */
export interface ResultatConsanguinite {
  risque: RisqueConsanguinite;
  message: string;
  niveau: 'critique' | 'eleve' | 'modere' | 'faible' | 'aucun';
  details?: string;
}

/**
 * Labels pour affichage
 */
export const RISQUE_LABELS: Record<RisqueConsanguinite, string> = {
  [RisqueConsanguinite.PARENT_ENFANT]: 'Parent-Enfant',
  [RisqueConsanguinite.FRERE_SOEUR]: 'Frère-Sœur',
  [RisqueConsanguinite.DEMI_FRERE_SOEUR]: 'Demi-frère/Demi-sœur',
  [RisqueConsanguinite.GRAND_PARENT_PETIT_ENFANT]: 'Grand-parent/Petit-enfant',
  [RisqueConsanguinite.AUCUN]: 'Aucun risque détecté',
};

/**
 * Détecte si le verrat est le père de la truie (ou vice versa)
 */
function estParentEnfant(truie: ProductionAnimal, verrat: ProductionAnimal): boolean {
  // Le verrat est le père de la truie
  if (truie.pere_id && truie.pere_id === verrat.id) {
    return true;
  }

  // Le verrat est la mère de la truie (cas exceptionnel mais on vérifie)
  if (truie.mere_id && truie.mere_id === verrat.id) {
    return true;
  }

  // La truie est la mère du verrat
  if (verrat.mere_id && verrat.mere_id === truie.id) {
    return true;
  }

  // La truie est le père du verrat (cas exceptionnel)
  if (verrat.pere_id && verrat.pere_id === truie.id) {
    return true;
  }

  return false;
}

/**
 * Détecte si la truie et le verrat sont frère et sœur (même père ET même mère)
 */
function estFrereSoeur(truie: ProductionAnimal, verrat: ProductionAnimal): boolean {
  // Vérifier que les deux parents sont connus et identiques
  const memePere = Boolean(truie.pere_id && verrat.pere_id && truie.pere_id === verrat.pere_id);
  const memeMere = Boolean(truie.mere_id && verrat.mere_id && truie.mere_id === verrat.mere_id);

  return memePere && memeMere;
}

/**
 * Détecte si la truie et le verrat sont demi-frère et demi-sœur (même père OU même mère)
 */
function estDemiFrereSoeur(truie: ProductionAnimal, verrat: ProductionAnimal): boolean {
  // Vérifier qu'ils ont un parent en commun mais pas les deux
  const memePere = Boolean(truie.pere_id && verrat.pere_id && truie.pere_id === verrat.pere_id);
  const memeMere = Boolean(truie.mere_id && verrat.mere_id && truie.mere_id === verrat.mere_id);

  // Demi-frère/sœur = un seul parent en commun (pas les deux)
  return (memePere || memeMere) && !(memePere && memeMere);
}

/**
 * Détecte si le verrat est le grand-père de la truie (ou vice versa)
 */
function estGrandParentPetitEnfant(
  truie: ProductionAnimal,
  verrat: ProductionAnimal,
  animaux: ProductionAnimal[]
): boolean {
  // Vérifier si le verrat est le grand-père maternel de la truie
  if (truie.mere_id) {
    const mere = animaux.find((a) => a.id === truie.mere_id);
    if (mere) {
      if (mere.pere_id && mere.pere_id === verrat.id) {
        return true;
      }
    }
  }

  // Vérifier si le verrat est le grand-père paternel de la truie
  if (truie.pere_id) {
    const pere = animaux.find((a) => a.id === truie.pere_id);
    if (pere) {
      if (pere.pere_id && pere.pere_id === verrat.id) {
        return true;
      }
    }
  }

  // Vérifier si la truie est la grand-mère du verrat
  if (verrat.mere_id) {
    const mere = animaux.find((a) => a.id === verrat.mere_id);
    if (mere) {
      if (mere.mere_id && mere.mere_id === truie.id) {
        return true;
      }
    }
  }

  if (verrat.pere_id) {
    const pere = animaux.find((a) => a.id === verrat.pere_id);
    if (pere) {
      if (pere.mere_id && pere.mere_id === truie.id) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Fonction principale : Détecte le risque de consanguinité entre une truie et un verrat
 * @param truieId ID de la truie
 * @param verratId ID du verrat
 * @param animaux Liste de tous les animaux du projet
 * @returns Résultat de l'analyse de consanguinité
 */
export function detecterConsanguinite(
  truieId: string,
  verratId: string,
  animaux: ProductionAnimal[]
): ResultatConsanguinite {
  // Trouver la truie et le verrat
  const truie = animaux.find((a) => a.id === truieId);
  const verrat = animaux.find((a) => a.id === verratId);

  // Si l'un des deux n'existe pas, on ne peut pas détecter
  if (!truie || !verrat) {
    return {
      risque: RisqueConsanguinite.AUCUN,
      message: 'Informations insuffisantes pour détecter la consanguinité',
      niveau: 'aucun',
    };
  }

  // Vérifier les différents types de consanguinité (du plus grave au moins grave)

  // 1. Parent-Enfant (CRITIQUE)
  if (estParentEnfant(truie, verrat)) {
    return {
      risque: RisqueConsanguinite.PARENT_ENFANT,
      message: '🚨 RISQUE CRITIQUE : Accouplement parent-enfant détecté',
      niveau: 'critique',
      details:
        "Ce type d'accouplement peut causer de graves problèmes génétiques et est fortement déconseillé.",
    };
  }

  // 2. Frère-Sœur (CRITIQUE)
  if (estFrereSoeur(truie, verrat)) {
    return {
      risque: RisqueConsanguinite.FRERE_SOEUR,
      message: '🚨 RISQUE CRITIQUE : Accouplement frère-sœur détecté',
      niveau: 'critique',
      details:
        'Les porcelets auront les mêmes parents, ce qui augmente fortement le risque de malformations et de faible vitalité.',
    };
  }

  // 3. Grand-parent/Petit-enfant (ÉLEVÉ)
  if (estGrandParentPetitEnfant(truie, verrat, animaux)) {
    return {
      risque: RisqueConsanguinite.GRAND_PARENT_PETIT_ENFANT,
      message: '⚠️ RISQUE ÉLEVÉ : Accouplement grand-parent/petit-enfant',
      niveau: 'eleve',
      details: "Ce type d'accouplement peut causer des problèmes génétiques et est déconseillé.",
    };
  }

  // 4. Demi-frère/Demi-sœur (MODÉRÉ)
  if (estDemiFrereSoeur(truie, verrat)) {
    return {
      risque: RisqueConsanguinite.DEMI_FRERE_SOEUR,
      message: '⚠️ RISQUE MODÉRÉ : Accouplement demi-frère/demi-sœur',
      niveau: 'modere',
      details:
        'Les animaux partagent un parent commun. La consanguinité est modérée mais peut affecter les performances de la portée.',
    };
  }

  // 5. Aucun risque détecté
  return {
    risque: RisqueConsanguinite.AUCUN,
    message: '✓ Aucun risque de consanguinité détecté',
    niveau: 'aucun',
    details: "Aucune relation de parenté proche n'a été détectée entre ces deux animaux.",
  };
}

/**
 * Retourne une couleur selon le niveau de risque
 */
export function getCouleurRisque(niveau: ResultatConsanguinite['niveau']): string {
  switch (niveau) {
    case 'critique':
      return '#DC2626'; // Rouge foncé
    case 'eleve':
      return '#EA580C'; // Orange
    case 'modere':
      return '#F59E0B'; // Jaune-orange
    case 'faible':
      return '#84CC16'; // Vert-jaune
    case 'aucun':
    default:
      return '#10B981'; // Vert
  }
}

/**
 * Retourne l'icône selon le niveau de risque
 */
export function getIconeRisque(niveau: ResultatConsanguinite['niveau']): string {
  switch (niveau) {
    case 'critique':
      return '🚨';
    case 'eleve':
      return '⚠️';
    case 'modere':
      return '⚠️';
    case 'faible':
      return 'ℹ️';
    case 'aucun':
    default:
      return '✓';
  }
}

/**
 * Vérifie si on doit afficher une alerte bloquante
 */
export function doitBloquerAccouplement(resultat: ResultatConsanguinite): boolean {
  // On bloque uniquement les cas critiques (parent-enfant et frère-sœur)
  return resultat.niveau === 'critique';
}

/**
 * Vérifie si on doit afficher un avertissement
 */
export function doitAfficherAvertissement(resultat: ResultatConsanguinite): boolean {
  return resultat.niveau === 'eleve' || resultat.niveau === 'modere';
}
