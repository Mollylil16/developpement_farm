/**
 * Générateur de noms aléatoires pour les animaux
 * Inclut des noms de rois/reines français, belges, sud-africains et objets du quotidien
 */

// Noms masculins - Rois de France
const NOMS_MASCULINS_ROYAUX_FRANCE = [
  'Louis',
  'Philippe',
  'Charles',
  'Henri',
  'François',
  'Clovis',
  'Pépin',
  'Dagobert',
  'Charlemagne',
  'Hugues',
  'Robert',
  'Raoul',
  'Lothaire',
  'Childéric',
  'Clotaire',
];

// Noms féminins - Reines de France
const NOMS_FEMININS_ROYAUX_FRANCE = [
  'Marie',
  'Catherine',
  'Anne',
  'Aliénor',
  'Blanche',
  'Isabelle',
  'Jeanne',
  'Claude',
  'Marguerite',
  'Élisabeth',
  'Joséphine',
  'Marie-Antoinette',
  'Berthe',
  'Clotilde',
  'Bathilde',
];

// Noms masculins - Rois de Belgique
const NOMS_MASCULINS_ROYAUX_BELGIQUE = [
  'Léopold',
  'Albert',
  'Baudouin',
  'Philippe',
  'Emmanuel',
  'Gabriel',
  'Aymeric',
];

// Noms féminins - Reines de Belgique
const NOMS_FEMININS_ROYAUX_BELGIQUE = [
  'Louise',
  'Astrid',
  'Fabiola',
  'Paola',
  'Mathilde',
  'Stéphanie',
  'Charlotte',
  'Élisabeth',
  'Éléonore',
  'Joséphine',
  'Maria-Laura',
  'Laetitia',
];

// Noms masculins - Leaders Sud-Africains
const NOMS_MASCULINS_AFRIQUE_SUD = [
  'Mandela',
  'Shaka',
  'Cetshwayo',
  'Moshoeshoe',
  'Sobhuza',
  'Mzilikazi',
  'Dingane',
  'Hintsa',
  'Sekhukhune',
  'Bambatha',
];

// Noms féminins - Leaders Sud-Africains
const NOMS_FEMININS_AFRIQUE_SUD = [
  'Winnie',
  'Albertina',
  'Nandi',
  'Mantatisi',
  'Mkabayi',
  'Mmanthatisi',
  'Mawa',
  'Nongqawuse',
  'Sarah',
  'Miriam',
];

// Objets du quotidien (français)
const NOMS_OBJETS = [
  'Cuillère',
  'Fourchette',
  'Couteau',
  'Assiette',
  'Tasse',
  'Verre',
  'Bouteille',
  'Carafe',
  'Théière',
  'Cafetière',
  'Louche',
  'Casserole',
  'Poêle',
  'Marmite',
  'Passoire',
  'Fouet',
  'Spatule',
  'Rouleau',
  'Balance',
  'Minuteur',
  'Lampe',
  'Bougie',
  'Lanterne',
  'Torche',
  'Ampoule',
  'Coussin',
  'Oreiller',
  'Couverture',
  'Drap',
  'Rideau',
  'Chaise',
  'Tabouret',
  'Fauteuil',
  'Banc',
  'Canapé',
  'Horloge',
  'Réveil',
  'Pendule',
  'Sablier',
  'Boussole',
  'Clé',
  'Cadenas',
  'Serrure',
  'Verrou',
  'Poignée',
  'Balai',
  'Pelle',
  'Râteau',
  'Seau',
  'Panier',
  'Éponge',
  'Serviette',
  'Torchon',
  'Chiffon',
  'Brosse',
  'Peigne',
  'Miroir',
  'Savon',
  'Étagère',
  'Bocal',
  'Boîte',
  'Pot',
  'Jarre',
  'Cuvette',
  'Bassine',
  'Arrosoir',
  'Brouette',
  'Pinceau',
  'Marteau',
  'Tournevis',
  'Cloche',
  'Sifflet',
  'Tambour',
  'Flûte',
  'Trompette',
];

// Combiner toutes les listes par genre
const TOUS_LES_NOMS_MASCULINS = [
  ...NOMS_MASCULINS_ROYAUX_FRANCE,
  ...NOMS_MASCULINS_ROYAUX_BELGIQUE,
  ...NOMS_MASCULINS_AFRIQUE_SUD,
  ...NOMS_OBJETS, // Les objets sont neutres, utilisables pour tous
];

const TOUS_LES_NOMS_FEMININS = [
  ...NOMS_FEMININS_ROYAUX_FRANCE,
  ...NOMS_FEMININS_ROYAUX_BELGIQUE,
  ...NOMS_FEMININS_AFRIQUE_SUD,
  ...NOMS_OBJETS, // Les objets sont neutres, utilisables pour tous
];

// Liste combinée pour compatibilité (tous genres)
const TOUS_LES_NOMS = [...TOUS_LES_NOMS_MASCULINS, ...TOUS_LES_NOMS_FEMININS];

// Anciennes listes pour compatibilité (dépréciées)
const NOMS_ROYAUX_FRANCE = [...NOMS_MASCULINS_ROYAUX_FRANCE, ...NOMS_FEMININS_ROYAUX_FRANCE];

const NOMS_ROYAUX_BELGIQUE = [...NOMS_MASCULINS_ROYAUX_BELGIQUE, ...NOMS_FEMININS_ROYAUX_BELGIQUE];

const NOMS_AFRIQUE_SUD = [...NOMS_MASCULINS_AFRIQUE_SUD, ...NOMS_FEMININS_AFRIQUE_SUD];

