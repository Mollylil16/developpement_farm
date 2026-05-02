/**
 * Script de test pour GeminiConversationalAgent
 * Teste le nouvel agent conversationnel avec function calling
 * 
 * ⚠️ LIMITATION: Ce script nécessite un environnement React Native/Expo pour fonctionner
 * car GeminiConversationalAgent utilise AgentActionExecutor qui dépend d'apiClient
 * (qui utilise AsyncStorage de React Native).
 * 
 * Pour tester l'agent dans un environnement React Native :
 * - Utilisez Expo Go ou un simulateur
 * - Appelez l'agent depuis l'interface utilisateur de l'application
 * 
 * Alternative: Tester l'agent directement dans l'application React Native
 * via l'écran de chat (ChatAgentScreen).
 * 
 * Usage (dans l'app React Native): Ouvrir l'écran de chat et tester manuellement
 */

import { GeminiConversationalAgent } from '../src/services/agent/GeminiConversationalAgent';
import { AgentContext } from '../src/types/chatAgent';
import { format } from 'date-fns';

// Configuration
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Erreur: Clé API Gemini non trouvée');
  console.error('Définissez EXPO_PUBLIC_GEMINI_API_KEY ou GEMINI_API_KEY dans votre .env');
  process.exit(1);
}

// Contexte de test
const testContext: AgentContext = {
  projetId: 'test-projet-001',
  userId: 'test-user-001',
  userName: 'Test Éleveur',
  currentDate: format(new Date(), 'yyyy-MM-dd'),
  availableAnimals: [
    { id: '1', code: 'P001', nom: 'Porc Alpha', poids_kg: 45, statut: 'actif' },
    { id: '2', code: 'P002', nom: 'Porc Beta', poids_kg: 52, statut: 'actif' },
    { id: '3', code: 'P003', nom: 'Porc Gamma', poids_kg: 38, statut: 'actif' },
  ],
  recentTransactions: [
    { acheteur: 'Jean', montant: 50000, date: format(new Date(), 'yyyy-MM-dd') },
    { montant: 15000, categorie: 'alimentation', date: format(new Date(), 'yyyy-MM-dd') },
  ],
};

interface TestResult {
  scenario: string;
  message: string;
  functionsCalled: string[];
  response: string;
  responseTime: number;
  success: boolean;
  error?: string;
}

/**
 * Exécute un test de conversation
 */
async function runTest(
  agent: GeminiConversationalAgent,
  scenario: string,
  message: string
): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 SCÉNARIO: ${scenario}`);
  console.log(`💬 Message: "${message}"`);
  console.log(`${'='.repeat(60)}`);

  const startTime = Date.now();
  let functionsCalled: string[] = [];
  let response = '';
  let success = false;
  let error: string | undefined;

  try {
    // Réinitialiser l'historique des appels pour ce test
    agent.clearLastFunctionCalls();
    
    // Envoyer le message
    response = await agent.sendMessage(message);
    const responseTime = Date.now() - startTime;
    success = true;

    // Récupérer les fonctions réellement appelées
    functionsCalled = agent.getLastFunctionCalls();

    console.log(`✅ Réponse reçue en ${responseTime}ms`);
    console.log(`🔧 Fonctions détectées: ${functionsCalled.length > 0 ? functionsCalled.join(', ') : 'Aucune (réponse directe)'}`);
    console.log(`💭 Réponse de Kouakou:\n"${response}"`);

    return {
      scenario,
      message,
      functionsCalled,
      response,
      responseTime,
      success,
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    error = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error(`❌ Erreur après ${responseTime}ms:`, error);

    return {
      scenario,
      message,
      functionsCalled,
      response: '',
      responseTime,
      success: false,
      error,
    };
  }
}

/**
 * Teste une conversation multi-tour
 */
async function testMultiTurn(agent: GeminiConversationalAgent): Promise<TestResult[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 TEST MULTI-TOUR`);
  console.log(`${'='.repeat(60)}`);

  const results: TestResult[] = [];

  // Tour 1: Liste des animaux
  const result1 = await runTest(agent, 'Multi-tour (1/2)', 'liste mes animaux');
  results.push(result1);

  // Attendre un peu entre les tours
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Tour 2: Peser le premier
  const result2 = await runTest(agent, 'Multi-tour (2/2)', 'pèse le premier');
  results.push(result2);

  return results;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage des tests de GeminiConversationalAgent\n');
  console.log(`📅 Date: ${testContext.currentDate}`);
  console.log(`👤 Utilisateur: ${testContext.userName}`);
  console.log(`🐷 Animaux disponibles: ${testContext.availableAnimals?.length || 0}`);

  // Créer l'agent
  console.log('\n🔧 Initialisation de l\'agent...');
  const agent = new GeminiConversationalAgent(GEMINI_API_KEY, testContext);
  await agent.initialize();
  console.log('✅ Agent initialisé\n');

  const allResults: TestResult[] = [];

  // Test 1: Conversation simple
  const test1 = await runTest(
    agent,
    'Conversation simple',
    'salut kouakou'
  );
  allResults.push(test1);

  // Attendre entre les tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Action avec paramètres complets
  const test2 = await runTest(
    agent,
    'Action complète',
    'j\'ai vendu un porc à Jean pour 50000 hier'
  );
  allResults.push(test2);

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Action avec paramètres manquants
  const test3 = await runTest(
    agent,
    'Action incomplète',
    'j\'ai fait une vente'
  );
  allResults.push(test3);

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Question technique
  const test4 = await runTest(
    agent,
    'Question technique',
    'comment prévenir la peste porcine ?'
  );
  allResults.push(test4);

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 5: Multi-tour
  const multiTurnResults = await testMultiTurn(agent);
  allResults.push(...multiTurnResults);

  // Résumé des résultats
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log(`${'='.repeat(60)}`);

  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  const avgResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0) / allResults.length;

  console.log(`\n✅ Tests réussis: ${successful}/${allResults.length}`);
  console.log(`❌ Tests échoués: ${failed}/${allResults.length}`);
  console.log(`⏱️  Temps de réponse moyen: ${Math.round(avgResponseTime)}ms`);

  console.log(`\n📋 Détails par scénario:`);
  allResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.scenario}: ${result.responseTime}ms`);
    if (result.functionsCalled.length > 0) {
      console.log(`   → Fonctions: ${result.functionsCalled.join(', ')}`);
    }
    if (result.error) {
      console.log(`   → Erreur: ${result.error}`);
    }
  });

  // Comparaison avec l'ancien système
  console.log(`\n${'='.repeat(60)}`);
  console.log('🔄 COMPARAISON: Ancien vs Nouveau');
  console.log(`${'='.repeat(60)}`);
  console.log(`
ANCIEN SYSTÈME (ChatAgentService):
- ❌ Classification d'intention séparée
- ❌ Extraction de paramètres séparée
- ❌ Clarification manuelle nécessaire
- ❌ Réponses template/rigides
- ❌ Multi-étapes complexes

NOUVEAU SYSTÈME (GeminiConversationalAgent):
- ✅ Function calling natif (Gemini décide)
- ✅ Extraction automatique des paramètres
- ✅ Clarification naturelle intégrée
- ✅ Réponses conversationnelles fluides
- ✅ Flow simplifié: User → Agent → Réponse
- ✅ Contexte conversationnel géré automatiquement
  `);

  console.log('\n✨ Tests terminés !\n');
}

// Exécuter les tests
main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

