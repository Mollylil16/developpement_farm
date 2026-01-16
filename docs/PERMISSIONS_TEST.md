# Tests des Permissions Caméra - Module QR Collaborations

Ce document décrit comment tester les permissions caméra pour le scanner QR dans le module Collaborations.

## 📱 Prérequis

- Expo CLI installé
- iOS Simulator (Mac uniquement) ou Android Emulator
- Xcode (pour iOS) ou Android Studio (pour Android)

## 🔧 Configuration des Permissions

### iOS

Les permissions sont configurées dans `app.config.js` :

```javascript
infoPlist: {
  NSCameraUsageDescription: "FarmConnect a besoin d'accéder à votre caméra pour scanner les codes QR des collaborateurs..."
}
```

### Android

Les permissions sont configurées dans `AndroidManifest.xml` :

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

## 🧪 Tests sur iOS Simulator

### 1. Réinitialiser les Permissions

#### Option A : Via Xcode
```bash
# Ouvrir le projet dans Xcode
cd ios
open *.xcworkspace

# Dans Xcode :
# 1. Product > Scheme > Edit Scheme
# 2. Run > Options > Application Data > Reset on Run
```

#### Option B : Via Settings (Simulator)
1. Ouvrir **Settings** dans le Simulator
2. Aller dans **Privacy & Security** > **Camera**
3. Trouver votre app et réinitialiser les permissions

#### Option C : Réinstaller l'app
```bash
# Désinstaller l'app du Simulator
xcrun simctl uninstall booted com.misterh225.fermierpro

# Réinstaller via Expo
npx expo start
# Puis appuyer sur 'i' pour ouvrir sur iOS Simulator
```

### 2. Scénarios de Test

#### Scénario 1 : Accepter la Permission
1. Démarrer l'app
2. Naviguer vers **Collaborations** > **Scanner un QR**
3. ✅ **Résultat attendu** : La demande de permission apparaît
4. Cliquer sur **"Allow"** (Autoriser)
5. ✅ **Résultat attendu** : La caméra s'ouvre immédiatement

#### Scénario 2 : Refuser la Permission
1. Réinitialiser les permissions (voir ci-dessus)
2. Naviguer vers **Collaborations** > **Scanner un QR**
3. ✅ **Résultat attendu** : La demande de permission apparaît
4. Cliquer sur **"Don't Allow"** (Ne pas autoriser)
5. ✅ **Résultat attendu** : 
   - L'écran `PermissionDeniedScreen` s'affiche
   - Trois options sont disponibles : "Autoriser l'accès", "Ouvrir les paramètres", "Saisir le code manuellement"

#### Scénario 3 : Refuser puis Accepter via Paramètres
1. Refuser la permission (voir Scénario 2)
2. Dans `PermissionDeniedScreen`, cliquer sur **"Ouvrir les paramètres"**
3. ✅ **Résultat attendu** : Les paramètres iOS s'ouvrent
4. Aller dans **Settings** > **[App Name]** > **Camera**
5. Activer la permission
6. Revenir à l'app
7. ✅ **Résultat attendu** : La caméra s'ouvre automatiquement (ou après nouveau clic sur "Scanner un QR")

#### Scénario 4 : Saisie Manuelle (Fallback)
1. Refuser la permission (voir Scénario 2)
2. Dans `PermissionDeniedScreen`, cliquer sur **"Saisir le code manuellement"**
3. ✅ **Résultat attendu** : Un modal avec un champ de saisie s'ouvre
4. Saisir un code QR valide (format : XXXX-XXXX-XXXX ou XXXXXXXXXXXX)
5. Cliquer sur **"Valider"**
6. ✅ **Résultat attendu** : Le code est validé comme un scan normal

## 🧪 Tests sur Android Emulator

### 1. Réinitialiser les Permissions

#### Option A : Via ADB
```bash
# Réinitialiser toutes les permissions de l'app
adb shell pm reset-permissions com.brunell663.fermierpro

# Ou réinitialiser une permission spécifique
adb shell pm revoke com.brunell663.fermierpro android.permission.CAMERA
```

#### Option B : Via Settings (Emulator)
1. Ouvrir **Settings** dans l'Emulator
2. Aller dans **Apps** > **[App Name]** > **Permissions**
3. Réinitialiser la permission **Camera**

#### Option C : Réinstaller l'app
```bash
# Désinstaller l'app
adb uninstall com.brunell663.fermierpro

# Réinstaller via Expo
npx expo start
# Puis appuyer sur 'a' pour ouvrir sur Android Emulator
```

### 2. Scénarios de Test

