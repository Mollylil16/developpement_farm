/**
 * Wrapper pour les écrans lazy-loaded
 *
 * Fournit un fallback de chargement pendant le lazy loading
 */

import React, { Suspense, ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface LazyScreenWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Composant wrapper pour les écrans lazy-loaded
 * Affiche un spinner pendant le chargement
 */
export function LazyScreenWrapper({ children, fallback }: LazyScreenWrapperProps) {
  const defaultFallback = (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  return <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
