/**
 * Service d'internationalisation (i18n)
 * Gestion du multilingue pour Fermier Pro
 */

import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import des traductions
import fr from '../locales/fr.json';
import en from '../locales/en.json';

// Clé de stockage pour la langue choisie
const LANGUAGE_STORAGE_KEY = '@fermier_pro_language';

// Créer l'instance i18n
const i18n = new I18n({
  fr,
  en,
});

// Définir la locale par défaut (français)
i18n.defaultLocale = 'fr';
i18n.locale = 'fr';

// Activer le fallback vers la langue par défaut
i18n.enableFallback = true;

/**
 * Initialise la langue depuis le stockage ou la locale du système
 */
export async function initLanguage(): Promise<string> {
  try {
    // Essayer de charger la langue sauvegardée
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      i18n.locale = savedLanguage;
      return savedLanguage;
    }

    // Sinon, utiliser la locale du système
    const locales = Localization.getLocales();
    const systemLocale = locales && locales.length > 0 ? locales[0].languageTag : null;

    // Vérification de sécurité
    if (systemLocale && typeof systemLocale === 'string') {
      const languageCode = systemLocale.split('-')[0]; // 'fr-FR' -> 'fr'

      if (languageCode === 'en') {
        i18n.locale = 'en';
        return 'en';
      }
    }

    // Par défaut, français
    i18n.locale = 'fr';
    return 'fr';
  } catch (error) {
    console.error("Erreur lors de l'initialisation de la langue:", error);
    i18n.locale = 'fr';
    return 'fr';
  }
}

/**
 * Change la langue de l'application
 */
export async function setLanguage(languageCode: 'fr' | 'en'): Promise<void> {
  try {
    i18n.locale = languageCode;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la langue:', error);
    throw error;
  }
}

/**
 * Récupère la langue actuelle
 */
export function getCurrentLanguage(): 'fr' | 'en' {
  return i18n.locale as 'fr' | 'en';
}

/**
 * Traduit une clé
 */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

/**
 * Vérifie si une traduction existe
 */
export function translationExists(key: string): boolean {
  return i18n.translations[i18n.locale]?.[key] !== undefined;
}

/**
 * Récupère toutes les traductions pour la langue actuelle
 */
export function getCurrentTranslations() {
  return i18n.translations[i18n.locale] || {};
}

/**
 * Types pour l'autocomplétion TypeScript
 */
export type TranslationKey = keyof typeof fr;

export default i18n;
