/**
 * Composant SkeletonLoader pour afficher des placeholders de chargement
 * Améliore l'expérience utilisateur pendant le chargement des données
 */

import React from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle, Dimensions } from 'react-native';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle | Animated.AnimatedProps<ViewStyle> | Array<ViewStyle | Animated.AnimatedProps<ViewStyle> | null | undefined>;
}

function SkeletonItem({ width, height, borderRadius, style }: SkeletonLoaderProps) {
  const { colors } = useTheme();
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // Convertir width string en style React Native approprié
  // Support pour: number, '100%' (flex: 1), '80%' (width en string - React Native le supporte)
  let widthStyle: ViewStyle = {};
  if (width !== undefined && width !== null) {
    if (typeof width === 'string' && width.trim().length > 0) {
      const trimmedWidth = width.trim();
      if (trimmedWidth === '100%') {
        widthStyle = { flex: 1 };
      } else if (trimmedWidth.endsWith('%')) {
        // Valider que c'est bien un pourcentage valide
        const percentageStr = trimmedWidth.replace('%', '').trim();
        const percentage = parseFloat(percentageStr);
        if (!isNaN(percentage) && percentage > 0 && percentage <= 100) {
          // Utiliser width avec string de pourcentage (React Native supporte cela)
          widthStyle = { width: trimmedWidth as any }; // Type assertion nécessaire pour les strings avec %
        }
      }
      // Si c'est une autre string qui n'est pas un pourcentage valide, ignorer (pas de width)
    } else if (typeof width === 'number' && width > 0 && isFinite(width)) {
      widthStyle = { width };
    }
  }

  // Valider et nettoyer le style pour éviter les valeurs problématiques
  // Nettoyer les valeurs undefined/null des objets de style
  const cleanStyleObject = (styleObj: any): ViewStyle | null => {
    if (!styleObj || typeof styleObj !== 'object' || React.isValidElement(styleObj)) {
      return null;
    }
    
    // Créer un nouvel objet sans les propriétés undefined/null/NaN
    const cleaned: any = {};
    for (const key in styleObj) {
      if (Object.prototype.hasOwnProperty.call(styleObj, key)) {
        const value = styleObj[key];
        // Ne garder que les valeurs valides (nombres, strings non-vides, booléens)
        if (
          (typeof value === 'number' && isFinite(value)) ||
          (typeof value === 'string' && value.length > 0) ||
          typeof value === 'boolean' ||
          (Array.isArray(value) && value.length > 0) ||
          (typeof value === 'object' && value !== null && !Array.isArray(value))
        ) {
          cleaned[key] = value;
        }
      }
    }
    
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  };

  let validatedStyleArray: ViewStyle[] = [];
  if (style) {
    if (Array.isArray(style)) {
      // Si c'est un tableau, filtrer, nettoyer et valider chaque élément
      validatedStyleArray = style
        .map((s) => cleanStyleObject(s))
        .filter((s): s is ViewStyle => s !== null);
    } else {
      const cleaned = cleanStyleObject(style);
      if (cleaned) {
        validatedStyleArray = [cleaned];
      }
    }
  }

  // Valider backgroundColor pour éviter les valeurs inattendues
  const bgColor = 
    colors && 
    typeof colors === 'object' && 
    typeof colors.borderLight === 'string' && 
    colors.borderLight 
      ? colors.borderLight 
      : (
          colors && 
          typeof colors === 'object' && 
          typeof colors.border === 'string' && 
          colors.border 
            ? colors.border 
            : '#F5F5F5'
        );

  // Construire le style de base en nettoyant widthStyle (copier uniquement les propriétés valides)
  const baseStyle: ViewStyle = {};
  
  // Nettoyer widthStyle et copier uniquement les propriétés valides dans baseStyle
  if (widthStyle && typeof widthStyle === 'object' && !Array.isArray(widthStyle) && !React.isValidElement(widthStyle)) {
    Object.keys(widthStyle).forEach((key) => {
      const value = (widthStyle as any)[key];
      // Ne copier que les valeurs valides (nombres finis, strings non-vides, booléens)
      if (value !== undefined && value !== null) {
        if (typeof value === 'number' && isFinite(value)) {
          (baseStyle as any)[key] = value;
        } else if (typeof value === 'string' && value.length > 0) {
          (baseStyle as any)[key] = value;
        } else if (typeof value === 'boolean') {
          (baseStyle as any)[key] = value;
        }
      }
    });
  }
  
  // Valider et construire les valeurs pour le style (toujours des valeurs non-undefined)
  const heightValue = typeof height === 'number' && height > 0 && isFinite(height) ? height : 20;
  const borderRadiusValue = typeof borderRadius === 'number' && borderRadius > 0 && isFinite(borderRadius) ? borderRadius : 8;
  
  // Construire l'objet de style avec toutes les propriétés validées (pas de undefined)
  const styleObject: ViewStyle = {};
  
  // Copier baseStyle dans styleObject
  Object.keys(baseStyle).forEach((key) => {
    (styleObject as any)[key] = (baseStyle as any)[key];
  });
  
  // Ajouter les propriétés validées (toujours des valeurs non-undefined)
  styleObject.height = heightValue;
  styleObject.borderRadius = borderRadiusValue;
  styleObject.backgroundColor = bgColor;
  styleObject.opacity = opacity;

  // Construire le style final en filtrant les valeurs null/undefined/invalides
  const finalStyleArray: (ViewStyle | Animated.AnimatedProps<ViewStyle>)[] = [
    styles.skeleton,
    styleObject,
    ...validatedStyleArray, // Spread le tableau validé et nettoyé
  ].filter((s) => {
    return s !== null && 
           s !== undefined && 
           typeof s === 'object' && 
           !Array.isArray(s) &&
           !React.isValidElement(s);
  }) as (ViewStyle | Animated.AnimatedProps<ViewStyle>)[];

  return (
    <Animated.View style={finalStyleArray} />
  );
}

