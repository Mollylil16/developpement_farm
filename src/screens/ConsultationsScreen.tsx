/**
 * Écran "Consultations" pour les vétérinaires
 * Affiche toutes les consultations (passées et à venir)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useVetData } from '../hooks/useVetData';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import type { VisiteVeterinaire } from '../types/sante';

const ConsultationsScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const { todayConsultations, upcomingConsultations, loading, refresh } = useVetData(currentUser?.id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Combiner toutes les consultations et les trier
  const allConsultations = [
    ...todayConsultations,
    ...upcomingConsultations,
  ].sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime());

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
      <Card style={[styles.consultationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.consultationHeader}>
          <View style={[styles.dateIcon, { backgroundColor: isTodayConsultation ? colors.primary + '20' : colors.textSecondary + '20' }]}>
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
            <Text style={[styles.motifText, { color: colors.text }]}>
              {item.motif}
            </Text>
          </View>

          {item.diagnostic && (
            <View style={styles.diagnosticRow}>
              <Ionicons name="medical" size={16} color={colors.warning} />
              <Text style={[styles.diagnosticText, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.diagnostic}
              </Text>
            </View>
          )}

          {item.prescriptions && (
            <View style={styles.prescriptionsRow}>
              <Ionicons name="flask" size={16} color={colors.info} />
              <Text style={[styles.prescriptionsText, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.prescriptions}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.viewDetailsButton, { borderColor: colors.border }]}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Text style={[styles.viewDetailsText, { color: colors.primary }]}>Voir les détails</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </Card>
    );
  };

  if (!currentUser?.roles?.veterinarian) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="medical-outline"
          title="Profil Vétérinaire requis"
          message="Activez votre profil vétérinaire pour voir vos consultations"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Consultations</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'today' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('today')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'today' ? colors.primary : colors.textSecondary },
            ]}
          >
            Aujourd'hui
          </Text>
          {activeTab === 'today' && todayConsultations.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.tabBadgeText, { color: '#FFF' }]}>
                {todayConsultations.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'upcoming' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'upcoming' ? colors.primary : colors.textSecondary },
            ]}
          >
            À venir
          </Text>
          {activeTab === 'upcoming' && upcomingConsultations.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.tabBadgeText, { color: '#FFF' }]}>
                {upcomingConsultations.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'past' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('past')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'past' ? colors.primary : colors.textSecondary },
            ]}
          >
            Passées
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : filteredConsultations.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={`Aucune consultation ${activeTab === 'today' ? "aujourd'hui" : activeTab === 'upcoming' ? 'à venir' : 'passée'}`}
          message={
            activeTab === 'today'
              ? "Vous n'avez pas de consultations prévues aujourd'hui"
              : activeTab === 'upcoming'
              ? "Vous n'avez pas de consultations à venir"
              : "Vous n'avez pas encore de consultations passées"
          }
        />
      ) : (
        <FlatList
          data={filteredConsultations}
          renderItem={renderConsultation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  consultationCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  dateIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultationInfo: {
    flex: 1,
  },
  consultationDate: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
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
    fontWeight: FONT_WEIGHTS.medium,
  },
  consultationDetails: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  motifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  motifText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  diagnosticRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  diagnosticText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
  },
  prescriptionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  prescriptionsText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  viewDetailsText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

export default ConsultationsScreen;

