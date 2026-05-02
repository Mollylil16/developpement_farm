# QRCodeCard Component

Composant réutilisable pour afficher les cards QR Code dans différents endroits de l'application.

## 📦 Installation

Le composant est déjà inclus dans `src/components/Collaborations/QRCodeCard.tsx`.

## 🎨 Usage

### Mode Normal (Vertical)

```tsx
import QRCodeCard from '../components/Collaborations/QRCodeCard';

// Dans un écran avec layout horizontal
<View style={styles.qrSection}>
  <QRCodeCard 
    variant="my-qr" 
    onPress={() => navigation.navigate('MyQRCode')}
  />
  <QRCodeCard 
    variant="scan-qr" 
    onPress={() => navigation.navigate('ScanQRCollaborateur')}
  />
</View>
```

### Mode Compact (Horizontal)

```tsx
// Dans un écran avec espace limité
<QRCodeCard 
  variant="scan-qr" 
  compact 
  onPress={handleScan}
/>
```

### Avec État Désactivé

```tsx
<QRCodeCard 
  variant="my-qr" 
  onPress={handlePress}
  disabled={isLoading}
/>
```

## 📋 Props

| Prop | Type | Requis | Défaut | Description |
|------|------|--------|--------|-------------|
| `variant` | `'my-qr' \| 'scan-qr'` | ✅ | - | Variante de la card |
| `onPress` | `() => void` | ✅ | - | Fonction appelée au clic |
| `disabled` | `boolean` | ❌ | `false` | Désactive la card |
| `compact` | `boolean` | ❌ | `false` | Active le mode compact |

## 🎨 Variants

### `my-qr`
- **Icône** : `qr-code`
- **Couleur** : Dégradé bleu (`#4A90E2` → `#5BA3F0`)
- **Titre** : "Mon QR Code"
- **Description** : "Partagez votre profil"
- **Label accessibilité** : "Afficher mon QR Code professionnel"

### `scan-qr`
- **Icône** : `scan`
- **Couleur** : Dégradé vert (`#50E3C2` → `#6BEDD4`)
- **Titre** : "Scanner un QR"
- **Description** : "Ajouter un collaborateur"
- **Label accessibilité** : "Scanner un QR code de collaborateur"

## 📐 Modes d'Affichage

### Mode Normal
- **Layout** : Vertical (icône en haut)
- **Hauteur minimale** : 120px
- **Icône** : 28px dans un conteneur circulaire 56x56px
- **Chevron** : En bas (pointant vers le bas)

### Mode Compact
- **Layout** : Horizontal (icône à gauche, texte au centre, chevron à droite)
- **Hauteur minimale** : 60px
- **Icône** : 24px dans un conteneur circulaire 40x40px
- **Chevron** : À droite (pointant vers la droite)
- **Description** : Optionnelle (peut être masquée)

## ✨ Animations

### Touch Animation
- **Scale** : 0.95 (légère réduction)
- **Opacity** : 0.8 (légère opacité)
- **Type** : Spring animation (fluide)
- **Durée** : ~100ms

### Disabled State
- **Opacity** : 0.5 (réduit)
- **Transition** : 200ms (smooth)
- **Interaction** : Désactivée

## ♿ Accessibilité

Le composant implémente les bonnes pratiques d'accessibilité :

- ✅ `accessibilityRole="button"`
- ✅ `accessibilityLabel` personnalisé par variant
- ✅ `accessibilityHint` expliquant l'action
- ✅ `accessibilityState={{ disabled }}` pour l'état désactivé
- ✅ Support des lecteurs d'écran (VoiceOver, TalkBack)

## 🎯 Exemples d'Utilisation

### Dans CollaborationScreen

```tsx
<View style={styles.qrSection}>
  <QRCodeCard
    variant="my-qr"
    onPress={() => navigation.navigate('MyQRCode')}
  />
  <QRCodeCard
    variant="scan-qr"
    onPress={async () => {
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        navigation.navigate('ScanQRCollaborateur');
      } else {
        // Gérer le refus de permission
      }
    }}
  />
</View>
```

### Dans un Menu

```tsx
<View style={styles.menu}>
  <QRCodeCard 
    variant="my-qr" 
    compact 
    onPress={handleShowQR}
  />
  <QRCodeCard 
    variant="scan-qr" 
    compact 
    onPress={handleScan}
    disabled={!hasCameraPermission}
  />
</View>
```

### Dans une Liste

```tsx
<FlatList
  data={quickActions}
  renderItem={({ item }) => (
    <QRCodeCard
      variant={item.variant}
      compact
      onPress={item.onPress}
      disabled={item.disabled}
    />
  )}
/>
```

## 🔧 Styles

Le composant utilise le système de design de l'application :

- **Spacing** : `SPACING` constants
- **Border Radius** : `BORDER_RADIUS` constants
- **Font Sizes** : `FONT_SIZES` constants
- **Font Weights** : `FONT_WEIGHTS` constants
- **Shadows** : `LIGHT_COLORS.shadow` (medium pour normal, small pour compact)

## 🐛 Dépannage

### Card ne s'affiche pas
- Vérifier que le container parent a un style `flexDirection: 'row'` pour le mode normal
- Vérifier que les imports sont corrects

### Animations ne fonctionnent pas
- Vérifier que `useNativeDriver: true` est activé (déjà fait)
- Vérifier que les animations ne sont pas désactivées au niveau du système

### Accessibilité ne fonctionne pas
- Vérifier que les props d'accessibilité sont bien passées
- Tester avec VoiceOver (iOS) ou TalkBack (Android)

## 📚 Références

- [React Native Animations](https://reactnative.dev/docs/animations)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)
