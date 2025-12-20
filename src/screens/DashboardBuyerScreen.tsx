/**
 * Dashboard Acheteur
 * Écran principal pour les utilisateurs avec le rôle Acheteur
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBuyerData } from '../hooks/useBuyerData';
import { useProfilData } from '../hooks/useProfilData';
import { useDashboardAnimations } from '../hooks/useDashboardAnimations';
import { useMarketplaceNotifications } from '../hooks/useMarketplaceNotifications';
import { SCREENS } from '../navigation/types';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, LIGHT_COLORS } from '../constants/theme';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ProfileMenuModal from '../components/ProfileMenuModal';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardSecondaryWidgets from '../components/dashboard/DashboardSecondaryWidgets';
import PorkPriceTrendCard from '../components/dashboard/PorkPriceTrendCard';
import { NotificationPanel } from '../components/marketplace';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';
import type { Offer, Transaction, MarketplaceListing } from '../types/marketplace';

const DashboardBuyerScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const { activeOffers, completedTransactions, recentListings, loading, error, refresh } =
    useBuyerData();
  const profil = useProfilData();
  const animations = useDashboardAnimations();
  const {
    notifications: marketplaceNotifications,
    unreadCount: marketplaceUnreadCount,
    markAsRead,
    deleteNotification,
  } = useMarketplaceNotifications();

  const buyerProfile = currentUser?.roles?.buyer;

  // Greeting state
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour 👋';
    if (hour >= 12 && hour < 18) return 'Bonne après-midi 👋';
    return 'Bonsoir 👋';
  }, []);

  // Date formatting
  const currentDate = useMemo(() => {
    try {
      return format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
    } catch (error) {
      return new Date().toLocaleDateString('fr-FR');
    }
  }, []);

  // Build secondary widgets list - mémorisé pour éviter les recalculs
  const secondaryWidgets = useMemo(
    () => [
      { type: 'purchases' as const, screen: SCREENS.MY_PURCHASES },
      { type: 'expenses' as const, screen: SCREENS.MY_PURCHASES },
      { type: 'marketplace' as const, screen: SCREENS.MARKETPLACE },
    ],
    []
  );

  // Navigation handler - mémorisé pour éviter les re-créations
  const handleNavigateToScreen = useCallback(
    (screen: string) => {
      // @ts-ignore - navigation typée
      navigation.navigate('Main', { screen } as never);
    },
    [navigation]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handlePressPhoto = useCallback(() => {
    setProfileMenuVisible(true);
  }, []);

  const handlePressNotifications = useCallback(() => {
    setNotificationPanelVisible(true);
  }, []);

  if (!buyerProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="cart-outline"
          title="Profil Acheteur non activé"
          message="Activez votre profil acheteur pour accéder à ce dashboard"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title="Actualisation..."
            titleColor={colors.textSecondary}
          />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <DashboardHeader
            greeting={greeting}
            profilPrenom={profil.profilPrenom || currentUser?.prenom || 'Utilisateur'}
            profilPhotoUri={profil.profilPhotoUri}
            profilInitiales={profil.profilInitiales || ''}
            currentDate={currentDate}
            projetNom={buyerProfile?.businessInfo?.companyName || undefined}
            invitationsCount={0}
            notificationCount={marketplaceUnreadCount}
            headerAnim={animations.headerAnim}
            onPressPhoto={handlePressPhoto}
            onPressInvitations={() => {}}
            onPressNotifications={handlePressNotifications}
          />

          {/* Secondary Widgets - Modules complémentaires en haut avec scroll horizontal */}
          <DashboardSecondaryWidgets
            widgets={secondaryWidgets}
            animations={animations.secondaryWidgetsAnim}
            onPressWidget={handleNavigateToScreen}
            horizontal={true}
          />

          {/* Carte tendance du prix du porc */}
          <PorkPriceTrendCard style={{ marginBottom: SPACING.lg }} />

          {/* Offres en cours */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes offres en cours</Text>
              {activeOffers.length > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(SCREENS.OFFERS as never)}
                  style={styles.seeAllButton}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <Card
                style={StyleSheet.flatten([
                  styles.sectionCard,
                  { backgroundColor: colors.surface },
                ])}
              >
                <LoadingSpinner size="small" />
              </Card>
            ) : activeOffers.length === 0 ? (
              <Card
                style={StyleSheet.flatten([
                  styles.sectionCard,
                  { backgroundColor: colors.surface },
                ])}
              >
                <EmptyState
                  icon={<Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />}
                  title="Aucune offre en cours"
                  message="Vous n'avez pas encore fait d'offres"
                />
              </Card>
            ) : (
              <FlatList
                data={activeOffers.slice(0, 3)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <OfferCard offer={item} colors={colors} />}
                contentContainerStyle={styles.offersList}
              />
            )}
          </View>

          {/* Historique d'achats */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Historique d'achats</Text>
              {completedTransactions.length > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(SCREENS.MY_PURCHASES as never)}
                  style={styles.seeAllButton}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <Card
                style={StyleSheet.flatten([
                  styles.sectionCard,
                  { backgroundColor: colors.surface },
                ])}
              >
                <LoadingSpinner size="small" />
              </Card>
            ) : completedTransactions.length === 0 ? (
              <Card
                style={StyleSheet.flatten([
                  styles.sectionCard,
                  { backgroundColor: colors.surface },
                ])}
              >
                <EmptyState
                  icon={<Ionicons name="bag-outline" size={48} color={colors.textSecondary} />}
                  title="Aucun achat"
                  message="Vos achats complétés apparaîtront ici"
                />
              </Card>
            ) : (
              <View style={styles.transactionsList}>
                {completedTransactions.slice(0, 3).map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} colors={colors} />
                ))}
              </View>
            )}
          </View>

          {/* Nouvelles annonces */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Nouvelles annonces</Text>
              {recentListings.length > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(SCREENS.MARKETPLACE as never)}
                  style={styles.seeAllButton}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <Card
                style={StyleSheet.flatten([
                  styles.sectionCard,
                  { backgroundColor: colors.surface },
                ])}
              >
                <LoadingSpinner size="small" />
              </Card>
            ) : recentListings.length === 0 ? (
              <Card
                style={StyleSheet.flatten([
                  styles.sectionCard,
                  { backgroundColor: colors.surface },
                ])}
              >
                <EmptyState
                  icon={
                    <Ionicons name="storefront-outline" size={48} color={colors.textSecondary} />
                  }
                  title="Aucune annonce disponible"
                  message="Explorez le marketplace pour découvrir de nouvelles annonces"
                />
              </Card>
            ) : (
              <FlatList
                data={recentListings.slice(0, 3)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ListingCard listing={item} colors={colors} navigation={navigation} />
                )}
                contentContainerStyle={styles.listingsList}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Profile Menu Modal */}
      <ProfileMenuModal visible={profileMenuVisible} onClose={() => setProfileMenuVisible(false)} />

      {/* Notification Panel */}
      <NotificationPanel
        visible={notificationPanelVisible}
        notifications={marketplaceNotifications}
        unreadCount={marketplaceUnreadCount}
        onClose={() => setNotificationPanelVisible(false)}
        onNotificationPress={(notification) => {
          markAsRead(notification.id);
          // TODO: Navigate to notification target
        }}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={() => {
          marketplaceNotifications.forEach((n) => markAsRead(n.id));
        }}
        onDelete={deleteNotification}
      />
      {/* Bouton flottant pour accéder à l'agent conversationnel */}
      <ChatAgentFAB />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
    paddingBottom: 100,
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  sectionCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
  offersList: {
    paddingLeft: SPACING.md,
    gap: SPACING.md,
  },
  transactionsList: {
    gap: SPACING.sm,
  },
  listingsList: {
    paddingLeft: SPACING.md,
    gap: SPACING.md,
  },
});

