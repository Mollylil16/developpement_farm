/**
 * Écran Nutrition avec onglets
 * Module Budgétisation divisé en 2 sous-sections (Ingrédients + Budgétisation Aliment)
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalculateurNavigationScreen from './CalculateurNavigationScreen';
import NutritionStockComponent from '../components/NutritionStockComponent';
import StockMouvementsHistoryComponent from '../components/StockMouvementsHistoryComponent';
import ProtectedScreen from '../components/ProtectedScreen';
import { FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createMaterialTopTabNavigator();

function NutritionScreenContent() {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
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
          elevation: 4,
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
        tabBarScrollEnabled: true,
        tabBarItemStyle: {
          width: 'auto',
          minWidth: 100,
        },
      }}
    >
      <Tab.Screen
        name="Budgetisation"
        component={CalculateurNavigationScreen}
        options={{
          title: '💰 Budgétisation',
        }}
      />
      <Tab.Screen
        name="Stocks"
        component={NutritionStockComponent}
        options={{
          title: '📦 Stocks',
        }}
      />
      <Tab.Screen
        name="Mouvements Stock"
        component={StockMouvementsHistoryComponent}
        options={{
          title: '📊 Mouvements',
        }}
      />
    </Tab.Navigator>
    </SafeAreaView>
  );
}

export default function NutritionScreen() {
  return (
    <ProtectedScreen requiredPermission="nutrition">
      <NutritionScreenContent />
    </ProtectedScreen>
  );
}
