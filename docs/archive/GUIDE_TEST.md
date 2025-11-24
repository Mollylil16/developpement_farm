# 🧪 Guide de Test - Fermier Pro

## 📱 Prérequis

1. **Expo Go installé** sur votre téléphone :
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

2. **Même réseau WiFi** : Votre téléphone et votre ordinateur doivent être sur le même réseau WiFi

## 🚀 Démarrage de l'application

### Étape 1 : Ouvrir le terminal
Ouvrez un terminal dans le dossier `fermier-pro` :

```bash
cd fermier-pro
```

### Étape 2 : Installer les dépendances (si nécessaire)
```bash
npm install
```

### Étape 3 : Démarrer Expo
```bash
npm start
```

ou

```bash
npx expo start
```

### Étape 4 : Scanner le QR Code
- **Android** : Ouvrez Expo Go → Appuyez sur "Scan QR code" → Scannez le QR code dans le terminal
- **iOS** : Ouvrez l'appareil photo → Scannez le QR code → Appuyez sur la notification

## ✅ Checklist de Test

### 🔐 Authentification
- [ ] **Page de bienvenue** : Vérifier que le logo s'affiche avec animations
- [ ] **Bouton "Commencer"** : Cliquer et vérifier la navigation vers l'authentification
- [ ] **Page d'authentification** :
  - [ ] Tester l'inscription avec email/nom/prénom
  - [ ] Tester la connexion avec email/mot de passe
  - [ ] Vérifier les boutons Google et Apple (simulation)
  - [ ] Basculer entre "Connexion" et "Inscription"

### 🏡 Création de Projet
- [ ] **Formulaire de création** :
  - [ ] Remplir toutes les sections (Informations générales, Effectifs, Statistiques)
  - [ ] Vérifier la validation des champs requis
  - [ ] Vérifier que les champs numériques acceptent uniquement des nombres
  - [ ] Ajouter des notes optionnelles
  - [ ] Cliquer sur "Créer ma ferme"
- [ ] **Navigation automatique** : Vérifier que l'app redirige vers le Dashboard après création

### 📊 Dashboard
- [ ] **Header** :
  - [ ] Vérifier l'affichage du nom de la ferme
  - [ ] Vérifier l'affichage de la date du jour
  - [ ] Vérifier le badge "Actif"
- [ ] **Widgets principaux** :
  - [ ] Vue d'ensemble : Vérifier les statistiques (Truies, Verrats, Porcelets)
  - [ ] Reproduction : Cliquer et vérifier la navigation
  - [ ] Finance : Cliquer et vérifier la navigation
  - [ ] Performance : Cliquer et vérifier la navigation
- [ ] **Widgets secondaires** :
  - [ ] Nutrition : Cliquer et vérifier la navigation
  - [ ] Planning : Cliquer et vérifier la navigation
  - [ ] Collaboration : Cliquer et vérifier la navigation
  - [ ] Mortalités : Cliquer et vérifier la navigation
- [ ] **Animations** : Vérifier que les widgets apparaissent avec des animations fluides

### 🔄 Navigation
- [ ] **Barre d'onglets** :
  - [ ] Vérifier que seuls 5 onglets sont visibles (Dashboard, Reproduction, Finance, Rapports, Paramètres)
  - [ ] Vérifier que les onglets occupent toute la largeur
  - [ ] Cliquer sur chaque onglet et vérifier la navigation
- [ ] **Navigation entre modules** :
  - [ ] Depuis le Dashboard, accéder à chaque module
  - [ ] Vérifier que le retour fonctionne correctement

### 📈 Modules Fonctionnels

#### Reproduction
- [ ] Vérifier l'affichage de la liste des gestations
- [ ] Ajouter une nouvelle gestation
- [ ] Modifier une gestation existante
- [ ] Marquer une gestation comme terminée
- [ ] Supprimer une gestation

#### Finance
- [ ] **Vue d'ensemble** : Vérifier les graphiques et statistiques
- [ ] **Charges fixes** :
  - [ ] Ajouter une charge fixe
  - [ ] Modifier une charge fixe
  - [ ] Suspendre/Activer une charge fixe
  - [ ] Supprimer une charge fixe
- [ ] **Dépenses ponctuelles** :
  - [ ] Ajouter une dépense
  - [ ] Modifier une dépense
  - [ ] Supprimer une dépense

