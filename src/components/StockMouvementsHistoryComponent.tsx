/**
 * Composant pour afficher l'historique complet des mouvements de stock
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadStocks, loadMouvementsParAliment } from '../store/slices/stocksSlice';
import type { StockAliment, StockMouvement } from '../types/nutrition';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import StockLevelChart from './StockLevelChart';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';

const ITEMS_PER_PAGE = 50;

export default function StockMouvementsHistoryComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });
  const { stocks, mouvementsParAliment, loading } = useAppSelector((state) => state.stocks);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'tous' | 'entree' | 'sortie' | 'ajustement'>('tous');
  const [filterAliment, setFilterAliment] = useState<string | null>(null);
  const [displayedMouvements, setDisplayedMouvements] = useState<StockMouvement[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Utiliser useRef pour tracker les chargements et éviter les boucles
  const aChargeRef = useRef<string | null>(null);
  const stocksChargesRef = useRef<Set<string>>(new Set());

  // Charger les stocks quand l'écran est en focus (une seule fois par projet)
  useFocusEffect(
    React.useCallback(() => {
      if (!projetActif) {
        aChargeRef.current = null;
        stocksChargesRef.current.clear();
        return;
      }

      // Charger les stocks uniquement si le projet a changé
      if (aChargeRef.current !== projetActif.id) {
        aChargeRef.current = projetActif.id;
        stocksChargesRef.current.clear(); // Réinitialiser pour le nouveau projet
        dispatch(loadStocks(projetActif.id));
      }
    }, [dispatch, projetActif?.id])
  );

  // ✅ Mémoïser les IDs pour éviter les boucles infinies
  const stocksIds = React.useMemo(
    () =>
      Array.isArray(stocks)
        ? stocks
            .map((s) => s.id)
            .sort()
            .join(',')
        : '',
    [stocks]
  );

  const mouvementsKeys = React.useMemo(
    () => Object.keys(mouvementsParAliment).sort().join(','),
    [mouvementsParAliment]
  );

  // Charger les mouvements pour les stocks qui n'ont pas encore leurs mouvements chargés
  useEffect(() => {
    if (!projetActif || !Array.isArray(stocks)) return;

    // Charger uniquement si on est sur le bon projet
    if (aChargeRef.current !== projetActif.id) return;

    // Charger les mouvements pour les stocks qui n'ont pas encore leurs mouvements chargés
    // Limiter à 10 stocks à la fois pour éviter de surcharger
    const stocksSansMouvements = stocks
      .filter((stock) => !mouvementsParAliment[stock.id] && !stocksChargesRef.current.has(stock.id))
      .slice(0, 10);

    stocksSansMouvements.forEach((stock) => {
      stocksChargesRef.current.add(stock.id);
      dispatch(loadMouvementsParAliment({ alimentId: stock.id }));
    });
  }, [dispatch, projetActif?.id, stocksIds, mouvementsKeys, stocks, mouvementsParAliment]);

  // Récupérer tous les mouvements de tous les aliments
  const tousLesMouvements = useMemo(() => {
    const mouvements: StockMouvement[] = [];
    stocks.forEach((stock) => {
      const mouvementsStock = mouvementsParAliment[stock.id] || [];
      mouvements.push(...mouvementsStock);
    });
    // Trier par date décroissante (plus récent en premier)
    return mouvements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stocks, mouvementsParAliment]);

  // Filtrer les mouvements
  const mouvementsFiltres = useMemo(() => {
    let filtres = [...tousLesMouvements];

    // Filtrer par type
    if (filterType !== 'tous') {
      filtres = filtres.filter((m) => m.type === filterType);
    }

    // Filtrer par aliment
    if (filterAliment) {
      filtres = filtres.filter((m) => m.aliment_id === filterAliment);
    }

    // Filtrer par recherche (nom d'aliment)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtres = filtres.filter((m) => {
        const aliment = stocks.find((s) => s.id === m.aliment_id);
        return aliment?.nom.toLowerCase().includes(query);
      });
    }

    return filtres;
  }, [tousLesMouvements, filterType, filterAliment, searchQuery, stocks]);

  // Pagination: charger les premiers mouvements
  useEffect(() => {
    const initial = mouvementsFiltres.slice(0, ITEMS_PER_PAGE);
    setDisplayedMouvements(initial);
    setPage(1);
  }, [mouvementsFiltres.length, filterType, filterAliment, searchQuery]);

  // Charger plus de mouvements
  const loadMore = useCallback(() => {
    if (displayedMouvements.length >= mouvementsFiltres.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = mouvementsFiltres.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedMouvements((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedMouvements.length, mouvementsFiltres]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'entree':
        return 'Entrée';
      case 'sortie':
        return 'Sortie';
      case 'ajustement':
        return 'Ajustement';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'entree':
        return colors.success;
      case 'sortie':
        return colors.error;
      case 'ajustement':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  // Fonction pour rafraîchir les données (pull-to-refresh)
  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      await dispatch(loadStocks(projetActif.id)).unwrap();
      // Recharger les mouvements pour tous les stocks
      if (Array.isArray(stocks)) {
        stocks.forEach((stock) => {
          dispatch(loadMouvementsParAliment({ alimentId: stock.id }));
        });
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, projetActif?.id, stocks]);

  if (!projetActif) {
    return (
      <EmptyState
        title="Aucun projet actif"
        message="Créez ou sélectionnez un projet pour voir l'historique des mouvements."
      />
    );
  }

  if (loading && tousLesMouvements.length === 0) {
    return <LoadingSpinner message="Chargement de l'historique..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Filtres - Déplacés en haut */}
        <View
          style={[
            styles.filtersContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Recherche */}
          <TextInput
            style={[
              styles.searchInput,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text,
              },
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un aliment..."
            placeholderTextColor={colors.textSecondary}
          />

          {/* Filtre par type */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Type :</Text>
            <View style={styles.filterButtons}>
              {(['tous', 'entree', 'sortie', 'ajustement'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: filterType === type ? colors.primary : colors.background,
                      borderColor: filterType === type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilterType(type)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      {
                        color: filterType === type ? colors.textOnPrimary : colors.text,
                        fontWeight: filterType === type ? '600' : 'normal',
                      },
                    ]}
                  >
                    {type === 'tous' ? 'Tous' : getTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Filtre par aliment */}
          {stocks.length > 0 && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Aliment :</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: filterAliment === null ? colors.primary : colors.background,
                      borderColor: filterAliment === null ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilterAliment(null)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      {
                        color: filterAliment === null ? colors.textOnPrimary : colors.text,
                        fontWeight: filterAliment === null ? '600' : 'normal',
                      },
                    ]}
                  >
                    Tous
                  </Text>
                </TouchableOpacity>
                {stocks.slice(0, 5).map((stock) => (
                  <TouchableOpacity
                    key={stock.id}
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor:
                          filterAliment === stock.id ? colors.primary : colors.background,
                        borderColor: filterAliment === stock.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setFilterAliment(stock.id)}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        {
                          color: filterAliment === stock.id ? colors.textOnPrimary : colors.text,
                          fontWeight: filterAliment === stock.id ? '600' : 'normal',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {stock.nom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Graphe de niveau de stock par aliment */}
        {stocks.length > 0 && (
          <StockLevelChart stocks={stocks} mouvementsParAliment={mouvementsParAliment} />
        )}

        {/* Statistiques */}
        <View
          style={[
            styles.statsContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {mouvementsFiltres.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Mouvement{mouvementsFiltres.length > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {mouvementsFiltres.filter((m) => m.type === 'entree').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Entrées</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.error }]}>
              {mouvementsFiltres.filter((m) => m.type === 'sortie').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sorties</Text>
          </View>
        </View>

        {/* Liste des mouvements */}
        {mouvementsFiltres.length === 0 ? (
          <EmptyState
            title="Aucun mouvement"
            message={
              searchQuery || filterType !== 'tous' || filterAliment
                ? 'Aucun mouvement ne correspond aux filtres sélectionnés.'
                : 'Aucun mouvement enregistré pour le moment.'
            }
          />
        ) : (
          <View>
            {displayedMouvements.map((mouvement) => {
              const aliment = stocks.find((s) => s.id === mouvement.aliment_id);
              const alimentNom = aliment?.nom || 'Aliment inconnu';
              const typeColor = getTypeColor(mouvement.type);

              return (
                <View
                  key={mouvement.id}
                  style={[
                    styles.mouvementCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.mouvementHeader}>
                    <View style={styles.mouvementHeaderLeft}>
                      <Text style={[styles.mouvementDate, { color: colors.textSecondary }]}>
                        {new Date(mouvement.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Text style={[styles.mouvementAliment, { color: colors.primary }]}>
                        {alimentNom}
                      </Text>
                    </View>
                    <View
                      style={[styles.mouvementTypeBadge, { backgroundColor: typeColor + '20' }]}
                    >
                      <Text style={[styles.mouvementTypeText, { color: typeColor }]}>
                        {getTypeLabel(mouvement.type)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.mouvementContent}>
                    <Text style={[styles.mouvementQuantity, { color: colors.text }]}>
                      {mouvement.type === 'sortie' ? '-' : mouvement.type === 'entree' ? '+' : '='}
                      {mouvement.quantite} {mouvement.unite}
                    </Text>
                    {mouvement.origine && (
                      <Text style={[styles.mouvementNote, { color: colors.textSecondary }]}>
                        Origine : {mouvement.origine}
                      </Text>
                    )}
                    {mouvement.commentaire && (
                      <Text style={[styles.mouvementNote, { color: colors.textSecondary }]}>
                        {mouvement.commentaire}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
            {displayedMouvements.length < mouvementsFiltres.length && (
              <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: colors.primary + '20' }]}
                onPress={loadMore}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  Charger plus ({mouvementsFiltres.length - displayedMouvements.length} restants)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
  filtersContainer: {
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  filterRow: {
    marginBottom: SPACING.sm,
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
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderBottomWidth: 1,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  divider: {
    width: 1,
    marginHorizontal: SPACING.md,
  },
  listContainer: {
    padding: SPACING.md,
  },
  loadMoreButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  loadMoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  mouvementCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  mouvementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  mouvementHeaderLeft: {
    flex: 1,
  },
  mouvementDate: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  mouvementAliment: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  mouvementTypeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  mouvementTypeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  mouvementContent: {
    marginTop: SPACING.xs,
  },
  mouvementQuantity: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  mouvementNote: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
});
