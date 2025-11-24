/**
 * Alternatives d'ingrédients adaptées au contexte africain
 * 
 * Ce fichier propose des alternatives facilement disponibles en Afrique
 * pour les ingrédients standard de l'alimentation porcine
 */

export interface AlternativeIngredient {
  original: string;
  alternatives: Array<{
    nom: string;
    description: string;
    disponibilite: 'facile' | 'moyenne' | 'difficile';
    cout: 'economique' | 'moyen' | 'cher';
    remarques?: string;
  }>;
}

export const ALTERNATIVES_INGREDIENTS: AlternativeIngredient[] = [
  {
    original: 'Maïs grain',
    alternatives: [
      {
        nom: 'Sorgho',
        description: 'Céréale locale résistante à la sécheresse',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Très adapté aux zones sahéliennes. Même valeur énergétique que le maïs.',
      },
      {
        nom: 'Mil',
        description: 'Petit mil ou gros mil',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Disponible toute l\'année dans la plupart des marchés locaux.',
      },
      {
        nom: 'Riz brisé',
        description: 'Riz cassé ou de qualité inférieure',
        disponibilite: 'facile',
        cout: 'moyen',
        remarques: 'Disponible chez les rizeries et marchés céréaliers.',
      },
      {
        nom: 'Manioc séché',
        description: 'Cossettes ou farine de manioc',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Très économique. Bien sécher pour éviter les toxines.',
      },
    ],
  },
  {
    original: 'Tourteau de soja',
    alternatives: [
      {
        nom: 'Tourteau d\'arachide',
        description: 'Résidu de l\'extraction d\'huile d\'arachide',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Très disponible en Afrique de l\'Ouest. Riche en protéines (45-50%).',
      },
      {
        nom: 'Tourteau de coton',
        description: 'Résidu de l\'extraction d\'huile de coton',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Disponible dans les zones cotonnières. Attention au gossypol (max 15% de la ration).',
      },
      {
        nom: 'Farine de niébé (haricot)',
        description: 'Haricots locaux broyés',
        disponibilite: 'facile',
        cout: 'moyen',
        remarques: 'Riche en protéines (22-25%). Facilement disponible sur les marchés.',
      },
      {
        nom: 'Farine de poisson',
        description: 'Poisson séché et broyé',
        disponibilite: 'moyenne',
        cout: 'moyen',
        remarques: 'Excellente source de protéines (60-70%) et de minéraux. Disponible en zones côtières.',
      },
      {
        nom: 'Termites séchés',
        description: 'Termites collectés et séchés',
        disponibilite: 'moyenne',
        cout: 'economique',
        remarques: 'Très riche en protéines (45-50%). Pratique traditionnelle en zone rurale.',
      },
    ],
  },
  {
    original: 'Son de blé',
    alternatives: [
      {
        nom: 'Son de riz',
        description: 'Enveloppe du grain de riz',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Disponible dans les rizeries. Riche en fibres et vitamines B.',
      },
      {
        nom: 'Son de maïs',
        description: 'Résidu de mouture du maïs',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Disponible dans les moulins locaux.',
      },
      {
        nom: 'Drêche de sorgho',
        description: 'Résidu de brasserie locale (dolo, bili-bili)',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Très économique. Récupérable chez les brasseurs traditionnels.',
      },
    ],
  },
  {
    original: 'Tourteau de palmiste',
    alternatives: [
      {
        nom: 'Amande de palme broyée',
        description: 'Noyaux de palmier broyés',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Très disponible en zones tropicales. Riche en énergie.',
      },
      {
        nom: 'Coprah',
        description: 'Résidu de coco séché',
        disponibilite: 'moyenne',
        cout: 'moyen',
        remarques: 'Disponible en zones côtières tropicales.',
      },
    ],
  },
  {
    original: 'Farine de viande',
    alternatives: [
      {
        nom: 'Farine de sang',
        description: 'Sang séché des abattoirs',
        disponibilite: 'moyenne',
        cout: 'economique',
        remarques: 'Très riche en protéines (80-85%). Récupérable dans les abattoirs.',
      },
      {
        nom: 'Farine d\'os',
        description: 'Os broyés et cuits',
        disponibilite: 'moyenne',
        cout: 'economique',
        remarques: 'Excellente source de calcium et phosphore. Abattoirs et boucheries.',
      },
      {
        nom: 'Escargots séchés',
        description: 'Achatines (escargots géants) séchés et broyés',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Très riche en protéines et calcium. Collecte en saison des pluies.',
      },
    ],
  },
  {
    original: 'CMV (Complément Minéral Vitaminé)',
    alternatives: [
      {
        nom: 'Coquilles d\'œufs broyées',
        description: 'Coquilles lavées, séchées et broyées',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Excellente source de calcium. Gratuit et facilement disponible.',
      },
      {
        nom: 'Coquilles d\'huîtres broyées',
        description: 'Coquilles ramassées sur les plages',
        disponibilite: 'moyenne',
        cout: 'economique',
        remarques: 'Très riche en calcium. Zones côtières.',
      },
      {
        nom: 'Sel de cuisine + Argile',
        description: 'Mélange sel + argile latéritique',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Source de sodium et oligo-éléments. Très économique.',
      },
      {
        nom: 'Feuilles de moringa séchées',
        description: 'Feuilles de moringa broyées',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Super aliment riche en vitamines A, C et minéraux. Culture facile.',
      },
    ],
  },
  {
    original: 'Mélasse',
    alternatives: [
      {
        nom: 'Jus de canne à sucre',
        description: 'Jus frais ou concentré de canne',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Disponible dans les zones de culture de canne. Appétant et énergétique.',
      },
      {
        nom: 'Pulpe de fruits mûrs',
        description: 'Mangues, papayes, bananes trop mûres écrasées',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Gratuit ou très économique. Utiliser fruits de saison.',
      },
      {
        nom: 'Jus de baobab',
        description: 'Pulpe de pain de singe diluée',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Riche en vitamines. Très disponible en zone sahélienne.',
      },
    ],
  },
  {
    original: 'Huile de soja',
    alternatives: [
      {
        nom: 'Huile de palme rouge',
        description: 'Huile extraite de la pulpe de palmier',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Très disponible en Afrique. Riche en vitamine A et énergie.',
      },
      {
        nom: 'Huile d\'arachide',
        description: 'Huile extraite des arachides',
        disponibilite: 'facile',
        cout: 'moyen',
        remarques: 'Largement disponible. Bonne valeur énergétique.',
      },
      {
        nom: 'Graines de coton entières',
        description: 'Graines de coton non décortiquées',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Zones cotonnières. Attention : max 10% de la ration (gossypol).',
      },
    ],
  },
  {
    original: 'Lysine',
    alternatives: [
      {
        nom: 'Farine de poisson local',
        description: 'Poisson séché et broyé',
        disponibilite: 'moyenne',
        cout: 'moyen',
        remarques: 'Naturellement riche en lysine. Alternative économique aux acides aminés de synthèse.',
      },
      {
        nom: 'Vers de terre séchés',
        description: 'Lombrics collectés et séchés',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Gratuit. Riche en protéines de qualité et lysine. Collecte en saison des pluies.',
      },
    ],
  },
  {
    original: 'Phosphate bicalcique',
    alternatives: [
      {
        nom: 'Farine d\'os calcinés',
        description: 'Os d\'animaux broyés après calcination',
        disponibilite: 'moyenne',
        cout: 'economique',
        remarques: 'Excellente source de calcium et phosphore. Récupérable aux abattoirs.',
      },
      {
        nom: 'Cendre de bois',
        description: 'Cendre de bois dur tamisée',
        disponibilite: 'facile',
        cout: 'economique',
        remarques: 'Gratuit. Source de calcium et potassium. Max 2% de la ration.',
      },
    ],
  },
];

