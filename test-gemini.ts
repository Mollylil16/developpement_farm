/**
 * Script de test pour l'intégration Gemini
 * Usage: npx ts-node test-gemini.ts
 * 
 * Ce script teste :
 * - La classification d'intention avec GeminiIntentService
 * - L'extraction de paramètres avec GeminiParameterExtractor
 */

// Note: Les variables d'environnement Expo (EXPO_PUBLIC_*) sont automatiquement chargées
// Pour .env, vous pouvez installer dotenv: npm install dotenv

import { GeminiIntentService } from './src/services/chatAgent/core/GeminiIntentService';
import { GeminiParameterExtractor } from './src/services/chatAgent/core/GeminiParameterExtractor';
import { AgentActionType } from './src/types/chatAgent';

// Clé API Gemini (depuis .env ou en dur pour le test)
const GEMINI_API_KEY = 
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
  process.env.GEMINI_API_KEY || 
  'AIzaSyDyHsxNriGf0EHGTjdH8d_nBQ5pbpyg0KU'; // Clé fournie par l'utilisateur

console.log('🧪 Test d\'intégration Gemini\n');
console.log('🔑 Clé API Gemini:', GEMINI_API_KEY ? '✅ Configurée' : '❌ Non configurée');
console.log('');

async function testGeminiIntegration() {
  try {
    // ============================================
    // Test 1: Classification d'intention
    // ============================================
    console.log('📋 TEST 1: Classification d\'intention');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const testMessage = "j'ai vendu un porc à Jean pour 50000 FCFA hier";
    console.log('💬 Message utilisateur:', testMessage);
    console.log('');
    
    const intentService = new GeminiIntentService(GEMINI_API_KEY);
    
    const availableActions: AgentActionType[] = [
      'create_revenu',
      'create_depense',
      'create_pesee',
      'create_vaccination',
      'create_visite_veterinaire',
      'get_statistics',
      'get_stock_status',
      'calculate_costs',
      'other',
    ];
    
    console.log('⏳ Classification en cours...');
    const classificationResult = await intentService.classifyIntent(
      testMessage,
      availableActions
    );
    
    if (classificationResult) {
      console.log('✅ Résultat de classification:');
      console.log('   Action:', classificationResult.action);
      console.log('   Confiance:', classificationResult.confidence);
      if (classificationResult.reasoning) {
        console.log('   Raisonnement:', classificationResult.reasoning);
      }
    } else {
      console.log('❌ Aucun résultat de classification');
    }
    console.log('');
    
    // ============================================
    // Test 2: Extraction de paramètres
    // ============================================
    console.log('📋 TEST 2: Extraction de paramètres');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('💬 Message utilisateur:', testMessage);
    console.log('🎯 Action:', 'create_revenu');
    console.log('');
    
    const parameterExtractor = new GeminiParameterExtractor(GEMINI_API_KEY);
    
    console.log('⏳ Extraction en cours...');
    const extractedParams = await parameterExtractor.extractAll(
      testMessage,
      'create_revenu'
    );
    
    console.log('✅ Paramètres extraits:');
    if (Object.keys(extractedParams).length > 0) {
      console.log(JSON.stringify(extractedParams, null, 2));
    } else {
      console.log('   (aucun paramètre extrait)');
    }
    console.log('');
    
    // ============================================
    // Résumé
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Tests terminés avec succès!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

// Exécuter les tests
testGeminiIntegration();

