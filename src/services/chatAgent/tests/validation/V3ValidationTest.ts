/**
 * Script de validation finale pour Kouakou V3.0
 * Teste 20 phrases variées et mesure les performances
 */

import { ChatAgentService } from '../../ChatAgentService';
import { AgentConfig, AgentContext } from '../../../../types/chatAgent';
import { PerformanceMonitor } from '../../monitoring/PerformanceMonitor';

interface TestCase {
  phrase: string;
  category: 'fast_path' | 'rag' | 'complex' | 'error';
  expectedIntent?: string;
  description: string;
}

const TEST_CASES: TestCase[] = [
  // Fast Path - Dépenses (devrait être < 300ms)
  { phrase: "J'ai claqué 150k en bouffe hier", category: 'fast_path', expectedIntent: 'create_depense', description: 'Dépense avec montant et catégorie' },
  { phrase: "Dépense Aliment 100000", category: 'fast_path', expectedIntent: 'create_depense', description: 'Dépense format structuré' },
  { phrase: "Payé 50k pour les médicaments", category: 'fast_path', expectedIntent: 'create_depense', description: 'Dépense santé' },
  
  // Fast Path - Ventes
  { phrase: "Vendu 5 porcs à 800000", category: 'fast_path', expectedIntent: 'create_revenu', description: 'Vente simple' },
  { phrase: "Vendu 3 porcs 1.5 million", category: 'fast_path', expectedIntent: 'create_revenu', description: 'Vente avec montant élevé' },
  
  // Fast Path - Pesées
  { phrase: "Peser P001 45 kg", category: 'fast_path', expectedIntent: 'create_pesee', description: 'Pesée format structuré' },
  { phrase: "P001 pèse 50 kilos", category: 'fast_path', expectedIntent: 'create_pesee', description: 'Pesée format naturel' },
  
  // Fast Path - Vaccinations
  { phrase: "Vaccin porcelets demain", category: 'fast_path', expectedIntent: 'create_vaccination', description: 'Vaccination avec date relative' },
  { phrase: "Vacciner P002", category: 'fast_path', expectedIntent: 'create_vaccination', description: 'Vaccination simple' },
  
  // RAG Path - Requêtes d'information
  { phrase: "Combien de porcs j'ai actuellement ?", category: 'rag', expectedIntent: 'get_statistics', description: 'Statistiques animaux' },
  { phrase: "Quel est l'état de mon stock ?", category: 'rag', expectedIntent: 'get_stock_status', description: 'État stock' },
  { phrase: "Donne-moi les statistiques", category: 'rag', expectedIntent: 'get_statistics', description: 'Statistiques générales' },
  
  // Complex - Phrases avec plusieurs informations
  { phrase: "Hier j'ai vendu 5 porcs à 800k à Moussa et aujourd'hui je dois vacciner les porcelets", category: 'complex', description: 'Action multiple' },
  { phrase: "Vendu 3 porcs 1.2M hier et dépensé 100k en bouffe ce matin", category: 'complex', description: 'Vente + dépense' },
  
  // Error cases - Phrases ambiguës ou incomplètes
  { phrase: "hier", category: 'error', description: 'Phrase trop courte' },
  { phrase: "quelque chose", category: 'error', description: 'Phrase sans intention claire' },
  { phrase: "bonjour", category: 'error', description: 'Salutation sans action' },
  
  // Cas limites
  { phrase: "dépense 5 millions", category: 'fast_path', expectedIntent: 'create_depense', description: 'Montant très élevé (devrait demander confirmation)' },
  { phrase: "Vendu 10 porcs", category: 'fast_path', expectedIntent: 'create_revenu', description: 'Vente sans montant (devrait demander clarification)' },
  { phrase: "Peser demain", category: 'fast_path', description: 'Pesée sans animal (devrait demander clarification)' },
];

interface ValidationResult {
  testCase: TestCase;
  success: boolean;
  responseTime: number;
  detectedIntent?: string;
  actionExecuted?: string;
  error?: string;
  fastPathUsed?: boolean;
  performanceMetrics?: {
    fastPathTime?: number;
    ragTime?: number;
    extractionTime?: number;
    apiCallTime?: number;
    actionExecutionTime?: number;
  };
}

/**
 * Crée un contexte de test mock
 */
function createMockContext(): AgentContext {
  return {
    projetId: 'test-projet-123',
    userId: 'test-user-123',
    userName: 'Test User',
    currentDate: new Date().toISOString().split('T')[0],
    availableAnimals: [
      { id: 'animal-1', code: 'P001', nom: 'Porc Test 1' },
      { id: 'animal-2', code: 'P002', nom: 'Porc Test 2' },
    ],
    availableLots: [],
    recentTransactions: [],
  };
}

/**
 * Crée une configuration de test
 */
function createTestConfig(): AgentConfig {
  return {
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    language: 'fr-CI',
    geminiApiKey: process.env.GEMINI_API_KEY || 'test-api-key', // Utiliser la clé d'API réelle si disponible
  };
}

/**
 * Exécute un test de validation
 */
