/**
 * Configuration de la navigation
 */

export const SCREENS = {
  WELCOME: 'Welcome',
  AUTH: 'Auth',
  CREATE_PROJECT: 'CreateProject',
  DASHBOARD: 'Dashboard',
  DASHBOARD_BUYER: 'DashboardBuyer',
  DASHBOARD_VET: 'DashboardVet',
  DASHBOARD_TECH: 'DashboardTech',
  PROFIL: 'Profil',
  REPRODUCTION: 'Reproduction',
  NUTRITION: 'Nutrition',
  PRODUCTION: 'Production',
  SANTE: 'Sante',
  FINANCE: 'Finance',
  REPORTS: 'Reports',
  PLANIFICATION: 'Planification',
  PARAMETRES: 'Parametres',
  COLLABORATION: 'Collaboration',
  MORTALITES: 'Mortalites',
  ADMIN: 'Admin',
  MARKETPLACE: 'Marketplace',
  MARKETPLACE_CHAT: 'MarketplaceChat',
  DOCUMENTS: 'Documents',
  // 🆕 Écrans spécifiques aux rôles
  MY_PURCHASES: 'MyPurchases',
  MY_CLIENTS: 'MyClients',
  CONSULTATIONS: 'Consultations',
  MY_FARMS: 'MyFarms',
  TASKS: 'Tasks',
  RECORDS: 'Records',
  OFFERS: 'Offers',
  // 🆕 Écrans d'onboarding
  ONBOARDING_AUTH: 'OnboardingAuth',
  WELCOME: 'Welcome',
  SIGN_UP_METHOD: 'SignUpMethod',
  PHONE_SIGN_UP: 'PhoneSignUp',
  USER_INFO: 'UserInfo',
  PROFILE_SELECTION: 'ProfileSelection',
  SIGN_IN: 'SignIn',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  BUYER_INFO_COMPLETION: 'BuyerInfoCompletion',
  VETERINARIAN_INFO_COMPLETION: 'VeterinarianInfoCompletion',
  VET_PROPOSE_FARMS: 'VetProposeFarms',
  SERVICE_PROPOSAL_NOTIFICATIONS: 'ServiceProposalNotifications',
  // Agent conversationnel
  CHAT_AGENT: 'ChatAgent',
} as const;

export type ScreenName = (typeof SCREENS)[keyof typeof SCREENS];
