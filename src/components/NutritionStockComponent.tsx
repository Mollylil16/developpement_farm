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
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadStocks,
  deleteStockAliment,
  loadMouvementsParAliment,
} from '../store/slices/stocksSlice';
import { StockAliment, StockMouvement } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import StockAlimentFormModal from './StockAlimentFormModal';
import StockMovementFormModal from './StockMovementFormModal';
import Button from './Button';

export default function NutritionStockComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { stocks, mouvementsParAliment, loading } = useAppSelector((state) => state.stocks);
  const [selectedStock, setSelectedStock] = useState<StockAliment | null>(null);
  const [showAlimentModal, setShowAlimentModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [displayedStocks, setDisplayedStocks] = useState<StockAliment[]>([]);
  const [displayedMouvements, setDisplayedMouvements] = useState<StockMouvement[]>([]);
  const [pageStocks, setPageStocks] = useState(1);
  const [pageMouvements, setPageMouvements] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (projetActif) {
      dispatch(loadStocks(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  useEffect(() => {
    if (selectedStock) {
      dispatch(loadMouvementsParAliment({ alimentId: selectedStock.id }));
    }
  }, [dispatch, selectedStock?.id]);

  const alertes = useMemo(() => stocks.filter((stock) => stock.alerte_active), [stocks]);

  const mouvements: StockMouvement[] = useMemo(() => {
    if (!selectedStock) {
      return [];
    }
    return mouvementsParAliment[selectedStock.id] || [];
  }, [selectedStock, mouvementsParAliment]);

  // Pagination: charger les premiers stocks
  useEffect(() => {
    const initial = stocks.slice(0, ITEMS_PER_PAGE);
    setDisplayedStocks(initial);
    setPageStocks(1);
  }, [stocks.length]);

  // Pagination: charger les premiers mouvements
  useEffect(() => {
    const initial = mouvements.slice(0, ITEMS_PER_PAGE);
    setDisplayedMouvements(initial);
    setPageMouvements(1);
  }, [mouvements.length, selectedStock?.id]);

  // Charger plus de stocks
  const loadMoreStocks = useCallback(() => {
    if (displayedStocks.length >= stocks.length) {
      return;
    }

    const nextPage = pageStocks + 1;
    const start = pageStocks * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = stocks.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedStocks((prev) => [...prev, ...newItems]);
      setPageStocks(nextPage);
    }
  }, [pageStocks, displayedStocks.length, stocks]);

  // Charger plus de mouvements
  const loadMoreMouvements = useCallback(() => {
    if (displayedMouvements.length >= mouvements.length) {
      return;
    }

    const nextPage = pageMouvements + 1;
    const start = pageMouvements * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = mouvements.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedMouvements((prev) => [...prev, ...newItems]);
      setPageMouvements(nextPage);
    }
  }, [pageMouvements, displayedMouvements.length, mouvements]);

  const handleDelete = (aliment: StockAliment) => {
    Alert.alert(
      'Supprimer l’aliment',
      `Voulez-vous supprimer ${aliment.nom} ? Toutes les données de stock associées seront supprimées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await dispatch(deleteStockAliment(aliment.id));
            if (selectedStock?.id === aliment.id) {
              setSelectedStock(null);
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

  if (loading && stocks.length === 0) {
    return <LoadingSpinner message="Chargement des stocks d'aliments..." />;
  }

  // Composant d'en-tête pour la FlatList
  const ListHeader = () => (
    <View>
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, ...colors.shadow.medium }]}>
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Suivi des stocks</Text>
          <Button
            title="Nouvel aliment"
            onPress={() => {
              setIsEditing(false);
              setShowAlimentModal(true);
            }}
            size="small"
          />
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{stocks.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Aliments suivis</Text>
          </View>
          <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: alertes.length > 0 ? colors.error : colors.text }]}>{alertes.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Alertes actives</Text>
          </View>
        </View>
        {alertes.length > 0 && (
          <View style={[styles.alertBox, { backgroundColor: colors.error + '15' }]}>
            <Text style={[styles.alertTitle, { color: colors.error }]}>⚠️ Alertes stock bas</Text>
            {alertes.slice(0, 3).map((stock) => (
              <Text key={stock.id} style={[styles.alertText, { color: colors.text }]}>
                • {stock.nom}: {stock.quantite_actuelle} {stock.unite} (seuil {stock.seuil_alerte} {stock.unite})
              </Text>
            ))}
            {alertes.length > 3 && (
              <Text style={[styles.alertMore, { color: colors.textSecondary }]}>
                +{alertes.length - 3} alertes supplémentaires
              </Text>
            )}
          </View>
        )}
      </View>

      {selectedStock && (
        <View style={[styles.historyContainer, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...colors.shadow.small }]}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>Historique des mouvements</Text>
            <Text style={[styles.historySubtitle, { color: colors.textSecondary }]}>{selectedStock.nom}</Text>
          </View>
          {mouvements.length === 0 ? (
            <EmptyState
              title="Aucun mouvement enregistré"
              message="Ajoutez votre premier mouvement pour suivre l'évolution de ce stock."
              action={
                <Button
                  title="Ajouter un mouvement"
                  onPress={() => setShowMovementModal(true)}
                  size="small"
                />
              }
            />
          ) : (
            <View>
              {displayedMouvements.map((mouvement) => (
                <View key={mouvement.id} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{new Date(mouvement.date).toLocaleDateString('fr-FR')}</Text>
                    <Text style={[styles.historyType, { color: colors.primary }]}>{mouvement.type}</Text>
                  </View>
                  <Text style={[styles.historyQuantity, { color: colors.text }]}>
                    {mouvement.type === 'sortie' ? '-' : '+'}
                    {mouvement.quantite} {mouvement.unite}
                  </Text>
                  {mouvement.origine && (
                    <Text style={[styles.historyNote, { color: colors.text }]}>Origine : {mouvement.origine}</Text>
                  )}
                  {mouvement.commentaire && (
                    <Text style={[styles.historyNote, { color: colors.text }]}>{mouvement.commentaire}</Text>
                  )}
                </View>
              ))}
              {displayedMouvements.length < mouvements.length && (
                <TouchableOpacity
                  onPress={loadMoreMouvements}
                  style={[styles.loadMoreButton, { backgroundColor: colors.primary + '12' }]}
                >
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>Charger plus de mouvements</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (stocks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ListHeader />
        <EmptyState
          title="Aucun aliment enregistré"
          message="Ajoutez votre premier aliment pour suivre vos stocks."
          action={
            <Button
              title="Ajouter un aliment"
              onPress={() => {
                setIsEditing(false);
                setShowAlimentModal(true);
              }}
            />
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
            data={displayedStocks}
            renderItem={({ item: stock }) => {
              const pourcentage = stock.seuil_alerte
                ? Math.min(100, Math.round((stock.quantite_actuelle / stock.seuil_alerte) * 100))
                : null;

              return (
                <TouchableOpacity
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
                  onPress={() => setSelectedStock(stock)}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{stock.nom}</Text>
                      {stock.categorie ? (
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{stock.categorie}</Text>
                      ) : null}
                    </View>
                    {stock.alerte_active && <Text style={[styles.alertBadge, { color: colors.error }]}>Alerte</Text>}
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardRow}>
                      <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Stock actuel :</Text>
                      <Text style={[styles.cardValue, { color: colors.text }]}>
                        {stock.quantite_actuelle} {stock.unite}
                      </Text>
                    </View>
                    {stock.seuil_alerte !== undefined && stock.seuil_alerte !== null && (
                      <View style={styles.cardRow}>
                        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Seuil d'alerte :</Text>
                        <Text style={[styles.cardValue, { color: colors.text }]}>
                          {stock.seuil_alerte} {stock.unite}
                        </Text>
                      </View>
                    )}
                    {pourcentage !== null && stock.seuil_alerte !== undefined && stock.seuil_alerte !== null && (
                      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View
                          style={[styles.progressFill, {
                            width: `${Math.min(100, pourcentage)}%`,
                            backgroundColor: stock.alerte_active ? colors.error : colors.primary,
                          }]}
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary + '12' }]}
                      onPress={() => {
                        setSelectedStock(stock);
                        setShowMovementModal(true);
                      }}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.text }]}>Mouvement</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary + '12' }]}
                      onPress={() => {
                        setSelectedStock(stock);
                        setIsEditing(true);
                        setShowAlimentModal(true);
                      }}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.text }]}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                      onPress={() => handleDelete(stock)}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.error }]}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
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
          displayedStocks.length < stocks.length ? (
            <LoadingSpinner message="Chargement..." />
          ) : null
        }
      />

      <StockAlimentFormModal
        visible={showAlimentModal}
        onClose={() => setShowAlimentModal(false)}
        onSuccess={() => {
          setShowAlimentModal(false);
          if (projetActif) {
            dispatch(loadStocks(projetActif.id));
          }
        }}
        projetId={projetActif.id}
        aliment={isEditing ? selectedStock : null}
        isEditing={isEditing}
      />

      {selectedStock && (
        <StockMovementFormModal
          visible={showMovementModal}
          onClose={() => setShowMovementModal(false)}
          onSuccess={() => {
            setShowMovementModal(false);
            if (projetActif) {
              dispatch(loadStocks(projetActif.id));
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
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  summaryCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg + 10,
    marginBottom: SPACING.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
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
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
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
  historyContainer: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  historyHeader: {
    marginBottom: SPACING.md,
  },
  historyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  historySubtitle: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
  historyList: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  historyItem: {
    marginBottom: SPACING.lg,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  historyType: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  historyQuantity: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  historyNote: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
  loadMoreButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  loadMoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});


