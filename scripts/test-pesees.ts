/**
 * Script de test spécifique pour les pesées
 * Vérifie que l'extraction de paramètres (animal_code, poids_kg) fonctionne correctement
 */

import { IntentRAG } from '../src/services/chatAgent/core/IntentRAG';
import { ParameterExtractor } from '../src/services/chatAgent/core/ParameterExtractor';
import { OpenAIIntentService } from '../src/services/chatAgent/core/OpenAIIntentService';

// Configuration OpenAI (optionnelle)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Tests de pesées avec différents formats
const PESEE_TESTS = [
  // Format 1: "peser le porc P001 il fait 45 kg"
  {
    msg: 'peser le porc P001 il fait 45 kg',
    expected: { animal_code: 'P001', poids_kg: 45 },
    description: 'Format complet avec article',
  },
  // Format 2: "P001 fait 45 kg"
  {
    msg: 'P001 fait 45 kg',
    expected: { animal_code: 'P001', poids_kg: 45 },
    description: 'Format court code + poids',
  },
  // Format 3: "P001 pese 45 kg"
  {
    msg: 'P001 pese 45 kg',
    expected: { animal_code: 'P001', poids_kg: 45 },
    description: 'Format avec verbe "pese"',
  },
  // Format 4: "peser P001 45 kg"
  {
    msg: 'peser P001 45 kg',
    expected: { animal_code: 'P001', poids_kg: 45 },
    description: 'Format verbe + code + poids',
  },
  // Format 5: "pesee de P001 60 kg"
  {
    msg: 'pesee de P001 60 kg',
    expected: { animal_code: 'P001', poids_kg: 60 },
    description: 'Format avec "pesee de"',
  },
  // Format 6: "le porc P002 pese 50 kg"
  {
    msg: 'le porc P002 pese 50 kg',
    expected: { animal_code: 'P002', poids_kg: 50 },
    description: 'Format avec article et verbe',
  },
  // Format 7: "P003 55 kg" (très court)
  {
    msg: 'P003 55 kg',
    expected: { animal_code: 'P003', poids_kg: 55 },
    description: 'Format minimal code + poids',
  },
  // Format 8: "j ai pese le porc P004 il fait 65 kg"
  {
    msg: 'j ai pese le porc P004 il fait 65 kg',
    expected: { animal_code: 'P004', poids_kg: 65 },
    description: 'Format avec passé composé',
  },
  // Format 9: "peser p005 il fait 70 kg"
  {
    msg: 'peser p005 il fait 70 kg',
    expected: { animal_code: 'P005', poids_kg: 70 },
    description: 'Format avec code en minuscule',
  },
  // Format 10: "pesee de 45 kg" (sans code animal)
  {
    msg: 'pesee de 45 kg',
    expected: { poids_kg: 45 },
    description: 'Format sans code animal (poids seulement)',
  },
  // Format 11: "P001 fait 45.5 kg" (décimal)
  {
    msg: 'P001 fait 45.5 kg',
    expected: { animal_code: 'P001', poids_kg: 45.5 },
    description: 'Format avec poids décimal (point)',
  },
  // Format 12: "P002 pese 50,5 kg" (décimal avec virgule)
  {
    msg: 'P002 pese 50,5 kg',
    expected: { animal_code: 'P002', poids_kg: 50.5 },
    description: 'Format avec poids décimal (virgule)',
  },
  // Format 13: "peser le porc P010 il fait 100 kg"
  {
    msg: 'peser le porc P010 il fait 100 kg',
    expected: { animal_code: 'P010', poids_kg: 100 },
    description: 'Format avec code à 3 chiffres',
  },
  // Format 14: "enregistrer pesee P001 45 kg"
  {
    msg: 'enregistrer pesee P001 45 kg',
    expected: { animal_code: 'P001', poids_kg: 45 },
    description: 'Format avec verbe "enregistrer"',
  },
  // Format 15: "noter pesee de P002 50 kg"
  {
    msg: 'noter pesee de P002 50 kg',
    expected: { animal_code: 'P002', poids_kg: 50 },
    description: 'Format avec verbe "noter"',
  },
];

// Tests de détection d'intention pour les pesées
const DETECTION_TESTS = [
  { msg: 'peser le porc P001 il fait 45 kg', expectedAction: 'create_pesee' },
  { msg: 'P001 fait 45 kg', expectedAction: 'create_pesee' },
  { msg: 'pesee de 50 kg', expectedAction: 'create_pesee' },
  { msg: 'j ai pese un porc', expectedAction: 'create_pesee' },
  { msg: 'enregistrer pesee', expectedAction: 'create_pesee' },
];

