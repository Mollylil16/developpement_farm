/**
 * Service OAuth pour Google et Apple
 * Gère l'authentification via OAuth avec le backend
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import apiClient from '../api/apiClient';
import { APIError } from '../api/apiError';
import type { User } from '../../types/auth';
import { logger } from '../../utils/logger';

// Nécessaire pour que le navigateur se ferme correctement après l'authentification
WebBrowser.maybeCompleteAuthSession();

export interface OAuthResult {
  access_token: string;
  refresh_token: string;
  user: User;
}

// Configuration Google OAuth
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

// TODO: Ajouter vos Google Client IDs dans les variables d'environnement
// Vous devez créer deux OAuth 2.0 Client IDs sur Google Cloud Console:
// 1. Un pour Android (type: Android)
// 2. Un pour iOS (type: iOS)
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '';
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '';

/**
 * Récupère le bon Client ID selon la plateforme
 */
function getGoogleClientId(): string {
  if (Platform.OS === 'android') {
    return GOOGLE_CLIENT_ID_ANDROID;
  } else if (Platform.OS === 'ios') {
    return GOOGLE_CLIENT_ID_IOS;
  }
  throw new Error('Platform not supported for Google Sign-In');
}

/**
 * Authentification Google avec expo-auth-session
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  try {
    const clientId = getGoogleClientId();
    
    if (!clientId) {
      throw new Error(
        `Google Client ID manquant pour ${Platform.OS}. Veuillez configurer EXPO_PUBLIC_GOOGLE_CLIENT_ID_${Platform.OS.toUpperCase()} dans vos variables d'environnement.`
      );
    }

    // Configuration de la requête OAuth
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'fermierpro',
      path: 'oauth/google',
    });

    logger.debug('[Google OAuth] Redirect URI:', redirectUri);

    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false, // Google ne nécessite pas PKCE pour mobile
    });

    // Démarre le flux OAuth
    const result = await request.promptAsync(GOOGLE_DISCOVERY);

    if (result.type === 'success') {
      const { id_token } = result.params;
      
      if (!id_token) {
        throw new Error('ID token manquant dans la réponse Google');
      }
      
      logger.debug('[Google OAuth] ID Token obtenu, envoi au backend...');

      // Envoyer le token Google au backend pour authentification
      const response = await apiClient.post<OAuthResult>(
        '/auth/google',
        { id_token },
        { skipAuth: true }
      );

      return response;
    } else if (result.type === 'cancel') {
      throw new Error('Authentification annulée par l\'utilisateur');
    } else {
      throw new Error(`Erreur lors de l'authentification: ${result.type}`);
    }
  } catch (error: unknown) {
    logger.error('[Google OAuth] Erreur:', error);
    
    // Gestion spécifique des erreurs selon le type
    if (error instanceof APIError) {
      switch (error.status) {
        case 400:
          throw new Error(
            'Token Google invalide. Veuillez réessayer ou utiliser une autre méthode de connexion.'
          );
        case 401:
          throw new Error(
            'Authentification Google refusée. Vérifiez vos paramètres de compte Google.'
          );
        case 404:
          throw new Error(
            "L'authentification Google n'est pas encore configurée sur le serveur. Veuillez utiliser email/téléphone."
          );
        case 429:
          throw new Error(
            'Trop de tentatives de connexion. Veuillez patienter quelques instants avant de réessayer.'
          );
        case 500:
        case 502:
        case 503:
          throw new Error(
            'Le serveur rencontre des difficultés. Veuillez réessayer dans quelques instants.'
          );
        default:
          throw new Error(
            `Erreur serveur (${error.status}). Veuillez réessayer ou utiliser une autre méthode de connexion.`
          );
      }
    }
    
    // Gestion des erreurs spécifiques à AuthSession
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Erreurs de configuration
      if (errorMessage.includes('client id') || errorMessage.includes('client_id')) {
        throw new Error(
          `Configuration Google manquante pour ${Platform.OS}. Veuillez contacter le support.`
        );
      }
      
      // Erreurs de réseau
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        throw new Error(
          'Problème de connexion réseau. Vérifiez votre connexion Internet et réessayez.'
        );
      }
      
      // Erreurs d'annulation utilisateur
      if (errorMessage.includes('cancel') || errorMessage.includes('annulé')) {
        throw new Error('Authentification annulée. Vous pouvez réessayer à tout moment.');
      }
      
      // Erreurs de token
      if (errorMessage.includes('token') || errorMessage.includes('id_token')) {
        throw new Error(
          'Erreur lors de la récupération du token Google. Veuillez réessayer.'
        );
      }
      
      // Autres erreurs - propager le message original
      throw error;
    }
    
    throw new Error('Erreur inconnue lors de l\'authentification Google. Veuillez réessayer.');
  }
}

/**
 * Authentification Apple avec expo-apple-authentication
 * 
 * IMPORTANT: Apple Sign In ne nécessite PAS de clé API côté client.
 * Il utilise le bundleIdentifier configuré dans app.json (com.misterh225.fermierpro).
 * 
 * Configuration requise:
 * 1. Installer: npx expo install expo-apple-authentication
 * 2. Configurer dans Apple Developer Console:
 *    - Créer un App ID avec bundle identifier: com.misterh225.fermierpro
 *    - Activer "Sign in with Apple" capability
 *    - Créer un Service ID si nécessaire
 */
