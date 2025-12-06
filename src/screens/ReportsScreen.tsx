/**
 * Écran Rapports - Design standardisé cohérent avec Planning Production
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import ProtectedScreen from '../components/ProtectedScreen';
import StandardHeader from '../components/StandardHeader';
import StandardTabs, { TabItem } from '../components/StandardTabs';
import PerformanceIndicatorsComponent from '../components/PerformanceIndicatorsComponent';
import TendancesChartsComponent from '../components/TendancesChartsComponent';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

type TabType = 'performance' | 'tendances';

function ReportsScreenContent() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('performance');

  const tabs: TabItem[] = [
    {
      id: 'performance',
      label: 'Indicateurs',
      icon: 'speedometer-outline',
      description: 'KPIs clés',
    },
    {
      id: 'tendances',
      label: 'Tendances',
      icon: 'trending-up-outline',
      description: 'Évolution',
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'performance':
        return <PerformanceIndicatorsComponent />;
      case 'tendances':
        return <TendancesChartsComponent />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader
        icon="bar-chart"
        title="Rapports"
        subtitle="Indicateurs de performance et tendances"
      />

      <StandardTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
      />

      <View style={styles.content}>{renderContent()}</View>
      <ChatAgentFAB />
    </SafeAreaView>
  );
}

export default function ReportsScreen() {
  return (
    <ProtectedScreen requiredPermission="rapports">
      <ReportsScreenContent />
    </ProtectedScreen>
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