/**
 * Obtenir les alternatives pour un ingrédient donné
 */
export function getAlternatives(nomIngredient: string): AlternativeIngredient | null {
  const recherche = nomIngredient.toLowerCase();
  return (
    ALTERNATIVES_INGREDIENTS.find((alt) => alt.original.toLowerCase().includes(recherche)) || null
  );
}

/**
 * Vérifier si un ingrédient a des alternatives
 */
export function hasAlternatives(nomIngredient: string): boolean {
  return getAlternatives(nomIngredient) !== null;
}

/**
 * Obtenir un texte formaté des alternatives
 */
export function getAlternativesText(nomIngredient: string): string {
  const alternatives = getAlternatives(nomIngredient);
  if (!alternatives) {
    return 'Aucune alternative disponible pour cet ingrédient.';
  }

  let texte = `💡 Alternatives pour "${alternatives.original}" :\n\n`;

  alternatives.alternatives.forEach((alt, index) => {
    const iconeDisponibilite = 
      alt.disponibilite === 'facile' ? '✅' : 
      alt.disponibilite === 'moyenne' ? '⚠️' : '❌';
    
    const iconeCout = 
      alt.cout === 'economique' ? '💰' : 
      alt.cout === 'moyen' ? '💰💰' : '💰💰💰';

    texte += `${index + 1}. ${alt.nom} ${iconeDisponibilite} ${iconeCout}\n`;
    texte += `   ${alt.description}\n`;
    if (alt.remarques) {
      texte += `   ℹ️ ${alt.remarques}\n`;
    }
    texte += `\n`;
  });

  texte += '\nLégende:\n';
  texte += '✅ = Facile à trouver | ⚠️ = Disponibilité moyenne | ❌ = Difficile\n';
  texte += '💰 = Économique | 💰💰 = Prix moyen | 💰💰💰 = Cher';

  return texte;
}

