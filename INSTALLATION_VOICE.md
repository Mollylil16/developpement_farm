# Installation de la Reconnaissance Vocale - Guide Rapide

## 📦 Installation des Dépendances

Exécutez les commandes suivantes dans le terminal :

```bash
# Installer expo-speech (Text-to-Speech)
npx expo install expo-speech

# Installer @react-native-voice/voice (Speech-to-Text)
npm install @react-native-voice/voice
```

**Note** : `expo-haptics` est déjà installé dans le projet.

---

## ⚙️ Configuration

Les permissions ont déjà été ajoutées dans `app.json`. Vérifiez que votre `app.json` contient :

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Kouakou a besoin du microphone pour comprendre vos commandes vocales...",
        "NSSpeechRecognitionUsageDescription": "Kouakou utilise la reconnaissance vocale pour transcrire..."
      }
    },
    "android": {
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    },
    "plugins": [
      [
        "@react-native-voice/voice",
        {
          "microphonePermission": "Autorisez l'accès au microphone...",
          "speechRecognitionPermission": "Autorisez la reconnaissance vocale..."
        }
      ]
    ]
  }
}
```

---

## 🔨 Rebuild de l'Application

**IMPORTANT** : Après avoir modifié `app.json`, vous devez rebuilder l'application.

### Option 1 : Expo Development Build

```bash
npx expo prebuild
npx expo run:android  # ou run:ios
```

### Option 2 : EAS Build

```bash
eas build --platform android
eas build --platform ios
```

---

## ✅ Vérification

Une fois l'application rebuildée, vérifiez que :

1. ✅ Les permissions sont demandées au premier lancement
2. ✅ Le bouton micro apparaît dans l'interface de chat
3. ✅ L'appui sur le bouton démarre l'écoute
4. ✅ La transcription fonctionne après avoir parlé
5. ✅ Kouakou parle en réponse

---

## 🐛 Dépannage

### Le bouton micro ne fonctionne pas

- Vérifiez que les permissions sont accordées dans les réglages de l'appareil
- Vérifiez que vous êtes sur un appareil réel (pas sur émulateur pour certains tests)
- Vérifiez les logs dans la console pour voir les erreurs

### La transcription ne fonctionne pas

- Vérifiez votre connexion internet (nécessaire pour certaines APIs)
- Parlez clairement et près du microphone
- Essayez dans un environnement moins bruyant

### Kouakou ne parle pas

- Vérifiez que la voix est activée (bouton micro en haut à droite)
- Vérifiez les logs pour voir s'il y a des erreurs
- Vérifiez que le volume de l'appareil n'est pas à zéro

---

Pour plus de détails, consultez `docs/VOICE_RECOGNITION_IMPLEMENTATION.md`

