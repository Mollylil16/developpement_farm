# 📳 Guide Shake-to-Cancel (Secouer pour Annuler)

## ✅ Fonctionnalité activée

La fonctionnalité **shake-to-cancel** (secouer le téléphone pour annuler) est maintenant activée dans l'application !

## 🎯 Comment ça marche

### 1. **Détection automatique**
Lorsqu'un modal est ouvert, l'application écoute les mouvements du téléphone via les capteurs d'accélération.

### 2. **Secousse détectée**
Quand vous secouez votre téléphone avec suffisamment de force :
- 📳 Un **retour haptique** (vibration) se déclenche
- 🔔 Une **alerte de confirmation** apparaît
- ✋ Vous pouvez **confirmer ou annuler** l'action

### 3. **Confirmation intelligente**
Pour éviter les annulations accidentelles, une alerte de confirmation s'affiche :
```
🔔 Secousse détectée
Voulez-vous annuler cette action ?

[Non]  [Oui, annuler]
```

## 📱 Où est-ce disponible ?

### ✅ Tous les modaux `CustomModal`
La fonctionnalité est **activée par défaut** dans tous les modaux qui utilisent le composant `CustomModal`, notamment :

- ✅ **Mortalités** : Création/modification de mortalités
- ✅ **Planifications** : Ajout/édition de tâches planifiées
- ✅ **Gestations** : Gestion des gestations
- ✅ **Sevrages** : Enregistrement des sevrages
- ✅ **Finances** : Ajout de revenus/dépenses
- ✅ **Nutrition** : Gestion des stocks et rations
- ✅ **Et tous les autres modaux de l'application**

## 🎛️ Personnalisation

### Pour les développeurs

#### Désactiver le shake-to-cancel pour un modal spécifique :
```typescript
<CustomModal
  visible={modalVisible}
  onClose={handleClose}
  title="Mon Modal"
  enableShakeToCancel={false} // Désactiver
>
  {/* Contenu */}
</CustomModal>
```

#### Ajuster la sensibilité :
```typescript
<CustomModal
  visible={modalVisible}
  onClose={handleClose}
  title="Mon Modal"
  shakeThreshold={20} // Plus haut = moins sensible (défaut: 15)
>
  {/* Contenu */}
</CustomModal>
```

#### Utiliser le hook personnalisé dans un composant :
```typescript
import { useShakeToCancel } from '../hooks/useShakeToCancel';

function MyComponent() {
  const [isEditing, setIsEditing] = useState(false);
  
  useShakeToCancel({
    enabled: isEditing,
    onShake: () => {
      Alert.alert(
        'Annuler les modifications ?',
        'Les changements non sauvegardés seront perdus',
        [
          { text: 'Continuer', style: 'cancel' },
          { text: 'Annuler', onPress: () => setIsEditing(false) }
        ]
      );
    },
    threshold: 15, // Sensibilité (optionnel)
    cooldown: 1000, // Délai entre deux détections (optionnel)
  });
  
  // ...
}
```

## 🔧 Configuration technique

### Paramètres par défaut :
- **Seuil de détection** : `15` (unités d'accélération)
- **Cooldown** : `1000ms` (1 seconde entre deux détections)
- **Retour haptique** : `NotificationFeedbackType.Warning`

### Comment fonctionne la détection :

1. **Capteurs utilisés** : Accéléromètre (expo-sensors)
2. **Calcul de l'accélération** : `√(x² + y² + z²)`
3. **Déclenchement** : Quand accélération > seuil
4. **Protection** : Cooldown pour éviter les déclenchements multiples

## 🎨 Expérience utilisateur

### Avantages :
- ✅ **Intuitif** : Geste naturel de "secouer pour annuler"
- ✅ **Rapide** : Plus rapide que chercher le bouton "Annuler"
- ✅ **Sécurisé** : Confirmation avant annulation
- ✅ **Feedback** : Vibration instantanée
- ✅ **Universel** : Fonctionne sur iOS et Android

### Cas d'usage typiques :
- 🚫 Annuler une saisie longue (formulaire)
- ⏪ Revenir en arrière rapidement
- 🗑️ Abandonner une modification
- ❌ Fermer un modal sans sauvegarder

## 📊 États du système

| État | Shake-to-Cancel |
|------|----------------|
| Modal ouvert | ✅ Actif |
| Modal fermé | ❌ Inactif |
| Loading en cours | ❌ Inactif (sécurité) |
| Désactivé manuellement | ❌ Inactif |

## 🔒 Permissions requises

### iOS
- Permission accordée automatiquement par Expo
- Aucune configuration supplémentaire requise

### Android
- Permission accordée automatiquement
- Capteurs de mouvement accessibles par défaut

## 💡 Conseils d'utilisation

### Pour les utilisateurs :
1. **Secouez fermement** le téléphone (pas trop fort non plus !)
2. **Attendez la vibration** pour confirmation
3. **Choisissez** dans l'alerte si vous voulez vraiment annuler
4. **Réessayez** si nécessaire (délai de 1 seconde entre deux tentatives)

### Sensibilité :
- 🟢 **Seuil 10-12** : Très sensible (détecte les petits mouvements)
- 🟡 **Seuil 15** : Équilibré (recommandé) ⭐
- 🔴 **Seuil 20-25** : Peu sensible (nécessite une secousse forte)

## 🐛 Dépannage

### La secousse n'est pas détectée :
1. Vérifiez que le modal est bien ouvert
2. Secouez plus fort
3. Vérifiez que `enableShakeToCancel` n'est pas à `false`
4. Vérifiez que le téléphone a des capteurs de mouvement

### Trop de fausses détections :
1. Augmentez le `shakeThreshold` (par exemple : 20)
2. Augmentez le `cooldown` (par exemple : 2000ms)

### Pas de vibration :
1. Vérifiez les paramètres de vibration du téléphone
2. Le téléphone peut être en mode silencieux (désactive les vibrations sur certains appareils)

## 📱 Compatibilité

- ✅ iOS 11+
- ✅ Android 5.0+
- ✅ Téléphones avec accéléromètre
- ❌ Web (capteurs non disponibles)
- ❌ Émulateurs/Simulateurs (capteurs simulés)

## 🎯 Résultat

Une fonctionnalité **intuitive**, **rapide** et **sécurisée** pour annuler des actions en secouant simplement votre téléphone ! 🚀

---

**Status**: ✅ Fonctionnalité implémentée et active
**Version**: 1.0.0
**Dépendances**: `expo-sensors`, `expo-haptics`

