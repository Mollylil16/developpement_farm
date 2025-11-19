/**
 * Écran de navigation pour le module Budgétisation Aliment
 * Contient 2 sous-sections : Ingrédients et Budgétisation Aliment
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import IngredientsComponent from '../components/IngredientsComponent';
import BudgetisationAlimentComponent from '../components/BudgetisationAlimentComponent';
import { FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function CalculateurNavigationScreen() {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
          height: 3,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: FONT_SIZES.sm,
          fontWeight: '600',
          textTransform: 'none',
        },
        tabBarPressColor: colors.primary + '20',
      }}
    >
      <Tab.Screen
        name="Ingredients"
        component={IngredientsComponent}
        options={{
          title: '📦 Ingrédients',
        }}
      />
      <Tab.Screen
        name="BudgetisationAliment"
        component={BudgetisationAlimentComponent}
        options={{
          title: '💰 Budgétisation',
        }}
      />
    </Tab.Navigator>
  );
}

