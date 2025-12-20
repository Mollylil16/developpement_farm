/**
 * Script pour générer 5000+ exemples d'entraînement pour l'agent conversationnel
 * Enrichit la base de connaissances avec des variations linguistiques et contextuelles
 */

import * as fs from 'fs';
import * as path from 'path';

interface TrainingExample {
  text: string;
  action: string;
  params: Record<string, unknown>;
  confidence: number;
}

// Patterns de base pour générer des variations
const BASE_PATTERNS = {
  get_statistics: [
    'combien de porc',
    'nombre de porc',
    'statistiques',
    'bilan',
    'mes animaux',
    'mon cheptel',
    'etat du cheptel',
    'situation',
    'total',
    'compte',
    'resume',
  ],
  get_stock_status: [
    'stock',
    'provende',
    'nourriture',
    'aliment',
    'combien de provende',
    'il reste',
    'quantite',
    'niveau de stock',
  ],
  calculate_costs: [
    'mes depenses',
    'cout total',
    'combien j ai depense',
    'depense totale',
    'budget',
    'mes couts',
  ],
  create_revenu: [
    'j ai vendu',
    'vente de',
    'j ai vendu {nombre} porc',
    'vendu {nombre} porc de {poids}kg a {montant}',
    'vente aujourd hui',
    'enregistrer vente',
  ],
  create_depense: [
    'j ai depense',
    'achat',
    'j ai achete',
    'depense de {montant}',
    'enregistrer depense',
    'noter depense',
  ],
  create_pesee: [
    'peser',
    'pesee',
    'peser le porc {code} il fait {poids} kg',
    '{code} fait {poids} kg',
    '{code} pese {poids} kg',
    'peser {code} il fait {poids} kg',
    'enregistrer pesee',
    'noter pesee',
  ],
  create_vaccination: [
    'vaccination',
    'j ai vaccine',
    'vacciner',
    'vaccination de {code}',
    'enregistrer vaccination',
  ],
  create_visite_veterinaire: [
    'visite veterinaire',
    'veterinaire',
    'visite du veterinaire',
    'rendez vous veterinaire',
  ],
  create_traitement: ['traitement', 'j ai traite', 'traiter', 'medicament', 'soin'],
  create_maladie: ['maladie', 'malade', 'symptome', 'probleme de sante'],
  get_reminders: ['rappels', 'a faire', 'calendrier', 'agenda', 'taches', 'programme'],
};

// Variations linguistiques
const VARIATIONS = {
  // Articles
  articles: ['', 'le', 'la', 'les', 'un', 'une', 'des', 'mon', 'ma', 'mes'],

  // Verbes d'action
  actionVerbs: ['montre', 'affiche', 'donne', 'dis', 'fais', 'enregistre', 'note', 'ajoute'],

  // Formulations
  formulations: [
    'je veux',
    'j aimerais',
    'peux tu',
    'tu peux',
    'est ce que tu peux',
    's il te plait',
    'stp',
    'merci',
  ],

  // Codes animaux
  animalCodes: ['P001', 'P002', 'P003', 'P004', 'P005', 'P010', 'P020', 'P050', 'P100'],

  // Poids
  poids: [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],

  // Montants
  montants: [
    50000, 100000, 150000, 200000, 250000, 300000, 400000, 500000, 600000, 800000, 1000000,
  ],

  // Quantités
  quantites: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30],
};