export async function signInWithApple(): Promise<OAuthResult> {
  try {
    // Vérifier si expo-apple-authentication est disponible
    let AppleAuthentication;
    try {
      AppleAuthentication = require('expo-apple-authentication');
    } catch {
      throw new Error(
        'expo-apple-authentication n\'est pas installé. Exécutez: npx expo install expo-apple-authentication'
      );
    }

    // Vérifier si Apple Sign In est disponible sur l'appareil
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error(
        'Apple Sign In n\'est pas disponible sur cet appareil. Disponible uniquement sur iOS 13+ et appareils physiques.'
      );
    }

    // Lancer l'authentification Apple
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Token d\'identité Apple manquant');
    }

    logger.debug('[Apple OAuth] Credentials obtenus, envoi au backend...');

    // Envoyer les credentials Apple au backend pour authentification
    const response = await apiClient.post<OAuthResult>(
      '/auth/apple',
      {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode || undefined,
        user: credential.user || undefined, // ID utilisateur Apple (stable)
        email: credential.email || undefined,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName || undefined,
              familyName: credential.fullName.familyName || undefined,
            }
          : undefined,
      },
      { skipAuth: true }
    );

    return response;
  } catch (error: unknown) {
    logger.error('[Apple OAuth] Erreur:', error);

    // Gestion spécifique des erreurs selon le type
    if (error instanceof APIError) {
      switch (error.status) {
        case 400:
          throw new Error(
            'Token Apple invalide. Veuillez réessayer ou utiliser une autre méthode de connexion.'
          );
        case 401:
          throw new Error(
            'Authentification Apple refusée. Vérifiez vos paramètres de compte Apple.'
          );
        case 404:
          throw new Error(
            "L'authentification Apple n'est pas encore configurée sur le serveur. Veuillez utiliser email/téléphone."
          );
        case 429:
          throw new Error(
            'Trop de tentatives de connexion. Veuillez patienter quelques instants avant de réessayer.'
          );
        case 500:
        case 502:
        case 503:
          throw new Error(
            'Le serveur rencontre des difficultés. Veuillez réessayer dans quelques instants.'
          );
        default:
          throw new Error(
            `Erreur serveur (${error.status}). Veuillez réessayer ou utiliser une autre méthode de connexion.`
          );
      }
    }

    // Gestion des erreurs spécifiques à Apple Authentication
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Erreurs de disponibilité
      if (errorMessage.includes('not available') || errorMessage.includes('disponible')) {
        throw new Error(
          'Apple Sign In n\'est pas disponible sur cet appareil. Disponible uniquement sur iOS 13+ et appareils physiques.'
        );
      }
      
      // Erreurs d'installation
      if (errorMessage.includes('not installed') || errorMessage.includes('installé')) {
        throw new Error(
          'expo-apple-authentication n\'est pas installé. Veuillez contacter le support technique.'
        );
      }
      
      // Erreurs de réseau
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        throw new Error(
          'Problème de connexion réseau. Vérifiez votre connexion Internet et réessayez.'
        );
      }
      
      // Erreurs d'annulation utilisateur
      if (errorMessage.includes('cancel') || errorMessage.includes('annulé')) {
        throw new Error('Authentification annulée. Vous pouvez réessayer à tout moment.');
      }
      
      // Erreurs de token
      if (errorMessage.includes('token') || errorMessage.includes('identity')) {
        throw new Error(
          'Erreur lors de la récupération du token Apple. Veuillez réessayer.'
        );
      }
      
      // Autres erreurs - propager le message original
      throw error;
    }

    throw new Error('Erreur inconnue lors de l\'authentification Apple. Veuillez réessayer.');
  }
}
