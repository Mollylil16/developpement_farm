/**
 * Navigation principale de l'application
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, TouchableOpacity, Dimensions, ActivityIndicator, View } from 'react-native';
import { SCREENS } from './types';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadProjetActif } from '../store/slices/projetSlice';
import {
  loadCollaborateurActuel,
  clearCollaborateurActuel,
  loadInvitationsEnAttente,
} from '../store/slices/collaborationSlice';
import { loadUserFromStorageThunk } from '../store/slices/authSlice';
import { useRole } from '../contexts/RoleContext';
import { useRolePermissions } from '../hooks/useRolePermissions';
import LoadingSpinner from '../components/LoadingSpinner';
import NotificationsManager from '../components/NotificationsManager';
// Import direct des écrans (React.lazy() n'est pas supporté par React Native)
import * as LazyScreens from './lazyScreens';

import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Calculer la largeur de chaque onglet (5 onglets = 20% chacun)
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 5;

// Navigation par onglets - Variante 6D : Barre minimale avec 5 onglets essentiels
// Les autres modules (Nutrition, Planning, Collaboration, Mortalités) sont accessibles via le Dashboard
// 🆕 ADAPTÉE pour supporter les différents rôles (Producteur, Acheteur, Vétérinaire, Technicien)
function MainTabs() {
  const { activeRole, availableRoles } = useRole();
  const rolePermissions = useRolePermissions();
  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const currentUser = useAppSelector((state) => state.auth.user);
  const collaborateurActuel = useAppSelector((state) => state.collaboration.collaborateurActuel);
  
  // Helper pour vérifier les permissions par module (compatibilité avec l'ancien système)
  const hasPermission = (module: string): boolean => {
    if (activeRole === 'producer') {
      // Pour les producteurs, tous les modules sont accessibles
      return true;
    }
    
    // Pour technicien et vétérinaire, vérifier les permissions de collaboration
    if ((activeRole === 'technician' || activeRole === 'veterinarian') && collaborateurActuel?.permissions) {
      // Vérifier les permissions spécifiques à la ferme via la collaboration
      switch (module) {
        case 'reproduction':
          return collaborateurActuel.permissions.reproduction ?? false;
        case 'nutrition':
          return collaborateurActuel.permissions.nutrition ?? false;
        case 'planification':
          return collaborateurActuel.permissions.planification ?? false;
        case 'mortalites':
          return collaborateurActuel.permissions.mortalites ?? false;
        case 'finance':
          return collaborateurActuel.permissions.finance ?? false;
        case 'rapports':
          return collaborateurActuel.permissions.rapports ?? false; // Permission spécifique à la ferme
        case 'sante':
          return collaborateurActuel.permissions.sante ?? false;
        default:
          return false;
      }
    }
    
    // Pour les autres rôles, utiliser les permissions spécifiques
    switch (module) {
      case 'reproduction':
      case 'nutrition':
      case 'planification':
      case 'mortalites':
        return rolePermissions.canViewHerd;
      case 'finance':
        return rolePermissions.canViewFinances;
      case 'rapports':
        return rolePermissions.canGenerateReports;
      case 'sante':
        return rolePermissions.canViewHealthRecords;
      default:
        return false;
    }
  };
  
  // Vérifier si l'utilisateur est propriétaire du projet actif
  const isProprietaire = activeRole === 'producer' && 
    projetActif && 
    currentUser && 
    (projetActif.proprietaire_id === currentUser.id || (projetActif as any).user_id === currentUser.id);

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
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
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
      {/* Dashboard - Adaptatif selon le rôle */}
      {activeRole === 'producer' && (
        <Tab.Screen
          name={SCREENS.DASHBOARD}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🏠</Text>,
          }}
        >
          {() => <LazyScreens.DashboardScreen />}
        </Tab.Screen>
      )}
      {activeRole === 'buyer' && (
        <Tab.Screen
          name={SCREENS.DASHBOARD_BUYER}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🏠</Text>,
          }}
        >
          {() => (
            <LazyScreens.DashboardBuyerScreen />
          )}
        </Tab.Screen>
      )}
      {activeRole === 'veterinarian' && (
        <Tab.Screen
          name={SCREENS.DASHBOARD_VET}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🏠</Text>,
          }}
        >
          {() => (
            <LazyScreens.DashboardVetScreen />
          )}
        </Tab.Screen>
      )}
      {activeRole === 'technician' && (
        <Tab.Screen
          name={SCREENS.DASHBOARD_TECH}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🏠</Text>,
          }}
        >
          {() => (
            <LazyScreens.DashboardTechScreen />
          )}
        </Tab.Screen>
      )}

      {/* Reproduction - Visible si permission reproduction */}
      {hasPermission('reproduction') && (
        <Tab.Screen
          name={SCREENS.REPRODUCTION}
          options={{
            tabBarLabel: 'Reprod.',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🤰</Text>,
          }}
        >
          {() => (
            <LazyScreens.ReproductionScreen />
          )}
        </Tab.Screen>
      )}

      {/* Finance - Visible si permission finance */}
      {hasPermission('finance') && (
        <Tab.Screen
          name={SCREENS.FINANCE}
          options={{
            tabBarLabel: 'Finance',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>💰</Text>,
          }}
        >
          {() => (
            <LazyScreens.FinanceScreen />
          )}
        </Tab.Screen>
      )}

      {/* Rapports - Visible si permission rapports */}
      {hasPermission('rapports') && (
        <Tab.Screen
          name={SCREENS.REPORTS}
          options={{
            tabBarLabel: 'Rapports',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📊</Text>,
          }}
        >
          {() => (
            <LazyScreens.ReportsScreen />
          )}
        </Tab.Screen>
      )}

      {/* Marketplace - Visible uniquement si permission d'accès */}
      {rolePermissions.canAccessMarketplace && (
        <Tab.Screen
          name={SCREENS.MARKETPLACE}
          options={{
            tabBarLabel: 'Marketplace',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🏪</Text>,
          }}
        >
          {() => (
            <LazyScreens.MarketplaceScreen />
          )}
        </Tab.Screen>
      )}
      {/* Modules accessibles via Dashboard : Nutrition, Planning, Collaboration, Mortalités, Production */}
      {/* Ces écrans sont cachés de la barre mais accessibles via navigation si permission accordée */}

      {/* Nutrition - Accessible si permission nutrition */}
      {hasPermission('nutrition') && (
        <Tab.Screen
          name={SCREENS.NUTRITION}
          options={{
            tabBarButton: () => <></>, // Caché de la barre mais accessible via navigation
          }}
        >
          {() => (
            <LazyScreens.NutritionScreen />
          )}
        </Tab.Screen>
      )}

      {/* Planning Production - Accessible si permission planification */}
      {hasPermission('planification') && (
        <Tab.Screen
          name={SCREENS.PLANIFICATION}
          options={{
            tabBarButton: () => <></>,
          }}
        >
          {() => (
            <LazyScreens.PlanningProductionScreen />
          )}
        </Tab.Screen>
      )}

      {/* Collaboration - Accessible seulement au propriétaire */}
      {isProprietaire && (
        <Tab.Screen
          name={SCREENS.COLLABORATION}
          options={{
            tabBarButton: () => <></>,
          }}
        >
          {() => (
            <LazyScreens.CollaborationScreen />
          )}
        </Tab.Screen>
      )}

      {/* Mortalités - Accessible si permission mortalites */}
      {hasPermission('mortalites') && (
        <Tab.Screen
          name={SCREENS.MORTALITES}
          options={{
            tabBarButton: () => <></>,
          }}
        >
          {() => (
            <LazyScreens.MortalitesScreen />
          )}
        </Tab.Screen>
      )}

      {/* Production - Toujours accessible (pas de permission spécifique pour l'instant) */}
      <Tab.Screen
        name={SCREENS.PRODUCTION}
        options={{
          tabBarButton: () => <></>,
        }}
      >
        {() => (
          <LazyScreens.ProductionScreen />
        )}
      </Tab.Screen>

      {/* Santé - Accessible si permission sante */}
      {hasPermission('sante') && (
        <Tab.Screen
          name={SCREENS.SANTE}
          options={{
            tabBarButton: () => <></>,
          }}
        >
          {() => (
            <LazyScreens.SanteScreen />
          )}
        </Tab.Screen>
      )}

      {/* Paramètres - Accessible via menu profil (caché de la barre) */}
      <Tab.Screen
        name={SCREENS.PARAMETRES}
        options={{
          tabBarButton: () => <></>,
        }}
      >
        {() => (
          <LazyScreens.ParametresScreen />
        )}
      </Tab.Screen>

      {/* Marketplace Chat - Accessible via navigation */}
      <Tab.Screen
        name={SCREENS.MARKETPLACE_CHAT}
        options={{
          tabBarButton: () => <></>,
        }}
      >
        {() => (
          <LazyScreens.ChatScreen />
        )}
      </Tab.Screen>
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

  // Note: usePreloadScreens() supprimé car React.lazy() n'est pas supporté par React Native
  // Les écrans sont maintenant chargés directement via des imports statiques

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

  // Utiliser useRef pour éviter de charger plusieurs fois le collaborateur
  const collaborateurChargeRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Charger le collaborateur actuel quand le projet actif change
    if (isAuthenticated && user && projetActif) {
      const cle = `${user.id}-${projetActif.id}`;
      if (collaborateurChargeRef.current !== cle) {
        dispatch(loadCollaborateurActuel({ userId: user.id, projetId: projetActif.id }));
        collaborateurChargeRef.current = cle;
      }
    } else if (!projetActif) {
      // Si pas de projet actif, effacer le collaborateur actuel
      dispatch(clearCollaborateurActuel());
      collaborateurChargeRef.current = null;
    }
  }, [dispatch, isAuthenticated, user?.id, projetActif?.id]);

  // Utiliser useRef pour éviter de charger plusieurs fois les invitations
  const invitationsChargeesRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Charger les invitations en attente quand l'utilisateur est authentifié
    if (isAuthenticated && user) {
      const cle = `${user.id}-${user.email || ''}`;
      if (invitationsChargeesRef.current !== cle) {
        dispatch(
          loadInvitationsEnAttente({
            userId: user.id,
            email: user.email || undefined,
          })
        );
        invitationsChargeesRef.current = cle;
      }
    } else {
      invitationsChargeesRef.current = null;
    }
  }, [dispatch, isAuthenticated, user?.id, user?.email]);

  useEffect(() => {
    if (authLoading || !navigationRef.current) {
      return;
    }

    let targetRoute: string;
    if (isAuthenticated && user) {
      // Si l'utilisateur a un projet actif, aller au Dashboard
      if (projetActif) {
        targetRoute = 'Main';
      }
      // Si l'utilisateur a des invitations en attente, aller à CreateProjectScreen
      // (qui affichera le modal d'invitations)
      else if (invitationsEnAttente.length > 0) {
        targetRoute = SCREENS.CREATE_PROJECT;
      }
      // Sinon, créer un projet
      else {
        targetRoute = SCREENS.CREATE_PROJECT;
      }
    } else if (isAuthenticated && !user) {
      // Utilisateur authentifié mais pas encore chargé - ne rien faire, attendre
      return;
    } else {
      targetRoute = SCREENS.WELCOME;
    }

    // Toujours naviguer si on change d'état d'authentification ou de projet
    // ou si on est actuellement sur AUTH et qu'on devrait être ailleurs
    const currentRoute = navigationRef.current?.getCurrentRoute()?.name;
    const shouldNavigate =
      lastRouteRef.current !== targetRoute ||
      (currentRoute === SCREENS.AUTH && targetRoute !== SCREENS.AUTH);

    if (shouldNavigate) {
      console.log(
        '🚀 Navigation vers:',
        targetRoute,
        '(depuis:',
        lastRouteRef.current || currentRoute,
        ')'
      );
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
  }, [isAuthenticated, user, projetActif?.id, authLoading, invitationsEnAttente.length]);

  return (
    <NavigationContainer ref={navigationRef}>
      <NotificationsManager />
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
        <Stack.Screen name={SCREENS.WELCOME}>
          {() => (
            <LazyScreens.WelcomeScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.AUTH}>
          {() => (
            <LazyScreens.AuthScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.CREATE_PROJECT}>
          {() => (
            <LazyScreens.CreateProjectScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.PROFIL}>
          {() => (
            <LazyScreens.ProfilScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.DOCUMENTS}>
          {() => (
            <LazyScreens.DocumentsScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.ADMIN} options={{ headerShown: false }}>
          {() => (
            <LazyScreens.AdminScreen />
          )}
        </Stack.Screen>
        {/* 🆕 Écrans d'onboarding */}
        <Stack.Screen name={SCREENS.ONBOARDING_AUTH}>
          {() => (
            <LazyScreens.OnboardingAuthScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.PROFILE_SELECTION}>
          {() => (
            <LazyScreens.ProfileSelectionScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.BUYER_INFO_COMPLETION}>
          {() => (
            <LazyScreens.BuyerInfoCompletionScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.VETERINARIAN_INFO_COMPLETION}>
          {() => (
            <LazyScreens.VeterinarianInfoCompletionScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.VET_PROPOSE_FARMS}>
          {() => (
            <LazyScreens.VetProposeFarmsScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.SERVICE_PROPOSAL_NOTIFICATIONS}>
          {() => (
            <LazyScreens.ServiceProposalNotificationsScreen />
          )}
        </Stack.Screen>
        {/* 🆕 Écrans spécifiques aux rôles */}
        <Stack.Screen name={SCREENS.MY_PURCHASES}>
          {() => (
            <LazyScreens.MyPurchasesScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.MY_CLIENTS}>
          {() => (
            <LazyScreens.MyClientsScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.CONSULTATIONS}>
          {() => (
            <LazyScreens.ConsultationsScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.MY_FARMS}>
          {() => (
            <LazyScreens.MyFarmsScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.TASKS}>
          {() => (
            <LazyScreens.TasksScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.RECORDS}>
          {() => (
            <LazyScreens.RecordsScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name={SCREENS.OFFERS}>
          {() => (
            <LazyScreens.MarketplaceScreen />
          )}
        </Stack.Screen>
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

