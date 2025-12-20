/**
 * Script pour générer le rapport PDF de validation maintenant
 * Usage: npx ts-node scripts/generate-validation-pdf.ts
 */

import { runAndDisplayValidation } from '../src/services/chatAgent/tests/runValidation';
import { AgentContext } from '../src/types/chatAgent';

// Configuration - MODIFIEZ CES VALEURS
const CONTEXT: AgentContext = {
  projetId: 'votre-projet-id', // Remplacez par votre ID de projet
  userId: 'votre-user-id', // Remplacez par votre ID utilisateur
  userName: 'Votre Nom',
  currentDate: new Date().toISOString().split('T')[0],
};

async function main() {
  console.log('🚀 Génération du rapport PDF de validation...\n');

  try {
    await runAndDisplayValidation(CONTEXT);
    console.log('\n✅ Terminé ! Le PDF est prêt à être partagé.');
  } catch (error: unknown) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

void main();
