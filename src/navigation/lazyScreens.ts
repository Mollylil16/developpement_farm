/**
 * Lazy-loaded screens
 * 
 * Tous les écrans sont chargés de manière lazy pour réduire le bundle initial
 * et améliorer les temps de démarrage
 */

import { lazy } from 'react';

// Écrans principaux (chargés au démarrage)
export const WelcomeScreen = lazy(() => import('../screens/WelcomeScreen'));
export const AuthScreen = lazy(() => import('../screens/AuthScreen'));
export const CreateProjectScreen = lazy(() => import('../screens/CreateProjectScreen'));

// Dashboards (chargés selon le rôle)
export const DashboardScreen = lazy(() => import('../screens/DashboardScreen'));
export const DashboardBuyerScreen = lazy(() => import('../screens/DashboardBuyerScreen'));
export const DashboardVetScreen = lazy(() => import('../screens/DashboardVetScreen'));
export const DashboardTechScreen = lazy(() => import('../screens/DashboardTechScreen'));

// Modules principaux
export const ProductionScreen = lazy(() => import('../screens/ProductionScreen'));
export const ReproductionScreen = lazy(() => import('../screens/ReproductionScreen'));
export const NutritionScreen = lazy(() => import('../screens/NutritionScreen'));
export const FinanceScreen = lazy(() => import('../screens/FinanceScreen'));
export const SanteScreen = lazy(() => import('../screens/SanteScreen'));
export const PlanningProductionScreen = lazy(() => import('../screens/PlanningProductionScreen'));
export const PlanificationScreen = lazy(() => import('../screens/PlanificationScreen'));
export const MortalitesScreen = lazy(() => import('../screens/MortalitesScreen'));

// Profil et paramètres
export const ProfilScreen = lazy(() => import('../screens/ProfilScreen'));
export const ParametresScreen = lazy(() => import('../screens/ParametresScreen'));
export const CollaborationScreen = lazy(() => import('../screens/CollaborationScreen'));

// Rapports et documents
export const ReportsScreen = lazy(() => import('../screens/ReportsScreen'));
export const DocumentsScreen = lazy(() => import('../screens/DocumentsScreen'));
export const RecordsScreen = lazy(() => import('../screens/RecordsScreen'));

// Admin
export const AdminScreen = lazy(() => import('../screens/AdminScreen'));

// Marketplace
export const MarketplaceScreen = lazy(() => import('../screens/marketplace/MarketplaceScreen'));
export const ChatScreen = lazy(() => import('../screens/marketplace/ChatScreen'));
export const ProducerOffersScreen = lazy(() => import('../screens/marketplace/ProducerOffersScreen'));

// Onboarding
export const OnboardingAuthScreen = lazy(() => import('../screens/OnboardingAuthScreen'));
export const ProfileSelectionScreen = lazy(() => import('../screens/ProfileSelectionScreen'));
export const BuyerInfoCompletionScreen = lazy(() => import('../screens/BuyerInfoCompletionScreen'));
export const VeterinarianInfoCompletionScreen = lazy(() => import('../screens/VeterinarianInfoCompletionScreen'));
export const VetProposeFarmsScreen = lazy(() => import('../screens/VetProposeFarmsScreen'));
export const ServiceProposalNotificationsScreen = lazy(() => import('../screens/ServiceProposalNotificationsScreen'));

// Rôles spécifiques
export const MyPurchasesScreen = lazy(() => import('../screens/MyPurchasesScreen'));
export const MyClientsScreen = lazy(() => import('../screens/MyClientsScreen'));
export const ConsultationsScreen = lazy(() => import('../screens/ConsultationsScreen'));
export const MyFarmsScreen = lazy(() => import('../screens/MyFarmsScreen'));
export const TasksScreen = lazy(() => import('../screens/TasksScreen'));

// Autres
export const CalculateurNavigationScreen = lazy(() => import('../screens/CalculateurNavigationScreen'));
export const TrainingScreen = lazy(() => import('../screens/TrainingScreen'));
export const VaccinationScreen = lazy(() => import('../screens/VaccinationScreen'));

