/**
 * Lazy-loaded screens
 *
 * IMPORTANT: React.lazy() n'est pas supporté par React Native.
 * On utilise une approche alternative avec des imports conditionnels.
 *
 * Pour React Native, on charge tous les écrans normalement mais on peut
 * optimiser avec des imports dynamiques si nécessaire.
 */

// Écrans principaux
export { default as WelcomeScreen } from '../screens/WelcomeScreen'; // ✅ Déjà présent (ancien écran)
export { default as AuthScreen } from '../screens/AuthScreen';
export { default as CreateProjectScreen } from '../screens/CreateProjectScreen';

// Dashboards
export { default as DashboardScreen } from '../screens/DashboardScreen';
export { default as DashboardBuyerScreen } from '../screens/DashboardBuyerScreen';
export { default as DashboardVetScreen } from '../screens/DashboardVetScreen';
export { default as DashboardTechScreen } from '../screens/DashboardTechScreen';

// Modules principaux
export { default as ProductionScreen } from '../screens/ProductionScreen';
export { default as ReproductionScreen } from '../screens/ReproductionScreen';
export { default as NutritionScreen } from '../screens/NutritionScreen';
export { default as FinanceScreen } from '../screens/FinanceScreen';
export { default as SanteScreen } from '../screens/SanteScreen';
export { default as PlanningProductionScreen } from '../screens/PlanningProductionScreen';
export { default as PlanificationScreen } from '../screens/PlanificationScreen';
export { default as MortalitesScreen } from '../screens/MortalitesScreen';

// Profil et paramètres
export { default as ProfilScreen } from '../screens/ProfilScreen';
export { default as ParametresScreen } from '../screens/ParametresScreen';
export { default as CollaborationScreen } from '../screens/CollaborationScreen';

// Rapports et documents
export { default as ReportsScreen } from '../screens/ReportsScreen';
export { default as DocumentsScreen } from '../screens/DocumentsScreen';
export { default as RecordsScreen } from '../screens/RecordsScreen';

// Admin
export { default as AdminScreen } from '../screens/AdminScreen';

// Marketplace
export { default as MarketplaceScreen } from '../screens/marketplace/MarketplaceScreen';
export { default as ChatScreen } from '../screens/marketplace/ChatScreen';
export { default as ProducerOffersScreen } from '../screens/marketplace/ProducerOffersScreen';

// Agent conversationnel
export { default as ChatAgentScreen } from '../screens/ChatAgentScreen';

// Onboarding
export { default as OnboardingAuthScreen } from '../screens/OnboardingAuthScreen';
export { default as SignUpMethodScreen } from '../screens/SignUpMethodScreen'; // 🆕
export { default as PhoneSignUpScreen } from '../screens/PhoneSignUpScreen'; // 🆕
export { default as UserInfoScreen } from '../screens/UserInfoScreen'; // 🆕
export { default as SignInScreen } from '../screens/SignInScreen'; // 🆕
export { default as ProfileSelectionScreen } from '../screens/ProfileSelectionScreen';
export { default as OtpVerificationScreen } from '../screens/OtpVerificationScreen';
export { default as BuyerInfoCompletionScreen } from '../screens/BuyerInfoCompletionScreen';
export { default as VeterinarianInfoCompletionScreen } from '../screens/VeterinarianInfoCompletionScreen';
export { default as VetProposeFarmsScreen } from '../screens/VetProposeFarmsScreen';
export { default as ServiceProposalNotificationsScreen } from '../screens/ServiceProposalNotificationsScreen';

// Rôles spécifiques
export { default as MyPurchasesScreen } from '../screens/MyPurchasesScreen';
export { default as MyClientsScreen } from '../screens/MyClientsScreen';
export { default as ConsultationsScreen } from '../screens/ConsultationsScreen';
export { default as MyFarmsScreen } from '../screens/MyFarmsScreen';
export { default as TasksScreen } from '../screens/TasksScreen';

// Autres
export { default as CalculateurNavigationScreen } from '../screens/CalculateurNavigationScreen';
export { default as TrainingScreen } from '../screens/TrainingScreen';
export { default as VaccinationScreen } from '../screens/VaccinationScreen';

// Note: Les écrans de détails et d'ajout sont chargés dynamiquement
// lorsqu'ils sont nécessaires, pas besoin de les exporter ici
