/**
 * Écran de détail complet d'un sujet (animal) avec pesées
 * Affiche les métriques, le graphique d'évolution et l'historique des pesées
 * Mode individuel uniquement (pour le mode bande, utiliser BatchWeighingDetailsModal)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import StandardHeader from '../../components/StandardHeader';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAnimalPeseeDetail } from '../../hooks/pesees/useAnimalPeseeDetail';
import WeightEvolutionChart from '../../components/WeightEvolutionChart';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SCREENS } from '../../navigation/types';
import ProductionPeseeFormModal from '../../components/ProductionPeseeFormModal';

type RouteParams = {
  animalId: string;
};

export default function SujetPeseeDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { animalId } = route.params || {};

  const { data: details, loading, error, refetch } = useAnimalPeseeDetail({
    animalId,
    enabled: !!animalId,
  });

  const [showPeseeModal, setShowPeseeModal] = React.useState(false);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <StandardHeader
          icon="paw"
          title="Détails de l'animal"
          subtitle="Chargement..."
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des détails...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !details) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <StandardHeader
          icon="paw"
          title="Détails de l'animal"
          subtitle="Erreur"
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || 'Impossible de charger les détails'}
          </Text>
          <Button
            title="Réessayer"
            onPress={() => refetch()}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { animal, pesees, metriques } = details;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.headerWrapper}>
        <StandardHeader
          icon="paw"
          title={animal.code || animal.id}
          subtitle="Détails des pesées"
        />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Informations générales */}
        <Card elevation="medium" padding="large" style={styles.card}>
          <View style={styles.animalHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="paw" size={32} color={colors.primary} />
            </View>
            <View style={styles.animalInfo}>
              <Text style={[styles.animalCode, { color: colors.text }]}>
                {animal.code || animal.id}
              </Text>
              {animal.nom && (
                <Text style={[styles.animalName, { color: colors.textSecondary }]}>
                  {animal.nom}
                </Text>
              )}
              <View style={styles.animalDetails}>
                {animal.race && (
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {animal.race}
                  </Text>
                )}
                {animal.sexe && (
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    • {animal.sexe}
                  </Text>
                )}
                {animal.date_naissance && (
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    • {format(new Date(animal.date_naissance), 'dd MMM yyyy', { locale: fr })}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Métriques */}
        <Card elevation="medium" padding="large" style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Métriques</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Poids actuel</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                {metriques.poids_actuel.toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Poids initial</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {metriques.poids_initial.toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Gain total</Text>
              <Text style={[styles.metricValue, { color: colors.success }]}>
                {metriques.gain_total > 0 ? '+' : ''}
                {metriques.gain_total.toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>GMQ moyen</Text>
              <Text style={[styles.metricValue, { color: colors.warning }]}>
                {metriques.gmq_moyen.toFixed(0)} g/j
              </Text>
            </View>

            {metriques.objectif_poids && (
              <View style={styles.metricBox}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Objectif poids</Text>
                <Text style={[styles.metricValue, { color: colors.info || colors.primary }]}>
                  {metriques.objectif_poids.toFixed(1)} kg
                </Text>
              </View>
            )}

            {metriques.progression_objectif !== null && (
              <View style={styles.metricBox}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Progression</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {metriques.progression_objectif.toFixed(0)}%
                </Text>
              </View>
            )}
          </View>

          {metriques.en_retard && (
            <View style={[styles.warningBox, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={[styles.warningText, { color: colors.error }]}>
                Pesée en retard
              </Text>
            </View>
          )}
        </Card>

        {/* Graphique d'évolution */}
        {pesees.length > 0 && (
          <Card elevation="medium" padding="large" style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Évolution du poids</Text>
            <WeightEvolutionChart pesees={pesees} animalName={animal.code || animal.id} />
          </Card>
        )}

        {/* Historique des pesées */}
        <Card elevation="medium" padding="large" style={styles.card}>
          <View style={styles.historyHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Historique des pesées ({pesees.length})
            </Text>
          </View>

          {pesees.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="scale-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune pesée enregistrée
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Ajoutez une pesée pour commencer le suivi
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {pesees
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((pesee, index) => (
                  <View
                    key={pesee.id || index}
                    style={[
                      styles.historyItem,
                      index < pesees.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.historyItemLeft}>
                      <View style={[styles.historyDateBox, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.historyDate, { color: colors.primary }]}>
                          {format(new Date(pesee.date), 'dd', { locale: fr })}
                        </Text>
                        <Text style={[styles.historyMonth, { color: colors.primary }]}>
                          {format(new Date(pesee.date), 'MMM', { locale: fr })}
                        </Text>
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={[styles.historyYear, { color: colors.textSecondary }]}>
                          {format(new Date(pesee.date), 'yyyy', { locale: fr })}
                        </Text>
                        {pesee.gmq !== undefined && pesee.gmq !== null && (
                          <Text style={[styles.historyGmq, { color: colors.warning }]}>
                            GMQ: {pesee.gmq.toFixed(0)} g/j
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.historyItemRight}>
                      <Text style={[styles.historyWeight, { color: colors.text }]}>
                        {pesee.poids_kg.toFixed(1)} kg
                      </Text>
                      {pesee.commentaire && (
                        <Text style={[styles.historyComment, { color: colors.textSecondary }]} numberOfLines={2}>
                          {pesee.commentaire}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
            </View>
          )}
        </Card>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Nouvelle pesée"
            variant="primary"
            onPress={() => setShowPeseeModal(true)}
            icon={<Ionicons name="add-circle" size={20} color="#fff" />}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>

      {/* Modal de nouvelle pesée */}
      <ProductionPeseeFormModal
        visible={showPeseeModal}
        animalId={animalId}
        onClose={() => {
          setShowPeseeModal(false);
          refetch();
        }}
      />
    </SafeAreaView>
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
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.sm,
  },
  headerWrapper: {
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.lg,
    zIndex: 10,
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  animalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalInfo: {
    flex: 1,
  },
  animalCode: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  animalName: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs / 2,
  },
  animalDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  historyHeader: {
    marginBottom: SPACING.md,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  historyList: {
    gap: 0,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  historyDateBox: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDate: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  historyMonth: {
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
  },
  historyInfo: {
    flex: 1,
  },
  historyYear: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs / 2,
  },
  historyGmq: {
    fontSize: FONT_SIZES.xs,
  },
  historyItemRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  historyWeight: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  historyComment: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'right',
    maxWidth: 150,
  },
  actionsContainer: {
    marginTop: SPACING.md,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
});

