/**
 * Script simple pour générer le PDF maintenant
 * Usage: node scripts/generate-pdf-simple.js
 *
 * MODIFIEZ les valeurs projetId et userId avant d'exécuter
 */

// ⚠️ MODIFIEZ CES VALEURS
const PROJET_ID = 'votre-projet-id';
const USER_ID = 'votre-user-id';
const USER_NAME = 'Votre Nom';

console.log(
  '📄 Pour générer le PDF maintenant, utilisez cette fonction dans votre application :\n'
);

console.log(`
import { generateValidationPDF } from './src/services/chatAgent/tests/runValidation';

const context = {
  projetId: '${PROJET_ID}',
  userId: '${USER_ID}',
  userName: '${USER_NAME}',
  currentDate: new Date().toISOString().split('T')[0],
};

await generateValidationPDF(context);
`);

console.log('\nOU utilisez le composant ValidationReportButton dans un écran de test.\n');
