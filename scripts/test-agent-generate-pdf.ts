/**
 * Script pour tester l'agent IA depuis le shell et générer le PDF
 * Usage: npx ts-node scripts/test-agent-generate-pdf.ts
 *
 * Ce script :
 * 1. Teste l'agent avec des messages variés
 * 2. Collecte les métriques de performance
 * 3. Génère automatiquement le PDF avec rapport complet
 */

import { ChatAgentService } from '../src/services/chatAgent/ChatAgentService';
import { AgentConfig, AgentContext } from '../src/types/chatAgent';
// Migration vers Gemini: plus besoin d'OPENAI_CONFIG
// const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Géré par le backend
import {
  AgentValidationTest,
  // ValidationReport, // Non utilisé actuellement
} from '../src/services/chatAgent/tests/AgentValidationTest';
import { PerformanceMonitor } from '../src/services/chatAgent/monitoring/PerformanceMonitor';
import { exportValidationReportPDF } from '../src/services/chatAgent/tests/ValidationReportPDF';

// Configuration de test - MODIFIEZ SELON VOS BESOINS
const TEST_CONTEXT: AgentContext = {
  projetId: 'test-projet-001',
  userId: 'test-user-001',
  userName: 'Test Utilisateur',
  currentDate: new Date().toISOString().split('T')[0],
  availableAnimals: [
    { id: 'P001', code: 'P001', nom: 'Porc 001' },
    { id: 'P002', code: 'P002', nom: 'Porc 002' },
  ],
};

// Messages de test pour évaluer la performance
const TEST_MESSAGES = [
  'combien de porcs j ai',
  'j ai vendu 5 porcs a 800000',
  'j ai achete 20 sacs a 18000',
  'peser p001 il fait 45 kg',
  'mes depenses',
  'stocks',
  'rappels',
];

async function main() {
  console.log("🚀 Démarrage des tests de l'agent conversationnel...\n");

  try {
    // 1. Initialiser l'agent
    console.log("📦 Initialisation de l'agent...");
    // Migration vers Gemini: utiliser le backend au lieu d'OpenAI
    const config: AgentConfig = {
      geminiApiKey: undefined, // Le backend gère la clé Gemini
      model: 'gemini-2.5-flash', // Modèle Gemini
      language: 'fr-CI',
      enableVoice: false,
      enableProactiveAlerts: false,
    };

    const agentService = new ChatAgentService(config);
    await agentService.initializeContext(TEST_CONTEXT);
    console.log('✅ Agent initialisé\n');

    // 2. Créer le monitor de performance
    const monitor = new PerformanceMonitor();

    // 3. Tester avec des messages réels
    console.log('🧪 Test avec messages réels...');
    for (const message of TEST_MESSAGES) {
      try {
        const startTime = Date.now();
        const response = await agentService.sendMessage(message);
        const responseTime = Date.now() - startTime;

        // Simuler l'enregistrement pour le monitor
        const userMsg = {
          id: 'test',
          role: 'user' as const,
          content: message,
          timestamp: new Date().toISOString(),
        };
        monitor.recordInteraction(userMsg, response, responseTime);

        console.log(
          `  ✅ "${message}" → ${response.metadata?.actionExecuted || response.metadata?.pendingAction?.action || 'réponse'}`
        );
      } catch (error: unknown) {
        console.error(`  ❌ Erreur avec "${message}":`, error.message);
        monitor.recordError(message, error.message);
      }
    }
    console.log('');

    // 4. Exécuter les tests de validation complets
    console.log('📊 Exécution des tests de validation complets...');
    const validator = new AgentValidationTest(agentService, TEST_CONTEXT);
    const validationReport = await validator.runAllTests();
    console.log('✅ Tests de validation terminés\n');

    // 5. Afficher le résumé
    console.log('='.repeat(80));
    console.log('RÉSUMÉ DES TESTS');
    console.log('='.repeat(80));
    console.log(`Tests totaux: ${validationReport.totalTests}`);
    console.log(`Tests réussis: ${validationReport.passedTests}`);
    console.log(`Tests échoués: ${validationReport.failedTests}`);
    console.log(`Taux de succès: ${validationReport.successRate.toFixed(2)}%`);
    console.log(`Confiance moyenne: ${(validationReport.averageConfidence * 100).toFixed(2)}%`);
    console.log(`Temps moyen: ${validationReport.averageExecutionTime.toFixed(0)}ms`);
    console.log('='.repeat(80));
    console.log('');

    // 6. Générer le PDF automatiquement
    console.log('📄 Génération du rapport PDF...');
    const performanceMetrics = monitor.getMetrics();

    await exportValidationReportPDF({
      validationReport,
      performanceMetrics,
      projectName: TEST_CONTEXT.projetId,
      userName: TEST_CONTEXT.userName,
    });

    console.log('✅ Rapport PDF généré avec succès !');
    console.log('📤 Le PDF est prêt à être partagé avec votre collaborateur.');
    console.log('');

    // 7. Afficher le rapport formaté
    const formattedReport = AgentValidationTest.formatReport(validationReport);
    console.log(formattedReport);
  } catch (error: unknown) {
    console.error('\n❌ Erreur lors des tests:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
main().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
