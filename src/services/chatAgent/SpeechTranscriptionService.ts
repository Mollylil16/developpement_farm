/**
 * Service de transcription vocale (Speech-to-Text)
 * Supporte plusieurs APIs : AssemblyAI, Google Speech-to-Text, OpenAI Whisper
 */

import * as FileSystem from 'expo-file-system';

export type TranscriptionProvider = 'assemblyai' | 'google' | 'openai' | 'none';

export interface TranscriptionConfig {
  provider: TranscriptionProvider;
  apiKey?: string;
  language?: string; // Code langue ISO (ex: 'fr', 'fr-FR')
  timeout?: number; // Timeout en ms (défaut: 30000)
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  duration?: number;
}

export class SpeechTranscriptionService {
  private config: TranscriptionConfig;

  constructor(config: TranscriptionConfig) {
    this.config = {
      provider: config.provider || 'none',
      apiKey: config.apiKey,
      language: config.language || 'fr',
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Transcrit un fichier audio en texte
   * @param audioUri URI du fichier audio (local ou distant)
   * @returns Texte transcrit
   */
  async transcribe(audioUri: string): Promise<TranscriptionResult> {
    if (this.config.provider === 'none') {
      throw new Error('Aucun service de transcription configuré. Configurez une API dans SpeechTranscriptionService.');
    }

    switch (this.config.provider) {
      case 'assemblyai':
        return this.transcribeWithAssemblyAI(audioUri);
      case 'google':
        return this.transcribeWithGoogle(audioUri);
      case 'openai':
        return this.transcribeWithOpenAI(audioUri);
      default:
        throw new Error(`Provider non supporté: ${this.config.provider}`);
    }
  }

  /**
   * Transcription avec AssemblyAI (recommandé - simple et abordable)
   * Documentation: https://www.assemblyai.com/docs
   * Tarifs: Gratuit jusqu'à 5h/mois, puis $0.00025/seconde
   */
  private async transcribeWithAssemblyAI(audioUri: string): Promise<TranscriptionResult> {
    if (!this.config.apiKey) {
      throw new Error('Clé API AssemblyAI requise. Obtenez-la sur https://www.assemblyai.com');
    }

    try {
      // Étape 1: Uploader l'audio
      const audioData = await this.readAudioFile(audioUri);
      
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          authorization: this.config.apiKey,
        },
        body: audioData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Erreur upload AssemblyAI: ${uploadResponse.status}`);
      }

      const { upload_url } = await uploadResponse.json();

      // Étape 2: Démarrer la transcription
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          authorization: this.config.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: upload_url,
          language_code: this.config.language === 'fr' ? 'fr' : this.config.language,
        }),
      });

      if (!transcriptResponse.ok) {
        throw new Error(`Erreur transcription AssemblyAI: ${transcriptResponse.status}`);
      }

      const { id } = await transcriptResponse.json();

      // Étape 3: Polling pour obtenir le résultat
      const result = await this.pollAssemblyAIResult(id);

      return {
        text: result.text,
        confidence: result.confidence,
        duration: result.audio_duration,
      };
    } catch (error: any) {
      throw new Error(`Erreur transcription AssemblyAI: ${error.message}`);
    }
  }

  /**
   * Polling pour obtenir le résultat de la transcription AssemblyAI
   */
  private async pollAssemblyAIResult(transcriptId: string): Promise<any> {
    const maxAttempts = 60; // 60 tentatives max (environ 30 secondes)
    const pollInterval = 500; // 500ms entre chaque tentative

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          authorization: this.config.apiKey!,
        },
      });

      const result = await response.json();

      if (result.status === 'completed') {
        return result;
      } else if (result.status === 'error') {
        throw new Error(`Erreur transcription: ${result.error}`);
      }

      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Timeout: La transcription prend trop de temps');
  }

  /**
   * Transcription avec Google Speech-to-Text
   * Documentation: https://cloud.google.com/speech-to-text/docs
   * Tarifs: $0.006 par 15 secondes
   */
  private async transcribeWithGoogle(audioUri: string): Promise<TranscriptionResult> {
    if (!this.config.apiKey) {
      throw new Error('Clé API Google Cloud requise. Obtenez-la sur https://cloud.google.com');
    }

    try {
      const audioData = await this.readAudioFile(audioUri);
      const base64Audio = await this.convertToBase64(audioData);

      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'LINEAR16', // Ajuster selon le format audio
              sampleRateHertz: 16000,
              languageCode: this.config.language || 'fr-FR',
            },
            audio: {
              content: base64Audio,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur Google Speech-to-Text: ${response.status}`);
      }

      const data = await response.json();
      const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || '';

      return {
        text: transcript,
        confidence: data.results?.[0]?.alternatives?.[0]?.confidence,
      };
    } catch (error: any) {
      throw new Error(`Erreur transcription Google: ${error.message}`);
    }
  }

  /**
   * Transcription avec OpenAI Whisper
   * Documentation: https://platform.openai.com/docs/guides/speech-to-text
   * Tarifs: $0.006 par minute
   */
  private async transcribeWithOpenAI(audioUri: string): Promise<TranscriptionResult> {
    if (!this.config.apiKey) {
      throw new Error('Clé API OpenAI requise. Obtenez-la sur https://platform.openai.com');
    }

    try {
      // Pour React Native, utiliser directement l'URI du fichier
      // OpenAI accepte les fichiers locaux via FormData
      const formData = new FormData() as any;
      
      // Sur React Native, FormData accepte directement les objets avec uri
      formData.append('file', {
        uri: audioUri,
        type: 'audio/mpeg',
        name: 'audio.mp3',
      } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', this.config.language || 'fr');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          // Ne pas définir Content-Type, laisse le navigateur le faire pour FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(`Erreur OpenAI Whisper: ${errorData.error?.message || response.status}`);
      }

      const data = await response.json();

      return {
        text: data.text || '',
      };
    } catch (error: any) {
      throw new Error(`Erreur transcription OpenAI: ${error.message}`);
    }
  }

  /**
   * Lit un fichier audio depuis l'URI
   */
  private async readAudioFile(uri: string): Promise<ArrayBuffer> {
    try {
      // Si c'est une URI locale (file://)
      if (uri.startsWith('file://') || uri.startsWith('content://')) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // Convertir base64 en ArrayBuffer
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }

      // Si c'est une URL distante
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Erreur lecture fichier: ${response.status}`);
      }
      return await response.arrayBuffer();
    } catch (error: any) {
      throw new Error(`Erreur lecture audio: ${error.message}`);
    }
  }

  /**
   * Convertit un ArrayBuffer en base64
   */
  private async convertToBase64(buffer: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

