# Corrections du Scanner QR - Module Collaboration

## Problème signalé
Le bouton "Scanner un code QR" dans le module collaboration ne fonctionnait pas du tout - il ne réagissait pas aux pressions.

## Diagnostic effectué

### Chaîne d'exécution analysée :
1. **ActionCard** (`variant="scan-qr"`) → `onPress={handleScanQR}`
2. **CollaborationsScreen** → `handleScanQR()` → demande permissions caméra
3. **Navigation** → vers `ScanQRCollaborateurScreen` si permissions accordées

### Tests de diagnostic :
- ✅ Bouton ActionCard rendu correctement
- ✅ Navigation configurée correctement
- ✅ Écran ScanQRCollaborateurScreen existe
- ❌ **Problème identifié** : APIs de permissions caméra obsolètes

---

## Cause racine identifiée

### Version expo-camera incompatible
```json
"expo-camera": "15.0.16"
```

### APIs obsolètes utilisées :
```typescript
// ❌ ANCIENNES APIs (expo-camera < 15)
import { requestCameraPermissionsAsync } from 'expo-camera';
const { status } = await requestCameraPermissionsAsync();

// ❌ ANCIENNES APIs (expo-camera < 15)
import { getCameraPermissionsAsync } from 'expo-camera';
const { status } = await getCameraPermissionsAsync();
```

### APIs correctes pour expo-camera v15 :
```typescript
// ✅ NOUVELLES APIs (expo-camera >= 15)
import { Camera } from 'expo-camera';
const { status } = await Camera.requestCameraPermissionsAsync();
const { status } = await Camera.getCameraPermissionsAsync();
```

---

## Corrections appliquées

### 1. CollaborationsScreen.tsx
**Avant :**
```typescript
import { requestCameraPermissionsAsync } from 'expo-camera';

const handleScanQR = async () => {
  const { status } = await requestCameraPermissionsAsync();
  // ...
};
```

**Après :**
```typescript
import { Camera } from 'expo-camera';

const handleScanQR = async () => {
  console.log('[CollaborationsScreen] handleScanQR appelé');
  const { status } = await Camera.requestCameraPermissionsAsync();
  console.log('[CollaborationsScreen] Status permissions:', status);
  // ...
};
```

### 2. useQRPermissions.ts
**Avant :**
```typescript
import { getCameraPermissionsAsync, requestCameraPermissionsAsync } from 'expo-camera';

const checkPermission = async () => {
  const { status } = await getCameraPermissionsAsync();
};

const requestPermission = async () => {
  const { status } = await requestCameraPermissionsAsync();
};
```

**Après :**
```typescript
import { Camera } from 'expo-camera';

const checkPermission = async () => {
  const { status } = await Camera.getCameraPermissionsAsync();
};

const requestPermission = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
};
```

### 3. Logs de débogage ajoutés
- **ActionCard.tsx** : Log quand le bouton est pressé
- **CollaborationsScreen.tsx** : Logs détaillés dans `handleScanQR`

---

## Tests à effectuer après déploiement

### Test 1 : Bouton réactif
1. Ouvrir l'écran Collaboration
2. Appuyer sur "Scanner un QR"
3. ✅ Le bouton devrait réagir (haptic + log `[ActionCard] Bouton pressé`)

### Test 2 : Permissions caméra
1. Appuyer sur "Scanner un QR"
2. ✅ Dialog de demande de permissions devrait apparaître
3. ✅ Log `[CollaborationsScreen] Status permissions: granted/denied`

### Test 3 : Navigation vers scanner
1. Autoriser la caméra
2. ✅ Navigation automatique vers `ScanQRCollaborateurScreen`
3. ✅ Log `[CollaborationsScreen] Permissions accordées, navigation vers scanner`

### Test 4 : Scanner fonctionnel
1. Dans l'écran scanner
2. ✅ Caméra devrait s'activer
3. ✅ Scanner de QR codes devrait fonctionner

---

## Résumé

| Problème | Cause | Solution | Impact |
|----------|--------|----------|---------|
| Bouton "Scanner QR" ne réagit pas | APIs permissions obsolètes expo-camera v15 | Migration vers `Camera.*PermissionsAsync()` | ✅ Bouton fonctionnel |
| Erreur silencieuse | Pas de logs de débogage | Logs détaillés ajoutés | ✅ Diagnostic facilité |

**Résultat attendu :** Le scanner QR devrait maintenant fonctionner correctement avec demande de permissions et navigation vers l'écran scanner.

---

## Logs de débogage

Après déploiement, vérifier les logs console pour :
```
[ActionCard] Bouton pressé, variant: scan-qr
[CollaborationsScreen] handleScanQR appelé
[CollaborationsScreen] Demande de permissions caméra...
[CollaborationsScreen] Status permissions: granted/denied
[CollaborationsScreen] Permissions accordées, navigation vers scanner
```