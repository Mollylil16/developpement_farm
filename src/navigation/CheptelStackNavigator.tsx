/**
 * Stack Navigator pour gérer Cheptel et Historique
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProductionCheptelComponent from '../components/ProductionCheptelComponent';
import ProductionHistoriqueComponent from '../components/ProductionHistoriqueComponent';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator();

export default function CheptelStackNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        cardStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="CheptelList"
        component={ProductionCheptelComponent}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Historique"
        component={ProductionHistoriqueComponent}
        options={{
          title: 'Historique',
        }}
      />
    </Stack.Navigator>
  );
}
