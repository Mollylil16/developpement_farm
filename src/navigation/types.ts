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
  STATISTICS: 'Statistics',
  LOGIN_LOGS: 'LoginLogs',
  PLANIFICATION: 'Planification',
  TRAINING: 'Training',
  COLLABORATION: 'Collaboration',
  COLLABORATION_VET_TECH: 'CollaborationVetTech',
  MY_QR_CODE: 'MyQRCode',
  SCAN_QR_COLLABORATEUR: 'ScanQRCollaborateur',
  QR_INVITATION_CONFIG: 'QRInvitationConfig',
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
  // 🆕 Écrans d'authentification et onboarding
  ONBOARDING_AUTH: 'OnboardingAuth', // Ancien (à supprimer progressivement)
  SIGN_UP_METHOD: 'SignUpMethod', // Nouveau : Choix méthode inscription
  PHONE_SIGN_UP: 'PhoneSignUp', // Nouveau : Inscription par téléphone
  USER_INFO: 'UserInfo', // Nouveau : Collecte nom/prénom
  SIGN_IN: 'SignIn', // Nouveau : Connexion
  OTP_VERIFICATION: 'OtpVerification', // Vérification OTP
  PROFILE_SELECTION: 'ProfileSelection',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  BUYER_INFO_COMPLETION: 'BuyerInfoCompletion',
  VETERINARIAN_INFO_COMPLETION: 'VeterinarianInfoCompletion',
  VET_PROPOSE_FARMS: 'VetProposeFarms',
  SERVICE_PROPOSAL_NOTIFICATIONS: 'ServiceProposalNotifications',
  // Agent conversationnel
  CHAT_AGENT: 'ChatAgent',
  // Écrans unifiés (supportent les deux modes : individuel et batch)
  VACCINATION: 'Vaccination',
  WEIGHING: 'Weighing',
  SALE: 'Sale',
  MORTALITY: 'Mortality',
  DISEASE: 'Disease',
  GESTATION: 'Gestation',
  MANAGE_PROFILES: 'ManageProfiles',
  // Écrans de détails
  SUJET_PESEE_DETAIL: 'SujetPeseeDetail',
  // 🆕 Écrans pour vétérinaires et techniciens
  MY_PROJECTS: 'MyProjects',
  VET_PROJECT_DETAIL: 'VetProjectDetail',
  VET_CONSULTATIONS: 'VetConsultations',
  VET_REPORTS: 'VetReports',
  VET_TREATMENTS: 'VetTreatments',
} as const;

export type ScreenName = (typeof SCREENS)[keyof typeof SCREENS];
