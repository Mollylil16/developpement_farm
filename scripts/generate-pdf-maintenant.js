/**
 * Script pour générer le PDF MAINTENANT
 * Exécute les tests et génère automatiquement le PDF
 *
 * Usage dans votre application React Native :
 *
 * 1. Créez un écran de test temporaire ou utilisez un bouton dans ParametresScreen
 * 2. Appelez cette fonction :
 */

// Copiez ce code dans un composant React Native pour générer le PDF maintenant

export async function genererPDFMaintenant() {
  const { projetActif } = useAppSelector((state) => state.projet);
  const { user } = useAppSelector((state) => state.auth);

  if (!projetActif || !user) {
    Alert.alert('Erreur', 'Projet ou utilisateur non trouvé');
    return;
  }

  try {
    const { generateValidationPDF } = require('../src/services/chatAgent/tests/runValidation');

    const context = {
      projetId: projetActif.id,
      userId: user.id,
      userName: user.nom || user.email || 'Utilisateur',
      currentDate: new Date().toISOString().split('T')[0],
    };

    console.log('🚀 Démarrage des tests et génération du PDF...');
    await generateValidationPDF(context);

    Alert.alert('✅ Succès', 'Rapport PDF généré ! Vous pouvez maintenant le partager.');
  } catch (error) {
    console.error('Erreur:', error);
    Alert.alert('❌ Erreur', `Impossible de générer le PDF: ${error.message}`);
  }
}
