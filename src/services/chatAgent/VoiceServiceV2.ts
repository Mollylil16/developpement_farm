/**
 * Service de reconnaissance vocale (Speech-to-Text) et synthèse vocale (Text-to-Speech)
 * Version 2.0 - Utilise @react-native-voice/voice pour une meilleure intégration native
 * Supporte les accents ivoiriens et optimisé pour l'usage en zone rurale
 */

import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { logger } from '../../utils/logger';

export interface VoiceServiceCallbacks {
  onResult?: (text: string) => void;
  onError?: (message: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class VoiceServiceV2 {
  private isListening = false;
  private callbacks: VoiceServiceCallbacks = {};

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    Voice.onSpeechStart = () => {
      logger.debug('[VoiceServiceV2] Speech start');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      this.callbacks.onStart?.();
    };

    Voice.onSpeechEnd = () => {
      logger.debug('[VoiceServiceV2] Speech end');
      this.isListening = false;
      this.callbacks.onEnd?.();
    };

    Voice.onSpeechResults = (e: any) => {
      logger.debug('[VoiceServiceV2] Speech results:', e.value);
      const text = e.value?.[0];
      if (text && this.callbacks.onResult) {
        this.callbacks.onResult(text.trim());
      }
    };

    Voice.onSpeechPartialResults = (e: any) => {
      // Transcription partielle (temps réel) - optionnel
      const text = e.value?.[0];
      if (text && this.callbacks.onResult) {
        // Peut être utilisé pour afficher la transcription en temps réel
        // Pour l'instant, on utilise seulement les résultats finaux
      }
    };

    Voice.onSpeechError = (e: any) => {
      logger.error('[VoiceServiceV2] Speech error:', e);
      let message = "Je n'ai pas bien entendu. Réessaie, mon frère.";

      if (e.error?.message) {
        const errorMsg = e.error.message.toLowerCase();

        if (errorMsg.includes('network') || errorMsg.includes('internet')) {
          message =
            "Pas de connexion internet pour la reconnaissance vocale. Tape ton message ou réessaie plus tard.";
        } else if (errorMsg.includes('no match') || errorMsg.includes('not recognized')) {
          message = "Je n'ai rien entendu. Parle plus fort ou rapproche le téléphone.";
        } else if (errorMsg.includes('permission') || errorMsg.includes('authorization')) {
          message =
            "Permission microphone requise. Activez-la dans les paramètres de l'application.";
        } else if (errorMsg.includes('timeout')) {
          message = "Temps d'écoute dépassé. Réessaie.";
        }
      }

      this.isListening = false;
      this.callbacks.onError?.(message);
    };
  }

  /**
   * Démarre la reconnaissance vocale
   */
  async startListening(callbacks: VoiceServiceCallbacks): Promise<void> {
    if (this.isListening) {
      logger.warn('[VoiceServiceV2] Already listening');
      return;
    }

    this.callbacks = callbacks;

    try {
      // Vérifier si la reconnaissance vocale est disponible
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        throw new Error("La reconnaissance vocale n'est pas disponible sur cet appareil.");
      }

      // Définir la langue : priorité au français ivoirien, fallback français standard
      // Note: iOS utilise 'fr-CI' si disponible, sinon 'fr-FR'
      // Android utilise 'fr-FR' (le format fr-CI n'est pas toujours supporté)
      const locale = Platform.OS === 'ios' ? 'fr-CI' : 'fr-FR';

      await Voice.start(locale);
      this.isListening = true;
      logger.debug('[VoiceServiceV2] Listening started with locale:', locale);
    } catch (error) {
      logger.error('[VoiceServiceV2] Error starting listening:', error);
      this.isListening = false;

      let errorMessage = 'Impossible de démarrer le microphone.';
      if (error instanceof Error) {
        if (error.message.includes('permission') || error.message.includes('Permission')) {
          errorMessage = 'Vérifie les autorisations du microphone dans les réglages.';
        } else {
          errorMessage = error.message;
        }
      }

      this.callbacks.onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * Arrête la reconnaissance vocale
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      await Voice.stop();
      this.isListening = false;
      logger.debug('[VoiceServiceV2] Listening stopped');
    } catch (error) {
      logger.error('[VoiceServiceV2] Error stopping listening:', error);
      this.isListening = false;
    }
  }

  /**
   * Annule la reconnaissance vocale
   */
  async cancelListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      await Voice.cancel();
      this.isListening = false;
      logger.debug('[VoiceServiceV2] Listening cancelled');
    } catch (error) {
      logger.error('[VoiceServiceV2] Error cancelling listening:', error);
      this.isListening = false;
    }
  }

  /**
   * Fait parler Kouakou (Text-to-Speech)
   */
  async speak(text: string, onDone?: () => void): Promise<void> {
    if (!text || text.trim().length === 0) {
      logger.warn('[VoiceServiceV2] Empty text, cannot speak');
      return;
    }

    try {
      // Nettoyer le texte (enlever les émojis, formatage spécial, etc.)
      const cleanText = this.cleanTextForSpeech(text);

      Speech.speak(cleanText, {
        language: 'fr-FR',
        pitch: 1.0,
        rate: 0.9, // Légèrement plus lent pour une meilleure compréhension
        onDone: () => {
          logger.debug('[VoiceServiceV2] Speech finished');
          onDone?.();
        },
        onStopped: () => {
          logger.debug('[VoiceServiceV2] Speech stopped');
        },
        onError: (error) => {
          logger.error('[VoiceServiceV2] Speech error:', error);
        },
      });
    } catch (error) {
      logger.error('[VoiceServiceV2] Error speaking:', error);
    }
  }

  /**
   * Arrête la synthèse vocale
   */
  stopSpeaking(): void {
    try {
      Speech.stop();
      logger.debug('[VoiceServiceV2] Speech stopped');
    } catch (error) {
      logger.error('[VoiceServiceV2] Error stopping speech:', error);
    }
  }

  /**
   * Vérifie si la reconnaissance vocale est disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await Voice.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si on est en train d'écouter
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Nettoie le texte pour la synthèse vocale
   * Enlève les émojis, les caractères spéciaux, etc.
   */
  private cleanTextForSpeech(text: string): string {
    return (
      text
        // Enlever les émojis
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        // Enlever les balises HTML/Markdown
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        // Nettoyer les espaces multiples
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Nettoie les ressources (appelé lors du démontage)
   */
  async destroy(): Promise<void> {
    try {
      if (this.isListening) {
        await this.cancelListening();
      }
      await Voice.destroy();
      this.callbacks = {};
      logger.debug('[VoiceServiceV2] Destroyed');
    } catch (error) {
      logger.error('[VoiceServiceV2] Error destroying:', error);
    }
  }
}

// Export une instance singleton pour faciliter l'utilisation
export const voiceServiceV2 = new VoiceServiceV2();

