/**
 * Hook pour la logique métier du cheptel
 * Centralise toutes les opérations sur les animaux
 */

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  loadProductionAnimaux,
  deleteProductionAnimal,
  updateProductionAnimal,
  loadPeseesRecents,
} from '../../store/slices/productionSlice';
import {
  createMortalite,
  loadMortalitesParProjet,
  loadStatistiquesMortalite,
  deleteMortalite,
} from '../../store/slices/mortalitesSlice';
import { createListing } from '../../store/slices/marketplaceSlice';
import { selectAllAnimaux } from '../../store/selectors/productionSelectors';
import { selectAllMortalites } from '../../store/selectors/mortalitesSelectors';
import { useActionPermissions } from '../useActionPermissions';
import { useGeolocation } from '../useGeolocation';
import apiClient from '../../services/api/apiClient';
import type { ProductionAnimal, StatutAnimal } from '../../types/production';
import { getCategorieAnimal } from '../../utils/animalUtils';
import type { UpdateProductionAnimalInput } from '../../types/production';
import { getErrorMessage } from '../../types/errors';

export function useProductionCheptelLogic() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { user } = useAppSelector((state) => state.auth);
  const allAnimaux = useAppSelector(selectAllAnimaux);
  const mortalites = useAppSelector(selectAllMortalites);
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const { getCurrentLocation } = useGeolocation();

  const [togglingMarketplace, setTogglingMarketplace] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [animalForMarketplace, setAnimalForMarketplace] = useState<ProductionAnimal | null>(null);

  const handleDelete = useCallback(
    async (animal: ProductionAnimal) => {
      if (!canDelete('reproduction')) {
        Alert.alert(
          'Permission refusée',
          "Vous n'avez pas la permission de supprimer les animaux."
        );
        return;
      }
      Alert.alert(
        "Supprimer l'animal",
        `Êtes-vous sûr de vouloir supprimer ${animal.code}${animal.nom ? ` (${animal.nom})` : ''} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(deleteProductionAnimal(animal.id)).unwrap();
              } catch (error) {
                Alert.alert('Erreur', getErrorMessage(error));
              }
            },
          },
        ]
      );
    },
    [canDelete, dispatch]
  );

  const handleToggleMarketplace = useCallback(
    async (animal: ProductionAnimal) => {
      if (!projetActif || !user?.id) {
        Alert.alert('Erreur', 'Projet ou utilisateur non disponible');
        return;
      }

      if (togglingMarketplace === animal.id) return;

      try {
        setTogglingMarketplace(animal.id);

        // Charger les listings depuis l'API backend
        const existingListings = await apiClient.get<any[]>('/marketplace/listings', {
          params: { projet_id: projetActif.id },
        });
        const existingListing = existingListings.find(
          (l) => l.subjectId === animal.id && (l.status === 'available' || l.status === 'reserved')
        );

        if (existingListing) {
          Alert.alert(
            'Retirer du marketplace',
            `Voulez-vous retirer ${animal.code}${animal.nom ? ` (${animal.nom})` : ''} du marketplace ?`,
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Retirer',
                style: 'destructive',
                onPress: async () => {
                  try {
                    // Supprimer le listing via l'API backend
                    await apiClient.delete(`/marketplace/listings/${existingListing.id}`);
                    await dispatch(
                      updateProductionAnimal({
                        id: animal.id,
                        updates: {} as Partial<UpdateProductionAnimalInput>,
                      })
                    ).unwrap();
                    dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
                    Alert.alert('Succès', 'Sujet retiré du marketplace');
                  } catch (error) {
                    Alert.alert('Erreur', getErrorMessage(error));
                  }
                },
              },
            ]
          );
        } else {
          setAnimalForMarketplace(animal);
          setPriceInput('');
          setShowPriceModal(true);
        }
      } catch (error) {
        Alert.alert('Erreur', getErrorMessage(error));
      } finally {
        setTogglingMarketplace(null);
      }
    },
    [projetActif, user, dispatch, togglingMarketplace]
  );

  const handleConfirmMarketplaceAdd = useCallback(async () => {
    if (!animalForMarketplace || !projetActif || !user?.id) {
      Alert.alert('Erreur', 'Données manquantes');
      return;
    }

    const price = parseFloat(priceInput.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }

    try {
      setTogglingMarketplace(animalForMarketplace.id);

      // Charger les pesées depuis l'API backend
      const pesees = await apiClient.get<any[]>(`/production/pesees`, {
        params: { animal_id: animalForMarketplace.id, limit: 1 },
      });
      const dernierePesee = pesees && pesees.length > 0 ? pesees[0] : null;
      const poidsActuel = dernierePesee?.poids_kg || animalForMarketplace.poids_initial || 0;
      const lastWeightDate = dernierePesee?.date || new Date().toISOString();

      if (poidsActuel <= 0) {
        Alert.alert('Erreur', 'Poids invalide. Veuillez enregistrer une pesée pour ce sujet.');
        setTogglingMarketplace(null);
        return;
      }

      const userLocation = await getCurrentLocation();
      if (!userLocation) {
        Alert.alert(
          'Erreur',
          "Impossible d'obtenir votre localisation. Veuillez activer la géolocalisation."
        );
        setTogglingMarketplace(null);
        return;
      }

      await dispatch(
        createListing({
          subjectId: animalForMarketplace.id,
          producerId: user.id,
          farmId: projetActif.id,
          pricePerKg: price,
          weight: poidsActuel,
          lastWeightDate: lastWeightDate,
          location: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            address: undefined,
            city: userLocation.city,
            region: userLocation.region,
          },
        })
      ).unwrap();

      await dispatch(
        updateProductionAnimal({
          id: animalForMarketplace.id,
          updates: {} as Partial<UpdateProductionAnimalInput>,
        })
      ).unwrap();

      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
      setShowPriceModal(false);
      setAnimalForMarketplace(null);
      setPriceInput('');
      Alert.alert('Succès', 'Sujet mis en vente sur le marketplace');
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error));
    } finally {
      setTogglingMarketplace(null);
    }
  }, [animalForMarketplace, priceInput, projetActif, user, dispatch, getCurrentLocation]);

  return {
    // State
    togglingMarketplace,
    showPriceModal,
    priceInput,
    animalForMarketplace,
    // Setters
    setShowPriceModal,
    setPriceInput,
    setAnimalForMarketplace,
    // Handlers
    handleDelete,
    handleToggleMarketplace,
    handleConfirmMarketplaceAdd,
  };
}
