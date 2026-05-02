/**
 * Utilitaires pour évaluer et commenter le GMQ (Gain Moyen Quotidien)
 */

export interface GMQEvaluation {
  niveau: 'excellent' | 'bon' | 'moyen' | 'faible' | 'critique' | 'inconnu';
  couleur: string;
  icone: string;
  commentaire: string;
  recommandation: string;
}

// Seuils de GMQ pour les porcs (en g/jour)
const SEUILS_GMQ = {
  EXCELLENT: 800, // > 800 g/j : Excellent
  BON: 650, // 650-800 g/j : Bon
  MOYEN: 500, // 500-650 g/j : Moyen
  FAIBLE: 350, // 350-500 g/j : Faible
  CRITIQUE: 350, // < 350 g/j : Critique
};

/**
 * Évalue le GMQ d'un animal individuel
 */
export function evaluerGMQIndividuel(gmqMoyen: number | null | undefined): GMQEvaluation {
  if (gmqMoyen === null || gmqMoyen === undefined || gmqMoyen === 0) {
    return {
      niveau: 'inconnu',
      couleur: '#9CA3AF',
      icone: '❓',
      commentaire: 'GMQ non calculé',
      recommandation: 'Ajoutez au moins 2 pesées espacées de quelques jours pour calculer le GMQ.',
    };
  }

  if (gmqMoyen >= SEUILS_GMQ.EXCELLENT) {
    return {
      niveau: 'excellent',
      couleur: '#10B981',
      icone: '🌟',
      commentaire: 'GMQ excellent !',
      recommandation:
        'Votre animal a une croissance exceptionnelle. Continuez ce régime alimentaire.',
    };
  }

  if (gmqMoyen >= SEUILS_GMQ.BON) {
    return {
      niveau: 'bon',
      couleur: '#22C55E',
      icone: '✅',
      commentaire: 'GMQ conforme au standard',
      recommandation: 'Votre animal est bien nourri et se développe normalement.',
    };
  }

  if (gmqMoyen >= SEUILS_GMQ.MOYEN) {
    return {
      niveau: 'moyen',
      couleur: '#F59E0B',
      icone: '⚠️',
      commentaire: 'GMQ légèrement bas',
      recommandation:
        "La croissance est acceptable mais pourrait être améliorée. Vérifiez la qualité et la quantité de l'alimentation.",
    };
  }

  if (gmqMoyen >= SEUILS_GMQ.FAIBLE) {
    return {
      niveau: 'faible',
      couleur: '#EF4444',
      icone: '⚠️',
      commentaire: 'GMQ insuffisant',
      recommandation:
        "Cet animal est probablement sous-alimenté. Augmentez les rations et vérifiez l'état de santé.",
    };
  }

  return {
    niveau: 'critique',
    couleur: '#DC2626',
    icone: '🚨',
    commentaire: 'GMQ très bas - Alerte !',
    recommandation:
      'Isolez immédiatement cet animal. Consultez un vétérinaire et revoyez complètement son alimentation.',
  };
}

/**
 * Évalue le GMQ moyen du cheptel
 */
export function evaluerGMQCheptel(gmqMoyen: number, nombreAnimaux: number): GMQEvaluation {
  if (!gmqMoyen || gmqMoyen === 0 || nombreAnimaux === 0) {
    return {
      niveau: 'inconnu',
      couleur: '#9CA3AF',
      icone: '❓',
      commentaire: 'GMQ moyen non disponible',
      recommandation: 'Ajoutez des pesées régulières pour suivre la croissance de votre cheptel.',
    };
  }

  if (gmqMoyen >= SEUILS_GMQ.EXCELLENT) {
    return {
      niveau: 'excellent',
      couleur: '#10B981',
      icone: '🌟',
      commentaire: `GMQ moyen excellent : ${gmqMoyen.toFixed(0)} g/j`,
      recommandation: `Vos ${nombreAnimaux} animaux ont une croissance exceptionnelle. Votre programme alimentaire est optimal.`,
    };
  }

  if (gmqMoyen >= SEUILS_GMQ.BON) {
    return {
      niveau: 'bon',
      couleur: '#22C55E',
      icone: '✅',
      commentaire: `GMQ moyen conforme : ${gmqMoyen.toFixed(0)} g/j`,
      recommandation: `Vos ${nombreAnimaux} animaux se développent bien. Continuez votre gestion actuelle.`,
    };
  }

  if (gmqMoyen >= SEUILS_GMQ.MOYEN) {
    return {
      niveau: 'moyen',
      couleur: '#F59E0B',
      icone: '⚠️',
      commentaire: `GMQ moyen acceptable : ${gmqMoyen.toFixed(0)} g/j`,
      recommandation: `La croissance est correcte mais peut être optimisée. Analysez la qualité de l'alimentation et les conditions d'élevage.`,
    };
  }

  if (gmqMoyen >= SEUILS_GMQ.FAIBLE) {
    return {
      niveau: 'faible',
      couleur: '#EF4444',
      icone: '⚠️',
      commentaire: `GMQ moyen insuffisant : ${gmqMoyen.toFixed(0)} g/j`,
      recommandation: `Attention : ${nombreAnimaux} animaux avec un GMQ sous la moyenne. Revoyez votre programme alimentaire et vérifiez l'état de santé du cheptel.`,
    };
  }

  return {
    niveau: 'critique',
    couleur: '#DC2626',
    icone: '🚨',
    commentaire: `GMQ moyen critique : ${gmqMoyen.toFixed(0)} g/j`,
    recommandation: `Alerte ! Votre cheptel est en sous-nutrition. Consultez un vétérinaire et un nutritionniste animalier de toute urgence.`,
  };
}

/**
 * Calcule le GMQ moyen d'un animal à partir de ses pesées
 */
export function calculerGMQMoyen(pesees: Array<{ date: string; gmq: number | null }>): number {
  const peseesAvecGMQ = pesees.filter((p) => p.gmq !== null && p.gmq > 0);

  if (peseesAvecGMQ.length === 0) {
    return 0;
  }

  const sommeGMQ = peseesAvecGMQ.reduce((sum, p) => sum + (p.gmq || 0), 0);
  return sommeGMQ / peseesAvecGMQ.length;
}
