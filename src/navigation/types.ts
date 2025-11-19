/**
 * Configuration de la navigation
 */

export const SCREENS = {
  WELCOME: 'Welcome',
  AUTH: 'Auth',
  CREATE_PROJECT: 'CreateProject',
  DASHBOARD: 'Dashboard',
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
} as const;

export type ScreenName = typeof SCREENS[keyof typeof SCREENS];

