/**
 * Écran Finance avec onglets - Design amélioré avec SafeAreaView
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import FinanceGraphiquesComponent from '../components/FinanceGraphiquesComponent';
import FinanceChargesFixesComponent from '../components/FinanceChargesFixesComponent';
import FinanceDepensesComponent from '../components/FinanceDepensesComponent';
import { COLORS, FONT_SIZES } from '../constants/theme';

const Tab = createMaterialTopTabNavigator();

export default function FinanceScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top', 'bottom']}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarIndicatorStyle: {
            backgroundColor: COLORS.primary,
            height: 3,
          },
          tabBarStyle: {
            backgroundColor: COLORS.background,
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
      </Tab.Navigator>
    </SafeAreaView>
  );
}
