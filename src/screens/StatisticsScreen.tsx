/**
 * Écran Statistiques pour les vétérinaires
 * Affiche les statistiques détaillées : clients actifs, consultations, alertes sanitaires
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';
import { useRole } from '../contexts/RoleContext';
import { useVetData } from '../hooks/useVetData';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { SCREENS } from '../navigation/types';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';
import type { VisiteVeterinaire } from '../types/sante';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;
const CARD_WIDTH = IS_TABLET ? (SCREEN_WIDTH - SPACING.xl * 3) / 2 : SCREEN_WIDTH - SPACING.xl * 2;

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { currentUser } = useRole();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const {
    todayConsultations,
    upcomingConsultations,
    clientFarms,
    healthAlerts,
    loading,
    error,
    refresh,
  } = useVetData(currentUser?.id);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalConsultations = todayConsultations.length + upcomingConsultations.length;
    const consultationsThisMonth = todayConsultations.length; // Approximatif, peut être amélioré
    return {
      activeClients: clientFarms.length,
      totalConsultations,
      consultationsThisMonth,
      healthAlertsCount: healthAlerts.length,
    };
  }, [clientFarms.length, todayConsultations.length, upcomingConsultations.length, healthAlerts.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StandardHeader
          icon="stats-chart-outline"
          title="Statistiques"
          subtitle="Analysez vos données et performances"
        />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StandardHeader
        icon="stats-chart-outline"
        title="Statistiques"
        subtitle="Analysez vos données et performances"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Grille de statistiques principales */}
        <View style={styles.statsGrid}>
          {/* Carte 1: Clients actifs */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface, width: CARD_WIDTH }]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="people" size={32} color={colors.success} />
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.MY_CLIENTS as never)}
                style={styles.seeAllButton}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.activeClients}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Clients actifs
            </Text>
            {clientFarms.length > 0 && (
              <View style={styles.statTrend}>
                <Ionicons name="trending-up" size={16} color={colors.success} />
                <Text style={[styles.statTrendText, { color: colors.success }]}>
                  {clientFarms.length} ferme{clientFarms.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </Card>

          {/* Carte 2: Consultations */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface, width: CARD_WIDTH }]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="medical" size={32} color={colors.primary} />
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.CONSULTATIONS as never)}
                style={styles.seeAllButton}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalConsultations}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Consultations
            </Text>
            <View style={styles.statDetails}>
              <Text style={[styles.statDetailText, { color: colors.textSecondary }]}>
                {todayConsultations.length} aujourd'hui
              </Text>
              <Text style={[styles.statDetailText, { color: colors.textSecondary }]}>
                {upcomingConsultations.length} à venir
              </Text>
            </View>
          </Card>
        </View>

        {/* Carte 3: Mes clients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes clients</Text>
            {clientFarms.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.MY_CLIENTS as never)}
                style={styles.seeAllButton}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {loading ? (
            <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <LoadingSpinner size="small" />
            </Card>
          ) : clientFarms.length === 0 ? (
            <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <EmptyState
                icon="people-outline"
                title="Aucun client"
                message="Vous n'avez pas encore de clients"
                compact
              />
            </Card>
          ) : (
            <View style={styles.clientsGrid}>
              {clientFarms.map((client) => (
                <ClientCard key={client.farmId} client={client} colors={colors} />
              ))}
            </View>
          )}
        </View>

        {/* Carte 4: Alertes sanitaires */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Alertes sanitaires</Text>
            {healthAlerts.length > 0 && (
              <View style={[styles.alertBadge, { backgroundColor: colors.error }]}>
                <Text style={styles.alertBadgeText}>{healthAlerts.length}</Text>
              </View>
            )}
          </View>
          {loading ? (
            <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <LoadingSpinner size="small" />
            </Card>
          ) : healthAlerts.length === 0 ? (
            <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <EmptyState
                icon="checkmark-circle-outline"
                title="Aucune alerte"
                message="Tout est en ordre"
                compact
              />
            </Card>
          ) : (
            <View style={styles.alertsList}>
              {healthAlerts.map((alert, index) => (
                <AlertCard key={`${alert.farmId}-${index}`} alert={alert} colors={colors} />
              ))}
            </View>
          )}
        </View>

        {/* Section Consultations du jour (optionnel, peut être ajouté si nécessaire) */}
        {todayConsultations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Consultations d'aujourd'hui
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.CONSULTATIONS as never)}
                style={styles.seeAllButton}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.consultationsList}>
              {todayConsultations.slice(0, 5).map((consultation) => (
                <ConsultationCard
                  key={consultation.id}
                  consultation={consultation}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <ChatAgentFAB />
    </SafeAreaView>
  );
}

// Composant Card pour les clients
const ClientCard: React.FC<{
  client: {
    farmId: string;
    farmName: string;
    since: string;
    lastConsultation?: string;
    consultationCount: number;
  };
  colors: any;
}> = ({ client, colors }) => {
  return (
    <Card
      style={[
        componentStyles.clientCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={componentStyles.clientHeader}>
        <View style={[componentStyles.clientIconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="business" size={24} color={colors.primary} />
        </View>
        <View style={componentStyles.clientInfo}>
          <Text style={[componentStyles.clientName, { color: colors.text }]} numberOfLines={1}>
            {client.farmName}
          </Text>
          <Text style={[componentStyles.clientStats, { color: colors.textSecondary }]}>
            {client.consultationCount} consultation{client.consultationCount > 1 ? 's' : ''}
          </Text>
          {client.lastConsultation && (
            <Text style={[componentStyles.clientLastVisit, { color: colors.textSecondary }]}>
              Dernière visite: {format(new Date(client.lastConsultation), 'd MMM yyyy', { locale: fr })}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
};

// Composant Card pour les consultations
const ConsultationCard: React.FC<{ consultation: VisiteVeterinaire; colors: any }> = ({
  consultation,
  colors,
}) => {
  return (
    <Card
      style={[
        componentStyles.consultationCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={componentStyles.consultationHeader}>
        <View style={[componentStyles.consultationIconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
        </View>
        <View style={componentStyles.consultationInfo}>
          <Text style={[componentStyles.consultationTime, { color: colors.textSecondary }]}>
            {format(new Date(consultation.date_visite), 'HH:mm', { locale: fr })}
          </Text>
          <Text style={[componentStyles.consultationMotif, { color: colors.text }]} numberOfLines={2}>
            {consultation.motif}
          </Text>
          {consultation.diagnostic && (
            <Text
              style={[componentStyles.consultationDiagnostic, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {consultation.diagnostic}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
};

// Composant Card pour les alertes
const AlertCard: React.FC<{
  alert: {
    farmId: string;
    farmName: string;
    alertType: string;
    message: string;
    severity: string;
  };
  colors: any;
}> = ({ alert, colors }) => {
  const severityColors = {
    low: colors.info,
    medium: colors.warning,
    high: colors.error,
  };

  const alertIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    disease: 'alert-circle',
    vaccination: 'medical',
    treatment: 'flask',
  };

  return (
    <Card
      style={[
        componentStyles.alertCard,
        {
          backgroundColor: colors.surface,
          borderLeftColor: severityColors[alert.severity as keyof typeof severityColors] || colors.error,
        },
      ]}
    >
      <View style={componentStyles.alertHeader}>
        <Ionicons
          name={alertIcons[alert.alertType] || 'alert'}
          size={20}
          color={severityColors[alert.severity as keyof typeof severityColors] || colors.error}
        />
        <View style={componentStyles.alertInfo}>
          <Text style={[componentStyles.alertFarm, { color: colors.text }]} numberOfLines={1}>
            {alert.farmName}
          </Text>
          <Text style={[componentStyles.alertMessage, { color: colors.textSecondary }]} numberOfLines={2}>
            {alert.message}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 120, // Espace supplémentaire pour le FAB (56px) et la barre de navigation (85px)
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    justifyContent: 'space-between',
  },
  statCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    minHeight: 140,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  statDetails: {
    marginTop: SPACING.xs,
    gap: SPACING.xs / 2,
  },
  statDetailText: {
    fontSize: FONT_SIZES.sm,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
    marginTop: SPACING.xs,
  },
  statTrendText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  section: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  sectionCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 100,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  clientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  consultationsList: {
    gap: SPACING.sm,
  },
  alertsList: {
    gap: SPACING.sm,
  },
  alertBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

const componentStyles = StyleSheet.create({
  clientCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    width: IS_TABLET ? CARD_WIDTH : '100%',
    marginBottom: SPACING.sm,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  clientIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs / 2,
  },
  clientStats: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs / 2,
  },
  clientLastVisit: {
    fontSize: FONT_SIZES.xs,
  },
  consultationCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  consultationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultationInfo: {
    flex: 1,
  },
  consultationTime: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs / 2,
  },
  consultationMotif: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs / 2,
  },
  consultationDiagnostic: {
    fontSize: FONT_SIZES.sm,
  },
  alertCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: SPACING.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  alertInfo: {
    flex: 1,
  },
  alertFarm: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs / 2,
  },
  alertMessage: {
    fontSize: FONT_SIZES.sm,
  },
});
