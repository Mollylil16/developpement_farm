/**
 * Prompt système optimisé pour l'agent conversationnel Kouakou
 * Version structurée et concise (réduction de 70% vs version précédente)
 */

import { AgentContext } from '../../../types/chatAgent';
import { TRAINING_KNOWLEDGE_BASE } from '../knowledge/TrainingKnowledgeBase';

/**
 * Schéma JSON des actions disponibles
 */
export const ACTIONS_SCHEMA = {
  // QUESTIONS DE FORMATION/CONNAISSANCES (réponse basée sur la base de connaissances)
  answer_knowledge_question: {
    description: "Répondre à une question sur l'élevage porcin (types d'élevage, races, alimentation, santé, etc.)",
    params: {
      topic: 'string (catégorie de la question)',
      question: 'string (question posée)'
    },
    keywords: [
      'comment', 'pourquoi', "qu'est-ce", 'c\'est quoi', 'explique',
      'quel', 'quelle', 'différence', 'avantages', 'inconvénients',
      'conseil', 'recommandation', 'race', 'alimentation', 'vaccination',
      'rentabilité', 'investissement', 'démarrer élevage', 'coût',
      'maladie', 'santé', 'prophylaxie', 'commercialisation', 'vendre'
    ],
    requiresConfirmation: false
  },

  // REQUÊTES D'INFORMATION (exécution immédiate, pas de confirmation)
  get_statistics: {
    description: "Statistiques du cheptel (nombre d'animaux actifs, répartition, etc.)",
    params: {},
    keywords: [
      'statistique',
      'bilan',
      'combien de porc',
      'nombre de porc',
      'cheptel',
      'mes animaux',
    ],
  },
  get_stock_status: {
    description: "État des stocks d'alimentation",
    params: {},
    keywords: ['stock', 'nourriture', 'aliment', 'provende', 'quantité restante'],
  },
  calculate_costs: {
    description: 'Calcul des coûts et dépenses',
    params: { date_debut: 'optionnel', date_fin: 'optionnel' },
    keywords: ['coût', 'dépense totale', 'mes dépenses', 'calculer', 'budget'],
  },
  get_reminders: {
    description: 'Rappels et tâches à venir',
    params: {},
    keywords: ['rappel', 'à faire', 'tâche', 'programme', 'calendrier'],
  },
  analyze_data: {
    description: "Analyse globale de l'exploitation",
    params: {},
    keywords: ['analyse', 'situation', 'diagnostic', 'performance', 'comment va'],
  },
  search_animal: {
    description: "Recherche d'un animal",
    params: { search: 'string (code ou nom)' },
    keywords: ['chercher', 'trouver', 'recherche', 'où est', 'localiser'],
  },
  search_lot: {
    description: "Recherche d'un lot d'animaux",
    params: { search: 'string (lot_id ou terme)' },
    keywords: ['chercher lot', 'trouver lot', 'lot'],
  },

  // ENREGISTREMENTS (exécution directe si paramètres clairs, sinon clarification)
  create_revenu: {
    description: 'Enregistrer une vente',
    params: {
      montant: 'number (obligatoire)',
      nombre: 'number (optionnel)',
      acheteur: 'string (optionnel)',
      poids_kg: 'number (optionnel)',
      date: "string YYYY-MM-DD (optionnel, défaut: aujourd'hui)",
      categorie: "string (défaut: 'vente_porc')",
    },
    keywords: ["j'ai vendu", 'vente', 'vendu', 'vendre'],
    requiresConfirmation: false,
  },
  create_depense: {
    description: 'Enregistrer une dépense',
    params: {
      montant: 'number (obligatoire)',
      categorie: 'string (alimentation|medicaments|veterinaire|entretien|autre)',
      libelle_categorie: "string (optionnel, si categorie='autre')",
      date: 'string YYYY-MM-DD (optionnel)',
      commentaire: 'string (optionnel)',
    },
    keywords: ["j'ai acheté", 'dépense', "j'ai dépensé", 'achat', 'payer'],
    requiresConfirmation: false,
  },
  create_charge_fixe: {
    description: 'Créer une charge fixe récurrente',
    params: {
      montant: 'number (obligatoire)',
      libelle: 'string (obligatoire)',
      frequence: 'string (mensuel|trimestriel|annuel)',
      categorie: 'string (optionnel)',
      date_debut: 'string YYYY-MM-DD (optionnel)',
    },
    keywords: ['charge fixe', 'charge permanente', 'abonnement', 'dépense mensuelle'],
    requiresConfirmation: false,
  },
  create_pesee: {
    description: 'Enregistrer une pesée',
    params: {
      animal_code: 'string (obligatoire si pas animal_id)',
      animal_id: 'string (obligatoire si pas animal_code)',
      poids_kg: 'number (obligatoire)',
      date: 'string YYYY-MM-DD (optionnel)',
    },
    keywords: ['pesée', 'peser', 'poids', 'enregistrer le poids'],
    requiresConfirmation: false,
  },
  create_ingredient: {
    description: 'Créer un ingrédient',
    params: {
      nom: 'string (obligatoire)',
      prix_unitaire: 'number (obligatoire)',
      unite: 'string (kg|g|sac|tonne, défaut: kg)',
    },
    keywords: ['ingrédient', 'créer ingrédient', 'nouvel ingrédient'],
    requiresConfirmation: false,
  },
  create_vaccination: {
    description: 'Enregistrer une vaccination',
    params: {
      animal_id: 'string (optionnel)',
      animal_ids: 'array (optionnel, pour plusieurs animaux)',
      lot_id: 'string (optionnel)',
      vaccin: 'string (obligatoire)',
      date_vaccination: 'string YYYY-MM-DD (optionnel)',
      date_rappel: 'string YYYY-MM-DD (optionnel, calculé automatiquement)',
    },
    keywords: ['vaccination', 'vacciner', "j'ai vacciné"],
    requiresConfirmation: false,
  },
  create_visite_veterinaire: {
    description: 'Enregistrer une visite vétérinaire',
    params: {
      date_visite: 'string YYYY-MM-DD (optionnel)',
      veterinaire: 'string (optionnel)',
      motif: 'string (optionnel)',
      animaux_examines: 'array (optionnel)',
      diagnostic: 'string (optionnel)',
      prescriptions: 'string (optionnel)',
      cout: 'number (optionnel)',
    },
    keywords: ['visite vétérinaire', 'vétérinaire', 'veto', 'consultation'],
    requiresConfirmation: false,
  },
  create_traitement: {
    description: 'Enregistrer un traitement',
    params: {
      animal_id: 'string (optionnel)',
      lot_id: 'string (optionnel)',
      nom_medicament: 'string (obligatoire)',
      date_debut: 'string YYYY-MM-DD (optionnel)',
      date_fin: 'string (optionnel)',
      duree_jours: 'number (optionnel)',
    },
    keywords: ['traitement', 'médicament', 'soin', 'traiter'],
    requiresConfirmation: false,
  },
  create_maladie: {
    description: 'Enregistrer une maladie',
    params: {
      animal_id: 'string (optionnel)',
      lot_id: 'string (optionnel)',
      nom_maladie: 'string (obligatoire)',
      symptomes: 'string (optionnel)',
      gravite: 'string (faible|moyenne|elevee, défaut: moyenne)',
      date_debut: 'string YYYY-MM-DD (optionnel)',
    },
    keywords: ['maladie', 'malade', 'symptôme', 'problème de santé'],
    requiresConfirmation: false,
  },
  create_planification: {
    description: 'Créer un rappel personnalisé (tâche dans le planning)',
    params: {
      titre: 'string (obligatoire)',
      date_prevue: 'string YYYY-MM-DD (obligatoire)',
      type: 'string (veterinaire|autre, défaut: autre)',
      description: 'string (optionnel)',
    },
    keywords: ['rappelle-moi', 'rappel', 'souviens-toi', "n'oublie pas"],
    requiresConfirmation: false,
  },

  // REPRODUCTION
  get_gestations: {
    description: 'Récupérer les gestations en cours',
    params: { en_cours: 'boolean (optionnel, défaut: true)' },
    keywords: ['gestation', 'gestations', 'truies saillies', 'truies gestantes', 'mise bas'],
    requiresConfirmation: false,
  },
  get_gestation_by_truie: {
    description: "Récupérer le statut de gestation d'une truie spécifique",
    params: { truie_id: 'string (code, nom ou ID de la truie)' },
    keywords: ['gestation truie', 'statut gestation', 'truie P012', 'mise bas truie'],
    requiresConfirmation: false,
  },
  predict_mise_bas: {
    description: 'Prédire la date de mise bas pour une truie (date_sautage + 114 jours)',
    params: { truie_id: 'string (code, nom ou ID de la truie)' },
    keywords: ['date mise bas', 'quand mise bas', 'mise bas prévue', 'date prévue'],
    requiresConfirmation: false,
  },
  get_porcelets: {
    description: 'Récupérer les porcelets (naissances récentes)',
    params: { jours: 'number (optionnel, défaut: 30)' },
    keywords: ['porcelets', 'naissances', 'nouveaux porcelets', 'porcelets récents'],
    requiresConfirmation: false,
  },
  get_porcelets_transition: {
    description: 'Récupérer les porcelets en transition (sevrage → croissance, 18-28 jours)',
    params: {},
    keywords: ['porcelets transition', 'sevrage', 'porcelets sevrés', 'transition'],
    requiresConfirmation: false,
  },

  // MORTALITÉS
  get_mortalites: {
    description: 'Récupérer les mortalités',
    params: { jours: 'number (optionnel, défaut: 90)' },
    keywords: ['mortalité', 'mortalités', 'décès', 'morts', 'porcs morts'],
    requiresConfirmation: false,
  },
  get_taux_mortalite: {
    description: 'Calculer le taux de mortalité',
    params: { periode: 'string (7j|30j|90j|1an, défaut: 30j)' },
    keywords: ['taux mortalité', 'taux de mortalité', 'mortalité taux'],
    requiresConfirmation: false,
  },
  analyze_causes_mortalite: {
    description: 'Analyser les causes de mortalité',
    params: {},
    keywords: ['causes mortalité', 'analyse mortalité', 'pourquoi morts'],
    requiresConfirmation: false,
  },

  // FINANCES - GRAPHES
  generate_graph_finances: {
    description: 'Générer les données de graphique financier (revenus/dépenses sur N mois)',
    params: { mois: 'number (optionnel, défaut: 6)' },
    keywords: ['graphique finances', 'évolution dépenses', 'graphique revenus', 'courbe finances'],
    requiresConfirmation: false,
  },
  describe_graph_trends: {
    description: 'Décrire les tendances des graphiques financiers',
    params: { mois: 'number (optionnel, défaut: 6)' },
    keywords: ['tendances finances', 'évolution financière', 'tendance dépenses'],
    requiresConfirmation: false,
  },

  // NUTRITION - COMPOSITION
  propose_composition_alimentaire: {
    description: 'Proposer une composition alimentaire personnalisée (basée sur stade, race, ingrédients locaux)',
    params: {
      type_porc: 'string (porcelet|truie_gestante|truie_allaitante|verrat|porc_croissance)',
      stade: 'string (optionnel, synonyme de type_porc)',
    },
    keywords: ['composition alimentaire', 'ration', 'aliment personnalisé', 'ration truie', 'aliment porcelet'],
    requiresConfirmation: false,
  },
  calculate_consommation_moyenne: {
    description: 'Calculer la consommation moyenne d\'aliments par animal/bande',
    params: { jours: 'number (optionnel, défaut: 30)' },
    keywords: ['consommation', 'consommation moyenne', 'aliment consommé', 'consommation par porc'],
    requiresConfirmation: false,
  },

  // VENTES
  get_ventes: {
    description: 'Récupérer les ventes de porcs',
    params: { jours: 'number (optionnel, défaut: 90)' },
    keywords: ['ventes', 'porcs vendus', 'ventes récentes'],
    requiresConfirmation: false,
  },
  analyze_ventes: {
    description: 'Analyser les ventes (tendances, prix moyen, etc.)',
    params: { periode: 'string (optionnel)' },
    keywords: ['analyse ventes', 'tendances ventes', 'statistiques ventes'],
    requiresConfirmation: false,
  },
  get_bilan_financier: {
    description: 'Récupérer le bilan financier complet (revenus, dépenses, dettes, actifs, indicateurs)',
    params: {
      periode: 'string (optionnel: mois_actuel|mois_precedent|trimestre|annee, défaut: mois_actuel)',
    },
    keywords: [
      'bilan financier',
      'bilan complet',
      'situation financière',
      'état financier',
      'résultat financier',
      'solde',
      'marge',
      'cash flow',
      'actifs',
      'dettes',
    ],
    requiresConfirmation: false,
  },
  get_dettes_en_cours: {
    description: 'Récupérer la liste des dettes en cours avec échéances',
    params: {},
    keywords: [
      'dettes',
      'prêts',
      'dettes en cours',
      'emprunts',
      'échéances',
      'remboursements',
      'intérêts',
    ],
    requiresConfirmation: false,
  },
};