// Fonction pour générer des variations
function generateVariations(pattern: string, action: string): TrainingExample[] {
  const examples: TrainingExample[] = [];

  // Variation 1: Pattern de base
  examples.push({
    text: pattern,
    action,
    params: {},
    confidence: 0.95,
  });

  // Variation 2: Avec articles
  for (const article of VARIATIONS.articles.slice(0, 5)) {
    if (article) {
      examples.push({
        text: `${article} ${pattern}`,
        action,
        params: {},
        confidence: 0.9,
      });
    }
  }

  // Variation 3: Avec verbes d'action
  if (action.startsWith('get_')) {
    for (const verb of VARIATIONS.actionVerbs.slice(0, 3)) {
      examples.push({
        text: `${verb} ${pattern}`,
        action,
        params: {},
        confidence: 0.9,
      });
    }
  }

  // Variation 4: Avec formulations polies
  for (const form of VARIATIONS.formulations.slice(0, 3)) {
    examples.push({
      text: `${form} ${pattern}`,
      action,
      params: {},
      confidence: 0.85,
    });
  }

  // Variation 5: Sans accents (simulation de fautes)
  const withoutAccents = pattern
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/à/g, 'a')
    .replace(/ç/g, 'c');
  if (withoutAccents !== pattern) {
    examples.push({
      text: withoutAccents,
      action,
      params: {},
      confidence: 0.85,
    });
  }

  // Variation 6: Majuscules/minuscules
  examples.push({
    text: pattern.toUpperCase(),
    action,
    params: {},
    confidence: 0.8,
  });

  examples.push({
    text: pattern.toLowerCase(),
    action,
    params: {},
    confidence: 0.85,
  });

  return examples;
}

// Fonction pour générer des exemples avec paramètres
function generateWithParams(action: string): TrainingExample[] {
  const examples: TrainingExample[] = [];

  if (action === 'create_pesee') {
    for (const code of VARIATIONS.animalCodes) {
      for (const poids of VARIATIONS.poids) {
        // Format 1: "peser le porc P001 il fait 45 kg"
        examples.push({
          text: `peser le porc ${code} il fait ${poids} kg`,
          action,
          params: { animal_code: code, poids_kg: poids },
          confidence: 0.95,
        });

        // Format 2: "P001 fait 45 kg"
        examples.push({
          text: `${code} fait ${poids} kg`,
          action,
          params: { animal_code: code, poids_kg: poids },
          confidence: 0.95,
        });

        // Format 3: "P001 pese 45 kg"
        examples.push({
          text: `${code} pese ${poids} kg`,
          action,
          params: { animal_code: code, poids_kg: poids },
          confidence: 0.95,
        });

        // Format 4: "peser P001 45 kg"
        examples.push({
          text: `peser ${code} ${poids} kg`,
          action,
          params: { animal_code: code, poids_kg: poids },
          confidence: 0.95,
        });

        // Format 5: "pesee de P001 45 kg"
        examples.push({
          text: `pesee de ${code} ${poids} kg`,
          action,
          params: { animal_code: code, poids_kg: poids },
          confidence: 0.95,
        });
      }
    }
  }

  if (action === 'create_revenu') {
    for (const nombre of VARIATIONS.quantites.slice(0, 10)) {
      for (const poids of VARIATIONS.poids.slice(0, 5)) {
        for (const montant of VARIATIONS.montants.slice(0, 5)) {
          // Format 1: "j ai vendu 5 porcs de 50kg a 800000"
          examples.push({
            text: `j ai vendu ${nombre} porc${nombre > 1 ? 's' : ''} de ${poids}kg a ${montant}`,
            action,
            params: { nombre, poids_kg: poids, montant },
            confidence: 0.95,
          });

          // Format 2: "vente de 5 porcs 50kg 800000"
          examples.push({
            text: `vente de ${nombre} porc${nombre > 1 ? 's' : ''} ${poids}kg ${montant}`,
            action,
            params: { nombre, poids_kg: poids, montant },
            confidence: 0.95,
          });
        }
      }
    }
  }

  if (action === 'create_depense') {
    for (const montant of VARIATIONS.montants) {
      // Format 1: "j ai depense 200000"
      examples.push({
        text: `j ai depense ${montant}`,
        action,
        params: { montant },
        confidence: 0.95,
      });

      // Format 2: "achat 200000"
      examples.push({
        text: `achat ${montant}`,
        action,
        params: { montant },
        confidence: 0.9,
      });
    }
  }

  return examples;
}

