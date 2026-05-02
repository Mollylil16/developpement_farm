/**
 * Composant liste des mortalités avec statistiques
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControlProps,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  selectAllMortalites,
  selectStatistiquesMortalite,
  selectMortalitesLoading,
} from '../store/selectors/mortalitesSelectors';
import {
  loadMortalitesParProjet,
  loadStatistiquesMortalite,
  deleteMortalite,
} from '../store/slices/mortalitesSlice';
import { loadProductionAnimaux, loadPeseesRecents } from '../store/slices/productionSlice';
import type { Mortalite, CategorieMortalite } from '../types/mortalites';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import MortalitesFormModal from './MortalitesFormModal';
import StatCard from './StatCard';
import { useActionPermissions } from '../hooks/useActionPermissions';
import Card from './Card';
import MortaliteDashboard from './mortalites/MortaliteDashboard';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { useProjetEffectif } from '../hooks/useProjetEffectif';

interface Props {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

const screenWidth = Dimensions.get('window').width;

export default function MortalitesListComponent({ refreshControl }: Props) {
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const mortalites = useAppSelector(selectAllMortalites);
  const statistiques = useAppSelector(selectStatistiquesMortalite);
  const loading = useAppSelector(selectMortalitesLoading);
  const animaux = useAppSelector(selectAllAnimaux);
  
  // Calculer le nombre total d'animaux actifs pour le taux de mortalité
  const totalAnimauxActifs = useMemo(() => {
    if (!projetActif?.id || !Array.isArray(animaux)) return 0;
    return animaux.filter(
      (a) => a.projet_id === projetActif.id && a.statut?.toLowerCase() === 'actif'
    ).length;
  }, [animaux, projetActif?.id]);
  const [selectedMortalite, setSelectedMortalite] = useState<Mortalite | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayedMortalites, setDisplayedMortalites] = useState<Mortalite[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const ITEMS_PER_PAGE = 50;

  // Charger les données au montage et à chaque fois que l'écran est focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [MortalitesListComponent] useFocusEffect déclenché');
      if (projetActif) {
        console.log('📊 Rechargement mortalités et statistiques pour projet:', projetActif.id);
        dispatch(loadMortalitesParProjet(projetActif.id));
        dispatch(loadStatistiquesMortalite(projetActif.id));
      }
    }, [dispatch, projetActif?.id])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    if (!projetActif) return;
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(loadMortalitesParProjet(projetActif.id)).unwrap(),
        dispatch(loadStatistiquesMortalite(projetActif.id)).unwrap(),
      ]);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, projetActif]);

  // Pagination: charger les premières mortalités
  useEffect(() => {
    if (!Array.isArray(mortalites)) {
      setDisplayedMortalites([]);
      return;
    }
    const initial = mortalites.slice(0, ITEMS_PER_PAGE);
    setDisplayedMortalites(initial);
    setPage(1);
  }, [mortalites]);

  // Charger plus de mortalités
  const loadMore = useCallback(() => {
    if (!Array.isArray(mortalites)) return;
    if (displayedMortalites.length >= mortalites.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = mortalites.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedMortalites((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedMortalites.length, mortalites]);

  const handleEdit = (mortalite: Mortalite) => {
    if (!canUpdate('mortalites')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier les mortalités."
      );
      return;
    }
    setSelectedMortalite(mortalite);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    if (!canDelete('mortalites')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de supprimer les mortalités."
      );
      return;
    }
    Alert.alert('Supprimer la mortalité', 'Êtes-vous sûr de vouloir supprimer cette entrée ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await dispatch(deleteMortalite(id));
          if (projetActif) {
            dispatch(loadMortalitesParProjet(projetActif.id));
            dispatch(loadStatistiquesMortalite(projetActif.id));
          }
        },
      },
    ]);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMortalite(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    if (projetActif) {
      dispatch(loadMortalitesParProjet(projetActif.id));
      dispatch(loadStatistiquesMortalite(projetActif.id));
      // Recharger les animaux pour mettre à jour le cheptel si un animal a été mis à mort
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true }));
      // Recharger les pesées récentes pour exclure celles des animaux retirés
      dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getCategorieLabel = (categorie: CategorieMortalite) => {
    switch (categorie) {
      case 'porcelet':
        return 'Porcelet';
      case 'truie':
        return 'Truie';
      case 'verrat':
        return 'Verrat';
      case 'autre':
        return 'Autre';
      default:
        return categorie;
    }
  };

  const getCategorieColor = (categorie: CategorieMortalite) => {
    switch (categorie) {
      case 'porcelet':
        return colors.warning;
      case 'truie':
        return colors.error;
      case 'verrat':
        return colors.error;
      case 'autre':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  // Calculer les statistiques par cause
  const mortalitesParCause = useMemo(() => {
    if (!Array.isArray(mortalites)) return {};
    const parCause: Record<string, number> = {};
    mortalites.forEach((m) => {
      const cause = m.cause || 'Non spécifiée';
      parCause[cause] = (parCause[cause] || 0) + m.nombre_porcs;
    });
    return parCause;
  }, [mortalites]);

  // Données pour le PieChart des causes
  const pieChartDataCauses = useMemo(() => {
    const causes = Object.entries(mortalitesParCause)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 causes

    const colorsPalette = [
      '#FF6B6B', // Rouge
      '#4ECDC4', // Turquoise
      '#FFE66D', // Jaune
      '#95E1D3', // Vert clair
      '#A8E6CF', // Vert menthe
      '#FFA07A', // Saumon
    ];

    return causes.map(([cause, count], index) => ({
      name: cause.length > 15 ? `${cause.substring(0, 15)}...` : cause,
      population: count,
      color: colorsPalette[index % colorsPalette.length],
      legendFontColor: colors.text,
      legendFontSize: 11,
    }));
  }, [mortalitesParCause, colors.text]);

  // Données pour le PieChart des catégories (calculées directement depuis mortalites si pas de stats)
  const pieChartDataCategories = useMemo(() => {
    // Si on a des statistiques, les utiliser
    if (statistiques && statistiques.mortalites_par_categorie) {
      const { mortalites_par_categorie } = statistiques;
      const categories: Array<{ key: CategorieMortalite; label: string; color: string }> = [
        { key: 'porcelet', label: 'Porcelet', color: colors.warning },
        { key: 'truie', label: 'Truie', color: colors.error },
        { key: 'verrat', label: 'Verrat', color: '#FF4444' },
        { key: 'autre', label: 'Autre', color: colors.textSecondary },
      ];

      return categories
        .filter((cat) => mortalites_par_categorie[cat.key] > 0)
        .map((cat) => ({
          name: cat.label,
          population: mortalites_par_categorie[cat.key],
          color: cat.color,
          legendFontColor: colors.text,
          legendFontSize: 11,
        }));
    }

    // Sinon, calculer depuis les mortalites directement
    if (!Array.isArray(mortalites) || mortalites.length === 0) return [];

    const parCategorie: Record<CategorieMortalite, number> = {
      porcelet: 0,
      truie: 0,
      verrat: 0,
      autre: 0,
    };

    mortalites.forEach((m) => {
      const cat = m.categorie || 'autre';
      parCategorie[cat] = (parCategorie[cat] || 0) + m.nombre_porcs;
    });

    const categories: Array<{ key: CategorieMortalite; label: string; color: string }> = [
      { key: 'porcelet', label: 'Porcelet', color: colors.warning },
      { key: 'truie', label: 'Truie', color: colors.error },
      { key: 'verrat', label: 'Verrat', color: '#FF4444' },
      { key: 'autre', label: 'Autre', color: colors.textSecondary },
    ];

    return categories
      .filter((cat) => parCategorie[cat.key] > 0)
      .map((cat) => ({
        name: cat.label,
        population: parCategorie[cat.key],
        color: cat.color,
        legendFontColor: colors.text,
        legendFontSize: 11,
      }));
  }, [statistiques, mortalites, colors]);

  // Données pour le BarChart mensuel
  const barChartData = useMemo(() => {
    if (
      !statistiques ||
      !statistiques.mortalites_par_mois ||
      statistiques.mortalites_par_mois.length === 0
    ) {
      return null;
    }

    const last6Months = statistiques.mortalites_par_mois.slice(-6);
    return {
      labels: last6Months.map((m) => {
        const [year, month] = m.mois.split('-');
        const monthNames = [
          'Jan',
          'Fév',
          'Mar',
          'Avr',
          'Mai',
          'Jun',
          'Jul',
          'Aoû',
          'Sep',
          'Oct',
          'Nov',
          'Déc',
        ];
        return `${monthNames[parseInt(month) - 1]}`;
      }),
      datasets: [
        {
          data: last6Months.map((m) => m.nombre),
        },
      ],
    };
  }, [statistiques]);

  // Configuration des graphiques
  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.surface,
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, // Rouge pour mortalité
      labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
      style: {
        borderRadius: BORDER_RADIUS.md,
      },
    }),
    [colors, isDark]
  );

  if (!projetActif) {
    return (
      <View style={styles.container}>
        <EmptyState title="Aucun projet actif" message="Créez un projet pour commencer" />
      </View>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Chargement des mortalités..." />;
  }

  // Rendre le dashboard des statistiques (design cohérent avec Production > Suivi pesées)
  const renderStatistiques = () => {
    return (
      <MortaliteDashboard
        projetId={projetActif?.id}
        totalAnimaux={totalAnimauxActifs}
      />
    );
  };

  // Rendre les graphiques
  const renderGraphiques = () => {
    const hasData = Array.isArray(mortalites) && mortalites.length > 0;
    const hasChartData =
      (pieChartDataCauses && pieChartDataCauses.length > 0) ||
      (pieChartDataCategories && pieChartDataCategories.length > 0) ||
      barChartData;

    return (
      <View
        style={[
          styles.section,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📈 Graphiques et Statistiques
          </Text>
        </View>

        {!hasData ? (
          <View style={styles.emptySection}>
            <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
              Aucune donnée disponible
            </Text>
            <Text style={[styles.emptySectionSubtext, { color: colors.textTertiary }]}>
              Les graphiques apparaîtront une fois que des mortalités seront enregistrées
            </Text>
          </View>
        ) : !hasChartData ? (
          <View style={styles.emptySection}>
            <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
              Aucun graphique disponible
            </Text>
            <Text style={[styles.emptySectionSubtext, { color: colors.textTertiary }]}>
              Les graphiques nécessitent des données de mortalité avec causes et catégories
            </Text>
          </View>
        ) : (
          <View style={styles.chartsContainer}>
            {/* Graphique PieChart - Causes de mortalité */}
            {pieChartDataCauses && pieChartDataCauses.length > 0 ? (
              <Card elevation="medium" padding="large" style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  📊 Causes de mortalité
                </Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                  Top 5 des causes principales
                </Text>
                <PieChart
                  data={pieChartDataCauses}
                  width={screenWidth - SPACING.xl * 2 - SPACING.lg * 2}
                  height={200}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  hasLegend={true}
                />
                <View style={styles.legendContainer}>
                  {pieChartDataCauses.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>
                        {item.name}: {item.population}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            {/* Graphique PieChart - Catégories */}
            {pieChartDataCategories && pieChartDataCategories.length > 0 ? (
              <Card elevation="medium" padding="large" style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  📊 Répartition par catégorie
                </Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                  Porcelets, Truies, Verrats
                </Text>
                <PieChart
                  data={pieChartDataCategories}
                  width={screenWidth - SPACING.xl * 2 - SPACING.lg * 2}
                  height={200}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  hasLegend={true}
                />
                <View style={styles.legendContainer}>
                  {pieChartDataCategories.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendText, { color: colors.text }]}>
                        {item.name}: {item.population}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            {/* Graphique BarChart - Évolution mensuelle */}
            {barChartData ? (
              <Card elevation="medium" padding="large" style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  📈 Évolution mensuelle
                </Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                  Derniers 6 mois
                </Text>
                <BarChart
                  data={barChartData}
                  width={screenWidth - SPACING.xl * 2 - SPACING.lg * 2}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.barChart}
                  yAxisLabel=""
                  yAxisSuffix=" porcs"
                  showValuesOnTopOfBars
                />
              </Card>
            ) : null}

            {/* Graphique BarChart - Causes détaillées */}
            {pieChartDataCauses && pieChartDataCauses.length > 0 ? (
              <Card elevation="medium" padding="large" style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  📊 Causes détaillées
                </Text>
                <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                  Comparaison par cause
                </Text>
                <BarChart
                  data={{
                    labels: pieChartDataCauses.map((item) =>
                      item.name.length > 10 ? `${item.name.substring(0, 10)}...` : item.name
                    ),
                    datasets: [
                      {
                        data: pieChartDataCauses.map((item) => item.population),
                      },
                    ],
                  }}
                  width={screenWidth - SPACING.xl * 2 - SPACING.lg * 2}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
                  }}
                  style={styles.barChart}
                  yAxisLabel=""
                  yAxisSuffix=" porcs"
                  showValuesOnTopOfBars
                  fromZero
                />
              </Card>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  // Rendre la liste des mortalités
  const renderListeMortalites = () => {
    return (
      <View
        style={[
          styles.section,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Liste des mortalités</Text>
          {canCreate('mortalites') && (
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.btnAjouter, { backgroundColor: colors.primary }]}
              onPress={() => {
                setSelectedMortalite(null);
                setIsEditing(false);
                setModalVisible(true);
              }}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.btnAjouterText}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>

        {!Array.isArray(mortalites) || mortalites.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
              Aucune mortalité enregistrée
            </Text>
            <Text style={[styles.emptySectionSubtext, { color: colors.textTertiary }]}>
              Ajoutez une mortalité pour commencer le suivi
            </Text>
          </View>
        ) : (
          <View>
            {displayedMortalites.map((mortalite) => (
              <View
                key={mortalite.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderLight,
                    marginBottom: SPACING.sm,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.categorieBadge,
                        { backgroundColor: getCategorieColor(mortalite.categorie) },
                      ]}
                    >
                      <Text style={[styles.categorieBadgeText, { color: colors.textOnPrimary }]}>
                        {getCategorieLabel(mortalite.categorie)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.dateText,
                        { marginLeft: SPACING.sm, color: colors.textSecondary },
                      ]}
                    >
                      {formatDate(mortalite.date)}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    {canUpdate('mortalites') && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                        onPress={() => handleEdit(mortalite)}
                      >
                        <Text style={styles.actionButtonText}>✏️</Text>
                      </TouchableOpacity>
                    )}
                    {canDelete('mortalites') && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                        onPress={() => handleDelete(mortalite.id)}
                      >
                        <Text style={styles.actionButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.nombreText, { color: colors.text }]}>
                    {mortalite.nombre_porcs} porc{mortalite.nombre_porcs > 1 ? 's' : ''}
                  </Text>
                  {mortalite.animal_code && (
                    <Text style={[styles.animalCodeText, { color: colors.primary }]}>
                      Sujet: {mortalite.animal_code}
                    </Text>
                  )}
                  {mortalite.cause && (
                    <Text style={[styles.causeText, { color: colors.textSecondary }]}>
                      Cause: {mortalite.cause}
                    </Text>
                  )}
                  {mortalite.notes && (
                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                      {mortalite.notes}
                    </Text>
                  )}
                </View>
              </View>
            ))}
            {Array.isArray(mortalites) && displayedMortalites.length < mortalites.length && (
              <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={loadMore}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Charger plus</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        refreshControl || (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        )
      }
      showsVerticalScrollIndicator={false}
    >
      {renderStatistiques()}
      {renderGraphiques()}
      {renderListeMortalites()}
      <View style={styles.bottomSpacer} />

      {/* Modal de formulaire */}
      <MortalitesFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        mortalite={selectedMortalite}
        isEditing={isEditing}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  // Sections (style similaire à VeterinaireComponent)
  section: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    flex: 1,
  },
  btnAjouter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  btnAjouterText: {
    color: '#FFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptySectionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    marginTop: SPACING.md,
  },
  emptySectionSubtext: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  statsScrollView: {
    marginVertical: SPACING.sm,
  },
  statsScrollContent: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  loadMoreButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  loadMoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorieBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  categorieBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
  },
  cardContent: {
    marginTop: SPACING.xs,
  },
  nombreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.xs / 2,
  },
  animalCodeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs / 2,
  },
  causeText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs / 2,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  chartsContainer: {
    gap: SPACING.md,
  },
  chartCard: {
    marginBottom: SPACING.md,
  },
  chartTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  barChart: {
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  legendContainer: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  iconEmoji: {
    fontSize: 24,
  },
});
