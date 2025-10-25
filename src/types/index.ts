
// Types pour les vaccinations et traitements
export interface Vaccination {
  id: string;
  nom: string;
  date: Date;
  prochainRappel?: Date;
  veterinaire?: string;
  notes?: string;
}

export interface Traitement {
  id: string;
  nom: string;
  dateDebut: Date;
  dateFin?: Date;
  medicament: string;
  posologie: string;
  veterinaire?: string;
  notes?: string;
}

// Types pour la reproduction
export interface Gestation {
  id: string;
  truieId: string;
  dateSautage: Date;
  dateMiseBasPrevue: Date;
  dateMiseBasReelle?: Date;
  nombrePorceletsPrevu: number;
  nombrePorceletsReel?: number;
  statut: 'en_cours' | 'terminee' | 'avortement';
  notes?: string;
}

export interface Sevrage {
  id: string;
  porceletId: string;
  dateSevrage: Date;
  poidsSevrage: number;
  alimentation: string;
  notes?: string;
}

// Types pour la nutrition
export interface Ration {
  id: string;
  nom: string;
  typePorc: 'porcelet' | 'truie_gestante' | 'truie_allaitante' | 'verrat' | 'porc_croissance';
  poidsMin: number;
  poidsMax: number;
  ingredients: IngredientRation[];
  coutParKg: number;
  notes?: string;
}

export interface IngredientRation {
  nom: string;
  pourcentage: number;
  coutParKg: number;
}


export interface CashFlow {
  date: Date;
  recettes: number;
  depenses: number;
  solde: number;
}

// Types pour la planification des accouplements
export interface PlanificationAccouplement {
  id: string;
  nom: string;
  objectifPorcs: number;
  nombreMisesBasMinimum: number;
  nombreMoyenPorceletsParMiseBas: number;
  dateDebut: Date;
  dateFin: Date;
  statut: 'planifie' | 'en_cours' | 'termine';
  saillies: SailliePlanifiee[];
  notes?: string;
}

export interface SailliePlanifiee {
  id: string;
  planificationId: string;
  truieId: string;
  verratId: string;
  dateSaillie: Date;
  dateMiseBasPrevue: Date;
  statut: 'planifie' | 'realise' | 'annule';
  notes?: string;
}

export interface ObjectifReproduction {
  nombrePorcsCible: number;
  nombreMisesBasMinimum: number;
  periodePlanification: {
    debut: Date;
    fin: Date;
  };
  intervalleEntreSaillies: number; // jours
  dureeGestation: number; // jours (défaut: 114)
  nombreMoyenPorceletsParMiseBas: number; // nombre moyen de porcelets par mise bas (défaut: 12)
}

// Types pour les recommandations
export interface Recommandation {
  type: 'reproduction' | 'nutrition' | 'vente' | 'general';
  icon: string;
  color: string;
  titre: string;
  description: string;
  action: string;
}

// Types pour la gestion des mortalités
export interface Mortalite {
  id: string;
  porcId: string;
  porcNumeroIdentification: string;
  dateDeces: Date;
  causeDeces: 'maladie' | 'accident' | 'vieillesse' | 'autre';
  causeDetaillee?: string;
  poidsAuDeces: number;
  ageAuDeces: number; // en jours
  traitementPrecedent?: string;
  notes?: string;
  photos?: string[]; // URLs des photos
  rapportVeterinaire?: string; // URL du rapport PDF
}

// Types pour les documents de factures
export interface DocumentFacture {
  id: string;
  transactionId: string;
  type: 'photo' | 'pdf';
  nomFichier: string;
  cheminFichier: string;
  tailleFichier: number; // en bytes
  dateAjout: Date;
  description?: string;
}

// Mise à jour du type Transaction pour inclure les documents
export interface Transaction {
  id: string;
  type: 'vente' | 'achat' | 'depense';
  montant: number;
  description: string;
  date: Date;
  categorie?: string;
  porcId?: string; // Pour les ventes de porcs
  documents?: DocumentFacture[]; // Documents joints (photos, PDF)
}

// Mise à jour du type Porc pour inclure le statut 'mort'
export interface Porc {
  id: string;
  numeroIdentification: string;
  sexe: 'male' | 'femelle';
  race: string;
  dateNaissance: Date;
  poidsActuel: number;
  poidsCible: number;
  statut: 'gestation' | 'sevrage' | 'croissance' | 'vente' | 'reproduction' | 'mort';
  pereId?: string;
  mereId?: string;
  notes?: string;
  vaccinations?: Vaccination[];
  traitements?: Traitement[];
  mortalite?: Mortalite; // Référence à la mortalité si applicable
}
// Types pour la collaboration multi-utilisateurs
export interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  avatar?: string;
  role: 'proprietaire' | 'collaborateur' | 'lecteur';
  dateAjout: Date;
  derniereActivite?: Date;
}

export interface Projet {
  id: string;
  nom: string;
  description?: string;
  proprietaireId: string;
  proprietaireNom: string;
  dateCreation: Date;
  derniereModification: Date;
  statut: 'actif' | 'archive' | 'suspendu';
  utilisateurs: Utilisateur[];
  lienPartage: string;
  permissions: PermissionsProjet;
}

export interface PermissionsProjet {
  peutModifierPorcs: boolean;
  peutModifierGestations: boolean;
  peutModifierNutrition: boolean;
  peutModifierFinance: boolean;
  peutModifierPlanification: boolean;
  peutInviterUtilisateurs: boolean;
  peutVoirRapports: boolean;
}

export interface ActiviteUtilisateur {
  id: string;
  utilisateurId: string;
  utilisateurNom: string;
  action: 'ajout' | 'modification' | 'suppression' | 'connexion';
  typeDonnee: 'porc' | 'gestation' | 'nutrition' | 'finance' | 'planification' | 'projet';
  description: string;
  date: Date;
  details?: Record<string, any>;
}

export interface InvitationProjet {
  id: string;
  projetId: string;
  projetNom: string;
  emailInvite: string;
  rolePropose: 'collaborateur' | 'lecteur';
  statut: 'en_attente' | 'acceptee' | 'refusee' | 'expiree';
  dateEnvoi: Date;
  dateExpiration: Date;
  codeInvitation: string;
}

// Types pour les devises
export type Devise = 'USD' | 'EUR' | 'CFA';

export interface DeviseConfig {
  code: Devise;
  symbole: string;
  nom: string;
  tauxChange: number; // Taux de change par rapport à l'euro (devise de référence)
  positionSymbole: 'before' | 'after'; // Position du symbole par rapport au montant
}

export interface ParametresApp {
  devise: Devise;
  langue: 'fr' | 'en';
  notifications: boolean;
  theme: 'clair' | 'sombre';
}

export interface RapportCroissance {
  porcId: string;
  date: Date;
  poids: number;
  gainQuotidien: number;
}

export interface RapportProduction {
  periode: {
    debut: Date;
    fin: Date;
  };
  nombreNaissances: number;
  nombreSevrages: number;
  nombreVentes: number;
  chiffreAffaires: number;
  coutsTotaux: number;
  benefice: number;
}

// Types pour l'état de l'application
export interface AppState {
  porcs: Porc[];
  gestations: Gestation[];
  sevrages: Sevrage[];
  rations: Ration[];
  transactions: Transaction[];
  rapportsCroissance: RapportCroissance[];
  loading: boolean;
  error?: string;
}