#### Scénario 1 : Accepter la Permission
1. Démarrer l'app
2. Naviguer vers **Collaborations** > **Scanner un QR**
3. ✅ **Résultat attendu** : La demande de permission apparaît
4. Cliquer sur **"Allow"** (Autoriser)
5. ✅ **Résultat attendu** : La caméra s'ouvre immédiatement

#### Scénario 2 : Refuser la Permission
1. Réinitialiser les permissions (voir ci-dessus)
2. Naviguer vers **Collaborations** > **Scanner un QR**
3. ✅ **Résultat attendu** : La demande de permission apparaît
4. Cliquer sur **"Deny"** (Refuser)
5. ✅ **Résultat attendu** : 
   - L'écran `PermissionDeniedScreen` s'affiche
   - Trois options sont disponibles

#### Scénario 3 : Refuser puis Accepter via Paramètres
1. Refuser la permission (voir Scénario 2)
2. Dans `PermissionDeniedScreen`, cliquer sur **"Ouvrir les paramètres"**
3. ✅ **Résultat attendu** : Les paramètres Android s'ouvrent
4. Aller dans **Permissions** > **Camera**
5. Activer la permission
6. Revenir à l'app
7. ✅ **Résultat attendu** : La caméra s'ouvre automatiquement

#### Scénario 4 : Refuser Permanemment (Android uniquement)
1. Refuser la permission deux fois
2. ✅ **Résultat attendu** : Android marque la permission comme "Don't ask again"
3. La prochaine fois, aucun prompt n'apparaît
4. ✅ **Résultat attendu** : `PermissionDeniedScreen` s'affiche directement

## 🔍 Vérification du Code

### Hook `useQRPermissions`

```typescript
const { hasPermission, isLoading, requestPermission, openSettings } = useQRPermissions();
```

**États attendus** :
- `isLoading: true` → Pendant la vérification initiale
- `hasPermission: null` → Avant la première vérification
- `hasPermission: true` → Permission accordée
- `hasPermission: false` → Permission refusée

### Composant `PermissionDeniedScreen`

**Boutons disponibles** :
1. **"Autoriser l'accès"** → Appelle `requestPermission()`
2. **"Ouvrir les paramètres"** → Appelle `openSettings()`
3. **"Saisir le code manuellement"** → Ouvre `ManualQRInput`

### Composant `ManualQRInput`

**Validation du format** :
- Minimum 8 caractères
- Maximum 128 caractères
- Accepte les tirets et espaces (nettoyés automatiquement)

**Exemples valides** :
- `XXXX-XXXX-XXXX`
- `XXXXXXXXXXXX`
- `XXXX XXXX XXXX`

## 📊 Checklist de Tests

### Tests Fonctionnels
- [ ] Demande de permission s'affiche correctement
- [ ] Accepter la permission ouvre la caméra
- [ ] Refuser la permission affiche `PermissionDeniedScreen`
- [ ] Bouton "Autoriser" fonctionne après refus
- [ ] Bouton "Paramètres" ouvre les paramètres système
- [ ] Bouton "Saisie manuelle" ouvre le modal
- [ ] Saisie manuelle valide les codes correctement
- [ ] Revenir des paramètres avec permission activée ouvre la caméra

### Tests d'Accessibilité
- [ ] VoiceOver/TalkBack annonce correctement les boutons
- [ ] Labels d'accessibilité sont clairs
- [ ] Hints d'accessibilité sont utiles

### Tests d'Erreur
- [ ] Gestion correcte des erreurs de validation
- [ ] Messages d'erreur clairs et informatifs
- [ ] Pas de crash si permission refusée plusieurs fois

## 🐛 Dépannage

### Permission ne s'affiche pas
- Vérifier que `app.config.js` contient la permission caméra
- Vérifier que `AndroidManifest.xml` contient la permission
- Rebuild l'app : `npx expo prebuild --clean`

### Caméra ne s'ouvre pas après acceptation
- Vérifier que le Simulator/Emulator a une caméra configurée
- iOS Simulator : Vérifier que "Camera" est activé dans Device > Camera
- Android Emulator : Vérifier la configuration de la caméra dans AVD Manager

### Paramètres ne s'ouvrent pas
- Vérifier que `Linking.openSettings()` est appelé correctement
- Sur iOS, utiliser `Linking.openURL('app-settings:')`
- Sur Android, utiliser `Linking.openSettings()`

## 📚 Références

- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [React Native Permissions](https://reactnative.dev/docs/permissionsandroid)
- [iOS Privacy Permissions](https://developer.apple.com/documentation/avfoundation/avcapturedevice/requestaccess(for:completionhandler:))