/**
 * Génère un nom aléatoire unique pour un animal
 * @param nomsDejaUtilises Liste des noms déjà utilisés à éviter
 * @param categorie Catégorie de noms (optionnel: 'royaux_france', 'royaux_belgique', 'afrique_sud', 'objets', 'tous')
 * @param genre Genre de l'animal ('male', 'femelle', 'indetermine' ou undefined pour tous)
 * @returns Un nom unique et aléatoire
 */
export function genererNomAleatoire(
  nomsDejaUtilises: string[] = [],
  categorie: 'royaux_france' | 'royaux_belgique' | 'afrique_sud' | 'objets' | 'tous' = 'tous',
  genre?: 'male' | 'femelle' | 'indetermine'
): string {
  // Sélectionner la liste appropriée selon le genre
  let listeNoms: string[];

  // Si un genre est spécifié, utiliser les listes appropriées
  if (genre === 'male') {
    switch (categorie) {
      case 'royaux_france':
        listeNoms = NOMS_MASCULINS_ROYAUX_FRANCE;
        break;
      case 'royaux_belgique':
        listeNoms = NOMS_MASCULINS_ROYAUX_BELGIQUE;
        break;
      case 'afrique_sud':
        listeNoms = NOMS_MASCULINS_AFRIQUE_SUD;
        break;
      case 'objets':
        listeNoms = NOMS_OBJETS;
        break;
      case 'tous':
      default:
        listeNoms = TOUS_LES_NOMS_MASCULINS;
        break;
    }
  } else if (genre === 'femelle') {
    switch (categorie) {
      case 'royaux_france':
        listeNoms = NOMS_FEMININS_ROYAUX_FRANCE;
        break;
      case 'royaux_belgique':
        listeNoms = NOMS_FEMININS_ROYAUX_BELGIQUE;
        break;
      case 'afrique_sud':
        listeNoms = NOMS_FEMININS_AFRIQUE_SUD;
        break;
      case 'objets':
        listeNoms = NOMS_OBJETS;
        break;
      case 'tous':
      default:
        listeNoms = TOUS_LES_NOMS_FEMININS;
        break;
    }
  } else {
    // Genre indéterminé ou non spécifié : utiliser toutes les listes
    switch (categorie) {
      case 'royaux_france':
        listeNoms = NOMS_ROYAUX_FRANCE;
        break;
      case 'royaux_belgique':
        listeNoms = NOMS_ROYAUX_BELGIQUE;
        break;
      case 'afrique_sud':
        listeNoms = NOMS_AFRIQUE_SUD;
        break;
      case 'objets':
        listeNoms = NOMS_OBJETS;
        break;
      case 'tous':
      default:
        listeNoms = TOUS_LES_NOMS;
        break;
    }
  }

  // Filtrer les noms déjà utilisés
  const nomsDisponibles = listeNoms.filter((nom) => !nomsDejaUtilises.includes(nom));

  // Si tous les noms sont utilisés, ajouter un suffixe numérique
  if (nomsDisponibles.length === 0) {
    const nomBase = listeNoms[Math.floor(Math.random() * listeNoms.length)];
    let compteur = 2;
    let nomAvecSuffixe = `${nomBase} ${compteur}`;

    while (nomsDejaUtilises.includes(nomAvecSuffixe)) {
      compteur++;
      nomAvecSuffixe = `${nomBase} ${compteur}`;
    }

    return nomAvecSuffixe;
  }

  // Sélectionner un nom aléatoire parmi les disponibles
  const index = Math.floor(Math.random() * nomsDisponibles.length);
  return nomsDisponibles[index];
}

/**
 * Génère plusieurs noms aléatoires uniques
 * @param nombre Nombre de noms à générer
 * @param nomsDejaUtilises Liste des noms déjà utilisés à éviter
 * @param categorie Catégorie de noms (optionnel)
 * @param genre Genre de l'animal ('male', 'femelle', 'indetermine' ou undefined pour tous)
 * @returns Un tableau de noms uniques
 */
export function genererPlusieursNomsAleatoires(
  nombre: number,
  nomsDejaUtilises: string[] = [],
  categorie: 'royaux_france' | 'royaux_belgique' | 'afrique_sud' | 'objets' | 'tous' = 'tous',
  genre?: 'male' | 'femelle' | 'indetermine'
): string[] {
  const nomsGeneres: string[] = [];
  const tousLesNomsUtilises = [...nomsDejaUtilises];

  for (let i = 0; i < nombre; i++) {
    const nouveauNom = genererNomAleatoire(tousLesNomsUtilises, categorie, genre);
    nomsGeneres.push(nouveauNom);
    tousLesNomsUtilises.push(nouveauNom);
  }

  return nomsGeneres;
}

/**
 * Obtient des statistiques sur les noms disponibles
 * @returns Objet avec les statistiques
 */
export function getStatistiquesNoms() {
  return {
    total: TOUS_LES_NOMS.length,
    masculins: TOUS_LES_NOMS_MASCULINS.length,
    feminins: TOUS_LES_NOMS_FEMININS.length,
    royaux_france: NOMS_ROYAUX_FRANCE.length,
    royaux_belgique: NOMS_ROYAUX_BELGIQUE.length,
    afrique_sud: NOMS_AFRIQUE_SUD.length,
    objets: NOMS_OBJETS.length,
  };
}

/**
 * Obtient tous les noms disponibles par catégorie
 * @returns Objet avec toutes les listes de noms
 */
export function getTousLesNoms() {
  return {
    masculins: [...TOUS_LES_NOMS_MASCULINS],
    feminins: [...TOUS_LES_NOMS_FEMININS],
    royaux_france: [...NOMS_ROYAUX_FRANCE],
    royaux_belgique: [...NOMS_ROYAUX_BELGIQUE],
    afrique_sud: [...NOMS_AFRIQUE_SUD],
    objets: [...NOMS_OBJETS],
    tous: [...TOUS_LES_NOMS],
  };
}
