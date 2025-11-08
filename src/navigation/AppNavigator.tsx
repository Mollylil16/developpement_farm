/**
 * Navigation principale de l'application
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, TouchableOpacity, Dimensions } from 'react-native';
import { SCREENS } from './types';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadProjetActif } from '../store/slices/projetSlice';
import { loadUserFromStorageThunk } from '../store/slices/authSlice';

// Import des écrans
import WelcomeScreen from '../screens/WelcomeScreen';
import AuthScreen from '../screens/AuthScreen';
import CreateProjectScreen from '../screens/CreateProjectScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ReproductionScreen from '../screens/ReproductionScreen';
import NutritionScreen from '../screens/NutritionScreen';
import FinanceScreen from '../screens/FinanceScreen';
import ReportsScreen from '../screens/ReportsScreen';
import PlanificationScreen from '../screens/PlanificationScreen';
import ParametresScreen from '../screens/ParametresScreen';
import CollaborationScreen from '../screens/CollaborationScreen';
import MortalitesScreen from '../screens/MortalitesScreen';
import ProductionScreen from '../screens/ProductionScreen';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Calculer la largeur de chaque onglet (5 onglets = 20% chacun)
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 5;

// Navigation par onglets - Variante 6D : Barre minimale avec 5 onglets essentiels
// Les autres modules (Nutrition, Planning, Collaboration, Mortalités) sont accessibles via le Dashboard
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 20,
          paddingTop: 4,
          paddingLeft: 0,
          paddingRight: 0,
          marginHorizontal: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 0,
          marginBottom: 0,
          lineHeight: 12,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 6,
        },
        tabBarItemStyle: {
          width: TAB_WIDTH,
          flex: 0,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 0,
          paddingHorizontal: 0,
          marginHorizontal: 0,
          height: '100%',
        },
        tabBarLabelPosition: 'below-icon',
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen
        name={SCREENS.DASHBOARD}
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name={SCREENS.REPRODUCTION}
        component={ReproductionScreen}
        options={{
          tabBarLabel: 'Reprod.',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🤰</Text>,
        }}
      />
      <Tab.Screen
        name={SCREENS.FINANCE}
        component={FinanceScreen}
        options={{
          tabBarLabel: 'Finance',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>💰</Text>,
        }}
      />
      <Tab.Screen
        name={SCREENS.REPORTS}
        component={ReportsScreen}
        options={{
          tabBarLabel: 'Rapports',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name={SCREENS.PARAMETRES}
        component={ParametresScreen}
        options={{
          tabBarLabel: 'Param.',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>⚙️</Text>,
        }}
      />
      {/* Modules accessibles via Dashboard : Nutrition, Planning, Collaboration, Mortalités */}
      <Tab.Screen
        name={SCREENS.NUTRITION}
        component={NutritionScreen}
        options={{
          tabBarButton: () => null, // Caché de la barre mais accessible via navigation
        }}
      />
      <Tab.Screen
        name={SCREENS.PLANIFICATION}
        component={PlanificationScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name={SCREENS.COLLABORATION}
        component={CollaborationScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name={SCREENS.MORTALITES}
        component={MortalitesScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name={SCREENS.PRODUCTION}
        component={ProductionScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

// Navigation principale avec stack pour gestion du projet
export default function AppNavigator() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const navigationRef = React.useRef<any>(null);

  useEffect(() => {
    // Charger l'utilisateur depuis le stockage au démarrage
    dispatch(loadUserFromStorageThunk());
  }, [dispatch]);

  useEffect(() => {
    // Charger le projet actif seulement si l'utilisateur est authentifié
    if (isAuthenticated && !authLoading) {
      dispatch(loadProjetActif());
    }
  }, [dispatch, isAuthenticated, authLoading]);

  useEffect(() => {
    // Attendre que l'authentification soit chargée avant de naviguer
    if (authLoading) {
      return;
    }

    // Navigation automatique basée sur l'état de l'authentification et du projet
    if (navigationRef.current) {
      if (isAuthenticated) {
        // Utilisateur connecté
        if (projetActif) {
          // Projet actif existant -> Accès direct à l'application
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } else {
          // Pas de projet -> Création de projet
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: SCREENS.CREATE_PROJECT }],
          });
        }
      } else {
        // Utilisateur non connecté -> Page de bienvenue
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: SCREENS.WELCOME }],
        });
      }
    }
  }, [isAuthenticated, projetActif, authLoading]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: ({ current, next, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
                opacity: current.progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.5, 1],
                }),
              },
            };
          },
          transitionSpec: {
            open: {
              animation: 'spring',
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
            close: {
              animation: 'spring',
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
          },
        }}
      >
        <Stack.Screen name={SCREENS.WELCOME} component={WelcomeScreen} />
        <Stack.Screen name={SCREENS.AUTH} component={AuthScreen} />
        <Stack.Screen name={SCREENS.CREATE_PROJECT} component={CreateProjectScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