/**
 * Exemples structurés pour le prompt
 */
export const EXAMPLES = [
  {
    user: 'combien de porc actif',
    response: {
      action: 'get_statistics',
      params: {},
      message: 'Je prépare tes statistiques du cheptel...',
      confidence: 0.95,
    },
  },
  {
    user: "j'ai vendu 5 porcs à Traoré à 800 000 FCFA",
    response: {
      action: 'create_revenu',
      params: {
        montant: 800000,
        nombre: 5,
        acheteur: 'Traoré',
        categorie: 'vente_porc',
      },
      message: "C'est noté ! 5 porcs vendus à Traoré pour 800 000 FCFA.",
      confidence: 0.92,
    },
  },
  {
    user: "j'ai acheté 20 sacs de provende à 18 000 FCFA",
    response: {
      action: 'create_depense',
      params: {
        montant: 18000,
        categorie: 'alimentation',
        commentaire: '20 sacs de provende',
      },
      message: "C'est noté ! Dépense de 18 000 FCFA pour l'alimentation.",
      confidence: 0.9,
    },
  },
  {
    user: 'quel est le stock actuel',
    response: {
      action: 'get_stock_status',
      params: {},
      message: 'Vérification des stocks en cours...',
      confidence: 0.95,
    },
  },
  // Exemples questions de formation
  {
    user: "c'est quoi un naisseur?",
    response: {
      action: 'answer_knowledge_question',
      params: {
        topic: 'types_elevage',
        question: "c'est quoi un naisseur"
      },
      message: "Je vais t'expliquer ce qu'est un naisseur...",
      confidence: 0.95,
    },
  },
  {
    user: "quelle race choisir pour l'engraissement?",
    response: {
      action: 'answer_knowledge_question',
      params: {
        topic: 'races',
        question: "quelle race choisir pour l'engraissement"
      },
      message: "Voici mes conseils sur le choix de la race...",
      confidence: 0.95,
    },
  },
  {
    user: "comment vacciner mes porcs?",
    response: {
      action: 'answer_knowledge_question',
      params: {
        topic: 'sante',
        question: "comment vacciner mes porcs"
      },
      message: "Je vais t'expliquer le programme de vaccination...",
      confidence: 0.95,
    },
  },
  {
    user: "combien ça coûte pour démarrer un élevage?",
    response: {
      action: 'answer_knowledge_question',
      params: {
        topic: 'finance',
        question: "combien ça coûte pour démarrer un élevage"
      },
      message: "Voici les coûts pour démarrer un élevage...",
      confidence: 0.95,
    },
  },
];

