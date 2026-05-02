/**
 * Système de design moderne et convivial
 * Couleurs inspirées des meilleures pratiques UX/UI
 * Support du mode sombre
 */

// Couleurs claires (par défaut)
export const LIGHT_COLORS = {
  // Couleurs principales - Palette verte moderne
  primary: '#2E7D32', // Vert forêt principal
  primaryLight: '#4CAF50', // Vert clair
  primaryDark: '#1B5E20', // Vert foncé
  secondary: '#66BB6A', // Vert secondaire
  accent: '#FF9800', // Orange accent

  // Couleurs pour les genres animaux
  male: '#1976D2', // Bleu pour mâle
  female: '#E91E63', // Rose pour femelle
  castrated: '#9C27B0', // Violet pour castré

  // Couleurs pour les rôles professionnels
  veterinarian: '#2196F3', // Bleu pour vétérinaire
  technician: '#FF9800', // Orange pour technicien

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

// Couleurs sombres
export const DARK_COLORS = {
  // Couleurs principales - Palette verte moderne (adaptée pour le dark)
  primary: '#4CAF50', // Vert plus clair pour le dark
  primaryLight: '#66BB6A', // Vert clair
  primaryDark: '#2E7D32', // Vert foncé
  secondary: '#81C784', // Vert secondaire
  accent: '#FF9800', // Orange accent (identique)

  // Couleurs pour les genres animaux (plus claires pour le mode sombre)
  male: '#42A5F5', // Bleu plus clair
  female: '#F48FB1', // Rose plus clair
  castrated: '#CE93D8', // Violet plus clair

  // Couleurs pour les rôles professionnels
  veterinarian: '#42A5F5', // Bleu pour vétérinaire (plus clair pour dark)
  technician: '#FFB74D', // Orange plus clair pour technicien (dark)

  // Couleurs système
  error: '#EF5350', // Rouge moderne (identique)
  success: '#66BB6A', // Vert succès
  warning: '#FFA726', // Orange avertissement
  info: '#42A5F5', // Bleu information

  // Arrière-plans
  background: '#121212', // Fond principal sombre (Material Dark)
  surface: '#1E1E1E', // Surface des cartes
  surfaceVariant: '#2C2C2C', // Surface variante

  // Texte
  text: '#FFFFFF', // Texte principal (blanc pur pour contraste maximum)
  textSecondary: '#E0E0E0', // Texte secondaire (plus clair pour meilleure lisibilité)
  textTertiary: '#B0B0B0', // Texte tertiaire
  textOnPrimary: '#FFFFFF', // Texte sur fond primaire

  // Bordures et séparateurs
  border: '#333333', // Bordure standard
  borderLight: '#2C2C2C', // Bordure légère
  divider: '#3A3A3A', // Séparateur

  // États interactifs
  overlay: 'rgba(0, 0, 0, 0.7)', // Overlay modal (plus opaque)
  ripple: 'rgba(76, 175, 80, 0.2)', // Effet ripple

  // Ombres (moins visibles en dark)
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

// Export COLORS par défaut (light) pour compatibilité
export const COLORS = LIGHT_COLORS;

// Couleurs spécifiques aux genres animaux
export const MALE_COLOR = LIGHT_COLORS.male;
export const FEMALE_COLOR = LIGHT_COLORS.female;
export const CASTRATED_COLOR = LIGHT_COLORS.castrated;

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
  full: 9999, // Alias pour round (bordures complètement arrondies)
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

// Type pour les font weights acceptés par React Native
export type FontWeight =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';

export const FONT_WEIGHTS: Record<'regular' | 'medium' | 'semiBold' | 'bold', FontWeight> = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

// Styles de police réutilisables
export const FONTS = {
  h1: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  h2: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  h3: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  h4: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  body: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.regular,
  },
  bodyBold: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  small: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
  },
  caption: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.regular,
  },
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
