module.exports = {
  expo: {
    name: "fermier-pro",
    slug: "fermier-pro",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSMicrophoneUsageDescription: "Kouakou a besoin du microphone pour comprendre vos commandes vocales et vous aider à gérer votre élevage plus facilement.",
        NSSpeechRecognitionUsageDescription: "Kouakou utilise la reconnaissance vocale pour transcrire ce que vous dites et enregistrer vos dépenses, ventes ou pesées.",
        NSCameraUsageDescription: "FarmConnect a besoin d'accéder à votre caméra pour scanner les codes QR des collaborateurs et faciliter l'ajout rapide à vos projets.",
        ITSAppUsesNonExemptEncryption: false
      },
      bundleIdentifier: "com.misterh225.fermierpro"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.brunell663.fermierpro",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.CAMERA"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    scheme: "fermierpro",
    plugins: [
      // "expo-localization",         // Not installed – native only, remove for web preview
      // "expo-apple-authentication", // Not installed – iOS only, remove for web preview
      // "./app.plugin.js",           // Désactivé temporairement - incompatible avec Expo SDK 51
      "expo-font",
      // ["expo-camera", { cameraPermission: "..." }], // Not installed – native only
    ],
    extra: {
      eas: {
        projectId: "fdf1272d-7ffa-4485-ae57-69cf13e07041"
      },
      geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
    },
    owner: "fermierpro-team"
  }
};