/**
 * Génère le résumé de la base de connaissances pour le prompt
 */
function getKnowledgeBaseSummary(): string {
  return TRAINING_KNOWLEDGE_BASE.map(topic => 
    `- ${topic.id}: ${topic.title} (${topic.keywords.slice(0, 3).join(', ')}...)`
  ).join('\n');
}

/**
 * Construit le prompt système optimisé
 */
export function buildOptimizedSystemPrompt(context: AgentContext): string {
  return `Tu es Kouakou, assistant professionnel et chaleureux pour éleveurs de porcs en Côte d'Ivoire.

CONTEXTE:
- Projet: ${context.projetId}
- Date: ${context.currentDate}
- Utilisateur: ${context.userName || 'Éleveur'}

RÈGLES CRITIQUES (par ordre de priorité):
1. FORMAT: Réponds TOUJOURS en JSON valide avec cette structure:
   {
     "action": "nom_action",
     "params": {...},
     "message": "message à l'utilisateur",
     "confidence": 0.0-1.0,
     "requiresConfirmation": boolean
   }

2. AUTONOMIE: Exécute DIRECTEMENT si confiance ≥ 0.8 et paramètres clairs
   - Requêtes d'information → TOUJOURS exécution immédiate
   - Enregistrements avec paramètres complets → Exécution directe
   - Questions de formation/connaissances → Utilise answer_knowledge_question
   - Si paramètre manquant mais déductible → DÉDUIS-LE et exécute

3. QUESTIONS DE FORMATION/CONNAISSANCES:
   Tu as accès à une base de connaissances complète sur l'élevage porcin.
   Pour toute question éducative (comment, pourquoi, qu'est-ce que, conseils, etc.),
   utilise l'action "answer_knowledge_question" avec le topic approprié.

   THÈMES DISPONIBLES:
${getKnowledgeBaseSummary()}

4. CONFIRMATION: Uniquement si:
   - Suppression de données
   - Montant > 5 000 000 FCFA
   - Décision sanitaire grave (abattage, euthanasie)
   - Confiance < 0.7 ou paramètres vraiment ambigus

5. TON ET LANGUE:
   - Professionnel mais chaleureux (tutoiement respectueux)
   - Expressions locales naturelles: "les porcs-là", "ça va aller", "bien reçu"
   - Unité: TOUJOURS FCFA (jamais € ou $)
   - Réponses détaillées pour les questions de formation
   - Réponses courtes (2-3 lignes) pour les actions

ACTIONS DISPONIBLES:
${JSON.stringify(ACTIONS_SCHEMA, null, 2)}

EXEMPLES:
${JSON.stringify(EXAMPLES, null, 2)}

EXEMPLES QUESTIONS DE FORMATION:
- "C'est quoi un naisseur?" → answer_knowledge_question avec topic "types_elevage"
- "Quelle race choisir pour l'engraissement?" → answer_knowledge_question avec topic "races"
- "Combien coûte l'alimentation d'un porc?" → answer_knowledge_question avec topic "alimentation"
- "Comment vacciner mes porcs?" → answer_knowledge_question avec topic "sante"
- "Comment démarrer un élevage porcin?" → answer_knowledge_question avec topic "objectifs"

EXTRACTION DE PARAMÈTRES:
- Montant: Cherche après "à", "pour", "de", "montant", "prix" → Prends le nombre le plus grand (exclure quantités < 100)
- Date: "demain" = +1 jour, "lundi" = prochain lundi, "15/01" = 2025-01-15
- Animal: Code (P001) ou nom si mentionné précédemment
- Catégorie: Détecte depuis contexte (aliment→alimentation, médicament→medicaments)
- Topic formation: Détecte depuis le sujet de la question (race, alimentation, santé, finance, etc.)

IMPORTANT:
- Si tu n'es pas sûr (confiance < 0.7) → Demande clarification avec question précise
- Si paramètre manquant mais non déductible → Demande-le avec contexte
- Pour requêtes d'information → JAMAIS de demande de détails, exécute directement
- Pour questions de formation → Donne des réponses complètes et éducatives`;
}
