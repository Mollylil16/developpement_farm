# Guide de démarrage rapide - Fermier Pro

## 🚀 Tester avec Expo Go

Oui, vous pouvez tester l'application avec **Expo Go** ! Toutes les dépendances utilisées sont compatibles.

### Étapes pour démarrer

1. **Installer les dépendances**

   ```bash
   cd fermier-pro
   npm install
   ```

2. **Démarrer le serveur Expo**

   ```bash
   npm start
   ```

   ou

   ```bash
   npx expo start
   ```

3. **Scannez le QR code**
   - **iOS** : Ouvrez l'app **Expo Go** et scannez le QR code avec l'appareil photo
   - **Android** : Ouvrez l'app **Expo Go** et scannez le QR code, ou utilisez l'appareil photo

### Commandes alternatives

- **Démarrer avec tunnel** (si vous êtes sur des réseaux différents) :

  ```bash
  npx expo start --tunnel
  ```

- **Démarrer sur Android directement** :

  ```bash
  npm run android
  ```

  (nécessite un émulateur Android ou un appareil connecté)

- **Démarrer sur iOS directement** :
  ```bash
  npm run ios
  ```
  (nécessite un Mac avec Xcode)

### Compatibilité Expo Go

✅ **Toutes ces dépendances sont compatibles avec Expo Go :**

- expo-sqlite (Base de données)
- expo-image-picker (Photos de reçus)
- react-native-calendars (Calendrier)
- react-native-chart-kit (Graphiques)
- react-native-reanimated (Animations)
- react-native-gesture-handler (Gestes)
- @react-navigation/\* (Navigation)
- @react-native-community/datetimepicker (Sélecteur de date)

### Première utilisation

1. Au démarrage, vous verrez l'écran de **création de projet**
2. Remplissez le formulaire avec les informations de votre ferme
3. Une fois créé, vous accéderez au **Dashboard** principal
4. Naviguez entre les modules via les onglets en bas

### Dépannage

**Si vous voyez des erreurs de compilation :**

```bash
# Nettoyer le cache
npx expo start -c
```

**Si l'app ne se charge pas :**

- Vérifiez que vous êtes sur le même réseau WiFi (ou utilisez `--tunnel`)
- Redémarrez Expo Go sur votre téléphone
- Redémarrez le serveur Expo

**Si les animations ne fonctionnent pas :**

- Assurez-vous d'avoir la dernière version d'Expo Go
- Redémarrez l'application

### Notes importantes

- L'application utilise **SQLite** pour stocker les données localement
- Les données sont persistées même après fermeture de l'app
- Pas besoin de connexion internet pour utiliser l'application
- Les photos de reçus sont stockées localement

### Support

Si vous rencontrez des problèmes, vérifiez :

1. Version de Node.js (LTS recommandé)
2. Version d'Expo Go à jour
3. Connexion réseau stable

**Bon test ! 🐷📱**
