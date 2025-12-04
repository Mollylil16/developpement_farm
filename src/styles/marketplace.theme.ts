/**
 * Thème visuel distinct pour le Marketplace
 * Design professionnel et sérieux pour inspirer confiance
 */

import { Platform } from 'react-native';

/**
 * Palette de couleurs Marketplace
 * Palette violette professionnelle et moderne avec Glassmorphism
 */
export const MarketplaceColors = {
  // Couleurs primaires - Palette violette #9333EA
  primary: '#9333EA',           // Violet principal (nouveau)
  primaryLight: '#A855F7',      // Violet clair
  primaryDark: '#7E22CE',       // Violet foncé
  
  // Couleurs secondaires
  secondary: '#8B4513',         // Brun
  secondaryLight: '#A0522D',    // Brun clair
  
  // Accents
  accent: '#FF8C42',            // Orange chaleureux
  accentLight: '#FFA366',       // Orange clair
  gold: '#DAA520',              // Or/Ambre
  sage: '#A78BFA',              // Violet sauge (ton violet-gris)
  
  // États
  success: '#9333EA',           // Violet pour succès
  warning: '#F39C12',           // Jaune/Orange
  error: '#E74C3C',             // Rouge
  info: '#3498DB',              // Bleu info
  
  // Fond et surfaces (Glassmorphism)
  background: '#F5F3FF',        // Fond violet très clair pour glassmorphism
  surface: 'rgba(255, 255, 255, 0.15)',  // Surface translucide pour glassmorphism
  surfaceLight: 'rgba(255, 255, 255, 0.1)', // Surface très translucide
  surfaceSolid: '#FFFFFF',     // Surface solide pour contenu
  
  // Texte
  text: '#2C3E50',              // Gris foncé
  textSecondary: '#7F8C8D',     // Gris moyen
  textLight: '#BDC3C7',         // Gris clair
  textInverse: '#FFFFFF',       // Blanc
  
  // Badges et statuts
  badgeAvailable: '#FF8C42',    // Orange
  badgeReserved: '#F39C12',     // Jaune
  badgeSold: '#95A5A6',         // Gris
  badgeNew: '#8B5CF6',          // Violet (au lieu de vert)
  badgeConditions: '#3498DB',   // Bleu
  
  // Bordures et dividers (Glassmorphism)
  border: 'rgba(147, 51, 234, 0.6)',  // Bordure violette translucide
  divider: 'rgba(147, 51, 234, 0.2)', // Divider violet translucide
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Gradients (pour les cartes premium) - Palette violette
  gradientStart: '#9333EA',
  gradientEnd: '#A855F7',
  
  // Glassmorphism
  glassBackground: 'rgba(255, 255, 255, 0.15)',
  glassBorder: 'rgba(147, 51, 234, 0.6)',
  glassShadow: 'rgba(147, 51, 234, 0.3)',
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
 * Rayons de bordure (Glassmorphism - coins arrondis 12-16px)
 */
export const MarketplaceBorderRadius = {
  xs: 4,
  sm: 6,
  md: 12,      // Standard pour glassmorphism
  lg: 16,      // Standard pour glassmorphism
  xl: 24,
  round: 9999,
} as const;

/**
 * Ombres (Glassmorphism avec teinte violette)
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
    shadowColor: 'rgba(147, 51, 234, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  medium: {
    shadowColor: 'rgba(147, 51, 234, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  
  large: {
    shadowColor: 'rgba(147, 51, 234, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  
  // Effet hover (élévation) avec teinte violette
  hover: {
    shadowColor: 'rgba(147, 51, 234, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  
  // Glassmorphism shadow
  glass: {
    shadowColor: 'rgba(147, 51, 234, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

/**
 * Animations (Fluides 300-400ms)
 */
export const MarketplaceAnimations = {
  duration: {
    fast: 200,
    normal: 350,    // 300-400ms pour transitions fluides
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
 * Helper pour créer un style de carte (Glassmorphism)
 */
export function cardStyle(elevated: boolean = false) {
  return {
    backgroundColor: MarketplaceColors.glassBackground,
    borderRadius: MarketplaceBorderRadius.lg,
    borderWidth: 1,
    borderColor: MarketplaceColors.glassBorder,
    ...(elevated ? MarketplaceShadows.glass : MarketplaceShadows.medium),
    overflow: 'hidden' as const,
  };
}

/**
 * Helper pour créer un style glassmorphism complet
 */
export function glassmorphismStyle(elevated: boolean = false) {
  return {
    backgroundColor: MarketplaceColors.glassBackground,
    borderRadius: MarketplaceBorderRadius.lg,
    borderWidth: 1.5,
    borderColor: MarketplaceColors.glassBorder,
    ...(elevated ? MarketplaceShadows.glass : MarketplaceShadows.medium),
    overflow: 'hidden' as const,
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

