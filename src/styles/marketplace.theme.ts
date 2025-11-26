/**
 * Thème visuel distinct pour le Marketplace
 * Design professionnel et sérieux pour inspirer confiance
 */

import { Platform } from 'react-native';

/**
 * Palette de couleurs Marketplace
 * Tons terreux et professionnels
 */
export const MarketplaceColors = {
  // Couleurs primaires
  primary: '#2D5016',           // Vert forêt
  primaryLight: '#4A7C28',      // Vert forêt clair
  primaryDark: '#1A3009',       // Vert forêt foncé
  
  // Couleurs secondaires
  secondary: '#8B4513',         // Brun
  secondaryLight: '#A0522D',    // Brun clair
  
  // Accents
  accent: '#FF8C42',            // Orange chaleureux
  accentLight: '#FFA366',       // Orange clair
  gold: '#DAA520',              // Or/Ambre
  sage: '#87A96B',              // Vert sauge
  
  // États
  success: '#4CAF50',           // Vert confirmation
  warning: '#F39C12',           // Jaune/Orange
  error: '#E74C3C',             // Rouge
  info: '#3498DB',              // Bleu info
  
  // Fond et surfaces
  background: '#FAFAF8',        // Blanc cassé
  surface: '#FFFFFF',           // Blanc pur
  surfaceLight: '#F5F5F5',      // Gris très clair
  
  // Texte
  text: '#2C3E50',              // Gris foncé
  textSecondary: '#7F8C8D',     // Gris moyen
  textLight: '#BDC3C7',         // Gris clair
  textInverse: '#FFFFFF',       // Blanc
  
  // Badges et statuts
  badgeAvailable: '#FF8C42',    // Orange
  badgeReserved: '#F39C12',     // Jaune
  badgeSold: '#95A5A6',         // Gris
  badgeNew: '#4CAF50',          // Vert
  badgeConditions: '#3498DB',   // Bleu
  
  // Bordures et dividers
  border: '#E0E0E0',
  divider: '#ECEFF1',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Gradients (pour les cartes premium)
  gradientStart: '#2D5016',
  gradientEnd: '#4A7C28',
} as const;

/**
 * Typographie Marketplace
 * Plus formelle que l'interface principale
 */
export const MarketplaceTypography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
} as const;

/**
 * Espacements Marketplace
 */
export const MarketplaceSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Rayons de bordure
 */
export const MarketplaceBorderRadius = {
  xs: 4,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
} as const;

/**
 * Ombres
 */
export const MarketplaceShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Effet hover (élévation)
  hover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

/**
 * Animations
 */
export const MarketplaceAnimations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

/**
 * Tailles d'icônes
 */
export const MarketplaceIconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

/**
 * Layout
 */
export const MarketplaceLayout = {
  // Grid columns pour différents breakpoints
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  
  // Largeur max des conteneurs
  maxWidth: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  
  // Hauteurs fixes
  headerHeight: 60,
  tabBarHeight: 50,
  cardMinHeight: 200,
} as const;

/**
 * Thème complet Marketplace
 */
export const MarketplaceTheme = {
  colors: MarketplaceColors,
  typography: MarketplaceTypography,
  spacing: MarketplaceSpacing,
  borderRadius: MarketplaceBorderRadius,
  shadows: MarketplaceShadows,
  animations: MarketplaceAnimations,
  icons: MarketplaceIconSizes,
  layout: MarketplaceLayout,
} as const;

/**
 * Type pour le thème
 */
export type MarketplaceThemeType = typeof MarketplaceTheme;

/**
 * Helper pour obtenir une couleur avec opacité
 */
export function withOpacity(color: string, opacity: number): string {
  // Convertir l'opacité (0-1) en hex (00-FF)
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${alpha}`;
}

/**
 * Helper pour créer un style de carte
 */
export function cardStyle(elevated: boolean = false) {
  return {
    backgroundColor: MarketplaceColors.surface,
    borderRadius: MarketplaceBorderRadius.md,
    ...(elevated ? MarketplaceShadows.medium : MarketplaceShadows.small),
  };
}

/**
 * Helper pour créer un style de badge
 */
export function badgeStyle(type: 'available' | 'reserved' | 'sold' | 'new' | 'conditions') {
  const colors = {
    available: MarketplaceColors.badgeAvailable,
    reserved: MarketplaceColors.badgeReserved,
    sold: MarketplaceColors.badgeSold,
    new: MarketplaceColors.badgeNew,
    conditions: MarketplaceColors.badgeConditions,
  };
  
  return {
    backgroundColor: withOpacity(colors[type], 0.15),
    borderColor: withOpacity(colors[type], 0.3),
    borderWidth: 1,
    borderRadius: MarketplaceBorderRadius.sm,
    paddingHorizontal: MarketplaceSpacing.sm,
    paddingVertical: MarketplaceSpacing.xs,
  };
}

export default MarketplaceTheme;

