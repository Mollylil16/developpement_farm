/**
 * Composant des widgets principaux du Dashboard
 * Affiche: Overview, Performance Globale, Reproduction, Finance
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import OverviewWidget from '../widgets/OverviewWidget';
import ReproductionWidget from '../widgets/ReproductionWidget';
import FinanceWidget from '../widgets/FinanceWidget';
import PerformanceWidget from '../widgets/PerformanceWidget';
import { SkeletonWidget } from '../SkeletonLoader';
import { SPACING } from '../../constants/theme';

interface DashboardMainWidgetsProps {
  projetId: string;
  animations: Animated.Value[];
  isLoading?: boolean;
}

export default function DashboardMainWidgets({
  projetId,
  animations,
  isLoading = false,
}: DashboardMainWidgetsProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonWidget showStats={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Widget 1: Overview */}
      <Animated.View
        style={[
          styles.widgetWrapper,
          {
            opacity: animations[0],
            transform: [
              {
                scale: animations[0].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <OverviewWidget projetId={projetId} />
      </Animated.View>

      {/* Widget 2: Performance Globale - Coût de production vs Prix du marché */}
      <Animated.View
        style={[
          styles.widgetWrapper,
          {
            opacity: animations[1],
            transform: [
              {
                scale: animations[1].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <PerformanceWidget projetId={projetId} />
      </Animated.View>

      {/* Widget 3: Reproduction */}
      <Animated.View
        style={[
          styles.widgetWrapper,
          {
            opacity: animations[2],
            transform: [
              {
                scale: animations[2].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <ReproductionWidget projetId={projetId} />
      </Animated.View>

      {/* Widget 4: Finance */}
      <Animated.View
        style={[
          styles.widgetWrapper,
          {
            opacity: animations[3],
            transform: [
              {
                scale: animations[3].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <FinanceWidget projetId={projetId} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  widgetWrapper: {
    marginBottom: SPACING.xs,
  },
});

