/**
 * Exemples few-shot pour optimisation des prompts OpenAI
 * 10 exemples par intent clé pour améliorer la précision de classification
 */

import { AgentActionType } from '../../../types/chatAgent';

export interface FewShotExample {
  message: string;
  action: AgentActionType;
  confidence: number;
  explanation?: string;
}

/**
 * Exemples few-shot par intent clé
 * 10 exemples pour chaque intent principal
 */
export const FEW_SHOT_EXAMPLES: Record<AgentActionType, FewShotExample[]> = {
  // ========== CREATE_REVENU (10 exemples) ==========
  create_revenu: [
    { message: "j'ai vendu 5 porcs à 800000", action: 'create_revenu', confidence: 0.98, explanation: "Verbe 'vendu' + quantité + montant" },
    { message: "vente de 3 cochons à 500000 fcfa", action: 'create_revenu', confidence: 0.98, explanation: "Mot-clé 'vente' + quantité + montant" },
    { message: "j'ai vendu P001 à 150000", action: 'create_revenu', confidence: 0.97, explanation: "Verbe 'vendu' + code animal + montant" },
    { message: "vendu 10 têtes à 1 million", action: 'create_revenu', confidence: 0.98, explanation: "Verbe 'vendu' + quantité + montant (variation)" },
    { message: "j'ai vendu 2 porcs à Kouamé pour 400000", action: 'create_revenu', confidence: 0.99, explanation: "Verbe 'vendu' + quantité + acheteur + montant" },
    { message: "vente de 5 bêtes aujourd'hui", action: 'create_revenu', confidence: 0.95, explanation: "Mot-clé 'vente' + quantité + date" },
    { message: "j'ai vendu un porc à 200000", action: 'create_revenu', confidence: 0.98, explanation: "Verbe 'vendu' + singulier + montant" },
    { message: "vendu 8 cochons hier à 1.2 million", action: 'create_revenu', confidence: 0.98, explanation: "Verbe 'vendu' + quantité + date + montant" },
    { message: "j'ai vendu P002 à Marie pour 180000 le 25/12", action: 'create_revenu', confidence: 0.99, explanation: "Verbe 'vendu' + code + acheteur + montant + date" },
    { message: "vente de 15 porcs à 2.5 millions", action: 'create_revenu', confidence: 0.98, explanation: "Mot-clé 'vente' + grande quantité + montant" },
  ],

  // ========== CREATE_DEPENSE (10 exemples) ==========
  create_depense: [
    { message: "j'ai dépensé 50000", action: 'create_depense', confidence: 0.98, explanation: "Verbe 'dépensé' + montant" },
    { message: "dépense de 100000 pour la provende", action: 'create_depense', confidence: 0.99, explanation: "Mot-clé 'dépense' + montant + catégorie" },
    { message: "j'ai acheté 3 sacs de provende à 75000", action: 'create_depense', confidence: 0.99, explanation: "Verbe 'acheté' + quantité + catégorie + montant" },
    { message: "j'ai payé le vétérinaire 50000", action: 'create_depense', confidence: 0.98, explanation: "Verbe 'payé' + catégorie + montant" },
    { message: "dépense de 25000 pour les médicaments", action: 'create_depense', confidence: 0.99, explanation: "Mot-clé 'dépense' + montant + catégorie" },
    { message: "j'ai claqué 80000 aujourd'hui", action: 'create_depense', confidence: 0.97, explanation: "Verbe local 'claqué' + montant + date" },
    { message: "achat de nourriture à 60000", action: 'create_depense', confidence: 0.98, explanation: "Mot-clé 'achat' + catégorie + montant" },
    { message: "j'ai dépensé 120000 pour l'aliment hier", action: 'create_depense', confidence: 0.99, explanation: "Verbe 'dépensé' + montant + catégorie + date" },
    { message: "paiement de 40000 pour le veto", action: 'create_depense', confidence: 0.98, explanation: "Mot-clé 'paiement' + montant + catégorie (abréviation)" },
    { message: "j'ai acheté 5 sacs à 90000 le 20/12", action: 'create_depense', confidence: 0.99, explanation: "Verbe 'acheté' + quantité + montant + date" },
  ],

  // ========== CREATE_PESEE (10 exemples) ==========
  create_pesee: [
    { message: "peser P001 il fait 45 kg", action: 'create_pesee', confidence: 0.99, explanation: "Verbe 'peser' + code + poids" },
    { message: "pesée de P002 à 50 kilogrammes", action: 'create_pesee', confidence: 0.99, explanation: "Mot-clé 'pesée' + code + poids (variation)" },
    { message: "P003 fait 38 kilos", action: 'create_pesee', confidence: 0.98, explanation: "Code + verbe 'fait' + poids (variation)" },
    { message: "il fait 42 kg", action: 'create_pesee', confidence: 0.96, explanation: "Pronom + verbe 'fait' + poids (anaphore)" },
    { message: "peser P004 il pèse 55 kg", action: 'create_pesee', confidence: 0.99, explanation: "Verbe 'peser' + code + verbe 'pèse' + poids" },
    { message: "pesée de P005 aujourd'hui", action: 'create_pesee', confidence: 0.92, explanation: "Mot-clé 'pesée' + code + date (poids manquant)" },
    { message: "P006 fait 48.5 kilogrammes", action: 'create_pesee', confidence: 0.99, explanation: "Code + verbe 'fait' + poids décimal" },
    { message: "elle fait 40 kg", action: 'create_pesee', confidence: 0.96, explanation: "Pronom féminin + verbe 'fait' + poids" },
    { message: "peser P007 il fait 52 kg le 25/12", action: 'create_pesee', confidence: 0.99, explanation: "Verbe 'peser' + code + poids + date" },
    { message: "pesée de P008 à 44 kilos ce matin", action: 'create_pesee', confidence: 0.98, explanation: "Mot-clé 'pesée' + code + poids + date" },
  ],

  // ========== GET_STATISTICS (10 exemples) ==========
  get_statistics: [
    { message: "combien de porcs j'ai", action: 'get_statistics', confidence: 0.95, explanation: "Question 'combien' + objet" },
    { message: "statistiques", action: 'get_statistics', confidence: 0.95, explanation: "Mot-clé direct" },
    { message: "nombre de porcs", action: 'get_statistics', confidence: 0.95, explanation: "Question 'nombre' + objet" },
    { message: "mon cheptel", action: 'get_statistics', confidence: 0.9, explanation: "Possessif + objet" },
    { message: "bilan de mon élevage", action: 'get_statistics', confidence: 0.95, explanation: "Mot-clé 'bilan' + possessif + objet" },
    { message: "combien j'ai de cochons", action: 'get_statistics', confidence: 0.95, explanation: "Question 'combien' + verbe + objet (variation)" },
    { message: "état du cheptel", action: 'get_statistics', confidence: 0.9, explanation: "Mot-clé 'état' + objet" },
    { message: "mes animaux", action: 'get_statistics', confidence: 0.9, explanation: "Possessif + objet générique" },
    { message: "situation de mon élevage", action: 'get_statistics', confidence: 0.95, explanation: "Mot-clé 'situation' + possessif + objet" },
    { message: "effectif total", action: 'get_statistics', confidence: 0.95, explanation: "Mot-clé 'effectif' + qualificatif" },
  ],

  // ========== GET_STOCK_STATUS (10 exemples) ==========
  get_stock_status: [
    { message: "combien de provende j'ai", action: 'get_stock_status', confidence: 0.95, explanation: "Question 'combien' + objet stock" },
    { message: "stock de provende", action: 'get_stock_status', confidence: 0.95, explanation: "Mot-clé 'stock' + objet" },
    { message: "mes stocks", action: 'get_stock_status', confidence: 0.95, explanation: "Possessif + mot-clé" },
    { message: "combien de nourriture il me reste", action: 'get_stock_status', confidence: 0.95, explanation: "Question 'combien' + objet + verbe 'reste'" },
    { message: "état de mes stocks", action: 'get_stock_status', confidence: 0.95, explanation: "Mot-clé 'état' + possessif + objet" },
    { message: "provende restante", action: 'get_stock_status', confidence: 0.95, explanation: "Objet + qualificatif" },
    { message: "combien d'aliment j'ai", action: 'get_stock_status', confidence: 0.95, explanation: "Question 'combien' + objet (variation)" },
    { message: "stock de nourriture", action: 'get_stock_status', confidence: 0.95, explanation: "Mot-clé 'stock' + objet (variation)" },
    { message: "il me reste combien de provende", action: 'get_stock_status', confidence: 0.95, explanation: "Verbe 'reste' + question + objet" },
    { message: "nombre de sacs de provende", action: 'get_stock_status', confidence: 0.95, explanation: "Question 'nombre' + unité + objet" },
  ],

  // ========== CALCULATE_COSTS (10 exemples) ==========
  calculate_costs: [
    { message: "mes dépenses", action: 'calculate_costs', confidence: 0.95, explanation: "Possessif + mot-clé (info, pas création)" },
    { message: "combien j'ai dépensé", action: 'calculate_costs', confidence: 0.95, explanation: "Question 'combien' + verbe passé (info)" },
    { message: "mes dépenses ce mois", action: 'calculate_costs', confidence: 0.95, explanation: "Possessif + mot-clé + période (info)" },
    { message: "total de mes dépenses", action: 'calculate_costs', confidence: 0.95, explanation: "Mot-clé 'total' + possessif + objet (info)" },
    { message: "mes coûts", action: 'calculate_costs', confidence: 0.95, explanation: "Possessif + mot-clé (variation)" },
    { message: "bilan financier", action: 'calculate_costs', confidence: 0.9, explanation: "Mot-clé 'bilan' + qualificatif" },
    { message: "combien j'ai dépensé cette semaine", action: 'calculate_costs', confidence: 0.95, explanation: "Question + verbe + période (info)" },
    { message: "mes dépenses totales", action: 'calculate_costs', confidence: 0.95, explanation: "Possessif + mot-clé + qualificatif (info)" },
    { message: "somme de mes dépenses", action: 'calculate_costs', confidence: 0.95, explanation: "Mot-clé 'somme' + possessif + objet (info)" },
    { message: "résumé financier", action: 'calculate_costs', confidence: 0.9, explanation: "Mot-clé 'résumé' + qualificatif" },
  ],

  // ========== CREATE_VACCINATION (10 exemples) ==========
  create_vaccination: [
    { message: "j'ai vacciné P001", action: 'create_vaccination', confidence: 0.97, explanation: "Verbe 'vacciné' + code" },
    { message: "vaccination de P002", action: 'create_vaccination', confidence: 0.97, explanation: "Mot-clé 'vaccination' + code" },
    { message: "j'ai vacciné 5 porcs", action: 'create_vaccination', confidence: 0.95, explanation: "Verbe 'vacciné' + quantité" },
    { message: "vaccination de 10 cochons", action: 'create_vaccination', confidence: 0.95, explanation: "Mot-clé 'vaccination' + quantité (variation)" },
    { message: "j'ai vacciné P003 aujourd'hui", action: 'create_vaccination', confidence: 0.96, explanation: "Verbe 'vacciné' + code + date" },
    { message: "vaccination de P004 le 25/12", action: 'create_vaccination', confidence: 0.96, explanation: "Mot-clé 'vaccination' + code + date" },
    { message: "vacciner P005", action: 'create_vaccination', confidence: 0.95, explanation: "Verbe infinitif + code" },
    { message: "j'ai vacciné 8 têtes", action: 'create_vaccination', confidence: 0.95, explanation: "Verbe 'vacciné' + quantité (variation)" },
    { message: "vaccination de 12 bêtes hier", action: 'create_vaccination', confidence: 0.96, explanation: "Mot-clé 'vaccination' + quantité + date" },
    { message: "j'ai vacciné P006 ce matin", action: 'create_vaccination', confidence: 0.96, explanation: "Verbe 'vacciné' + code + date (variation)" },
  ],

  // Autres actions (exemples minimaux pour compléter le type)
  answer_knowledge_question: [],
  list_knowledge_topics: [],
  get_reminders: [],
  schedule_reminder: [],
  analyze_data: [],
  create_maladie: [],
  create_traitement: [],
  create_visite_veterinaire: [],
  get_gestations: [],
  get_gestation_by_truie: [],
  predict_mise_bas: [],
  get_porcelets: [],
  get_porcelets_transition: [],
  get_mortalites: [],
  get_taux_mortalite: [],
  analyze_causes_mortalite: [],
  get_ventes: [],
  analyze_ventes: [],
  get_stock_aliments: [],
  calculate_consommation_moyenne: [],
  propose_composition_alimentaire: [],
  generate_graph_finances: [],
  describe_graph_trends: [],
};

/**
 * Génère le prompt few-shot pour un intent donné
 */
export function generateFewShotPrompt(intent: AgentActionType): string {
  const examples = FEW_SHOT_EXAMPLES[intent] || [];
  
  if (examples.length === 0) {
    return '';
  }

  const examplesText = examples
    .slice(0, 10) // Maximum 10 exemples
    .map((ex, index) => {
      return `Exemple ${index + 1}:
Message: "${ex.message}"
Action: ${ex.action}
Confiance: ${ex.confidence}
Explication: ${ex.explanation || 'N/A'}`;
    })
    .join('\n\n');

  return `\n\nEXEMPLES FEW-SHOT POUR ${intent.toUpperCase()}:\n${examplesText}\n`;
}

/**
 * Génère le prompt few-shot pour plusieurs intents
 */
export function generateFewShotPromptForIntents(intents: AgentActionType[]): string {
  let prompt = '';
  
  for (const intent of intents) {
    const examples = FEW_SHOT_EXAMPLES[intent] || [];
    if (examples.length > 0) {
      prompt += generateFewShotPrompt(intent);
    }
  }
  
  return prompt;
}

