/**
 * Point d'entrée principal de l'application avec animations
 */

import React, { useEffect, useState, useRef } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { databaseService } from './src/services/database';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS } from './src/constants/theme';

function LoadingScreen({ message, error }: { message: string; error?: string }) {
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
    <View style={styles.loadingContainer}>
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
          <ActivityIndicator size="large" color={COLORS.primary} />
        </Animated.View>
        <Text style={styles.loadingText}>{message}</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </Animated.View>
    </View>
  );
}

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Initialiser la base de données au démarrage
    const initDatabase = async () => {
      try {
        await databaseService.initialize();
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
          <StatusBar style="auto" />
          <AppNavigator />
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.textSecondary,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.error,
  },
});
