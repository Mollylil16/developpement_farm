# 🎨 Frontend Guide - Module QR Code Collaborations

## Vue d'ensemble

Documentation complète de l'implémentation frontend du module QR Code dans les Collaborations.

## 📑 Table des matières

1. [Architecture Frontend](#architecture-frontend)
2. [Écrans créés](#écrans-créés)
3. [Composants réutilisables](#composants-réutilisables)
4. [Hooks personnalisés](#hooks-personnalisés)
5. [Navigation](#navigation)
6. [Permissions](#permissions)
7. [Styling Guidelines](#styling-guidelines)
8. [Animations](#animations)
9. [Feedback utilisateur](#feedback-utilisateur)

## 🏗️ Architecture Frontend

### Structure des fichiers

```
src/
├── screens/
│   └── Collaborations/
│       ├── MyQRCodeScreen.tsx          # Écran pour afficher son QR
│       └── ScanQRCollaborateurScreen.tsx # Écran pour scanner un QR
├── components/
│   └── Collaborations/
│       ├── QRCodeCard.tsx              # Composant réutilisable
│       ├── QROnboarding.tsx            # Onboarding 3 slides
│       ├── PermissionDeniedScreen.tsx  # Gestion permissions
│       ├── ManualQRInput.tsx           # Saisie manuelle (fallback)
│       └── CollaborationsEmptyState.tsx # Empty state
├── hooks/
│   └── useQRPermissions.ts             # Hook permissions caméra
└── utils/
    └── haptics.ts                      # Helper feedback haptique
```

### Diagramme des interactions

```
┌─────────────────────────────────────────────────────────┐
│                  CollaborationScreen                    │
│                                                         │
│  ┌────────────┐  ┌────────────┐                       │
│  │ QRCodeCard │  │ QRCodeCard │                       │
│  │ (Mon QR)   │  │ (Scanner)  │                       │
│  └─────┬──────┘  └─────┬──────┘                       │
│        │               │                               │
│        ▼               ▼                               │
│  MyQRCodeScreen  ScanQRCollaborateurScreen            │
│        │               │                               │
│        │               ├── PermissionDeniedScreen      │
│        │               ├── ManualQRInput (fallback)    │
│        │               └── useQRPermissions            │
│        │                                               │
│        └── useQRCode()                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 📱 Écrans créés

### 1. MyQRCodeScreen

**Chemin** : `src/screens/Collaborations/MyQRCodeScreen.tsx`

**Fonctionnalités** :
- ✅ Affichage du QR code utilisateur
- ✅ Timer d'expiration avec barre de progression
- ✅ Partage du QR code
- ✅ Régénération du QR code
- ✅ Copie du code (fallback)
- ✅ Badge du nombre de projets actifs
- ✅ Section "Comment ça marche ?" expandable
- ✅ Animations d'entrée et de fade

**Route** : `SCREENS.MY_QR_CODE`

**API utilisée** :
- `GET /users/me/qr-code?expiry=5`

**Exemple d'utilisation** :

```tsx
import { useNavigation } from '@react-navigation/native';
import { SCREENS } from '../../navigation/types';

const navigation = useNavigation();
navigation.navigate(SCREENS.MY_QR_CODE);
```

**Capture d'écran (description)** :
```
┌────────────────────────────────────┐
│ ← Mon QR Code Professionnel        │
├────────────────────────────────────┤
│                                    │
│    [Photo utilisateur]             │
│    Nom Prénom                      │
│    Rôle: Producteur                │
│    🏆 3 projets actifs             │
│                                    │
│    ┌──────────────────────┐        │
│    │                      │        │
│    │    [QR CODE IMAGE]   │        │
│    │                      │        │
│    └──────────────────────┘        │
│                                    │
│    "Scannez ce code pour          │
│     m'ajouter à votre projet"     │
│                                    │
│    ⏱️ Expire dans: 4:23           │
│    [████████████░░░] 85%          │
│                                    │
│    [Partager] [Régénérer] [Copier]│
│                                    │
│    ▼ Comment ça marche ?          │
└────────────────────────────────────┘
```

---

### 2. ScanQRCollaborateurScreen

**Chemin** : `src/screens/Collaborations/ScanQRCollaborateurScreen.tsx`

**Fonctionnalités** :
- ✅ Scanner QR code avec caméra
- ✅ Validation automatique après scan
- ✅ Modal de confirmation avec infos collaborateur
- ✅ Sélection projet/rôle
- ✅ Configuration permissions
- ✅ Gestion des permissions caméra
- ✅ Fallback saisie manuelle
- ✅ Animations de coins du scanner
- ✅ Indicateur de validation

**Route** : `SCREENS.SCAN_QR_COLLABORATEUR`

**APIs utilisées** :
- `POST /collaborations/validate-qr`
- `POST /collaborations/from-qr`

**Exemple d'utilisation** :

```tsx
import { useNavigation } from '@react-navigation/native';
import { SCREENS } from '../../navigation/types';

const navigation = useNavigation();
navigation.navigate(SCREENS.SCAN_QR_COLLABORATEUR, { projetId: 'projet-123' });
```

**Capture d'écran - Scanner** :
```
┌────────────────────────────────────┐
│                                    │
│         [CAMERA VIEW]              │
│                                    │
│    ┌──────────────────────┐        │
│    │                      │        │
│    │    [SCAN AREA]       │        │
│    │    ┌────┐ ┌────┐    │        │
│    │    │    │ │    │    │        │
│    │    └────┘ └────┘    │        │
│    │                      │        │
│    └──────────────────────┘        │
│                                    │
│    "Scannez le QR code du         │
│     collaborateur"                 │
│                                    │
│    [Saisir manuellement] [✕]      │
└────────────────────────────────────┘
```

**Capture d'écran - Confirmation** :
```
┌────────────────────────────────────┐
│          ✅ Scan réussi            │
├────────────────────────────────────┤
│                                    │
│    [Photo collaborateur]           │
│    Jean Dupont                     │
│    jean.dupont@example.com         │
│    +33 6 12 34 56 78               │
│                                    │
│    "Voulez-vous ajouter Jean      │
│     Dupont à votre projet ?"       │
│                                    │
│    Projet: [Sélectionner ▼]       │
│    Rôle: [Vétérinaire ▼]          │
│                                    │
│    Permissions:                    │
│    ☑ Santé    ☑ Reproduction      │
│    ☐ Finance  ☑ Rapports          │
│                                    │
│    [Annuler] [Ajouter au projet]  │
└────────────────────────────────────┘
```

---

## 🧩 Composants réutilisables

### 1. QRCodeCard

**Chemin** : `src/components/Collaborations/QRCodeCard.tsx`

**Props** :

```typescript
interface QRCodeCardProps {
  variant: 'my-qr' | 'scan-qr';
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}
```

**Variants** :

| Variant | Icône | Gradient | Titre | Description |
|---------|-------|----------|-------|-------------|
| `my-qr` | `qr-code` | Bleu (`#4A90E2` → `#5BA3F0`) | "Mon QR Code" | "Partagez votre profil" |
| `scan-qr` | `scan` | Vert (`#50E3C2` → `#6BEDD4`) | "Scanner un QR" | "Ajouter un collaborateur" |

**Exemple d'utilisation** :

```tsx
import QRCodeCard from '../../components/Collaborations/QRCodeCard';

<QRCodeCard 
  variant="my-qr"
  onPress={() => navigation.navigate(SCREENS.MY_QR_CODE)}
  compact={false}
/>

<QRCodeCard 
  variant="scan-qr"
  onPress={handleScanQR}
  compact={true}
/>
```

**Mode compact** :
- Layout horizontal
- Hauteur réduite (60px vs 120px)
- Description optionnelle

---

### 2. QROnboarding

**Chemin** : `src/components/Collaborations/QROnboarding.tsx`

**Props** :

```typescript
interface QROnboardingProps {
  visible: boolean;
  onClose: () => void;
}
```

**Fonctionnalités** :
- 3 slides explicatifs avec gradients
- Indicateurs de pagination animés
- Boutons "Précédent" / "Suivant" / "Compris"
- Stockage dans AsyncStorage (ne s'affiche qu'une fois)

**Exemple d'utilisation** :

```tsx
import QROnboarding from '../../components/Collaborations/QROnboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';

const [showOnboarding, setShowOnboarding] = useState(false);

useEffect(() => {
  const checkOnboarding = async () => {
    const shown = await AsyncStorage.getItem('@collaborations_qr_onboarding_shown');
    if (!shown) {
      setShowOnboarding(true);
    }
  };
  checkOnboarding();
}, []);

<QROnboarding 
  visible={showOnboarding}
  onClose={async () => {
    await AsyncStorage.setItem('@collaborations_qr_onboarding_shown', 'true');
    setShowOnboarding(false);
  }}
/>
```

---

### 3. PermissionDeniedScreen

**Chemin** : `src/components/Collaborations/PermissionDeniedScreen.tsx`

**Props** :

```typescript
interface PermissionDeniedScreenProps {
  onRequestPermission: () => Promise<void>;
  onOpenSettings: () => Promise<void>;
  onManualEntry: () => void;
}
```

**Fonctionnalités** :
- Icône caméra barrée
- Trois options : Autoriser, Paramètres, Saisie manuelle
- Liste d'avantages de l'utilisation de la caméra

**Exemple d'utilisation** :

```tsx
import PermissionDeniedScreen from '../../components/Collaborations/PermissionDeniedScreen';
import { useQRPermissions } from '../../hooks/useQRPermissions';

const { requestPermission, openSettings } = useQRPermissions();

if (hasPermission === false) {
  return (
    <PermissionDeniedScreen
      onRequestPermission={requestPermission}
      onOpenSettings={openSettings}
      onManualEntry={() => setShowManualInput(true)}
    />
  );
}
```

---

### 4. ManualQRInput

**Chemin** : `src/components/Collaborations/ManualQRInput.tsx`

**Props** :

```typescript
interface ManualQRInputProps {
  visible: boolean;
  onClose: () => void;
  onValidate: (qrCode: string) => Promise<void>;
  isLoading?: boolean;
}
```

**Fonctionnalités** :
- Modal avec champ de saisie
- Validation du format (8-128 caractères)
- Message d'erreur clair
- Exemple de format

**Exemple d'utilisation** :

```tsx
import ManualQRInput from '../../components/Collaborations/ManualQRInput';

<ManualQRInput
  visible={showManualInput}
  onClose={() => setShowManualInput(false)}
  onValidate={async (qrCode) => {
    // Valider le QR code
    const response = await apiClient.post('/collaborations/validate-qr', {
      qr_data: qrCode,
      projet_id: projetActif.id
    });
    // Traiter la réponse
  }}
  isLoading={validating}
/>
```

---

### 5. CollaborationsEmptyState

**Chemin** : `src/components/Collaborations/CollaborationsEmptyState.tsx`

**Props** :

```typescript
interface CollaborationsEmptyStateProps {
  onShowQR?: () => void;
  onScanQR?: () => void;
}
```

**Fonctionnalités** :
- Illustration (icône people)
- Message explicatif
- Actions : Cards QR compactes
- Conseils avec icônes de succès

**Exemple d'utilisation** :

```tsx
import CollaborationsEmptyState from '../../components/Collaborations/CollaborationsEmptyState';

if (!hasCollaborations && !hasInvitations) {
  return (
    <CollaborationsEmptyState
      onShowQR={handleShowQR}
      onScanQR={handleScanQR}
    />
  );
}
```

---

## 🎣 Hooks personnalisés

### useQRPermissions

**Chemin** : `src/hooks/useQRPermissions.ts`

**Retour** :

```typescript
interface UseQRPermissionsReturn {
  hasPermission: boolean | null; // null = pas encore vérifié
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
  openSettings: () => Promise<void>;
}
```

**Exemple d'utilisation** :

```tsx
import { useQRPermissions } from '../../hooks/useQRPermissions';

function ScanQRCollaborateurScreen() {
  const { 
    hasPermission, 
    isLoading, 
    requestPermission, 
    openSettings 
  } = useQRPermissions();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (hasPermission === false) {
    return <PermissionDeniedScreen ... />;
  }

  if (hasPermission === true) {
    return <CameraView ... />;
  }

  return null;
}
```

---

## 🧭 Navigation

### Routes définies

**Dans `src/navigation/types.ts`** :

```typescript
export const SCREENS = {
  // ... autres screens
  MY_QR_CODE: 'MyQRCode',
  SCAN_QR_COLLABORATEUR: 'ScanQRCollaborateur',
  // ...
} as const;
```

**Dans `src/navigation/AppNavigator.tsx`** :

```tsx
<Stack.Screen 
  name={SCREENS.MY_QR_CODE} 
  options={{ 
    title: 'Mon QR Code Professionnel',
    headerShown: true,
    presentation: 'modal',
  }}
>
  {() => <LazyScreens.MyQRCodeScreen />}
</Stack.Screen>

<Stack.Screen 
  name={SCREENS.SCAN_QR_COLLABORATEUR} 
  options={{ 
    headerShown: false,
    presentation: 'fullScreenModal',
    gestureEnabled: false,
  }}
>
  {() => <LazyScreens.ScanQRCollaborateurScreen />}
</Stack.Screen>
```

### Navigation programmatique

```tsx
import { useNavigation } from '@react-navigation/native';
import { SCREENS } from '../navigation/types';

const navigation = useNavigation();

// Naviguer vers Mon QR Code
navigation.navigate(SCREENS.MY_QR_CODE);

// Naviguer vers Scanner avec paramètre
navigation.navigate(SCREENS.SCAN_QR_COLLABORATEUR, { 
  projetId: 'projet-123' 
});
```

---

## 🔐 Permissions

### Configuration

**Android** (`android/app/src/main/AndroidManifest.xml`) :

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

**iOS** (`app.config.js`) :

```javascript
infoPlist: {
  NSCameraUsageDescription: "FarmConnect a besoin d'accéder à votre caméra pour scanner les codes QR..."
}
```

**Expo** (`app.config.js`) :

```javascript
plugins: [
  [
    "expo-camera",
    {
      cameraPermission: "FarmConnect a besoin d'accéder à votre caméra..."
    }
  ]
]
```

### Gestion des permissions

**Workflow** :

```
1. Vérification au montage
   └─> useQRPermissions.checkPermission()
       └─> hasPermission: null → true/false

2. Si false → PermissionDeniedScreen
   └─> Options :
       ├─> requestPermission() → Demande permission
       ├─> openSettings() → Ouvre paramètres
       └─> onManualEntry() → Fallback saisie manuelle

3. Si true → CameraView s'ouvre
```

---

## 🎨 Styling Guidelines

### Couleurs

**QR Code Cards** :

```typescript
const QR_COLORS = {
  myQR: {
    gradient: ['#4A90E2', '#5BA3F0'], // Bleu
    iconBg: 'rgba(255, 255, 255, 0.25)',
  },
  scanQR: {
    gradient: ['#50E3C2', '#6BEDD4'], // Vert
    iconBg: 'rgba(255, 255, 255, 0.25)',
  },
};
```

**Badges** :

```typescript
const BADGE_COLORS = {
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
};
```

### Espacements

Utilisation des constantes du thème :

```typescript
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

// Espacements standards
padding: SPACING.md;      // 16px
gap: SPACING.sm;          // 8px
marginBottom: SPACING.lg; // 24px

// Bordures
borderRadius: BORDER_RADIUS.md; // 12px
borderRadius: BORDER_RADIUS.lg; // 16px

// Typographie
fontSize: FONT_SIZES.md;        // 16px
fontWeight: FONT_WEIGHTS.bold;  // '700'
```

### Composants LinearGradient

**QRCodeCard** :

```tsx
<LinearGradient
  colors={variant === 'my-qr' ? ['#4A90E2', '#5BA3F0'] : ['#50E3C2', '#6BEDD4']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.gradientBackground}
>
  {/* Contenu */}
</LinearGradient>
```

---

## ✨ Animations

### Slide in des cards QR

```tsx
const qrCardsAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(qrCardsAnim, {
    toValue: 1,
    duration: 400,
    delay: 100,
    useNativeDriver: true,
  }).start();
}, []);

<Animated.View
  style={{
    opacity: qrCardsAnim,
    transform: [
      {
        translateY: qrCardsAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 0],
        }),
      },
    ],
  }}
>
  <QRCodeCard ... />
</Animated.View>
```

### Pulse sur bouton Scanner

```tsx
const pulseAnim = useRef(new Animated.Value(1)).current;

useEffect(() => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ])
  ).start();
}, []);

<Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
  <QRCodeCard variant="scan-qr" ... />
</Animated.View>
```

### Fade in/out pour modals

```tsx
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (visible) {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  } else {
    fadeAnim.setValue(0);
  }
}, [visible]);

<Animated.View style={{ opacity: fadeAnim }}>
  <Modal visible={visible} ...>
    {/* Contenu */}
  </Modal>
</Animated.View>
```

---

## 📢 Feedback utilisateur

### Haptics

**Helper** : `src/utils/haptics.ts`

**Types** :

```typescript
type HapticType = 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy';
```

**Exemples d'utilisation** :

```tsx
import { hapticScanSuccess, hapticInvitationAccepted, hapticError } from '../../utils/haptics';

// Scan réussi
hapticScanSuccess(); // NotificationFeedbackType.Success

// Acceptation invitation
hapticInvitationAccepted(); // NotificationFeedbackType.Success

// Erreur
hapticError(); // NotificationFeedbackType.Error

// Action normale
triggerHaptic('light'); // ImpactFeedbackStyle.Light
```

### Toast Messages

**Library** : `react-native-toast-message`

**Types** :

```typescript
type ToastType = 'success' | 'error' | 'info';
```

**Exemples d'utilisation** :

```tsx
import Toast from 'react-native-toast-message';

// Succès
Toast.show({
  type: 'success',
  text1: 'Collaborateur ajouté ✓',
  text2: 'Jean Dupont a été ajouté au projet',
  visibilityTime: 3000,
});

// Erreur
Toast.show({
  type: 'error',
  text1: 'Erreur',
  text2: 'Impossible d\'ajouter ce collaborateur',
  visibilityTime: 4000,
});

// Info
Toast.show({
  type: 'info',
  text1: 'Information',
  text2: 'Le QR code expire dans 1 minute',
  visibilityTime: 2000,
});
```

**Configuration globale** (dans `App.tsx`) :

```tsx
import Toast from 'react-native-toast-message';

function AppContent() {
  return (
    <>
      <AppNavigator />
      <Toast />
    </>
  );
}
```

---

## 📦 Packages utilisés

### Installation

```bash
npm install react-native-toast-message
npm install expo-haptics  # Déjà installé dans Expo
```

### Dépendances

| Package | Version | Usage |
|---------|---------|-------|
| `react-native-toast-message` | `^2.1.7` | Notifications toast |
| `expo-haptics` | `^13.0.1` | Feedback haptique |
| `expo-camera` | `^17.0.10` | Scanner QR codes |
| `expo-clipboard` | `^8.0.8` | Copier QR code |
| `expo-sharing` | `^12.0.1` | Partager QR code |
| `expo-linear-gradient` | `^13.0.2` | Gradients |
| `@react-native-async-storage/async-storage` | `^1.23.1` | Stockage local (onboarding) |

---

## 🔗 Voir aussi

- [Guide d'intégration](./COLLABORATIONS_QR_README.md)
- [Documentation API](./COLLABORATIONS_QR_API.md)
- [Guide de test](./COLLABORATIONS_QR_TESTING.md)
- [Dépannage](./COLLABORATIONS_QR_TROUBLESHOOTING.md)
- [Guide utilisateur](./COLLABORATIONS_USER_GUIDE.md)
