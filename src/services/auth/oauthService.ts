/**
 * Service OAuth pour Google et Apple
 * Gère l'authentification via OAuth avec le backend
 */

import apiClient, { APIError } from '../api/apiClient';
import { User } from '../../types';

export interface OAuthResult {
  access_token: string;
  refresh_token: string;
  user: User;
}

/**
 * Authentification Google
 * TODO: Installer expo-auth-session et configurer Google OAuth
 * npm install expo-auth-session expo-crypto
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  try {
    // TODO: Implémenter avec expo-auth-session
    // Pour l'instant, simulation avec l'API backend
    // Une fois expo-auth-session configuré, récupérer le token Google ici

    // Exemple de structure (à adapter avec expo-auth-session):
    /*
    import * as AuthSession from 'expo-auth-session';
    import * as WebBrowser from 'expo-web-browser';
    
    WebBrowser.maybeCompleteAuthSession();
    
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    };
    
    const [request, response, promptAsync] = AuthSession.useAuthRequest(
      {
        clientId: 'YOUR_GOOGLE_CLIENT_ID',
        scopes: ['openid', 'profile', 'email'],
        redirectUri: AuthSession.makeRedirectUri(),
      },
      discovery
    );
    
    const result = await promptAsync();
    if (result.type === 'success') {
      const { access_token } = result.params;
      // Envoyer le token au backend
    }
    */

    // Pour l'instant, utiliser l'endpoint backend OAuth
    // Le backend doit gérer l'authentification Google
    const response = await apiClient.post<OAuthResult>(
      '/auth/google',
      {
        // TODO: Envoyer le token Google une fois expo-auth-session configuré
        // access_token: googleAccessToken,
      },
      { skipAuth: true }
    );

    return response;
  } catch (error: unknown) {
    if (error instanceof APIError && error.status === 404) {
      throw new Error(
        "L'authentification Google n'est pas encore configurée. Veuillez utiliser email/téléphone."
      );
    }
    throw error;
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
