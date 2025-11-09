/**
 * Écran Production avec deux sous-menus : Pesées et Estimations
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductionCheptelComponent from '../components/ProductionCheptelComponent';
import ProductionAnimalsListComponent from '../components/ProductionAnimalsListComponent';
import ProductionEstimationsComponent from '../components/ProductionEstimationsComponent';
import { FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function ProductionScreen() {
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
          name="Cheptel"
          component={ProductionCheptelComponent}
          options={{
            title: 'Cheptel',
          }}
        />
        <Tab.Screen
          name="Pesées"
          component={ProductionAnimalsListComponent}
          options={{
            title: 'Suivi des pesées',
          }}
        />
        <Tab.Screen
          name="Estimations"
          component={ProductionEstimationsComponent}
          options={{
            title: 'Estimations',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

