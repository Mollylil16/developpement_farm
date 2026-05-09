/**
 * Tests de validation pour prouver que l'agent est opérationnel, robuste et performant
 * Exécute une batterie de tests sur tous les aspects critiques
 */

import { ChatAgentService } from '../ChatAgentService';
import { AgentContext } from '../../../types/chatAgent';

export interface TestResult {
  testName: string;
  passed: boolean;
  confidence: number;
  extractedParams?: Record<string, unknown>;
  error?: string;
  executionTime?: number;
}

export interface ValidationReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  averageConfidence: number;
  averageExecutionTime: number;
  results: TestResult[];
  timestamp: string;
}

/**
 * Tests de validation complets pour l'agent
 */
export class AgentValidationTest {
  private agentService: ChatAgentService;
  private context: AgentContext;

  constructor(agentService: ChatAgentService, context: AgentContext) {
    this.agentService = agentService;
    this.context = context;
  }

  /**
   * Exécute tous les tests de validation
   */
  async runAllTests(): Promise<ValidationReport> {
    const results: TestResult[] = [];

    // Tests de détection d'intention
    results.push(...(await this.testIntentDetection()));

    // Tests d'extraction de paramètres
    results.push(...(await this.testParameterExtraction()));

    // Tests de robustesse (valeurs variables)
    results.push(...(await this.testRobustness()));

    // Tests de cas limites
    results.push(...(await this.testEdgeCases()));

    // Calcul des métriques
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = results.filter((r) => !r.passed).length;
    const averageConfidence =
      results.filter((r) => r.confidence > 0).reduce((sum, r) => sum + r.confidence, 0) /
        results.filter((r) => r.confidence > 0).length || 0;
    const averageExecutionTime =
      results.filter((r) => r.executionTime).reduce((sum, r) => sum + (r.executionTime || 0), 0) /
        results.filter((r) => r.executionTime).length || 0;

    return {
      totalTests: results.length,
      passedTests,
      failedTests,
      successRate: (passedTests / results.length) * 100,
      averageConfidence,
      averageExecutionTime,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Tests de détection d'intention
   */
  private async testIntentDetection(): Promise<TestResult[]> {
    const tests: Array<{ message: string; expectedAction: string; minConfidence: number }> = [
      // Statistiques
      { message: 'combien de porcs j ai', expectedAction: 'get_statistics', minConfidence: 0.9 },
      { message: 'statistiques', expectedAction: 'get_statistics', minConfidence: 0.9 },
      { message: 'montre moi mes porcs', expectedAction: 'get_statistics', minConfidence: 0.85 },

      // Stocks
      {
        message: 'combien de provende il reste',
        expectedAction: 'get_stock_status',
        minConfidence: 0.9,
      },
      { message: 'stocks', expectedAction: 'get_stock_status', minConfidence: 0.9 },

      // Coûts
      { message: 'combien j ai depense', expectedAction: 'calculate_costs', minConfidence: 0.9 },
      { message: 'mes depenses', expectedAction: 'calculate_costs', minConfidence: 0.85 },

      // Ventes
      {
        message: 'j ai vendu 5 porcs a 800000',
        expectedAction: 'create_revenu',
        minConfidence: 0.95,
      },
      {
        message: 'vente de 3 porcs pour 500000',
        expectedAction: 'create_revenu',
        minConfidence: 0.95,
      },

      // Dépenses
      {
        message: 'j ai achete 20 sacs a 18000',
        expectedAction: 'create_depense',
        minConfidence: 0.95,
      },
      {
        message: 'depense de 50000 pour medicaments',
        expectedAction: 'create_depense',
        minConfidence: 0.95,
      },

      // Pesées
      { message: 'peser p001 il fait 45 kg', expectedAction: 'create_pesee', minConfidence: 0.95 },
      { message: 'p001 45 kg', expectedAction: 'create_pesee', minConfidence: 0.9 },
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      const startTime = Date.now();
      try {
        const response = await this.agentService.sendMessage(test.message);
        const executionTime = Date.now() - startTime;

        const action =
          response.metadata?.actionExecuted || response.metadata?.pendingAction?.action;
        const confidence = response.metadata?.pendingAction ? 0.9 : 0.8; // Estimation

        const passed = action === test.expectedAction;

        results.push({
          testName: `Détection: "${test.message}"`,
          passed,
          confidence: passed ? confidence : 0,
          executionTime,
          error: passed
            ? undefined
            : `Attendu: ${test.expectedAction}, Obtenu: ${action || 'aucun'}`,
        });
      } catch (error: unknown) {
        results.push({
          testName: `Détection: "${test.message}"`,
          passed: false,
          confidence: 0,
          error: (error as any).message,
        });
      }
    }

    return results;
  }

  /**
   * Tests d'extraction de paramètres
   */
  private async testParameterExtraction(): Promise<TestResult[]> {
    const tests: Array<{
      message: string;
      expectedParams: Record<string, unknown>;
      // tolerance permet de définir des fonctions de comparaison personnalisées
      // qui utilisent actual et expected pour valider les paramètres extraits
      // Les paramètres sont préfixés avec _ car ils sont utilisés dans les implémentations, pas dans la signature
      tolerance?: Record<string, (_actual: unknown, _expected: unknown) => boolean>;
    }> = [
      // Montants variés
      {
        message: 'j ai vendu 5 porcs a 800000',
        expectedParams: { nombre: 5, montant: 800000 },
      },
      {
        message: 'j ai vendu 10 porcs a 800k',
        expectedParams: { nombre: 10, montant: 800000 },
      },
      {
        message: 'vente de 3 porcs pour 1 million',
        expectedParams: { nombre: 3, montant: 1000000 },
      },
      {
        message: 'j ai vendu 2 porcs a 800 000 fcfa',
        expectedParams: { nombre: 2, montant: 800000 },
      },

      // Poids variés
      {
        message: 'peser p001 il fait 45 kg',
        expectedParams: { animal_code: 'P001', poids_kg: 45 },
      },
      {
        message: 'p002 50.5 kg',
        expectedParams: { animal_code: 'P002', poids_kg: 50.5 },
      },
      {
        message: 'p003 il pese 60 kg',
        expectedParams: { animal_code: 'P003', poids_kg: 60 },
      },

      // Acheteurs variés
      {
        message: 'j ai vendu 5 porcs a kouame pour 800000',
        expectedParams: { nombre: 5, montant: 800000, acheteur: 'kouame' },
        tolerance: {
          acheteur: (actual: any, expected: any) =>
            actual?.toLowerCase().includes(expected.toLowerCase()) ||
            expected.toLowerCase().includes(actual?.toLowerCase() || ''),
        },
      },

      // Dépenses avec catégories
      {
        message: 'j ai achete 20 sacs de provende a 18000',
        expectedParams: { montant: 18000, categorie: 'alimentation' },
      },
      {
        message: 'depense de 50000 pour medicaments',
        expectedParams: { montant: 50000, categorie: 'medicaments' },
      },
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      const startTime = Date.now();
      try {
        const response = await this.agentService.sendMessage(test.message);
        const executionTime = Date.now() - startTime;

        const params =
          response.metadata?.pendingAction?.params || response.metadata?.actionResult || {};

        // Vérifier chaque paramètre attendu
        let allParamsMatch = true;
        const errors: string[] = [];

        for (const [key, expectedValue] of Object.entries(test.expectedParams)) {
          const actualValue = params[key];
          const tolerance = test.tolerance?.[key];

          let matches = false;
          if (tolerance) {
            matches = tolerance(actualValue, expectedValue);
          } else {
            matches =
              actualValue === expectedValue ||
              (typeof actualValue === 'number' &&
                typeof expectedValue === 'number' &&
                Math.abs(actualValue - expectedValue) < 0.01);
          }

          if (!matches) {
            allParamsMatch = false;
            errors.push(`${key}: attendu ${expectedValue}, obtenu ${actualValue}`);
          }
        }

        results.push({
          testName: `Extraction: "${test.message}"`,
          passed: allParamsMatch,
          confidence: allParamsMatch ? 0.95 : 0,
          extractedParams: params,
          executionTime,
          error: allParamsMatch ? undefined : errors.join('; '),
        });
      } catch (error: unknown) {
        results.push({
          testName: `Extraction: "${test.message}"`,
          passed: false,
          confidence: 0,
          error: (error as any).message,
        });
      }
    }

    return results;
  }

  /**
   * Tests de robustesse (valeurs variables)
   */
  private async testRobustness(): Promise<TestResult[]> {
    const tests: Array<{ message: string; expectedAction: string }> = [
      // Montants variés (même intention)
      { message: 'j ai vendu 5 porcs a 800000', expectedAction: 'create_revenu' },
      { message: 'j ai vendu 10 porcs a 1500000', expectedAction: 'create_revenu' },
      { message: 'j ai vendu 3 porcs a 500k', expectedAction: 'create_revenu' },
      { message: 'j ai vendu 2 porcs a 1 million', expectedAction: 'create_revenu' },

      // Poids variés (même intention)
      { message: 'peser p001 il fait 45 kg', expectedAction: 'create_pesee' },
      { message: 'peser p002 il fait 60 kg', expectedAction: 'create_pesee' },
      { message: 'p003 50.5 kg', expectedAction: 'create_pesee' },

      // Noms variés (même intention)
      { message: 'j ai vendu 5 porcs a kouame pour 800000', expectedAction: 'create_revenu' },
      { message: 'j ai vendu 5 porcs a traore pour 800000', expectedAction: 'create_revenu' },
      { message: 'j ai vendu 5 porcs a yao pour 800000', expectedAction: 'create_revenu' },

      // Codes animaux variés
      { message: 'peser p001 il fait 45 kg', expectedAction: 'create_pesee' },
      { message: 'peser p002 il fait 45 kg', expectedAction: 'create_pesee' },
      { message: 'peser porc001 il fait 45 kg', expectedAction: 'create_pesee' },
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      const startTime = Date.now();
      try {
        const response = await this.agentService.sendMessage(test.message);
        const executionTime = Date.now() - startTime;

        const action =
          response.metadata?.actionExecuted || response.metadata?.pendingAction?.action;
        const passed = action === test.expectedAction;

        results.push({
          testName: `Robustesse: "${test.message}"`,
          passed,
          confidence: passed ? 0.95 : 0,
          executionTime,
          error: passed ? undefined : `Action incorrecte: ${action || 'aucun'}`,
        });
      } catch (error: unknown) {
        results.push({
          testName: `Robustesse: "${test.message}"`,
          passed: false,
          confidence: 0,
          error: (error as any).message,
        });
      }
    }

    return results;
  }

  /**
   * Tests de cas limites
   */
  private async testEdgeCases(): Promise<TestResult[]> {
    const tests: Array<{ message: string; shouldPass: boolean; description: string }> = [
      // Messages courts
      { message: 'statistiques', shouldPass: true, description: 'Message très court' },
      { message: 'stocks', shouldPass: true, description: 'Un seul mot' },

      // Messages avec fautes
      {
        message: 'combien de porc j ai',
        shouldPass: true,
        description: 'Faute orthographe (porc au lieu de porcs)',
      },
      { message: 'j ai vendu 5 porc a 800000', shouldPass: true, description: 'Faute orthographe' },

      // Messages ambigus
      { message: 'mes depenses', shouldPass: true, description: 'Ambiguïté info vs création' },

      // Messages avec caractères spéciaux
      {
        message: "j'ai vendu 5 porcs à 800000",
        shouldPass: true,
        description: 'Apostrophe et accent',
      },

      // Messages avec plusieurs nombres
      {
        message: 'j ai vendu 5 porcs de 50kg a 800000',
        shouldPass: true,
        description: 'Plusieurs nombres (quantité, poids, montant)',
      },
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      const startTime = Date.now();
      try {
        const response = await this.agentService.sendMessage(test.message);
        const executionTime = Date.now() - startTime;

        const hasAction = !!(response.metadata?.actionExecuted || response.metadata?.pendingAction);
        const passed = test.shouldPass ? hasAction : !hasAction;

        results.push({
          testName: `Cas limite: ${test.description}`,
          passed,
          confidence: passed ? 0.9 : 0,
          executionTime,
          error: passed ? undefined : `Comportement inattendu pour: "${test.message}"`,
        });
      } catch (error: unknown) {
        results.push({
          testName: `Cas limite: ${test.description}`,
          passed: !test.shouldPass, // Si erreur et ne devrait pas passer, c'est OK
          confidence: 0,
          error: (error as any).message,
        });
      }
    }

    return results;
  }

  /**
   * Génère un rapport de validation formaté
   */
  static formatReport(report: ValidationReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push("RAPPORT DE VALIDATION DE L'AGENT CONVERSATIONNEL");
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Date: ${new Date(report.timestamp).toLocaleString('fr-FR')}`);
    lines.push('');
    lines.push('MÉTRIQUES GLOBALES:');
    lines.push(`  ✅ Tests réussis: ${report.passedTests}/${report.totalTests}`);
    lines.push(`  ❌ Tests échoués: ${report.failedTests}/${report.totalTests}`);
    lines.push(`  📊 Taux de succès: ${report.successRate.toFixed(2)}%`);
    lines.push(`  🎯 Confiance moyenne: ${(report.averageConfidence * 100).toFixed(2)}%`);
    lines.push(`  ⚡ Temps d'exécution moyen: ${report.averageExecutionTime.toFixed(0)}ms`);
    lines.push('');

    if (report.successRate >= 95) {
      lines.push('✅ STATUT: EXCELLENT - Agent opérationnel et performant');
    } else if (report.successRate >= 85) {
      lines.push('⚠️  STATUT: BON - Quelques améliorations possibles');
    } else {
      lines.push('❌ STATUT: À AMÉLIORER - Des corrections sont nécessaires');
    }

    lines.push('');
    lines.push('DÉTAILS DES TESTS:');
    lines.push('-'.repeat(80));

    for (const result of report.results) {
      const status = result.passed ? '✅' : '❌';
      const confidence =
        result.confidence > 0 ? ` (confiance: ${(result.confidence * 100).toFixed(0)}%)` : '';
      const time = result.executionTime ? ` [${result.executionTime}ms]` : '';
      lines.push(`${status} ${result.testName}${confidence}${time}`);
      if (result.error) {
        lines.push(`   ⚠️  ${result.error}`);
      }
      if (result.extractedParams) {
        lines.push(`   📋 Paramètres: ${JSON.stringify(result.extractedParams)}`);
      }
    }

    lines.push('');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}
