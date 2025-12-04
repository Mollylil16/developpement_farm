/**
 * Écran "Mes clients" pour les vétérinaires
 * Affiche la liste des fermes clientes avec statistiques
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
import { useVetData } from '../hooks/useVetData';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const MyClientsScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const { clientFarms, loading, refresh } = useVetData(currentUser?.id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderClient = ({ item }: { item: typeof clientFarms[0] }) => {
    return (
      <Card style={[styles.clientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.clientHeader}>
          <View style={[styles.clientIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="business" size={24} color={colors.primary} />
          </View>
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, { color: colors.text }]}>
              {item.farmName}
            </Text>
            <Text style={[styles.clientSince, { color: colors.textSecondary }]}>
              Client depuis {format(new Date(item.since), 'MMMM yyyy', { locale: fr })}
            </Text>
          </View>
        </View>

        <View style={styles.clientStats}>
          <View style={styles.statItem}>
            <Ionicons name="medical" size={20} color={colors.primary} />
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {item.consultationCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Consultation{item.consultationCount > 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {item.lastConsultation && (
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={20} color={colors.success} />
              <View style={styles.statInfo}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {format(new Date(item.lastConsultation), 'd MMM yyyy', { locale: fr })}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Dernière visite
                </Text>
              </View>
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
          message="Activez votre profil vétérinaire pour voir vos clients"
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes clients</Text>
        <View style={styles.headerRight} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : clientFarms.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Aucun client"
          message="Vous n'avez pas encore de clients"
        />
      ) : (
        <FlatList
          data={clientFarms}
          renderItem={renderClient}
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
  clientCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  clientIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  clientSince: {
    fontSize: FONT_SIZES.sm,
  },
  clientStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
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

export default MyClientsScreen;

