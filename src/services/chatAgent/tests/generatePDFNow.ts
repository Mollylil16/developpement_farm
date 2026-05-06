/**
 * Script pour générer le rapport PDF immédiatement
 * Usage: Appeler cette fonction depuis n'importe où dans l'application
 */

import { generateValidationPDF } from './runValidation';
import { AgentContext } from '../../../types/chatAgent';
import { Alert } from 'react-native';

/**
 * Génère le rapport PDF avec les données actuelles
 * À appeler depuis un écran ou un composant
 */
export async function generatePDFNow(
  projetId: string,
  userId: string,
  userName?: string
): Promise<void> {
  try {
    const context: AgentContext = {
      projetId,
      userId,
      userName: userName || 'Utilisateur',
      currentDate: new Date().toISOString().split('T')[0],
    };

    console.log('🚀 Génération du rapport PDF...');
    await generateValidationPDF(context);

    Alert.alert('✅ Succès', 'Rapport PDF généré ! Vous pouvez maintenant le partager.', [
      { text: 'OK' },
    ]);
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    Alert.alert('❌ Erreur', `Impossible de générer le PDF:\n${error.message}`, [{ text: 'OK' }]);
    throw error;
  }
}

/**
 * Version simplifiée pour utilisation directe depuis un écran
 */
export async function generatePDFFromScreen(
  projetId: string,
  userId: string,
  userName?: string
): Promise<string | null> {
  try {
    await generatePDFNow(projetId, userId, userName);
    return 'success';
  } catch (error) {
    // Utiliser error pour logger l'erreur
    console.error('[generatePDFNow] Erreur lors de la génération du PDF:', error instanceof Error ? error.message : 'Erreur inconnue');
    return null;
  }
}
