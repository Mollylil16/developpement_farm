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
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadStocks, loadMouvementsParAliment } from '../store/slices/stocksSlice';
import { StockAliment, StockMouvement } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO, startOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const ITEMS_PER_PAGE = 50;

export default function StockMouvementsHistoryComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { stocks, mouvementsParAliment, loading } = useAppSelector((state) => state.stocks);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'tous' | 'entree' | 'sortie' | 'ajustement'>('tous');
  const [filterAliment, setFilterAliment] = useState<string | null>(null);
  const [displayedMouvements, setDisplayedMouvements] = useState<StockMouvement[]>([]);
  const [page, setPage] = useState(1);
  const [showChart, setShowChart] = useState(true);
  const [showStockChart, setShowStockChart] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<7 | 14 | 30>(30);

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
  const stocksIds = React.useMemo(() => 
    Array.isArray(stocks) ? stocks.map(s => s.id).sort().join(',') : '', 
    [stocks]
  );
  
  const mouvementsKeys = React.useMemo(() => 
    Object.keys(mouvementsParAliment).sort().join(','), 
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
      .filter((stock) => 
        !mouvementsParAliment[stock.id] && 
        !stocksChargesRef.current.has(stock.id)
      )
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

  // Préparer les données pour le graphe
  const chartData = useMemo(() => {
    if (mouvementsFiltres.length === 0) return null;

    // Créer un tableau des N derniers jours
    const today = startOfDay(new Date());
    const dates: Date[] = [];
    for (let i = chartPeriod - 1; i >= 0; i--) {
      dates.push(subDays(today, i));
    }

    // Initialiser les totaux par jour
    const entreesParJour: { [key: string]: number } = {};
    const sortiesParJour: { [key: string]: number } = {};

    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      entreesParJour[dateStr] = 0;
      sortiesParJour[dateStr] = 0;
    });

    // Agréger les mouvements par jour
    mouvementsFiltres.forEach(mouvement => {
      const dateStr = format(startOfDay(parseISO(mouvement.date)), 'yyyy-MM-dd');
      
      if (entreesParJour[dateStr] !== undefined) {
        if (mouvement.type === 'entree') {
          entreesParJour[dateStr] += mouvement.quantite;
        } else if (mouvement.type === 'sortie') {
          sortiesParJour[dateStr] += mouvement.quantite;
        }
      }
    });

    // Préparer les labels (dates) et les données
    const labels = dates.map(date => {
      if (chartPeriod === 7) {
        return format(date, 'EEE', { locale: fr }).substring(0, 3);
      } else if (chartPeriod === 14) {
        return format(date, 'dd/MM');
      } else {
        return format(date, 'dd');
      }
    });

    const entreesData = dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return entreesParJour[dateStr] || 0;
    });

    const sortiesData = dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return sortiesParJour[dateStr] || 0;
    });

    return {
      labels,
      datasets: [
        {
          data: entreesData,
          color: (opacity = 1) => colors.success,
          strokeWidth: 2,
        },
        {
          data: sortiesData,
          color: (opacity = 1) => colors.error,
          strokeWidth: 2,
        },
      ],
      legend: ['Entrées', 'Sorties'],
    };
  }, [mouvementsFiltres, chartPeriod, colors]);

  // Préparer les données pour le graphe du niveau de stock
  const stockLevelChartData = useMemo(() => {
    if (mouvementsFiltres.length === 0) return null;

    // Créer un tableau des N derniers jours
    const today = startOfDay(new Date());
    const dates: Date[] = [];
    for (let i = chartPeriod - 1; i >= 0; i--) {
      dates.push(subDays(today, i));
    }

    // Trier les mouvements par date croissante pour calculer le niveau de stock
    const mouvementsTriesChronologique = [...mouvementsFiltres].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculer le stock initial (remonter dans le temps)
    let stockInitial = 0;
    if (filterAliment && stocks.length > 0) {
      const alimentSelectionne = stocks.find(s => s.id === filterAliment);
      if (alimentSelectionne) {
        stockInitial = alimentSelectionne.quantite_actuelle;
        // Soustraire tous les mouvements après la période
        mouvementsTriesChronologique.forEach(mouvement => {
          const dateStr = format(startOfDay(parseISO(mouvement.date)), 'yyyy-MM-dd');
          const datePeriode = format(dates[0], 'yyyy-MM-dd');
          if (dateStr >= datePeriode) {
            if (mouvement.type === 'entree') {
              stockInitial -= mouvement.quantite;
            } else if (mouvement.type === 'sortie') {
              stockInitial += mouvement.quantite;
            }
          }
        });
      }
    }

    // Calculer le niveau de stock pour chaque jour
    const niveauxStock: { [key: string]: number } = {};
    let stockActuel = stockInitial;

    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      niveauxStock[dateStr] = stockActuel;

      // Appliquer les mouvements de ce jour
      mouvementsTriesChronologique.forEach(mouvement => {
        const mouvementDateStr = format(startOfDay(parseISO(mouvement.date)), 'yyyy-MM-dd');
        if (mouvementDateStr === dateStr) {
          if (mouvement.type === 'entree') {
            stockActuel += mouvement.quantite;
          } else if (mouvement.type === 'sortie') {
            stockActuel -= mouvement.quantite;
          } else if (mouvement.type === 'ajustement') {
            // Pour un ajustement, on met directement la quantité
            stockActuel = mouvement.quantite;
          }
        }
      });
    });

    // Préparer les labels (dates) et les données
    const labels = dates.map(date => {
      if (chartPeriod === 7) {
        return format(date, 'EEE', { locale: fr }).substring(0, 3);
      } else if (chartPeriod === 14) {
        return format(date, 'dd/MM');
      } else {
        return format(date, 'dd');
      }
    });

    const stockData = dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return Math.max(0, niveauxStock[dateStr] || 0);
    });

    // Obtenir le seuil d'alerte de l'aliment sélectionné
    const alimentSelectionne = stocks.find(s => s.id === filterAliment);
    const seuilAlerte = alimentSelectionne?.seuil_alerte;

    // Créer un dataset pour la ligne de seuil (si défini)
    const datasets: any[] = [
      {
        data: stockData,
        color: (opacity = 1) => colors.primary,
        strokeWidth: 3,
      },
    ];

    // Ajouter la ligne de seuil critique si défini
    if (seuilAlerte !== undefined && seuilAlerte !== null && seuilAlerte > 0) {
      datasets.push({
        data: dates.map(() => seuilAlerte),
        color: (opacity = 1) => colors.error,
        strokeWidth: 2,
        withDots: false,
        strokeDashArray: [5, 5], // Ligne pointillée
      });
    }

    return {
      labels,
      datasets,
      legend: seuilAlerte !== undefined && seuilAlerte !== null && seuilAlerte > 0 
        ? ['Niveau de stock', 'Seuil critique'] 
        : ['Niveau de stock'],
    };
  }, [mouvementsFiltres, chartPeriod, colors, filterAliment, stocks]);

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
      {/* Graphe d'évolution */}
      {chartData && tousLesMouvements.length > 0 && (
        <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <TouchableOpacity
              style={styles.chartToggle}
              onPress={() => setShowChart(!showChart)}
            >
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                📊 Évolution des mouvements
              </Text>
              <Text style={[styles.chartToggleIcon, { color: colors.primary }]}>
                {showChart ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
          </View>

          {showChart && (
            <>
              {/* Sélecteur de période */}
              <View style={styles.periodSelector}>
                {([7, 14, 30] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      {
                        backgroundColor: chartPeriod === period ? colors.primary : colors.background,
                        borderColor: chartPeriod === period ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setChartPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        { color: chartPeriod === period ? colors.textOnPrimary : colors.text },
                      ]}
                    >
                      {period}j
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Graphe */}
              <LineChart
                data={chartData}
                width={Dimensions.get('window').width - SPACING.lg * 4 - SPACING.md * 2}
                height={220}
                chartConfig={{
                  backgroundColor: colors.surface,
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => colors.text + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                  labelColor: (opacity = 1) => colors.textSecondary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                  style: {
                    borderRadius: BORDER_RADIUS.lg,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: colors.surface,
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: colors.border,
                    strokeWidth: 1,
                  },
                }}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                fromZero={true}
              />

              {/* Légende */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Entrées</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Sorties</Text>
                </View>
              </View>
            </>
          )}
        </View>
      )}

      {/* Graphe du niveau de stock */}
      {stockLevelChartData && filterAliment && (
        <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <TouchableOpacity
              style={styles.chartToggle}
              onPress={() => setShowStockChart(!showStockChart)}
            >
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                📈 Niveau de stock
              </Text>
              <Text style={[styles.chartToggleIcon, { color: colors.primary }]}>
                {showStockChart ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
          </View>

          {showStockChart && (
            <>
              {/* Graphe */}
              <LineChart
                data={stockLevelChartData}
                width={Dimensions.get('window').width - SPACING.lg * 4 - SPACING.md * 2}
                height={220}
                chartConfig={{
                  backgroundColor: colors.surface,
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 1,
                  color: (opacity = 1) => colors.text + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                  labelColor: (opacity = 1) => colors.textSecondary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
                  style: {
                    borderRadius: BORDER_RADIUS.lg,
                  },
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: colors.surface,
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: colors.border,
                    strokeWidth: 1,
                  },
                  fillShadowGradient: colors.primary,
                  fillShadowGradientOpacity: 0.3,
                }}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                fromZero={true}
                withShadow={false}
              />

              {/* Légende */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Niveau de stock</Text>
                </View>
                {(() => {
                  const alimentSelectionne = stocks.find(s => s.id === filterAliment);
                  const seuilAlerte = alimentSelectionne?.seuil_alerte;
                  return seuilAlerte !== undefined && seuilAlerte !== null && seuilAlerte > 0 ? (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDotDashed, { borderColor: colors.error }]} />
                      <Text style={[styles.legendText, { color: colors.text }]}>Seuil critique</Text>
                    </View>
                  ) : null;
                })()}
              </View>

              {/* Info */}
              <View style={[styles.infoBox, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}30` }]}>
                <Text style={[styles.infoText, { color: colors.text }]}>
                  💡 Ce graphe montre l'évolution du niveau de stock pour l'aliment sélectionné
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Message si aucun aliment sélectionné */}
      {!filterAliment && tousLesMouvements.length > 0 && (
        <View style={[styles.infoBox, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30`, marginHorizontal: SPACING.md, marginTop: SPACING.md }]}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            ℹ️ Sélectionnez un aliment spécifique dans les filtres pour voir le graphe du niveau de stock
          </Text>
        </View>
      )}

      {/* Filtres */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Recherche */}
        <TextInput
          style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
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
                      backgroundColor: filterAliment === stock.id ? colors.primary : colors.background,
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

      {/* Statistiques */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{mouvementsFiltres.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mouvement{mouvementsFiltres.length > 1 ? 's' : ''}</Text>
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
          message={searchQuery || filterType !== 'tous' || filterAliment
            ? "Aucun mouvement ne correspond aux filtres sélectionnés."
            : "Aucun mouvement enregistré pour le moment."}
        />
      ) : (
        <FlatList
          data={displayedMouvements}
          keyExtractor={(item) => item.id}
          renderItem={({ item: mouvement }) => {
            const aliment = stocks.find((s) => s.id === mouvement.aliment_id);
            const alimentNom = aliment?.nom || 'Aliment inconnu';
            const typeColor = getTypeColor(mouvement.type);

            return (
              <View style={[styles.mouvementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                  <View style={[styles.mouvementTypeBadge, { backgroundColor: typeColor + '20' }]}>
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
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            displayedMouvements.length < mouvementsFiltres.length ? (
              <LoadingSpinner message="Chargement..." />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartContainer: {
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  chartHeader: {
    marginBottom: SPACING.md,
  },
  chartToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  chartToggleIcon: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendDotDashed: {
    width: 20,
    height: 3,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  infoBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: FONT_SIZES.sm * 1.5,
  },
  filtersContainer: {
    padding: SPACING.md,
    borderBottomWidth: 1,
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
    paddingBottom: SPACING.xxl + 100, // Espace pour la barre de navigation + marge
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

