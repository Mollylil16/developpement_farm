/**
 * Modal du menu profil utilisateur
 * Architecture refactorisée avec séparation claire des responsabilités
 */

import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import Header from './ProfileMenuModal/Header';
import UserSummary from './ProfileMenuModal/UserSummary';
import HomeView from './ProfileMenuModal/HomeView';
import MonProjetView from './ProfileMenuModal/MonProjetView';
import SettingsRootView from './ProfileMenuModal/SettingsRootView';
import SettingsDetailView from './ProfileMenuModal/SettingsDetailView';

interface ProfileMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

type ViewMode = 'home' | 'profile' | 'settings' | 'mon-projet';
type SettingsTab = 'account' | 'security' | 'notifications' | 'preferences' | 'marketplace' | null;

export default function ProfileMenuModal({ visible, onClose }: ProfileMenuModalProps) {
  const { colors } = useTheme();

  // États simplifiés et explicites
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(null);

  const handleBack = () => {
    if (settingsTab !== null) {
      // Retour depuis une sous-vue de paramètres
      setSettingsTab(null);
    } else if (viewMode !== 'home') {
      // Retour vers la vue d'accueil
      setViewMode('home');
      setSettingsTab(null);
    } else {
      // Fermer le modal
      onClose();
    }
  };

  const handleNavigateToSettings = () => {
    setViewMode('settings');
    setSettingsTab(null);
  };

  const handleNavigateToMonProjet = () => {
    setViewMode('mon-projet');
  };

  const handleNavigateToSettingsTab = (
    tab: 'account' | 'security' | 'notifications' | 'preferences' | 'marketplace'
  ) => {
    setSettingsTab(tab);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <Header viewMode={viewMode} onBack={handleBack} />

        {/* User Summary - Affiché uniquement en vue d'accueil */}
        {viewMode === 'home' && <UserSummary />}

        {/* Contenu principal */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {viewMode === 'home' && (
            <HomeView
              onNavigateToSettings={handleNavigateToSettings}
              onNavigateToMonProjet={handleNavigateToMonProjet}
              onClose={onClose}
            />
          )}

          {viewMode === 'mon-projet' && <MonProjetView />}

          {viewMode === 'settings' && (
            <>
              {settingsTab === null ? (
                <SettingsRootView onNavigateToTab={handleNavigateToSettingsTab} />
              ) : (
                <SettingsDetailView settingsTab={settingsTab} onBack={() => setSettingsTab(null)} />
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
