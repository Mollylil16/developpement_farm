/**
 * Types pour l'authentification et les utilisateurs
 */

export type AuthProvider = 'email' | 'google' | 'apple';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  provider: AuthProvider;
  photo?: string; // URL de la photo de profil (pour Google/Apple)
  date_creation: string;
  derniere_connexion: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface EmailSignUpInput {
  email: string;
  nom: string;
  prenom: string;
  password: string;
}

export interface EmailSignInInput {
  email: string;
  password: string;
}