async function runValidationTest(
  agent: ChatAgentService,
  testCase: TestCase
): Promise<ValidationResult> {
  const startTime = Date.now();
  
  try {
    const response = await agent.sendMessage(testCase.phrase);
    const responseTime = Date.now() - startTime;
    
    const detectedIntent = response.metadata?.pendingAction?.action || response.metadata?.actionExecuted;
    const actionExecuted = response.metadata?.actionExecuted;
    
    // Vérifier si fast path a été utilisé (basé sur le temps de réponse)
    const fastPathUsed = responseTime < 500; // Fast path devrait être très rapide
    
    // Récupérer les métriques de performance depuis le PerformanceMonitor
    // Note: Dans un vrai test, on devrait accéder aux métriques du monitor
    const performanceMetrics = {
      // Ces valeurs seraient normalement récupérées depuis PerformanceMonitor
      // Pour ce test, on les laisse vides car elles nécessitent un accès direct au monitor
    };
    
    // Vérifier le succès
    let success = true;
    if (testCase.expectedIntent && detectedIntent !== testCase.expectedIntent) {
      success = false;
    }
    
    return {
      testCase,
      success,
      responseTime,
      detectedIntent,
      actionExecuted,
      fastPathUsed,
      performanceMetrics,
    };
  } catch (error) {
    return {
      testCase,
      success: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Génère un rapport de validation
 */
function generateValidationReport(results: ValidationResult[]): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('RAPPORT DE VALIDATION KOUAKOU V3.0');
  lines.push('='.repeat(80));
  lines.push('');
  
  // Statistiques générales
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const successRate = (successfulTests / totalTests) * 100;
  
  lines.push('STATISTIQUES GÉNÉRALES');
  lines.push('-'.repeat(80));
  lines.push(`Total de tests: ${totalTests}`);
  lines.push(`Tests réussis: ${successfulTests}`);
  lines.push(`Taux de succès: ${successRate.toFixed(1)}%`);
  lines.push('');
  
  // Statistiques par catégorie
  const categories = ['fast_path', 'rag', 'complex', 'error'];
  lines.push('STATISTIQUES PAR CATÉGORIE');
  lines.push('-'.repeat(80));
  
  for (const category of categories) {
    const categoryTests = results.filter(r => r.testCase.category === category);
    const categorySuccess = categoryTests.filter(r => r.success).length;
    const avgResponseTime = categoryTests.reduce((sum, r) => sum + r.responseTime, 0) / categoryTests.length;
    
    lines.push(`${category.toUpperCase()}:`);
    lines.push(`  Tests: ${categoryTests.length}`);
    lines.push(`  Succès: ${categorySuccess}/${categoryTests.length} (${((categorySuccess / categoryTests.length) * 100).toFixed(1)}%)`);
    lines.push(`  Temps de réponse moyen: ${avgResponseTime.toFixed(0)}ms`);
    lines.push('');
  }
  
  // Temps de réponse Fast Path
  const fastPathTests = results.filter(r => r.testCase.category === 'fast_path');
  const fastPathAvgTime = fastPathTests.reduce((sum, r) => sum + r.responseTime, 0) / fastPathTests.length;
  const fastPathUnder300ms = fastPathTests.filter(r => r.responseTime < 300).length;
  
  lines.push('PERFORMANCE FAST PATH');
  lines.push('-'.repeat(80));
  lines.push(`Temps moyen: ${fastPathAvgTime.toFixed(0)}ms`);
  lines.push(`Objectif < 300ms: ${fastPathUnder300ms}/${fastPathTests.length} tests (${((fastPathUnder300ms / fastPathTests.length) * 100).toFixed(1)}%)`);
  lines.push('');
  
  // Détails des tests
  lines.push('DÉTAILS DES TESTS');
  lines.push('-'.repeat(80));
  
  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    lines.push(`${status} [${result.testCase.category}] ${result.testCase.description}`);
    lines.push(`   Phrase: "${result.testCase.phrase}"`);
    lines.push(`   Temps: ${result.responseTime}ms`);
    if (result.detectedIntent) {
      lines.push(`   Intention détectée: ${result.detectedIntent}`);
    }
    if (result.actionExecuted) {
      lines.push(`   Action exécutée: ${result.actionExecuted}`);
    }
    if (result.error) {
      lines.push(`   Erreur: ${result.error}`);
    }
    if (result.fastPathUsed) {
      lines.push(`   Fast Path: ✓`);
    }
    lines.push('');
  }
  
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

/**
 * Fonction principale de validation
 */
export async function runV3Validation(): Promise<string> {
  console.log('🚀 Démarrage de la validation Kouakou V3.0...\n');
  
  // Initialiser l'agent
  const config = createTestConfig();
  const agent = new ChatAgentService(config);
  const context = createMockContext();
  
  try {
    await agent.initializeContext(context);
    console.log('✓ Contexte initialisé\n');
  } catch (error) {
    console.error('✗ Erreur lors de l\'initialisation:', error);
    return 'ERREUR: Impossible d\'initialiser l\'agent';
  }
  
  // Exécuter les tests
  const results: ValidationResult[] = [];
  
  console.log(`Exécution de ${TEST_CASES.length} tests...\n`);
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`[${i + 1}/${TEST_CASES.length}] Test: ${testCase.description}...`);
    
    const result = await runValidationTest(agent, testCase);
    results.push(result);
    
    const status = result.success ? '✓' : '✗';
    console.log(`  ${status} ${result.responseTime}ms\n`);
    
    // Petite pause entre les tests pour éviter la surcharge
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Générer le rapport
  const report = generateValidationReport(results);
  
  return report;
}

// Si exécuté directement
if (require.main === module) {
  runV3Validation()
    .then(report => {
      console.log(report);
      process.exit(0);
    })
    .catch(error => {
      console.error('Erreur lors de la validation:', error);
      process.exit(1);
    });
}

