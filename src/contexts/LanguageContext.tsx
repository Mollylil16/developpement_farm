/**
 * Contexte de gestion de la langue
 * Permet de changer la langue de l'application dynamiquement
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  initLanguage,
  setLanguage as setI18nLanguage,
  getCurrentLanguage,
  t,
} from '../services/i18n';

interface LanguageContextType {
  language: 'fr' | 'en';
  setLanguage: (lang: 'fr' | 'en') => Promise<void>;
  t: (key: string, options?: unknown) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<'fr' | 'en'>('fr');
  const [isLoading, setIsLoading] = useState(true);

  // Initialiser la langue au démarrage
  useEffect(() => {
    async function loadLanguage() {
      try {
        const lang = await initLanguage();
        setLanguageState(lang as 'fr' | 'en');
      } catch (error) {
        console.error('Erreur lors du chargement de la langue:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadLanguage();
  }, []);

  // Fonction pour changer la langue
  const setLanguage = async (lang: 'fr' | 'en') => {
    try {
      await setI18nLanguage(lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Erreur lors du changement de langue:', error);
      throw error;
    }
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    isLoading,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Hook pour utiliser le contexte de langue
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage doit être utilisé à l'intérieur d'un LanguageProvider");
  }
  return context;
}

/**
 * Hook simplifié pour la fonction de traduction
 */
export function useTranslation() {
  const { t, language } = useLanguage();
  return { t, language };
}
