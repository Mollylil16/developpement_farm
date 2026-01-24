/**
 * Composant pour gérer l'historique des animaux (vendu, offert, mort)
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useProjetEffectif } from '../hooks/useProjetEffectif';
import {
  loadProductionAnimaux,
  deleteProductionAnimal,
  updateProductionAnimal,
  loadPeseesRecents,
} from '../store/slices/productionSlice';
import { selectAllAnimaux, selectProductionLoading } from '../store/selectors/productionSelectors';
import type { ProductionAnimal, StatutAnimal } from '../types/production';
import { STATUT_ANIMAL_LABELS } from '../types/production';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import Button from './Button';
import ProductionAnimalFormModal from './ProductionAnimalFormModal';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { calculerAge, getStatutColor } from '../utils/animalUtils';
import {
  loadMortalitesParProjet,
  loadStatistiquesMortalite,
  deleteMortalite,
} from '../store/slices/mortalitesSlice';
import { selectAllMortalites } from '../store/selectors/mortalitesSelectors';

// Statuts qui doivent être dans l'historique
const STATUTS_HISTORIQUE: StatutAnimal[] = ['vendu', 'offert', 'mort'];

export default function ProductionHistoriqueComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canUpdate, canDelete } = useActionPermissions();
  const navigation = useNavigation<NavigationProp<any>>();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const animaux = useAppSelector(selectAllAnimaux);
  const loading = useAppSelector(selectProductionLoading);
  const mortalites = useAppSelector(selectAllMortalites);
  
  // Enrichir les animaux avec leur statut marketplace
  const { animauxEnrichis } = useMarketplaceStatusForAnimals();
  const animauxEnrichisMap = React.useMemo(() => {
    const map = new Map<string, typeof animauxEnrichis[0]>();
    animauxEnrichis.forEach((animal) => {
      map.set(animal.id, animal);
    });
    return map;
  }, [animauxEnrichis]);

  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<ProductionAnimal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<StatutAnimal | 'tous'>('tous');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
    }
  }, [dispatch, projetActif]);

  // Fonction pour rafraîchir les données (pull-to-refresh)
  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      await dispatch(loadProductionAnimaux({ projetId: projetActif.id })).unwrap();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [projetActif?.id, dispatch]);

  // Filtrer uniquement les animaux dans l'historique (avec protection contre undefined)
  const animauxHistorique = useMemo(() => {
    return (animaux || []).filter((a) => STATUTS_HISTORIQUE.includes(a.statut));
  }, [animaux]);

  const animauxFiltres = useMemo(() => {
    if (filterStatut === 'tous') {
      return animauxHistorique;
    }
    return animauxHistorique.filter((a) => a.statut === filterStatut);
  }, [animauxHistorique, filterStatut]);

  const handleDelete = (animal: ProductionAnimal) => {
    if (!canDelete('reproduction')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de supprimer les animaux.");
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
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error) || 'Erreur lors de la suppression';
              Alert.alert('Erreur', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleChangeStatut = (animal: ProductionAnimal, nouveauStatut: StatutAnimal) => {
    if (!canUpdate('reproduction')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les animaux.");
      return;
    }

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
                // Trouver l'entrée de mortalité correspondant à cet animal
                const mortaliteCorrespondante = mortalites.find(
                  (m) => m.animal_code === animal.code && m.projet_id === projetActif.id
                );

                if (mortaliteCorrespondante) {
                  try {
                    await dispatch(deleteMortalite(mortaliteCorrespondante.id)).unwrap();
                  } catch (deleteError: unknown) {
                    console.warn('Erreur lors de la suppression de la mortalité:', deleteError);
                    // Ne pas bloquer si la suppression échoue
                  }
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
                await Promise.all([
                  dispatch(loadMortalitesParProjet(projetActif.id)).unwrap(),
                  dispatch(loadStatistiquesMortalite(projetActif.id)).unwrap(),
                ]);
              }

              // Si le statut devient "actif", naviguer vers le cheptel
              if (nouveauStatut === 'actif') {
                navigation.goBack();
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error) || 'Erreur lors de la mise à jour du statut';
              Alert.alert('Erreur', errorMessage);
            }
          },
        },
      ]
    );
  };

  const getParentLabel = (id?: string | null) => {
    if (!id) {
      return 'Inconnu';
    }
    const parent = animaux.find((a) => a.id === id);
    if (!parent) {
      return 'Inconnu';
    }
    return `${parent.code}${parent.nom ? ` (${parent.nom})` : ''}`;
  };

  const renderAnimal = ({ item }: { item: ProductionAnimal }) => {
    const age = calculerAge(item.date_naissance);
    const statutColor = getStatutColor(item.statut, colors);
    
    // Enrichir avec les données marketplace
    const animalEnrichi = animauxEnrichisMap.get(item.id) || item;
    const marketplaceStatus = (animalEnrichi as any).marketplace_status;

    return (
      <Card elevation="small" padding="medium" style={styles.animalCard}>
        <View style={styles.animalHeader}>
          <View style={styles.animalInfo}>
            <Text style={[styles.animalCode, { color: colors.text }]}>
              {item.code}
              {item.nom ? ` (${item.nom})` : ''}
            </Text>
            <View style={[styles.statutBadge, { backgroundColor: statutColor + '15' }]}>
              <Text style={[styles.statutText, { color: statutColor }]}>
                {STATUT_ANIMAL_LABELS[item.statut]}
              </Text>
            </View>
            {item.reproducteur && (
              <View style={[styles.reproducteurBadge, { backgroundColor: colors.success + '18' }]}>
                <Text style={[styles.reproducteurText, { color: colors.success }]}>
                  Reproducteur
                </Text>
              </View>
            )}
            {marketplaceStatus === 'available' && (
              <View
                style={[
                  styles.marketplaceBadge,
                  { backgroundColor: '#FF8C42' + '25', borderColor: '#FF8C42', borderWidth: 1.5 },
                ]}
              >
                <Ionicons name="storefront" size={12} color="#FF8C42" />
                <Text style={[styles.marketplaceText, { color: '#FF8C42', fontWeight: '700' }]}>
                  En vente
                </Text>
              </View>
            )}
            {marketplaceStatus === 'reserved' && (
              <View
                style={[
                  styles.marketplaceBadge,
                  { backgroundColor: '#F39C12' + '25', borderColor: '#F39C12', borderWidth: 1.5 },
                ]}
              >
                <Ionicons name="lock-closed" size={12} color="#F39C12" />
                <Text style={[styles.marketplaceText, { color: '#F39C12', fontWeight: '700' }]}>
                  Réservé
                </Text>
              </View>
            )}
          </View>
          <View style={styles.animalActions}>
            {canUpdate('reproduction') && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                onPress={() => {
                  setSelectedAnimal(item);
                  setIsEditing(true);
                  setShowAnimalModal(true);
                }}
              >
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Modifier</Text>
              </TouchableOpacity>
            )}
            {canDelete('reproduction') && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                onPress={() => handleDelete(item)}
              >
                <Text style={[styles.actionButtonText, { color: colors.error }]}>Supprimer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.animalDetails}>
          {item.origine && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Origine:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{item.origine}</Text>
            </View>
          )}
          {age && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Âge:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{age}</Text>
            </View>
          )}
          {item.date_naissance && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Date de naissance:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {format(parseISO(item.date_naissance), 'dd MMM yyyy', { locale: fr })}
              </Text>
            </View>
          )}
          {item.date_entree && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Date d'arrivée:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {format(parseISO(item.date_entree), 'dd MMM yyyy', { locale: fr })}
              </Text>
            </View>
          )}
          {item.race && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Race:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{item.race}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Père:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {getParentLabel(item.pere_id)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Mère:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {getParentLabel(item.mere_id)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Poids à l'arrivée:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.poids_initial ? `${item.poids_initial.toFixed(1)} kg` : 'Non renseigné'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Sexe:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.sexe === 'male' ? 'Mâle' : item.sexe === 'femelle' ? 'Femelle' : 'Indéterminé'}
            </Text>
          </View>
        </View>

        {item.notes && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.notesContainer}>
              <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
                Notes (vaccins, etc.):
              </Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{item.notes}</Text>
            </View>
          </>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {canUpdate('reproduction') && (
          <View style={styles.statutSelector}>
            <Text style={[styles.statutSelectorLabel, { color: colors.text }]}>
              Changer le statut:
            </Text>
            <View style={styles.statutButtons}>
              {/* Permettre de remettre en actif ou changer entre les statuts d'historique */}
              {(['actif', 'mort', 'vendu', 'offert', 'autre'] as StatutAnimal[]).map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.statutButton,
                    {
                      backgroundColor:
                        item.statut === statut ? getStatutColor(statut, colors) : colors.background,
                      borderColor: getStatutColor(statut, colors),
                    },
                  ]}
                  onPress={() => handleChangeStatut(item, statut)}
                >
                  <Text
                    style={[
                      styles.statutButtonText,
                      {
                        color:
                          item.statut === statut
                            ? colors.textOnPrimary
                            : getStatutColor(statut, colors),
                      },
                    ]}
                  >
                    {STATUT_ANIMAL_LABELS[statut]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Card>
    );
  };

  const ListHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={[styles.title, { color: colors.text }]}>Historique</Text>
      </View>
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          {animauxHistorique.length} animal{animauxHistorique.length > 1 ? 'aux' : ''} dans
          l'historique
        </Text>
      </View>
      <View style={styles.filters}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
          Filtrer par statut:
        </Text>
        <View style={styles.filterButtons}>
          {(['tous', 'mort', 'vendu', 'offert'] as const).map((statut) => (
            <TouchableOpacity
              key={statut}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterStatut === statut ? colors.primary : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setFilterStatut(statut === 'tous' ? 'tous' : statut)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: filterStatut === statut ? colors.textOnPrimary : colors.text,
                  },
                ]}
              >
                {statut === 'tous' ? 'Tous' : STATUT_ANIMAL_LABELS[statut]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Chargement de l'historique..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={animauxFiltres}
        renderItem={renderAnimal}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucun animal dans l'historique"
            message="Les animaux vendus, offerts ou morts apparaîtront ici"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {projetActif && (
        <ProductionAnimalFormModal
          visible={showAnimalModal}
          onClose={() => {
            setShowAnimalModal(false);
            setIsEditing(false);
            setSelectedAnimal(null);
          }}
          onSuccess={() => {
            // Recharger les animaux pour afficher les modifications
            if (projetActif) {
              dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
            }
          }}
          projetId={projetActif.id}
          animal={isEditing ? selectedAnimal : null}
          isEditing={isEditing}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  filters: {
    marginTop: SPACING.md,
  },
  filterLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  animalCard: {
    marginBottom: SPACING.md,
  },
  animalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  animalInfo: {
    flex: 1,
  },
  animalCode: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statutBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statutText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  reproducteurBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  reproducteurText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  marketplaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.xs,
    marginTop: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  marketplaceText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  animalActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  animalDetails: {
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
  },
  notesContainer: {
    marginTop: SPACING.xs,
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  statutSelector: {
    marginTop: SPACING.sm,
  },
  statutSelectorLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  statutButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  statutButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  statutButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
});