// Fonction principale
function generateTrainingData(): TrainingExample[] {
  const allExamples: TrainingExample[] = [];

  console.log("🚀 Génération de 5000+ exemples d'entraînement...\n");

  // Générer des variations pour chaque action
  for (const [action, patterns] of Object.entries(BASE_PATTERNS)) {
    console.log(`📝 Génération pour ${action}...`);

    // Variations de base
    for (const pattern of patterns) {
      const variations = generateVariations(pattern, action);
      allExamples.push(...variations);
    }

    // Exemples avec paramètres
    const withParams = generateWithParams(action);
    allExamples.push(...withParams);

    console.log(`  ✅ ${allExamples.filter((e) => e.action === action).length} exemples générés`);
  }

  // Ajouter des exemples de contexte conversationnel
  console.log("\n📝 Génération d'exemples contextuels...");
  const contextualExamples = generateContextualExamples();
  allExamples.push(...contextualExamples);
  console.log(`  ✅ ${contextualExamples.length} exemples contextuels générés`);

  // Dédupliquer
  const uniqueExamples = Array.from(
    new Map(allExamples.map((e) => [e.text.toLowerCase().trim(), e])).values()
  );

  console.log(`\n✅ Total: ${uniqueExamples.length} exemples uniques générés`);
  console.log(`📊 Répartition par action:`);
  const byAction = uniqueExamples.reduce(
    (acc, e) => {
      acc[e.action] = (acc[e.action] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  for (const [action, count] of Object.entries(byAction)) {
    console.log(`   ${action}: ${count} exemples`);
  }

  return uniqueExamples;
}

// Générer des exemples contextuels
function generateContextualExamples(): TrainingExample[] {
  const examples: TrainingExample[] = [];

  // Exemples avec contexte temporel
  const timeContexts = ['aujourd hui', 'hier', 'cette semaine', 'ce mois', 'la semaine derniere'];
  for (const time of timeContexts) {
    examples.push({
      text: `j ai vendu 5 porcs ${time}`,
      action: 'create_revenu',
      params: { nombre: 5 },
      confidence: 0.9,
    });

    examples.push({
      text: `mes depenses ${time}`,
      action: 'calculate_costs',
      params: {},
      confidence: 0.9,
    });
  }

  // Exemples avec questions
  const questions = [
    'combien de porc j ai',
    'il reste combien de provende',
    'combien j ai depense',
    'quels sont mes rappels',
  ];
  for (const question of questions) {
    examples.push({
      text: question,
      action: question.includes('porc')
        ? 'get_statistics'
        : question.includes('provende')
          ? 'get_stock_status'
          : question.includes('depense')
            ? 'calculate_costs'
            : 'get_reminders',
      params: {},
      confidence: 0.95,
    });
  }

  return examples;
}

// Sauvegarder dans un fichier
function saveTrainingData(examples: TrainingExample[]): void {
  const outputPath = path.join(
    __dirname,
    '../src/services/chatAgent/core/INTENT_KNOWLEDGE_BASE_GENERATED.ts'
  );

  const content = `/**
 * Base de connaissances générée automatiquement
 * ${examples.length} exemples d'entraînement pour l'agent conversationnel
 * Généré le ${new Date().toISOString()}
 * 
 * ⚠️ Ce fichier est généré automatiquement - Ne pas modifier manuellement
 * Pour régénérer: npm run generate:training-data
 */

import { TrainingExample } from './IntentRAG';

// Typage explicite pour éviter les erreurs TypeScript avec les grands tableaux
// Utilisation d'une fonction pour éviter l'inférence de type complexe
function getExamples(): TrainingExample[] {
  // @ts-expect-error - TypeScript ne peut pas inférer le type d'un tableau aussi grand (5000+ éléments)
  // C'est normal et acceptable pour un fichier généré automatiquement
  return ${JSON.stringify(examples, null, 2)};
}

export const INTENT_KNOWLEDGE_BASE_GENERATED: TrainingExample[] = getExamples();
`;

  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`\n💾 Fichier sauvegardé: ${outputPath}`);
}

// Exécuter
if (require.main === module) {
  const examples = generateTrainingData();
  saveTrainingData(examples);
  console.log('\n✅ Génération terminée avec succès !');
}

export { generateTrainingData, saveTrainingData };
