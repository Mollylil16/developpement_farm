/**
 * Écran Planification avec onglets
 */

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import PlanificationListComponent from '../components/PlanificationListComponent';
import PlanificationCalendarComponent from '../components/PlanificationCalendarComponent';
import ProtectedScreen from '../components/ProtectedScreen';
import { FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createMaterialTopTabNavigator();

function PlanificationScreenContent() {
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
    </SafeAreaView>
  );
}

export default function PlanificationScreen() {
  return (
    <ProtectedScreen requiredPermission="planification">
      <PlanificationScreenContent />
    </ProtectedScreen>
  );
}

