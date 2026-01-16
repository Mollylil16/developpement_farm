# Guide pour obtenir l'empreinte SHA-1 du certificat Android

## ✅ Résultat obtenu

Java est installé et l'empreinte SHA-1 a été récupérée avec succès !

## Solutions

### Option 1 : Installer Java JDK (Recommandé)

1. **Télécharger Java JDK** :
   - Allez sur [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) ou [OpenJDK](https://adoptium.net/)
   - Téléchargez la version 17 ou supérieure pour Windows
   - Installez-le

2. **Ajouter Java au PATH** :
   - Ajoutez `C:\Program Files\Java\jdk-XX\bin` à votre PATH système
   - Redémarrez le terminal

3. **Exécuter la commande** :
   ```bash
   cd android/app
   keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

### Option 2 : Utiliser Android Studio (Si installé)

Si Android Studio est installé, il contient Java :

1. **Trouver le chemin de keytool** :
   - Généralement dans : `C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`
   - Ou : `%LOCALAPPDATA%\Android\Android Studio\jbr\bin\keytool.exe`

2. **Exécuter avec le chemin complet** :
   ```bash
   cd android/app
   "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

### Option 3 : Utiliser Gradle (Si Java est installé)

```bash
cd android
./gradlew signingReport
```

Cela affichera toutes les empreintes SHA-1 et SHA-256 pour debug et release.

### Option 4 : Utiliser PowerShell (Windows natif)

Si vous avez OpenSSL installé via Chocolatey ou autre :

```powershell
cd android/app
# Nécessite d'abord extraire le certificat du keystore avec keytool
```

## 📋 Informations du certificat DEBUG

- **Emplacement** : `android/app/debug.keystore`
- **Alias** : `androiddebugkey`
- **Mot de passe** : `android` (par défaut)
- **Type** : Keystore JKS
- **Date de création** : 31 décembre 2013
- **Valide jusqu'à** : 30 avril 2052

### 🔑 Empreintes du certificat

**SHA-1 (pour Google Sign-In)** :
```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

**SHA-256** :
```
FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

### 📦 Package name Android

```
com.brunell663.fermierpro
```

## 📝 Sortie complète de keytool

```
Alias name: androiddebugkey
Creation date: Dec 31, 2013
Entry type: PrivateKeyEntry
Certificate chain length: 1
Certificate[1]:
Owner: CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US
Issuer: CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US
Serial number: 232eae62
Valid from: Tue Dec 31 22:35:04 GMT 2013 until: Tue Apr 30 22:35:04 GMT 2052
Certificate fingerprints:
	 SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
	 SHA256: FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
Signature algorithm name: SHA1withRSA (weak)
Subject Public Key Algorithm: 2048-bit RSA key
Version: 3
```

## 🔐 Configuration Google Sign-In

### Étapes à suivre :

1. **Allez sur [Google Cloud Console](https://console.cloud.google.com/)**
2. **Sélectionnez votre projet** (ou créez-en un)
3. **Activez l'API Google Sign-In** :
   - APIs & Services → Library
   - Recherchez "Google Sign-In API" ou "Identity Toolkit API"
   - Cliquez sur "Enable"
4. **Créez les credentials OAuth 2.0** :
   - APIs & Services → Credentials
   - Cliquez sur "Create Credentials" → "OAuth client ID"
   - Si c'est la première fois, configurez l'écran de consentement OAuth
5. **Créez le Client ID Android** :
   - Application type : **Android**
   - Name : `FermierPro Android Debug` (ou un nom de votre choix)
   - Package name : `com.brunell663.fermierpro`
   - **SHA-1 certificate fingerprint** : `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
6. **Sauvegardez** et copiez le **Client ID** généré

### ⚠️ Important

- Vous devrez créer un **Client ID séparé pour la production** avec l'empreinte SHA-1 de votre certificat de release
- Le Client ID de debug fonctionne uniquement pour les builds de développement

## Certificat de RELEASE (Production)

Pour obtenir l'empreinte SHA-1 du certificat de production :

1. **Si vous avez déjà un keystore de release** :
   ```bash
   keytool -list -v -keystore votre-keystore-release.jks -alias votre-alias
   ```

2. **Si vous devez créer un keystore de release** :
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
   
   Puis obtenez l'empreinte :
   ```bash
   keytool -list -v -keystore my-release-key.keystore -alias my-key-alias
   ```

## Notes importantes

- ⚠️ **Ne partagez JAMAIS votre keystore de release** ou son mot de passe
- ✅ Le keystore de debug est sécurisé à partager (c'est le certificat par défaut)
- 🔒 Pour la production, gardez une copie sécurisée de votre keystore de release
