import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinanceService } from '../finance/finance.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { ProductionService } from '../production/production.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { SanteService } from '../sante/sante.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { ReproductionService } from '../reproduction/reproduction.service';
import { MortalitesService } from '../mortalites/mortalites.service';
import { BatchPigsService } from '../batches/batch-pigs.service';
import { PlanificationsService } from '../planifications/planifications.service';

type GeminiRole = 'user' | 'model' | 'function';

interface GeminiFunctionCall {
  name: string;
  args?: Record<string, unknown> | string;
}

interface GeminiFunctionResponsePart {
  name: string;
  response: unknown;
}

interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponsePart;
}

interface GeminiContent {
  role: GeminiRole;
  parts: GeminiPart[];
}

interface ChatAgentFunctionRequest {
  message: string;
  history?: GeminiContent[];
  projectId: string;
  generationConfig?: Record<string, unknown>;
  conversationId?: string;
}

export interface ExecutedActionMetadata {
  name: string;
  args: Record<string, unknown>;
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
  durationMs?: number;
}

interface FunctionExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

interface TransactionFilter {
  type?: 'expense' | 'revenue';
  category?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

interface TransactionView {
  id: string;
  type: 'expense' | 'revenue';
  amount: number;
  category: string;
  description?: string;
  date: string;
}

interface StreamEmitters {
  onTextChunk?: (payload: { text: string }) => void;
  onFunctionCall?: (payload: { name: string; args: Record<string, unknown> }) => void;
  onFunctionResult?: (
    payload: { name: string; args: Record<string, unknown>; result: FunctionExecutionResult }
  ) => void;
}

@Injectable()
export class ChatAgentService {
  private readonly logger = new Logger(ChatAgentService.name);
  private readonly geminiApiKey: string;
  private readonly geminiApiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  private readonly geminiStreamApiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?alt=sse';
  private readonly geminiRequestTimeoutMs = 30_000;
  private readonly defaultGenerationConfig = {
    temperature: 0.7,
    maxOutputTokens: 1024,
  };
  private readonly toolDeclarations = [
    {
      name: 'create_expense',
      description:
        'Crée une dépense ponctuelle pour le projet actif. Utilise cette fonction lorsqu’un utilisateur mentionne un achat, une facture ou une dépense.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Montant de la dépense en FCFA',
          },
          category: {
            type: 'string',
            description:
              'Catégorie (ex: alimentation, medicaments, veterinaire, equipements, salaires, entretien, autre)',
          },
          description: {
            type: 'string',
            description: 'Notes ou contexte sur la dépense',
          },
          date: {
            type: 'string',
            description: 'Date ISO (YYYY-MM-DD). Défaut: date du jour.',
          },
        },
        required: ['amount', 'category', 'description'],
      },
    },
    {
      name: 'create_revenue',
      description:
        'Crée un revenu (vente, subvention, prestation). Utilise cette fonction pour enregistrer tout encaissement.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Montant reçu en FCFA',
          },
          source: {
            type: 'string',
            description: 'Origine du revenu (ex: vente de porcs, subvention, location, fumier, etc.)',
          },
          description: {
            type: 'string',
            description: 'Détails supplémentaires (acheteur, quantité, remarques…)',
          },
          date: {
            type: 'string',
            description: 'Date ISO (YYYY-MM-DD). Défaut: date du jour.',
          },
        },
        required: ['amount', 'source', 'description'],
      },
    },
    {
      name: 'get_transactions',
      description:
        'Récupère les transactions du projet (revenus et dépenses) avec possibilité de filtrer.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            description: 'Filtres optionnels',
            properties: {
              type: {
                type: 'string',
                description: 'Filtrer par type: expense ou revenue',
              },
              category: {
                type: 'string',
                description: 'Filtrer par catégorie',
              },
              dateRange: {
                type: 'object',
                description: 'Plage de dates (format ISO YYYY-MM-DD)',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    {
      name: 'modify_transaction',
      description:
        'Modifie une transaction existante à partir de son identifiant (revenu ou dépense).',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Identifiant de la transaction (ex: depense_..., revenu_...)',
          },
          updates: {
            type: 'object',
            description: 'Champs à mettre à jour',
            properties: {
              amount: { type: 'number' },
              category: { type: 'string' },
              description: { type: 'string' },
              date: { type: 'string' },
              source: { type: 'string' },
            },
          },
        },
        required: ['id', 'updates'],
      },
    },
    {
      name: 'search_knowledge_base',
      description:
        'Recherche des articles dans la base de connaissances (conseils techniques, bonnes pratiques).',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Question ou mots-clés à rechercher',
          },
          category: {
            type: 'string',
            description: 'Catégorie spécifique (optionnel)',
          },
          limit: {
            type: 'number',
            description: 'Nombre maximal de résultats (entre 1 et 10)',
          },
        },
        required: ['query'],
      },
    },
    // ═══════════════════════════════════════════════════════════
    // FINANCES (suite)
    // ═══════════════════════════════════════════════════════════
    {
      name: 'get_financial_summary',
      description: 'Obtenir le bilan financier (revenus, dépenses, bénéfice)',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: 'Période: month, quarter, year, all',
          },
        },
        required: [],
      },
    },
    {
      name: 'create_fixed_charge',
      description: 'Créer une charge fixe récurrente (loyer, salaire, etc.)',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Montant mensuel en FCFA',
          },
          category: {
            type: 'string',
            description: 'Catégorie de la charge',
          },
          description: {
            type: 'string',
            description: 'Description',
          },
          frequency: {
            type: 'string',
            description: 'Fréquence: monthly, quarterly, yearly',
          },
        },
        required: ['amount', 'category', 'frequency'],
      },
    },
    {
      name: 'generate_financial_graph',
      description: 'Générer un graphique financier',
      parameters: {
        type: 'object',
        properties: {
          graphType: {
            type: 'string',
            description: 'Type de graphique: revenue_expenses, profit_evolution, expense_breakdown',
          },
          period: {
            type: 'string',
            description: 'Période: month, quarter, year',
          },
        },
        required: ['graphType'],
      },
    },
    {
      name: 'update_revenue',
      description: 'Modifier un revenu existant',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID du revenu à modifier',
          },
          updates: {
            type: 'object',
            description: 'Champs à mettre à jour',
            properties: {
              amount: { type: 'number', description: 'Montant en FCFA' },
              source: { type: 'string', description: 'Origine du revenu' },
              description: { type: 'string', description: 'Description' },
              date: { type: 'string', description: 'Date ISO (YYYY-MM-DD)' },
            },
          },
        },
        required: ['id', 'updates'],
      },
    },
    {
      name: 'delete_revenue',
      description: 'Supprimer un revenu',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID du revenu à supprimer',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'update_expense',
      description: 'Modifier une dépense existante',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID de la dépense à modifier',
          },
          updates: {
            type: 'object',
            description: 'Champs à mettre à jour',
            properties: {
              amount: { type: 'number', description: 'Montant en FCFA' },
              category: { type: 'string', description: 'Catégorie' },
              description: { type: 'string', description: 'Description' },
              date: { type: 'string', description: 'Date ISO (YYYY-MM-DD)' },
            },
          },
        },
        required: ['id', 'updates'],
      },
    },
    {
      name: 'delete_expense',
      description: 'Supprimer une dépense',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID de la dépense à supprimer',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'get_ventes',
      description: 'Obtenir les ventes (revenus de type vente)',
      parameters: {
        type: 'object',
        properties: {
          dateDebut: {
            type: 'string',
            description: 'Date de début (ISO YYYY-MM-DD)',
          },
          dateFin: {
            type: 'string',
            description: 'Date de fin (ISO YYYY-MM-DD)',
          },
          category: {
            type: 'string',
            description: 'Catégorie de vente (optionnel)',
          },
        },
        required: [],
      },
    },
    {
      name: 'analyze_ventes',
      description: 'Analyser les ventes (statistiques, tendances)',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: 'Période: month, quarter, year, all',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_dettes_en_cours',
      description: 'Obtenir les dettes en cours',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'describe_graph_trends',
      description: 'Décrire les tendances des graphiques financiers',
      parameters: {
        type: 'object',
        properties: {
          graphType: {
            type: 'string',
            description: 'Type de graphique: revenue_expenses, profit_evolution, expense_breakdown',
          },
          period: {
            type: 'string',
            description: 'Période: month, quarter, year',
          },
        },
        required: ['graphType'],
      },
    },
    {
      name: 'update_weighing',
      description: 'Modifier une pesée existante',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID de la pesée à modifier',
          },
          updates: {
            type: 'object',
            description: 'Champs à mettre à jour',
            properties: {
              weight: { type: 'number', description: 'Poids en kg' },
              date: { type: 'string', description: 'Date ISO (YYYY-MM-DD)' },
              notes: { type: 'string', description: 'Commentaires' },
            },
          },
        },
        required: ['id', 'updates'],
      },
    },
    {
      name: 'update_vaccination',
      description: 'Modifier une vaccination existante',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID de la vaccination à modifier',
          },
          updates: {
            type: 'object',
            description: 'Champs à mettre à jour',
            properties: {
              vaccine: { type: 'string', description: 'Nom du vaccin' },
              date: { type: 'string', description: 'Date ISO (YYYY-MM-DD)' },
              nextDueDate: { type: 'string', description: 'Prochaine date de rappel' },
            },
          },
        },
        required: ['id', 'updates'],
      },
    },
    {
      name: 'update_vet_visit',
      description: 'Modifier une visite vétérinaire existante',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID de la visite vétérinaire à modifier',
          },
          updates: {
            type: 'object',
            description: 'Champs à mettre à jour',
            properties: {
              date: { type: 'string', description: 'Date ISO (YYYY-MM-DD)' },
              veterinarian: { type: 'string', description: 'Nom du vétérinaire' },
              reason: { type: 'string', description: 'Raison de la visite' },
              diagnosis: { type: 'string', description: 'Diagnostic' },
            },
          },
        },
        required: ['id', 'updates'],
      },
    },
    {
      name: 'get_weighing_details',
      description: 'Obtenir les détails des pesées',
      parameters: {
        type: 'object',
        properties: {
          animalId: {
            type: 'string',
            description: 'ID de l\'animal (optionnel, sinon toutes les pesées du projet)',
          },
          dateDebut: {
            type: 'string',
            description: 'Date de début (ISO YYYY-MM-DD)',
          },
          dateFin: {
            type: 'string',
            description: 'Date de fin (ISO YYYY-MM-DD)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_cheptel_details',
      description: 'Obtenir les détails du cheptel (statistiques complètes)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'search_lot',
      description: 'Rechercher un lot par code',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Code du lot à rechercher',
          },
        },
        required: ['code'],
      },
    },
    {
      name: 'get_reminders',
      description: 'Obtenir les rappels de santé (vaccinations, traitements)',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Nombre de jours à l\'avance (défaut: 7)',
          },
        },
        required: [],
      },
    },
    {
      name: 'describe_capabilities',
      description: 'Décrire les capacités de Kouakou (fonctions disponibles)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'answer_knowledge_question',
      description: 'Répondre à une question en utilisant la base de connaissances',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'Question à poser',
          },
          category: {
            type: 'string',
            description: 'Catégorie spécifique (optionnel)',
          },
        },
        required: ['question'],
      },
    },
    {
      name: 'get_statistics',
      description: 'Obtenir les statistiques générales du projet',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'calculate_costs',
      description: 'Calculer les coûts du projet sur une période',
      parameters: {
        type: 'object',
        properties: {
          dateDebut: {
            type: 'string',
            description: 'Date de début (ISO YYYY-MM-DD)',
          },
          dateFin: {
            type: 'string',
            description: 'Date de fin (ISO YYYY-MM-DD)',
          },
        },
        required: [],
      },
    },
    {
      name: 'marketplace_set_price',
      description: 'Définir le prix d\'une annonce sur le marketplace',
      parameters: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            description: 'ID de l\'annonce',
          },
          pricePerKg: {
            type: 'number',
            description: 'Prix au kg en FCFA (le prix total sera calculé automatiquement)',
          },
        },
        required: ['listingId', 'pricePerKg'],
      },
    },
    {
      name: 'marketplace_sell_animal',
      description: 'Finaliser une vente d\'animal via marketplace',
      parameters: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            description: 'ID de l\'annonce',
          },
          buyerId: {
            type: 'string',
            description: 'ID de l\'acheteur',
          },
          finalPrice: {
            type: 'number',
            description: 'Prix final en FCFA',
          },
        },
        required: ['listingId', 'buyerId', 'finalPrice'],
      },
    },
    {
      name: 'create_ingredient',
      description: 'Créer un ingrédient pour la nutrition',
      parameters: {
        type: 'object',
        properties: {
          nom: {
            type: 'string',
            description: 'Nom de l\'ingrédient',
          },
          categorie: {
            type: 'string',
            description: 'Catégorie de l\'ingrédient',
          },
          prix_unitaire: {
            type: 'number',
            description: 'Prix unitaire en FCFA',
          },
        },
        required: ['nom', 'categorie'],
      },
    },
    {
      name: 'get_stock_status',
      description: 'Obtenir l\'état des stocks alimentaires',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_gestations',
      description: 'Obtenir les gestations du projet',
      parameters: {
        type: 'object',
        properties: {
          statut: {
            type: 'string',
            description: 'Statut (en_cours, terminee, annulee)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_gestation_by_truie',
      description: 'Obtenir la gestation d\'une truie spécifique',
      parameters: {
        type: 'object',
        properties: {
          truieId: {
            type: 'string',
            description: 'ID de la truie',
          },
        },
        required: ['truieId'],
      },
    },
    {
      name: 'get_mortalites',
      description: 'Obtenir les mortalités du projet',
      parameters: {
        type: 'object',
        properties: {
          dateDebut: {
            type: 'string',
            description: 'Date de début (ISO YYYY-MM-DD)',
          },
          dateFin: {
            type: 'string',
            description: 'Date de fin (ISO YYYY-MM-DD)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_taux_mortalite',
      description: 'Obtenir le taux de mortalité du projet',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: 'Période: month, quarter, year, all',
          },
        },
        required: [],
      },
    },
    {
      name: 'analyze_causes_mortalite',
      description: 'Analyser les causes de mortalité',
      parameters: {
        type: 'object',
        properties: {
          dateDebut: {
            type: 'string',
            description: 'Date de début (ISO YYYY-MM-DD)',
          },
          dateFin: {
            type: 'string',
            description: 'Date de fin (ISO YYYY-MM-DD)',
          },
        },
        required: [],
      },
    },
    {
      name: 'predict_mise_bas',
      description: 'Prédire la date de mise bas pour une gestation',
      parameters: {
        type: 'object',
        properties: {
          gestationId: {
            type: 'string',
            description: 'ID de la gestation (optionnel si truieId fourni)',
          },
          truieId: {
            type: 'string',
            description: 'ID de la truie (optionnel si gestationId fourni)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_porcelets',
      description: 'Obtenir les porcelets (sevrages) du projet',
      parameters: {
        type: 'object',
        properties: {
          age: {
            type: 'number',
            description: 'Âge en jours (optionnel)',
          },
          statut: {
            type: 'string',
            description: 'Statut (optionnel)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_porcelets_transition',
      description: 'Obtenir les porcelets en transition (récents)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'propose_composition_alimentaire',
      description: 'Proposer une composition alimentaire pour un type d\'animal',
      parameters: {
        type: 'object',
        properties: {
          type_animal: {
            type: 'string',
            description: 'Type d\'animal (porcelet, truie, verrat, etc.)',
          },
          age: {
            type: 'number',
            description: 'Âge en mois (optionnel)',
          },
          poids: {
            type: 'number',
            description: 'Poids en kg (optionnel)',
          },
        },
        required: ['type_animal'],
      },
    },
    {
      name: 'calculate_consommation_moyenne',
      description: 'Calculer la consommation moyenne d\'aliment',
      parameters: {
        type: 'object',
        properties: {
          dateDebut: {
            type: 'string',
            description: 'Date de début (ISO YYYY-MM-DD)',
          },
          dateFin: {
            type: 'string',
            description: 'Date de fin (ISO YYYY-MM-DD)',
          },
        },
        required: [],
      },
    },
    {
      name: 'creer_loge',
      description: 'Créer une loge (bande) pour gérer les animaux',
      parameters: {
        type: 'object',
        properties: {
          nom: {
            type: 'string',
            description: 'Nom de la loge',
          },
          capacite: {
            type: 'number',
            description: 'Capacité maximale (optionnel)',
          },
        },
        required: ['nom'],
      },
    },
    {
      name: 'deplacer_animaux',
      description: 'Déplacer des animaux d\'une loge à une autre',
      parameters: {
        type: 'object',
        properties: {
          animalIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des animaux à déplacer',
          },
          loge_destination: {
            type: 'string',
            description: 'ID ou nom de la loge de destination',
          },
          loge_source: {
            type: 'string',
            description: 'ID ou nom de la loge source (optionnel)',
          },
        },
        required: ['animalIds', 'loge_destination'],
      },
    },
    {
      name: 'get_animaux_par_loge',
      description: 'Obtenir les animaux par loge',
      parameters: {
        type: 'object',
        properties: {
          logeName: {
            type: 'string',
            description: 'Nom de la loge (optionnel, sinon toutes les loges)',
          },
        },
        required: [],
      },
    },
    {
      name: 'create_maladie',
      description: 'Créer un enregistrement de maladie',
      parameters: {
        type: 'object',
        properties: {
          nom: {
            type: 'string',
            description: 'Nom de la maladie',
          },
          animalIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des animaux affectés (optionnel)',
          },
          date_debut: {
            type: 'string',
            description: 'Date de début (ISO YYYY-MM-DD)',
          },
          symptomes: {
            type: 'string',
            description: 'Symptômes observés',
          },
        },
        required: ['nom', 'date_debut'],
      },
    },
    {
      name: 'schedule_reminder',
      description: 'Programmer un rappel',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Type de rappel (vaccination, traitement, etc.)',
          },
          date: {
            type: 'string',
            description: 'Date du rappel (ISO YYYY-MM-DD)',
          },
          message: {
            type: 'string',
            description: 'Message du rappel (optionnel)',
          },
        },
        required: ['type', 'date'],
      },
    },
    {
      name: 'create_planification',
      description: 'Créer une planification (tâche planifiée)',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Type de planification',
          },
          titre: {
            type: 'string',
            description: 'Titre de la planification',
          },
          date_prevue: {
            type: 'string',
            description: 'Date prévue (ISO YYYY-MM-DD)',
          },
          description: {
            type: 'string',
            description: 'Description (optionnel)',
          },
        },
        required: ['type', 'titre', 'date_prevue'],
      },
    },
    {
      name: 'analyze_data',
      description: 'Analyser les données du projet (multi-sources)',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Type d\'analyse: finances, production, sante, all',
          },
        },
        required: [],
      },
    },
    // ═══════════════════════════════════════════════════════════
    // MARKETPLACE
    // ═══════════════════════════════════════════════════════════
    {
      name: 'get_market_price_trends',
      description: 'Obtenir les tendances de prix du porc sur le marché',
      parameters: {
        type: 'object',
        properties: {
          weeks: {
            type: 'number',
            description: 'Nombre de semaines à consulter (défaut: 4)',
          },
        },
        required: [],
      },
    },
    {
      name: 'create_marketplace_listing',
      description: 'Mettre un ou plusieurs porcs en vente sur le marketplace',
      parameters: {
        type: 'object',
        properties: {
          animalIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des animaux à mettre en vente',
          },
          price: {
            type: 'number',
            description: 'Prix total en FCFA',
          },
          pricePerKg: {
            type: 'number',
            description: 'Prix par kg (optionnel)',
          },
          description: {
            type: 'string',
            description: 'Description de l\'annonce',
          },
          listingType: {
            type: 'string',
            description: 'Type: individual ou batch',
          },
        },
        required: ['animalIds', 'price'],
      },
    },
    {
      name: 'update_listing_price',
      description: 'Modifier le prix d\'une annonce sur le marketplace (prix total)',
      parameters: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            description: 'ID de l\'annonce',
          },
          newPrice: {
            type: 'number',
            description: 'Nouveau prix total en FCFA (le prix par kg sera calculé automatiquement)',
          },
        },
        required: ['listingId', 'newPrice'],
      },
    },
    {
      name: 'get_my_listings',
      description: 'Voir mes annonces actives sur le marketplace',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Statut: active, sold, expired (optionnel)',
          },
        },
        required: [],
      },
    },
    {
      name: 'check_offers',
      description: 'Consulter les offres reçues sur mes annonces',
      parameters: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            description: 'ID de l\'annonce (optionnel)',
          },
        },
        required: [],
      },
    },
    {
      name: 'respond_to_offer',
      description: 'Accepter ou refuser une offre d\'achat',
      parameters: {
        type: 'object',
        properties: {
          offerId: {
            type: 'string',
            description: 'ID de l\'offre',
          },
          action: {
            type: 'string',
            description: 'Action: accept ou reject',
          },
          message: {
            type: 'string',
            description: 'Message optionnel pour l\'acheteur',
          },
        },
        required: ['offerId', 'action'],
      },
    },
    {
      name: 'counter_offer',
      description: 'Faire une contre-proposition de prix sur une offre reçue',
      parameters: {
        type: 'object',
        properties: {
          offerId: {
            type: 'string',
            description: 'ID de l\'offre originale',
          },
          newPrice: {
            type: 'number',
            description: 'Nouveau prix total proposé en FCFA',
          },
          message: {
            type: 'string',
            description: 'Message optionnel pour l\'acheteur',
          },
        },
        required: ['offerId', 'newPrice'],
      },
    },
    {
      name: 'delete_listing',
      description: 'Supprimer une annonce du marketplace',
      parameters: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            description: 'ID de l\'annonce à supprimer',
          },
        },
        required: ['listingId'],
      },
    },
    {
      name: 'get_my_sent_offers',
      description: 'Voir mes offres envoyées (en tant qu\'acheteur)',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Statut: pending, accepted, rejected, countered (optionnel)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_transactions',
      description: 'Voir mes transactions marketplace',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Statut: pending, completed, cancelled (optionnel)',
          },
        },
        required: [],
      },
    },
    {
      name: 'confirm_delivery',
      description: 'Confirmer la livraison d\'une transaction',
      parameters: {
        type: 'object',
        properties: {
          transactionId: {
            type: 'string',
            description: 'ID de la transaction',
          },
        },
        required: ['transactionId'],
      },
    },
    {
      name: 'rate_transaction',
      description: 'Noter une transaction complétée',
      parameters: {
        type: 'object',
        properties: {
          transactionId: {
            type: 'string',
            description: 'ID de la transaction',
          },
          rating: {
            type: 'number',
            description: 'Note de 1 à 5',
          },
          comment: {
            type: 'string',
            description: 'Commentaire optionnel',
          },
        },
        required: ['transactionId', 'rating'],
      },
    },
    // ═══════════════════════════════════════════════════════════
    // PRODUCTION / ANIMAUX
    // ═══════════════════════════════════════════════════════════
    {
      name: 'get_animals',
      description: 'Obtenir la liste des animaux de l\'élevage',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Statut: actif, vendu, mort (optionnel)',
          },
          limit: {
            type: 'number',
            description: 'Nombre max d\'animaux (défaut: 50)',
          },
        },
        required: [],
      },
    },
    {
      name: 'search_animal',
      description: 'Rechercher un animal spécifique par nom, ID ou caractéristiques',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Nom, ID ou critère de recherche',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'create_weighing',
      description: 'Enregistrer une pesée d\'animal',
      parameters: {
        type: 'object',
        properties: {
          animalId: {
            type: 'string',
            description: 'ID de l\'animal',
          },
          weight: {
            type: 'number',
            description: 'Poids en kg',
          },
          date: {
            type: 'string',
            description: 'Date de pesée YYYY-MM-DD',
          },
          notes: {
            type: 'string',
            description: 'Notes optionnelles',
          },
        },
        required: ['animalId', 'weight'],
      },
    },
    // ═══════════════════════════════════════════════════════════
    // SANTÉ
    // ═══════════════════════════════════════════════════════════
    {
      name: 'create_vaccination',
      description: 'Enregistrer une vaccination',
      parameters: {
        type: 'object',
        properties: {
          animalIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des animaux vaccinés',
          },
          vaccine: {
            type: 'string',
            description: 'Nom du vaccin',
          },
          date: {
            type: 'string',
            description: 'Date de vaccination YYYY-MM-DD',
          },
          nextDueDate: {
            type: 'string',
            description: 'Prochaine date de rappel',
          },
          veterinarian: {
            type: 'string',
            description: 'Nom du vétérinaire',
          },
          cost: {
            type: 'number',
            description: 'Coût en FCFA',
          },
        },
        required: ['animalIds', 'vaccine'],
      },
    },
    {
      name: 'create_treatment',
      description: 'Enregistrer un traitement médical',
      parameters: {
        type: 'object',
        properties: {
          animalIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs des animaux traités',
          },
          medication: {
            type: 'string',
            description: 'Médicament administré',
          },
          diagnosis: {
            type: 'string',
            description: 'Diagnostic',
          },
          date: {
            type: 'string',
            description: 'Date du traitement',
          },
          duration: {
            type: 'number',
            description: 'Durée en jours',
          },
          cost: {
            type: 'number',
            description: 'Coût en FCFA',
          },
        },
        required: ['animalIds', 'medication'],
      },
    },
    {
      name: 'create_vet_visit',
      description: 'Enregistrer une visite vétérinaire',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date de la visite',
          },
          veterinarian: {
            type: 'string',
            description: 'Nom du vétérinaire',
          },
          reason: {
            type: 'string',
            description: 'Raison de la visite',
          },
          diagnosis: {
            type: 'string',
            description: 'Diagnostic',
          },
          recommendations: {
            type: 'string',
            description: 'Recommandations',
          },
          cost: {
            type: 'number',
            description: 'Coût en FCFA',
          },
        },
        required: ['date', 'reason'],
      },
    },
    {
      name: 'get_health_reminders',
      description: 'Obtenir les rappels de santé (vaccinations, traitements en retard)',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Nombre de jours à l\'avance (défaut: 7)',
          },
        },
        required: [],
      },
    },
    // ═══════════════════════════════════════════════════════════
    // STATISTIQUES
    // ═══════════════════════════════════════════════════════════
    {
      name: 'get_project_stats',
      description: 'Obtenir les statistiques générales du projet',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_animal_statistics',
      description: 'Obtenir des statistiques détaillées sur les animaux',
      parameters: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            description: 'Métrique: average_weight, total_count, mortality_rate, growth_rate',
          },
        },
        required: [],
      },
    },
    // ═══════════════════════════════════════════════════════════
    // CONNAISSANCES / FORMATION (suite)
    // ═══════════════════════════════════════════════════════════
    {
      name: 'list_knowledge_topics',
      description: 'Lister les sujets disponibles dans la base de connaissances',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
  private readonly allowedFunctionNames = new Set(
    this.toolDeclarations.map((declaration) => declaration.name),
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly financeService: FinanceService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly productionService: ProductionService,
    private readonly marketplaceService: MarketplaceService,
    private readonly santeService: SanteService,
    private readonly nutritionService: NutritionService,
    private readonly reproductionService: ReproductionService,
    private readonly mortalitesService: MortalitesService,
    private readonly batchPigsService: BatchPigsService,
    private readonly planificationsService: PlanificationsService,
  ) {
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    
    if (!this.geminiApiKey) {
      this.logger.warn('GEMINI_API_KEY non configurée. Le service chat-agent ne fonctionnera pas.');
    }
    
    // Log du nombre de fonctions déclarées
    this.logger.log(`[ChatAgent] Fonctions Gemini déclarées: ${this.toolDeclarations.length}`);
  }

  async handleFunctionCallingMessage(
    request: ChatAgentFunctionRequest,
    user: { id: string; email?: string; roles?: string[] },
  ): Promise<{
    response: string;
    metadata: { model: string; executedActions: ExecutedActionMetadata[] };
  }> {
    if (!request?.message || typeof request.message !== 'string' || !request.message.trim()) {
      throw new BadRequestException('message est requis');
    }

    if (!request.projectId) {
      throw new BadRequestException('projectId est requis');
    }

    if (!this.geminiApiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY non configurée');
    }

    const sanitizedMessage = this.sanitizeUserInput(request.message);
    if (!sanitizedMessage) {
      throw new BadRequestException('message invalide');
    }

    const sanitizedHistory = this.sanitizeHistory(request.history);
    const conversation: GeminiContent[] = [...sanitizedHistory];

    conversation.push({
      role: 'user',
      parts: [{ text: sanitizedMessage }],
    });

    const systemInstruction = {
      parts: [{ text: this.buildSystemPrompt(user.email) }],
    };

    const generationConfig = request.generationConfig || this.defaultGenerationConfig;

    const firstResponse = await this.callGemini({
      contents: conversation,
      tools: [
        {
          function_declarations: this.toolDeclarations,
        },
      ],
      system_instruction: systemInstruction,
      generationConfig,
    });

    const firstCandidate = firstResponse?.candidates?.[0];
    const firstParts: GeminiPart[] = firstCandidate?.content?.parts || [];
    const functionCalls = firstParts.filter((part) => part.functionCall);
    const executedActions: ExecutedActionMetadata[] = [];

    if (functionCalls.length === 0) {
      const reply = this.extractTextFromParts(firstParts);
      if (!reply) {
        throw new ServiceUnavailableException('Aucune réponse de Gemini');
      }
      return {
        response: reply,
        metadata: {
          model: 'gemini-2.0-flash-exp',
          executedActions,
        },
      };
    }

    const functionResponseParts: GeminiPart[] = [];

    for (const callPart of functionCalls) {
      const functionCall = callPart.functionCall!;
      const args = this.parseFunctionArgs(functionCall.args);
      const start = Date.now();
      const executionResult = await this.executeFunctionCall(
        functionCall.name,
        args,
        request.projectId,
        user.id,
      );

      executedActions.push({
        name: functionCall.name,
        args,
        success: executionResult.success,
        message: executionResult.message,
        data: executionResult.data,
        error: executionResult.error,
        durationMs: Date.now() - start,
      });

      functionResponseParts.push({
        functionResponse: {
          name: functionCall.name,
          response: executionResult,
        },
      });
    }

    conversation.push({
      role: 'model',
      parts: functionCalls.map((call) => ({
        functionCall: call.functionCall,
      })),
    });

    conversation.push({
      role: 'function',
      parts: functionResponseParts,
    });

    const followUpResponse = await this.callGemini({
      contents: conversation,
      system_instruction: systemInstruction,
      generationConfig,
    });

    const finalParts: GeminiPart[] =
      followUpResponse?.candidates?.[0]?.content?.parts || [];
    const finalText = this.extractTextFromParts(finalParts);

    if (!finalText) {
      throw new ServiceUnavailableException(
        'Aucune réponse générée après exécution des fonctions',
      );
    }

    return {
      response: finalText,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        executedActions,
      },
    };
  }

  async streamResponse(
    request: ChatAgentFunctionRequest,
    user: { id: string; email?: string; roles?: string[] },
    emitters: StreamEmitters,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!request?.message || typeof request.message !== 'string' || !request.message.trim()) {
      throw new BadRequestException('message est requis');
    }
    if (!request.projectId) {
      throw new BadRequestException('projectId est requis');
    }
    if (!this.geminiApiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY non configurée');
    }

    const safeEmitters = emitters || {};
    const sanitizedMessage = this.sanitizeUserInput(request.message);
    if (!sanitizedMessage) {
      throw new BadRequestException('message invalide');
    }

    const sanitizedHistory = this.sanitizeHistory(request.history);
    const conversation: GeminiContent[] = [...sanitizedHistory];
    conversation.push({
      role: 'user',
      parts: [{ text: sanitizedMessage }],
    });

    const systemInstruction = {
      parts: [{ text: this.buildSystemPrompt(user.email) }],
    };
    const generationConfig = request.generationConfig || this.defaultGenerationConfig;

    const maxIterations = 3;
    let allowTools = true;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const { functionCalls, streamedParts } = await this.streamModelIteration(
        {
          contents: conversation,
          system_instruction: systemInstruction,
          generationConfig,
          tools: allowTools ? [{ function_declarations: this.toolDeclarations }] : undefined,
        },
        safeEmitters,
        signal,
      );

      if (streamedParts.length > 0) {
        conversation.push({
          role: 'model',
          parts: streamedParts,
        });
      }

      if (!functionCalls.length) {
        return;
      }

      const functionResponses: GeminiPart[] = [];
      for (const functionCall of functionCalls) {
        const parsedArgs = this.parseFunctionArgs(functionCall.args);

        const result = await this.executeFunctionCall(
          functionCall.name,
          parsedArgs,
          request.projectId,
          user.id,
        );

            safeEmitters.onFunctionResult?.({
          name: functionCall.name,
          args: parsedArgs,
          result,
        });

        functionResponses.push({
          functionResponse: {
            name: functionCall.name,
            response: result,
          },
        });
      }

      if (functionResponses.length > 0) {
        conversation.push({
          role: 'function',
          parts: functionResponses,
        });
      }

      allowTools = false;
    }

    throw new ServiceUnavailableException(
      'Cycle de function calling trop long. Réessayez avec une demande plus précise.',
    );
  }

  private async streamModelIteration(
    payload: Record<string, unknown>,
    emitters: StreamEmitters,
    signal?: AbortSignal,
  ): Promise<{ functionCalls: GeminiFunctionCall[]; streamedParts: GeminiPart[] }> {
    const collectedFunctionCalls: GeminiFunctionCall[] = [];
    const streamedParts: GeminiPart[] = [];

    await this.streamGemini(
      payload,
      async (chunk) => {
        if (chunk?.error) {
          throw new BadRequestException(chunk.error?.message || 'Erreur Gemini (streaming)');
        }
        const candidates = Array.isArray(chunk?.candidates) ? chunk.candidates : [];
        if (!candidates.length) {
          return;
        }

        const parts: GeminiPart[] = candidates[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.text) {
            streamedParts.push({ text: part.text });
            emitters.onTextChunk?.({ text: part.text });
          }

          if (part.functionCall?.name) {
            const fnCall: GeminiFunctionCall = {
              name: part.functionCall.name,
              args: part.functionCall.args,
            };
            collectedFunctionCalls.push(fnCall);
            streamedParts.push({ functionCall: fnCall });

            const parsedArgs = this.parseFunctionArgs(fnCall.args);
            emitters.onFunctionCall?.({
              name: fnCall.name,
              args: parsedArgs,
            });
          }
        }
      },
      signal,
    );

    return { functionCalls: collectedFunctionCalls, streamedParts };
  }

  private async streamGemini(
    payload: Record<string, unknown>,
    onChunk: (chunk: any) => Promise<void> | void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!this.geminiApiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY non configurée');
    }

    const requestPayload: Record<string, unknown> = { ...payload };
    
    // ✅ Ajouter la recherche Google aux tools (si tools présents)
    if (requestPayload.tools && Array.isArray(requestPayload.tools)) {
      const tools = [...requestPayload.tools];
      // ✅ Vérifier si des function_declarations sont présents
      const hasFunctionDeclarations = tools.some((tool: any) => tool.function_declarations);
      
      // ✅ Ajouter la recherche Google UNIQUEMENT si pas de function calling
      // Gemini n'autorise pas Search Grounding avec function calling
      // Note: L'API Gemini utilise maintenant google_search au lieu de google_search_retrieval
      if (!hasFunctionDeclarations) {
        const hasGoogleSearch = tools.some((tool: any) => tool.google_search || tool.google_search_retrieval);
        if (!hasGoogleSearch) {
          tools.push({
            google_search: {},
          });
          requestPayload.tools = tools;
        }
      } else {
        // Retirer google_search si présent (nettoyage)
        const filteredTools = tools.filter((tool: any) => !tool?.google_search && !tool?.google_search_retrieval);
        if (filteredTools.length !== tools.length) {
          this.logger.warn('[ChatAgent] ⚠️ google_search retiré du stream car function_declarations présent');
        }
        requestPayload.tools = filteredTools;
      }
    } else if (!requestPayload.tools) {
      // Si pas de tools, ajouter seulement google_search
      requestPayload.tools = [
        {
          google_search: {},
        },
      ];
    }

    const streamUrl = `${this.geminiStreamApiUrl}&key=${this.geminiApiKey}`;

    const { signal: abortSignal, clear } = this.createTimeoutController(signal);
    try {
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: abortSignal,
      });

      if (!response.ok) {
        this.logger.error(`Erreur stream Gemini: ${response.status}`);
        throw new BadRequestException('Erreur Gemini (streaming)');
      }

      if (!response.body) {
        throw new ServiceUnavailableException('Flux Gemini indisponible');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processEvent = async (rawEvent: string) => {
        if (!rawEvent || !rawEvent.trim()) {
          return;
        }

        const lines = rawEvent.split('\n');
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const content = line.slice(5).trim();
            if (content === '' || content === '[DONE]') {
              continue;
            }
            dataLines.push(content);
          }
        }

        if (!dataLines.length) {
          return;
        }

        const payloadText = dataLines.join('\n');
        try {
          const parsed = JSON.parse(payloadText);
          await onChunk(parsed);
        } catch (error) {
          this.logger.warn('Chunk SSE Gemini non parsable', error);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.length > 0) {
            await processEvent(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let separatorIndex: number;
        while ((separatorIndex = buffer.indexOf('\n\n')) >= 0) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);
          await processEvent(rawEvent);
        }
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        this.logger.debug('Streaming Gemini interrompu (client déconnecté)');
        return;
      }
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur lors du streaming Gemini: ${message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException('Erreur lors de la communication avec Gemini (stream)');
    } finally {
      clear();
    }
  }

  /**
   * Proxie un appel à l'API Gemini
   * @param payload - Payload complet pour l'API Gemini
   * @returns Réponse de l'API Gemini
   */
  async callGemini(payload: {
    contents: any[];
    tools?: any[];
    system_instruction?: any;
    generationConfig?: any;
  }): Promise<any> {
    if (!this.geminiApiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY non configurée');
    }

    const { signal, clear } = this.createTimeoutController();
    try {
      // ✅ Construire les tools avec recherche Google (uniquement si pas de function calling)
      const tools = payload.tools ? [...payload.tools] : [];
      
      // ✅ Vérifier si des function_declarations sont présents
      const hasFunctionDeclarations = tools.some(tool => tool?.function_declarations && Array.isArray(tool.function_declarations) && tool.function_declarations.length > 0);
      
      // ✅ IMPORTANT: Gemini n'autorise PAS Search Grounding avec function calling
      // Si function_declarations sont présents, NE PAS ajouter google_search
      if (hasFunctionDeclarations) {
        // Retirer google_search si présent (nettoyage au cas où)
        const filteredTools = tools.filter(tool => !tool?.google_search && !tool?.google_search_retrieval);
        if (filteredTools.length !== tools.length) {
          this.logger.warn('[ChatAgent] ⚠️ google_search retiré car function_declarations présent');
        }
        
        const finalPayload = {
          ...payload,
          tools: filteredTools.length > 0 ? filteredTools : undefined,
        };
        
        this.logger.debug('[ChatAgent] 🌐 Outils Gemini (function calling activé):', {
          functionCalling: true,
          functionCount: filteredTools.find(t => t?.function_declarations)?.function_declarations?.length || 0,
          googleSearch: false,
          totalTools: filteredTools.length,
        });
        
        const response = await fetch(`${this.geminiApiUrl}?key=${this.geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalPayload),
          signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorSummary = errorData?.error?.status || response.statusText || 'Unknown';
          this.logger.error(`Erreur API Gemini: ${response.status} - ${errorSummary}`);
          throw new BadRequestException(
            `Erreur Gemini: ${errorData.error?.message || response.statusText}`
          );
        }

        const data = await response.json();
        return data;
      }
      
      // ✅ Si pas de function calling, on peut ajouter google_search
      // Note: L'API Gemini utilise maintenant google_search au lieu de google_search_retrieval
      const hasGoogleSearch = tools.some(tool => tool?.google_search || tool?.google_search_retrieval);
      if (!hasGoogleSearch) {
        tools.push({
          google_search: {},
        });
      }
      
      // Construire le payload final avec tools modifiés
      const finalPayload = {
        ...payload,
        tools: tools.length > 0 ? tools : undefined,
      };
      
      this.logger.debug('[ChatAgent] 🌐 Outils Gemini (search grounding activé):', {
        functionCalling: false,
        googleSearch: true,
        totalTools: tools.length,
      });
      
      const response = await fetch(`${this.geminiApiUrl}?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorSummary = errorData?.error?.status || response.statusText || 'Unknown';
        this.logger.error(`Erreur API Gemini: ${response.status} - ${errorSummary}`);
        throw new BadRequestException(
          `Erreur Gemini: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur lors de l'appel Gemini: ${message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException('Erreur lors de la communication avec Gemini');
    } finally {
      clear();
    }
  }

  private createTimeoutController(
    externalSignal?: AbortSignal,
  ): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.geminiRequestTimeoutMs);

    let removeExternalListener: (() => void) | undefined;

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        const abortHandler = () => controller.abort();
        externalSignal.addEventListener('abort', abortHandler);
        removeExternalListener = () => externalSignal.removeEventListener('abort', abortHandler);
      }
    }

    const clear = () => {
      clearTimeout(timeoutId);
      removeExternalListener?.();
    };

    return {
      signal: controller.signal,
      clear,
    };
  }

  private sanitizeUserInput(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/<[^>]+>/g, '')
      .trim()
      .slice(0, 4000);
  }

  private sanitizeHistory(history?: GeminiContent[]): GeminiContent[] {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const role = entry.role as GeminiRole;
        if (!['user', 'model', 'function'].includes(role)) {
          return null;
        }

        if (!Array.isArray(entry.parts)) {
          return null;
        }

        const sanitizedParts = entry.parts.reduce<GeminiPart[]>((acc, part) => {
          if (part?.text && typeof part.text === 'string') {
            acc.push({ text: this.sanitizeUserInput(part.text) });
            return acc;
          }

          if (part?.functionCall?.name) {
            acc.push({
              functionCall: {
                name: part.functionCall.name,
                args: part.functionCall.args,
              },
            });
            return acc;
          }

          if (part?.functionResponse?.name) {
            acc.push({
              functionResponse: {
                name: part.functionResponse.name,
                response: part.functionResponse.response,
              },
            });
          }

          return acc;
        }, []);

        if (!sanitizedParts.length) {
          return null;
        }

        return {
          role,
          parts: sanitizedParts,
        };
      })
      .filter((entry): entry is GeminiContent => Boolean(entry));
  }

  private buildSystemPrompt(userEmail?: string): string {
    // Pour compatibilité, on appelle buildSystemInstruction sans contexte projet détaillé
    // Le contexte projet peut être ajouté plus tard si nécessaire
    return this.buildSystemInstruction();
  }

  private buildSystemInstruction(projectContext?: {
    projectId: string;
    projectName?: string;
    totalAnimals?: number;
    userId: string;
  }): string {
    const contextInfo = projectContext
      ? `
**CONTEXTE DU PROJET :**
- Projet : ${projectContext.projectName || 'Non spécifié'}
- Nombre d'animaux : ${projectContext.totalAnimals || 0}
- ID Projet : ${projectContext.projectId}
- ID Utilisateur : ${projectContext.userId}
`
      : '';

    return `Tu es Kouakou, assistant intelligent spécialisé dans la gestion d'élevage porcin en Afrique de l'Ouest.

${contextInfo}

# TES CAPACITÉS

## 1. RECHERCHE D'INFORMATIONS (Priorité : TOUJOURS chercher si incertain)

**Quand chercher en ligne :**
- Prix du marché (porc, aliment, médicaments)
- Informations récentes sur l'élevage
- Réglementations locales
- Vétérinaires ou fournisseurs dans une région
- Conseils techniques que tu ne connais pas avec certitude
- Tout ce qui nécessite des données actualisées

**Exemples :**
- "Quel est le prix du porc au Bénin ?" → 🌐 CHERCHE EN LIGNE
- "Trouve-moi des vétérinaires à Abidjan" → 🌐 CHERCHE EN LIGNE
- "Quel est le prix de l'aliment actuellement ?" → 🌐 CHERCHE EN LIGNE

## 2. ACTIONS SUR LES DONNÉES (Utilise les fonctions disponibles)

**Quand utiliser les fonctions :**
- L'utilisateur veut ENREGISTRER quelque chose (dépense, revenu, vaccination, etc.)
- L'utilisateur veut CONSULTER ses données (bilan, animaux, statistiques)
- L'utilisateur veut MODIFIER ou SUPPRIMER quelque chose
- L'utilisateur veut METTRE EN VENTE un animal

**Exemples :**
- "J'ai dépensé 50000 FCFA pour l'aliment" → 🔧 create_expense()
- "Montre-moi mon bilan financier" → 🔧 get_financial_summary()
- "Mets mon porc en vente" → 🔧 create_marketplace_listing()

**IMPORTANT :** Toujours extraire TOUS les paramètres nécessaires du message de l'utilisateur.

## 3. CONSEILS ET FORMATION (Utilise tes connaissances + recherche)

**Quand donner des conseils :**
- Questions sur l'alimentation, la santé, la reproduction
- Bonnes pratiques d'élevage
- Problèmes courants et solutions

**Approche :**
1. Utilise tes connaissances de base
2. Si besoin de données récentes/locales → 🌐 CHERCHE EN LIGNE
3. Donne des conseils pratiques et actionnables

**Exemples :**
- "Comment améliorer la croissance de mes porcs ?" → Conseils + recherche si besoin
- "Mon porc est malade, que faire ?" → Conseils + cherche vétérinaires locaux

## 4. CONVERSATION NATURELLE

**Reste conversationnel et amical :**
- Salutations : "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
- Remerciements : "De rien, je suis là pour vous aider !"
- Clarifications : Si tu ne comprends pas, demande des précisions

# RÈGLES IMPORTANTES

1. **PRIORITÉ À LA RECHERCHE WEB** : En cas de doute, CHERCHE EN LIGNE
2. **TOUJOURS extraire les paramètres** : Ne demande pas si l'info est dans le message
3. **SOIS PRÉCIS** : Donne des montants, dates, noms exacts
4. **ADAPTE-TOI AU CONTEXTE** : Utilise les infos du projet
5. **RESTE PROFESSIONNEL** : Tu es un expert en élevage

# FORMAT DE RÉPONSE

- **Pour les recherches** : Cite tes sources et donne des infos récentes
- **Pour les actions** : Confirme ce qui a été fait et donne un résumé
- **Pour les conseils** : Sois structuré (utilise des listes, des étapes)

# EXEMPLE DE CONVERSATION

User: "Quel est le prix du porc au Bénin actuellement ?"
Assistant: [Recherche en ligne] D'après les dernières informations trouvées, le prix du porc au Bénin est actuellement de 2200-2500 FCFA/kg pour le poids vif. Les prix varient selon les régions et la saison.

User: "J'ai dépensé 75000 FCFA pour acheter de l'aliment hier"
Assistant: [Appel create_expense avec montant=75000, categorie="aliment", date="2026-01-16"] ✅ J'ai enregistré votre dépense de 75 000 FCFA pour l'aliment en date du 16 janvier 2026.

User: "Comment réduire mes coûts d'alimentation ?"
Assistant: Voici quelques stratégies pour réduire vos coûts d'alimentation :

1. **Acheter en gros** : Négociez avec les fournisseurs pour des remises sur volume
2. **Produire localement** : Cultivez du maïs ou manioc pour compléter
3. **Optimiser les rations** : Adaptez selon l'âge et le poids des animaux
4. **Comparer les prix** : Utilisez le marketplace pour comparer

Voulez-vous que je recherche les prix actuels des fournisseurs d'aliment dans votre région ?

---

Maintenant, aide l'utilisateur avec sa demande.`;
  }

  private extractTextFromParts(parts: GeminiPart[]): string | null {
    if (!Array.isArray(parts) || parts.length === 0) {
      return null;
    }

    const texts = parts
      .map((part) => (typeof part.text === 'string' ? part.text.trim() : null))
      .filter((text): text is string => Boolean(text));

    return texts.length ? texts.join('\n').trim() : null;
  }

  private parseFunctionArgs(rawArgs: GeminiFunctionCall['args']): Record<string, unknown> {
    if (!rawArgs) {
      return {};
    }

    if (typeof rawArgs === 'string') {
      try {
        return JSON.parse(rawArgs);
      } catch (error) {
        this.logger.warn('Impossible de parser les arguments JSON renvoyés par Gemini', error as Error);
        return {};
      }
    }

    return rawArgs;
  }

  private async executeFunctionCall(
    name: string,
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      if (!this.allowedFunctionNames.has(name)) {
        this.logger.warn(`Function call non autorisée: ${name}`);
        return {
          success: false,
          message: `La fonction "${name}" n'est pas autorisée.`,
          error: 'function_not_allowed',
        };
      }
      switch (name) {
        // Finance - existants
        case 'create_expense':
          return await this.handleCreateExpense(args, projectId, userId);
        case 'create_revenue':
          return await this.handleCreateRevenue(args, projectId, userId);
        case 'get_transactions':
          return await this.handleGetTransactions(args, projectId, userId);
        case 'modify_transaction':
          return await this.handleModifyTransaction(args, userId);
        // Finance - nouveaux
        case 'get_financial_summary':
          return await this.handleGetFinancialSummary(args, projectId, userId);
        case 'create_fixed_charge':
          return await this.handleCreateFixedCharge(args, projectId, userId);
        case 'generate_financial_graph':
          return await this.handleGenerateFinancialGraph(args, projectId, userId);
        case 'update_revenue':
          return await this.handleUpdateRevenue(args, projectId, userId);
        case 'delete_revenue':
          return await this.handleDeleteRevenue(args, userId);
        case 'update_expense':
          return await this.handleUpdateExpense(args, projectId, userId);
        case 'delete_expense':
          return await this.handleDeleteExpense(args, userId);
        case 'get_ventes':
          return await this.handleGetVentes(args, projectId, userId);
        case 'analyze_ventes':
          return await this.handleAnalyzeVentes(args, projectId, userId);
        case 'get_dettes_en_cours':
          return await this.handleGetDettesEnCours(args, projectId, userId);
        case 'describe_graph_trends':
          return await this.handleDescribeGraphTrends(args, projectId, userId);
        case 'update_weighing':
          return await this.handleUpdateWeighing(args, projectId, userId);
        case 'update_vaccination':
          return await this.handleUpdateVaccination(args, projectId, userId);
        case 'update_vet_visit':
          return await this.handleUpdateVetVisit(args, projectId, userId);
        case 'get_weighing_details':
          return await this.handleGetWeighingDetails(args, projectId, userId);
        case 'get_cheptel_details':
          return await this.handleGetCheptelDetails(args, projectId, userId);
        case 'search_lot':
          return await this.handleSearchLot(args, projectId, userId);
        case 'get_reminders':
          return await this.handleGetReminders(args, projectId, userId);
        case 'describe_capabilities':
          return await this.handleDescribeCapabilities(args);
        case 'answer_knowledge_question':
          return await this.handleAnswerKnowledgeQuestion(args, projectId);
        case 'get_statistics':
          return await this.handleGetStatistics(args, projectId, userId);
        case 'calculate_costs':
          return await this.handleCalculateCosts(args, projectId, userId);
        case 'marketplace_set_price':
          return await this.handleMarketplaceSetPrice(args, userId);
        case 'marketplace_sell_animal':
          return await this.handleMarketplaceSellAnimal(args, projectId, userId);
        case 'create_ingredient':
          return await this.handleCreateIngredient(args);
        case 'get_stock_status':
          return await this.handleGetStockStatus(args, projectId, userId);
        case 'get_gestations':
          return await this.handleGetGestations(args, projectId, userId);
        case 'get_gestation_by_truie':
          return await this.handleGetGestationByTruie(args, projectId, userId);
        case 'get_mortalites':
          return await this.handleGetMortalites(args, projectId, userId);
        case 'get_taux_mortalite':
          return await this.handleGetTauxMortalite(args, projectId, userId);
        case 'analyze_causes_mortalite':
          return await this.handleAnalyzeCausesMortalite(args, projectId, userId);
        case 'predict_mise_bas':
          return await this.handlePredictMiseBas(args, projectId, userId);
        case 'get_porcelets':
          return await this.handleGetPorcelets(args, projectId, userId);
        case 'get_porcelets_transition':
          return await this.handleGetPorceletsTransition(args, projectId, userId);
        case 'propose_composition_alimentaire':
          return await this.handleProposeCompositionAlimentaire(args);
        case 'calculate_consommation_moyenne':
          return await this.handleCalculateConsommationMoyenne(args, projectId, userId);
        case 'creer_loge':
          return await this.handleCreerLoge(args, projectId, userId);
        case 'deplacer_animaux':
          return await this.handleDeplacerAnimaux(args, projectId, userId);
        case 'get_animaux_par_loge':
          return await this.handleGetAnimauxParLoge(args, projectId, userId);
        case 'create_maladie':
          return await this.handleCreateMaladie(args, projectId, userId);
        case 'schedule_reminder':
          return await this.handleScheduleReminder(args, projectId, userId);
        case 'create_planification':
          return await this.handleCreatePlanification(args, projectId, userId);
        case 'analyze_data':
          return await this.handleAnalyzeData(args, projectId, userId);
        // Marketplace
        case 'get_market_price_trends':
          return await this.handleGetMarketPriceTrends(args);
        case 'create_marketplace_listing':
          return await this.handleCreateMarketplaceListing(args, projectId, userId);
        case 'update_listing_price':
          return await this.handleUpdateListingPrice(args, userId);
        case 'get_my_listings':
          return await this.handleGetMyListings(args, projectId, userId);
        case 'check_offers':
          return await this.handleCheckOffers(args, projectId, userId);
        case 'respond_to_offer':
          return await this.handleRespondToOffer(args, userId);
        case 'counter_offer':
          return await this.handleCounterOffer(args, userId);
        case 'delete_listing':
          return await this.handleDeleteListing(args, userId);
        case 'get_my_sent_offers':
          return await this.handleGetMySentOffers(args, projectId, userId);
        case 'get_transactions':
          // Note: Cette action existe déjà pour les transactions financières
          // On utilise le même nom pour les transactions marketplace
          return await this.handleGetMarketplaceTransactions(args, projectId, userId);
        case 'confirm_delivery':
          return await this.handleConfirmDelivery(args, userId);
        case 'rate_transaction':
          return await this.handleRateTransaction(args, userId);
        // Production
        case 'get_animals':
          return await this.handleGetAnimals(args, projectId, userId);
        case 'search_animal':
          return await this.handleSearchAnimal(args, projectId, userId);
        case 'create_weighing':
          return await this.handleCreateWeighing(args, projectId, userId);
        case 'get_project_stats':
          return await this.handleGetProjectStats(args, projectId, userId);
        case 'get_animal_statistics':
          return await this.handleGetAnimalStatistics(args, projectId, userId);
        // Santé
        case 'create_vaccination':
          return await this.handleCreateVaccination(args, projectId, userId);
        case 'create_treatment':
          return await this.handleCreateTreatment(args, projectId, userId);
        case 'create_vet_visit':
          return await this.handleCreateVetVisit(args, projectId, userId);
        case 'get_health_reminders':
          return await this.handleGetHealthReminders(args, projectId, userId);
        // Knowledge Base
        case 'search_knowledge_base':
          return await this.handleSearchKnowledgeBase(args, projectId);
        case 'list_knowledge_topics':
          return await this.handleListKnowledgeTopics(args, projectId);
        default:
          this.logger.warn(`Fonction inconnue demandée par Gemini: ${name}`);
          return {
            success: false,
            message: `La fonction "${name}" n'est pas disponible`,
            error: `fonction inconnue: ${name}`,
          };
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'exécution de ${name}`, error);
      return {
        success: false,
        message: `Erreur lors de l'exécution de ${name}`,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreateExpense(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const amount = this.normalizeAmount(args.amount);
    if (amount === null) {
      return {
        success: false,
        message: 'Montant invalide pour la dépense',
        error: 'amount invalide',
      };
    }

    const categoryInfo = this.mapExpenseCategory(args.category);
    const description =
      typeof args.description === 'string' && args.description.trim()
        ? args.description.trim()
        : 'Dépense enregistrée via Kouakou';
    const date = this.normalizeDateInput(args.date);

    const dto: Record<string, unknown> = {
      projet_id: projectId,
      montant: amount,
      categorie: categoryInfo.categorie,
      date,
      commentaire: description,
    };

    if (categoryInfo.libelle_categorie) {
      dto.libelle_categorie = categoryInfo.libelle_categorie;
    }

    const depense = await this.financeService.createDepensePonctuelle(dto as any, userId);

    return {
      success: true,
      message: `Dépense de ${amount.toLocaleString('fr-FR')} FCFA enregistrée`,
      data: depense,
    };
  }

  private async handleCreateRevenue(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const amount = this.normalizeAmount(args.amount);
    if (amount === null) {
      return {
        success: false,
        message: 'Montant invalide pour le revenu',
        error: 'amount invalide',
      };
    }

    const source =
      typeof args.source === 'string' && args.source.trim()
        ? args.source.trim()
        : 'vente';
    const description =
      typeof args.description === 'string' && args.description.trim()
        ? args.description.trim()
        : `Revenu: ${source}`;
    const date = this.normalizeDateInput(args.date);
    const categoryInfo = this.mapRevenueCategory(source);

    const dto: Record<string, unknown> = {
      projet_id: projectId,
      montant: amount,
      categorie: categoryInfo.categorie,
      date,
      description,
    };

    if (categoryInfo.libelle_categorie) {
      dto.libelle_categorie = categoryInfo.libelle_categorie;
    }

    const revenu = await this.financeService.createRevenu(dto as any, userId);

    return {
      success: true,
      message: `Revenu de ${amount.toLocaleString('fr-FR')} FCFA enregistré`,
      data: revenu,
    };
  }

  private async handleGetTransactions(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const filterInput =
      args && typeof args === 'object' && 'filter' in args
        ? (args as Record<string, unknown>).filter
        : undefined;
    const filter = this.parseTransactionFilter(filterInput);

    const expenses = await this.financeService.findAllDepensesPonctuelles(projectId, userId);
    const revenues = await this.financeService.findAllRevenus(projectId, userId);

    const transactions: TransactionView[] = [
      ...expenses.map((depense: any) => ({
        id: depense.id,
        type: 'expense' as const,
        amount: Number(depense.montant) || 0,
        category: depense.categorie || 'autre',
        description: depense.commentaire || depense.libelle_categorie || depense.categorie,
        date: depense.date,
      })),
      ...revenues.map((revenu: any) => ({
        id: revenu.id,
        type: 'revenue' as const,
        amount: Number(revenu.montant) || 0,
        category: revenu.categorie || 'vente_autre',
        description: revenu.description || revenu.libelle_categorie || revenu.categorie,
        date: revenu.date,
      })),
    ];

    const filtered = this.applyTransactionFilters(transactions, filter);

    const totalExpenses = filtered
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalRevenues = filtered
      .filter((tx) => tx.type === 'revenue')
      .reduce((sum, tx) => sum + tx.amount, 0);

    filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return {
      success: true,
      message: `J'ai trouvé ${filtered.length} transaction(s).`,
      data: {
        transactions: filtered,
        summary: {
          totalExpenses,
          totalRevenues,
          balance: totalRevenues - totalExpenses,
          appliedFilters: filter,
        },
      },
    };
  }

  private async handleModifyTransaction(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const id = typeof args.id === 'string' ? args.id.trim() : '';
    if (!id) {
      return {
        success: false,
        message: 'Identifiant de transaction manquant',
        error: 'id requis',
      };
    }

    const updates =
      args.updates && typeof args.updates === 'object'
        ? (args.updates as Record<string, unknown>)
        : null;

    if (!updates || Object.keys(updates).length === 0) {
      return {
        success: false,
        message: 'Aucune mise à jour fournie',
        error: 'updates vides',
      };
    }

    if (id.startsWith('depense_')) {
      return this.updateExpenseTransaction(id, updates, userId);
    }
    if (id.startsWith('revenu_')) {
      return this.updateRevenueTransaction(id, updates, userId);
    }

    const typeHint = typeof updates.type === 'string' ? updates.type.toLowerCase() : '';
    if (typeHint.startsWith('dep') || typeHint.startsWith('exp')) {
      return this.updateExpenseTransaction(id, updates, userId);
    }
    if (
      typeHint.startsWith('rev') ||
      typeHint.startsWith('rec') ||
      typeHint.startsWith('inc')
    ) {
      return this.updateRevenueTransaction(id, updates, userId);
    }

    return {
      success: false,
      message: `Impossible d'identifier le type de transaction "${id}"`,
      error: 'type inconnu',
    };
  }

  private async handleSearchKnowledgeBase(
    args: Record<string, unknown>,
    projectId: string,
  ): Promise<FunctionExecutionResult> {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    if (!query) {
      return {
        success: false,
        message: 'La requête est obligatoire pour rechercher dans la base de connaissances',
        error: 'query manquant',
      };
    }

    const category =
      typeof args.category === 'string' && args.category.trim()
        ? args.category.trim()
        : undefined;
    const limit = this.coerceLimit(args.limit);

    try {
      const results = await this.knowledgeBaseService.search({
        query,
        category,
        projet_id: projectId,
        limit,
      });

      return {
        success: true,
        message: `${results.length} résultat(s) trouvé(s)`,
        data: results,
      };
    } catch (error) {
      this.logger.warn('search_knowledge_base: fallback sur searchSimple', error as Error);
      const results = await this.knowledgeBaseService.searchSimple(query, projectId, limit);
      return {
        success: true,
        message: `${results.length} résultat(s) trouvé(s)`,
        data: results,
      };
    }
  }

  private async updateExpenseTransaction(
    id: string,
    updates: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const dto: Record<string, unknown> = {};

    if ('amount' in updates) {
      const amount = this.normalizeAmount(updates.amount);
      if (amount === null) {
        return {
          success: false,
          message: 'Montant invalide pour la dépense',
          error: 'amount invalide',
        };
      }
      dto.montant = amount;
    }

    if (updates.category) {
      const categoryInfo = this.mapExpenseCategory(updates.category);
      dto.categorie = categoryInfo.categorie;
      if (categoryInfo.libelle_categorie) {
        dto.libelle_categorie = categoryInfo.libelle_categorie;
      }
    }

    if (updates.description) {
      dto.commentaire = String(updates.description);
    }

    if (updates.date) {
      dto.date = this.normalizeDateInput(updates.date);
    }

    if (Object.keys(dto).length === 0) {
      return {
        success: false,
        message: 'Aucune donnée valide pour mettre à jour la dépense',
        error: 'updates invalides',
      };
    }

    const depense = await this.financeService.updateDepensePonctuelle(id, dto as any, userId);

    return {
      success: true,
      message: 'Dépense mise à jour avec succès',
      data: depense,
    };
  }

  private async updateRevenueTransaction(
    id: string,
    updates: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    const dto: Record<string, unknown> = {};

    if ('amount' in updates) {
      const amount = this.normalizeAmount(updates.amount);
      if (amount === null) {
        return {
          success: false,
          message: 'Montant invalide pour le revenu',
          error: 'amount invalide',
        };
      }
      dto.montant = amount;
    }

    if (updates.source || updates.category) {
      const categoryInfo = this.mapRevenueCategory(updates.source || updates.category);
      dto.categorie = categoryInfo.categorie;
      if (categoryInfo.libelle_categorie) {
        dto.libelle_categorie = categoryInfo.libelle_categorie;
      }
    }

    if (updates.description) {
      dto.description = String(updates.description);
    }

    if (updates.date) {
      dto.date = this.normalizeDateInput(updates.date);
    }

    if (Object.keys(dto).length === 0) {
      return {
        success: false,
        message: 'Aucune donnée valide pour mettre à jour le revenu',
        error: 'updates invalides',
      };
    }

    const revenu = await this.financeService.updateRevenu(id, dto as any, userId);

    return {
      success: true,
      message: 'Revenu mis à jour avec succès',
      data: revenu,
    };
  }

  private mapExpenseCategory(
    input: unknown,
  ): { categorie: string; libelle_categorie?: string } {
    const normalized = this.normalizeCategoryInput(input);
    if (!normalized) {
      return { categorie: 'autre' };
    }

    if (
      normalized.includes('aliment') ||
      normalized.includes('nourrit') ||
      normalized.includes('feed')
    ) {
      return { categorie: 'alimentation' };
    }
    if (normalized.includes('vaccin')) {
      return { categorie: 'vaccins' };
    }
    if (normalized.includes('medic') || normalized.includes('antibio')) {
      return { categorie: 'medicaments' };
    }
    if (normalized.includes('veto') || normalized.includes('soin')) {
      return { categorie: 'veterinaire' };
    }
    if (normalized.includes('entretien') || normalized.includes('nettoy')) {
      return { categorie: 'entretien' };
    }
    if (normalized.includes('equip') || normalized.includes('materiel')) {
      return { categorie: 'equipements' };
    }
    if (normalized.includes('batiment') || normalized.includes('construction')) {
      return { categorie: 'amenagement_batiment' };
    }
    if (normalized.includes('machine') || normalized.includes('tracteur') || normalized.includes('lourd')) {
      return { categorie: 'equipement_lourd' };
    }
    if (
      normalized.includes('achat') ||
      normalized.includes('porcelet') ||
      normalized.includes('reproducteur') ||
      normalized.includes('truie')
    ) {
      return { categorie: 'achat_sujet' };
    }

    return {
      categorie: 'autre',
      libelle_categorie:
        typeof input === 'string' && input.trim() ? input.trim() : undefined,
    };
  }

  private mapRevenueCategory(
    input: unknown,
  ): { categorie: string; libelle_categorie?: string } {
    const normalized = this.normalizeCategoryInput(input);
    if (!normalized) {
      return { categorie: 'autre' };
    }

    if (normalized.includes('porc') || normalized.includes('vente')) {
      return { categorie: 'vente_porc' };
    }
    if (
      normalized.includes('subvention') ||
      normalized.includes('aide') ||
      normalized.includes('don') ||
      normalized.includes('prime')
    ) {
      return { categorie: 'subvention' };
    }
    if (
      normalized.includes('fumier') ||
      normalized.includes('engrais') ||
      normalized.includes('service') ||
      normalized.includes('prestation') ||
      normalized.includes('location')
    ) {
      return { categorie: 'vente_autre' };
    }

    return {
      categorie: 'autre',
      libelle_categorie:
        typeof input === 'string' && input.trim() ? input.trim() : undefined,
    };
  }

  private normalizeCategoryInput(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private normalizeDateInput(value: unknown): string {
    if (typeof value === 'string' && value.trim()) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }

      const parts = value.trim().split(/[\/\-]/);
      if (parts.length === 3) {
        const [first, second, third] = parts;
        const isYearFirst = first.length === 4;
        const year = isYearFirst ? first : third.length === 4 ? third : `20${third}`;
        const month = isYearFirst ? second : first;
        const day = isYearFirst ? third : second;
        const fallback = new Date(
          `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        );
        if (!Number.isNaN(fallback.getTime())) {
          return fallback.toISOString().split('T')[0];
        }
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  private normalizeAmount(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.round(value * 100) / 100;
    }
    if (typeof value === 'string') {
      const sanitized = Number(
        value.replace(/[^0-9,.-]/g, '').replace(',', '.'),
      );
      if (!Number.isNaN(sanitized)) {
        return Math.round(sanitized * 100) / 100;
      }
    }
    return null;
  }

  private parseTransactionFilter(rawFilter: unknown): TransactionFilter | undefined {
    if (!rawFilter || typeof rawFilter !== 'object') {
      return undefined;
    }

    const obj = rawFilter as Record<string, unknown>;
    const filter: TransactionFilter = {};

    if (typeof obj.type === 'string') {
      const normalized = obj.type.toLowerCase();
      if (normalized.startsWith('dep') || normalized.startsWith('exp')) {
        filter.type = 'expense';
      } else if (
        normalized.startsWith('rev') ||
        normalized.startsWith('rec') ||
        normalized.startsWith('inc')
      ) {
        filter.type = 'revenue';
      }
    }

    if (typeof obj.category === 'string' && obj.category.trim()) {
      filter.category = obj.category.trim();
    }

    if (obj.dateRange) {
      filter.dateRange = this.parseDateRange(obj.dateRange);
    }

    return Object.keys(filter).length ? filter : undefined;
  }

  private parseDateRange(value: unknown): { from?: string; to?: string } | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      const now = new Date();
      const from = new Date(now);

      if (normalized.includes('7')) {
        from.setDate(from.getDate() - 7);
      } else if (normalized.includes('30') || normalized.includes('mois')) {
        from.setDate(from.getDate() - 30);
      } else if (normalized.includes('90')) {
        from.setDate(from.getDate() - 90);
      } else {
        return undefined;
      }

      return {
        from: from.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      };
    }

    if (typeof value === 'object') {
      const range = value as Record<string, unknown>;
      const from = this.tryParseDate(range.from ?? range.start);
      const to = this.tryParseDate(range.to ?? range.end);
      if (from || to) {
        return { from, to };
      }
    }

    return undefined;
  }

  private tryParseDate(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return undefined;
  }

  private applyTransactionFilters(
    transactions: TransactionView[],
    filter?: TransactionFilter,
  ): TransactionView[] {
    if (!filter) {
      return [...transactions];
    }

    return transactions.filter((tx) => {
      if (filter.type && tx.type !== filter.type) {
        return false;
      }
      if (filter.category && tx.category !== filter.category) {
        return false;
      }
      if (filter.dateRange) {
        const txDate = new Date(tx.date);
        if (filter.dateRange.from) {
          const from = new Date(filter.dateRange.from);
          if (txDate < from) {
            return false;
          }
        }
        if (filter.dateRange.to) {
          const to = new Date(filter.dateRange.to);
          to.setHours(23, 59, 59, 999);
          if (txDate > to) {
            return false;
          }
        }
      }
      return true;
    });
  }

  private coerceLimit(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(Math.max(Math.round(value), 1), 10);
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return Math.min(Math.max(Math.round(parsed), 1), 10);
      }
    }
    return 5;
  }

  // ═══════════════════════════════════════════════════════════
  // HANDLERS NOUVEAUX (19 fonctions)
  // ═══════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────
  // Finance
  // ───────────────────────────────────────────────────────────

  private async handleGetFinancialSummary(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const period = typeof args.period === 'string' ? args.period : 'month';
      
      // Calculer les dates selon la période
      const maintenant = new Date();
      let dateDebut: string | undefined;
      let dateFin: string | undefined;

      switch (period.toLowerCase()) {
        case 'month':
          dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString().split('T')[0];
          dateFin = maintenant.toISOString().split('T')[0];
          break;
        case 'quarter':
          const quarter = Math.floor(maintenant.getMonth() / 3);
          dateDebut = new Date(maintenant.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
          dateFin = maintenant.toISOString().split('T')[0];
          break;
        case 'year':
          dateDebut = new Date(maintenant.getFullYear(), 0, 1).toISOString().split('T')[0];
          dateFin = maintenant.toISOString().split('T')[0];
          break;
        case 'all':
        default:
          dateDebut = undefined;
          dateFin = undefined;
          break;
      }

      const bilan = await this.financeService.getBilanComplet(projectId, userId, dateDebut, dateFin);

      return {
        success: true,
        message: `Bilan financier (période: ${period})`,
        data: bilan,
      };
    } catch (error) {
      this.logger.error('Erreur get_financial_summary', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération du bilan financier',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreateFixedCharge(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const amount = this.normalizeAmount(args.amount);
      if (amount === null) {
        return {
          success: false,
          message: 'Montant invalide pour la charge fixe',
          error: 'amount invalide',
        };
      }

      const category = typeof args.category === 'string' ? args.category.trim() : '';
      if (!category) {
        return {
          success: false,
          message: 'Catégorie requise pour la charge fixe',
          error: 'category requis',
        };
      }

      const description = typeof args.description === 'string' ? args.description.trim() : 'Charge fixe';
      const frequency = typeof args.frequency === 'string' ? args.frequency.toLowerCase() : 'monthly';
      
      // Mapper frequency vers le format attendu par le DTO
      const frequenceMap: Record<string, string> = {
        monthly: 'mensuel',
        quarterly: 'trimestriel',
        yearly: 'annuel',
      };
      const frequence = frequenceMap[frequency] || 'mensuel';

      const dateDebut = new Date().toISOString().split('T')[0];

      const dto = {
        projet_id: projectId,
        categorie: category,
        libelle: description,
        montant: amount,
        date_debut: dateDebut,
        frequence,
      };

      const charge = await this.financeService.createChargeFixe(dto, userId);

      return {
        success: true,
        message: `Charge fixe créée: ${description} (${amount} FCFA/${frequency})`,
        data: charge,
      };
    } catch (error) {
      this.logger.error('Erreur create_fixed_charge', error);
      return {
        success: false,
        message: 'Erreur lors de la création de la charge fixe',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGenerateFinancialGraph(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const graphType = typeof args.graphType === 'string' ? args.graphType : 'revenue_expenses';
      const period = typeof args.period === 'string' ? args.period : 'month';

      // Pour l'instant, on retourne les données brutes du bilan
      // Le frontend générera le graphique
      const bilan = await this.financeService.getBilanComplet(projectId, userId);

      return {
        success: true,
        message: `Données pour graphique ${graphType} (période: ${period})`,
        data: {
          graphType,
          period,
          bilan,
        },
      };
    } catch (error) {
      this.logger.error('Erreur generate_financial_graph', error);
      return {
        success: false,
        message: 'Erreur lors de la génération du graphique financier',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  // ───────────────────────────────────────────────────────────
  // Finance - Phase 1 (Update/Delete/Query)
  // ───────────────────────────────────────────────────────────

  private async handleUpdateRevenue(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const id = typeof args.id === 'string' ? args.id.trim() : '';
      if (!id) {
        return {
          success: false,
          message: 'ID du revenu manquant',
          error: 'id requis',
        };
      }

      const updates = args.updates as Record<string, unknown> | undefined;
      if (!updates || typeof updates !== 'object') {
        return {
          success: false,
          message: 'Données de mise à jour manquantes',
          error: 'updates requis',
        };
      }

      return await this.updateRevenueTransaction(id, updates, userId);
    } catch (error) {
      this.logger.error('Erreur update_revenue', error);
      return {
        success: false,
        message: 'Erreur lors de la mise à jour du revenu',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleDeleteRevenue(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const id = typeof args.id === 'string' ? args.id.trim() : '';
      if (!id) {
        return {
          success: false,
          message: 'ID du revenu manquant',
          error: 'id requis',
        };
      }

      await this.financeService.deleteRevenu(id, userId);

      return {
        success: true,
        message: 'Revenu supprimé avec succès',
        data: { id },
      };
    } catch (error) {
      this.logger.error('Erreur delete_revenue', error);
      return {
        success: false,
        message: 'Erreur lors de la suppression du revenu',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleUpdateExpense(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const id = typeof args.id === 'string' ? args.id.trim() : '';
      if (!id) {
        return {
          success: false,
          message: 'ID de la dépense manquant',
          error: 'id requis',
        };
      }

      const updates = args.updates as Record<string, unknown> | undefined;
      if (!updates || typeof updates !== 'object') {
        return {
          success: false,
          message: 'Données de mise à jour manquantes',
          error: 'updates requis',
        };
      }

      return await this.updateExpenseTransaction(id, updates, userId);
    } catch (error) {
      this.logger.error('Erreur update_expense', error);
      return {
        success: false,
        message: 'Erreur lors de la mise à jour de la dépense',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleDeleteExpense(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const id = typeof args.id === 'string' ? args.id.trim() : '';
      if (!id) {
        return {
          success: false,
          message: 'ID de la dépense manquant',
          error: 'id requis',
        };
      }

      await this.financeService.deleteDepensePonctuelle(id, userId);

      return {
        success: true,
        message: 'Dépense supprimée avec succès',
        data: { id },
      };
    } catch (error) {
      this.logger.error('Erreur delete_expense', error);
      return {
        success: false,
        message: 'Erreur lors de la suppression de la dépense',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetVentes(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const allRevenus = await this.financeService.findAllRevenus(projectId, userId);

      // Filtrer uniquement les ventes (categorie = vente_porc ou vente_autre)
      let ventes = allRevenus.filter(
        (r) => r.categorie === 'vente_porc' || r.categorie === 'vente_autre',
      );

      // Filtrer par date si fourni
      if (args.dateDebut && typeof args.dateDebut === 'string') {
        const dateDebut = new Date(args.dateDebut);
        ventes = ventes.filter((v) => new Date(v.date) >= dateDebut);
      }
      if (args.dateFin && typeof args.dateFin === 'string') {
        const dateFin = new Date(args.dateFin);
        ventes = ventes.filter((v) => new Date(v.date) <= dateFin);
      }

      // Filtrer par catégorie si fourni
      if (args.category && typeof args.category === 'string') {
        ventes = ventes.filter((v) => v.categorie === args.category);
      }

      const total = ventes.reduce((sum, v) => sum + v.montant, 0);

      return {
        success: true,
        message: `${ventes.length} vente(s) trouvée(s) pour un total de ${total.toLocaleString('fr-FR')} FCFA`,
        data: {
          count: ventes.length,
          total,
          ventes,
        },
      };
    } catch (error) {
      this.logger.error('Erreur get_ventes', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des ventes',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleAnalyzeVentes(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const allRevenus = await this.financeService.findAllRevenus(projectId, userId);
      const ventes = allRevenus.filter(
        (r) => r.categorie === 'vente_porc' || r.categorie === 'vente_autre',
      );

      if (ventes.length === 0) {
        return {
          success: true,
          message: 'Aucune vente trouvée',
          data: { count: 0, total: 0, average: 0, median: 0 },
        };
      }

      const montants = ventes.map((v) => v.montant).sort((a, b) => a - b);
      const total = montants.reduce((sum, m) => sum + m, 0);
      const average = total / ventes.length;
      const median =
        montants.length % 2 === 0
          ? (montants[montants.length / 2 - 1] + montants[montants.length / 2]) / 2
          : montants[Math.floor(montants.length / 2)];

      // Calculer par catégorie
      const byCategory: Record<string, { count: number; total: number }> = {};
      ventes.forEach((v) => {
        if (!byCategory[v.categorie]) {
          byCategory[v.categorie] = { count: 0, total: 0 };
        }
        byCategory[v.categorie].count++;
        byCategory[v.categorie].total += v.montant;
      });

      return {
        success: true,
        message: `Analyse des ventes : ${ventes.length} vente(s), total ${total.toLocaleString('fr-FR')} FCFA, moyenne ${average.toLocaleString('fr-FR')} FCFA`,
        data: {
          count: ventes.length,
          total,
          average,
          median,
          byCategory,
        },
      };
    } catch (error) {
      this.logger.error('Erreur analyze_ventes', error);
      return {
        success: false,
        message: 'Erreur lors de l\'analyse des ventes',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetDettesEnCours(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const dettes = await this.financeService.findAllDettes(projectId, userId);

      // Filtrer uniquement les dettes en cours (montant_restant > 0)
      const dettesEnCours = dettes.filter((d) => d.montant_restant > 0);
      const total = dettesEnCours.reduce((sum, d) => sum + d.montant_restant, 0);

      return {
        success: true,
        message: `${dettesEnCours.length} dette(s) en cours pour un total de ${total.toLocaleString('fr-FR')} FCFA`,
        data: {
          count: dettesEnCours.length,
          total,
          dettes: dettesEnCours,
        },
      };
    } catch (error) {
      this.logger.error('Erreur get_dettes_en_cours', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des dettes',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleDescribeGraphTrends(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const bilan = await this.financeService.getBilanComplet(projectId, userId);
      const graphType = typeof args.graphType === 'string' ? args.graphType : 'revenue_expenses';
      const period = typeof args.period === 'string' ? args.period : 'month';

      let description = '';
      const revenus = bilan.revenus?.total || 0;
      const depenses = bilan.depenses?.total || 0;
      
      if (graphType === 'revenue_expenses') {
        const profit = revenus - depenses;
        description = `Revenus: ${revenus.toLocaleString('fr-FR')} FCFA, Dépenses: ${depenses.toLocaleString('fr-FR')} FCFA, Bénéfice: ${profit.toLocaleString('fr-FR')} FCFA`;
      } else if (graphType === 'profit_evolution') {
        const profit = revenus - depenses;
        description = `Évolution du bénéfice: ${profit.toLocaleString('fr-FR')} FCFA`;
      } else if (graphType === 'expense_breakdown') {
        description = `Répartition des dépenses par catégorie (total: ${depenses.toLocaleString('fr-FR')} FCFA)`;
      }

      return {
        success: true,
        message: description,
        data: {
          graphType,
          period,
          bilan,
        },
      };
    } catch (error) {
      this.logger.error('Erreur describe_graph_trends', error);
      return {
        success: false,
        message: 'Erreur lors de la description des tendances',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  // ───────────────────────────────────────────────────────────
  // Production & Santé - Phase 2 (Update/Query)
  // ───────────────────────────────────────────────────────────

  private async handleUpdateWeighing(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const id = typeof args.id === 'string' ? args.id.trim() : '';
      if (!id) {
        return {
          success: false,
          message: 'ID de la pesée manquant',
          error: 'id requis',
        };
      }

      const updates = args.updates as Record<string, unknown> | undefined;
      if (!updates || typeof updates !== 'object') {
        return {
          success: false,
          message: 'Données de mise à jour manquantes',
          error: 'updates requis',
        };
      }

      const dto: Record<string, unknown> = {};
      if ('weight' in updates) {
        dto.poids_kg = typeof updates.weight === 'number' ? updates.weight : null;
      }
      if ('date' in updates) {
        dto.date = typeof updates.date === 'string' ? updates.date : null;
      }
      if ('notes' in updates) {
        dto.commentaire = typeof updates.notes === 'string' ? updates.notes : null;
      }

      const pesee = await this.productionService.updatePesee(id, dto as any, userId);

      return {
        success: true,
        message: 'Pesée mise à jour avec succès',
        data: pesee,
      };
    } catch (error) {
      this.logger.error('Erreur update_weighing', error);
      return {
        success: false,
        message: 'Erreur lors de la mise à jour de la pesée',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleUpdateVaccination(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const id = typeof args.id === 'string' ? args.id.trim() : '';
      if (!id) {
        return {
          success: false,
          message: 'ID de la vaccination manquant',
          error: 'id requis',
        };
      }

      const updates = args.updates as Record<string, unknown> | undefined;
      if (!updates || typeof updates !== 'object') {
        return {
          success: false,
          message: 'Données de mise à jour manquantes',
          error: 'updates requis',
        };
      }

      const dto: Record<string, unknown> = {};
      if ('vaccine' in updates) {
        dto.produit_administre = typeof updates.vaccine === 'string' ? updates.vaccine : null;
      }
      if ('date' in updates) {
        dto.date_vaccination = typeof updates.date === 'string' ? updates.date : null;
      }
      if ('nextDueDate' in updates) {
        dto.date_rappel = typeof updates.nextDueDate === 'string' ? updates.nextDueDate : null;
      }

      const vaccination = await this.santeService.updateVaccination(id, dto as any, userId);

      return {
        success: true,
        message: 'Vaccination mise à jour avec succès',
        data: vaccination,
      };
    } catch (error) {
      this.logger.error('Erreur update_vaccination', error);
      return {
        success: false,
        message: 'Erreur lors de la mise à jour de la vaccination',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleUpdateVetVisit(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const id = typeof args.id === 'string' ? args.id.trim() : '';
      if (!id) {
        return {
          success: false,
          message: 'ID de la visite vétérinaire manquant',
          error: 'id requis',
        };
      }

      const updates = args.updates as Record<string, unknown> | undefined;
      if (!updates || typeof updates !== 'object') {
        return {
          success: false,
          message: 'Données de mise à jour manquantes',
          error: 'updates requis',
        };
      }

      const dto: Record<string, unknown> = {};
      if ('date' in updates) {
        dto.date_visite = typeof updates.date === 'string' ? updates.date : null;
      }
      if ('veterinarian' in updates) {
        dto.veterinaire = typeof updates.veterinarian === 'string' ? updates.veterinarian : null;
      }
      if ('reason' in updates) {
        dto.motif = typeof updates.reason === 'string' ? updates.reason : null;
      }
      if ('diagnosis' in updates) {
        dto.diagnostic = typeof updates.diagnosis === 'string' ? updates.diagnosis : null;
      }

      const visite = await this.santeService.updateVisiteVeterinaire(id, dto as any, userId);

      return {
        success: true,
        message: 'Visite vétérinaire mise à jour avec succès',
        data: visite,
      };
    } catch (error) {
      this.logger.error('Erreur update_vet_visit', error);
      return {
        success: false,
        message: 'Erreur lors de la mise à jour de la visite vétérinaire',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetWeighingDetails(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const animalId = typeof args.animalId === 'string' ? args.animalId.trim() : undefined;
      
      let pesees: any[];
      if (animalId) {
        pesees = await this.productionService.findPeseesByAnimal(animalId, userId);
      } else {
        pesees = await this.productionService.findPeseesByProjet(projectId, userId);
      }

      // Filtrer par date si fourni
      if (args.dateDebut && typeof args.dateDebut === 'string') {
        const dateDebut = new Date(args.dateDebut);
        pesees = pesees.filter((p) => new Date(p.date) >= dateDebut);
      }
      if (args.dateFin && typeof args.dateFin === 'string') {
        const dateFin = new Date(args.dateFin);
        pesees = pesees.filter((p) => new Date(p.date) <= dateFin);
      }

      return {
        success: true,
        message: `${pesees.length} pesée(s) trouvée(s)`,
        data: {
          count: pesees.length,
          pesees,
        },
      };
    } catch (error) {
      this.logger.error('Erreur get_weighing_details', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des pesées',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetCheptelDetails(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      // Utilise getProjetStats qui retourne déjà les détails du cheptel
      const stats = await this.productionService.getProjetStats(projectId, userId);

      return {
        success: true,
        message: 'Détails du cheptel récupérés',
        data: stats,
      };
    } catch (error) {
      this.logger.error('Erreur get_cheptel_details', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des détails du cheptel',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleSearchLot(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const code = typeof args.code === 'string' ? args.code.trim() : '';
      if (!code) {
        return {
          success: false,
          message: 'Code du lot manquant',
          error: 'code requis',
        };
      }

      // Utilise findAllAnimals avec filtre par code
      const animaux = await this.productionService.findAllAnimals(projectId, userId, true, undefined, undefined, code);

      return {
        success: true,
        message: `${animaux.length} animal(aux) trouvé(s) pour le lot ${code}`,
        data: {
          code,
          count: animaux.length,
          animaux,
        },
      };
    } catch (error) {
      this.logger.error('Erreur search_lot', error);
      return {
        success: false,
        message: 'Erreur lors de la recherche du lot',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetReminders(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      // Utilise genererRappelsAutomatiques (déjà utilisé via get_health_reminders)
      const result = await this.santeService.genererRappelsAutomatiques(projectId, userId);

      return {
        success: true,
        message: `${result.rappels_crees} rappel(s) généré(s)`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Erreur get_reminders', error);
      return {
        success: false,
        message: 'Erreur lors de la génération des rappels',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  // ───────────────────────────────────────────────────────────
  // Phase 3 - Actions Simples (Statistiques, Marketplace, etc.)
  // ───────────────────────────────────────────────────────────

  private async handleDescribeCapabilities(
    args: Record<string, unknown>,
  ): Promise<FunctionExecutionResult> {
    return {
      success: true,
      message: `Je suis Kouakou, votre assistant intelligent pour la gestion d'élevage porcin. Je peux vous aider avec :
      
📊 **FINANCES** : Enregistrer des dépenses et revenus, consulter le bilan, analyser les coûts
🏥 **SANTÉ** : Gérer les vaccinations, traitements, visites vétérinaires, rappels
🐷 **PRODUCTION** : Gérer les animaux, pesées, recherche de lots
💰 **MARKETPLACE** : Vendre des animaux, consulter les prix, gérer les offres
📚 **CONNAISSANCES** : Répondre à vos questions sur l'élevage porcin
🔬 **STATISTIQUES** : Analyser les données de votre élevage

Je peux également effectuer des recherches web pour obtenir des informations à jour. Que puis-je faire pour vous ?`,
      data: {
        capabilities: [
          'Gestion financière complète',
          'Suivi de santé des animaux',
          'Gestion de la production',
          'Vente sur le marketplace',
          'Recherche dans la base de connaissances',
          'Recherche web pour informations actualisées',
          'Analyse de statistiques',
        ],
      },
    };
  }

  private async handleAnswerKnowledgeQuestion(
    args: Record<string, unknown>,
    projectId: string,
  ): Promise<FunctionExecutionResult> {
    const question = typeof args.question === 'string' ? args.question.trim() : '';
    if (!question) {
      return {
        success: false,
        message: 'Question manquante',
        error: 'question requis',
      };
    }

    const category = typeof args.category === 'string' ? args.category.trim() : undefined;

    // Utilise search_knowledge_base (déjà implémenté)
    return await this.handleSearchKnowledgeBase(
      {
        query: question,
        category,
      },
      projectId,
    );
  }

  private async handleGetStatistics(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      // Utilise getProjetStats (similaire à get_project_stats)
      const stats = await this.productionService.getProjetStats(projectId, userId);

      return {
        success: true,
        message: 'Statistiques générales du projet récupérées',
        data: stats,
      };
    } catch (error) {
      this.logger.error('Erreur get_statistics', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCalculateCosts(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const dateDebut = typeof args.dateDebut === 'string' ? args.dateDebut : undefined;
      const dateFin = typeof args.dateFin === 'string' ? args.dateFin : undefined;

      const bilan = await this.financeService.getBilanComplet(projectId, userId, dateDebut, dateFin);

      const totalDepenses = bilan.depenses?.total || 0;
      const totalRevenus = bilan.revenus?.total || 0;
      const benefice = totalRevenus - totalDepenses;

      return {
        success: true,
        message: `Coûts calculés : Dépenses ${totalDepenses.toLocaleString('fr-FR')} FCFA, Revenus ${totalRevenus.toLocaleString('fr-FR')} FCFA, Bénéfice ${benefice.toLocaleString('fr-FR')} FCFA`,
        data: {
          depenses: totalDepenses,
          revenus: totalRevenus,
          benefice,
          bilan,
        },
      };
    } catch (error) {
      this.logger.error('Erreur calculate_costs', error);
      return {
        success: false,
        message: 'Erreur lors du calcul des coûts',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleMarketplaceSetPrice(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const listingId = typeof args.listingId === 'string' ? args.listingId.trim() : '';
      if (!listingId) {
        return {
          success: false,
          message: 'ID de l\'annonce manquant',
          error: 'listingId requis',
        };
      }

      const pricePerKg = typeof args.pricePerKg === 'number' ? args.pricePerKg : null;
      if (pricePerKg === null || pricePerKg <= 0) {
        return {
          success: false,
          message: 'Prix par kg invalide',
          error: 'pricePerKg requis et doit être > 0',
        };
      }

      // Utilise updateListing (similaire à update_listing_price)
      const listing = await this.marketplaceService.updateListing(listingId, {
        price_per_kg: pricePerKg,
      } as any, userId);

      return {
        success: true,
        message: `Prix de l'annonce mis à jour : ${pricePerKg.toLocaleString('fr-FR')} FCFA/kg`,
        data: listing,
      };
    } catch (error) {
      this.logger.error('Erreur marketplace_set_price', error);
      return {
        success: false,
        message: 'Erreur lors de la mise à jour du prix',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleMarketplaceSellAnimal(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const listingId = typeof args.listingId === 'string' ? args.listingId.trim() : '';
      const buyerId = typeof args.buyerId === 'string' ? args.buyerId.trim() : '';
      const finalPrice = typeof args.finalPrice === 'number' ? args.finalPrice : null;

      if (!listingId || !buyerId || finalPrice === null || finalPrice <= 0) {
        return {
          success: false,
          message: 'Données incomplètes (listingId, buyerId, finalPrice requis)',
          error: 'paramètres invalides',
        };
      }

      // Utilise completeSale
      const result = await this.marketplaceService.completeSale({
        listingId,
        buyerId,
        finalPrice,
      } as any, userId);

      return {
        success: true,
        message: `Vente finalisée : ${finalPrice.toLocaleString('fr-FR')} FCFA`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Erreur marketplace_sell_animal', error);
      return {
        success: false,
        message: 'Erreur lors de la finalisation de la vente',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreateIngredient(
    args: Record<string, unknown>,
  ): Promise<FunctionExecutionResult> {
    try {
      const nom = typeof args.nom === 'string' ? args.nom.trim() : '';
      const categorie = typeof args.categorie === 'string' ? args.categorie.trim() : '';
      const prix_unitaire = typeof args.prix_unitaire === 'number' ? args.prix_unitaire : undefined;

      if (!nom || !categorie) {
        return {
          success: false,
          message: 'Nom et catégorie requis',
          error: 'nom et categorie requis',
        };
      }

      const ingredient = await this.nutritionService.createIngredient({
        nom,
        categorie,
        prix_unitaire,
        unite: 'kg', // Par défaut
      } as any);

      return {
        success: true,
        message: `Ingrédient "${nom}" créé avec succès`,
        data: ingredient,
      };
    } catch (error) {
      this.logger.error('Erreur create_ingredient', error);
      return {
        success: false,
        message: 'Erreur lors de la création de l\'ingrédient',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetStockStatus(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      // Utilise findAllStocksAliments
      const stocks = await this.nutritionService.findAllStocksAliments(projectId, userId);

      const total = stocks.reduce((sum, s) => sum + (s.quantite_actuelle || 0), 0);
      const faibleStock = stocks.filter((s) => (s.quantite_actuelle || 0) < (s.seuil_alerte || 0));

      return {
        success: true,
        message: `${stocks.length} stock(s) trouvé(s), ${faibleStock.length} en faible stock`,
        data: {
          count: stocks.length,
          total,
          faibleStock: faibleStock.length,
          stocks,
        },
      };
    } catch (error) {
      this.logger.error('Erreur get_stock_status', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des stocks',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetGestations(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const allGestations = await this.reproductionService.findAllGestations(projectId, userId);
      const statut = typeof args.statut === 'string' ? args.statut : undefined;

      let gestations = allGestations;
      if (statut) {
        gestations = allGestations.filter((g) => g.statut === statut);
      }

      return {
        success: true,
        message: `${gestations.length} gestation(s) trouvée(s)`,
        data: {
          count: gestations.length,
          gestations,
        },
      };
    } catch (error) {
      this.logger.error('Erreur get_gestations', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des gestations',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetGestationByTruie(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const truieId = typeof args.truieId === 'string' ? args.truieId.trim() : '';
      if (!truieId) {
        return {
          success: false,
          message: 'ID de la truie manquant',
          error: 'truieId requis',
        };
      }

      const allGestations = await this.reproductionService.findAllGestations(projectId, userId);
      const gestation = allGestations.find((g) => g.truie_id === truieId && g.statut === 'en_cours');

      if (!gestation) {
        return {
          success: false,
          message: 'Aucune gestation en cours trouvée pour cette truie',
          error: 'gestation introuvable',
        };
      }

      return {
        success: true,
        message: 'Gestation trouvée',
        data: gestation,
      };
    } catch (error) {
      this.logger.error('Erreur get_gestation_by_truie', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération de la gestation',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetMortalites(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const mortalites = await this.mortalitesService.findAll(projectId, userId);

      // Filtrer par date si fourni
      let filtered = mortalites;
      if (args.dateDebut && typeof args.dateDebut === 'string') {
        const dateDebut = new Date(args.dateDebut);
        filtered = filtered.filter((m) => new Date(m.date) >= dateDebut);
      }
      if (args.dateFin && typeof args.dateFin === 'string') {
        const dateFin = new Date(args.dateFin);
        filtered = filtered.filter((m) => new Date(m.date) <= dateFin);
      }

      return {
        success: true,
        message: `${filtered.length} mortalité(s) trouvée(s)`,
        data: {
          count: filtered.length,
          mortalites: filtered,
        },
      };
    } catch (error) {
      this.logger.error('Erreur get_mortalites', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des mortalités',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetTauxMortalite(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const stats = await this.mortalitesService.getStatistiques(projectId, userId);

      return {
        success: true,
        message: `Taux de mortalité : ${stats.taux_mortalite?.toFixed(2) || 0}%`,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Erreur get_taux_mortalite', error);
      return {
        success: false,
        message: 'Erreur lors du calcul du taux de mortalité',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleAnalyzeCausesMortalite(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const mortalites = await this.mortalitesService.findAll(projectId, userId);

      // Filtrer par date si fourni
      let filtered = mortalites;
      if (args.dateDebut && typeof args.dateDebut === 'string') {
        const dateDebut = new Date(args.dateDebut);
        filtered = filtered.filter((m) => new Date(m.date) >= dateDebut);
      }
      if (args.dateFin && typeof args.dateFin === 'string') {
        const dateFin = new Date(args.dateFin);
        filtered = filtered.filter((m) => new Date(m.date) <= dateFin);
      }

      // Analyser les causes
      const causes: Record<string, number> = {};
      filtered.forEach((m) => {
        const cause = m.cause || 'Non spécifiée';
        causes[cause] = (causes[cause] || 0) + (m.nombre_porcs || 1);
      });

      return {
        success: true,
        message: `Analyse des causes de mortalité : ${Object.keys(causes).length} cause(s) identifiée(s)`,
        data: {
          total: filtered.length,
          causes,
          mortalites: filtered,
        },
      };
    } catch (error) {
      this.logger.error('Erreur analyze_causes_mortalite', error);
      return {
        success: false,
        message: 'Erreur lors de l\'analyse des causes de mortalité',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handlePredictMiseBas(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      let gestation: any = null;

      if (args.gestationId && typeof args.gestationId === 'string') {
        const gestations = await this.reproductionService.findAllGestations(projectId, userId);
        gestation = gestations.find((g) => g.id === args.gestationId);
      } else if (args.truieId && typeof args.truieId === 'string') {
        const gestations = await this.reproductionService.findAllGestations(projectId, userId);
        gestation = gestations.find((g) => g.truie_id === args.truieId && g.statut === 'en_cours');
      }

      if (!gestation) {
        return {
          success: false,
          message: 'Gestation introuvable',
          error: 'gestation introuvable',
        };
      }

      const dateMiseBas = gestation.date_mise_bas_prevue || gestation.date_mise_bas_reelle;
      const joursRestants = dateMiseBas
        ? Math.ceil((new Date(dateMiseBas).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        success: true,
        message: `Date de mise bas prévue : ${dateMiseBas || 'Non calculée'}${joursRestants !== null ? ` (${joursRestants} jours)` : ''}`,
        data: {
          gestation,
          date_mise_bas_prevue: dateMiseBas,
          jours_restants: joursRestants,
        },
      };
    } catch (error) {
      this.logger.error('Erreur predict_mise_bas', error);
      return {
        success: false,
        message: 'Erreur lors de la prédiction de mise bas',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetPorcelets(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      // Utilise findAllSevrages (les porcelets sont dans les sevrages)
      const sevrages = await this.reproductionService.findAllSevrages(projectId, userId);

      let porcelets = sevrages;
      
      // Filtrer par âge si fourni (en jours depuis sevrage)
      if (args.age && typeof args.age === 'number') {
        const age = args.age;
        const now = Date.now();
        porcelets = sevrages.filter((s) => {
          const joursSevrage = Math.floor((now - new Date(s.date_sevrage).getTime()) / (1000 * 60 * 60 * 24));
          return Math.abs(joursSevrage - age) < 7; // ±7 jours de tolérance
        });
      }

      const totalPorcelets = porcelets.reduce((sum, s) => sum + (s.nombre_porcelets_sevres || 0), 0);

      return {
        success: true,
        message: `${totalPorcelets} porcelet(s) trouvé(s) dans ${porcelets.length} sevrage(s)`,
        data: {
          count: totalPorcelets,
          sevrages: porcelets,
        },
      };
    } catch (error) {
      this.logger.error('Erreur get_porcelets', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des porcelets',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetPorceletsTransition(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      // Porcelets en transition = sevrés récemment (moins de 30 jours)
      const sevrages = await this.reproductionService.findAllSevrages(projectId, userId);
      const now = Date.now();
      const trenteJours = 30 * 24 * 60 * 60 * 1000;

      const porceletsTransition = sevrages.filter((s) => {
        const joursSevrage = now - new Date(s.date_sevrage).getTime();
        return joursSevrage <= trenteJours;
      });

      const total = porceletsTransition.reduce((sum, s) => sum + (s.nombre_porcelets_sevres || 0), 0);

      return {
        success: true,
        message: `${total} porcelet(s) en transition trouvé(s)`,
        data: {
          count: total,
          sevrages: porceletsTransition,
        },
      };
    } catch (error) {
      this.logger.error('Erreur get_porcelets_transition', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des porcelets en transition',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleProposeCompositionAlimentaire(
    args: Record<string, unknown>,
  ): Promise<FunctionExecutionResult> {
    try {
      const typeAnimal = typeof args.type_animal === 'string' ? args.type_animal.toLowerCase() : '';
      const age = typeof args.age === 'number' ? args.age : undefined;
      const poids = typeof args.poids === 'number' ? args.poids : undefined;

      // Récupérer les ingrédients disponibles
      const ingredients = await this.nutritionService.findAllIngredients();

      // Composition de base selon le type d'animal
      let composition = '';
      if (typeAnimal.includes('porcelet')) {
        composition = 'Pour les porcelets (0-8 semaines), utilisez un aliment starter riche en protéines (18-20%) et facilement digestible.';
      } else if (typeAnimal.includes('truie')) {
        composition = 'Pour les truies, adaptez selon le stade : gestation (14% protéines) ou lactation (16-18% protéines).';
      } else if (typeAnimal.includes('verrat') || typeAnimal.includes('mâle')) {
        composition = 'Pour les verrats, utilisez un aliment de maintenance avec 12-14% de protéines.';
      } else {
        composition = 'Pour les porcs en croissance/finition, utilisez un aliment avec 16% de protéines.';
      }

      return {
        success: true,
        message: composition,
        data: {
          type_animal: typeAnimal,
          age,
          poids,
          composition,
          ingredients_disponibles: ingredients.length,
        },
      };
    } catch (error) {
      this.logger.error('Erreur propose_composition_alimentaire', error);
      return {
        success: false,
        message: 'Erreur lors de la proposition de composition',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCalculateConsommationMoyenne(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      // Récupérer les mouvements de stock pour calculer la consommation
      // Note: Cette méthode nécessiterait une méthode spécifique dans NutritionService
      // Pour l'instant, retourner un message informatif
      return {
        success: true,
        message: 'Calcul de consommation moyenne - Fonctionnalité en développement. Utilisez les données de stock pour estimer.',
        data: {
          note: 'Cette fonctionnalité nécessite le suivi des sorties de stock par période.',
        },
      };
    } catch (error) {
      this.logger.error('Erreur calculate_consommation_moyenne', error);
      return {
        success: false,
        message: 'Erreur lors du calcul de la consommation moyenne',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreerLoge(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const nom = typeof args.nom === 'string' ? args.nom.trim() : '';
      const capacite = typeof args.capacite === 'number' ? args.capacite : undefined;

      if (!nom) {
        return {
          success: false,
          message: 'Nom de la loge requis',
          error: 'nom requis',
        };
      }

      // Utilise createBatchWithPigs avec une population vide
      const batch = await this.batchPigsService.createBatchWithPigs({
        projet_id: projectId,
        pen_name: nom,
        position: 'droite', // Par défaut
        category: 'gestion',
        population: {
          male_count: 0,
          female_count: 0,
          castrated_count: 0,
        },
      } as any, userId);

      return {
        success: true,
        message: `Loge "${nom}" créée avec succès`,
        data: batch,
      };
    } catch (error) {
      this.logger.error('Erreur creer_loge', error);
      return {
        success: false,
        message: 'Erreur lors de la création de la loge',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleDeplacerAnimaux(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const animalIds = Array.isArray(args.animalIds) ? args.animalIds.map(String) : [];
      const logeDestination = typeof args.loge_destination === 'string' ? args.loge_destination.trim() : '';

      if (animalIds.length === 0 || !logeDestination) {
        return {
          success: false,
          message: 'IDs des animaux et loge de destination requis',
          error: 'animalIds et loge_destination requis',
        };
      }

      // Pour chaque animal, utiliser transferPig
      // Note: transferPig prend un pig_id et un batch_id
      // Il faudra d'abord trouver le batch_id à partir du nom de loge
      const batches = await this.batchPigsService.getAllBatchesByProjet(projectId, userId);
      const batchDest = batches.find((b) => b.pen_name === logeDestination || b.id === logeDestination);

      if (!batchDest) {
        return {
          success: false,
          message: `Loge "${logeDestination}" introuvable`,
          error: 'loge introuvable',
        };
      }

      const resultats: any[] = [];
      for (const animalId of animalIds) {
        try {
          // Note: transferPig nécessite un TransferPigDto avec pig_id et destination_batch_id
          // Cette implémentation est simplifiée - il faudrait adapter selon l'API exacte
          await this.batchPigsService.transferPig({
            pig_id: animalId,
            destination_batch_id: batchDest.id,
          } as any, userId);
          resultats.push({ animalId, success: true });
        } catch (error) {
          resultats.push({ animalId, success: false, error: error instanceof Error ? error.message : 'Erreur' });
        }
      }

      return {
        success: true,
        message: `${resultats.filter((r) => r.success).length}/${animalIds.length} animal(aux) déplacé(s)`,
        data: { resultats },
      };
    } catch (error) {
      this.logger.error('Erreur deplacer_animaux', error);
      return {
        success: false,
        message: 'Erreur lors du déplacement des animaux',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetAnimauxParLoge(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const logeName = typeof args.logeName === 'string' ? args.logeName.trim() : undefined;

      const batches = await this.batchPigsService.getAllBatchesByProjet(projectId, userId);

      if (logeName) {
        const batch = batches.find((b) => b.pen_name === logeName || b.id === logeName);
        if (!batch) {
          return {
            success: false,
            message: `Loge "${logeName}" introuvable`,
            error: 'loge introuvable',
          };
        }

        const animaux = await this.batchPigsService.getPigsByBatch(batch.id, userId);
        return {
          success: true,
          message: `${animaux.length} animal(aux) trouvé(s) dans la loge "${logeName}"`,
          data: {
            loge: batch,
            count: animaux.length,
            animaux,
          },
        };
      } else {
        // Toutes les loges
        const resultats: any[] = [];
        for (const batch of batches) {
          const animaux = await this.batchPigsService.getPigsByBatch(batch.id, userId);
          resultats.push({
            loge: batch,
            count: animaux.length,
            animaux,
          });
        }

        return {
          success: true,
          message: `${batches.length} loge(s) trouvée(s)`,
          data: {
            loges: resultats,
          },
        };
      }
    } catch (error) {
      this.logger.error('Erreur get_animaux_par_loge', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des animaux par loge',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreateMaladie(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const nom = typeof args.nom === 'string' ? args.nom.trim() : '';
      const dateDebut = typeof args.date_debut === 'string' ? args.date_debut : new Date().toISOString().split('T')[0];
      const symptomes = typeof args.symptomes === 'string' ? args.symptomes.trim() : '';
      const animalIds = Array.isArray(args.animalIds) ? args.animalIds.map(String) : [];

      if (!nom || !dateDebut) {
        return {
          success: false,
          message: 'Nom et date de début requis',
          error: 'nom et date_debut requis',
        };
      }

      // Utilise createMaladie (si plusieurs animaux, créer plusieurs enregistrements ou un avec nombre_animaux_affectes)
      const maladie = await this.santeService.createMaladie({
        projet_id: projectId,
        nom_maladie: nom,
        type: 'autre',
        gravite: 'moderee',
        date_debut: dateDebut,
        symptomes: symptomes || 'Non spécifiés',
        nombre_animaux_affectes: animalIds.length > 0 ? animalIds.length : 1,
        animal_id: animalIds.length === 1 ? animalIds[0] : null,
      } as any, userId);

      return {
        success: true,
        message: `Maladie "${nom}" enregistrée avec succès`,
        data: maladie,
      };
    } catch (error) {
      this.logger.error('Erreur create_maladie', error);
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement de la maladie',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleScheduleReminder(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const type = typeof args.type === 'string' ? args.type.trim() : '';
      const date = typeof args.date === 'string' ? args.date.trim() : '';
      const message = typeof args.message === 'string' ? args.message.trim() : '';

      if (!type || !date) {
        return {
          success: false,
          message: 'Type et date requis',
          error: 'type et date requis',
        };
      }

      // Utilise createPlanification avec type=rappel
      const planification = await this.planificationsService.create({
        projet_id: projectId,
        type: 'rappel',
        titre: `Rappel: ${type}`,
        description: message || `Rappel pour ${type}`,
        date_prevue: date,
      } as any, userId);

      return {
        success: true,
        message: `Rappel programmé pour le ${date}`,
        data: planification,
      };
    } catch (error) {
      this.logger.error('Erreur schedule_reminder', error);
      return {
        success: false,
        message: 'Erreur lors de la programmation du rappel',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreatePlanification(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const type = typeof args.type === 'string' ? args.type.trim() : '';
      const titre = typeof args.titre === 'string' ? args.titre.trim() : '';
      const datePrevue = typeof args.date_prevue === 'string' ? args.date_prevue.trim() : '';
      const description = typeof args.description === 'string' ? args.description.trim() : undefined;

      if (!type || !titre || !datePrevue) {
        return {
          success: false,
          message: 'Type, titre et date_prevue requis',
          error: 'type, titre et date_prevue requis',
        };
      }

      const planification = await this.planificationsService.create({
        projet_id: projectId,
        type,
        titre,
        description,
        date_prevue: datePrevue,
      } as any, userId);

      return {
        success: true,
        message: `Planification "${titre}" créée avec succès`,
        data: planification,
      };
    } catch (error) {
      this.logger.error('Erreur create_planification', error);
      return {
        success: false,
        message: 'Erreur lors de la création de la planification',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleAnalyzeData(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const type = typeof args.type === 'string' ? args.type.toLowerCase() : 'all';

      let analysis: any = {};

      if (type === 'finances' || type === 'all') {
        const bilan = await this.financeService.getBilanComplet(projectId, userId);
        analysis.finances = {
          total_revenus: bilan.revenus?.total || 0,
          total_depenses: bilan.depenses?.total || 0,
          benefice: (bilan.revenus?.total || 0) - (bilan.depenses?.total || 0),
        };
      }

      if (type === 'production' || type === 'all') {
        const stats = await this.productionService.getProjetStats(projectId, userId);
        analysis.production = stats;
      }

      if (type === 'sante' || type === 'all') {
        const mortalites = await this.mortalitesService.getStatistiques(projectId, userId);
        const rappels = await this.santeService.genererRappelsAutomatiques(projectId, userId);
        analysis.sante = {
          taux_mortalite: mortalites.taux_mortalite,
          rappels_actifs: rappels.rappels_crees,
        };
      }

      return {
        success: true,
        message: `Analyse des données (type: ${type})`,
        data: analysis,
      };
    } catch (error) {
      this.logger.error('Erreur analyze_data', error);
      return {
        success: false,
        message: 'Erreur lors de l\'analyse des données',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  // ───────────────────────────────────────────────────────────
  // Knowledge Base
  // ───────────────────────────────────────────────────────────

  private async handleListKnowledgeTopics(
    args: Record<string, unknown>,
    projectId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const categories = await this.knowledgeBaseService.getCategories(projectId);

      return {
        success: true,
        message: `${categories.length} catégorie(s) disponible(s)`,
        data: categories,
      };
    } catch (error) {
      this.logger.error('Erreur list_knowledge_topics', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des catégories',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  // ───────────────────────────────────────────────────────────
  // Production (stubs pour compilation)
  // ───────────────────────────────────────────────────────────

  private async handleGetAnimals(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const inclureInactifs = typeof args.inclureInactifs === 'boolean' ? args.inclureInactifs : true;
      const limit = typeof args.limit === 'number' ? Math.min(args.limit, 500) : 500;

      const animaux = await this.productionService.findAllAnimals(projectId, userId, inclureInactifs, limit, 0);

      return {
        success: true,
        message: `${animaux.length} animal(aux) trouvé(s)`,
        data: animaux,
      };
    } catch (error) {
      this.logger.error('Erreur get_animals', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des animaux',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleSearchAnimal(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const code = typeof args.code === 'string' ? args.code.trim() : undefined;
      const inclureInactifs = typeof args.inclureInactifs === 'boolean' ? args.inclureInactifs : false;

      const animaux = await this.productionService.findAllAnimals(projectId, userId, inclureInactifs, 500, 0, code);

      return {
        success: true,
        message: `${animaux.length} animal(aux) trouvé(s)`,
        data: animaux,
      };
    } catch (error) {
      this.logger.error('Erreur search_animal', error);
      return {
        success: false,
        message: 'Erreur lors de la recherche d\'animaux',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreateWeighing(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const animalId = typeof args.animalId === 'string' ? args.animalId.trim() : '';
      if (!animalId) {
        return {
          success: false,
          message: 'ID de l\'animal requis',
          error: 'animalId requis',
        };
      }

      const weight = typeof args.weight === 'number' ? args.weight : null;
      if (weight === null || weight <= 0) {
        return {
          success: false,
          message: 'Poids invalide',
          error: 'weight invalide',
        };
      }

      const date = typeof args.date === 'string' ? args.date : new Date().toISOString().split('T')[0];
      const notes = typeof args.notes === 'string' ? args.notes.trim() : undefined;

      const dto = {
        projet_id: projectId,
        animal_id: animalId,
        date,
        poids_kg: weight,
        commentaire: notes,
      };

      const pesee = await this.productionService.createPesee(dto, userId);

      return {
        success: true,
        message: `Pesée enregistrée: ${weight} kg`,
        data: pesee,
      };
    } catch (error) {
      this.logger.error('Erreur create_weighing', error);
      return {
        success: false,
        message: 'Erreur lors de la création de la pesée',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetProjectStats(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const stats = await this.productionService.getProjetStats(projectId, userId);

      return {
        success: true,
        message: 'Statistiques du projet récupérées',
        data: stats,
      };
    } catch (error) {
      this.logger.error('Erreur get_project_stats', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetAnimalStatistics(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      // Pour l'instant, utiliser getProjectStats qui inclut des stats sur les animaux
      const stats = await this.productionService.getProjetStats(projectId, userId);

      return {
        success: true,
        message: 'Statistiques des animaux récupérées',
        data: stats.animaux || {},
      };
    } catch (error) {
      this.logger.error('Erreur get_animal_statistics', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des statistiques animales',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  // ───────────────────────────────────────────────────────────
  // Marketplace (stubs pour compilation)
  // ───────────────────────────────────────────────────────────

  private async handleGetMarketPriceTrends(
    args: Record<string, unknown>,
  ): Promise<FunctionExecutionResult> {
    try {
      const weeks = typeof args.weeks === 'number' ? args.weeks : 4;
      const trends = await this.marketplaceService.getPriceTrends(weeks);

      return {
        success: true,
        message: `Tendances de prix (${weeks} semaines)`,
        data: trends,
      };
    } catch (error) {
      this.logger.error('Erreur get_market_price_trends', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des tendances de prix',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreateMarketplaceListing(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const animalIds = Array.isArray(args.animalIds) ? args.animalIds : [];
      if (animalIds.length === 0) {
        return {
          success: false,
          message: 'Au moins un animal est requis pour créer une annonce',
          error: 'animalIds requis',
        };
      }

      // Pour le premier animal seulement (simplifié pour l'instant)
      const firstAnimalId = animalIds[0] as string;
      
      // Récupérer l'animal pour obtenir le poids
      const animal = await this.productionService.findOneAnimal(firstAnimalId, userId);
      if (!animal) {
        return {
          success: false,
          message: 'Animal introuvable',
          error: 'animal_not_found',
        };
      }
      
      // Récupérer la dernière pesée pour obtenir le poids actuel et la date
      const poidsInfo = await this.productionService.getAnimalPoidsActuelEstime(firstAnimalId, userId);
      const weight = poidsInfo.poidsEstime || animal.poids_initial || 50;
      const lastWeightDate = poidsInfo.dateDernierePesee || animal.date_entree || new Date().toISOString().split('T')[0];
      
      // Calculer le prix par kg
      const pricePerKg = typeof args.pricePerKg === 'number' 
        ? args.pricePerKg 
        : (typeof args.price === 'number' && weight > 0
          ? args.price / weight 
          : 2500); // Prix par défaut 2500 FCFA/kg
      
      // Récupérer la localisation du projet
      // Note: La table projets a un champ 'localisation' (string), mais pas de latitude/longitude détaillées
      // Pour l'instant, on utilise des valeurs par défaut pour la Côte d'Ivoire
      // TODO: Améliorer en récupérant la localisation depuis le profil utilisateur ou le projet
      const defaultLocation = {
        latitude: 7.5399, // Abidjan par défaut
        longitude: -5.5471,
        address: 'Côte d\'Ivoire',
        city: 'Abidjan',
        region: 'Lagunes',
      };
      
      // Créer le DTO pour le listing
      const createListingDto = {
        subjectId: firstAnimalId,
        producerId: userId,
        farmId: projectId,
        pricePerKg,
        weight,
        lastWeightDate,
        location: defaultLocation,
        saleTerms: {
          transport: 'buyer_responsibility',
          slaughter: 'buyer_responsibility',
          paymentTerms: 'on_delivery',
          warranty: 'Tous les documents sanitaires et certificats seront fournis.',
          cancellationPolicy: "Annulation possible jusqu'à 48h avant la date de livraison.",
        },
      };
      
      // Utiliser le service marketplace directement (il utilise marketplaceUnifiedService en interne)
      const listing = await this.marketplaceService.createListing(createListingDto as any, userId);
      
      return {
        success: true,
        message: `Annonce créée avec succès pour ${animal.code || firstAnimalId} (${weight} kg à ${pricePerKg.toLocaleString('fr-FR')} FCFA/kg)`,
        data: listing,
      };
    } catch (error) {
      this.logger.error('Erreur create_marketplace_listing', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la création de l\'annonce',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleUpdateListingPrice(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const listingId = typeof args.listingId === 'string' ? args.listingId.trim() : '';
      if (!listingId) {
        return {
          success: false,
          message: 'ID de l\'annonce requis',
          error: 'listingId requis',
        };
      }

      const newPrice = typeof args.newPrice === 'number' ? args.newPrice : null;
      if (newPrice === null || newPrice <= 0) {
        return {
          success: false,
          message: 'Prix invalide',
          error: 'newPrice invalide',
        };
      }

      // Récupérer le listing pour obtenir le poids et calculer pricePerKg
      const listing = await this.marketplaceService.findOneListing(listingId);
      if (!listing || listing.producerId !== userId) {
        return {
          success: false,
          message: 'Annonce introuvable ou vous n\'êtes pas autorisé',
          error: 'listing non trouvé ou non autorisé',
        };
      }

      // Calculer le nouveau prix par kg
      const weight = listing.weight || 1;
      const pricePerKg = newPrice / weight;

      const updateDto = {
        pricePerKg,
      };

      const updated = await this.marketplaceService.updateListing(listingId, updateDto, userId);

      return {
        success: true,
        message: `Prix mis à jour: ${newPrice} FCFA (${pricePerKg.toFixed(0)} FCFA/kg)`,
        data: updated,
      };
    } catch (error) {
      this.logger.error('Erreur update_listing_price', error);
      return {
        success: false,
        message: 'Erreur lors de la mise à jour du prix',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetMyListings(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const limit = typeof args.limit === 'number' ? Math.min(args.limit, 500) : 20;
      const offset = typeof args.offset === 'number' ? args.offset : 0;

      const listings = await this.marketplaceService.findAllListings(
        projectId,
        userId, // Filtrer pour n'inclure que les listings de cet utilisateur
        limit,
        offset,
      );

      return {
        success: true,
        message: `${listings.listings?.length || 0} annonce(s) trouvée(s)`,
        data: listings,
      };
    } catch (error) {
      this.logger.error('Erreur get_my_listings', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des annonces',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCheckOffers(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const listingId = typeof args.listingId === 'string' ? args.listingId : undefined;
      
      // Si listingId fourni, chercher les offres pour ce listing
      // Sinon, chercher les offres où l'utilisateur est producteur
      const offers = await this.marketplaceService.findAllOffers(
        listingId,
        undefined, // buyerId
        listingId ? undefined : userId, // producerId si pas de listingId
      );

      return {
        success: true,
        message: `${offers.length} offre(s) trouvée(s)`,
        data: offers,
      };
    } catch (error) {
      this.logger.error('Erreur check_offers', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des offres',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleRespondToOffer(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const offerId = typeof args.offerId === 'string' ? args.offerId.trim() : '';
      if (!offerId) {
        return {
          success: false,
          message: 'ID de l\'offre requis',
          error: 'offerId requis',
        };
      }

      const action = typeof args.action === 'string' ? args.action.toLowerCase() : 'accept';
      
      if (action === 'accept') {
        const result = await this.marketplaceService.acceptOffer(offerId, userId, 'producer');
        return {
          success: true,
          message: 'Offre acceptée avec succès',
          data: result,
        };
      } else if (action === 'reject') {
        const result = await this.marketplaceService.rejectOffer(offerId, userId);
        return {
          success: true,
          message: 'Offre refusée',
          data: result,
        };
      } else {
        return {
          success: false,
          message: 'Action invalide. Utilisez "accept" ou "reject"',
          error: 'action invalide',
        };
      }
    } catch (error) {
      this.logger.error('Erreur respond_to_offer', error);
      return {
        success: false,
        message: 'Erreur lors de la réponse à l\'offre',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  // ───────────────────────────────────────────────────────────
  // Santé (stubs pour compilation)
  // ───────────────────────────────────────────────────────────

  private async handleCreateVaccination(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const animalIds = Array.isArray(args.animalIds) ? args.animalIds : [];
      if (animalIds.length === 0) {
        return {
          success: false,
          message: 'Au moins un animal est requis pour la vaccination',
          error: 'animalIds requis',
        };
      }

      const vaccine = typeof args.vaccine === 'string' ? args.vaccine.trim() : '';
      if (!vaccine) {
        return {
          success: false,
          message: 'Nom du vaccin requis',
          error: 'vaccine requis',
        };
      }

      const date = typeof args.date === 'string' ? args.date : new Date().toISOString().split('T')[0];
      const nextDueDate = typeof args.nextDueDate === 'string' ? args.nextDueDate : undefined;
      const veterinarian = typeof args.veterinarian === 'string' ? args.veterinarian.trim() : undefined;
      const cost = typeof args.cost === 'number' ? args.cost : undefined;

      // Mapper le nom du vaccin vers type_prophylaxie
      const vaccineLower = vaccine.toLowerCase();
      let typeProphylaxie = 'vaccin_obligatoire';
      if (vaccineLower.includes('vitamine')) {
        typeProphylaxie = 'vitamine';
      } else if (vaccineLower.includes('deparasitant') || vaccineLower.includes('vermifuge')) {
        typeProphylaxie = 'deparasitant';
      } else if (vaccineLower.includes('fer')) {
        typeProphylaxie = 'fer';
      }

      const dto = {
        projet_id: projectId,
        animal_ids: animalIds,
        type_prophylaxie: typeProphylaxie,
        produit_administre: vaccine,
        nom_vaccin: vaccine,
        date_vaccination: date,
        date_rappel: nextDueDate,
        dosage: 'Selon prescription',
        raison_traitement: 'prevention' as const,
        veterinaire: veterinarian,
        cout: cost,
      };

      const vaccination = await this.santeService.createVaccination(dto, userId);

      return {
        success: true,
        message: `Vaccination enregistrée: ${vaccine} pour ${animalIds.length} animal(aux)`,
        data: vaccination,
      };
    } catch (error) {
      this.logger.error('Erreur create_vaccination', error);
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement de la vaccination',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreateTreatment(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const animalIds = Array.isArray(args.animalIds) ? args.animalIds : [];
      if (animalIds.length === 0) {
        return {
          success: false,
          message: 'Au moins un animal est requis pour le traitement',
          error: 'animalIds requis',
        };
      }

      const medication = typeof args.medication === 'string' ? args.medication.trim() : '';
      if (!medication) {
        return {
          success: false,
          message: 'Nom du médicament requis',
          error: 'medication requis',
        };
      }

      const diagnosis = typeof args.diagnosis === 'string' ? args.diagnosis.trim() : undefined;
      const date = typeof args.date === 'string' ? args.date : new Date().toISOString().split('T')[0];
      const duration = typeof args.duration === 'number' ? args.duration : undefined;
      const cost = typeof args.cost === 'number' ? args.cost : undefined;

      // Utiliser le premier animal pour animal_id (le DTO ne supporte qu'un seul animal_id)
      const animalId = animalIds[0] as string;

      // Déterminer le type de traitement basé sur le médicament
      const medicationLower = medication.toLowerCase();
      let treatmentType = 'autre';
      if (medicationLower.includes('antibiotique') || medicationLower.includes('antibio')) {
        treatmentType = 'antibiotique';
      } else if (medicationLower.includes('antiparasitaire') || medicationLower.includes('vermifuge')) {
        treatmentType = 'antiparasitaire';
      } else if (medicationLower.includes('anti-inflammatoire') || medicationLower.includes('anti inflammatoire')) {
        treatmentType = 'anti_inflammatoire';
      } else if (medicationLower.includes('vitamine')) {
        treatmentType = 'vitamine';
      }

      const dto = {
        projet_id: projectId,
        animal_id: animalId,
        type: treatmentType,
        nom_medicament: medication,
        voie_administration: 'orale' as const, // Par défaut
        dosage: 'Selon prescription',
        frequence: duration ? `${duration} jours` : 'Selon prescription',
        date_debut: date,
        duree_jours: duration,
        cout: cost,
      };

      const traitement = await this.santeService.createTraitement(dto, userId);

      return {
        success: true,
        message: `Traitement enregistré: ${medication} pour ${animalIds.length} animal(aux)`,
        data: traitement,
      };
    } catch (error) {
      this.logger.error('Erreur create_treatment', error);
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement du traitement',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCreateVetVisit(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const date = typeof args.date === 'string' ? args.date : new Date().toISOString().split('T')[0];
      const reason = typeof args.reason === 'string' ? args.reason.trim() : '';
      const veterinarian = typeof args.veterinarian === 'string' ? args.veterinarian.trim() : '';
      
      if (!reason) {
        return {
          success: false,
          message: 'Raison de la visite requise',
          error: 'reason requis',
        };
      }

      if (!veterinarian) {
        return {
          success: false,
          message: 'Nom du vétérinaire requis',
          error: 'veterinarian requis',
        };
      }

      const diagnosis = typeof args.diagnosis === 'string' ? args.diagnosis.trim() : undefined;
      const recommendations = typeof args.recommendations === 'string' ? args.recommendations.trim() : undefined;
      const cost = typeof args.cost === 'number' ? args.cost : 0;

      const dto = {
        projet_id: projectId,
        date_visite: date,
        veterinaire: veterinarian,
        motif: reason,
        diagnostic: diagnosis,
        recommandations: recommendations,
        cout: cost,
      };

      const visite = await this.santeService.createVisiteVeterinaire(dto, userId);

      return {
        success: true,
        message: `Visite vétérinaire enregistrée: ${reason}`,
        data: visite,
      };
    } catch (error) {
      this.logger.error('Erreur create_vet_visit', error);
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement de la visite vétérinaire',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetHealthReminders(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const rappels = await this.santeService.genererRappelsAutomatiques(projectId, userId);

      return {
        success: true,
        message: 'Rappels de santé générés',
        data: rappels,
      };
    } catch (error) {
      this.logger.error('Erreur get_health_reminders', error);
      return {
        success: false,
        message: 'Erreur lors de la génération des rappels de santé',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleCounterOffer(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const offerId = typeof args.offerId === 'string' ? args.offerId.trim() : '';
      if (!offerId) {
        return {
          success: false,
          message: 'ID de l\'offre requis',
          error: 'offerId requis',
        };
      }

      const newPrice = typeof args.newPrice === 'number' ? args.newPrice : null;
      if (newPrice === null || newPrice <= 0) {
        return {
          success: false,
          message: 'Nouveau prix invalide',
          error: 'newPrice invalide',
        };
      }

      const message = typeof args.message === 'string' ? args.message.trim() : undefined;

      const result = await this.marketplaceService.counterOffer(offerId, userId, {
        nouveau_prix_total: newPrice,
        message,
      });

      return {
        success: true,
        message: `Contre-proposition envoyée: ${newPrice.toLocaleString('fr-FR')} FCFA`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Erreur counter_offer', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la contre-proposition',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleDeleteListing(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const listingId = typeof args.listingId === 'string' ? args.listingId.trim() : '';
      if (!listingId) {
        return {
          success: false,
          message: 'ID de l\'annonce requis',
          error: 'listingId requis',
        };
      }

      // Utiliser marketplaceService.deleteListing qui appelle marketplaceUnifiedService
      await this.marketplaceService.deleteListing(listingId, userId);

      return {
        success: true,
        message: 'Annonce supprimée avec succès',
        data: { id: listingId },
      };
    } catch (error) {
      this.logger.error('Erreur delete_listing', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'annonce',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetMySentOffers(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const offers = await this.marketplaceService.getBuyerInquiries(userId);
      
      // Filtrer par statut si fourni
      const status = typeof args.status === 'string' ? args.status.toLowerCase() : undefined;
      const filteredOffers = status 
        ? offers.filter((offer: any) => offer.status === status)
        : offers;

      return {
        success: true,
        message: `${filteredOffers.length} offre(s) envoyée(s) trouvée(s)`,
        data: filteredOffers,
      };
    } catch (error) {
      this.logger.error('Erreur get_my_sent_offers', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des offres envoyées',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleGetMarketplaceTransactions(
    args: Record<string, unknown>,
    projectId: string,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const role = typeof args.role === 'string' ? (args.role === 'buyer' ? 'buyer' : 'producer') : undefined;
      const transactions = await this.marketplaceService.findAllTransactions(userId, role);
      
      // Filtrer par statut si fourni
      const status = typeof args.status === 'string' ? args.status.toLowerCase() : undefined;
      const filteredTransactions = status 
        ? transactions.filter((t: any) => t.status === status)
        : transactions;

      return {
        success: true,
        message: `${filteredTransactions.length} transaction(s) trouvée(s)`,
        data: filteredTransactions,
      };
    } catch (error) {
      this.logger.error('Erreur get_transactions (marketplace)', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des transactions',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleConfirmDelivery(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const transactionId = typeof args.transactionId === 'string' ? args.transactionId.trim() : '';
      if (!transactionId) {
        return {
          success: false,
          message: 'ID de la transaction requis',
          error: 'transactionId requis',
        };
      }

      // Déterminer le rôle de l'utilisateur
      // Pour simplifier, on essaie d'abord comme producteur, puis comme acheteur
      let role: 'producer' | 'buyer' = 'producer';
      try {
        await this.marketplaceService.confirmDelivery(transactionId, userId, role);
      } catch (error: any) {
        if (error.message?.includes('autorisé')) {
          role = 'buyer';
          await this.marketplaceService.confirmDelivery(transactionId, userId, role);
        } else {
          throw error;
        }
      }

      return {
        success: true,
        message: 'Livraison confirmée avec succès',
        data: { id: transactionId, role },
      };
    } catch (error) {
      this.logger.error('Erreur confirm_delivery', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la confirmation de livraison',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  private async handleRateTransaction(
    args: Record<string, unknown>,
    userId: string,
  ): Promise<FunctionExecutionResult> {
    try {
      const transactionId = typeof args.transactionId === 'string' ? args.transactionId.trim() : '';
      if (!transactionId) {
        return {
          success: false,
          message: 'ID de la transaction requis',
          error: 'transactionId requis',
        };
      }

      const rating = typeof args.rating === 'number' ? args.rating : null;
      if (rating === null || rating < 1 || rating > 5) {
        return {
          success: false,
          message: 'Note invalide (doit être entre 1 et 5)',
          error: 'rating invalide',
        };
      }

      const comment = typeof args.comment === 'string' ? args.comment.trim() : undefined;

      // Récupérer la transaction pour obtenir le producerId
      const transactions = await this.marketplaceService.findAllTransactions(userId);
      const transaction = transactions.find((t: any) => t.id === transactionId);
      
      if (!transaction) {
        return {
          success: false,
          message: 'Transaction introuvable',
          error: 'transaction_not_found',
        };
      }

      const createRatingDto = {
        transactionId,
        producerId: transaction.producerId,
        ratings: {
          quality: rating,
          communication: rating,
          delivery: rating,
        },
        overall: rating,
        comment,
      };

      const result = await this.marketplaceService.createRating(createRatingDto as any, userId);

      return {
        success: true,
        message: `Transaction notée: ${rating}/5`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Erreur rate_transaction', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de la notation',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}

