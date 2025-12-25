/**
 * Service de reconnaissance vocale (Speech-to-Text) et synthèse vocale (Text-to-Speech)
 * Supporte les accents ivoiriens
 */

import { VoiceConfig } from '../../types/chatAgent';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
// Note: Utilisation de require pour éviter les erreurs TypeScript avec expo-file-system
import { SpeechTranscriptionService, TranscriptionProvider } from './SpeechTranscriptionService';
import { logger } from '../../utils/logger';
// import * as Speech from 'expo-speech'; // TODO: Installer expo-speech si nécessaire pour TTS

// Note: Pour la reconnaissance vocale, on utilise expo-av pour l'enregistrement
// et une API de transcription pour convertir en texte

// Déclaration de type pour l'API Web Speech Recognition
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  // Les paramètres ev sont utilisés dans les implémentations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onstart: ((ev: Event) => unknown) | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onresult: ((ev: SpeechRecognitionEvent) => unknown) | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onerror: ((ev: SpeechRecognitionErrorEvent) => unknown) | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onend: ((ev: Event) => unknown) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  // Les paramètres index sont utilisés dans les implémentations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  // Les paramètres index sont utilisés dans les implémentations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }
}

// Fonction helper pour obtenir window de manière sûre
function getWindow(): Window | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any;
  if (typeof global !== 'undefined' && typeof global.window !== 'undefined') {
    return global.window as Window;
  }
  return undefined;
}

export class VoiceService {
  private config: VoiceConfig;
  private isListening: boolean = false;
  private recording: Audio.Recording | null = null;
  // Le paramètre text est utilisé dans les implémentations du callback
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onTranscriptCallback: ((text: string) => void) | null = null;
  private transcriptionService: SpeechTranscriptionService | null = null;
  private webRecognition: SpeechRecognition | null = null;

  constructor(config: VoiceConfig) {
    this.config = {
      ...config,
      language: config.language || 'fr-CI',
      enableSpeechToText: config.enableSpeechToText ?? true, // Activé par défaut
      enableTextToSpeech: config.enableTextToSpeech ?? true,
      speechRate: config.speechRate || 1.0,
      pitch: config.pitch || 1.0,
    };

    // Initialiser le service de transcription si une clé API est fournie
    if (
      config.transcriptionApiKey &&
      config.transcriptionProvider &&
      config.transcriptionProvider !== 'none'
    ) {
      try {
        this.transcriptionService = new SpeechTranscriptionService({
          provider: config.transcriptionProvider as TranscriptionProvider,
          apiKey: config.transcriptionApiKey,
          language: config.language === 'fr-CI' ? 'fr' : config.language,
          timeout: 30000,
        });
        logger.debug(
          '[VoiceService] Service de transcription initialisé:',
          config.transcriptionProvider
        );
      } catch (error) {
        logger.error('[VoiceService] Erreur initialisation transcription:', error);
      }
    }
  }

  /**
   * Active ou désactive la reconnaissance vocale
   */
  setSpeechToTextEnabled(enabled: boolean): void {
    this.config.enableSpeechToText = enabled;
  }

  /**
   * Convertit le texte en parole (Text-to-Speech)
   * @param text - Texte à convertir en parole
   */
  async speak(text: string): Promise<void> {
    if (!this.config.enableTextToSpeech) {
      logger.warn('[VoiceService] Text-to-Speech désactivé, texte ignoré:', text.substring(0, 50));
      return;
    }

    // Utiliser text pour la synthèse vocale
    if (!text || text.trim().length === 0) {
      logger.warn('[VoiceService] Texte vide, impossible de parler');
      return;
    }

    try {
      // TODO: Implémenter avec expo-speech une fois installé
      // await Speech.speak(text, {
      //   language: this.config.language === 'fr-CI' ? 'fr-FR' : this.config.language,
      //   pitch: this.config.pitch || 1.0,
      //   rate: this.config.speechRate || 1.0,
      // });
      logger.debug('[VoiceService] Text-to-Speech (non implémenté):', text);
    } catch (error) {
      logger.error('Erreur lors de la synthèse vocale:', error);
    }
  }

  /**
   * Arrête la synthèse vocale en cours
   */
  stopSpeaking(): void {
    // TODO: Implémenter avec expo-speech
    // Speech.stop();
    logger.debug('[VoiceService] Stop speaking (non implémenté)');
  }

  /**
   * Vérifie si la synthèse vocale est en cours
   */
  async isSpeaking(): Promise<boolean> {
    // TODO: Implémenter avec expo-speech
    // return Speech.isSpeakingAsync();
    return false;
  }

  /**
   * Démarre la reconnaissance vocale (Speech-to-Text)
   * Utilise l'API Web Speech Recognition si disponible, sinon utilise expo-av pour l'enregistrement
   */
  // Le paramètre text est utilisé dans les implémentations du callback
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startListening(onTranscript?: (text: string) => void): Promise<void> {
    if (!this.config.enableSpeechToText) {
      throw new Error("La reconnaissance vocale n'est pas activée");
    }

    if (this.isListening) {
      throw new Error("L'écoute est déjà en cours");
    }

    this.onTranscriptCallback = onTranscript || null;

    // Vérifier si on est sur web et si l'API Speech Recognition est disponible
    if (Platform.OS === 'web') {
      const globalWindow = getWindow();
      if (
        globalWindow &&
        ('webkitSpeechRecognition' in globalWindow || 'SpeechRecognition' in globalWindow)
      ) {
        return this.startWebSpeechRecognition();
      } else {
        throw new Error(
          'Reconnaissance vocale non disponible sur ce navigateur. Utilisez Chrome ou Edge.'
        );
      }
    }

    // Pour mobile, utiliser expo-av pour l'enregistrement
    // Note: La transcription nécessite une API externe (Google Speech-to-Text, etc.)
    return this.startMobileRecording();
  }

