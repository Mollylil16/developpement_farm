/**
 * Écran Finance avec onglets - Design amélioré avec SafeAreaView
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import FinanceGraphiquesComponent from '../components/FinanceGraphiquesComponent';
import FinanceChargesFixesComponent from '../components/FinanceChargesFixesComponent';
import FinanceDepensesComponent from '../components/FinanceDepensesComponent';
import FinanceRevenusComponent from '../components/FinanceRevenusComponent';
import { FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function FinanceScreen() {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIndicatorStyle: {
            backgroundColor: colors.primary,
            height: 3,
          },
          tabBarStyle: {
            backgroundColor: colors.background,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontSize: FONT_SIZES.sm,
            fontWeight: '600',
            textTransform: 'none',
          },
        }}
      >
        <Tab.Screen
          name="VueEnsemble"
          component={FinanceGraphiquesComponent}
          options={{
            title: 'Vue d\'ensemble',
          }}
        />
        <Tab.Screen
          name="ChargesFixes"
          component={FinanceChargesFixesComponent}
          options={{
            title: 'Charges Fixes',
          }}
        />
        <Tab.Screen
          name="Depenses"
          component={FinanceDepensesComponent}
          options={{
            title: 'Dépenses',
          }}
        />
        <Tab.Screen
          name="Revenus"
          component={FinanceRevenusComponent}
          options={{
            title: 'Revenus',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}
