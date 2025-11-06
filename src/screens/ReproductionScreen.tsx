/**
 * Écran Reproduction avec onglets - Design amélioré avec SafeAreaView
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import GestationsListComponent from '../components/GestationsListComponent';
import GestationsCalendarComponent from '../components/GestationsCalendarComponent';
import SevragesListComponent from '../components/SevragesListComponent';
import { COLORS, FONT_SIZES } from '../constants/theme';

const Tab = createMaterialTopTabNavigator();

export default function ReproductionScreen() {
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
