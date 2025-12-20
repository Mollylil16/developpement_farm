/**
 * Modal pour ajouter plusieurs sujets en vente sur le marketplace
 * Permet la sélection multiple depuis le cheptel
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { SPACING } from '../../constants/theme';
import SaleTermsDisplay from './SaleTermsDisplay';
import type { ProductionAnimal } from '../../types/production';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectAllAnimaux } from '../../store/selectors/productionSelectors';
import apiClient from '../../services/api/apiClient';
import { createListing } from '../../store/slices/marketplaceSlice';
import { loadProductionAnimaux, loadPeseesRecents } from '../../store/slices/productionSlice';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getErrorMessage } from '../../types/common';

interface BatchAddModalProps {
  visible: boolean;
  projetId: string;
  onClose: () => void;
  onSuccess: () => void;
  availableSubjects?: ProductionAnimal[]; // Optionnel, sera chargé si non fourni
}

export default function BatchAddModal({
  visible,
  projetId,
  onClose,
  onSuccess,
  availableSubjects: providedSubjects,
}: BatchAddModalProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;
  const dispatch = useAppDispatch();

  // Charger les animaux depuis Redux si non fournis
  const allAnimaux = useAppSelector(selectAllAnimaux);
  const { user } = useAppSelector((state) => state.auth);
  const { getCurrentLocation } = useGeolocation();
  const [localSubjects, setLocalSubjects] = useState<ProductionAnimal[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [peseesParAnimal, setPeseesParAnimal] = useState<
    Record<string, Array<{ date: string; poids_kg: number }>>
  >({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pricePerKg, setPricePerKg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // PanResponder pour le swipe de gauche à droite pour fermer
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Activer si on bouge vers la droite depuis le bord gauche (premiers 50px)
        return evt.nativeEvent.pageX < 50 && gestureState.dx > 30;
      },
      onPanResponderGrant: () => {
        // Démarrer le geste
      },
      onPanResponderMove: (evt, gestureState) => {
        // Optionnel : animation pendant le swipe
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Si on a swipé assez vers la droite (au moins 80px), fermer le modal
        if (gestureState.dx > 80) {
          onClose();
        }
      },
    })
  ).current;

  // Charger les animaux disponibles si non fournis
  useEffect(() => {
    if (visible) {
      if (providedSubjects && providedSubjects.length > 0) {
        setLocalSubjects(providedSubjects);
      } else if (!providedSubjects) {
        loadAvailableSubjects();
      }
    }
  }, [visible, projetId, providedSubjects]);

  const peseesRecents = useAppSelector((state) => state.production.peseesRecents);
  const peseesEntities = useAppSelector((state) => state.production.entities.pesees);

  const loadAvailableSubjects = async () => {
    try {
      setLoadingSubjects(true);
      
      // Charger les animaux depuis le backend via Redux
      await dispatch(loadProductionAnimaux({ projetId, inclureInactifs: false })).unwrap();
      
      // Charger les pesées récentes
      await dispatch(loadPeseesRecents({ projetId, limit: 100 })).unwrap();
      
      // Filtrer les animaux actifs depuis Redux
      const animauxActifs = allAnimaux.filter(
        (a) => a.projet_id === projetId && a.statut === 'actif'
      );
      
      // Construire le map des pesées depuis Redux
      const peseesMap: Record<string, Array<{ date: string; poids_kg: number }>> = {};
      for (const animal of animauxActifs) {
        const peseesAnimal = peseesRecents
          .map((id) => peseesEntities[id])
          .filter((p) => p && p.animal_id === animal.id)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        peseesMap[animal.id] = peseesAnimal.map((p) => ({
          date: p.date,
          poids_kg: p.poids_kg,
        }));
      }
      
      setPeseesParAnimal(peseesMap);
      setLocalSubjects(animauxActifs);
    } catch (error: unknown) {
      console.error('Erreur chargement animaux:', error);
      Alert.alert('Erreur', 'Impossible de charger les animaux disponibles');
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Fonction de rafraîchissement
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAvailableSubjects();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [projetId, loadAvailableSubjects]);

  // Utiliser les sujets fournis ou ceux chargés localement
  const availableSubjects = providedSubjects || localSubjects;

  // Reset quand le modal se ferme
  useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set());
      setPricePerKg('');
      setSearchQuery('');
      setTermsAccepted(false);
    }
  }, [visible]);

  // Fonction helper pour calculer l'âge en mois
  const calculateAgeInMonths = (dateNaissance?: string): number => {
    if (!dateNaissance) return 0;
    try {
      const date = new Date(dateNaissance);
      const maintenant = new Date();
      const jours = Math.floor((maintenant.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (jours < 0) return 0;
      return Math.floor(jours / 30);
    } catch {
      return 0;
    }
  };

  // Fonction helper pour obtenir le poids actuel
  const getCurrentWeight = (animalId: string): number => {
    const pesees = peseesParAnimal[animalId] || [];
    if (pesees.length > 0) {
      // Trier par date et prendre la plus récente
      const sorted = [...pesees].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return sorted[0].poids_kg;
    }
    return 0;
  };

  // Filtrer les sujets selon la recherche
  const filteredSubjects = (availableSubjects || []).filter((subject) => {
    const query = searchQuery.toLowerCase();
    return (
      subject.code?.toLowerCase().includes(query) ||
      subject.nom?.toLowerCase().includes(query) ||
      subject.race?.toLowerCase().includes(query)
    );
  });

  // Toggle sélection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Sélectionner tous
  const selectAll = () => {
    setSelectedIds(new Set(filteredSubjects.map((s) => s.id)));
  };

  // Désélectionner tous
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Calculer le poids total sélectionné
  const getTotalWeight = (): number => {
    return availableSubjects
      .filter((s) => selectedIds.has(s.id))
      .reduce((sum, s) => sum + getCurrentWeight(s.id), 0);
  };

  // Calculer le prix total estimé
  const getEstimatedTotal = (): number => {
    const price = parseFloat(pricePerKg) || 0;
    return getTotalWeight() * price;
  };

  // Valider et soumettre
  const handleSubmit = async () => {
    // Validations
    if (selectedIds.size === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un sujet');
      return;
    }

    const price = parseFloat(pricePerKg);
    if (!price || price <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix/kg valide');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Erreur', 'Veuillez accepter les conditions de vente avant de continuer');
      return;
    }

    try {
      setLoading(true);

      // Créer un listing pour chaque sujet sélectionné
      const subjectIds = Array.from(selectedIds);

      for (const subjectId of subjectIds) {
        const subject = availableSubjects.find((s) => s.id === subjectId);
        if (!subject) continue;

        // Récupérer les informations nécessaires pour créer le listing depuis l'API backend
        const animal = await apiClient.get<any>(`/production/animaux/${subjectId}`);

        if (!animal) continue;

        // Récupérer la dernière pesée pour obtenir le poids actuel et la date depuis l'API backend
        const pesees = await apiClient.get<any[]>(`/production/pesees`, {
          params: { animal_id: animal.id, limit: 1 },
        });
        const dernierePesee = pesees && pesees.length > 0 ? pesees[0] : null;
        const poidsActuel = dernierePesee?.poids_kg || animal.poids_initial || 0;
        const lastWeightDate = dernierePesee?.date || new Date().toISOString();

        // Obtenir la localisation actuelle
        const userLocation = await getCurrentLocation();
        if (!userLocation) {
          throw new Error(
            "Impossible d'obtenir votre localisation. Veuillez activer la géolocalisation."
          );
        }

        // Vérifier que l'utilisateur est connecté
        if (!user || !user.id) {
          throw new Error('Utilisateur non connecté');
        }

        // Créer le listing avec toutes les propriétés requises
        try {
          await dispatch(
            createListing({
              subjectId: animal.id,
              producerId: user.id,
              farmId: projetId,
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
        } catch (error: unknown) {
          // Améliorer le message d'erreur avec les informations de l'animal
          const animalName = animal.nom || animal.code || 'sujet';
          const errorMsg = getErrorMessage(error);
          if (errorMsg.includes('déjà en vente')) {
            throw new Error(
              `Le sujet "${animalName}" (${animal.code}) est déjà en vente sur le marketplace`
            );
          }
          throw error;
        }
      }

      Alert.alert('Succès', `${selectedIds.size} sujet(s) mis en vente avec succès !`, [
        {
          text: 'OK',
          onPress: () => {
            onClose();
            onSuccess();
          },
        },
      ]);
    } catch (error: unknown) {
      Alert.alert('Erreur', getErrorMessage(error) || 'Impossible de mettre en vente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {/* Header fixe */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Ajouter des sujets en vente
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.swipeArea} {...panResponder.panHandlers} />
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Barre de recherche */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Rechercher par code, race..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Actions rapides */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.border }]}
              onPress={selectAll}
            >
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                Tout sélectionner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.border }]}
              onPress={deselectAll}
            >
              <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                Tout désélectionner
              </Text>
            </TouchableOpacity>
          </View>

          {/* Compteur */}
          <View style={[styles.counter, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[styles.counterText, { color: colors.text }]}>
              {selectedIds.size} sujet(s) sélectionné(s)
            </Text>
            {selectedIds.size > 0 && (
              <Text style={[styles.counterWeight, { color: colors.textSecondary }]}>
                Poids total : {getTotalWeight().toFixed(1)} kg
              </Text>
            )}
          </View>

          {/* Liste des sujets */}
          <View style={styles.subjectsList}>
            {loadingSubjects ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Chargement des animaux...
                </Text>
              </View>
            ) : filteredSubjects.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun sujet disponible
                </Text>
              </View>
            ) : (
              filteredSubjects.map((subject) => {
                const isSelected = selectedIds.has(subject.id);
                return (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleSelection(subject.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                      )}
                    </View>
                    <View style={styles.subjectInfo}>
                      <Text style={[styles.subjectCode, { color: colors.text }]}>
                        #{subject.code || subject.id}
                      </Text>
                      <Text style={[styles.subjectDetails, { color: colors.textSecondary }]}>
                        {subject.nom ? `${subject.nom} • ` : ''}
                        {subject.race || 'Race non spécifiée'} •{' '}
                        {getCurrentWeight(subject.id).toFixed(1)} kg •{' '}
                        {calculateAgeInMonths(subject.date_naissance)} mois
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Prix */}
          <View style={styles.pricingSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Prix de vente</Text>
            <View style={[styles.priceInput, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.priceInputField, { color: colors.text }]}
                placeholder="Prix par kg"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={pricePerKg}
                onChangeText={setPricePerKg}
              />
              <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>FCFA/kg</Text>
            </View>
            {selectedIds.size > 0 && pricePerKg && (
              <View style={[styles.priceEstimate, { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.priceEstimateLabel, { color: colors.textSecondary }]}>
                  Prix total estimé
                </Text>
                <Text style={[styles.priceEstimateValue, { color: colors.primary }]}>
                  {getEstimatedTotal().toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            )}
          </View>

          {/* Conditions de vente */}
          <View style={styles.termsSection}>
            <SaleTermsDisplay expandable={true} />

            {/* Checkbox acceptation */}
            <TouchableOpacity
              style={styles.termsCheckbox}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: termsAccepted ? colors.primary : colors.border,
                    backgroundColor: termsAccepted ? colors.primary : 'transparent',
                  },
                ]}
              >
                {termsAccepted && (
                  <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                )}
              </View>
              <Text style={[styles.termsCheckboxText, { color: colors.text }]}>
                J'accepte les conditions de vente (transport et abattage à la charge de l'acheteur)
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer avec bouton de soumission */}
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor:
                  selectedIds.size > 0 && pricePerKg && termsAccepted
                    ? colors.primary
                    : colors.textLight,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading || selectedIds.size === 0 || !pricePerKg || !termsAccepted}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                Mettre en vente ({selectedIds.size})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  swipeArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 30,
    height: '100%',
    zIndex: 0,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? SPACING.xl + 8 : SPACING.lg + 24,
    paddingBottom: SPACING.sm,
    position: 'relative',
    zIndex: 10,
    ...MarketplaceTheme.shadows.small,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    position: 'relative',
  },
  headerTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingTop: MarketplaceTheme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginVertical: MarketplaceTheme.spacing.md,
    gap: MarketplaceTheme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    marginBottom: MarketplaceTheme.spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  counter: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginBottom: MarketplaceTheme.spacing.md,
  },
  counterText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  counterWeight: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginTop: 2,
  },
  subjectsList: {
    marginBottom: MarketplaceTheme.spacing.md,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginBottom: MarketplaceTheme.spacing.sm,
    borderWidth: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: MarketplaceTheme.borderRadius.xs,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MarketplaceTheme.spacing.md,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectCode: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  subjectDetails: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: MarketplaceTheme.spacing.xxl,
  },
  emptyText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  pricingSection: {
    marginBottom: MarketplaceTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
  },
  priceInputField: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  priceUnit: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
  priceEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  priceEstimateLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  priceEstimateValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  termsSection: {
    marginBottom: MarketplaceTheme.spacing.xxl,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: MarketplaceTheme.spacing.md,
  },
  termsCheckboxText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    ...MarketplaceTheme.shadows.medium,
  },
  submitButton: {
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
});
