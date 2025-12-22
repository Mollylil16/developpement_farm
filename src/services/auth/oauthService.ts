/**
 * Service OAuth pour Google et Apple
 * Gère l'authentification via OAuth avec le backend
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import apiClient, { APIError } from '../api/apiClient';
import { User } from '../../types';

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

    console.log('🔐 [Google OAuth] Redirect URI:', redirectUri);

    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false, // Google ne nécessite pas PKCE pour mobile
    });

    // Démarre le flux OAuth
    const result = await request.promptAsync(GOOGLE_DISCOVERY);

    if (result.type === 'success') {
      const { access_token } = result.params;
      
      console.log('✅ [Google OAuth] Token obtenu, envoi au backend...');

      // Envoyer le token Google au backend pour authentification
      const response = await apiClient.post<OAuthResult>(
        '/auth/google',
        { access_token },
        { skipAuth: true }
      );

      return response;
    } else if (result.type === 'cancel') {
      throw new Error('Authentification annulée par l\'utilisateur');
    } else {
      throw new Error(`Erreur lors de l'authentification: ${result.type}`);
    }
  } catch (error: unknown) {
    console.error('❌ [Google OAuth] Erreur:', error);
    
    if (error instanceof APIError && error.status === 404) {
      throw new Error(
        "L'authentification Google n'est pas encore configurée sur le serveur. Veuillez utiliser email/téléphone."
      );
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Erreur inconnue lors de l\'authentification Google');
  }
}

/**
 * Authentification Apple
 * TODO: Installer expo-apple-authentication
 * npm install expo-apple-authentication
 */
export async function signInWithApple(): Promise<OAuthResult> {
  try {
    // TODO: Implémenter avec expo-apple-authentication
    // Pour l'instant, simulation avec l'API backend
    // Une fois expo-apple-authentication configuré, récupérer les credentials Apple ici

    // Exemple de structure (à adapter avec expo-apple-authentication):
    /*
    import * as AppleAuthentication from 'expo-apple-authentication';
    
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    
    // Envoyer les credentials au backend
    */

    // Pour l'instant, utiliser l'endpoint backend OAuth
    // Le backend doit gérer l'authentification Apple
    const response = await apiClient.post<OAuthResult>(
      '/auth/apple',
      {
        // TODO: Envoyer les credentials Apple une fois expo-apple-authentication configuré
        // identityToken: credential.identityToken,
        // authorizationCode: credential.authorizationCode,
      },
      { skipAuth: true }
    );

    return response;
  } catch (error: unknown) {
    if (error instanceof APIError && error.status === 404) {
      throw new Error(
        "L'authentification Apple n'est pas encore configurée. Veuillez utiliser email/téléphone."
      );
    }
    throw error;
  }
}
