/**
 * Écran "Enregistrements" pour les techniciens
 * Affiche tous les enregistrements récents (pesées, vaccinations, traitements, visites)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTechData } from '../hooks/useTechData';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const RecordsScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pesee' | 'vaccination' | 'traitement' | 'visite'>('all');
  const { recentRecords, loading, refresh } = useTechData(currentUser?.id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const filteredRecords = activeFilter === 'all'
    ? recentRecords
    : recentRecords.filter((record) => record.recordType === activeFilter);

  const renderRecord = ({ item }: { item: typeof recentRecords[0] }) => {
    const recordIcons = {
      pesee: 'scale',
      vaccination: 'medical',
      traitement: 'flask',
      visite: 'calendar',
    };

    const recordLabels = {
      pesee: 'Pesée',
      vaccination: 'Vaccination',
      traitement: 'Traitement',
      visite: 'Visite',
    };

    const recordColors = {
      pesee: colors.info,
      vaccination: colors.success,
      traitement: colors.warning,
      visite: colors.primary,
    };

    return (
      <Card style={[styles.recordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.recordHeader}>
          <View style={[styles.recordIcon, { backgroundColor: recordColors[item.recordType as keyof typeof recordColors] + '20' }]}>
            <Ionicons
              name={recordIcons[item.recordType as keyof typeof recordIcons] || 'document'}
              size={24}
              color={recordColors[item.recordType as keyof typeof recordColors]}
            />
          </View>
          <View style={styles.recordInfo}>
            <Text style={[styles.recordType, { color: colors.text }]}>
              {recordLabels[item.recordType as keyof typeof recordLabels] || item.recordType}
            </Text>
            <Text style={[styles.recordFarm, { color: colors.textSecondary }]}>
              {item.farmName}
            </Text>
          </View>
          <Text style={[styles.recordDate, { color: colors.textSecondary }]}>
            {format(new Date(item.date), 'd MMM', { locale: fr })}
          </Text>
        </View>

        <Text style={[styles.recordDescription, { color: colors.text }]}>
          {item.description}
        </Text>

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

  if (!currentUser?.roles?.technician) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="construct-outline"
          title="Profil Technicien requis"
          message="Activez votre profil technicien pour voir vos enregistrements"
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Enregistrements</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filtres */}
      <View style={[styles.filtersContainer, { borderBottomColor: colors.divider }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {(['all', 'pesee', 'vaccination', 'traitement', 'visite'] as const).map((filter) => {
            const filterLabels = {
              all: 'Tous',
              pesee: 'Pesées',
              vaccination: 'Vaccinations',
              traitement: 'Traitements',
              visite: 'Visites',
            };

            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  activeFilter === filter && { backgroundColor: colors.primary },
                  { borderColor: colors.border },
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: activeFilter === filter ? '#FFF' : colors.text },
                  ]}
                >
                  {filterLabels[filter]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon="document-outline"
          title="Aucun enregistrement"
          message={
            activeFilter === 'all'
              ? "Vous n'avez pas encore d'enregistrements"
              : `Vous n'avez pas d'enregistrements de type "${activeFilter}"`
          }
        />
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderRecord}
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
  filtersContainer: {
    borderBottomWidth: 1,
  },
  filtersContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
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
  recordCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordType: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  recordFarm: {
    fontSize: FONT_SIZES.sm,
  },
  recordDate: {
    fontSize: FONT_SIZES.sm,
  },
  recordDescription: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    lineHeight: 20,
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

export default RecordsScreen;