  /**
   * Utilise l'API Web Speech Recognition (navigateur)
   */
  private async startWebSpeechRecognition(): Promise<void> {
    return new Promise((resolve, reject) => {
      const globalWindow = getWindow();
      if (!globalWindow) {
        reject(new Error('Reconnaissance vocale non disponible sur ce navigateur'));
        return;
      }

      const SpeechRecognition =
        globalWindow.SpeechRecognition || globalWindow.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error('Reconnaissance vocale non disponible sur ce navigateur'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = this.config.language === 'fr-CI' ? 'fr-FR' : this.config.language;
      recognition.continuous = true;
      recognition.interimResults = true;

      // Stocker la référence pour pouvoir l'arrêter plus tard
      this.webRecognition = recognition;

      recognition.onstart = () => {
        this.isListening = true;
        resolve();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        // Utiliser resultIndex et results pour extraire le texte
        const startIndex = event.resultIndex;
        for (let i = startIndex; i < event.results.length; i++) {
          const result = event.results[i];
          // Utiliser index 0 pour obtenir la meilleure alternative
          if (result[0]) {
            transcript += result[0].transcript;
          }
        }

        // Éviter les mises à jour trop fréquentes (debounce)
        if (this.onTranscriptCallback && transcript.trim()) {
          // Utiliser requestAnimationFrame pour éviter de bloquer l'UI
          requestAnimationFrame(() => {
            if (this.onTranscriptCallback) {
              this.onTranscriptCallback(transcript);
            }
          });
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.isListening = false;
        // Utiliser event.error pour obtenir le message d'erreur
        const errorMessage = event.error || 'Erreur inconnue';
        reject(new Error(`Erreur de reconnaissance vocale: ${errorMessage}`));
      };

      recognition.onend = () => {
        this.isListening = false;
        this.webRecognition = null;
      };

      recognition.start();
    });
  }

  /**
   * Utilise expo-av pour l'enregistrement audio (mobile)
   * Note: Pour la transcription, il faudrait utiliser une API externe
   * Pour l'instant, on simule une transcription simple
   */
  private async startMobileRecording(): Promise<void> {
    try {
      // Demander les permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error(
          "Permission microphone refusée. Activez-la dans les paramètres de l'application."
        );
      }

      // Configurer le mode audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Créer un nouvel enregistrement avec des options optimisées
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY_PCM // Plus léger que HIGH_QUALITY
      );

      this.recording = recording;
      this.isListening = true;

      // Utiliser FileSystem pour préparer le répertoire de sauvegarde des enregistrements
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const FileSystem = require('expo-file-system');
      const recordingDir = `${FileSystem.documentDirectory}recordings/`;
      const dirInfo = await FileSystem.getInfoAsync(recordingDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(recordingDir, { intermediates: true });
      }

      // Note: Sur mobile, la transcription nécessite une API externe
      // Pour l'instant, on informe l'utilisateur qu'il doit utiliser le texte
      logger.debug(
        '[VoiceService] Enregistrement démarré. La transcription nécessite une API externe.'
      );
    } catch (error: unknown) {
      this.isListening = false;
      this.recording = null;
      throw error;
    }
  }

  /**
   * Arrête la reconnaissance vocale et retourne le texte transcrit
   */
  async stopListening(): Promise<string> {
    if (!this.isListening) {
      return '';
    }

    this.isListening = false;

    // Si on utilise l'API Web, arrêter explicitement
    if (Platform.OS === 'web') {
      if (this.webRecognition) {
        try {
          this.webRecognition.stop();
        } catch (error) {
          logger.error("Erreur lors de l'arrêt de la reconnaissance web:", error);
        }
        this.webRecognition = null;
      }
      return '';
    }

    // Pour mobile, arrêter l'enregistrement et transcrire
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        this.recording = null;

        if (!uri) {
          return '';
        }

        // Si un service de transcription est configuré, l'utiliser
        if (this.transcriptionService) {
          try {
            logger.debug('[VoiceService] Début transcription...');
            const result = await this.transcriptionService.transcribe(uri);
            logger.debug('[VoiceService] Transcription réussie:', result.text);
            return result.text || '';
          } catch (error: unknown) {
            logger.error('[VoiceService] Erreur transcription:', error);
            // Ne pas bloquer l'utilisateur, retourner une chaîne vide
            return '';
          }
        }

        // Si pas de service de transcription, informer l'utilisateur
        logger.debug(
          '[VoiceService] Enregistrement arrêté. Aucun service de transcription configuré.'
        );
        return ''; // Retourner une chaîne vide
      } catch (error) {
        logger.error("Erreur lors de l'arrêt de l'enregistrement:", error);
        this.recording = null;
        return '';
      }
    }

    return '';
  }

  /**
   * Vérifie les permissions pour la reconnaissance vocale
   */
  async checkPermissions(): Promise<boolean> {
    // TODO: Vérifier les permissions selon la plateforme
    if (Platform.OS === 'ios') {
      // Vérifier les permissions iOS
      return true;
    } else if (Platform.OS === 'android') {
      // Vérifier les permissions Android
      return true;
    }
    return false;
  }

  /**
   * Demande les permissions pour la reconnaissance vocale
   */
  async requestPermissions(): Promise<boolean> {
    // TODO: Demander les permissions selon la plateforme
    return true;
  }
}
