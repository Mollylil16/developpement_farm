/**
 * Types de navigation pour TypeScript
 * Définit les paramètres de route pour chaque écran
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// Types de paramètres pour chaque écran
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Welcome: undefined;
  Auth: undefined;
  CreateProject: undefined;
  Profil: undefined;
  ManageProfiles: undefined;
  Documents: undefined;
  LoginLogs: undefined;
  Admin: undefined;
  // Collaborations
  Collaboration: undefined;
  MyQRCode: undefined;
  ScanQRCollaborateur: { projetId?: string };
  // ... autres écrans
};

export type MainTabParamList = {
  Dashboard: undefined;
  DashboardBuyer: undefined;
  DashboardVet: undefined;
  DashboardTech: undefined;
  Production: undefined;
  Sante: undefined;
  Finance: undefined;
  Reports: undefined;
  Planification: undefined;
  Collaboration: undefined;
  Mortalites: undefined;
  Training: undefined;
  Marketplace: undefined;
  MarketplaceChat: undefined;
};

// Types spécifiques pour les collaborations
export type CollaborationsStackParamList = {
  CollaborationsList: undefined;
  CollaborationDetails: { collaborationId: string };
  InviteCollaborator: { projetId: string };
  MyQRCode: undefined;
  ScanQRCollaborateur: { projetId?: string };
};

// Type global pour la navigation
export type NavigationParamList = RootStackParamList & CollaborationsStackParamList;
