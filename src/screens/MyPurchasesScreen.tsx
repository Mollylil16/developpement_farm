/**
 * Écran "Mes achats" pour les acheteurs
 * Affiche l'historique complet des transactions complétées
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
import { useBuyerData } from '../hooks/useBuyerData';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import type { Transaction } from '../types/marketplace';

const MyPurchasesScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const { completedTransactions, loading, refresh } = useBuyerData();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const statusColors = {
      completed: colors.success,
      delivered: colors.success,
      confirmed: colors.info,
      preparing: colors.warning,
      ready_for_delivery: colors.warning,
      pending_delivery: colors.warning,
      in_transit: colors.info,
      cancelled: colors.error,
    };

    const statusLabels = {
      completed: 'Terminé',
      delivered: 'Livré',
      confirmed: 'Confirmé',
      preparing: 'En préparation',
      ready_for_delivery: 'Prêt pour livraison',
      pending_delivery: 'En attente de livraison',
      in_transit: 'En transit',
      cancelled: 'Annulé',
    };

    return (
      <Card style={[styles.transactionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionHeaderLeft}>
            <Ionicons name="bag" size={24} color={colors.primary} />
            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionDate, { color: colors.text }]}>
                {format(new Date(item.createdAt), 'd MMMM yyyy', { locale: fr })}
              </Text>
              <Text style={[styles.transactionSubjects, { color: colors.textSecondary }]}>
                {item.subjectIds.length} sujet{item.subjectIds.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
            <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
              {statusLabels[item.status] || item.status}
            </Text>
          </View>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Prix total</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>
              {item.finalPrice.toLocaleString()} FCFA
            </Text>
          </View>

          {item.deliveryDetails && (
            <View style={styles.deliveryRow}>
              <Ionicons name="location" size={16} color={colors.textSecondary} />
              <Text style={[styles.deliveryText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.deliveryDetails.location}
              </Text>
            </View>
          )}

          {item.completedAt && (
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.completedText, { color: colors.textSecondary }]}>
                Complété le {format(new Date(item.completedAt), 'd MMM yyyy', { locale: fr })}
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

  if (!currentUser?.roles?.buyer) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="cart-outline"
          title="Profil Acheteur requis"
          message="Activez votre profil acheteur pour voir vos achats"
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes achats</Text>
        <View style={styles.headerRight} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : completedTransactions.length === 0 ? (
        <EmptyState
          icon="bag-outline"
          title="Aucun achat"
          message="Vos achats complétés apparaîtront ici"
        />
      ) : (
        <FlatList
          data={completedTransactions}
          renderItem={renderTransaction}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  transactionCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  transactionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  transactionSubjects: {
    fontSize: FONT_SIZES.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  transactionDetails: {
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: FONT_SIZES.sm,
  },
  priceValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  deliveryText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  completedText: {
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

export default MyPurchasesScreen;

