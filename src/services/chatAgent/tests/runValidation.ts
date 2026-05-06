/**
 * Script pour exécuter les tests de validation de l'agent
 * Usage: Appeler depuis l'application ou un script de test
 * 
 * Note: Les tests utilisent maintenant le service local sans Gemini.
 * En production, utilisez le backend via useChatAgent.
 */

import { ChatAgentService } from '../ChatAgentService';
import { AgentConfig, AgentContext } from '../../../types/chatAgent';
import { AgentValidationTest, ValidationReport } from './AgentValidationTest';
import { exportValidationReportPDF } from './ValidationReportPDF';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';

/**
 * Exécute les tests de validation et retourne le rapport
 */
export async function runAgentValidation(context: AgentContext): Promise<ValidationReport> {
  // Configuration de l'agent (sans Gemini - détection locale uniquement)
  const config: AgentConfig = {
    model: 'local',
    language: 'fr-CI',
    enableVoice: false,
    enableProactiveAlerts: true,
  };

  // Créer l'agent
  const agentService = new ChatAgentService(config);
  await agentService.initializeContext(context);

  // Exécuter les tests
  const validator = new AgentValidationTest(agentService, context);
  const report = await validator.runAllTests();

  return report;
}

/**
 * Affiche le rapport dans la console ET génère automatiquement le PDF
 */
export async function runAndDisplayValidation(context: AgentContext): Promise<void> {
  console.log('🚀 Démarrage des tests de validation...\n');

  const report = await runAgentValidation(context);
  const formattedReport = AgentValidationTest.formatReport(report);

  console.log(formattedReport);

  // Afficher un résumé visuel
  if (report.successRate >= 95) {
    console.log("\n🎉 FÉLICITATIONS ! L'agent est opérationnel et performant à 100% !");
  } else if (report.successRate >= 85) {
    console.log("\n✅ L'agent est opérationnel avec quelques améliorations possibles.");
  } else {
    console.log("\n⚠️  L'agent nécessite des améliorations.");
  }

  // Générer automatiquement le PDF après les tests
  console.log('\n📄 Génération du rapport PDF...');
  try {
    await exportValidationReportPDF({
      validationReport: report,
      projectName: context.projetId ?? undefined,
      userName: context.userName ?? undefined,
    });
    console.log('✅ Rapport PDF généré et prêt à être partagé !');
  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error.message);
  }
}

/**
 * Génère le rapport PDF de validation complet
 * Inclut : taux de succès, métriques temps réel, preuves, problèmes
 */
export async function generateValidationPDF(
  context: AgentContext,
  performanceMetrics?: PerformanceMonitor
): Promise<void> {
  console.log('📄 Génération du rapport PDF de validation...\n');

  // Exécuter les tests
  const validationReport = await runAgentValidation(context);

  // Récupérer les métriques de performance si disponibles
  const metrics = performanceMetrics ? performanceMetrics.getMetrics() : undefined;

  // Générer et partager le PDF
  await exportValidationReportPDF({
    validationReport,
    performanceMetrics: metrics,
    projectName: context.projetId ?? undefined,
    userName: context.userName ?? undefined,
  });

  console.log('✅ Rapport PDF généré et prêt à être partagé !');
}
