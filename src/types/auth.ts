/**
 * Types pour l'authentification et les utilisateurs
 */

export type AuthProvider = 'email' | 'google' | 'apple' | 'telephone';

export interface User {
  id: string;
  email?: string;
  telephone?: string;
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

export interface SignUpInput {
  email?: string;
  telephone?: string;
  nom: string;
  prenom: string;
}

export interface SignInInput {
  identifier: string; // email ou téléphone
}
