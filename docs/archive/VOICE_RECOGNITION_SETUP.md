# Guide d'installation de la reconnaissance vocale

Ce guide explique comment configurer une API de transcription vocale pour Kouakou.

## Options disponibles

### 1. AssemblyAI (⭐ Recommandé)
- **Avantages** : Simple, bon support français, gratuit jusqu'à 5h/mois
- **Tarifs** : Gratuit (5h/mois) puis $0.00025/seconde
- **Documentation** : https://www.assemblyai.com/docs

### 2. OpenAI Whisper
- **Avantages** : Très précis, support multilingue
- **Tarifs** : $0.006 par minute
- **Documentation** : https://platform.openai.com/docs/guides/speech-to-text

### 3. Google Speech-to-Text
- **Avantages** : Très précis, bon support français
- **Tarifs** : $0.006 par 15 secondes
- **Documentation** : https://cloud.google.com/speech-to-text/docs

## Installation rapide avec AssemblyAI

### Étape 1 : Créer un compte AssemblyAI

1. Allez sur https://www.assemblyai.com
2. Créez un compte gratuit
3. Récupérez votre clé API dans le dashboard

### Étape 2 : Configurer dans l'application

Modifiez `src/services/chatAgent/VoiceService.ts` :

```typescript
import { SpeechTranscriptionService } from './SpeechTranscriptionService';

// Dans le constructeur ou une méthode d'initialisation
const transcriptionService = new SpeechTranscriptionService({
  provider: 'assemblyai',
  apiKey: 'VOTRE_CLE_API_ASSEMBLYAI', // Remplacez par votre clé
  language: 'fr', // Français
  timeout: 30000, // 30 secondes
});
```

### Étape 3 : Utiliser AsyncStorage pour stocker la clé (recommandé)

Créez un fichier de configuration :

```typescript
// src/config/voiceConfig.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getVoiceConfig() {
  const apiKey = await AsyncStorage.getItem('SPEECH_API_KEY');
  const provider = (await AsyncStorage.getItem('SPEECH_PROVIDER')) || 'assemblyai';
  
  return {
    provider: provider as TranscriptionProvider,
    apiKey: apiKey || undefined,
    language: 'fr',
    timeout: 30000,
  };
}
```

## Configuration avec OpenAI Whisper

### Étape 1 : Créer un compte OpenAI

1. Allez sur https://platform.openai.com
2. Créez un compte et ajoutez des crédits
3. Récupérez votre clé API

### Étape 2 : Configurer

```typescript
const transcriptionService = new SpeechTranscriptionService({
  provider: 'openai',
  apiKey: 'sk-VOTRE_CLE_OPENAI',
  language: 'fr',
  timeout: 30000,
});
```

## Configuration avec Google Speech-to-Text

### Étape 1 : Créer un projet Google Cloud

1. Allez sur https://cloud.google.com
2. Créez un projet
3. Activez l'API Speech-to-Text
4. Créez une clé API

### Étape 2 : Configurer

```typescript
const transcriptionService = new SpeechTranscriptionService({
  provider: 'google',
  apiKey: 'VOTRE_CLE_API_GOOGLE',
  language: 'fr-FR',
  timeout: 30000,
});
```

## Intégration dans VoiceService

Modifiez `src/services/chatAgent/VoiceService.ts` pour utiliser le service de transcription :

```typescript
import { SpeechTranscriptionService } from './SpeechTranscriptionService';

export class VoiceService {
  private transcriptionService: SpeechTranscriptionService | null = null;

  constructor(config: VoiceConfig) {
    // ... code existant ...
    
    // Initialiser le service de transcription si une clé API est fournie
    if (config.transcriptionApiKey && config.transcriptionProvider) {
      this.transcriptionService = new SpeechTranscriptionService({
        provider: config.transcriptionProvider,
        apiKey: config.transcriptionApiKey,
        language: config.language || 'fr',
        timeout: 30000,
      });
    }
  }

  async stopListening(): Promise<string> {
    // ... code existant pour arrêter l'enregistrement ...
    
    if (this.recording && this.transcriptionService) {
      const uri = this.recording.getURI();
      if (uri) {
        try {
          const result = await this.transcriptionService.transcribe(uri);
          return result.text;
        } catch (error) {
          console.error('Erreur transcription:', error);
          return '';
        }
      }
    }
    
    return '';
  }
}
```

## Variables d'environnement (Optionnel)

Pour plus de sécurité, utilisez des variables d'environnement :

1. Créez un fichier `.env` à la racine :
```
SPEECH_API_KEY=votre_cle_api
SPEECH_PROVIDER=assemblyai
```

2. Installez `react-native-dotenv` :
```bash
npm install react-native-dotenv
```

3. Utilisez dans le code :
```typescript
import { SPEECH_API_KEY, SPEECH_PROVIDER } from '@env';
```

## Test

Pour tester la configuration :

```typescript
const service = new SpeechTranscriptionService({
  provider: 'assemblyai',
  apiKey: 'votre_cle',
  language: 'fr',
});

const result = await service.transcribe('file:///path/to/audio.mp3');
console.log('Texte transcrit:', result.text);
```

## Dépannage

### Erreur "API key required"
- Vérifiez que votre clé API est correctement configurée
- Assurez-vous qu'elle n'a pas expiré

### Erreur "Timeout"
- Augmentez le `timeout` dans la configuration
- Vérifiez votre connexion internet

### Erreur "Permission denied"
- Vérifiez les permissions du microphone dans les paramètres de l'app
- Sur iOS, vérifiez `Info.plist`
- Sur Android, vérifiez `AndroidManifest.xml`

## Support

Pour plus d'aide :
- AssemblyAI : https://www.assemblyai.com/docs
- OpenAI : https://platform.openai.com/docs
- Google Cloud : https://cloud.google.com/speech-to-text/docs

