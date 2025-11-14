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
import { loadCollaborateurActuel, clearCollaborateurActuel, loadInvitationsEnAttente } from '../store/slices/collaborationSlice';
import { loadUserFromStorageThunk } from '../store/slices/authSlice';
import { usePermissions } from '../hooks/usePermissions';

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
import AdminScreen from '../screens/AdminScreen';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Calculer la largeur de chaque onglet (5 onglets = 20% chacun)
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 5;

// Navigation par onglets - Variante 6D : Barre minimale avec 5 onglets essentiels
// Les autres modules (Nutrition, Planning, Collaboration, Mortalités) sont accessibles via le Dashboard
function MainTabs() {
  const { hasPermission, isProprietaire } = usePermissions();

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
      {/* Dashboard - Toujours visible */}
      <Tab.Screen
        name={SCREENS.DASHBOARD}
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🏠</Text>,
        }}
      />
      
      {/* Reproduction - Visible si permission reproduction */}
      {hasPermission('reproduction') && (
        <Tab.Screen
          name={SCREENS.REPRODUCTION}
          component={ReproductionScreen}
          options={{
            tabBarLabel: 'Reprod.',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🤰</Text>,
          }}
        />
      )}
      
      {/* Finance - Visible si permission finance */}
      {hasPermission('finance') && (
        <Tab.Screen
          name={SCREENS.FINANCE}
          component={FinanceScreen}
          options={{
            tabBarLabel: 'Finance',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>💰</Text>,
          }}
        />
      )}
      
      {/* Rapports - Visible si permission rapports */}
      {hasPermission('rapports') && (
        <Tab.Screen
          name={SCREENS.REPORTS}
          component={ReportsScreen}
          options={{
            tabBarLabel: 'Rapports',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📊</Text>,
          }}
        />
      )}
      
      {/* Paramètres - Toujours visible */}
      <Tab.Screen
        name={SCREENS.PARAMETRES}
        component={ParametresScreen}
        options={{
          tabBarLabel: 'Param.',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>⚙️</Text>,
        }}
      />
      {/* Modules accessibles via Dashboard : Nutrition, Planning, Collaboration, Mortalités, Production */}
      {/* Ces écrans sont cachés de la barre mais accessibles via navigation si permission accordée */}
      
      {/* Nutrition - Accessible si permission nutrition */}
      {hasPermission('nutrition') && (
        <Tab.Screen
          name={SCREENS.NUTRITION}
          component={NutritionScreen}
          options={{
            tabBarButton: () => null, // Caché de la barre mais accessible via navigation
          }}
        />
      )}
      
      {/* Planification - Accessible si permission planification */}
      {hasPermission('planification') && (
        <Tab.Screen
          name={SCREENS.PLANIFICATION}
          component={PlanificationScreen}
          options={{
            tabBarButton: () => null,
          }}
        />
      )}
      
      {/* Collaboration - Accessible seulement au propriétaire */}
      {isProprietaire && (
        <Tab.Screen
          name={SCREENS.COLLABORATION}
          component={CollaborationScreen}
          options={{
            tabBarButton: () => null,
          }}
        />
      )}
      
      {/* Mortalités - Accessible si permission mortalites */}
      {hasPermission('mortalites') && (
        <Tab.Screen
          name={SCREENS.MORTALITES}
          component={MortalitesScreen}
          options={{
            tabBarButton: () => null,
          }}
        />
      )}
      
      {/* Production - Toujours accessible (pas de permission spécifique pour l'instant) */}
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
  const { isAuthenticated, isLoading: authLoading, user } = useAppSelector((state) => state.auth);
  const { invitationsEnAttente } = useAppSelector((state) => state.collaboration);
  const navigationRef = React.useRef<any>(null);
  const lastRouteRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Charger l'utilisateur depuis le stockage au démarrage
    dispatch(loadUserFromStorageThunk());
  }, [dispatch]);

  useEffect(() => {
    // Charger le projet actif seulement si l'utilisateur est authentifié
    if (isAuthenticated && !authLoading) {
      console.log('🔄 Chargement du projet actif...');
      dispatch(loadProjetActif());
    }
  }, [dispatch, isAuthenticated, authLoading]);

  useEffect(() => {
    // Charger le collaborateur actuel quand le projet actif change
    if (isAuthenticated && user && projetActif) {
      console.log('🔄 Chargement du collaborateur actuel pour le projet:', projetActif.id);
      dispatch(loadCollaborateurActuel({ userId: user.id, projetId: projetActif.id }));
    } else if (!projetActif) {
      // Si pas de projet actif, effacer le collaborateur actuel
      dispatch(clearCollaborateurActuel());
    }
  }, [dispatch, isAuthenticated, user?.id, projetActif?.id]);

  useEffect(() => {
    // Charger les invitations en attente quand l'utilisateur est authentifié
    if (isAuthenticated && user) {
      console.log('🔄 Chargement des invitations en attente pour:', user.id);
      dispatch(loadInvitationsEnAttente({ 
        userId: user.id, 
        email: user.email || undefined 
      }));
    }
  }, [dispatch, isAuthenticated, user?.id, user?.email]);

  useEffect(() => {
    if (authLoading || !navigationRef.current) {
      console.log('⏳ En attente... authLoading:', authLoading, 'navigationRef:', !!navigationRef.current);
      return;
    }

    let targetRoute: string;
    if (isAuthenticated) {
      // Si l'utilisateur a un projet actif, aller au Dashboard
      if (projetActif) {
        targetRoute = 'Main';
      } 
      // Si l'utilisateur a des invitations en attente, aller à CreateProjectScreen
      // (qui affichera le modal d'invitations)
      else if (invitationsEnAttente.length > 0) {
        targetRoute = SCREENS.CREATE_PROJECT;
        console.log('📬 Utilisateur a des invitations en attente, redirection vers CreateProject pour afficher les invitations');
      }
      // Sinon, créer un projet
      else {
        targetRoute = SCREENS.CREATE_PROJECT;
      }
      console.log('✅ Utilisateur authentifié. Projet actif:', projetActif?.nom || 'aucun', 'Invitations:', invitationsEnAttente.length, '→ Route:', targetRoute);
    } else {
      targetRoute = SCREENS.WELCOME;
      console.log('❌ Utilisateur non authentifié → Route:', targetRoute);
    }

    // Toujours naviguer si on change d'état d'authentification ou de projet
    // ou si on est actuellement sur AUTH et qu'on devrait être ailleurs
    const currentRoute = navigationRef.current?.getCurrentRoute()?.name;
    const shouldNavigate = 
      lastRouteRef.current !== targetRoute || 
      (currentRoute === SCREENS.AUTH && targetRoute !== SCREENS.AUTH);

    if (shouldNavigate) {
      console.log('🚀 Navigation vers:', targetRoute, '(depuis:', lastRouteRef.current || currentRoute, ')');
      try {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        });
        lastRouteRef.current = targetRoute;
      } catch (error) {
        console.error('❌ Erreur lors de la navigation:', error);
      }
    } else {
      console.log('⏸️ Pas de changement de route nécessaire');
    }
  }, [isAuthenticated, projetActif, authLoading, invitationsEnAttente.length]);

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
        <Stack.Screen name={SCREENS.ADMIN} component={AdminScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


