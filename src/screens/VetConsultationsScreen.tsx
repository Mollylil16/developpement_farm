/**
 * Écran "Consultations" pour un projet spécifique
 * Affiche les consultations d'un projet donné pour les vétérinaires
 */

import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useVetData } from '../hooks/useVetData';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import type { VisiteVeterinaire } from '../types/sante';

type RouteParams = {
  VetConsultations: {
    projetId: string;
  };
};

export default function VetConsultationsScreen() {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'VetConsultations'>>();
  const projetId = route.params?.projetId;
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const { todayConsultations, upcomingConsultations, loading, refresh } = useVetData(
    currentUser?.id
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Filtrer les consultations par projet
  const allConsultations = [...todayConsultations, ...upcomingConsultations]
    .filter((consultation) => consultation.projet_id === projetId)
    .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime());

  const filteredConsultations = allConsultations.filter((consultation) => {
    const consultationDate = new Date(consultation.date_visite);
    if (activeTab === 'today') return isToday(consultationDate);
    if (activeTab === 'upcoming') return isFuture(consultationDate);
    return isPast(consultationDate);
  });

  const renderConsultation = ({ item }: { item: VisiteVeterinaire }) => {
    const consultationDate = new Date(item.date_visite);
    const isTodayConsultation = isToday(consultationDate);

    return (
      <Card
        style={[
          styles.consultationCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.consultationHeader}>
          <View
            style={[
              styles.dateIcon,
              {
                backgroundColor: isTodayConsultation
                  ? colors.primary + '20'
                  : colors.textSecondary + '20',
              },
            ]}
          >
            <Ionicons
              name="calendar"
              size={24}
              color={isTodayConsultation ? colors.primary : colors.textSecondary}
            />
          </View>
          <View style={styles.consultationInfo}>
            <Text style={[styles.consultationDate, { color: colors.text }]}>
              {format(consultationDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </Text>
            <Text style={[styles.consultationTime, { color: colors.textSecondary }]}>
              {format(consultationDate, 'HH:mm', { locale: fr })}
            </Text>
          </View>
          {isTodayConsultation && (
            <View style={[styles.todayBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.todayBadgeText, { color: colors.primary }]}>Aujourd'hui</Text>
            </View>
          )}
        </View>

        <View style={styles.consultationDetails}>
          <View style={styles.motifRow}>
            <Ionicons name="document-text" size={16} color={colors.textSecondary} />
            <Text style={[styles.motifText, { color: colors.text }]}>{item.motif}</Text>
          </View>

          {item.diagnostic && (
            <View style={styles.diagnosticRow}>
              <Ionicons name="medical" size={16} color={colors.textSecondary} />
              <Text style={[styles.diagnosticText, { color: colors.textSecondary }]}>
                {item.diagnostic}
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  if (loading && !allConsultations.length) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StandardHeader
          icon="document-text-outline"
          title="Consultations"
          subtitle="Chargement..."
          onBack={() => navigation.goBack()}
        />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StandardHeader
        icon="document-text-outline"
        title="Consultations"
        subtitle="Consultations du projet"
        onBack={() => navigation.goBack()}
      />

      {/* Onglets */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['today', 'upcoming', 'past'] as const).map((tab) => (
          <View
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === tab ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === tab ? FONT_WEIGHTS.bold : FONT_WEIGHTS.medium,
                },
              ]}
            >
              {tab === 'today' && 'Aujourd\'hui'}
              {tab === 'upcoming' && 'À venir'}
              {tab === 'past' && 'Passées'}
            </Text>
          </View>
        ))}
      </View>

      {filteredConsultations.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Aucune consultation"
          message={
            activeTab === 'today'
              ? 'Aucune consultation prévue aujourd\'hui'
              : activeTab === 'upcoming'
              ? 'Aucune consultation à venir'
              : 'Aucune consultation passée'
          }
        />
      ) : (
        <FlatList
          data={filteredConsultations}
          renderItem={renderConsultation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  consultationCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  consultationInfo: {
    flex: 1,
  },
  consultationDate: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: 2,
  },
  consultationTime: {
    fontSize: FONT_SIZES.sm,
  },
  todayBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  todayBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  consultationDetails: {
    gap: SPACING.xs,
  },
  motifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  motifText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  diagnosticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  diagnosticText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
    fontStyle: 'italic',
  },
});
