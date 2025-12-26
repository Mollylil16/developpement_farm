/**
 * Modal de détails d'une ferme avec liste des sujets disponibles
 * Permet la sélection multiple et affichage des détails sanitaires
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import type { FarmCard, MarketplaceListing } from '../../types/marketplace';
import { formatDate } from '../../utils/formatters';
import { formatPrice } from '../../services/PricingService';
import { useAppSelector } from '../../store/hooks';
import apiClient from '../../services/api/apiClient';
import { TYPE_PROPHYLAXIE_LABELS } from '../../types/sante';
import SubjectCard from './SubjectCard';
import { logger } from '../../utils/logger';

interface FarmDetailsModalProps {
  visible: boolean;
  farm: FarmCard | null;
  onClose: () => void;
  onMakeOffer: (selectedSubjectIds: string[]) => void;
}

type SortOption =
  | 'price_asc'
  | 'price_desc'
  | 'weight_asc'
  | 'weight_desc'
  | 'date_asc'
  | 'date_desc';
type FilterRace = string | 'all';

export default function FarmDetailsModal({
  visible,
  farm,
  onClose,
  onMakeOffer,
}: FarmDetailsModalProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;
  const { user } = useAppSelector((state) => state.auth);
  const { projetActif } = useAppSelector((state) => state.projet);

  // Vérifier si l'utilisateur est le producteur de cette ferme
  // Le farmId correspond à l'ID du projet, donc si farm.farmId === projetActif.id, c'est sa ferme
  const isProducer = farm && projetActif && farm.farmId === projetActif.id;

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [filterRace, setFilterRace] = useState<FilterRace>('all');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [healthDetails, setHealthDetails] = useState<Record<string, unknown>>({});

  // Charger les listings de la ferme
  const loadListings = useCallback(async () => {
    if (!farm || !farm.farmId) return;

    try {
      setLoading(true);
      // Récupérer tous les listings de la ferme depuis l'API backend
      const farmListings = await apiClient.get<any[]>(`/marketplace/listings`, {
        params: { farm_id: farm.farmId },
      });

      // Filtrer seulement les disponibles
      const availableListings = farmListings.filter((l) => l.status === 'available');

      // Enrichir avec les données des animaux depuis l'API backend
      const enrichedListings = await Promise.all(
        availableListings.map(async (listing) => {
          try {
            const animal = await apiClient.get<any>(`/production/animaux/${listing.subjectId}`);
            if (!animal) return null;

            // Récupérer la dernière pesée pour le poids actuel depuis l'API backend
            const pesees = await apiClient.get<any[]>(`/production/pesees`, {
              params: { animal_id: animal.id, limit: 1 },
            });
            const dernierePesee = pesees && pesees.length > 0 ? pesees[0] : null;
            const poidsActuel = dernierePesee?.poids_kg || animal.poids_initial || 0;

            // Calculer l'âge en mois
            const ageEnMois = animal.date_naissance
              ? Math.floor(
                  (new Date().getTime() - new Date(animal.date_naissance).getTime()) /
                    (1000 * 60 * 60 * 24 * 30)
                )
              : 0;

            // Vérifier le statut des vaccinations depuis l'API backend
            const vaccinations = await apiClient.get<any[]>(`/sante/vaccinations`, {
              params: { animal_id: animal.id },
            });
            const vaccinationsAJour =
              vaccinations.length > 0 &&
              vaccinations.every(
                (v) => v.date_rappel === null || new Date(v.date_rappel) > new Date()
              );

            // Déterminer le statut de santé
            let healthStatus: 'good' | 'attention' | 'critical' = 'good';
            if (animal.statut === 'mort') {
              healthStatus = 'critical';
            } else if (!vaccinationsAJour) {
              healthStatus = 'attention';
            }

            return {
              ...listing,
              code: animal.code || `#${animal.id.slice(0, 8)}`,
              race: animal.race || 'Non spécifiée',
              weight: poidsActuel,
              weightDate: dernierePesee?.date || listing.lastWeightDate,
              age: ageEnMois,
              totalPrice: listing.calculatedPrice,
              healthStatus,
              vaccinations: vaccinationsAJour,
              available: true,
            };
          } catch (error) {
            logger.error(`Erreur enrichissement listing ${listing.id}:`, error);
            return null;
          }
        })
      );

      setListings(enrichedListings.filter((l): l is MarketplaceListing => l !== null));
    } catch (error: unknown) {
      logger.error('Erreur chargement listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farm]);

  // Charger les détails sanitaires d'un sujet via l'API backend
  const loadHealthDetails = useCallback(
    async (subjectId: string) => {
      if (healthDetails[subjectId]) return; // Déjà chargé

      try {
        const { SanteHistoriqueService } = await import('../../services/sante/SanteHistoriqueService');
        const historique = await SanteHistoriqueService.getHistorique(subjectId);

        // Filtrer les visites pour ne garder que celles qui concernent cet animal
        const visitesFiltrees = historique.visites.filter(
          (v) => v.animaux_examines?.includes(subjectId)
        );

        setHealthDetails((prev) => ({
          ...prev,
          [subjectId]: {
            vaccinations: historique.vaccinations,
            maladies: historique.maladies,
            traitements: historique.traitements,
            visites: visitesFiltrees,
          },
        }));
      } catch (error) {
        logger.error('Erreur chargement détails sanitaires:', error);
      }
    },
    [farm, healthDetails]
  );

  useEffect(() => {
    if (visible && farm) {
      loadListings();
      setSelectedIds(new Set());
      setSearchQuery('');
      setFilterRace('all');
      setExpandedSubjectId(null);
    }
  }, [visible, farm, loadListings]);

  // Races disponibles
  const availableRaces = useMemo(() => {
    const races = new Set<string>();
    listings.forEach((l) => {
      if (l.race && l.race !== 'Non spécifiée') {
        races.add(l.race);
      }
    });
    return Array.from(races).sort();
  }, [listings]);

  // Filtrer et trier les listings
  const filteredAndSortedListings = useMemo(() => {
    let filtered = listings;

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.code?.toLowerCase().includes(query) ||
          l.race?.toLowerCase().includes(query) ||
          l.subjectId.toLowerCase().includes(query)
      );
    }

    // Filtre par race
    if (filterRace !== 'all') {
      filtered = filtered.filter((l) => l.race === filterRace);
    }

    // Tri
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return (a.pricePerKg || 0) - (b.pricePerKg || 0);
        case 'price_desc':
          return (b.pricePerKg || 0) - (a.pricePerKg || 0);
        case 'weight_asc':
          return (a.weight || 0) - (b.weight || 0);
        case 'weight_desc':
          return (b.weight || 0) - (a.weight || 0);
        case 'date_asc':
          return new Date(a.lastWeightDate).getTime() - new Date(b.lastWeightDate).getTime();
        case 'date_desc':
          return new Date(b.lastWeightDate).getTime() - new Date(a.lastWeightDate).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [listings, searchQuery, filterRace, sortBy]);

  // Calculer le prix total des sujets sélectionnés
  const totalPrice = useMemo(() => {
    return filteredAndSortedListings
      .filter((l) => selectedIds.has(l.id))
      .reduce((sum, l) => sum + (l.totalPrice || l.calculatedPrice || 0), 0);
  }, [filteredAndSortedListings, selectedIds]);

  // Toggle sélection
  const toggleSelection = (listingId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  // Sélectionner/désélectionner tout
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedListings.map((l) => l.id)));
    }
  };

  // Toggle détails sanitaires
  const toggleHealthDetails = (subjectId: string) => {
    if (expandedSubjectId === subjectId) {
      setExpandedSubjectId(null);
    } else {
      setExpandedSubjectId(subjectId);
      loadHealthDetails(subjectId);
    }
  };

  // Gérer l'offre
  const handleMakeOffer = () => {
    if (selectedIds.size === 0) {
      return;
    }
    onMakeOffer(Array.from(selectedIds));
  };

  // Retirer les sujets sélectionnés du marketplace
  const handleRemoveFromMarketplace = useCallback(async () => {
    if (selectedIds.size === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un sujet à retirer');
      return;
    }

    Alert.alert(
      'Retirer du marketplace',
      `Êtes-vous sûr de vouloir retirer ${selectedIds.size} sujet${selectedIds.size > 1 ? 's' : ''} du marketplace ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const listingRepo = new MarketplaceListingRepository();

              // Mettre à jour le statut de chaque listing à 'removed'
              const updatePromises = Array.from(selectedIds).map((listingId) =>
                listingRepo.updateStatus(listingId, 'removed')
              );

              await Promise.all(updatePromises);

              const count = selectedIds.size;

              // Recharger les listings
              await loadListings();

              // Réinitialiser la sélection
              setSelectedIds(new Set());

              Alert.alert(
                'Succès',
                `${count} sujet${count > 1 ? 's' : ''} retiré${count > 1 ? 's' : ''} du marketplace`
              );
            } catch (error: unknown) {
              logger.error('Erreur retrait du marketplace:', error);
              const errorMessage = error instanceof Error ? error.message : 'Impossible de retirer les sujets du marketplace';
              Alert.alert('Erreur', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [selectedIds, loadListings]);

  if (!farm) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.divider },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {farm.name}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {filteredAndSortedListings.length} sujet
              {filteredAndSortedListings.length > 1 ? 's' : ''} disponible
              {filteredAndSortedListings.length > 1 ? 's' : ''}
            </Text>
          </View>
          {selectedIds.size > 0 && (
            <View style={[styles.selectionBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.selectionBadgeText, { color: colors.textInverse }]}>
                {selectedIds.size}
              </Text>
            </View>
          )}
        </View>

        {/* Filtres et recherche */}
        <View
          style={[
            styles.filtersContainer,
            { backgroundColor: colors.surface, borderBottomColor: colors.divider },
          ]}
        >
          {/* Recherche */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Rechercher par ID..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtres */}
          <View style={styles.filtersRow}>
            {/* Filtre race */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.raceFilter}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: filterRace === 'all' ? colors.primary : colors.surfaceLight },
                ]}
                onPress={() => setFilterRace('all')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: filterRace === 'all' ? colors.textInverse : colors.text },
                  ]}
                >
                  Toutes races
                </Text>
              </TouchableOpacity>
              {availableRaces.map((race) => (
                <TouchableOpacity
                  key={race}
                  style={[
                    styles.filterChip,
                    { backgroundColor: filterRace === race ? colors.primary : colors.surfaceLight },
                  ]}
                  onPress={() => setFilterRace(race)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: filterRace === race ? colors.textInverse : colors.text },
                    ]}
                  >
                    {race}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tri */}
            <TouchableOpacity
              style={[styles.sortButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => {
                // Cycle through sort options
                const options: SortOption[] = [
                  'price_asc',
                  'price_desc',
                  'weight_asc',
                  'weight_desc',
                  'date_desc',
                ];
                const currentIndex = options.indexOf(sortBy);
                setSortBy(options[(currentIndex + 1) % options.length]);
              }}
            >
              <Ionicons name="swap-vertical" size={16} color={colors.textSecondary} />
              <Text style={[styles.sortText, { color: colors.textSecondary }]}>
                {sortBy === 'price_asc' && 'Prix ↑'}
                {sortBy === 'price_desc' && 'Prix ↓'}
                {sortBy === 'weight_asc' && 'Poids ↑'}
                {sortBy === 'weight_desc' && 'Poids ↓'}
                {sortBy === 'date_desc' && 'Date ↓'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sélectionner tout */}
          <TouchableOpacity style={styles.selectAllButton} onPress={toggleSelectAll}>
            <Ionicons
              name={
                selectedIds.size === filteredAndSortedListings.length
                  ? 'checkbox'
                  : 'square-outline'
              }
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.selectAllText, { color: colors.primary }]}>
              {selectedIds.size === filteredAndSortedListings.length
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Liste des sujets */}
        <ScrollView
          style={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadListings();
              }}
            />
          }
        >
          {loading && listings.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Chargement des sujets...
              </Text>
            </View>
          ) : filteredAndSortedListings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="paw-outline" size={64} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery || filterRace !== 'all'
                  ? 'Aucun sujet ne correspond aux filtres'
                  : 'Aucun sujet disponible'}
              </Text>
            </View>
          ) : (
            filteredAndSortedListings.map((listing) => (
              <SubjectCardWithSelection
                key={listing.id}
                listing={listing}
                isSelected={selectedIds.has(listing.id)}
                onToggleSelection={() => toggleSelection(listing.id)}
                isExpanded={expandedSubjectId === listing.subjectId}
                onToggleHealthDetails={() => toggleHealthDetails(listing.subjectId)}
                healthDetails={healthDetails[listing.subjectId]}
              />
            ))
          )}
        </ScrollView>

        {/* Footer avec récapitulatif */}
        {selectedIds.size > 0 && (
          <View
            style={[
              styles.footer,
              { backgroundColor: colors.surface, borderTopColor: colors.divider },
            ]}
          >
            <View style={styles.footerContent}>
              <Text style={[styles.footerText, { color: colors.text }]}>
                {selectedIds.size} sujet{selectedIds.size > 1 ? 's' : ''} sélectionné
                {selectedIds.size > 1 ? 's' : ''}
              </Text>
              {!isProducer && (
                <Text style={[styles.footerPrice, { color: colors.primary }]}>
                  Total: {formatPrice(totalPrice)}
                </Text>
              )}
            </View>
            <View style={styles.footerActions}>
              {isProducer ? (
                // Bouton pour le producteur : retirer du marketplace
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: colors.error }]}
                  onPress={handleRemoveFromMarketplace}
                  disabled={loading}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
                  <Text style={[styles.removeButtonText, { color: colors.textInverse }]}>
                    Retirer du marketplace ({selectedIds.size})
                  </Text>
                </TouchableOpacity>
              ) : (
                // Bouton pour l'acheteur : faire une offre
                <TouchableOpacity
                  style={[styles.offerButton, { backgroundColor: colors.primary }]}
                  onPress={handleMakeOffer}
                >
                  <Text style={[styles.offerButtonText, { color: colors.textInverse }]}>
                    Faire une offre ({selectedIds.size})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// Composant SubjectCard avec sélection et détails sanitaires
interface SubjectCardWithSelectionProps {
  listing: MarketplaceListing;
  isSelected: boolean;
  onToggleSelection: () => void;
  isExpanded: boolean;
  onToggleHealthDetails: () => void;
  healthDetails?: unknown;
}

function SubjectCardWithSelection({
  listing,
  isSelected,
  onToggleSelection,
  isExpanded,
  onToggleHealthDetails,
  healthDetails,
}: SubjectCardWithSelectionProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  return (
    <View
      style={[
        styles.subjectCard,
        {
          backgroundColor: colors.surface,
          borderColor: isSelected ? colors.primary : colors.divider,
        },
      ]}
    >
      {/* Checkbox et carte sujet */}
      <View style={styles.subjectCardHeader}>
        <TouchableOpacity style={styles.checkbox} onPress={onToggleSelection}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={24}
            color={isSelected ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
        <View style={styles.subjectCardContent}>
          <SubjectCard
            subject={{
              id: listing.id,
              code: listing.code || listing.subjectId,
              race: listing.race || 'Non spécifiée',
              weight: listing.weight || 0,
              weightDate: listing.weightDate || listing.lastWeightDate,
              age: listing.age || 0,
              pricePerKg: listing.pricePerKg,
              totalPrice: listing.totalPrice || listing.calculatedPrice,
              healthStatus: listing.healthStatus || 'good',
              vaccinations: listing.vaccinations || false,
              available: listing.available !== false,
            }}
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Bouton détails sanitaires */}
      <TouchableOpacity
        style={[styles.healthDetailsButton, { backgroundColor: colors.surfaceLight }]}
        onPress={onToggleHealthDetails}
      >
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
        <Text style={[styles.healthDetailsText, { color: colors.textSecondary }]}>
          {isExpanded ? 'Masquer' : 'Voir'} détails sanitaires
        </Text>
      </TouchableOpacity>

      {/* Détails sanitaires (accordéon) */}
      {isExpanded && healthDetails && (
        <View style={[styles.healthDetailsContent, { backgroundColor: colors.surfaceLight }]}>
          <HealthDetailsContent details={healthDetails} />
        </View>
      )}
    </View>
  );
}

// Composant pour afficher les détails sanitaires
function HealthDetailsContent({ details }: { details: unknown }) {
  const { colors, spacing, typography } = MarketplaceTheme;

  return (
    <View style={styles.healthDetails}>
      {/* Vaccinations */}
      {details.vaccinations && details.vaccinations.length > 0 && (
        <View style={styles.healthSection}>
          <Text style={[styles.healthSectionTitle, { color: colors.text }]}>💉 Vaccinations</Text>
          {details.vaccinations.slice(0, 5).map((v: unknown, idx: number) => (
            <View key={idx} style={styles.healthItem}>
              <Ionicons
                name={
                  v.date_rappel && new Date(v.date_rappel) > new Date()
                    ? 'checkmark-circle'
                    : 'alert-circle'
                }
                size={16}
                color={
                  v.date_rappel && new Date(v.date_rappel) > new Date()
                    ? colors.success
                    : colors.warning
                }
              />
              <Text style={[styles.healthItemText, { color: colors.text }]}>
                {v.type_prophylaxie
                  ? TYPE_PROPHYLAXIE_LABELS[v.type_prophylaxie] || v.type_prophylaxie
                  : v.type_vaccin || 'Vaccination'}{' '}
                - {formatDate(v.date_vaccination)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Maladies */}
      {details.maladies && details.maladies.length > 0 && (
        <View style={styles.healthSection}>
          <Text style={[styles.healthSectionTitle, { color: colors.text }]}>🦠 Maladies</Text>
          {details.maladies.map((m: unknown, idx: number) => (
            <View key={idx} style={styles.healthItem}>
              <Ionicons
                name={m.gueri ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={m.gueri ? colors.success : colors.error}
              />
              <Text style={[styles.healthItemText, { color: colors.text }]}>
                {m.type} - {m.gueri ? 'Guéri' : 'En cours'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Visites vétérinaires */}
      {details.visites && details.visites.length > 0 && (
        <View style={styles.healthSection}>
          <Text style={[styles.healthSectionTitle, { color: colors.text }]}>
            🏥 Dernière visite vétérinaire
          </Text>
          <Text style={[styles.healthItemText, { color: colors.text }]}>
            {formatDate(details.visites[0].date_visite)}
          </Text>
        </View>
      )}

      {(!details.vaccinations || details.vaccinations.length === 0) &&
        (!details.maladies || details.maladies.length === 0) &&
        (!details.visites || details.visites.length === 0) && (
          <Text style={[styles.healthItemText, { color: colors.textSecondary }]}>
            Aucune information sanitaire disponible
          </Text>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MarketplaceTheme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  headerSubtitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginTop: 2,
  },
  selectionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: MarketplaceTheme.spacing.sm,
  },
  selectionBadgeText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  filtersContainer: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.xs,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginBottom: MarketplaceTheme.spacing.sm,
    gap: MarketplaceTheme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  raceFilter: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.xs,
    borderRadius: MarketplaceTheme.borderRadius.round,
    marginRight: MarketplaceTheme.spacing.xs,
  },
  filterChipText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.xs,
    borderRadius: MarketplaceTheme.borderRadius.md,
    gap: MarketplaceTheme.spacing.xs,
  },
  sortText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.xs,
    marginTop: MarketplaceTheme.spacing.xs,
  },
  selectAllText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MarketplaceTheme.spacing.xl,
  },
  loadingText: {
    marginTop: MarketplaceTheme.spacing.md,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MarketplaceTheme.spacing.xl,
  },
  emptyText: {
    marginTop: MarketplaceTheme.spacing.md,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    textAlign: 'center',
  },
  subjectCard: {
    marginHorizontal: MarketplaceTheme.spacing.md,
    marginVertical: MarketplaceTheme.spacing.xs,
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 2,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: MarketplaceTheme.spacing.sm,
  },
  checkbox: {
    paddingTop: MarketplaceTheme.spacing.xs,
  },
  subjectCardContent: {
    flex: 1,
  },
  healthDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: MarketplaceTheme.spacing.xs,
    marginTop: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    gap: MarketplaceTheme.spacing.xs,
  },
  healthDetailsText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  healthDetailsContent: {
    marginTop: MarketplaceTheme.spacing.sm,
    padding: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  healthDetails: {
    gap: MarketplaceTheme.spacing.sm,
  },
  healthSection: {
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  healthSectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.xs,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  healthItemText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    flex: 1,
  },
  footer: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderTopWidth: 1,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  footerText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  footerPrice: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  footerActions: {
    width: '100%',
  },
  offerButton: {
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
  },
  offerButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    gap: MarketplaceTheme.spacing.xs,
  },
  removeButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
});
