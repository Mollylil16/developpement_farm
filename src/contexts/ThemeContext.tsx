/**
 * Contexte de thème pour gérer le mode clair/sombre
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof LIGHT_COLORS;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(false);

  // Charger le mode sauvegardé au démarrage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
          setModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du thème:', error);
      }
    };
    loadTheme();
  }, []);

  // Calculer si le thème doit être sombre
  useEffect(() => {
    if (mode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(mode === 'dark');
    }
  }, [mode, systemColorScheme]);

  // ✅ MÉMOÏSER setMode avec useCallback pour éviter les re-renders
  const setMode = React.useCallback(async (newMode: ThemeMode) => {
    try {
      setModeState(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  }, []);

  // ✅ MÉMOÏSER colors pour éviter les re-renders inutiles
  const colors = React.useMemo(() => isDark ? DARK_COLORS : LIGHT_COLORS, [isDark]);

  // ✅ MÉMOÏSER le value du Context pour éviter la boucle infinie
  // C'EST LA CORRECTION LA PLUS CRITIQUE !
  const value = React.useMemo(() => ({
    mode,
    isDark,
    colors,
    setMode,
  }), [mode, isDark, colors, setMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

