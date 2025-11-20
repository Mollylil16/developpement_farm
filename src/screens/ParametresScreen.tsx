/**
 * Écran Paramètres - Design standardisé cohérent avec Planning Production
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import StandardHeader from '../components/StandardHeader';
import StandardTabs, { TabItem } from '../components/StandardTabs';
import ParametresProjetComponent from '../components/ParametresProjetComponent';
import ParametresAppComponent from '../components/ParametresAppComponent';
import TrainingScreen from './TrainingScreen';

type TabType = 'projet' | 'application' | 'formation';

export default function ParametresScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('projet');

  const tabs: TabItem[] = [
    {
      id: 'projet',
      label: 'Projet',
      icon: 'folder-outline',
      description: 'Configuration',
    },
    {
      id: 'application',
      label: 'Application',
      icon: 'settings-outline',
      description: 'Préférences',
    },
    {
      id: 'formation',
      label: 'Formation',
      icon: 'school-outline',
      description: 'Tutoriels',
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'projet':
        return <ParametresProjetComponent />;
      case 'application':
        return <ParametresAppComponent />;
      case 'formation':
        return <TrainingScreen />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StandardHeader
        icon="settings"
        title="Paramètres"
        subtitle="Configuration de votre projet et application"
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

