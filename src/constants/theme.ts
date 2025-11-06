/**
 * Système de design moderne et convivial
 * Couleurs inspirées des meilleures pratiques UX/UI
 */

export const COLORS = {
  // Couleurs principales - Palette verte moderne
  primary: '#2E7D32', // Vert forêt principal
  primaryLight: '#4CAF50', // Vert clair
  primaryDark: '#1B5E20', // Vert foncé
  secondary: '#66BB6A', // Vert secondaire
  accent: '#FF9800', // Orange accent
  
  // Couleurs système
  error: '#EF5350', // Rouge moderne
  success: '#66BB6A', // Vert succès
  warning: '#FFA726', // Orange avertissement
  info: '#42A5F5', // Bleu information
  
  // Arrière-plans
  background: '#FAFAFA', // Fond principal léger
  surface: '#FFFFFF', // Surface des cartes
  surfaceVariant: '#F5F5F5', // Surface variante
  
  // Texte
  text: '#212121', // Texte principal
  textSecondary: '#757575', // Texte secondaire
  textTertiary: '#9E9E9E', // Texte tertiaire
  textOnPrimary: '#FFFFFF', // Texte sur fond primaire
  
  // Bordures et séparateurs
  border: '#E0E0E0', // Bordure standard
  borderLight: '#F5F5F5', // Bordure légère
  divider: '#E8E8E8', // Séparateur
  
  // États interactifs
  overlay: 'rgba(0, 0, 0, 0.5)', // Overlay modal
  ripple: 'rgba(46, 125, 50, 0.1)', // Effet ripple
  
  // Ombres
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999, // Pour les boutons ronds
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FONT_WEIGHTS = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

// Animations
export const ANIMATIONS = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in',
  },
};

// Transitions
export const TRANSITIONS = {
  scale: {
    pressed: 0.95,
    hover: 1.02,
  },
  opacity: {
    disabled: 0.5,
    pressed: 0.7,
  },
};