interface SkeletonCardProps {
  lines?: number;
  showHeader?: boolean;
}

export function SkeletonCard({ lines = 3, showHeader = true }: SkeletonCardProps) {
  return (
    <View style={styles.card}>
      {showHeader && (
        <View style={styles.header}>
          <SkeletonItem width={120} height={24} />
          <SkeletonItem width={60} height={20} />
        </View>
      )}
      <View style={styles.content}>
        {Array.from({ length: lines }).map((_, index) => {
          const needsMargin = index < lines - 1;
          const marginBottom = needsMargin && typeof SPACING?.sm === 'number' ? SPACING.sm : undefined;
          const lineStyles: (ViewStyle | undefined)[] = [styles.line];
          if (marginBottom !== undefined && typeof marginBottom === 'number') {
            lineStyles.push({ marginBottom });
          }
          return (
            <SkeletonItem
              key={index}
              width={index === lines - 1 ? '80%' : '100%'}
              height={16}
              style={lineStyles.filter((s): s is ViewStyle => s !== undefined)}
            />
          );
        })}
      </View>
    </View>
  );
}

interface SkeletonWidgetProps {
  showStats?: boolean;
}

export function SkeletonWidget({ showStats = true }: SkeletonWidgetProps) {
  const { colors } = useTheme();

  // Valider showStats pour éviter les problèmes de rendu
  const shouldShowStats = Boolean(showStats);

  // Valider colors.surface pour éviter les valeurs inattendues
  const backgroundColor = 
    colors && 
    typeof colors === 'object' && 
    typeof colors.surface === 'string' && 
    colors.surface.trim().length > 0
      ? colors.surface 
      : '#FFFFFF';

  // Valider SPACING pour éviter les valeurs undefined et s'assurer qu'ils sont des nombres finis
  const spacingSm = (typeof SPACING?.sm === 'number' && isFinite(SPACING.sm) && SPACING.sm >= 0) ? SPACING.sm : 8;
  const spacingMd = (typeof SPACING?.md === 'number' && isFinite(SPACING.md) && SPACING.md >= 0) ? SPACING.md : 16;
  const spacingXs = (typeof SPACING?.xs === 'number' && isFinite(SPACING.xs) && SPACING.xs >= 0) ? SPACING.xs : 4;

  // Créer des objets de style inline validés (toujours des nombres finis)
  const marginRightStyle: ViewStyle = { marginRight: spacingSm };
  const marginBottomStyle: ViewStyle = { marginBottom: spacingXs };
  const marginRightMdStyle: ViewStyle = { marginRight: spacingMd };

  return (
    <View style={[styles.widget, { backgroundColor }]}>
      <View style={styles.widgetHeader}>
        <SkeletonItem 
          width={40} 
          height={40} 
          borderRadius={12} 
          style={marginRightStyle} 
        />
        <SkeletonItem width={150} height={20} />
      </View>
      {shouldShowStats ? (
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, marginRightMdStyle]}>
            <SkeletonItem width={60} height={16} style={marginBottomStyle} />
            {styles.statValue && typeof styles.statValue === 'object' ? (
              <SkeletonItem width={40} height={32} style={styles.statValue} />
            ) : (
              <SkeletonItem width={40} height={32} />
            )}
          </View>
          <View style={[styles.statItem, marginRightMdStyle]}>
            <SkeletonItem width={60} height={16} style={marginBottomStyle} />
            {styles.statValue && typeof styles.statValue === 'object' ? (
              <SkeletonItem width={40} height={32} style={styles.statValue} />
            ) : (
              <SkeletonItem width={40} height={32} />
            )}
          </View>
          <View style={styles.statItem}>
            <SkeletonItem width={60} height={16} style={marginBottomStyle} />
            {styles.statValue && typeof styles.statValue === 'object' ? (
              <SkeletonItem width={40} height={32} style={styles.statValue} />
            ) : (
              <SkeletonItem width={40} height={32} />
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default SkeletonItem;

// Valider SPACING pour s'assurer qu'il est défini avant de créer les styles
// Utiliser des valeurs par défaut strictes pour éviter tout undefined
const safeSPACING = (() => {
  const xs = (typeof SPACING?.xs === 'number' && isFinite(SPACING.xs)) ? SPACING.xs : 4;
  const sm = (typeof SPACING?.sm === 'number' && isFinite(SPACING.sm)) ? SPACING.sm : 8;
  const md = (typeof SPACING?.md === 'number' && isFinite(SPACING.md)) ? SPACING.md : 16;
  const lg = (typeof SPACING?.lg === 'number' && isFinite(SPACING.lg)) ? SPACING.lg : 24;
  const xl = (typeof SPACING?.xl === 'number' && isFinite(SPACING.xl)) ? SPACING.xl : 32;
  const xxl = (typeof SPACING?.xxl === 'number' && isFinite(SPACING.xxl)) ? SPACING.xxl : 48;
  
  // Retourner un objet avec des valeurs garanties non-undefined
  return {
    xs: xs,
    sm: sm,
    md: md,
    lg: lg,
    xl: xl,
    xxl: xxl,
  };
})();

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  card: {
    padding: safeSPACING.md,
    marginBottom: safeSPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: safeSPACING.md,
  },
  content: {
    // gap: safeSPACING.sm, // Non supporté dans toutes les versions de React Native
  },
  line: {
    marginBottom: safeSPACING.xs,
  },
  widget: {
    padding: safeSPACING.lg,
    borderRadius: 16, // BORDER_RADIUS.lg
    marginBottom: safeSPACING.md,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: safeSPACING.md,
    // gap: safeSPACING.sm, // Non supporté dans toutes les versions de React Native
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // gap: safeSPACING.md, // Non supporté dans toutes les versions de React Native
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    // gap: safeSPACING.xs, // Non supporté dans toutes les versions de React Native
  },
  statValue: {
    marginTop: safeSPACING.xs,
  },
});
