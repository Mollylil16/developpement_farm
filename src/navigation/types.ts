/**
 * Configuration de la navigation
 */

export const SCREENS = {
  WELCOME: 'Welcome',
  AUTH: 'Auth',
  CREATE_PROJECT: 'CreateProject',
  DASHBOARD: 'Dashboard',
  REPRODUCTION: 'Reproduction',
  NUTRITION: 'Nutrition',
  PRODUCTION: 'Production',
  FINANCE: 'Finance',
  REPORTS: 'Reports',
  PLANIFICATION: 'Planification',
  PARAMETRES: 'Parametres',
  COLLABORATION: 'Collaboration',
  MORTALITES: 'Mortalites',
} as const;

export type ScreenName = typeof SCREENS[keyof typeof SCREENS];

