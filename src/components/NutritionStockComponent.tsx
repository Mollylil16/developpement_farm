/**
 * Composant de gestion des stocks d'aliments
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadStocks,
  deleteStockAliment,
  loadMouvementsParAliment,
} from '../store/slices/stocksSlice';
import type { StockAliment, StockMouvement } from '../types/nutrition';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import StockAlimentFormModal from './StockAlimentFormModal';
import StockMovementFormModal from './StockMovementFormModal';
import Button from './Button';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { useProjetEffectif } from '../hooks/useProjetEffectif';

const screenWidth = Dimensions.get('window').width;
// Largeur fixe pour les cartes : largeur écran - (padding horizontal * 2)
const CARD_FIXED_WIDTH = screenWidth - SPACING.xl * 2;

export default function NutritionStockComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const { stocks, mouvementsParAliment, loading } = useAppSelector((state) => state.stocks);
  const [selectedStock, setSelectedStock] = useState<StockAliment | null>(null);
  const [showAlimentModal, setShowAlimentModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [displayedStocks, setDisplayedStocks] = useState<StockAliment[]>([]);
  const [pageStocks, setPageStocks] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (projetActif) {
      dispatch(loadStocks(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  // Fonction pour rafraîchir les données (pull-to-refresh)
  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      await dispatch(loadStocks(projetActif.id)).unwrap();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des stocks:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, projetActif?.id]);

  // Ne plus charger automatiquement tous les mouvements - c'est maintenant dans un onglet séparé
  // Charger uniquement les mouvements du stock sélectionné si nécessaire

  const alertes = useMemo(() => (stocks || []).filter((stock) => stock.alerte_active), [stocks]);

  // Mouvements du stock sélectionné (pour l'affichage détaillé si nécessaire)
  const mouvementsStockSelectionne: StockMouvement[] = useMemo(() => {
    if (!selectedStock) {
      return [];
    }
    return mouvementsParAliment[selectedStock.id] || [];
  }, [selectedStock, mouvementsParAliment]);

  // Synchroniser selectedStock avec les stocks Redux (pour mettre à jour après un mouvement)
  useEffect(() => {
    if (selectedStock) {
      const updatedStock = (stocks || []).find((s) => s.id === selectedStock.id);
      if (updatedStock && updatedStock.quantite_actuelle !== selectedStock.quantite_actuelle) {
        setSelectedStock(updatedStock);
      }
    }
  }, [stocks, selectedStock]);

  // Pagination: mettre à jour displayedStocks quand stocks change (pas seulement la longueur)
  // Créer une clé basée sur les IDs et quantités pour détecter les changements
  const stocksKey = useMemo(() => {
    return (stocks || []).map((s) => `${s.id}:${s.quantite_actuelle}`).join(',');
  }, [stocks]);

  // Synchroniser displayedStocks quand stocks change (détecté via la clé)
  useEffect(() => {
    const initial = (stocks || []).slice(0, ITEMS_PER_PAGE);
    setDisplayedStocks(initial);
    setPageStocks(1);
  }, [stocksKey]);

  // Charger plus de stocks
  const loadMoreStocks = useCallback(() => {
    if (displayedStocks.length >= (stocks || []).length) {
      return;
    }

    const nextPage = pageStocks + 1;
    const start = pageStocks * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = (stocks || []).slice(start, end);

    if (newItems.length > 0) {
      setDisplayedStocks((prev) => [...prev, ...newItems]);
      setPageStocks(nextPage);
    }
  }, [pageStocks, displayedStocks.length, stocks]);

  const handleDelete = (aliment: StockAliment) => {
    if (!canDelete('nutrition')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de supprimer les stocks.");
      return;
    }
    Alert.alert(
      "Supprimer l'aliment",
      `Voulez-vous supprimer ${aliment.nom} ? Toutes les données de stock associées seront supprimées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteStockAliment(aliment.id)).unwrap();
              // Recharger la liste pour s'assurer que l'UI est à jour
              if (projetActif) {
                await dispatch(loadStocks(projetActif.id));
              }
              if (selectedStock?.id === aliment.id) {
                setSelectedStock(null);
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : "Erreur lors de la suppression de l'aliment";
              Alert.alert('Erreur', errorMessage);
            }
          },
        },
      ]
    );
  };

  if (!projetActif) {
    return (
      <EmptyState
        title="Aucun projet actif"
        message="Créez ou sélectionnez un projet pour gérer vos stocks d'aliments."
      />
    );
  }

  if (loading && (stocks || []).length === 0) {
    return <LoadingSpinner message="Chargement des stocks d'aliments..." />;
  }

  // Composant d'en-tête pour la FlatList
  const ListHeader = () => (
    <View>
      <View
        style={[styles.summaryCard, { backgroundColor: colors.surface, ...colors.shadow.medium }]}
      >
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Suivi des stocks</Text>
          {canCreate('nutrition') && (
            <Button
              title="Nouvel aliment"
              onPress={() => {
                setIsEditing(false);
                setShowAlimentModal(true);
              }}
              size="small"
            />
          )}
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {(stocks || []).length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Aliments suivis
            </Text>
          </View>
          <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryValue,
                { color: alertes.length > 0 ? colors.error : colors.text },
              ]}
            >
              {alertes.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Alertes actives
            </Text>
          </View>
        </View>
        {alertes.length > 0 ? (
          <View style={[styles.alertBox, { backgroundColor: colors.error + '15' }]}>
            <Text style={[styles.alertTitle, { color: colors.error }]}>⚠️ Alertes stock bas</Text>
            {alertes.slice(0, 3).map((stock) => (
              <Text key={stock.id} style={[styles.alertText, { color: colors.text }]}>
                • {stock.nom}: {stock.quantite_actuelle} {stock.unite} (seuil {stock.seuil_alerte}{' '}
                {stock.unite})
              </Text>
            ))}
            {alertes.length > 3 && (
              <Text style={[styles.alertMore, { color: colors.textSecondary }]}>
                +{alertes.length - 3} alertes supplémentaires
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );

  if ((stocks || []).length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ListHeader />
        <EmptyState
          title="Aucun aliment enregistré"
          message="Ajoutez votre premier aliment pour suivre vos stocks."
          action={
            canCreate('nutrition') ? (
              <Button
                title="Ajouter un aliment"
                onPress={() => {
                  setIsEditing(false);
                  setShowAlimentModal(true);
                }}
              />
            ) : null
          }
        />
        <StockAlimentFormModal
          visible={showAlimentModal}
          onClose={() => {
            setShowAlimentModal(false);
            setIsEditing(false);
            setSelectedStock(null);
          }}
          onSuccess={async () => {
            setShowAlimentModal(false);
            setIsEditing(false);
            setSelectedStock(null);
            if (projetActif) {
              // Recharger tous les stocks pour s'assurer que les données sont à jour
              await dispatch(loadStocks(projetActif.id));
            }
          }}
          projetId={projetActif?.id || ''}
          aliment={isEditing ? selectedStock : null}
          isEditing={isEditing}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayedStocks}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item: stock }) => {
          const pourcentage = stock.seuil_alerte
            ? Math.min(100, Math.round((stock.quantite_actuelle / stock.seuil_alerte) * 100))
            : null;

          return (
            <View
              key={stock.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedStock?.id === stock.id ? colors.primary : colors.borderLight,
                  borderWidth: selectedStock?.id === stock.id ? 2 : 1,
                  ...colors.shadow.small,
                },
              ]}
            >
              <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedStock(stock)}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{stock.nom}</Text>
                    {stock.categorie ? (
                      <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                        {stock.categorie}
                      </Text>
                    ) : null}
                  </View>
                  {stock.alerte_active && (
                    <Text style={[styles.alertBadge, { color: colors.error }]}>Alerte</Text>
                  )}
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardRow}>
                    <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                      Stock actuel :
                    </Text>
                    <Text style={[styles.cardValue, { color: colors.text }]}>
                      {stock.quantite_actuelle} {stock.unite}
                    </Text>
                  </View>
                  {stock.seuil_alerte !== undefined && stock.seuil_alerte !== null && (
                    <View style={styles.cardRow}>
                      <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                        Seuil d'alerte :
                      </Text>
                      <Text style={[styles.cardValue, { color: colors.text }]}>
                        {stock.seuil_alerte} {stock.unite}
                      </Text>
                    </View>
                  )}
                  {pourcentage !== null &&
                    stock.seuil_alerte !== undefined &&
                    stock.seuil_alerte !== null && (
                      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.round(Math.min(100, pourcentage))}%`,
                              backgroundColor: stock.alerte_active ? colors.error : colors.primary,
                            },
                          ]}
                        />
                      </View>
                    )}
                </View>
              </TouchableOpacity>
              <View style={styles.cardActions}>
                {canCreate('nutrition') && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: colors.primary + '12' },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      setSelectedStock(stock);
                      setShowMovementModal(true);
                    }}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>Mouvement</Text>
                  </Pressable>
                )}
                {canUpdate('nutrition') && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: colors.primary + '12' },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      setSelectedStock(stock);
                      setIsEditing(true);
                      setShowAlimentModal(true);
                    }}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>Modifier</Text>
                  </Pressable>
                )}
                {canDelete('nutrition') && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: colors.error + '15' },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleDelete(stock)}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>
                      Supprimer
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        onEndReached={loadMoreStocks}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        // Optimisations de performance
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
        ListFooterComponent={
          displayedStocks.length < (stocks || []).length ? (
            <LoadingSpinner message="Chargement..." />
          ) : null
        }
      />

      <StockAlimentFormModal
        visible={showAlimentModal}
        onClose={() => {
          setShowAlimentModal(false);
          setIsEditing(false);
          setSelectedStock(null);
        }}
        onSuccess={() => {
          // Le modal est déjà fermé par onClose dans StockAlimentFormModal
          // Réinitialiser les états
          setIsEditing(false);
          setSelectedStock(null);

          // Recharger les stocks de manière asynchrone sans bloquer
          if (projetActif) {
            // Utiliser setTimeout pour laisser le modal se fermer complètement
            setTimeout(() => {
              dispatch(loadStocks(projetActif.id));
            }, 150);
          }
        }}
        projetId={projetActif?.id || ''}
        aliment={isEditing ? selectedStock : null}
        isEditing={isEditing}
      />

      {selectedStock && (
        <StockMovementFormModal
          visible={showMovementModal}
          onClose={() => {
            setShowMovementModal(false);
          }}
          onSuccess={async () => {
            setShowMovementModal(false);
            if (projetActif && selectedStock) {
              // Recharger les stocks et les mouvements pour mettre à jour l'historique global
              // Le useEffect ci-dessus synchronisera automatiquement selectedStock
              await dispatch(loadStocks(projetActif.id));
              await dispatch(loadMouvementsParAliment({ alimentId: selectedStock.id }));
            }
          }}
          aliment={selectedStock}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  summaryCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg + 10,
    marginBottom: SPACING.lg,
    // Largeur fixe identique aux cartes détaillées
    width: CARD_FIXED_WIDTH,
    alignSelf: 'center', // Centre la carte
    // Hauteur minimale fixe pour garantir une dimension stable
    // Calcul: padding (32*2=64) + header (~50) + stats (~70) = ~184px minimum
    // On utilise minHeight pour permettre l'expansion si nécessaire (alertes)
    // mais garantir une hauteur minimale stable
    minHeight: 180,
    flexShrink: 0, // Empêche la carte de rétrécir
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  dividerVertical: {
    width: 1,
    height: '100%',
    marginHorizontal: SPACING.lg,
  },
  alertBox: {
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  alertTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  alertText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs / 2,
  },
  alertMore: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  listContainer: {
    paddingHorizontal: 0, // Pas de padding horizontal car les cartes ont déjà une largeur fixe
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    overflow: 'hidden',
    // Largeur fixe identique à la carte "Suivi des stocks"
    width: CARD_FIXED_WIDTH,
    alignSelf: 'center', // Centre la carte
  },
  cardSelectable: {
    marginBottom: SPACING.md,
  },
  cardSelectableContent: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
  alertBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  cardContent: {
    marginBottom: SPACING.md,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  cardLabel: {
    fontSize: FONT_SIZES.sm,
  },
  cardValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.round,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  actionButtonText: {
    fontWeight: '600',
  },
});
