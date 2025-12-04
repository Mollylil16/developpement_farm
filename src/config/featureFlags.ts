/**
 * Configuration des Feature Flags
 * Centralise tous les flags de l'application
 */

import {
  FeatureFlagConfig,
  ABTestConfig,
  getFeatureFlagsService,
} from '../services/FeatureFlagsService';

/**
 * Définition de tous les feature flags de l'application
 */
export const FEATURE_FLAGS: FeatureFlagConfig[] = [
  {
    key: 'new_dashboard',
    defaultValue: false,
    description: 'Nouveau dashboard avec design amélioré',
    rolloutPercentage: 0, // Désactivé par défaut
    targetRoles: ['producer'],
  },
  {
    key: 'websocket_chat',
    defaultValue: false,
    description: 'Utiliser WebSocket pour le chat au lieu du polling',
    rolloutPercentage: 0,
    environment: 'development',
  },
  {
    key: 'advanced_analytics',
    defaultValue: false,
    description: 'Analyses avancées et prédictions',
    rolloutPercentage: 10, // 10% des utilisateurs
    targetRoles: ['producer'],
  },
  {
    key: 'marketplace_reviews',
    defaultValue: true,
    description: 'Système de notation et avis sur le marketplace',
    rolloutPercentage: 100,
  },
  {
    key: 'ai_recommendations',
    defaultValue: false,
    description: 'Recommandations IA pour la gestion',
    rolloutPercentage: 0,
  },
  {
    key: 'offline_mode',
    defaultValue: false,
    description: 'Mode hors ligne avec synchronisation',
    rolloutPercentage: 0,
  },
];

/**
 * Définition des tests A/B
 */
export const AB_TESTS: ABTestConfig[] = [
  {
    key: 'dashboard_layout',
    description: 'Test A/B du layout du dashboard',
    variants: [
      {
        name: 'control',
        percentage: 50,
        value: 'grid', // Layout en grille (actuel)
      },
      {
        name: 'variant_a',
        percentage: 50,
        value: 'list', // Layout en liste
      },
    ],
    defaultVariant: 'control',
    targetRoles: ['producer'],
  },
  {
    key: 'pricing_display',
    description: 'Test A/B de l affichage des prix',
    variants: [
      {
        name: 'control',
        percentage: 50,
        value: 'compact', // Affichage compact
      },
      {
        name: 'variant_a',
        percentage: 50,
        value: 'detailed', // Affichage détaillé
      },
    ],
    defaultVariant: 'control',
  },
];

/**
 * Initialise tous les feature flags
 */
export function initializeFeatureFlags(): void {
  const service = getFeatureFlagsService();
  service.registerFlags(FEATURE_FLAGS);
  AB_TESTS.forEach((test) => service.registerABTest(test));
}

/**
 * Clés des feature flags (pour autocomplétion TypeScript)
 */
export const FeatureFlagKeys = {
  NEW_DASHBOARD: 'new_dashboard',
  WEBSOCKET_CHAT: 'websocket_chat',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  MARKETPLACE_REVIEWS: 'marketplace_reviews',
  AI_RECOMMENDATIONS: 'ai_recommendations',
  OFFLINE_MODE: 'offline_mode',
} as const;

/**
 * Clés des tests A/B
 */
export const ABTestKeys = {
  DASHBOARD_LAYOUT: 'dashboard_layout',
  PRICING_DISPLAY: 'pricing_display',
} as const;

