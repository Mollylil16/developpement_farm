/**
 * Écran Reproduction avec onglets - Design amélioré avec SafeAreaView
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import GestationsListComponent from '../components/GestationsListComponent';
import GestationsCalendarComponent from '../components/GestationsCalendarComponent';
import SevragesListComponent from '../components/SevragesListComponent';
import { FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function ReproductionScreen() {
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
          name="Gestations"
          component={GestationsListComponent}
          options={{
            title: 'Gestations',
          }}
        />
        <Tab.Screen
          name="Calendrier"
          component={GestationsCalendarComponent}
          options={{
            title: 'Calendrier',
          }}
        />
        <Tab.Screen
          name="Sevrages"
          component={SevragesListComponent}
          options={{
            title: 'Sevrages',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}