// Composant Card pour les offres
const OfferCard: React.FC<{ offer: Offer; colors: typeof LIGHT_COLORS }> = ({ offer, colors }) => {
  const statusColors: Record<string, string> = {
    pending: colors.warning,
    countered: colors.info,
    accepted: colors.success,
    rejected: colors.error,
    expired: colors.textSecondary,
    withdrawn: colors.textSecondary,
  };

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    countered: 'Contre-offre',
    accepted: 'Acceptée',
    rejected: 'Refusée',
    expired: 'Expirée',
    withdrawn: 'Retirée',
  };

  return (
    <Card
      style={StyleSheet.flatten([
        componentStyles.offerCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ])}
    >
      <View style={componentStyles.offerHeader}>
        <View
          style={[
            componentStyles.statusBadge,
            { backgroundColor: statusColors[offer.status] + '20' },
          ]}
        >
          <Text style={[componentStyles.statusText, { color: statusColors[offer.status] }]}>
            {statusLabels[offer.status]}
          </Text>
        </View>
        <Text style={[componentStyles.offerDate, { color: colors.textSecondary }]}>
          {format(new Date(offer.createdAt), 'd MMM', { locale: fr })}
        </Text>
      </View>
      <Text style={[componentStyles.offerPrice, { color: colors.text }]}>
        {offer.proposedPrice.toLocaleString()} FCFA
      </Text>
      {offer.message && (
        <Text
          style={[componentStyles.offerMessage, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {offer.message}
        </Text>
      )}
    </Card>
  );
};

// Composant Card pour les transactions
const TransactionCard: React.FC<{ transaction: Transaction; colors: typeof LIGHT_COLORS }> = ({
  transaction,
  colors,
}) => {
  return (
    <Card
      style={StyleSheet.flatten([
        componentStyles.transactionCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ])}
    >
      <View style={componentStyles.transactionHeader}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <Text style={[componentStyles.transactionDate, { color: colors.textSecondary }]}>
          {format(new Date(transaction.createdAt), 'd MMM yyyy', { locale: fr })}
        </Text>
      </View>
      <Text style={[componentStyles.transactionPrice, { color: colors.text }]}>
        {transaction.finalPrice.toLocaleString()} FCFA
      </Text>
      <Text style={[componentStyles.transactionSubjects, { color: colors.textSecondary }]}>
        {transaction.subjectIds.length} sujet{transaction.subjectIds.length > 1 ? 's' : ''}
      </Text>
    </Card>
  );
};

// Composant Card pour les listings
const ListingCard: React.FC<{
  listing: MarketplaceListing;
  colors: typeof LIGHT_COLORS;
  navigation: NavigationProp<any>;
}> = ({ listing, colors, navigation }) => {
  return (
    <TouchableOpacity
      style={[
        componentStyles.listingCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={() => navigation.navigate(SCREENS.MARKETPLACE as never)}
      activeOpacity={0.7}
    >
      <View style={componentStyles.listingHeader}>
        <Ionicons name="paw" size={20} color={colors.primary} />
        <Text style={[componentStyles.listingPrice, { color: colors.primary }]}>
          {listing.calculatedPrice.toLocaleString()} FCFA
        </Text>
      </View>
      <Text style={[componentStyles.listingWeight, { color: colors.text }]}>
        {listing.weight || 'N/A'} kg
      </Text>
      <Text
        style={[componentStyles.listingLocation, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {listing.location.city}, {listing.location.region}
      </Text>
    </TouchableOpacity>
  );
};

// Styles pour les composants enfants
const componentStyles = StyleSheet.create({
  offerCard: {
    width: 200,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  offerDate: {
    fontSize: FONT_SIZES.xs,
  },
  offerPrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  offerMessage: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  transactionCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  transactionDate: {
    fontSize: FONT_SIZES.sm,
  },
  transactionPrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  transactionSubjects: {
    fontSize: FONT_SIZES.sm,
  },
  listingCard: {
    width: 180,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  listingPrice: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  listingWeight: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  listingLocation: {
    fontSize: FONT_SIZES.xs,
  },
});

export default DashboardBuyerScreen;
