/**
 * Point d'entrée principal de l'application avec animations
 */

import React, { useEffect, useState, useRef } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Animated, AppRegistry, LogBox } from 'react-native';
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { deactivateKeepAwake } from 'expo-keep-awake';
import { store, persistor } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { databaseService } from './src/services/database';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { RoleProvider } from './src/contexts/RoleContext';
import { initializeFeatureFlags } from './src/config/featureFlags';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS, LIGHT_COLORS } from './src/constants/theme';
import ErrorBoundary from './src/components/ErrorBoundary';
import { GlobalTextRenderGuard } from './src/components/GlobalTextRenderGuard';

// Désactiver LogBox et les overlays de développement qui peuvent masquer la barre de navigation
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
  // Masquer les overlays de développement qui peuvent rester affichés
  try {
    // Désactiver les indicateurs de progression d'Expo
    if (typeof (global as any).__expo !== 'undefined') {
      // Masquer les overlays de développement
      (global as any).__expo = {
        ...(global as any).__expo,
        hideDevMenu: true,
      };
    }
  } catch (e) {
    // Ignorer les erreurs
  }
}

function LoadingScreen({ message, error }: { message: string; error?: string }) {
  // Utiliser les couleurs par défaut car on n'est pas encore dans le ThemeProvider
  const colors = LIGHT_COLORS;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATIONS.duration.normal,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de rotation continue pour le spinner
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.loadingContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </Animated.View>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{message || ''}</Text>
        {error && <Text style={[styles.errorText, { color: colors.error }]}>{error || ''}</Text>}
      </Animated.View>
    </View>
  );
}

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);

  // Désactiver le "keep awake" pour économiser la batterie
  // L'écran pourra se mettre en veille normalement
  useEffect(() => {
    deactivateKeepAwake();
  }, []);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Initialiser la base de données au démarrage
    const initDatabase = async () => {
      try {
        await databaseService.initialize();
        // Initialiser les Feature Flags
        initializeFeatureFlags();
        setDbInitialized(true);
      } catch (error: any) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
        setDbError(error.message || 'Erreur lors de l\'initialisation de la base de données');
      }
    };

    initDatabase();
  }, []);

  // Afficher un écran de chargement pendant l'initialisation
  if (!dbInitialized) {
    return (
      <LoadingScreen
        message={dbError || 'Initialisation de la base de données...'}
        error={dbError || undefined}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={
          <LoadingScreen message="Chargement de l'application..." />
        } persistor={persistor}>
          <LanguageProvider>
            <ThemeProvider>
              <RoleProvider>
                <GlobalTextRenderGuard>
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </GlobalTextRenderGuard>
              </RoleProvider>
            </ThemeProvider>
          </LanguageProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
  },
});

// Enregistrer l'application pour Expo
registerRootComponent(App);

// Enregistrer également avec AppRegistry pour compatibilité React Native CLI
if (!AppRegistry.getAppKeys().includes('main')) {
  AppRegistry.registerComponent('main', () => App);
}