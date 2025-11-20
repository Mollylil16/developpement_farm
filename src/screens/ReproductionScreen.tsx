/**
 * Écran Reproduction - Design standardisé cohérent avec Planning Production
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GestationsListComponent from '../components/GestationsListComponent';
import GestationsCalendarComponent from '../components/GestationsCalendarComponent';
import SevragesListComponent from '../components/SevragesListComponent';
import ProtectedScreen from '../components/ProtectedScreen';
import StandardHeader from '../components/StandardHeader';
import StandardTabs, { TabItem } from '../components/StandardTabs';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';

type TabType = 'gestations' | 'calendrier' | 'sevrages';

function ReproductionScreenContent() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('gestations');
  const gestations = useAppSelector((state) => state.reproduction.gestations);
  const gestationsEnCours = Array.isArray(gestations) 
    ? gestations.filter((g: any) => g.statut === 'en_cours').length 
    : 0;

  const tabs: TabItem[] = [
    {
      id: 'gestations',
      label: 'Gestations',
      icon: 'heart-outline',
      description: 'Suivi grossesses',
    },
    {
      id: 'calendrier',
      label: 'Calendrier',
      icon: 'calendar-outline',
      description: 'Planning',
    },
    {
      id: 'sevrages',
      label: 'Sevrages',
      icon: 'nutrition-outline',
      description: 'Historique',
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'gestations':
        return <GestationsListComponent />;
      case 'calendrier':
        return <GestationsCalendarComponent />;
      case 'sevrages':
        return <SevragesListComponent />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StandardHeader
        icon="heart"
        title="Reproduction"
        subtitle="Gestion des gestations et sevrages"
        badge={gestationsEnCours}
        badgeColor={colors.success}
      />
      
      <StandardTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
      />

      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
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

export default function ReproductionScreen() {
  return (
    <ProtectedScreen requiredPermission="reproduction">
      <ReproductionScreenContent />
    </ProtectedScreen>
  );
}
