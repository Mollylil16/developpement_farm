/**
 * Écran Dashboard Refactorisé - Version simplifiée avec hooks et composants
 * Réduit de ~923 lignes à ~250 lignes
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../store/hooks';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { usePermissions } from '../hooks/usePermissions';
import { SCREENS } from '../navigation/types';
import { SPACING } from '../constants/theme';
import { SafeTextWrapper } from '../utils/textRenderingGuard';

// Custom Hooks
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardAnimations } from '../hooks/useDashboardAnimations';
import { useDashboardExport } from '../hooks/useDashboardExport';
import { useProfilData } from '../hooks/useProfilData';

// Components
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardMainWidgets from '../components/dashboard/DashboardMainWidgets';
import DashboardSecondaryWidgets from '../components/dashboard/DashboardSecondaryWidgets';
import AlertesWidget from '../components/AlertesWidget';
import GlobalSearchModal from '../components/GlobalSearchModal';
import InvitationsModal from '../components/InvitationsModal';

// Type pour la navigation - définit toutes les routes possibles
type RootStackParamList = {
  [SCREENS.PROFIL]: undefined;
  [SCREENS.WELCOME]: undefined;
  [SCREENS.AUTH]: undefined;
  [SCREENS.CREATE_PROJECT]: undefined;
  [SCREENS.ADMIN]: undefined;
  Main: { screen?: string };
};

export default function DashboardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  
  // Redux State
  const { projetActif, loading } = useAppSelector((state) => state.projet);
  const { invitationsEnAttente } = useAppSelector((state) => state.collaboration);
  
  // Permissions
  const { hasPermission, isProprietaire } = usePermissions();
  
  // UI State (modals)
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [invitationsModalVisible, setInvitationsModalVisible] = useState(false);
  
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

  // Date formatting
  let currentDate = '';
  try {
    currentDate = format(new Date(), 'EEEE d MMMM yyyy');
  } catch (error) {
    console.error('Erreur formatage date:', error);
    currentDate = new Date().toLocaleDateString('fr-FR');
  }

  // Build secondary widgets list
  const secondaryWidgets = useCallback(() => {
    const widgets: Array<{ type: any; screen: string }> = [];

    if (hasPermission('sante')) {
      widgets.push({ type: 'sante', screen: SCREENS.SANTE });
    }
    // Production juste après Santé
    widgets.push({ type: 'production', screen: SCREENS.PRODUCTION });
    
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

  // Navigation handler
  const handleNavigateToScreen = (screen: string) => {
    // @ts-ignore - navigation typée
    navigation.navigate('Main', { screen });
  };

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
              headerAnim={animations.headerAnim}
              onPressPhoto={() => {
                navigation.navigate(SCREENS.PROFIL);
              }}
              onPressInvitations={() => setInvitationsModalVisible(true)}
            />

            {/* Secondary Widgets - Modules complémentaires en haut avec scroll horizontal */}
            <DashboardSecondaryWidgets
              widgets={secondaryWidgets()}
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
        <GlobalSearchModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
        />
      )}
      <InvitationsModal
        visible={invitationsModalVisible}
        onClose={() => setInvitationsModalVisible(false)}
      />
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

