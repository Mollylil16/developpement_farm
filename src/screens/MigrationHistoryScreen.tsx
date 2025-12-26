/**
 * Écran d'historique des migrations
 * Affiche toutes les migrations passées avec leurs détails
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import { migrationService } from '../services/migration/migrationService';
import type { MigrationHistoryItem } from '../services/migration/migrationService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getErrorMessage } from '../types/common';
import { Alert } from 'react-native';

export default function MigrationHistoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { projetActif } = useAppSelector((state) => state.projet);

  const [history, setHistory] = useState<MigrationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'batch_to_individual' | 'individual_to_batch'>('all');

  useEffect(() => {
    if (projetActif?.id) {
      loadHistory();
    }
  }, [projetActif?.id, selectedFilter]);

  const loadHistory = async () => {
    if (!projetActif?.id) return;

    setLoading(true);
    try {
      const data = await migrationService.getMigrationHistory(projetActif.id);
      
      // Filtrer selon le sélecteur
      const filtered = selectedFilter === 'all' 
        ? data 
        : data.filter((item) => item.migration_type === selectedFilter);
      
      setHistory(filtered);
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error) || 'Impossible de charger l\'historique');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return { name: 'checkmark-circle', color: colors.success };
      case 'failed':
        return { name: 'close-circle', color: colors.error };
      case 'in_progress':
        return { name: 'hourglass', color: colors.warning };
      case 'rolled_back':
        return { name: 'arrow-undo-circle', color: colors.textSecondary };
      default:
        return { name: 'help-circle', color: colors.textSecondary };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'batch_to_individual':
        return 'Bande → Individualisé';
      case 'individual_to_batch':
        return 'Individualisé → Bande';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'failed':
        return 'Échouée';
      case 'in_progress':
        return 'En cours';
      case 'rolled_back':
        return 'Annulée';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const getDuration = (started: string, completed?: string) => {
    if (!completed) return null;
    try {
      const start = new Date(started);
      const end = new Date(completed);
      const diffMs = end.getTime() - start.getTime();
      const diffSec = Math.round(diffMs / 1000);
      
      if (diffSec < 60) return `${diffSec}s`;
      const diffMin = Math.round(diffSec / 60);
      if (diffMin < 60) return `${diffMin}min`;
      const diffHour = Math.round(diffMin / 60);
      return `${diffHour}h`;
    } catch {
      return null;
    }
  };

  if (loading && history.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StandardHeader icon="time-outline" title="Historique des migrations" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StandardHeader icon="time-outline" title="Historique des migrations" />

      {/* Filtres */}
      <View style={[styles.filters, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'all' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === 'all' && { color: colors.white },
              selectedFilter !== 'all' && { color: colors.text },
            ]}
          >
            Toutes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'batch_to_individual' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSelectedFilter('batch_to_individual')}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === 'batch_to_individual' && { color: colors.white },
              selectedFilter !== 'batch_to_individual' && { color: colors.text },
            ]}
          >
            Bande → Individuel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'individual_to_batch' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSelectedFilter('individual_to_batch')}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === 'individual_to_batch' && { color: colors.white },
              selectedFilter !== 'individual_to_batch' && { color: colors.text },
            ]}
          >
            Individuel → Bande
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadHistory();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {history.length === 0 ? (
          <Card>
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune migration trouvée
              </Text>
            </View>
          </Card>
        ) : (
          <View style={styles.list}>
            {history.map((item) => {
              const statusIcon = getStatusIcon(item.status);
              const duration = getDuration(item.started_at, item.completed_at);
              const stats = item.statistics || {};

              return (
                <Card key={item.id} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <View style={styles.historyItemTitleRow}>
                      <Ionicons name={statusIcon.name as any} size={24} color={statusIcon.color} />
                      <View style={styles.historyItemTitleContainer}>
                        <Text style={[styles.historyItemTitle, { color: colors.text }]}>
                          {getTypeLabel(item.migration_type)}
                        </Text>
                        <Text style={[styles.historyItemDate, { color: colors.textSecondary }]}>
                          {formatDate(item.started_at)}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            item.status === 'completed'
                              ? colors.successLight + '30'
                              : item.status === 'failed'
                                ? colors.errorLight + '30'
                                : colors.warningLight + '30',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              item.status === 'completed'
                                ? colors.success
                                : item.status === 'failed'
                                  ? colors.error
                                  : colors.warning,
                          },
                        ]}
                      >
                        {getStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Statistiques */}
                  <View style={styles.statsRow}>
                    {stats.pigsCreated !== undefined && (
                      <View style={styles.statBadge}>
                        <Ionicons name="paw-outline" size={16} color={colors.primary} />
                        <Text style={[styles.statText, { color: colors.text }]}>
                          {stats.pigsCreated} porcs
                        </Text>
                      </View>
                    )}
                    {stats.batchesCreated !== undefined && (
                      <View style={styles.statBadge}>
                        <Ionicons name="layers-outline" size={16} color={colors.primary} />
                        <Text style={[styles.statText, { color: colors.text }]}>
                          {stats.batchesCreated} bandes
                        </Text>
                      </View>
                    )}
                    {stats.recordsMigrated !== undefined && (
                      <View style={styles.statBadge}>
                        <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                        <Text style={[styles.statText, { color: colors.text }]}>
                          {stats.recordsMigrated} enregistrements
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Durée */}
                  {duration && (
                    <View style={styles.durationRow}>
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                        Durée: {duration}
                      </Text>
                    </View>
                  )}

                  {/* Erreur */}
                  {item.status === 'failed' && item.error_message && (
                    <View style={[styles.errorContainer, { backgroundColor: colors.errorLight + '15' }]}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                      <Text style={[styles.errorText, { color: colors.error }]}>
                        {item.error_message}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filters: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.md,
  },
  list: {
    gap: SPACING.md,
  },
  historyItem: {
    marginBottom: SPACING.sm,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  historyItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemTitleContainer: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  historyItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  historyItemDate: {
    fontSize: FONT_SIZES.xs,
  },
  statusBadge: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#f0f0f0',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT_SIZES.xs,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  durationText: {
    fontSize: FONT_SIZES.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  errorText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
  },
});

