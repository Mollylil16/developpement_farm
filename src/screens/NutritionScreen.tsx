/**
 * Écran Nutrition avec onglets
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import RationCalculatorComponent from '../components/RationCalculatorComponent';
import RationsHistoryComponent from '../components/RationsHistoryComponent';
import NutritionStockComponent from '../components/NutritionStockComponent';
import { FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function NutritionScreen() {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
        },
        tabBarStyle: {
          backgroundColor: colors.background,
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
        name="Stocks"
        component={NutritionStockComponent}
        options={{
          title: 'Stocks',
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
    </SafeAreaView>
  );
}
