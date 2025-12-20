/**
 * Configuration exemple pour la transcription vocale
 *
 * INSTRUCTIONS :
 * 1. Copiez ce fichier vers voiceConfig.ts
 * 2. Remplacez 'VOTRE_CLE_API' par votre vraie clé API
 * 3. Choisissez votre provider (assemblyai, openai, ou google)
 *
 * Pour obtenir une clé API :
 * - AssemblyAI : https://www.assemblyai.com (Gratuit jusqu'à 5h/mois)
 * - OpenAI : https://platform.openai.com ($0.006/minute)
 * - Google : https://cloud.google.com ($0.006/15s)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TranscriptionProvider } from '../types/chatAgent';

export interface VoiceConfigData {
  provider: TranscriptionProvider;
  apiKey: string | null;
}

/**
 * Récupère la configuration de transcription depuis AsyncStorage
 */
export async function getVoiceConfig(): Promise<VoiceConfigData> {
  try {
    const apiKey = await AsyncStorage.getItem('SPEECH_API_KEY');
    const provider =
      ((await AsyncStorage.getItem('SPEECH_PROVIDER')) as TranscriptionProvider) || 'none';

    return {
      provider: apiKey ? provider : 'none',
      apiKey,
    };
  } catch (error) {
    console.error('Erreur récupération config voix:', error);
    return { provider: 'none', apiKey: null };
  }
}

/**
 * Sauvegarde la configuration de transcription
 */
export async function saveVoiceConfig(
  apiKey: string,
  provider: TranscriptionProvider
): Promise<void> {
  try {
    await AsyncStorage.setItem('SPEECH_API_KEY', apiKey);
    await AsyncStorage.setItem('SPEECH_PROVIDER', provider);
  } catch (error) {
    console.error('Erreur sauvegarde config voix:', error);
    throw error;
  }
}

/**
 * Configuration par défaut (pour développement)
 * Décommentez et remplissez avec votre clé API pour tester rapidement
 */
export const DEFAULT_VOICE_CONFIG = {
  // provider: 'assemblyai' as TranscriptionProvider,
  // apiKey: 'VOTRE_CLE_API_ASSEMBLYAI',
  // OU
  // provider: 'openai' as TranscriptionProvider,
  // apiKey: 'sk-VOTRE_CLE_OPENAI',
  // OU
  // provider: 'google' as TranscriptionProvider,
  // apiKey: 'VOTRE_CLE_API_GOOGLE',
};
