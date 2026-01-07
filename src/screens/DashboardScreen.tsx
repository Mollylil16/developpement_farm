/**
 * Écran Dashboard Refactorisé - Version simplifiée avec hooks et composants
 * Réduit de ~923 lignes à ~250 lignes
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../store/hooks';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { useRole } from '../contexts/RoleContext';
import { SCREENS } from '../navigation/types';
import { SPACING } from '../constants/theme';
import { SafeTextWrapper } from '../utils/textRenderingGuard';

// Custom Hooks
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardAnimations } from '../hooks/useDashboardAnimations';
import { useDashboardExport } from '../hooks/useDashboardExport';
import { useProfilData } from '../hooks/useProfilData';
import { useMarketplaceNotifications } from '../hooks/useMarketplaceNotifications';

// Components
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardMainWidgets from '../components/dashboard/DashboardMainWidgets';
import DashboardSecondaryWidgets from '../components/dashboard/DashboardSecondaryWidgets';
import AlertesWidget from '../components/AlertesWidget';
import GlobalSearchModal from '../components/GlobalSearchModal';
import InvitationsModal from '../components/InvitationsModal';
import ProfileMenuModal from '../components/ProfileMenuModal';
import { NotificationPanel } from '../components/marketplace';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

// Type pour la navigation - définit toutes les routes possibles
type RootStackParamList = {
  [SCREENS.PROFIL]: undefined;
  [SCREENS.WELCOME]: undefined;
  [SCREENS.AUTH]: undefined;
  [SCREENS.CREATE_PROJECT]: undefined;
  [SCREENS.ADMIN]: undefined;
  Main: { screen?: string };
};

function DashboardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  // Redux State
  const { projetActif, loading } = useAppSelector((state) => state.projet);
  const { invitationsEnAttente, collaborateurActuel } = useAppSelector(
    (state) => state.collaboration
  );
  const currentUser = useAppSelector((state) => state.auth.user);

  // Permissions basées sur les rôles
  const { activeRole } = useRole();
  const rolePermissions = useRolePermissions();

  // Helper pour vérifier les permissions par module (compatibilité avec l'ancien système)
  const hasPermission = useCallback(
    (module: string): boolean => {
      if (activeRole === 'producer') {
        // Pour les producteurs, tous les modules sont accessibles
        return true;
      }

      // Pour technicien et vétérinaire, vérifier les permissions de collaboration
      if (
        (activeRole === 'technician' || activeRole === 'veterinarian') &&
        collaborateurActuel?.permissions
      ) {
        // Vérifier les permissions spécifiques à la ferme via la collaboration
        switch (module) {
          case 'reproduction':
            return collaborateurActuel.permissions.reproduction ?? false;
          case 'nutrition':
            return collaborateurActuel.permissions.nutrition ?? false;
          case 'planification':
            return collaborateurActuel.permissions.planification ?? false;
          case 'mortalites':
            return collaborateurActuel.permissions.mortalites ?? false;
          case 'finance':
            return collaborateurActuel.permissions.finance ?? false;
          case 'rapports':
            return collaborateurActuel.permissions.rapports ?? false; // Permission spécifique à la ferme
          case 'sante':
            return collaborateurActuel.permissions.sante ?? false;
          default:
            return false;
        }
      }

      // Pour les autres rôles, utiliser les permissions spécifiques
      switch (module) {
        case 'reproduction':
        case 'nutrition':
        case 'planification':
        case 'mortalites':
          return rolePermissions.canViewHerd;
        case 'finance':
          return rolePermissions.canViewFinances;
        case 'rapports':
          return rolePermissions.canGenerateReports;
        case 'sante':
          return rolePermissions.canViewHealthRecords;
        default:
          return false;
      }
    },
    [activeRole, rolePermissions, collaborateurActuel]
  );

  // Vérifier si l'utilisateur est propriétaire du projet actif
  const isProprietaire =
    activeRole === 'producer' &&
    projetActif &&
    currentUser &&
    (projetActif.proprietaire_id === currentUser.id ||
      (projetActif as unknown).user_id === currentUser.id);

  // UI State (modals)
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [invitationsModalVisible, setInvitationsModalVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);

  // Greeting state
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour 👋';
    if (hour >= 12 && hour < 18) return 'Bonne après-midi 👋';
    return 'Bonsoir 👋';
  });

  // Custom Hooks
  const profil = useProfilData();
  const { isInitialLoading, refreshing, onRefresh } = useDashboardData({
    projetId: projetActif?.id,
    onProfilPhotoLoad: profil.loadProfilPhoto,
  });
  const animations = useDashboardAnimations();
  const { exportingPDF, handleExportPDF } = useDashboardExport(projetActif);
  const {
    notifications: marketplaceNotifications,
    unreadCount: marketplaceUnreadCount,
    markAsRead,
    deleteNotification,
  } = useMarketplaceNotifications({ enabled: isFocused });

  // Date formatting - mémorisé pour éviter les recalculs
  const currentDate = useMemo(() => {
    try {
      return format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
    } catch (error) {
      console.error('Erreur formatage date:', error);
      return new Date().toLocaleDateString('fr-FR');
    }
  }, []); // Ne change qu'une fois par jour, mais on le recalcule à chaque render pour l'instant

  // Build secondary widgets list - mémorisé pour éviter les recalculs
  const secondaryWidgets = useMemo(() => {
    const widgets: Array<{ type: unknown; screen: string }> = [];

    if (hasPermission('sante')) {
      widgets.push({ type: 'sante', screen: SCREENS.SANTE });
    }
    // Production juste après Santé
    widgets.push({ type: 'production', screen: SCREENS.PRODUCTION });

    // Marketplace - Toujours accessible
    widgets.push({ type: 'marketplace', screen: SCREENS.MARKETPLACE });

    if (hasPermission('nutrition')) {
      widgets.push({ type: 'nutrition', screen: SCREENS.NUTRITION });
    }
    if (hasPermission('planification')) {
      widgets.push({ type: 'planning', screen: SCREENS.PLANIFICATION });
    }
    if (isProprietaire) {
      widgets.push({ type: 'collaboration', screen: SCREENS.COLLABORATION });
    }

    return widgets;
  }, [hasPermission, isProprietaire]);

  // Navigation handler - mémorisé pour éviter les re-créations
  const handleNavigateToScreen = useCallback(
    (screen: string) => {
      // @ts-ignore - navigation typée
      navigation.navigate('Main', { screen });
    },
    [navigation]
  );

  // Handlers pour les modals - mémorisés pour éviter les re-créations
  const handleCloseSearchModal = useCallback(() => setSearchModalVisible(false), []);
  const handleCloseInvitationsModal = useCallback(() => setInvitationsModalVisible(false), []);
  const handleCloseProfileMenu = useCallback(() => setProfileMenuVisible(false), []);
  const handleCloseNotificationPanel = useCallback(() => setNotificationPanelVisible(false), []);

  const handleNotificationPress = useCallback(
    (notification: unknown) => {
      setNotificationPanelVisible(false);
      // Navigation vers l'écran approprié selon le type de notification
      // @ts-ignore - navigation typée
      if (
        notification.type === 'offer_accepted' &&
        notification.relatedId &&
        notification.relatedType === 'transaction'
      ) {
        // @ts-ignore - navigation typée
        navigation.navigate(
          SCREENS.MARKETPLACE_CHAT as never,
          { transactionId: notification.relatedId } as never
        );
      } else if (notification.type === 'message_received' && notification.relatedId) {
        // @ts-ignore - navigation typée
        navigation.navigate(
          SCREENS.MARKETPLACE_CHAT as never,
          { transactionId: notification.relatedId } as never
        );
      } else if (notification.type === 'offer_received') {
        // @ts-ignore - navigation typée
        navigation.navigate(SCREENS.MARKETPLACE as never);
      }
    },
    [navigation]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    // Marquer toutes les notifications comme lues
    for (const notification of marketplaceNotifications) {
      if (!notification.read) {
        await markAsRead(notification.id);
      }
    }
  }, [marketplaceNotifications, markAsRead]);

  // Handlers pour les boutons du header
  const handlePressPhoto = useCallback(() => setProfileMenuVisible(true), []);
  const handlePressInvitations = useCallback(() => setInvitationsModalVisible(true), []);
  const handlePressNotifications = useCallback(() => setNotificationPanelVisible(true), []);

  // Loading states
  if (loading && !projetActif) {
    return <LoadingSpinner message="Chargement du projet..." />;
  }

  if (!projetActif) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          title="Aucun projet actif"
          message="Créez un projet pour commencer à gérer votre élevage"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <SafeTextWrapper componentName="DashboardScreen">
          <View style={styles.content}>
            {/* Header */}
            <DashboardHeader
              greeting={greeting}
              profilPrenom={profil.profilPrenom || ''}
              profilPhotoUri={profil.profilPhotoUri}
              profilInitiales={profil.profilInitiales || ''}
              currentDate={currentDate}
              projetNom={projetActif?.nom || ''}
              invitationsCount={
                Array.isArray(invitationsEnAttente) ? invitationsEnAttente.length : 0
              }
              notificationCount={marketplaceUnreadCount}
              headerAnim={animations.headerAnim}
              onPressPhoto={handlePressPhoto}
              onPressInvitations={handlePressInvitations}
              onPressNotifications={handlePressNotifications}
            />

            {/* Secondary Widgets - Modules complémentaires en haut avec scroll horizontal */}
            <DashboardSecondaryWidgets
              widgets={secondaryWidgets}
              animations={animations.secondaryWidgetsAnim}
              onPressWidget={handleNavigateToScreen}
              horizontal={true}
            />

            {/* Alertes Widget */}
            <View style={styles.alertesContainer}>
              <AlertesWidget />
            </View>

            {/* Main Widgets */}
            <DashboardMainWidgets
              projetId={projetActif.id}
              animations={animations.mainWidgetsAnim}
              isLoading={isInitialLoading}
            />
          </View>
        </SafeTextWrapper>
      </ScrollView>

      {/* Modals */}
      {searchModalVisible && (
        <GlobalSearchModal visible={searchModalVisible} onClose={handleCloseSearchModal} />
      )}
      <InvitationsModal visible={invitationsModalVisible} onClose={handleCloseInvitationsModal} />
      <ProfileMenuModal visible={profileMenuVisible} onClose={handleCloseProfileMenu} />
      <NotificationPanel
        visible={notificationPanelVisible}
        notifications={marketplaceNotifications}
        unreadCount={marketplaceUnreadCount}
        onClose={handleCloseNotificationPanel}
        onNotificationPress={handleNotificationPress}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDelete={deleteNotification}
      />
      {/* Bouton flottant pour accéder à l'agent conversationnel */}
      <ChatAgentFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
    paddingBottom: 100,
  },
  alertesContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(DashboardScreen);
