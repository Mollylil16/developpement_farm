/**
 * Écran Rapports avec onglets : Performance et Tendances
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import ProtectedScreen from '../components/ProtectedScreen';
import PerformanceIndicatorsComponent from '../components/PerformanceIndicatorsComponent';
import TendancesChartsComponent from '../components/TendancesChartsComponent';

const Tab = createMaterialTopTabNavigator();

function ReportsScreenContent() {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIndicatorStyle: {
            backgroundColor: colors.primary,
            height: 3,
            borderRadius: 2,
          },
          tabBarStyle: {
            backgroundColor: colors.background,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            borderBottomWidth: 0,
          },
          tabBarLabelStyle: {
            fontSize: FONT_SIZES.md,
            fontWeight: '600',
            textTransform: 'none',
            marginVertical: 0,
          },
          tabBarPressColor: colors.surface,
        }}
      >
        <Tab.Screen
          name="Performance"
          component={PerformanceIndicatorsComponent}
          options={{
            title: 'Indicateurs',
          }}
        />
        <Tab.Screen
          name="Tendances"
          component={TendancesChartsComponent}
          options={{
            title: 'Tendances',
          }}
        />
      </Tab.Navigator>
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
});