async function testPesees() {
  console.log('🧪 Tests spécifiques pour les pesées\n');
  console.log('='.repeat(80));
  console.log("📊 TESTS D'EXTRACTION DE PARAMÈTRES\n");
  console.log('='.repeat(80));

  const parameterExtractor = new ParameterExtractor({
    currentDate: new Date().toISOString().split('T')[0],
    availableAnimals: [
      { id: '1', code: 'P001', nom: 'Porc 001' },
      { id: '2', code: 'P002', nom: 'Porc 002' },
      { id: '3', code: 'P003', nom: 'Porc 003' },
      { id: '4', code: 'P004', nom: 'Porc 004' },
      { id: '5', code: 'P005', nom: 'Porc 005' },
      { id: '6', code: 'P010', nom: 'Porc 010' },
    ],
  });

  let passed = 0;
  let failed = 0;
  const failures: Array<{ test: unknown; extracted: unknown; error: string }> = [];

  for (const test of PESEE_TESTS) {
    try {
      const extracted = parameterExtractor.extractAll(test.msg);

      // Vérifier chaque paramètre attendu
      let testPassed = true;
      const errors: string[] = [];

      for (const [key, expectedValue] of Object.entries(test.expected)) {
        const actualValue = (extracted as Record<string, unknown>)[key];

        if (actualValue === undefined) {
          testPassed = false;
          errors.push(`❌ ${key}: manquant (attendu: ${expectedValue})`);
        } else if (
          key === 'poids_kg' &&
          typeof actualValue === 'number' &&
          typeof expectedValue === 'number' &&
          Math.abs(actualValue - expectedValue) > 0.01
        ) {
          testPassed = false;
          errors.push(`❌ ${key}: ${actualValue} (attendu: ${expectedValue})`);
        } else if (key === 'animal_code' && actualValue !== expectedValue) {
          testPassed = false;
          errors.push(`❌ ${key}: "${actualValue}" (attendu: "${expectedValue}")`);
        } else {
          // ✅ Paramètre correct
        }
      }

      if (testPassed) {
        passed++;
        console.log(`✅ ${test.description}`);
        console.log(`   Message: "${test.msg}"`);
        console.log(`   Extrait: ${JSON.stringify(extracted)}`);
        console.log('');
      } else {
        failed++;
        failures.push({
          test,
          extracted,
          error: errors.join(', '),
        });
        console.log(`❌ ${test.description}`);
        console.log(`   Message: "${test.msg}"`);
        console.log(`   Attendu: ${JSON.stringify(test.expected)}`);
        console.log(`   Extrait: ${JSON.stringify(extracted)}`);
        console.log(`   Erreurs: ${errors.join(', ')}`);
        console.log('');
      }
    } catch (error: unknown) {
      failed++;
      failures.push({
        test,
        extracted: {},
        error: error.message,
      });
      console.log(`❌ ${test.description} - Erreur: ${error.message}`);
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log("📊 TESTS DE DÉTECTION D'INTENTION\n");
  console.log('='.repeat(80));

  const openAIService = OPENAI_API_KEY ? new OpenAIIntentService(OPENAI_API_KEY) : undefined;
  const intentRAG = new IntentRAG(undefined, openAIService);

  let detectionPassed = 0;
  let detectionFailed = 0;

  for (const test of DETECTION_TESTS) {
    try {
      const detected = await intentRAG.detectIntent(test.msg);

      if (detected && detected.action === test.expectedAction) {
        detectionPassed++;
        console.log(
          `✅ "${test.msg}" → ${detected.action} (confiance: ${(detected.confidence || 0) * 100}%)`
        );
      } else {
        detectionFailed++;
        console.log(
          `❌ "${test.msg}" → ${detected?.action || 'aucune'} (attendu: ${test.expectedAction})`
        );
      }
    } catch (error: unknown) {
      detectionFailed++;
      console.log(`❌ "${test.msg}" → Erreur: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📈 RÉSUMÉ DES TESTS\n');
  console.log('='.repeat(80));
  console.log(`Extraction de paramètres:`);
  console.log(`  ✅ Réussis: ${passed}/${PESEE_TESTS.length}`);
  console.log(`  ❌ Échoués: ${failed}/${PESEE_TESTS.length}`);
  console.log(`  📊 Taux de succès: ${((passed / PESEE_TESTS.length) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`Détection d'intention:`);
  console.log(`  ✅ Réussis: ${detectionPassed}/${DETECTION_TESTS.length}`);
  console.log(`  ❌ Échoués: ${detectionFailed}/${DETECTION_TESTS.length}`);
  console.log(
    `  📊 Taux de succès: ${((detectionPassed / DETECTION_TESTS.length) * 100).toFixed(1)}%`
  );
  console.log('');

  if (failures.length > 0) {
    console.log('='.repeat(80));
    console.log('⚠️  ÉCHECS DÉTAILLÉS\n');
    console.log('='.repeat(80));
    for (const failure of failures) {
      console.log(`❌ ${failure.test.description}`);
      console.log(`   Message: "${failure.test.msg}"`);
      console.log(`   Attendu: ${JSON.stringify(failure.test.expected)}`);
      console.log(`   Extrait: ${JSON.stringify(failure.extracted)}`);
      console.log(`   Erreur: ${failure.error}`);
      console.log('');
    }
  }

  // Recommandations
  if (failed > 0 || detectionFailed > 0) {
    console.log('='.repeat(80));
    console.log('💡 RECOMMANDATIONS\n');
    console.log('='.repeat(80));

    if (failed > 0) {
      console.log("Pour améliorer l'extraction de paramètres:");
      console.log('  1. Vérifier les patterns regex dans ParameterExtractor.extractPoids()');
      console.log('  2. Vérifier les patterns regex dans ParameterExtractor.extractAnimalCode()');
      console.log(
        "  3. Ajouter plus d'exemples dans la base de connaissances pour les cas échoués"
      );
      console.log('');
    }

    if (detectionFailed > 0) {
      console.log("Pour améliorer la détection d'intention:");
      console.log("  1. Ajouter plus d'exemples de pesées dans INTENT_KNOWLEDGE_BASE");
      console.log('  2. Vérifier que les exemples générés incluent les formats qui échouent');
      console.log('  3. Configurer OpenAI API key pour utiliser les embeddings (plus précis)');
      console.log('');
    }
  } else {
    console.log('🎉 Tous les tests sont passés avec succès !');
    console.log("✅ L'extraction de paramètres pour les pesées fonctionne correctement.");
  }

  process.exit(failed > 0 || detectionFailed > 0 ? 1 : 0);
}

// Exécuter les tests
testPesees().catch((error) => {
  console.error('❌ Erreur lors des tests:', error);
  process.exit(1);
});
