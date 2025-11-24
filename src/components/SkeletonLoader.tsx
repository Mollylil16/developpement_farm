/**
 * Composant SkeletonLoader pour afficher des placeholders de chargement
 * Améliore l'expérience utilisateur pendant le chargement des données
 */

import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
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

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width || '100%',
          height: height || 20,
          borderRadius: borderRadius || 8, // BORDER_RADIUS.sm
          backgroundColor: colors.borderLight || colors.border,
          opacity,
        },
        style,
      ]}
    />
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
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonItem
            key={index}
            width={index === lines - 1 ? '80%' : '100%'}
            height={16}
            style={styles.line}
          />
        ))}
      </View>
    </View>
  );
}

interface SkeletonWidgetProps {
  showStats?: boolean;
}

export function SkeletonWidget({ showStats = true }: SkeletonWidgetProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.widget, { backgroundColor: colors.surface }]}>
      <View style={styles.widgetHeader}>
        <SkeletonItem width={40} height={40} borderRadius={12} /> {/* BORDER_RADIUS.md */}
        <SkeletonItem width={150} height={20} />
      </View>
      {showStats && (
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <SkeletonItem width={60} height={16} />
            <SkeletonItem width={40} height={32} style={styles.statValue} />
          </View>
          <View style={styles.statItem}>
            <SkeletonItem width={60} height={16} />
            <SkeletonItem width={40} height={32} style={styles.statValue} />
          </View>
          <View style={styles.statItem}>
            <SkeletonItem width={60} height={16} />
            <SkeletonItem width={40} height={32} style={styles.statValue} />
          </View>
        </View>
      )}
    </View>
  );
}

export default SkeletonItem;

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  content: {
    gap: SPACING.sm,
  },
  line: {
    marginBottom: SPACING.xs,
  },
  widget: {
    padding: SPACING.lg,
    borderRadius: 16, // BORDER_RADIUS.lg
    marginBottom: SPACING.md,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    marginTop: SPACING.xs,
  },
});