#### Nutrition
- [ ] Vérifier l'affichage des rations
- [ ] Ajouter une nouvelle ration
- [ ] Consulter l'historique

#### Planification
- [ ] Vérifier l'affichage des tâches
- [ ] Ajouter une nouvelle tâche
- [ ] Marquer une tâche comme complétée
- [ ] Vérifier le calendrier

#### Collaboration
- [ ] Vérifier l'affichage des collaborateurs
- [ ] Ajouter un collaborateur
- [ ] Modifier les permissions
- [ ] Accepter une invitation

#### Mortalités
- [ ] Vérifier l'affichage des mortalités
- [ ] Ajouter une mortalité
- [ ] Vérifier les statistiques automatiques

#### Rapports
- [ ] Vérifier l'affichage des indicateurs de performance
- [ ] Consulter les recommandations

#### Paramètres
- [ ] **Projet** :
  - [ ] Vérifier les informations du projet actif
  - [ ] Voir la liste des autres projets
  - [ ] Changer de projet actif
- [ ] **Application** :
  - [ ] Vérifier les informations de l'application
  - [ ] Tester la déconnexion

### 🎨 Design et UX
- [ ] **Animations** :
  - [ ] Vérifier que les animations sont fluides
  - [ ] Vérifier qu'il n'y a pas de lag
- [ ] **Espacement** :
  - [ ] Vérifier que les éléments ne sont pas encombrés
  - [ ] Vérifier que le padding est correct sur toutes les pages
- [ ] **Couleurs et typographie** :
  - [ ] Vérifier que les couleurs sont cohérentes
  - [ ] Vérifier que les textes sont lisibles

### 🔒 Persistance des données
- [ ] **Session** :
  - [ ] Fermer l'application
  - [ ] Rouvrir l'application
  - [ ] Vérifier que vous êtes toujours connecté
- [ ] **Données** :
  - [ ] Ajouter des données (gestations, dépenses, etc.)
  - [ ] Fermer l'application
  - [ ] Rouvrir l'application
  - [ ] Vérifier que les données sont toujours présentes

## 🐛 Problèmes Courants

### L'application ne démarre pas
- Vérifiez que vous êtes dans le bon dossier (`fermier-pro`)
- Vérifiez que toutes les dépendances sont installées (`npm install`)
- Vérifiez que le port 8081 n'est pas utilisé par une autre application

### Impossible de scanner le QR code
- Vérifiez que votre téléphone et votre ordinateur sont sur le même réseau WiFi
- Essayez de redémarrer Expo (`Ctrl+C` puis `npm start`)
- Sur Android, essayez d'utiliser l'option "Enter URL manually" dans Expo Go

### L'application se ferme soudainement
- Vérifiez les logs dans le terminal pour voir les erreurs
- Essayez de redémarrer Expo
- Vérifiez que votre téléphone a assez d'espace de stockage

### Les données ne se sauvegardent pas
- Vérifiez que vous avez créé un projet
- Vérifiez que vous êtes connecté
- Essayez de redémarrer l'application

## 📝 Notes de Test

### Scénario de test complet recommandé :
1. **Première utilisation** :
   - Ouvrir l'application
   - Passer par la page de bienvenue
   - S'inscrire avec email/nom/prénom
   - Créer un projet de ferme
   - Explorer le Dashboard

2. **Utilisation normale** :
   - Ajouter des gestations
   - Ajouter des dépenses
   - Ajouter des charges fixes
   - Consulter les rapports
   - Ajouter des tâches de planification

3. **Test de persistance** :
   - Fermer l'application
   - Rouvrir l'application
   - Vérifier que tout est toujours là

4. **Test de navigation** :
   - Naviguer entre tous les modules
   - Vérifier que la barre d'onglets fonctionne
   - Vérifier que les widgets du Dashboard fonctionnent

## 🎯 Points d'attention

- **Performance** : L'application devrait être fluide, sans lag
- **Design** : Les pages ne doivent pas être encombrées
- **Navigation** : La navigation doit être intuitive
- **Données** : Les données doivent persister après fermeture
- **Animations** : Les animations doivent être fluides et agréables

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans le terminal
2. Consultez la section "Problèmes Courants" ci-dessus
3. Redémarrez Expo et l'application
4. Vérifiez que toutes les dépendances sont à jour

---

**Bon test ! 🚀**

