/**
 * Hook pour gérer les changements de statut des animaux
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  updateProductionAnimal,
  loadProductionAnimaux,
  loadPeseesRecents,
} from '../../store/slices/productionSlice';
import {
  createMortalite,
  loadMortalitesParProjet,
  loadStatistiquesMortalite,
  deleteMortalite,
} from '../../store/slices/mortalitesSlice';
import { selectAllAnimaux } from '../../store/selectors/productionSelectors';
import { selectAllMortalites } from '../../store/selectors/mortalitesSelectors';
import { ProductionAnimal, StatutAnimal, STATUT_ANIMAL_LABELS } from '../../types';
import { getCategorieAnimal } from '../../utils/animalUtils';
import { useActionPermissions } from '../useActionPermissions';
import { getErrorMessage } from '../../types/errors';

export function useProductionCheptelStatut() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const allAnimaux = useAppSelector(selectAllAnimaux);
  const mortalites = useAppSelector(selectAllMortalites);
  const { canUpdate } = useActionPermissions();

  const handleChangeStatut = useCallback(
    (
      animal: ProductionAnimal,
      nouveauStatut: StatutAnimal,
      onVendu?: (animal: ProductionAnimal) => void
    ) => {
      if (!canUpdate('reproduction')) {
        Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les animaux.");
        return;
      }

      // Si le statut passe de "actif" à "vendu", ouvrir le modal de revenu
      if (animal.statut === 'actif' && nouveauStatut === 'vendu') {
        Alert.alert(
          'Changer le statut',
          `Voulez-vous changer le statut de ${animal.code}${animal.nom ? ` (${animal.nom})` : ''} en "${STATUT_ANIMAL_LABELS[nouveauStatut]}" ?\n\nUn formulaire de revenu s'ouvrira pour enregistrer la vente.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Confirmer',
              onPress: async () => {
                try {
                  await dispatch(
                    updateProductionAnimal({
                      id: animal.id,
                      updates: { statut: nouveauStatut },
                    })
                  ).unwrap();
                  // Recharger les animaux pour mettre à jour les listes
                  if (projetActif) {
                    dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
                    // Recharger les pesées récentes pour exclure celles des animaux retirés
                    dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
                  }
                  // Ouvrir le modal de revenu avec l'animal vendu
                  onVendu?.(animal);
                } catch (error) {
                  Alert.alert('Erreur', getErrorMessage(error));
                }
              },
            },
          ]
        );
      } else if (animal.statut === 'actif' && nouveauStatut === 'mort') {
        // Si le statut passe de "actif" à "mort", créer automatiquement une mortalité
        Alert.alert(
          'Changer le statut',
          `Voulez-vous changer le statut de ${animal.code}${animal.nom ? ` (${animal.nom})` : ''} en "${STATUT_ANIMAL_LABELS[nouveauStatut]}" ?\n\nUne entrée de mortalité sera automatiquement créée.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Confirmer',
              onPress: async () => {
                try {
                  if (!projetActif) {
                    Alert.alert('Erreur', 'Aucun projet actif');
                    return;
                  }

                  // 1. Mettre à jour le statut de l'animal
                  await dispatch(
                    updateProductionAnimal({
                      id: animal.id,
                      updates: { statut: nouveauStatut },
                    })
                  ).unwrap();

                  // 2. Créer automatiquement une mortalité
                  try {
                    // Récupérer l'animal depuis allAnimaux pour avoir les données à jour
                    const animalActuel = allAnimaux.find((a) => a.id === animal.id) || animal;
                    const categorie = getCategorieAnimal(animalActuel);

                    await dispatch(
                      createMortalite({
                        projet_id: projetActif.id,
                        nombre_porcs: 1,
                        date: new Date().toISOString().split('T')[0],
                        categorie: categorie,
                        animal_code: animalActuel.code || undefined,
                        cause: 'Changement de statut',
                        notes: `Mortalité enregistrée automatiquement lors du changement de statut de ${animalActuel.code}${animalActuel.nom ? ` (${animalActuel.nom})` : ''}`,
                      })
                    ).unwrap();

                    // Recharger les mortalités ET les statistiques
                    await Promise.all([
                      dispatch(loadMortalitesParProjet(projetActif.id)).unwrap(),
                      dispatch(loadStatistiquesMortalite(projetActif.id)).unwrap(),
                    ]);
                  } catch (mortaliteError) {
                    console.warn('Erreur lors de la création de la mortalité:', mortaliteError);
                    // Ne pas bloquer si la création de mortalité échoue
                  }

                  // 3. Recharger les animaux pour mettre à jour les listes
                  await Promise.all([
                    dispatch(loadProductionAnimaux({ projetId: projetActif.id })).unwrap(),
                    dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 })).unwrap(),
                  ]);
                } catch (error) {
                  Alert.alert('Erreur', getErrorMessage(error));
                }
              },
            },
          ]
        );
      } else {
        // Pour les autres changements de statut, comportement normal
        const messageSupplementaire =
          animal.statut === 'mort' && nouveauStatut === 'actif'
            ? "\n\nL'entrée de mortalité associée sera supprimée."
            : '';

        Alert.alert(
          'Changer le statut',
          `Voulez-vous changer le statut de ${animal.code}${animal.nom ? ` (${animal.nom})` : ''} en "${STATUT_ANIMAL_LABELS[nouveauStatut]}" ?${messageSupplementaire}`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Confirmer',
              onPress: async () => {
                try {
                  if (!projetActif) {
                    Alert.alert('Erreur', 'Aucun projet actif');
                    return;
                  }

                  // 1. Si on passe de "mort" à "actif", supprimer l'entrée de mortalité
                  if (animal.statut === 'mort' && nouveauStatut === 'actif') {
                    console.log('🔄 Changement de statut: mort → actif pour', animal.code);
                    // Trouver l'entrée de mortalité correspondant à cet animal
                    const mortaliteCorrespondante = mortalites.find(
                      (m) => m.animal_code === animal.code && m.projet_id === projetActif.id
                    );

                    console.log('🔍 Mortalité trouvée:', mortaliteCorrespondante?.id);

                    if (mortaliteCorrespondante) {
                      try {
                        console.log('🗑️ Suppression de la mortalité:', mortaliteCorrespondante.id);
                        await dispatch(deleteMortalite(mortaliteCorrespondante.id)).unwrap();
                        console.log('✅ Mortalité supprimée avec succès');
                      } catch (deleteError) {
                        console.error(
                          '❌ Erreur lors de la suppression de la mortalité:',
                          deleteError
                        );
                        // Ne pas bloquer si la suppression échoue
                      }
                    } else {
                      console.warn('⚠️ Aucune mortalité trouvée pour', animal.code);
                    }
                  }

                  // 2. Mettre à jour le statut de l'animal
                  await dispatch(
                    updateProductionAnimal({
                      id: animal.id,
                      updates: { statut: nouveauStatut },
                    })
                  ).unwrap();

                  // 3. Recharger toutes les données pertinentes
                  await Promise.all([
                    dispatch(loadProductionAnimaux({ projetId: projetActif.id })).unwrap(),
                    dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 })).unwrap(),
                  ]);

                  // Si on a touché au statut "mort", recharger les mortalités
                  if (animal.statut === 'mort' || nouveauStatut === 'mort') {
                    console.log('📊 Rechargement des mortalités après changement de statut');
                    await Promise.all([
                      dispatch(loadMortalitesParProjet(projetActif.id)).unwrap(),
                      dispatch(loadStatistiquesMortalite(projetActif.id)).unwrap(),
                    ]);
                    console.log('✅ Mortalités et statistiques rechargées');
                  }
                } catch (error) {
                  Alert.alert('Erreur', getErrorMessage(error));
                }
              },
            },
          ]
        );
      }
    },
    [dispatch, projetActif?.id, canUpdate, mortalites, allAnimaux]
  );

  return { handleChangeStatut };
}
