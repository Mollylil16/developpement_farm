/**
 * Lazy-loaded screens avec code splitting
 *
 * IMPORTANT: React.lazy() n'est pas supporté par React Native.
 * On utilise une approche alternative avec des composants wrapper
 * qui chargent les écrans seulement quand ils sont rendus.
 *
 * Stratégie:
 * - Écrans critiques: chargés immédiatement (Dashboard, Production, etc.)
 * - Écrans secondaires: chargés à la demande (Admin, Training, etc.)
 */

import React, { ComponentType, useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';

// ============================================
// Helper: Composant wrapper pour lazy loading
// ============================================
function createLazyScreen<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
): T {
  const LazyComponent = React.forwardRef<any, any>((props, ref) => {
    const [ScreenComponent, setScreenComponent] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      let isMounted = true;

      importFn()
        .then((module) => {
          if (isMounted) {
            setScreenComponent(() => module.default);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err);
            setLoading(false);
            console.error('Erreur lors du chargement de l\'écran:', err);
          }
        });

      return () => {
        isMounted = false;
      };
    }, []);

    if (loading) {
      return fallback || (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LoadingSpinner message="Chargement..." />
        </View>
      );
    }

    if (error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <LoadingSpinner message="Erreur de chargement. Veuillez réessayer." />
        </View>
      );
    }

    if (!ScreenComponent) {
      return null;
    }

    return <ScreenComponent {...props} ref={ref} />;
  }) as T;

  LazyComponent.displayName = `LazyScreen(${importFn.name || 'Unknown'})`;

  return LazyComponent;
}

// ============================================
// ÉCRANS CRITIQUES: Chargés immédiatement
// ============================================
// Ces écrans sont utilisés fréquemment et doivent être disponibles rapidement

export { default as WelcomeScreen } from '../screens/WelcomeScreen';
export { default as AuthScreen } from '../screens/AuthScreen';
export { default as CreateProjectScreen } from '../screens/CreateProjectScreen';

// Dashboards (écrans principaux)
export { default as DashboardScreen } from '../screens/DashboardScreen';
export { default as DashboardBuyerScreen } from '../screens/DashboardBuyerScreen';
export { default as DashboardVetScreen } from '../screens/DashboardVetScreen';
export { default as DashboardTechScreen } from '../screens/DashboardTechScreen';

// Modules principaux (utilisés quotidiennement)
export { default as ProductionScreen } from '../screens/ProductionScreen';
export { default as ReproductionScreen } from '../screens/ReproductionScreen';
export { default as NutritionScreen } from '../screens/NutritionScreen';
export { default as FinanceScreen } from '../screens/FinanceScreen';
export { default as SanteScreen } from '../screens/SanteScreen';
export { default as PlanningProductionScreen } from '../screens/PlanningProductionScreen';
export { default as PlanificationScreen } from '../screens/PlanificationScreen';
export { default as MortalitesScreen } from '../screens/MortalitesScreen';

// Profil et paramètres (accès fréquent)
export { default as ProfilScreen } from '../screens/ProfilScreen';
export { default as ParametresScreen } from '../screens/ParametresScreen';
export { default as CollaborationScreen } from '../screens/CollaborationScreen';

// Rapports (utilisés régulièrement)
export { default as ReportsScreen } from '../screens/ReportsScreen';
export { default as RecordsScreen } from '../screens/RecordsScreen';

// Marketplace (fonctionnalité principale)
export { default as MarketplaceScreen } from '../screens/marketplace/MarketplaceScreen';
export { default as ChatScreen } from '../screens/marketplace/ChatScreen';
export { default as ProducerOffersScreen } from '../screens/marketplace/ProducerOffersScreen';

// Onboarding et authentification (écrans de démarrage)
export { default as OnboardingAuthScreen } from '../screens/OnboardingAuthScreen';
export { default as SignUpMethodScreen } from '../screens/SignUpMethodScreen';
export { default as PhoneSignUpScreen } from '../screens/PhoneSignUpScreen';
export { default as UserInfoScreen } from '../screens/UserInfoScreen';
export { default as SignInScreen } from '../screens/SignInScreen';
export { default as ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
export { default as ResetPasswordScreen } from '../screens/ResetPasswordScreen';
export { default as ProfileSelectionScreen } from '../screens/ProfileSelectionScreen';
export { default as OtpVerificationScreen } from '../screens/OtpVerificationScreen';
export { default as BuyerInfoCompletionScreen } from '../screens/BuyerInfoCompletionScreen';
export { default as VeterinarianInfoCompletionScreen } from '../screens/VeterinarianInfoCompletionScreen';
export { default as VetProposeFarmsScreen } from '../screens/VetProposeFarmsScreen';
export { default as ServiceProposalNotificationsScreen } from '../screens/ServiceProposalNotificationsScreen';

// Rôles spécifiques (utilisés selon le rôle)
export { default as MyPurchasesScreen } from '../screens/MyPurchasesScreen';
export { default as MyClientsScreen } from '../screens/MyClientsScreen';
export { default as ConsultationsScreen } from '../screens/ConsultationsScreen';
export { default as MyFarmsScreen } from '../screens/MyFarmsScreen';
export { default as TasksScreen } from '../screens/TasksScreen';

// ============================================
// ÉCRANS SECONDAIRES: Chargés à la demande
// ============================================
// Ces écrans sont moins utilisés et peuvent être chargés seulement quand nécessaire

// Admin (utilisé rarement, seulement par les admins)
export const AdminScreen = createLazyScreen(
  () => import('../screens/AdminScreen')
);

// Documents (utilisé occasionnellement)
export const DocumentsScreen = createLazyScreen(
  () => import('../screens/DocumentsScreen')
);

// Agent conversationnel (fonctionnalité optionnelle)
export const ChatAgentScreen = createLazyScreen(
  () => import('../screens/ChatAgentScreen')
);

// Calculateur (outil secondaire)
export const CalculateurNavigationScreen = createLazyScreen(
  () => import('../screens/CalculateurNavigationScreen')
);

// Training (formation, utilisé rarement)
export const TrainingScreen = createLazyScreen(
  () => import('../screens/TrainingScreen')
);

// Vaccination (écran dédié, peut être chargé à la demande si SanteScreen est principal)
export const VaccinationScreen = createLazyScreen(
  () => import('../screens/VaccinationScreen')
);

// Note: Les écrans de détails et d'ajout sont chargés dynamiquement
// lorsqu'ils sont nécessaires, pas besoin de les exporter ici
