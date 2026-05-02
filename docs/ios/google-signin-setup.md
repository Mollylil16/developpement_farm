# Configuration Google Sign-In pour iOS - Fermier Pro

## ✅ Configuration terminée

Votre projet React Native utilise **Expo managed workflow** avec `expo-auth-session`, ce qui simplifie grandement la configuration iOS. Aucune modification native n'est nécessaire.

---

## 📋 Fichiers modifiés

### 1. `.env` (racine du projet)

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=742075194736-is9po2thb8gg87lqgiq23572qbdr2p1d.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=742075194736-4gacvg1o6c39cppf3r4n1ki2n72s2qba.apps.googleusercontent.com
```

### 2. `eas.json`

Le Client ID iOS a été ajouté dans tous les profils de build (development, preview, production).

### 3. `backend/.env`

```env
GOOGLE_CLIENT_ID=742075194736-d1j8b18qnq1aaamcv8kdtlcqmas0i1tm.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=742075194736-is9po2thb8gg87lqgiq23572qbdr2p1d.apps.googleusercontent.com
GOOGLE_CLIENT_ID_IOS=742075194736-4gacvg1o6c39cppf3r4n1ki2n72s2qba.apps.googleusercontent.com
```

### 4. `app.config.js`

Le fichier est déjà correctement configuré :
- ✅ `bundleIdentifier: "com.misterh225.fermierpro"` (correspond au Client ID iOS)
- ✅ `scheme: "fermierpro"` (pour les redirections OAuth)

---

## 🔍 Pourquoi pas de GoogleService-Info.plist ?

Avec **Expo managed workflow** et `expo-auth-session`, vous n'avez **PAS besoin** de :
- ❌ `GoogleService-Info.plist`
- ❌ Modifications du `Podfile`
- ❌ Modifications de `Info.plist` manuelles
- ❌ `pod install`

Expo gère automatiquement :
- ✅ Les URL Schemes (via `scheme: "fermierpro"` dans `app.config.js`)
- ✅ Les redirections OAuth
- ✅ L'intégration avec le SDK Google

---

## 🚀 Prochaines étapes

### 1. Redémarrer le serveur de développement

```bash
npm start
# ou
npx expo start
```

### 2. Tester sur iOS

#### Option A : Simulateur iOS

```bash
npm run ios
# ou
npx expo run:ios
```

#### Option B : Appareil physique iOS

1. Connectez votre iPhone/iPad via USB
2. Exécutez :
   ```bash
   npx expo run:ios --device
   ```

### 3. Tester Google Sign-In

1. Ouvrez l'application sur iOS
2. Allez sur l'écran de connexion
3. Cliquez sur "Se connecter avec Google"
4. Vérifiez que l'authentification fonctionne

---

## 📱 Configuration iOS Client ID sur Google Cloud Console

Assurez-vous que votre iOS Client ID est configuré avec :

- **Bundle ID** : `com.misterh225.fermierpro`
- **Type** : iOS

---

## 🔧 Si vous passez en "bare workflow" (optionnel)

Si vous décidez plus tard de passer en "bare workflow" (projet natif), vous devrez :

### 1. Générer le projet natif

```bash
npx expo prebuild
```

### 2. Créer `ios/GoogleService-Info.plist`

Téléchargez le fichier depuis [Firebase Console](https://console.firebase.google.com/) ou créez-le manuellement :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CLIENT_ID</key>
    <string>742075194736-4gacvg1o6c39cppf3r4n1ki2n72s2qba.apps.googleusercontent.com</string>
    <key>BUNDLE_ID</key>
    <string>com.misterh225.fermierpro</string>
    <key>REVERSED_CLIENT_ID</key>
    <string>com.googleusercontent.apps.742075194736-4gacvg1o6c39cppf3r4n1ki2n72s2qba</string>
</dict>
</plist>
```

### 3. Modifier `ios/Podfile`

Ajoutez le SDK Google Sign-In :

```ruby
pod 'GoogleSignIn'
```

### 4. Exécuter `pod install`

```bash
cd ios
pod install
```

### 5. Modifier `ios/YourApp/Info.plist`

Ajoutez les URL Schemes :

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>fermierpro</string>
            <string>com.googleusercontent.apps.742075194736-4gacvg1o6c39cppf3r4n1ki2n72s2qba</string>
        </array>
    </dict>
</array>
```

**⚠️ Note** : Ces étapes ne sont **PAS nécessaires** avec Expo managed workflow actuel.

---

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. ✅ Le Client ID iOS est dans `.env`
2. ✅ Le Client ID iOS est dans `eas.json` (tous les profils)
3. ✅ Le Client ID iOS est dans `backend/.env`
4. ✅ Le `bundleIdentifier` dans `app.config.js` correspond au Client ID iOS
5. ✅ Le `scheme` est configuré dans `app.config.js`

---

## 🐛 Dépannage

### Erreur : "Google Client ID manquant pour ios"

- Vérifiez que `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` est dans votre `.env`
- Redémarrez le serveur Expo après modification du `.env`

### Erreur : "Token Google généré pour une autre application"

- Vérifiez que le Bundle ID dans Google Cloud Console correspond à `com.misterh225.fermierpro`
- Vérifiez que le Client ID iOS est correct dans le `.env`

### L'authentification ne fonctionne pas

1. Vérifiez que le Bundle ID est correct dans Google Cloud Console
2. Vérifiez que l'API Google Sign-In est activée
3. Vérifiez les logs dans la console Expo pour plus de détails

---

## 📚 Ressources

- [Expo AuthSession Documentation](https://docs.expo.dev/guides/authentication/#google)
- [Google Sign-In iOS Setup](https://developers.google.com/identity/sign-in/ios)
- [Expo Managed vs Bare Workflow](https://docs.expo.dev/introduction/managed-vs-bare/)

---

**Date de création** : 2025-01-08  
**Dernière mise à jour** : 2025-01-08
