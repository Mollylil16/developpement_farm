/**
 * Types pour l'authentification et les utilisateurs
 */

import { UserRoles, UserLocation, UserPreferences, RoleType } from './roles';

export type AuthProvider = 'email' | 'google' | 'apple' | 'telephone';

/**
 * Interface User étendue avec système multi-rôles (NON-DESTRUCTIVE)
 *
 * Les champs existants sont préservés pour compatibilité.
 * Les nouveaux champs sont optionnels pour permettre une migration progressive.
 */
export interface User {
  id: string;
  email?: string;
  telephone?: string;
  nom: string;
  prenom: string;
  provider: AuthProvider;
  photo?: string; // URL de la photo de profil (pour Google/Apple)
  saved_farms?: string[]; // IDs des fermes favorites
  date_creation: string;
  derniere_connexion: string;

  // 🆕 Onboarding
  isOnboarded?: boolean;
  onboardingCompletedAt?: string; // ISO date string

  // 🆕 NOUVEAU: Système de rôles
  roles?: UserRoles;
  activeRole?: RoleType;

  // 🆕 NOUVEAU: Localisation (commune à tous les rôles)
  location?: UserLocation;

  // 🆕 NOUVEAU: Préférences utilisateur (communes à tous les rôles)
  preferences?: UserPreferences;

  // ✅ PRÉSERVÉ: Champs producteur existants (maintenant dans roles.producer)
  // Garder temporairement pour compatibilité, mais migrer progressivement
  // Ces champs seront marqués @deprecated dans la documentation
  // farmName?: string;          // @deprecated - utiliser roles.producer.farmName
  // farmType?: string;          // @deprecated - utiliser roles.producer.farmType
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SignUpInput {
  email?: string;
  telephone?: string;
  password?: string; // Optionnel - requis si email fourni
  nom: string;
  prenom: string;
}

export interface SignInInput {
  identifier: string; // email ou téléphone
}
