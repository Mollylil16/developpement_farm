/**
 * Point d'entrée principal de l'application avec animations
 * 
 * NOTE: react-native-gesture-handler est déjà importé dans index.ts (doit être en premier)
 */

import React, { useEffect, useState, useRef } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  AppRegistry,
  LogBox,
} from 'react-native';
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
import { ANIMATIONS, LIGHT_COLORS } from './src/constants/theme';
import ErrorBoundary from './src/components/ErrorBoundary';
import { GlobalTextRenderGuard } from './src/components/GlobalTextRenderGuard';
import Toast from 'react-native-toast-message';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import { loadUserFromStorageThunk } from './src/store/slices/authSlice';
import { isLocalUri } from './src/utils/profilePhotoUtils';

// Désactiver LogBox en développement pour éviter les overlays intrusifs
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    void deactivateKeepAwake();
  }, []);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Initialiser la base de données au démarrage
    const initDatabase = async () => {
      try {
        // Désactiver le mode local au démarrage
        const { clearLocalMode } = await import('./src/utils/clearLocalMode');
        await clearLocalMode();
        
        await databaseService.initialize();
        // Initialiser les Feature Flags
        initializeFeatureFlags();
        setDbInitialized(true);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de l'initialisation de la base de données";
        console.error("Erreur lors de l'initialisation de la base de données:", error);
        setDbError(errorMessage);
      }
    };

    void initDatabase();
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
        <PersistGate
          loading={<LoadingScreen message="Chargement de l'application..." />}
          persistor={persistor}
          onBeforeLift={() => {
            // Callback appelé après la réhydratation
            // Peut être utilisé pour nettoyer ou initialiser des données
            if (__DEV__) {
              console.log('[PersistGate] Réhydratation terminée');
            }
          }}
        >
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
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const migrationDoneRef = React.useRef(false);

  /**
   * Migration côté client: Nettoie les URIs locales dans user.photo
   * Cette migration s'exécute une seule fois au démarrage si l'utilisateur est connecté
   * et a une URI locale dans sa photo de profil
   */
  useEffect(() => {
    const migrateLocalPhotoUri = async () => {
      // Ne pas exécuter si la migration a déjà été faite
      if (migrationDoneRef.current) {
        return;
      }

      // Vérifier si l'utilisateur est connecté
      if (!user?.id) {
        return;
      }

      // Vérifier si la photo est une URI locale
      if (!user.photo || !isLocalUri(user.photo)) {
        migrationDoneRef.current = true;
        return;
      }

      try {
        if (__DEV__) {
          console.log(
            `[Migration Client] Détection d'URI locale dans user.photo pour userId=${user.id}, photo=${user.photo.substring(0, 50)}...`
          );
        }

        // Importer UserRepository dynamiquement
        const { UserRepository } = await import('./src/database/repositories');
        const userRepo = new UserRepository();

        // Mettre à jour la photo à null pour nettoyer l'URI locale
        await userRepo.update(user.id, { photo: null });

        if (__DEV__) {
          console.log(`[Migration Client] ✅ URI locale nettoyée pour userId=${user.id}`);
        }

        // Recharger le profil depuis le serveur pour synchroniser
        await dispatch(loadUserFromStorageThunk());

        // Marquer la migration comme terminée
        migrationDoneRef.current = true;
      } catch (error) {
        // Logger l'erreur mais ne pas bloquer l'application
        console.error('[Migration Client] ❌ Erreur lors de la migration de la photo:', error);
        // Marquer quand même comme terminée pour éviter les boucles infinies
        migrationDoneRef.current = true;
      }
    };

    // Exécuter la migration après un court délai pour laisser le temps à l'app de s'initialiser
    const timeoutId = setTimeout(() => {
      void migrateLocalPhotoUri();
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user?.id, user?.photo, dispatch]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <Toast />
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

// Enregistrer l'application avec Expo
registerRootComponent(App);
