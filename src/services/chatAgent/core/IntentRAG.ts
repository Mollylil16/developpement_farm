/**
 * Système RAG (Retrieval Augmented Generation) pour la détection d'intention
 * Base de connaissances avec recherche sémantique
 * Supporte deux modes : Jaccard (fallback) et OpenAI embeddings (recommandé)
 */

import { AgentActionType } from '../../../types/chatAgent';
import { DetectedIntent } from '../IntentDetector';
import { logger } from '../../../utils/logger';

export interface TrainingExample {
  text: string;
  action: AgentActionType;
  params: Record<string, unknown>;
  confidence: number;
  variants?: string[]; // Variantes linguistiques
}

/**
 * Base de connaissances d'exemples pour la détection d'intention
 * Enrichie avec 440+ exemples manuels variés couvrant tous les cas d'usage
 *
 * ⚠️ Cette base est complétée par INTENT_KNOWLEDGE_BASE_GENERATED (5000+ exemples)
 * pour une meilleure performance de l'agent
 */
export const INTENT_KNOWLEDGE_BASE: TrainingExample[] = [
  // ========== STATISTIQUES (get_statistics) ==========
  { text: 'combien de porc actif', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'statistiques', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'statistique', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'bilan', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'bilans', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'nombre de porc', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'nombre de porcs', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'nombre porc', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'combien j ai de porc', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'combien j ai de porcs', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'combien de porcs j ai', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'combien porc', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'combien porcs', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'mes animaux', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'mon elevage', action: 'get_statistics', params: {}, confidence: 0.9 },

  // ========== CHEPTEL DÉTAILLÉ (get_cheptel_details) ==========
  { text: 'mon cheptel', action: 'get_cheptel_details', params: {}, confidence: 0.95 },
  { text: 'quel est mon cheptel', action: 'get_cheptel_details', params: {}, confidence: 0.95 },
  { text: 'cheptel actuel', action: 'get_cheptel_details', params: {}, confidence: 0.95 },
  { text: 'detail du cheptel', action: 'get_cheptel_details', params: {}, confidence: 0.95 },
  { text: 'etat du cheptel', action: 'get_cheptel_details', params: {}, confidence: 0.95 },
  { text: 'situation du cheptel', action: 'get_cheptel_details', params: {}, confidence: 0.9 },
  { text: 'liste des porcs', action: 'get_cheptel_details', params: {}, confidence: 0.9 },
  { text: 'mes porcs', action: 'get_cheptel_details', params: {}, confidence: 0.9 },
  { text: 'mes loges', action: 'get_cheptel_details', params: {}, confidence: 0.95 },
  { text: 'mes bandes', action: 'get_cheptel_details', params: {}, confidence: 0.95 },
  { text: 'liste des loges', action: 'get_cheptel_details', params: {}, confidence: 0.95 },
  { text: 'quels animaux j ai', action: 'get_cheptel_details', params: {}, confidence: 0.9 },

  // ========== PESÉES DÉTAILLÉES (get_weighing_details) ==========
  { text: 'suivi des pesees', action: 'get_weighing_details', params: {}, confidence: 0.95 },
  { text: 'mes pesees', action: 'get_weighing_details', params: {}, confidence: 0.95 },
  { text: 'historique des pesees', action: 'get_weighing_details', params: {}, confidence: 0.95 },
  { text: 'evolution du poids', action: 'get_weighing_details', params: {}, confidence: 0.95 },
  { text: 'poids des porcs', action: 'get_weighing_details', params: {}, confidence: 0.95 },
  { text: 'dernieres pesees', action: 'get_weighing_details', params: {}, confidence: 0.95 },
  { text: 'quelles pesees', action: 'get_weighing_details', params: {}, confidence: 0.9 },
  { text: 'detail des pesees', action: 'get_weighing_details', params: {}, confidence: 0.95 },
  { text: 'poids moyen des porcs', action: 'get_weighing_details', params: {}, confidence: 0.9 },
  { text: 'combien pesent mes porcs', action: 'get_weighing_details', params: {}, confidence: 0.95 },
  { text: 'porc actif', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'porcs actifs', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'actif', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'actifs', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'mes porcs', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'donnees', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'chiffres', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'total', action: 'get_statistics', params: {}, confidence: 0.8 },
  { text: 'compte', action: 'get_statistics', params: {}, confidence: 0.8 },
  { text: 'resume', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'resume du cheptel', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'montre moi mes porcs', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'affiche mes animaux', action: 'get_statistics', params: {}, confidence: 0.9 },

  // ========== STOCKS (get_stock_status) ==========
  { text: 'stock actuel', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'stocks', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'stock', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'nourriture', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'provende', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'provendes', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'aliment', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'aliments', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'alimentation', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'ration', action: 'get_stock_status', params: {}, confidence: 0.85 },
  { text: 'rations', action: 'get_stock_status', params: {}, confidence: 0.85 },
  { text: 'combien de nourriture', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'combien de provende', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'combien d aliment', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'il reste', action: 'get_stock_status', params: {}, confidence: 0.85 },
  { text: 'il reste combien', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'quantite', action: 'get_stock_status', params: {}, confidence: 0.85 },
  { text: 'quantites', action: 'get_stock_status', params: {}, confidence: 0.85 },
  { text: 'reste', action: 'get_stock_status', params: {}, confidence: 0.85 },
  { text: 'restes', action: 'get_stock_status', params: {}, confidence: 0.85 },
  { text: 'etat des stocks', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'statut des stocks', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'niveau de stock', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'niveaux de stock', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'montre moi les stocks', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'affiche les stocks', action: 'get_stock_status', params: {}, confidence: 0.9 },

  // ========== COÛTS (calculate_costs) ==========
  { text: 'mes depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'mes depense', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'cout total', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'couts totaux', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'cout', action: 'calculate_costs', params: {}, confidence: 0.85 },
  { text: 'couts', action: 'calculate_costs', params: {}, confidence: 0.85 },
  { text: 'combien j ai depense', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'combien j ai depense ce mois', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'depense totale', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'depenses totales', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'calculer', action: 'calculate_costs', params: {}, confidence: 0.85 },
  { text: 'calcul', action: 'calculate_costs', params: {}, confidence: 0.85 },
  { text: 'calcule', action: 'calculate_costs', params: {}, confidence: 0.85 },
  { text: 'budget', action: 'calculate_costs', params: {}, confidence: 0.85 },
  { text: 'mes couts', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'total depense', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'total des depenses', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'montre moi mes depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'affiche les couts', action: 'calculate_costs', params: {}, confidence: 0.9 },

  // ========== RAPPELS (get_reminders) ==========
  { text: 'rappels', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'rappel', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'a faire', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'a faire aujourd hui', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'calendrier', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'agenda', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'taches', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'tache', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'programme', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'programmes', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'planifie', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'planifiee', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'vaccination a venir', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'traitement a venir', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'visite prevue', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'prochaine', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'prochaines', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'prochaines taches', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'ce qui est prevu', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'montre moi les rappels', action: 'get_reminders', params: {}, confidence: 0.9 },

  // ========== ANALYSE (analyze_data) ==========
  { text: 'analyse', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'analyses', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'analyser', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'analyser mes donnees', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'situation', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'situations', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'etat', action: 'analyze_data', params: {}, confidence: 0.85 },
  { text: 'etats', action: 'analyze_data', params: {}, confidence: 0.85 },
  { text: 'comment va', action: 'analyze_data', params: {}, confidence: 0.85 },
  { text: 'comment ca va', action: 'analyze_data', params: {}, confidence: 0.85 },
  { text: 'evaluation', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'diagnostic', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'performance', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'resultats', action: 'analyze_data', params: {}, confidence: 0.85 },
  { text: 'evolution', action: 'analyze_data', params: {}, confidence: 0.85 },
  { text: 'tendance', action: 'analyze_data', params: {}, confidence: 0.85 },
  { text: 'mon exploitation', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'analyse mon elevage', action: 'analyze_data', params: {}, confidence: 0.95 },

  // ========== RECHERCHE (search_animal) ==========
  { text: 'chercher un animal', action: 'search_animal', params: {}, confidence: 0.9 },
  { text: 'trouver un porc', action: 'search_animal', params: {}, confidence: 0.9 },
  { text: 'recherche', action: 'search_animal', params: {}, confidence: 0.85 },
  { text: 'ou est', action: 'search_animal', params: {}, confidence: 0.85 },
  { text: 'localiser', action: 'search_animal', params: {}, confidence: 0.85 },
  { text: 'montre moi', action: 'search_animal', params: {}, confidence: 0.8 },
  { text: 'affiche', action: 'search_animal', params: {}, confidence: 0.8 },

  // ========== VENTES (create_revenu) ==========
  {
    text: 'j ai vendu 5 porcs a 800000',
    action: 'create_revenu',
    params: { nombre: 5, montant: 800000 },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu 5 porcs a 800 000',
    action: 'create_revenu',
    params: { nombre: 5, montant: 800000 },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu 5 porcs pour 800000',
    action: 'create_revenu',
    params: { nombre: 5, montant: 800000 },
    confidence: 0.95,
  },
  {
    text: 'vente de 3 porcs pour 500000',
    action: 'create_revenu',
    params: { nombre: 3, montant: 500000 },
    confidence: 0.95,
  },
  {
    text: 'vente de 3 porcs a 500000',
    action: 'create_revenu',
    params: { nombre: 3, montant: 500000 },
    confidence: 0.95,
  },
  { text: 'j ai vendu', action: 'create_revenu', params: {}, confidence: 0.85 },
  { text: 'j ai vendu des porcs', action: 'create_revenu', params: {}, confidence: 0.9 },
  { text: 'vente', action: 'create_revenu', params: {}, confidence: 0.8 },
  { text: 'ventes', action: 'create_revenu', params: {}, confidence: 0.8 },
  {
    text: 'j ai vendu 2 porcs de 50kg aujourd hui a 300000',
    action: 'create_revenu',
    params: { nombre: 2, poids_kg: 50, montant: 300000 },
    confidence: 0.95,
  },
  {
    text: 'vente de 8 porcs a traore a 1200000',
    action: 'create_revenu',
    params: { nombre: 8, montant: 1200000, acheteur: 'traore' },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu 10 porcs pour 1500000 fcfa',
    action: 'create_revenu',
    params: { nombre: 10, montant: 1500000 },
    confidence: 0.95,
  },
  { text: 'vente de porcs', action: 'create_revenu', params: {}, confidence: 0.85 },
  { text: 'enregistrer une vente', action: 'create_revenu', params: {}, confidence: 0.9 },
  { text: 'noter une vente', action: 'create_revenu', params: {}, confidence: 0.9 },

  // ========== DÉPENSES (create_depense) ==========
  {
    text: 'j ai achete 20 sacs a 18000',
    action: 'create_depense',
    params: { montant: 18000, categorie: 'alimentation' },
    confidence: 0.95,
  },
  {
    text: 'j ai achete 20 sacs pour 18000',
    action: 'create_depense',
    params: { montant: 18000, categorie: 'alimentation' },
    confidence: 0.95,
  },
  {
    text: 'depense de 50000 pour medicaments',
    action: 'create_depense',
    params: { montant: 50000, categorie: 'medicaments' },
    confidence: 0.95,
  },
  {
    text: 'depense de 50000 en medicaments',
    action: 'create_depense',
    params: { montant: 50000, categorie: 'medicaments' },
    confidence: 0.95,
  },
  { text: 'j ai depense', action: 'create_depense', params: {}, confidence: 0.85 },
  {
    text: 'j ai depense 15000 en medicament aujourd hui',
    action: 'create_depense',
    params: { montant: 15000, categorie: 'medicaments' },
    confidence: 0.95,
  },
  {
    text: 'j ai achete 20 sacs de provende a 18000 fcfa',
    action: 'create_depense',
    params: { montant: 18000, categorie: 'alimentation' },
    confidence: 0.95,
  },
  { text: 'depense', action: 'create_depense', params: {}, confidence: 0.8 },
  { text: 'depenses', action: 'create_depense', params: {}, confidence: 0.8 },
  { text: 'achete', action: 'create_depense', params: {}, confidence: 0.8 },
  {
    text: 'achete de la provende',
    action: 'create_depense',
    params: { categorie: 'alimentation' },
    confidence: 0.85,
  },
  { text: 'enregistrer une depense', action: 'create_depense', params: {}, confidence: 0.9 },
  { text: 'noter une depense', action: 'create_depense', params: {}, confidence: 0.9 },
  {
    text: 'j ai paye 25000 pour consultation veterinaire',
    action: 'create_depense',
    params: { montant: 25000, categorie: 'veterinaire' },
    confidence: 0.95,
  },
  {
    text: 'depense de 100000 pour salaires',
    action: 'create_depense',
    params: { montant: 100000, categorie: 'salaires' },
    confidence: 0.95,
  },

  // ========== CHARGE FIXE (create_charge_fixe) ==========
  {
    text: 'charge fixe de 100000 mensuelle pour salaires',
    action: 'create_charge_fixe',
    params: { montant: 100000, libelle: 'Salaires', frequence: 'mensuel', categorie: 'salaires' },
    confidence: 0.95,
  },
  {
    text: 'abonnement eau 15000 par mois',
    action: 'create_charge_fixe',
    params: { montant: 15000, libelle: 'Abonnement eau', frequence: 'mensuel' },
    confidence: 0.95,
  },
  { text: 'charge fixe', action: 'create_charge_fixe', params: {}, confidence: 0.85 },
  {
    text: 'charge mensuelle',
    action: 'create_charge_fixe',
    params: { frequence: 'mensuel' },
    confidence: 0.9,
  },
  { text: 'abonnement', action: 'create_charge_fixe', params: {}, confidence: 0.85 },
  {
    text: 'enregistrer une charge fixe',
    action: 'create_charge_fixe',
    params: {},
    confidence: 0.9,
  },

  // ========== PESÉES (create_pesee) ==========
  {
    text: 'peser le porc p001 il fait 45 kg',
    action: 'create_pesee',
    params: { animal_code: 'P001', poids_kg: 45 },
    confidence: 0.95,
  },
  {
    text: 'peser le porc p001 il pese 45 kg',
    action: 'create_pesee',
    params: { animal_code: 'P001', poids_kg: 45 },
    confidence: 0.95,
  },
  { text: 'pesee de 50 kg', action: 'create_pesee', params: { poids_kg: 50 }, confidence: 0.85 },
  { text: 'pesee', action: 'create_pesee', params: {}, confidence: 0.8 },
  { text: 'peser', action: 'create_pesee', params: {}, confidence: 0.8 },
  {
    text: 'ajouter une pesee de 50 kg pour l animal p002',
    action: 'create_pesee',
    params: { animal_code: 'P002', poids_kg: 50 },
    confidence: 0.95,
  },
  {
    text: 'peser p003 il fait 60 kg',
    action: 'create_pesee',
    params: { animal_code: 'P003', poids_kg: 60 },
    confidence: 0.95,
  },
  { text: 'enregistrer une pesee', action: 'create_pesee', params: {}, confidence: 0.9 },

  // ========== VACCINATION (create_vaccination) ==========
  { text: 'vaccination', action: 'create_vaccination', params: {}, confidence: 0.85 },
  { text: 'vacciner', action: 'create_vaccination', params: {}, confidence: 0.85 },
  { text: 'j ai vaccine', action: 'create_vaccination', params: {}, confidence: 0.9 },
  {
    text: 'enregistrer une vaccination',
    action: 'create_vaccination',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'vaccination de p001 aujourd hui',
    action: 'create_vaccination',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },

  // ========== VISITE VÉTÉRINAIRE (create_visite_veterinaire) ==========
  { text: 'visite veterinaire', action: 'create_visite_veterinaire', params: {}, confidence: 0.9 },
  {
    text: 'visite du veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'rendez vous veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'consultation veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'enregistrer une visite veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'le veterinaire est venu',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.85,
  },

  // ========== TRAITEMENT (create_traitement) ==========
  { text: 'traitement', action: 'create_traitement', params: {}, confidence: 0.85 },
  { text: 'traiter', action: 'create_traitement', params: {}, confidence: 0.85 },
  { text: 'j ai traite', action: 'create_traitement', params: {}, confidence: 0.9 },
  { text: 'enregistrer un traitement', action: 'create_traitement', params: {}, confidence: 0.9 },
  {
    text: 'traitement de p001',
    action: 'create_traitement',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },

  // ========== MALADIE (create_maladie) ==========
  { text: 'maladie', action: 'create_maladie', params: {}, confidence: 0.85 },
  { text: 'un porc est malade', action: 'create_maladie', params: {}, confidence: 0.9 },
  { text: 'enregistrer une maladie', action: 'create_maladie', params: {}, confidence: 0.9 },
  { text: 'declarer une maladie', action: 'create_maladie', params: {}, confidence: 0.9 },

  // ========== INGRÉDIENT (create_ingredient) ==========
  {
    text: 'creer un ingredient mais a 500 fcfa par kg',
    action: 'create_ingredient',
    params: { nom: 'maïs', prix_unitaire: 500, unite: 'kg' },
    confidence: 0.95,
  },
  {
    text: 'ajouter ingredient soja 800 fcfa par kg',
    action: 'create_ingredient',
    params: { nom: 'soja', prix_unitaire: 800, unite: 'kg' },
    confidence: 0.95,
  },
  { text: 'nouvel ingredient', action: 'create_ingredient', params: {}, confidence: 0.85 },
  { text: 'creer ingredient', action: 'create_ingredient', params: {}, confidence: 0.9 },

  // ========== PLANIFICATION (create_planification) ==========
  {
    text: 'rappelle moi d appeler le veterinaire demain',
    action: 'create_planification',
    params: { titre: 'Appeler le vétérinaire', type: 'autre' },
    confidence: 0.95,
  },
  { text: 'programmer un rappel', action: 'create_planification', params: {}, confidence: 0.9 },
  { text: 'creer un rappel', action: 'create_planification', params: {}, confidence: 0.9 },
  { text: 'planifier', action: 'create_planification', params: {}, confidence: 0.85 },

  // ========== STATISTIQUES - Exemples réels enrichis ==========
  { text: 'dis moi combien de porcs j ai', action: 'get_statistics', params: {}, confidence: 0.95 },
  {
    text: 'tu peux me dire le nombre de porcs',
    action: 'get_statistics',
    params: {},
    confidence: 0.95,
  },
  {
    text: 'je veux savoir combien de porcs actifs',
    action: 'get_statistics',
    params: {},
    confidence: 0.95,
  },
  { text: 'donne moi les stats', action: 'get_statistics', params: {}, confidence: 0.9 },
  {
    text: 'j aimerais voir mes statistiques',
    action: 'get_statistics',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'montre moi le nombre total de porcs',
    action: 'get_statistics',
    params: {},
    confidence: 0.95,
  },
  { text: 'combien de tete j ai', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'combien de tetes j ai', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'nombre total de porcs', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'total de porcs', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'combien de sujets', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'etat de mon cheptel', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'situation de mon elevage', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'resume de mon exploitation', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'donne moi un apercu', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'je veux voir mes donnees', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'affiche moi le bilan', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'montre le bilan', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'combien de porcs sont actifs', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'nombre de porcs actifs', action: 'get_statistics', params: {}, confidence: 0.95 },
  { text: 'total des animaux', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'combien d animaux j ai', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'combien d animaux', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'mon effectif', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'effectif total', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'effectif actuel', action: 'get_statistics', params: {}, confidence: 0.9 },
  { text: 'combien ca fait en tout', action: 'get_statistics', params: {}, confidence: 0.85 },
  { text: 'le total', action: 'get_statistics', params: {}, confidence: 0.8 },
  { text: 'le compte', action: 'get_statistics', params: {}, confidence: 0.8 },
  { text: 'donne moi le compte', action: 'get_statistics', params: {}, confidence: 0.85 },

  // ========== STOCKS - Exemples réels enrichis ==========
  {
    text: 'dis moi combien de provende il reste',
    action: 'get_stock_status',
    params: {},
    confidence: 0.95,
  },
  { text: 'combien de provende j ai', action: 'get_stock_status', params: {}, confidence: 0.95 },
  {
    text: 'combien de provende reste t il',
    action: 'get_stock_status',
    params: {},
    confidence: 0.95,
  },
  {
    text: 'il reste combien de provende',
    action: 'get_stock_status',
    params: {},
    confidence: 0.95,
  },
  {
    text: 'montre moi les stocks de nourriture',
    action: 'get_stock_status',
    params: {},
    confidence: 0.95,
  },
  { text: 'etat de mes stocks', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'situation des stocks', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'combien de sacs il reste', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'combien de sacs de provende', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'nombre de sacs restants', action: 'get_stock_status', params: {}, confidence: 0.9 },
  {
    text: 'quantite de provende disponible',
    action: 'get_stock_status',
    params: {},
    confidence: 0.95,
  },
  { text: 'disponibilite des stocks', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'niveau des stocks', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'reste t il de la provende', action: 'get_stock_status', params: {}, confidence: 0.9 },
  {
    text: 'y a t il encore de la provende',
    action: 'get_stock_status',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'j ai encore combien de provende',
    action: 'get_stock_status',
    params: {},
    confidence: 0.95,
  },
  {
    text: 'combien de provende disponible',
    action: 'get_stock_status',
    params: {},
    confidence: 0.95,
  },
  { text: 'stock disponible', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'stocks disponibles', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'montre les stocks actuels', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'affiche les stocks actuels', action: 'get_stock_status', params: {}, confidence: 0.95 },
  { text: 'donne moi les stocks', action: 'get_stock_status', params: {}, confidence: 0.9 },
  { text: 'je veux voir mes stocks', action: 'get_stock_status', params: {}, confidence: 0.9 },
  {
    text: 'combien de jours de provende',
    action: 'get_stock_status',
    params: {},
    confidence: 0.85,
  },
  { text: 'combien de jours il reste', action: 'get_stock_status', params: {}, confidence: 0.85 },

  // ========== COÛTS - Exemples réels enrichis ==========
  { text: 'dis moi combien j ai depense', action: 'calculate_costs', params: {}, confidence: 0.95 },
  {
    text: 'combien j ai depense ce mois ci',
    action: 'calculate_costs',
    params: {},
    confidence: 0.95,
  },
  { text: 'montre moi mes depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'affiche mes depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'je veux voir mes depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'total de mes depenses', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'somme de mes depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'montant total depense', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'combien j ai depense en tout', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'depense totale du mois', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'calculer mes depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'calcule mes depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'faire le calcul', action: 'calculate_costs', params: {}, confidence: 0.85 },
  { text: 'faire le bilan financier', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'bilan des depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'resume des depenses', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'montant depense', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'cout total du mois', action: 'calculate_costs', params: {}, confidence: 0.95 },
  { text: 'cout mensuel', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'mes charges', action: 'calculate_costs', params: {}, confidence: 0.85 },
  { text: 'total des charges', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'combien ca me coute', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'combien ca coute', action: 'calculate_costs', params: {}, confidence: 0.85 },
  { text: 'je veux savoir mes couts', action: 'calculate_costs', params: {}, confidence: 0.9 },
  { text: 'donne moi le total', action: 'calculate_costs', params: {}, confidence: 0.85 },

  // ========== RAPPELS - Exemples réels enrichis ==========
  { text: 'qu est ce que j ai a faire', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'qu est ce qui est prevu', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'qu est ce qui est programme', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'montre moi ce que j ai a faire', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'affiche mes taches', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'mes taches du jour', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'taches du jour', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'ce qui est prevu aujourd hui', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'ce qui est prevu cette semaine', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'prochaines vaccinations', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'vaccinations prevues', action: 'get_reminders', params: {}, confidence: 0.9 },
  {
    text: 'quand est la prochaine vaccination',
    action: 'get_reminders',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'quand est le prochain traitement',
    action: 'get_reminders',
    params: {},
    confidence: 0.9,
  },
  { text: 'prochain rendez vous', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'prochains rendez vous', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'rendez vous prevus', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'visites prevues', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'ce qui est planifie', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'activites prevues', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'programme de la semaine', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'planning', action: 'get_reminders', params: {}, confidence: 0.85 },
  { text: 'mon planning', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'mon agenda', action: 'get_reminders', params: {}, confidence: 0.9 },
  { text: 'agenda de la semaine', action: 'get_reminders', params: {}, confidence: 0.9 },

  // ========== ANALYSE - Exemples réels enrichis ==========
  { text: 'analyse mon exploitation', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'analyse mes donnees', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'fais une analyse', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'donne moi une analyse', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'je veux une analyse', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'evalue ma situation', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'evaluation de mon elevage', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'diagnostic de mon exploitation', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'fais un diagnostic', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'donne moi un diagnostic', action: 'analyze_data', params: {}, confidence: 0.95 },
  { text: 'performance de mon elevage', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'mes performances', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'resultats de mon exploitation', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'evolution de mon elevage', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'tendances de mon exploitation', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'comment se porte mon elevage', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'comment va mon exploitation', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'etat de mon exploitation', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'sante de mon elevage', action: 'analyze_data', params: {}, confidence: 0.85 },
  { text: 'bilan complet', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'resume de la situation', action: 'analyze_data', params: {}, confidence: 0.9 },
  { text: 'donne moi un apercu global', action: 'analyze_data', params: {}, confidence: 0.9 },

  // ========== VENTES - Exemples réels enrichis ==========
  {
    text: 'j ai vendu 5 porcs a 800000 fcfa',
    action: 'create_revenu',
    params: { nombre: 5, montant: 800000 },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu 5 porcs pour 800000 francs',
    action: 'create_revenu',
    params: { nombre: 5, montant: 800000 },
    confidence: 0.95,
  },
  {
    text: 'vente de 3 porcs a 500000',
    action: 'create_revenu',
    params: { nombre: 3, montant: 500000 },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu 2 porcs aujourd hui a 300000',
    action: 'create_revenu',
    params: { nombre: 2, montant: 300000 },
    confidence: 0.95,
  },
  {
    text: 'vente de 8 porcs a traore pour 1200000',
    action: 'create_revenu',
    params: { nombre: 8, montant: 1200000, acheteur: 'traore' },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu 10 porcs a kouassi a 1500000',
    action: 'create_revenu',
    params: { nombre: 10, montant: 1500000, acheteur: 'kouassi' },
    confidence: 0.95,
  },
  {
    text: 'vente de 4 porcs de 60kg a 400000',
    action: 'create_revenu',
    params: { nombre: 4, poids_kg: 60, montant: 400000 },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu 6 porcs a 50kg chacun a 600000',
    action: 'create_revenu',
    params: { nombre: 6, poids_kg: 50, montant: 600000 },
    confidence: 0.95,
  },
  { text: 'vente de porcs aujourd hui', action: 'create_revenu', params: {}, confidence: 0.85 },
  { text: 'j ai fait une vente', action: 'create_revenu', params: {}, confidence: 0.85 },
  { text: 'enregistrer ma vente', action: 'create_revenu', params: {}, confidence: 0.9 },
  { text: 'noter ma vente', action: 'create_revenu', params: {}, confidence: 0.9 },
  { text: 'j ai vendu des porcs', action: 'create_revenu', params: {}, confidence: 0.9 },
  { text: 'vente effectuee', action: 'create_revenu', params: {}, confidence: 0.85 },
  {
    text: 'j ai vendu a kouame',
    action: 'create_revenu',
    params: { acheteur: 'kouame' },
    confidence: 0.9,
  },
  { text: 'vente a yao', action: 'create_revenu', params: { acheteur: 'yao' }, confidence: 0.9 },
  {
    text: 'j ai vendu 7 porcs hier a 700000',
    action: 'create_revenu',
    params: { nombre: 7, montant: 700000 },
    confidence: 0.95,
  },
  {
    text: 'vente de 12 porcs ce matin a 1200000',
    action: 'create_revenu',
    params: { nombre: 12, montant: 1200000 },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu 3 porcs a 45kg a 450000',
    action: 'create_revenu',
    params: { nombre: 3, poids_kg: 45, montant: 450000 },
    confidence: 0.95,
  },
  {
    text: 'vente totale de 15 porcs a 2000000',
    action: 'create_revenu',
    params: { nombre: 15, montant: 2000000 },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu mes porcs a 800k',
    action: 'create_revenu',
    params: { montant: 800000 },
    confidence: 0.9,
  },
  {
    text: 'vente de 5 porcs a 800k',
    action: 'create_revenu',
    params: { nombre: 5, montant: 800000 },
    confidence: 0.95,
  },
  {
    text: 'j ai vendu pour 1 million',
    action: 'create_revenu',
    params: { montant: 1000000 },
    confidence: 0.9,
  },
  {
    text: 'vente de 10 porcs pour 1 million',
    action: 'create_revenu',
    params: { nombre: 10, montant: 1000000 },
    confidence: 0.95,
  },

  // ========== DÉPENSES - Exemples réels enrichis ==========
  {
    text: 'j ai achete 20 sacs de provende a 18000',
    action: 'create_depense',
    params: { montant: 18000, categorie: 'alimentation' },
    confidence: 0.95,
  },
  {
    text: 'j ai achete 20 sacs pour 18000 fcfa',
    action: 'create_depense',
    params: { montant: 18000, categorie: 'alimentation' },
    confidence: 0.95,
  },
  {
    text: 'depense de 50000 pour medicaments',
    action: 'create_depense',
    params: { montant: 50000, categorie: 'medicaments' },
    confidence: 0.95,
  },
  {
    text: 'j ai depense 50000 en medicaments',
    action: 'create_depense',
    params: { montant: 50000, categorie: 'medicaments' },
    confidence: 0.95,
  },
  {
    text: 'j ai paye 25000 pour le veterinaire',
    action: 'create_depense',
    params: { montant: 25000, categorie: 'veterinaire' },
    confidence: 0.95,
  },
  {
    text: 'depense de 25000 pour consultation',
    action: 'create_depense',
    params: { montant: 25000, categorie: 'veterinaire' },
    confidence: 0.95,
  },
  {
    text: 'j ai achete de la provende a 18000',
    action: 'create_depense',
    params: { montant: 18000, categorie: 'alimentation' },
    confidence: 0.95,
  },
  {
    text: 'achat de provende 18000',
    action: 'create_depense',
    params: { montant: 18000, categorie: 'alimentation' },
    confidence: 0.95,
  },
  {
    text: 'j ai depense 15000 pour medicament',
    action: 'create_depense',
    params: { montant: 15000, categorie: 'medicaments' },
    confidence: 0.95,
  },
  {
    text: 'depense medicament 15000',
    action: 'create_depense',
    params: { montant: 15000, categorie: 'medicaments' },
    confidence: 0.95,
  },
  {
    text: 'j ai paye 100000 pour salaires',
    action: 'create_depense',
    params: { montant: 100000, categorie: 'salaires' },
    confidence: 0.95,
  },
  {
    text: 'depense salaire 100000',
    action: 'create_depense',
    params: { montant: 100000, categorie: 'salaires' },
    confidence: 0.95,
  },
  {
    text: 'j ai achete 30 sacs a 20000',
    action: 'create_depense',
    params: { montant: 20000, categorie: 'alimentation' },
    confidence: 0.95,
  },
  {
    text: 'achat de 30 sacs pour 20000',
    action: 'create_depense',
    params: { montant: 20000, categorie: 'alimentation' },
    confidence: 0.95,
  },
  {
    text: 'j ai depense 75000 pour entretien',
    action: 'create_depense',
    params: { montant: 75000, categorie: 'entretien' },
    confidence: 0.95,
  },
  {
    text: 'depense entretien 75000',
    action: 'create_depense',
    params: { montant: 75000, categorie: 'entretien' },
    confidence: 0.95,
  },
  {
    text: 'j ai paye 50000 pour vaccins',
    action: 'create_depense',
    params: { montant: 50000, categorie: 'vaccins' },
    confidence: 0.95,
  },
  {
    text: 'achat vaccins 50000',
    action: 'create_depense',
    params: { montant: 50000, categorie: 'vaccins' },
    confidence: 0.95,
  },
  { text: 'j ai depense aujourd hui', action: 'create_depense', params: {}, confidence: 0.85 },
  { text: 'j ai fait un achat', action: 'create_depense', params: {}, confidence: 0.85 },
  { text: 'enregistrer ma depense', action: 'create_depense', params: {}, confidence: 0.9 },
  { text: 'noter ma depense', action: 'create_depense', params: {}, confidence: 0.9 },
  { text: 'j ai depense de l argent', action: 'create_depense', params: {}, confidence: 0.85 },
  { text: 'depense effectuee', action: 'create_depense', params: {}, confidence: 0.85 },
  {
    text: 'j ai achete de la nourriture',
    action: 'create_depense',
    params: { categorie: 'alimentation' },
    confidence: 0.9,
  },
  {
    text: 'achat de nourriture',
    action: 'create_depense',
    params: { categorie: 'alimentation' },
    confidence: 0.9,
  },
  {
    text: 'j ai paye pour medicament',
    action: 'create_depense',
    params: { categorie: 'medicaments' },
    confidence: 0.9,
  },
  {
    text: 'j ai depense 200000 pour tout',
    action: 'create_depense',
    params: { montant: 200000 },
    confidence: 0.9,
  },

  // ========== PESÉES - Exemples réels enrichis ==========
  {
    text: 'peser le porc p001 il fait 45 kg',
    action: 'create_pesee',
    params: { animal_code: 'P001', poids_kg: 45 },
    confidence: 0.95,
  },
  {
    text: 'peser p001 il pese 45 kg',
    action: 'create_pesee',
    params: { animal_code: 'P001', poids_kg: 45 },
    confidence: 0.95,
  },
  {
    text: 'p001 fait 45 kg',
    action: 'create_pesee',
    params: { animal_code: 'P001', poids_kg: 45 },
    confidence: 0.95,
  },
  {
    text: 'le porc p001 pese 45 kg',
    action: 'create_pesee',
    params: { animal_code: 'P001', poids_kg: 45 },
    confidence: 0.95,
  },
  { text: 'pesee de 50 kg', action: 'create_pesee', params: { poids_kg: 50 }, confidence: 0.85 },
  {
    text: 'j ai pese un porc il fait 50 kg',
    action: 'create_pesee',
    params: { poids_kg: 50 },
    confidence: 0.9,
  },
  {
    text: 'pesee de p002 60 kg',
    action: 'create_pesee',
    params: { animal_code: 'P002', poids_kg: 60 },
    confidence: 0.95,
  },
  {
    text: 'p002 pese 60 kg',
    action: 'create_pesee',
    params: { animal_code: 'P002', poids_kg: 60 },
    confidence: 0.95,
  },
  {
    text: 'peser p003 il fait 55 kg',
    action: 'create_pesee',
    params: { animal_code: 'P003', poids_kg: 55 },
    confidence: 0.95,
  },
  {
    text: 'enregistrer une pesee de 45 kg',
    action: 'create_pesee',
    params: { poids_kg: 45 },
    confidence: 0.9,
  },
  { text: 'noter une pesee', action: 'create_pesee', params: {}, confidence: 0.9 },
  { text: 'j ai pese mes porcs', action: 'create_pesee', params: {}, confidence: 0.85 },
  { text: 'pesee effectuee', action: 'create_pesee', params: {}, confidence: 0.85 },
  {
    text: 'p001 45 kg',
    action: 'create_pesee',
    params: { animal_code: 'P001', poids_kg: 45 },
    confidence: 0.9,
  },
  {
    text: 'p002 50 kg',
    action: 'create_pesee',
    params: { animal_code: 'P002', poids_kg: 50 },
    confidence: 0.9,
  },
  {
    text: 'peser p004 65 kg',
    action: 'create_pesee',
    params: { animal_code: 'P004', poids_kg: 65 },
    confidence: 0.95,
  },
  {
    text: 'le porc p005 fait 70 kg',
    action: 'create_pesee',
    params: { animal_code: 'P005', poids_kg: 70 },
    confidence: 0.95,
  },
  {
    text: 'pesee aujourd hui 55 kg',
    action: 'create_pesee',
    params: { poids_kg: 55 },
    confidence: 0.9,
  },
  {
    text: 'j ai pese un porc de 48 kg',
    action: 'create_pesee',
    params: { poids_kg: 48 },
    confidence: 0.9,
  },

  // ========== VACCINATION - Exemples réels enrichis ==========
  { text: 'j ai vaccine mes porcs', action: 'create_vaccination', params: {}, confidence: 0.9 },
  { text: 'vaccination effectuee', action: 'create_vaccination', params: {}, confidence: 0.9 },
  { text: 'j ai vaccine aujourd hui', action: 'create_vaccination', params: {}, confidence: 0.9 },
  {
    text: 'vaccination de p001',
    action: 'create_vaccination',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },
  {
    text: 'j ai vaccine p001',
    action: 'create_vaccination',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },
  {
    text: 'vaccination p001',
    action: 'create_vaccination',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },
  { text: 'enregistrer vaccination', action: 'create_vaccination', params: {}, confidence: 0.9 },
  { text: 'noter vaccination', action: 'create_vaccination', params: {}, confidence: 0.9 },
  { text: 'j ai fait vacciner', action: 'create_vaccination', params: {}, confidence: 0.9 },
  { text: 'vaccination complete', action: 'create_vaccination', params: {}, confidence: 0.85 },
  {
    text: 'j ai vaccine tous les porcs',
    action: 'create_vaccination',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'vaccination de tous les porcs',
    action: 'create_vaccination',
    params: {},
    confidence: 0.9,
  },

  // ========== VISITE VÉTÉRINAIRE - Exemples réels enrichis ==========
  {
    text: 'le veterinaire est venu aujourd hui',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'visite du veterinaire effectuee',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'j ai eu une visite veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'consultation veterinaire aujourd hui',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'rendez vous avec le veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'enregistrer visite veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'noter visite veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  { text: 'le veto est passe', action: 'create_visite_veterinaire', params: {}, confidence: 0.85 },
  { text: 'visite du veto', action: 'create_visite_veterinaire', params: {}, confidence: 0.9 },
  {
    text: 'consultation du veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },
  {
    text: 'j ai consulte le veterinaire',
    action: 'create_visite_veterinaire',
    params: {},
    confidence: 0.9,
  },

  // ========== TRAITEMENT - Exemples réels enrichis ==========
  { text: 'j ai traite mes porcs', action: 'create_traitement', params: {}, confidence: 0.9 },
  { text: 'traitement effectue', action: 'create_traitement', params: {}, confidence: 0.9 },
  { text: 'j ai traite aujourd hui', action: 'create_traitement', params: {}, confidence: 0.9 },
  {
    text: 'traitement de p001',
    action: 'create_traitement',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },
  {
    text: 'j ai traite p001',
    action: 'create_traitement',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },
  {
    text: 'traitement p001',
    action: 'create_traitement',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },
  { text: 'enregistrer traitement', action: 'create_traitement', params: {}, confidence: 0.9 },
  { text: 'noter traitement', action: 'create_traitement', params: {}, confidence: 0.9 },
  { text: 'j ai fait un traitement', action: 'create_traitement', params: {}, confidence: 0.9 },
  { text: 'traitement administre', action: 'create_traitement', params: {}, confidence: 0.85 },
  { text: 'j ai traite tous les porcs', action: 'create_traitement', params: {}, confidence: 0.9 },
  {
    text: 'traitement de tous les porcs',
    action: 'create_traitement',
    params: {},
    confidence: 0.9,
  },

  // ========== MALADIE - Exemples réels enrichis ==========
  { text: 'un porc est malade', action: 'create_maladie', params: {}, confidence: 0.9 },
  { text: 'j ai un porc malade', action: 'create_maladie', params: {}, confidence: 0.9 },
  { text: 'maladie detectee', action: 'create_maladie', params: {}, confidence: 0.9 },
  { text: 'enregistrer maladie', action: 'create_maladie', params: {}, confidence: 0.9 },
  { text: 'noter maladie', action: 'create_maladie', params: {}, confidence: 0.9 },
  { text: 'declarer maladie', action: 'create_maladie', params: {}, confidence: 0.9 },
  {
    text: 'p001 est malade',
    action: 'create_maladie',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },
  {
    text: 'le porc p001 est malade',
    action: 'create_maladie',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },
  {
    text: 'maladie sur p001',
    action: 'create_maladie',
    params: { animal_code: 'P001' },
    confidence: 0.9,
  },
  { text: 'j ai detecte une maladie', action: 'create_maladie', params: {}, confidence: 0.9 },
  { text: 'maladie constatee', action: 'create_maladie', params: {}, confidence: 0.85 },
  { text: 'mes porcs sont malades', action: 'create_maladie', params: {}, confidence: 0.9 },

  // ========== QUESTIONS DE FORMATION / CONNAISSANCES (answer_knowledge_question) ==========
  // Types d'élevage
  { text: 'c est quoi un naisseur', action: 'answer_knowledge_question', params: { topic: 'types_elevage' }, confidence: 0.95 },
  { text: 'c est quoi un engraisseur', action: 'answer_knowledge_question', params: { topic: 'types_elevage' }, confidence: 0.95 },
  { text: 'difference entre naisseur et engraisseur', action: 'answer_knowledge_question', params: { topic: 'types_elevage' }, confidence: 0.95 },
  { text: 'les types d elevage', action: 'answer_knowledge_question', params: { topic: 'types_elevage' }, confidence: 0.95 },
  { text: 'quels sont les types d elevage porcin', action: 'answer_knowledge_question', params: { topic: 'types_elevage' }, confidence: 0.95 },
  { text: 'cycle complet c est quoi', action: 'answer_knowledge_question', params: { topic: 'types_elevage' }, confidence: 0.9 },
  { text: 'production de porcelets', action: 'answer_knowledge_question', params: { topic: 'types_elevage' }, confidence: 0.9 },

  // Objectifs et démarrage
  { text: 'comment demarrer un elevage', action: 'answer_knowledge_question', params: { topic: 'objectifs' }, confidence: 0.95 },
  { text: 'combien pour demarrer un elevage', action: 'answer_knowledge_question', params: { topic: 'objectifs' }, confidence: 0.95 },
  { text: 'quel capital pour un elevage', action: 'answer_knowledge_question', params: { topic: 'objectifs' }, confidence: 0.95 },
  { text: 'budget pour elevage porcin', action: 'answer_knowledge_question', params: { topic: 'objectifs' }, confidence: 0.95 },
  { text: 'quelle surface pour un elevage', action: 'answer_knowledge_question', params: { topic: 'objectifs' }, confidence: 0.9 },
  { text: 'comment definir son objectif', action: 'answer_knowledge_question', params: { topic: 'objectifs' }, confidence: 0.9 },
  { text: 'par ou commencer', action: 'answer_knowledge_question', params: { topic: 'objectifs' }, confidence: 0.9 },

  // Races
  { text: 'quelle race choisir', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.95 },
  { text: 'quelle race pour engraissement', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.95 },
  { text: 'quelle race pour la reproduction', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.95 },
  { text: 'c est quoi large white', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.95 },
  { text: 'c est quoi landrace', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.95 },
  { text: 'c est quoi duroc', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.95 },
  { text: 'c est quoi pietrain', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.95 },
  { text: 'les races de porcs', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.95 },
  { text: 'croisement de races', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.9 },
  { text: 'meilleure race de porc', action: 'answer_knowledge_question', params: { topic: 'races' }, confidence: 0.9 },

  // Emplacement
  { text: 'ou construire ma ferme', action: 'answer_knowledge_question', params: { topic: 'emplacement' }, confidence: 0.95 },
  { text: 'criteres pour emplacement', action: 'answer_knowledge_question', params: { topic: 'emplacement' }, confidence: 0.95 },
  { text: 'comment choisir le terrain', action: 'answer_knowledge_question', params: { topic: 'emplacement' }, confidence: 0.95 },
  { text: 'distance des habitations', action: 'answer_knowledge_question', params: { topic: 'emplacement' }, confidence: 0.9 },
  { text: 'quel terrain pour elevage', action: 'answer_knowledge_question', params: { topic: 'emplacement' }, confidence: 0.9 },

  // Eau
  { text: 'besoin en eau des porcs', action: 'answer_knowledge_question', params: { topic: 'eau' }, confidence: 0.95 },
  { text: 'combien d eau pour un porc', action: 'answer_knowledge_question', params: { topic: 'eau' }, confidence: 0.95 },
  { text: 'qualite de l eau', action: 'answer_knowledge_question', params: { topic: 'eau' }, confidence: 0.9 },
  { text: 'forage ou puits', action: 'answer_knowledge_question', params: { topic: 'eau' }, confidence: 0.9 },
  { text: 'systeme d eau pour porcherie', action: 'answer_knowledge_question', params: { topic: 'eau' }, confidence: 0.9 },

  // Alimentation
  { text: 'comment nourrir mes porcs', action: 'answer_knowledge_question', params: { topic: 'alimentation' }, confidence: 0.95 },
  { text: 'combien coute l alimentation', action: 'answer_knowledge_question', params: { topic: 'alimentation' }, confidence: 0.95 },
  { text: 'quel aliment pour porcs', action: 'answer_knowledge_question', params: { topic: 'alimentation' }, confidence: 0.95 },
  { text: 'aliment porcelet', action: 'answer_knowledge_question', params: { topic: 'alimentation' }, confidence: 0.9 },
  { text: 'aliment croissance', action: 'answer_knowledge_question', params: { topic: 'alimentation' }, confidence: 0.9 },
  { text: 'aliment finition', action: 'answer_knowledge_question', params: { topic: 'alimentation' }, confidence: 0.9 },
  { text: 'indice de consommation', action: 'answer_knowledge_question', params: { topic: 'alimentation' }, confidence: 0.9 },
  { text: 'fabriquer son propre aliment', action: 'answer_knowledge_question', params: { topic: 'alimentation' }, confidence: 0.9 },
  { text: 'reduire le cout de l alimentation', action: 'answer_knowledge_question', params: { topic: 'alimentation' }, confidence: 0.9 },

  // Santé et prophylaxie
  { text: 'comment vacciner mes porcs', action: 'answer_knowledge_question', params: { topic: 'sante' }, confidence: 0.95 },
  { text: 'calendrier de vaccination', action: 'answer_knowledge_question', params: { topic: 'sante' }, confidence: 0.95 },
  { text: 'quels vaccins pour les porcs', action: 'answer_knowledge_question', params: { topic: 'sante' }, confidence: 0.95 },
  { text: 'maladies des porcs', action: 'answer_knowledge_question', params: { topic: 'sante' }, confidence: 0.95 },
  { text: 'peste porcine africaine', action: 'answer_knowledge_question', params: { topic: 'sante' }, confidence: 0.95 },
  { text: 'prevention des maladies', action: 'answer_knowledge_question', params: { topic: 'sante' }, confidence: 0.9 },
  { text: 'biosecurite', action: 'answer_knowledge_question', params: { topic: 'sante' }, confidence: 0.9 },
  { text: 'parasitage des porcs', action: 'answer_knowledge_question', params: { topic: 'sante' }, confidence: 0.9 },
  { text: 'soins veterinaires', action: 'answer_knowledge_question', params: { topic: 'sante' }, confidence: 0.9 },

  // Finance
  { text: 'rentabilite elevage porcin', action: 'answer_knowledge_question', params: { topic: 'finance' }, confidence: 0.95 },
  { text: 'combien peut on gagner', action: 'answer_knowledge_question', params: { topic: 'finance' }, confidence: 0.95 },
  { text: 'marge par porc', action: 'answer_knowledge_question', params: { topic: 'finance' }, confidence: 0.95 },
  { text: 'cout d un porc', action: 'answer_knowledge_question', params: { topic: 'finance' }, confidence: 0.95 },
  { text: 'investissement initial', action: 'answer_knowledge_question', params: { topic: 'finance' }, confidence: 0.95 },
  { text: 'seuil de rentabilite', action: 'answer_knowledge_question', params: { topic: 'finance' }, confidence: 0.9 },
  { text: 'retour sur investissement', action: 'answer_knowledge_question', params: { topic: 'finance' }, confidence: 0.9 },
  { text: 'fonds de roulement', action: 'answer_knowledge_question', params: { topic: 'finance' }, confidence: 0.9 },

  // Commerce
  { text: 'comment vendre mes porcs', action: 'answer_knowledge_question', params: { topic: 'commerce' }, confidence: 0.95 },
  { text: 'ou vendre mes porcs', action: 'answer_knowledge_question', params: { topic: 'commerce' }, confidence: 0.95 },
  { text: 'prix de vente des porcs', action: 'answer_knowledge_question', params: { topic: 'commerce' }, confidence: 0.95 },
  { text: 'canaux de commercialisation', action: 'answer_knowledge_question', params: { topic: 'commerce' }, confidence: 0.9 },
  { text: 'trouver des clients', action: 'answer_knowledge_question', params: { topic: 'commerce' }, confidence: 0.9 },
  { text: 'poids optimal de vente', action: 'answer_knowledge_question', params: { topic: 'commerce' }, confidence: 0.9 },
  { text: 'meilleure periode pour vendre', action: 'answer_knowledge_question', params: { topic: 'commerce' }, confidence: 0.9 },

  // Réglementation
  { text: 'reglementation elevage porcin', action: 'answer_knowledge_question', params: { topic: 'reglementation' }, confidence: 0.95 },
  { text: 'obligations legales', action: 'answer_knowledge_question', params: { topic: 'reglementation' }, confidence: 0.95 },
  { text: 'declaration d elevage', action: 'answer_knowledge_question', params: { topic: 'reglementation' }, confidence: 0.9 },
  { text: 'normes sanitaires', action: 'answer_knowledge_question', params: { topic: 'reglementation' }, confidence: 0.9 },
  { text: 'bien etre animal', action: 'answer_knowledge_question', params: { topic: 'reglementation' }, confidence: 0.9 },
  { text: 'fiscalite elevage', action: 'answer_knowledge_question', params: { topic: 'reglementation' }, confidence: 0.9 },

  // Questions générales sur la formation
  { text: 'apprends moi l elevage', action: 'answer_knowledge_question', params: {}, confidence: 0.9 },
  { text: 'je veux apprendre', action: 'answer_knowledge_question', params: {}, confidence: 0.85 },
  { text: 'formation elevage porcin', action: 'answer_knowledge_question', params: {}, confidence: 0.9 },
  { text: 'conseils pour elevage', action: 'answer_knowledge_question', params: {}, confidence: 0.9 },
  { text: 'explique moi', action: 'answer_knowledge_question', params: {}, confidence: 0.85 },
  { text: 'aide moi a comprendre', action: 'answer_knowledge_question', params: {}, confidence: 0.85 },
  { text: 'les themes de formation', action: 'list_knowledge_topics', params: {}, confidence: 0.95 },
  { text: 'quels sujets tu connais', action: 'list_knowledge_topics', params: {}, confidence: 0.9 },

  // ========== MARKETPLACE - PRIX ET TENDANCES (marketplace_get_price_trends) ==========
  { text: 'prix du marche', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'prix du marché', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'quel est le prix du marche', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'quel est le prix du porc', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'prix du porc actuellement', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'prix porc actuel', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'tendance des prix', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'tendance du prix', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'prix actuel du porc', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'a combien vendre', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'a combien vendre mes porcs', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'quel prix pour mes porcs', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'combien se vend le porc', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'combien coute un porc', action: 'marketplace_get_price_trends', params: {}, confidence: 0.90 },
  { text: 'prix moyen du porc', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'prix au kg', action: 'marketplace_get_price_trends', params: {}, confidence: 0.90 },
  { text: 'prix par kilo', action: 'marketplace_get_price_trends', params: {}, confidence: 0.90 },
  { text: 'evolution des prix', action: 'marketplace_get_price_trends', params: {}, confidence: 0.95 },
  { text: 'cours du porc', action: 'marketplace_get_price_trends', params: {}, confidence: 0.90 },

  // ========== MARKETPLACE - VENTE (marketplace_sell_animal) ==========
  { text: 'vendre un porc', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'vendre le porc', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'vendre mon porc', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'vendre mes porcs', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'mettre en vente', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'mets en vente', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'mise en vente', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'publier une annonce', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'vendre sur le marketplace', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'proposer a la vente', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'je veux vendre', action: 'marketplace_sell_animal', params: {}, confidence: 0.90 },
  { text: 'je veux vendre un porc', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'vendre un sujet', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },
  { text: 'vendre ce sujet', action: 'marketplace_sell_animal', params: {}, confidence: 0.95 },

  // ========== MARKETPLACE - OFFRES (marketplace_check_offers) ==========
  { text: 'mes offres', action: 'marketplace_check_offers', params: {}, confidence: 0.95 },
  { text: 'voir les offres', action: 'marketplace_check_offers', params: {}, confidence: 0.95 },
  { text: 'offres recues', action: 'marketplace_check_offers', params: {}, confidence: 0.95 },
  { text: 'quelles offres', action: 'marketplace_check_offers', params: {}, confidence: 0.95 },
  { text: 'propositions recues', action: 'marketplace_check_offers', params: {}, confidence: 0.90 },
  { text: 'quelqu un veut acheter', action: 'marketplace_check_offers', params: {}, confidence: 0.90 },

  // ========== MARKETPLACE - MES ANNONCES (marketplace_get_my_listings) ==========
  { text: 'mes annonces', action: 'marketplace_get_my_listings', params: {}, confidence: 0.95 },
  { text: 'mes ventes en cours', action: 'marketplace_get_my_listings', params: {}, confidence: 0.95 },
  { text: 'voir mes annonces', action: 'marketplace_get_my_listings', params: {}, confidence: 0.95 },
  { text: 'mes porcs en vente', action: 'marketplace_get_my_listings', params: {}, confidence: 0.95 },
  { text: 'qu est ce que je vends', action: 'marketplace_get_my_listings', params: {}, confidence: 0.90 },

  // ========== RAPPELS - VACCINS EN RETARD (get_reminders) ==========
  { text: 'vaccins en retard', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'quels vaccins en retard', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'quels sont les vaccins en retard', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'vaccinations en retard', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'rappels de vaccin', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'vaccins a faire', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'vaccins prevus', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'prochains vaccins', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'traitements en retard', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'quels traitements en retard', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'pesees en retard', action: 'get_reminders', params: {}, confidence: 0.95 },
  { text: 'alertes sante', action: 'get_reminders', params: {}, confidence: 0.95 },
];

/**
 * Base de connaissances générée automatiquement (5000+ exemples)
 * Fusionnée avec INTENT_KNOWLEDGE_BASE pour une meilleure performance
 */
import { INTENT_KNOWLEDGE_BASE_GENERATED } from './INTENT_KNOWLEDGE_BASE_GENERATED';

/**
 * Base de connaissances locale (500 exemples spécifiques ivoirien/élevage porcin)
 * Ajoutée pour améliorer la détection d'intentions dans le contexte local
 */
import { INTENT_KNOWLEDGE_BASE_LOCAL } from './INTENT_KNOWLEDGE_BASE_LOCAL';

/**
 * Base de connaissances complète fusionnée
 * Combine les exemples manuels (440+), générés (5000+) et locaux (500) pour un total de ~6000+ exemples
 */
export const INTENT_KNOWLEDGE_BASE_COMPLETE: TrainingExample[] = [
  ...INTENT_KNOWLEDGE_BASE,
  ...INTENT_KNOWLEDGE_BASE_GENERATED,
  ...INTENT_KNOWLEDGE_BASE_LOCAL,
];

/**
 * Calcule la similarité entre deux textes (simple, basé sur les mots communs)
 * Utilise la normalisation pour ignorer les valeurs variables (prix, poids, quantités)
 * TODO: Remplacer par des embeddings réels (sentence-transformers) - déjà fait avec OpenAI
 */
function calculateSimilarity(text1: string, text2: string): number {
  // Normaliser les deux textes pour ignorer les valeurs variables
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);

  const words1 = new Set(normalized1.split(/\s+/).filter((w) => w.length > 0));
  const words2 = new Set(normalized2.split(/\s+/).filter((w) => w.length > 0));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  // Jaccard similarity
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Normalise un texte pour la comparaison
 * Remplace les valeurs numériques par des placeholders pour rendre la détection robuste
 * aux variations de prix, poids, quantités, etc.
 */
function normalizeText(text: string): string {
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
    .replace(/[^\w\s]/g, ' ') // Remplacer caractères spéciaux
    .replace(/\s+/g, ' ') // Normaliser espaces
    .trim();

  // Remplacer les nombres par des placeholders pour rendre la détection robuste
  // Format: "j'ai vendu 5 porcs à 800000" → "j'ai vendu [NOMBRE] porcs à [MONTANT]"

  // Remplacer les montants (nombres de 3+ chiffres, souvent suivis de fcfa/francs ou après "à"/"pour")
  normalized = normalized.replace(/\b\d[\d\s,]{2,}\s*(?:fcfa|francs?|f\s*)?\b/g, '[MONTANT]');
  normalized = normalized.replace(
    /(?:a|pour|de|montant|prix|cout|vendu|achete|depense|paye)\s+\d[\d\s,]{2,}/g,
    (match) => {
      return match.replace(/\d[\d\s,]+/g, '[MONTANT]');
    }
  );

  // Remplacer les poids (nombres suivis de kg/kilo/kilogramme)
  normalized = normalized.replace(/\d+[.,]?\d*\s*(?:kg|kilogramme|kilo)\b/g, '[POIDS]');
  normalized = normalized.replace(/(?:pese|poids|fait|il fait|il pese)\s+\d+[.,]?\d*/g, (match) => {
    return match.replace(/\d+[.,]?\d*/g, '[POIDS]');
  });

  // Remplacer les quantités (nombres suivis de porc/porcs/tête/têtes/sac/sacs)
  normalized = normalized.replace(
    /\d+\s*(?:porc|porcs|tete|tetes|sujet|sujets|animal|animaux|sac|sacs)\b/g,
    '[QUANTITE]'
  );
  normalized = normalized.replace(/(?:nombre|quantite|qte)\s+\d+/g, (match) => {
    return match.replace(/\d+/g, '[QUANTITE]');
  });

  // Remplacer les codes d'animaux (P001, PORC001, etc.) par placeholder
  normalized = normalized.replace(/\b(?:porc|animal|code)\s*[a-z0-9]{3,}\b/gi, '[CODE_ANIMAL]');
  normalized = normalized.replace(/\b(?:p|porc)[0-9]{1,}\b/gi, '[CODE_ANIMAL]');

  // Remplacer les noms propres (acheteurs, etc.) - garder seulement la structure
  // "à kouamé" → "à [NOM]"
  normalized = normalized.replace(
    /(?:a|pour|chez|acheteur|client|vendu a|vendu pour)\s+[a-zà-ÿ]{2,}/gi,
    (match) => {
      return match.replace(/[a-zà-ÿ]{2,}/gi, '[NOM]');
    }
  );

  // Remplacer les dates (garder seulement les mots-clés de date)
  normalized = normalized.replace(/\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?/g, '[DATE]');
  normalized = normalized.replace(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/g, '[DATE]');

  // Nettoyer les espaces multiples après remplacements
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Système RAG pour la détection d'intention
 * Mode hybride : OpenAI embeddings (si configuré) + Jaccard (fallback)
 * Version 3.0 - Optimisé avec index inversé et cache
 */
export class IntentRAG {
  private knowledgeBase: TrainingExample[];
  // OpenAI service removed - using Jaccard fallback only
  private useOpenAI: boolean = false;
  private embeddingsCache: Map<string, number[]> = new Map();

  // Cache pour normalisations (optimisation v3.0)
  private normalizedTextCache: Map<string, string> = new Map();
  
  // Index inversé pour recherche rapide (optimisation v3.0)
  private invertedIndex: Map<string, Set<number>> = new Map();
  private exampleNormalizedTexts: Map<number, string> = new Map();

  constructor(
    knowledgeBase: TrainingExample[] = INTENT_KNOWLEDGE_BASE_COMPLETE,
    // OpenAI service parameter removed - using Jaccard fallback only
    _unused?: any
  ) {
    // Utiliser la base complète par défaut (440+ manuels + 5000+ générés = ~5500+ exemples)
    this.knowledgeBase = knowledgeBase;
    // OpenAI embeddings no longer supported - using Jaccard similarity only
    this.useOpenAI = false;

    // Construire l'index inversé et précalculer les normalisations (optimisation v3.0)
    this.buildInvertedIndex();

    // Log pour monitoring (en développement)
    logger.debug(
      `IntentRAG initialisé avec ${this.knowledgeBase.length} exemples d'entraînement (index inversé: ${this.invertedIndex.size} mots-clés)`
    );
  }

  /**
   * Recherche l'intention la plus similaire
   * Utilise OpenAI embeddings si disponible, sinon Jaccard
   */
  async detectIntent(message: string): Promise<DetectedIntent | null> {
    // OpenAI embeddings no longer supported - using Jaccard only
    return this.detectIntentWithJaccard(message);
  }

  /**
   * Détection d'intention avec OpenAI embeddings (désactivé - utilise Jaccard)
   * OpenAI embeddings no longer supported - using Jaccard fallback
   */
  private async detectIntentWithOpenAI(message: string): Promise<DetectedIntent | null> {
    // OpenAI embeddings no longer supported - using Jaccard fallback
    return this.detectIntentWithJaccard(message);
  }

  /**
   * Détection d'intention avec Jaccard (fallback) - Version optimisée v3.0
   * Utilise l'index inversé pour limiter la recherche aux top 100 candidats
   */
  private detectIntentWithJaccard(message: string): DetectedIntent | null {
    const normalized = this.getNormalizedText(message);

    // Étape 1 : Utiliser l'index inversé pour trouver les candidats pertinents
    const candidateIndices = this.findCandidateIndices(normalized);
    
    // Étape 2 : Limiter à top 100 candidats avant calcul Jaccard complet
    const topCandidates = candidateIndices.slice(0, 100);

    // Étape 3 : Calculer la similarité seulement pour les candidats sélectionnés
    const similarities = topCandidates.map((index) => {
      const example = this.knowledgeBase[index];
      const exampleNormalized = this.exampleNormalizedTexts.get(index) || this.getNormalizedText(example.text);
      return {
        example,
        similarity: calculateSimilarity(normalized, exampleNormalized),
      };
    });

    // Trier par similarité décroissante
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Prendre le meilleur match si similarité > seuil
    const bestMatch = similarities[0];
    const threshold = 0.6; // Seuil de similarité minimum

    if (bestMatch && bestMatch.similarity >= threshold) {
      // Ajuster la confiance selon la similarité
      const baseConfidence = bestMatch.example.confidence;
      const similarityBoost = (bestMatch.similarity - threshold) / (1 - threshold); // 0 à 1
      const finalConfidence = Math.min(0.95, baseConfidence * (0.7 + 0.3 * similarityBoost));

      return {
        action: bestMatch.example.action,
        confidence: finalConfidence,
        params: { ...bestMatch.example.params },
      };
    }

    return null;
  }

  /**
   * Recherche les N meilleures correspondances
   */
  async findTopMatches(
    message: string,
    topN: number = 3
  ): Promise<Array<{ example: TrainingExample; similarity: number }>> {
    // OpenAI embeddings no longer supported - using Jaccard only
    return this.findTopMatchesWithJaccard(message, topN);
  }

  /**
   * Recherche avec OpenAI embeddings
   */
  private async findTopMatchesWithOpenAI(
    message: string,
    topN: number
  ): Promise<Array<{ example: TrainingExample; similarity: number }>> {
    if (!this.openAIService) {
      return this.findTopMatchesWithJaccard(message, topN);
    }

    try {
      const messageEmbedding = await this.openAIService.getEmbedding(message);
      const exampleTexts = this.knowledgeBase.map((e) => e.text);
      const exampleEmbeddings = await this.openAIService.getEmbeddings(exampleTexts);

      const similarities = this.knowledgeBase.map((example, index) => ({
        example,
        similarity: this.openAIService!.cosineSimilarity(
          messageEmbedding,
          exampleEmbeddings[index]
        ),
      }));

      similarities.sort((a, b) => b.similarity - a.similarity);
      return similarities.slice(0, topN);
    } catch (error) {
      logger.warn('[IntentRAG] Erreur avec OpenAI, fallback sur Jaccard:', error);
      return this.findTopMatchesWithJaccard(message, topN);
    }
  }

  /**
   * Recherche avec Jaccard - Version optimisée v3.0
   */
  private findTopMatchesWithJaccard(
    message: string,
    topN: number
  ): Array<{ example: TrainingExample; similarity: number }> {
    const normalized = this.getNormalizedText(message);

    // Utiliser l'index inversé pour trouver les candidats pertinents
    const candidateIndices = this.findCandidateIndices(normalized);
    const topCandidates = candidateIndices.slice(0, 100);

    const similarities = topCandidates.map((index) => {
      const example = this.knowledgeBase[index];
      const exampleNormalized = this.exampleNormalizedTexts.get(index) || this.getNormalizedText(example.text);
      return {
        example,
        similarity: calculateSimilarity(normalized, exampleNormalized),
      };
    });

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topN);
  }

  /**
   * Ajoute un nouvel exemple à la base de connaissances
   * Met à jour l'index inversé automatiquement
   */
  addExample(example: TrainingExample): void {
    const index = this.knowledgeBase.length;
    this.knowledgeBase.push(example);

    // Mettre à jour l'index inversé
    const normalized = normalizeText(example.text);
    this.exampleNormalizedTexts.set(index, normalized);

    const words = normalized
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !w.startsWith('[') && !w.endsWith(']'));

    words.forEach((word) => {
      if (!this.invertedIndex.has(word)) {
        this.invertedIndex.set(word, new Set());
      }
      this.invertedIndex.get(word)!.add(index);
    });
  }

  /**
   * Enrichit la base de connaissances avec des variantes
   */
  enrichWithVariants(): void {
    const newExamples: TrainingExample[] = [];

    for (const example of this.knowledgeBase) {
      if (example.variants) {
        for (const variant of example.variants) {
          newExamples.push({
            text: variant,
            action: example.action,
            params: example.params,
            confidence: example.confidence * 0.9, // Légèrement moins de confiance pour les variantes
          });
        }
      }
    }

    this.knowledgeBase.push(...newExamples);
  }

  /**
   * Récupère la base de connaissances
   */
  getKnowledgeBase(): TrainingExample[] {
    return [...this.knowledgeBase];
  }

  /**
   * Configure le service OpenAI (désactivé - OpenAI no longer supported)
   */
  setOpenAIService(_service: any): void {
    // OpenAI embeddings no longer supported - using Jaccard fallback only
    this.useOpenAI = false;
  }

  /**
   * Vérifie si OpenAI est utilisé (toujours false - OpenAI no longer supported)
   */
  isUsingOpenAI(): boolean {
    return false; // OpenAI embeddings no longer supported
  }

  // ============================================
  // OPTIMISATIONS V3.0 - Index inversé et cache
  // ============================================

  /**
   * Construit l'index inversé pour recherche rapide
   * Mots-clés fréquents → indices des exemples qui les contiennent
   */
  private buildInvertedIndex(): void {
    this.invertedIndex.clear();
    this.exampleNormalizedTexts.clear();

    this.knowledgeBase.forEach((example, index) => {
      const normalized = normalizeText(example.text);
      this.exampleNormalizedTexts.set(index, normalized);

      // Extraire les mots significatifs (longueur >= 3, pas de placeholders)
      const words = normalized
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !w.startsWith('[') && !w.endsWith(']'));

      words.forEach((word) => {
        if (!this.invertedIndex.has(word)) {
          this.invertedIndex.set(word, new Set());
        }
        this.invertedIndex.get(word)!.add(index);
      });
    });

    // Filtrer les mots trop fréquents (stop words) - apparaissent dans >30% des exemples
    const stopWordThreshold = Math.floor(this.knowledgeBase.length * 0.3);
    for (const [word, indices] of this.invertedIndex.entries()) {
      if (indices.size > stopWordThreshold) {
        this.invertedIndex.delete(word);
      }
    }
  }

  /**
   * Trouve les indices des exemples candidats en utilisant l'index inversé
   * Retourne les indices triés par score de pertinence (nombre de mots en commun)
   */
  private findCandidateIndices(normalizedMessage: string): number[] {
    const messageWords = normalizedMessage
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !w.startsWith('[') && !w.endsWith(']'));

    // Compter les occurrences de chaque exemple (nombre de mots en commun)
    const candidateScores = new Map<number, number>();

    messageWords.forEach((word) => {
      const exampleIndices = this.invertedIndex.get(word);
      if (exampleIndices) {
        exampleIndices.forEach((index) => {
          candidateScores.set(index, (candidateScores.get(index) || 0) + 1);
        });
      }
    });

    // Si aucun candidat trouvé via index, retourner tous les indices (fallback)
    if (candidateScores.size === 0) {
      return this.knowledgeBase.map((_, index) => index);
    }

    // Trier par score décroissant
    return Array.from(candidateScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([index]) => index);
  }

  /**
   * Récupère le texte normalisé avec cache
   */
  private getNormalizedText(text: string): string {
    if (this.normalizedTextCache.has(text)) {
      return this.normalizedTextCache.get(text)!;
    }

    const normalized = normalizeText(text);
    this.normalizedTextCache.set(text, normalized);
    return normalized;
  }

  /**
   * Réinitialise les caches (utile pour tests ou si la base change)
   */
  clearCache(): void {
    this.normalizedTextCache.clear();
    this.buildInvertedIndex();
  }
}
