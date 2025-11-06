/**
 * Écran Planification avec onglets
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import PlanificationListComponent from '../components/PlanificationListComponent';
import PlanificationCalendarComponent from '../components/PlanificationCalendarComponent';
import { COLORS, FONT_SIZES } from '../constants/theme';

const Tab = createMaterialTopTabNavigator();

export default function PlanificationScreen() {
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
        name="Liste"
        component={PlanificationListComponent}
        options={{
          title: 'Liste',
        }}
      />
      <Tab.Screen
        name="Calendrier"
        component={PlanificationCalendarComponent}
        options={{
          title: 'Calendrier',
        }}
      />
    </Tab.Navigator>
  );
}

