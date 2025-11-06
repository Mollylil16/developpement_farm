/**
 * Écran Nutrition avec onglets
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import RationCalculatorComponent from '../components/RationCalculatorComponent';
import RationsHistoryComponent from '../components/RationsHistoryComponent';
import { COLORS, FONT_SIZES } from '../constants/theme';

const Tab = createMaterialTopTabNavigator();

export default function NutritionScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarIndicatorStyle: {
          backgroundColor: COLORS.primary,
        },
        tabBarStyle: {
          backgroundColor: COLORS.background,
        },
        tabBarLabelStyle: {
          fontSize: FONT_SIZES.sm,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Calculateur"
        component={RationCalculatorComponent}
        options={{
          title: 'Calculateur',
        }}
      />
      <Tab.Screen
        name="Historique"
        component={RationsHistoryComponent}
        options={{
          title: 'Historique',
        }}
      />
    </Tab.Navigator>
  );
}
