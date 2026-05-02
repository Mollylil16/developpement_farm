/**
 * Composant liste des revenus
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadRevenus, deleteRevenu } from '../store/slices/financeSlice';
import { selectAllRevenus } from '../store/selectors/financeSelectors';
import type { Revenu } from '../types/finance';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import RevenuFormModal from './RevenuFormModal';
import VenteDetailModal from './VenteDetailModal';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { logger } from '../utils/logger';
import { useProjetEffectif } from '../hooks/useProjetEffectif';

function FinanceRevenusComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const revenus = useAppSelector(selectAllRevenus);
  const loading = useAppSelector((state) => state.finance?.loading ?? false);
  const [selectedRevenu, setSelectedRevenu] = useState<Revenu | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [displayedDepenses, setDisplayedDepenses] = useState<Revenu[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const [refreshing, setRefreshing] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedVenteDetail, setSelectedVenteDetail] = useState<Revenu | null>(null);

  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();

  // Charger les données à chaque fois que l'écran est focus
  useFocusEffect(
    useCallback(() => {
      if (projetActif) {
        dispatch(loadRevenus(projetActif.id));
      }
    }, [dispatch, projetActif?.id])
  );

  // Pagination: charger les premiers revenus
  useEffect(() => {
    const initial = revenus.slice(0, ITEMS_PER_PAGE);
    setDisplayedDepenses(initial);
    setPage(1);
  }, [revenus.length]);

  // Charger plus de revenus
  const loadMore = useCallback(() => {
    if (displayedDepenses.length >= revenus.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = revenus.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedDepenses((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedDepenses.length, revenus]);

  const handleEdit = useCallback(
    (revenu: Revenu) => {
      if (!canUpdate('finance')) {
        Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les revenus.");
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedRevenu(revenu);
      setIsEditing(true);
      setModalVisible(true);
    },
    [canUpdate]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!canDelete('finance')) {
        Alert.alert(
          'Permission refusée',
          "Vous n'avez pas la permission de supprimer les revenus."
        );
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert('Supprimer le revenu', 'Êtes-vous sûr de vouloir supprimer ce revenu ?', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => dispatch(deleteRevenu(id)),
        },
      ]);
    },
    [canDelete, dispatch]
  );

  const handleViewPhotos = useCallback((photos: string[]) => {
    setViewingPhotos(photos);
    setPhotoModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedRevenu(null);
    setIsEditing(false);
  }, []);

  const handleSuccess = useCallback(() => {
    handleCloseModal();
    if (projetActif) {
      dispatch(loadRevenus(projetActif.id));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [handleCloseModal, projetActif?.id, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      await dispatch(loadRevenus(projetActif.id)).unwrap();
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, projetActif?.id]);

  const getCategoryLabel = (categorie: string): string => {
    const labels: Record<string, string> = {
      vente_porc: 'Vente de porc',
      vente_autre: 'Vente autre',
      subvention: 'Subvention',
      autre: 'Autre',
    };
    return labels[categorie] || categorie;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filtrer par mois actuel pour le résumé
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const revenusCeMois = revenus.filter((revenu) => {
    const date = new Date(revenu.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const totalMois = revenusCeMois.reduce((sum, rev) => sum + rev.montant, 0);

  if (loading) {
    return <LoadingSpinner message="Chargement des revenus..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Revenus</Text>
        {canCreate('finance') && (
          <TouchableOpacity
            accessible={true}
            accessibilityLabel="Ajouter un revenu"
            accessibilityRole="button"
            accessibilityHint="Ouvre le formulaire pour ajouter un nouveau revenu"
            style={[
              styles.addButton,
              { backgroundColor: colors.primary, minHeight: 44, minWidth: 44 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedRevenu(null);
              setIsEditing(false);
              setModalVisible(true);
            }}
          >
            <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>+ Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Résumé du mois */}
      <View
        style={[
          styles.summary,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Revenus ce mois
          </Text>
          <Text style={[styles.summaryValue, { color: colors.success || colors.primary }]}>
            {formatAmount(totalMois)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Nombre de revenus
          </Text>
          <Text style={[styles.summaryValue, { color: colors.success || colors.primary }]}>
            {revenusCeMois.length}
          </Text>
        </View>
      </View>

      {revenus.length === 0 ? (
        <EmptyState
          title="Aucun revenu enregistré"
          message="Ajoutez votre premier revenu pour commencer"
          action={
            canCreate('finance') ? (
              <TouchableOpacity
                accessible={true}
                accessibilityLabel="Ajouter un revenu"
                accessibilityRole="button"
                style={[
                  styles.addButton,
                  { backgroundColor: colors.primary, minHeight: 44, minWidth: 44 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedRevenu(null);
                  setIsEditing(false);
                  setModalVisible(true);
                }}
              >
                <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>
                  + Ajouter un revenu
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={displayedDepenses}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item: revenu }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...colors.shadow.small,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {getCategoryLabel(revenu.categorie)}
                  </Text>
                  <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                    {formatDate(revenu.date)}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  {(() => {
                    // Filtrer les photos valides
                    const photosValides = revenu.photos?.filter((p) => p && p.trim() !== '') || [];
                    return photosValides.length > 0 ? (
                      <TouchableOpacity
                        accessible={true}
                        accessibilityLabel="Voir les photos de la facture"
                        accessibilityRole="button"
                        style={[styles.actionButton, { minHeight: 44, minWidth: 44 }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          handleViewPhotos(photosValides);
                        }}
                      >
                        <Text style={styles.actionButtonText}>📷</Text>
                      </TouchableOpacity>
                    ) : null;
                  })()}
                  {canUpdate('finance') && (
                    <TouchableOpacity
                      accessible={true}
                      accessibilityLabel="Modifier ce revenu"
                      accessibilityRole="button"
                      style={[styles.actionButton, { minHeight: 44, minWidth: 44 }]}
                      onPress={() => handleEdit(revenu)}
                    >
                      <Text style={styles.actionButtonText}>✏️</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete('finance') && (
                    <TouchableOpacity
                      accessible={true}
                      accessibilityLabel="Supprimer ce revenu"
                      accessibilityRole="button"
                      style={[styles.actionButton, { minHeight: 44, minWidth: 44 }]}
                      onPress={() => handleDelete(revenu.id)}
                    >
                      <Text style={styles.actionButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.amountRow}>
                  <Text style={[styles.amount, { color: colors.success || colors.primary }]}>
                    {formatAmount(revenu.montant)}
                  </Text>
                </View>
                {revenu.description && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Description:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {revenu.description}
                    </Text>
                  </View>
                )}
                {revenu.libelle_categorie && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Libellé:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {revenu.libelle_categorie}
                    </Text>
                  </View>
                )}
                {revenu.commentaire && (
                  <View style={[styles.commentContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.commentLabel, { color: colors.textSecondary }]}>
                      Commentaire:
                    </Text>
                    <Text style={[styles.commentText, { color: colors.text }]}>
                      {revenu.commentaire}
                    </Text>
                  </View>
                )}
                {(() => {
                  // Filtrer les photos valides (non vides, non nulles)
                  const photosValides = revenu.photos?.filter((p) => p && p.trim() !== '') || [];
                  return photosValides.length > 0 ? (
                    <View style={styles.photosContainer}>
                      <Text style={[styles.photosLabel, { color: colors.textSecondary }]}>
                        {photosValides.length} photo{photosValides.length > 1 ? 's' : ''} de facture
                      </Text>
                    </View>
                  ) : null;
                })()}

                {/* Informations de vente marketplace */}
                {revenu.categorie === 'vente_porc' && (
                  <View style={[styles.venteInfoContainer, { borderTopColor: colors.border }]}>
                    {(revenu.poids_total || revenu.poids_kg) && (
                      <View style={styles.venteInfoRow}>
                        <Text style={[styles.venteInfoLabel, { color: colors.textSecondary }]}>
                          Poids total:
                        </Text>
                        <Text style={[styles.venteInfoValue, { color: colors.text }]}>
                          {((revenu.poids_total || revenu.poids_kg) || 0).toLocaleString()} kg
                        </Text>
                      </View>
                    )}
                    {revenu.nombre_animaux && (
                      <View style={styles.venteInfoRow}>
                        <Text style={[styles.venteInfoLabel, { color: colors.textSecondary }]}>
                          Nombre d'animaux:
                        </Text>
                        <Text style={[styles.venteInfoValue, { color: colors.text }]}>
                          {revenu.nombre_animaux}
                        </Text>
                      </View>
                    )}
                    {revenu.acheteur && (
                      <View style={styles.venteInfoRow}>
                        <Text style={[styles.venteInfoLabel, { color: colors.textSecondary }]}>
                          Acheteur:
                        </Text>
                        <Text style={[styles.venteInfoValue, { color: colors.text }]}>
                          {revenu.acheteur}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {revenu.categorie === 'vente_porc' && (revenu.poids_total || revenu.poids_kg) && (revenu.poids_total || revenu.poids_kg) > 0 && (
                  <TouchableOpacity
                    style={[styles.detailButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedVenteDetail(revenu);
                      setDetailModalVisible(true);
                    }}
                  >
                    <Text style={[styles.detailButtonText, { color: colors.background }]}>
                      📊 Voir détails & marges
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          // Optimisations de performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={
            displayedDepenses.length < revenus.length ? (
              <LoadingSpinner message="Chargement..." />
            ) : null
          }
        />
      )}

      <RevenuFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        revenu={selectedRevenu}
        isEditing={isEditing}
      />

      {/* Modal pour voir les photos */}
      {photoModalVisible && (
        <View style={styles.photoModal}>
          <View style={[styles.photoModalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.photoModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.photoModalTitle, { color: colors.text }]}>
                Photos de la facture
              </Text>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <Text style={[styles.photoModalClose, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal pagingEnabled>
              {viewingPhotos
                .filter((p) => p && p.trim() !== '')
                .map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={styles.photoImage}
                    contentFit="contain"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modal pour voir les détails d'une vente */}
      <VenteDetailModal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedVenteDetail(null);
        }}
        vente={selectedVenteDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.md + 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  card: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  cardDate: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
  },
  cardContent: {
    marginTop: SPACING.sm,
  },
  amountRow: {
    marginBottom: SPACING.sm,
  },
  amount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
  },
  commentContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  commentLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  commentText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  photosContainer: {
    marginTop: SPACING.sm,
  },
  photosLabel: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  photoModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '90%',
    height: '80%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  photoModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  photoModalClose: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  photoImage: {
    width: 300,
    height: 400,
  },
  previsionnelsContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  previsionnelsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  previsionnelCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  previsionnelHeader: {
    marginBottom: SPACING.sm,
  },
  previsionnelLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  previsionnelContent: {
    marginTop: SPACING.sm,
  },
  previsionnelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  previsionnelText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  previsionnelValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  detailButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  venteInfoContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  venteInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  venteInfoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  venteInfoValue: {
    fontSize: FONT_SIZES.sm,
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(FinanceRevenusComponent);
