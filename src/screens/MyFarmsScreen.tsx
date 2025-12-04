/**
 * Écran "Mes fermes" pour les techniciens
 * Affiche toutes les fermes assistées avec détails
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTechData } from '../hooks/useTechData';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const MyFarmsScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const { assistedFarms, loading, refresh } = useTechData(currentUser?.id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderFarm = ({ item }: { item: typeof assistedFarms[0] }) => {
    return (
      <Card style={[styles.farmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.farmHeader}>
          <View style={[styles.farmIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="business" size={32} color={colors.primary} />
          </View>
          <View style={styles.farmInfo}>
            <Text style={[styles.farmName, { color: colors.text }]}>
              {item.farmName}
            </Text>
            <Text style={[styles.farmSince, { color: colors.textSecondary }]}>
              Assistée depuis {format(new Date(item.since), 'MMMM yyyy', { locale: fr })}
            </Text>
          </View>
        </View>

        <View style={styles.permissionsSection}>
          <Text style={[styles.permissionsTitle, { color: colors.text }]}>Permissions</Text>
          <View style={styles.permissionsList}>
            {item.permissions?.canViewHerd && (
              <View style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                  Voir le cheptel
                </Text>
              </View>
            )}
            {item.permissions?.canEditHerd && (
              <View style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                  Modifier le cheptel
                </Text>
              </View>
            )}
            {item.permissions?.canViewHealthRecords && (
              <View style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                  Voir les dossiers sanitaires
                </Text>
              </View>
            )}
            {item.permissions?.canEditHealthRecords && (
              <View style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                  Modifier les dossiers sanitaires
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="clipboard" size={20} color={colors.primary} />
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {item.taskCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Tâche{item.taskCount > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.viewDetailsButton, { borderColor: colors.border }]}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Text style={[styles.viewDetailsText, { color: colors.primary }]}>Accéder à la ferme</Text>
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
          message="Activez votre profil technicien pour voir vos fermes"
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes fermes</Text>
        <View style={styles.headerRight} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : assistedFarms.length === 0 ? (
        <EmptyState
          icon="business-outline"
          title="Aucune ferme assistée"
          message="Vous n'assistez aucune ferme pour le moment"
        />
      ) : (
        <FlatList
          data={assistedFarms}
          renderItem={renderFarm}
          keyExtractor={(item) => item.farmId}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  farmCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  farmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  farmIcon: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  farmSince: {
    fontSize: FONT_SIZES.sm,
  },
  permissionsSection: {
    marginBottom: SPACING.md,
  },
  permissionsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  permissionsList: {
    gap: SPACING.xs,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  permissionText: {
    fontSize: FONT_SIZES.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
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

export default MyFarmsScreen;

