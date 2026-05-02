# Configuration Navigation - Module Collaborations QR Code

## 📋 Vue d'ensemble

Ce document décrit la configuration complète de la navigation pour les écrans QR Code du module Collaborations.

## 🗂️ Structure de navigation

### Stack Navigator Principal (`AppNavigator.tsx`)

Les écrans QR sont intégrés dans le Stack Navigator principal :

```typescript
// Écran "Mon QR Code"
<Stack.Screen 
  name={SCREENS.MY_QR_CODE} 
  options={{ 
    title: 'Mon QR Code Professionnel',
    headerShown: true,
    presentation: 'modal', // Animation modale sur iOS
    headerStyle: {
      backgroundColor: COLORS.primary,
    },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      fontWeight: FONT_WEIGHTS.bold,
    },
  }}
>
  {() => <LazyScreens.MyQRCodeScreen />}
</Stack.Screen>

// Écran "Scanner QR"
<Stack.Screen 
  name={SCREENS.SCAN_QR_COLLABORATEUR} 
  options={{ 
    headerShown: false, // Fullscreen pour la caméra
    presentation: 'fullScreenModal', // Plein écran sur iOS
    gestureEnabled: false, // Désactiver le swipe back
  }}
>
  {() => <LazyScreens.ScanQRCollaborateurScreen />}
</Stack.Screen>
```

## 🎨 Design des Cards QR

### Emplacement
Les cards QR sont placées en haut de l'écran `CollaborationScreen`, avant la liste des collaborateurs.

### Structure
```
┌─────────────────────────────────────┐
│  ┌──────────┐    ┌──────────┐      │
│  │ [QR Icon]│    │[Scan Icon]│     │
│  │          │    │           │     │
│  │Mon QR    │    │Scanner un │     │
│  │Code      │    │QR         │     │
│  │          │    │           │     │
│  │Partagez  │    │Ajouter    │     │
│  │pour être │    │rapidement │     │
│  │ajouté    │    │           │     │
│  └──────────┘    └──────────┘      │
└─────────────────────────────────────┘
```

### Styles
- **Card "Mon QR Code"** : Gradient bleu (`#4A90E2` → `#5BA3F0`)
- **Card "Scanner QR"** : Gradient vert (`#50E3C2` → `#6BEDD4`)
- **Icônes** : 28px dans un conteneur circulaire semi-transparent
- **Hauteur minimale** : 120px
- **Espacement** : `SPACING.md` entre les cards

## 🔐 Gestion des Permissions

### Permission Caméra

Avant de naviguer vers `ScanQRCollaborateurScreen`, les permissions caméra sont vérifiées :

```typescript
onPress={async () => {
  const { Camera } = await import('expo-camera');
  const { status } = await Camera.requestCameraPermissionsAsync();
  
  if (status === 'granted') {
    navigation.navigate(SCREENS.SCAN_QR_COLLABORATEUR as never);
  } else {
    Alert.alert(
      'Permission caméra requise',
      'Pour scanner les QR codes, nous avons besoin d\'accéder à votre caméra.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Paramètres', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }
        },
      ]
    );
  }
}}
```

## 📱 Options de Présentation

### MyQRCodeScreen
- **Type** : Modal
- **Header** : Visible avec style personnalisé
- **Animation** : Slide up (iOS), fade (Android)
- **Couleur header** : Bleu primaire (`COLORS.primary`)

### ScanQRCollaborateurScreen
- **Type** : Full Screen Modal
- **Header** : Masqué (fullscreen pour la caméra)
- **Animation** : Plein écran
- **Swipe back** : Désactivé (`gestureEnabled: false`)

## 🧭 Types de Navigation

### Fichier : `src/types/navigation.ts`

```typescript
export type CollaborationsStackParamList = {
  CollaborationsList: undefined;
  CollaborationDetails: { collaborationId: string };
  InviteCollaborator: { projetId: string };
  MyQRCode: undefined;
  ScanQRCollaborateur: { projetId?: string };
};
```

## 🔄 Flux de Navigation

### 1. Accès depuis CollaborationScreen
```
CollaborationScreen
  ├─ Card "Mon QR Code" → MyQRCodeScreen
  └─ Card "Scanner QR" → ScanQRCollaborateurScreen
```

### 2. Navigation depuis ScanQRCollaborateurScreen
```
ScanQRCollaborateurScreen
  ├─ Scan réussi → Modal de confirmation
  ├─ Confirmation → POST /collaborations/from-qr
  └─ Succès → Retour à CollaborationScreen + Toast
```

## 📦 Exports

### LazyScreens.tsx
```typescript
export { default as MyQRCodeScreen } from '../screens/Collaborations/MyQRCodeScreen';
export { default as ScanQRCollaborateurScreen } from '../screens/Collaborations/ScanQRCollaborateurScreen';
```

## 🎯 Points d'Attention

1. **Permissions** : Toujours vérifier les permissions caméra avant navigation
2. **Fullscreen** : L'écran scanner doit être en fullscreen pour une meilleure UX
3. **Swipe back** : Désactivé sur l'écran scanner pour éviter de fermer la caméra accidentellement
4. **Modal** : L'écran "Mon QR Code" est en modal pour une meilleure séparation visuelle
5. **Header** : Style personnalisé pour cohérence avec le design system

## 🐛 Dépannage

### Problème : Navigation ne fonctionne pas
- Vérifier que les écrans sont exportés dans `LazyScreens.tsx`
- Vérifier que les routes sont définies dans `AppNavigator.tsx`
- Vérifier que `SCREENS.MY_QR_CODE` et `SCREENS.SCAN_QR_COLLABORATEUR` sont définis dans `types.ts`

### Problème : Permissions caméra refusées
- Vérifier que `expo-camera` est installé
- Vérifier que les permissions sont demandées avant navigation
- Vérifier que `Info.plist` (iOS) et `AndroidManifest.xml` (Android) contiennent les permissions caméra

### Problème : Header ne s'affiche pas
- Vérifier que `headerShown: true` est défini pour `MyQRCodeScreen`
- Vérifier que les styles de header sont correctement appliqués

## 📚 Références

- [React Navigation - Stack Navigator](https://reactnavigation.org/docs/stack-navigator/)
- [Expo Camera - Permissions](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo Linking - Open Settings](https://docs.expo.dev/versions/latest/sdk/linking/)
