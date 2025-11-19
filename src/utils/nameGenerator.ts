/**
 * Générateur de noms aléatoires pour les animaux
 * Inclut des noms de rois/reines français, belges, sud-africains et objets du quotidien
 */

// Rois et Reines de France
const NOMS_ROYAUX_FRANCE = [
  'Louis', 'Philippe', 'Charles', 'Henri', 'François',
  'Clovis', 'Pépin', 'Dagobert', 'Charlemagne', 'Hugues',
  'Robert', 'Raoul', 'Lothaire', 'Childéric', 'Clotaire',
  'Marie', 'Catherine', 'Anne', 'Aliénor', 'Blanche',
  'Isabelle', 'Jeanne', 'Claude', 'Marguerite', 'Élisabeth',
  'Joséphine', 'Marie-Antoinette', 'Berthe', 'Clotilde', 'Bathilde'
];

// Rois et Reines de Belgique
const NOMS_ROYAUX_BELGIQUE = [
  'Léopold', 'Albert', 'Baudouin', 'Philippe',
  'Louise', 'Astrid', 'Fabiola', 'Paola', 'Mathilde',
  'Stéphanie', 'Charlotte', 'Élisabeth', 'Emmanuel', 'Gabriel',
  'Éléonore', 'Joséphine', 'Maria-Laura', 'Laetitia', 'Aymeric'
];

// Rois et Leaders Sud-Africains célèbres
const NOMS_AFRIQUE_SUD = [
  'Mandela', 'Shaka', 'Cetshwayo', 'Moshoeshoe', 'Sobhuza',
  'Mzilikazi', 'Dingane', 'Hintsa', 'Sekhukhune', 'Bambatha',
  'Winnie', 'Albertina', 'Nandi', 'Mantatisi', 'Mkabayi',
  'Mmanthatisi', 'Mawa', 'Nongqawuse', 'Sarah', 'Miriam'
];

// Objets du quotidien (français)
const NOMS_OBJETS = [
  'Cuillère', 'Fourchette', 'Couteau', 'Assiette', 'Tasse',
  'Verre', 'Bouteille', 'Carafe', 'Théière', 'Cafetière',
  'Louche', 'Casserole', 'Poêle', 'Marmite', 'Passoire',
  'Fouet', 'Spatule', 'Rouleau', 'Balance', 'Minuteur',
  'Lampe', 'Bougie', 'Lanterne', 'Torche', 'Ampoule',
  'Coussin', 'Oreiller', 'Couverture', 'Drap', 'Rideau',
  'Chaise', 'Tabouret', 'Fauteuil', 'Banc', 'Canapé',
  'Horloge', 'Réveil', 'Pendule', 'Sablier', 'Boussole',
  'Clé', 'Cadenas', 'Serrure', 'Verrou', 'Poignée',
  'Balai', 'Pelle', 'Râteau', 'Seau', 'Panier',
  'Éponge', 'Serviette', 'Torchon', 'Chiffon', 'Brosse',
  'Peigne', 'Miroir', 'Savon', 'Étagère', 'Bocal',
  'Boîte', 'Pot', 'Jarre', 'Cuvette', 'Bassine',
  'Arrosoir', 'Brouette', 'Pinceau', 'Marteau', 'Tournevis',
  'Cloche', 'Sifflet', 'Tambour', 'Flûte', 'Trompette'
];

// Combiner toutes les listes
const TOUS_LES_NOMS = [
  ...NOMS_ROYAUX_FRANCE,
  ...NOMS_ROYAUX_BELGIQUE,
  ...NOMS_AFRIQUE_SUD,
  ...NOMS_OBJETS
];

/**
 * Génère un nom aléatoire unique pour un animal
 * @param nomsDejaUtilises Liste des noms déjà utilisés à éviter
 * @param categorie Catégorie de noms (optionnel: 'royaux_france', 'royaux_belgique', 'afrique_sud', 'objets', 'tous')
 * @returns Un nom unique et aléatoire
 */
export function genererNomAleatoire(
  nomsDejaUtilises: string[] = [],
  categorie: 'royaux_france' | 'royaux_belgique' | 'afrique_sud' | 'objets' | 'tous' = 'tous'
): string {
  // Sélectionner la liste appropriée
  let listeNoms: string[];
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

  // Filtrer les noms déjà utilisés
  const nomsDisponibles = listeNoms.filter(
    nom => !nomsDejaUtilises.includes(nom)
  );

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
 * @returns Un tableau de noms uniques
 */
export function genererPlusieursNomsAleatoires(
  nombre: number,
  nomsDejaUtilises: string[] = [],
  categorie: 'royaux_france' | 'royaux_belgique' | 'afrique_sud' | 'objets' | 'tous' = 'tous'
): string[] {
  const nomsGeneres: string[] = [];
  const tousLesNomsUtilises = [...nomsDejaUtilises];

  for (let i = 0; i < nombre; i++) {
    const nouveauNom = genererNomAleatoire(tousLesNomsUtilises, categorie);
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
    royaux_france: [...NOMS_ROYAUX_FRANCE],
    royaux_belgique: [...NOMS_ROYAUX_BELGIQUE],
    afrique_sud: [...NOMS_AFRIQUE_SUD],
    objets: [...NOMS_OBJETS],
    tous: [...TOUS_LES_NOMS],
  };
}

