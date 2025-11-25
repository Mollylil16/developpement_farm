# Logique du Menu Profil - Explication Complète

## 📋 Vue d'ensemble

Le menu profil gère les informations personnelles de l'utilisateur (nom, prénom, email, téléphone, photo). Il utilise **plusieurs sources de données** et les synchronise entre elles.

---

## 🔄 Sources de Données

Le profil utilise **3 sources de données** différentes :

### 1. **Base de données SQLite** (Source de vérité principale)
   - **Table** : `users`
   - **Colonnes** : `id`, `nom`, `prenom`, `email`, `telephone`, `photo`, `is_active`
   - **Service** : `databaseService.getUserById()` et `databaseService.updateUser()`
   - **Avantage** : Données persistantes et à jour

### 2. **Redux Store** (État global de l'application)
   - **Slice** : `authSlice`
   - **État** : `state.auth.user`
   - **Avantage** : Accès rapide, partagé entre tous les composants

### 3. **AsyncStorage** (Stockage local pour persistance)
   - **Clé** : `@fermier_pro:auth`
   - **Contenu** : JSON de l'objet `User`
   - **Avantage** : Persistance entre les redémarrages de l'app

---

## ⏱️ Moments de Chargement

### 1. **Au Démarrage de l'Application**

```typescript
// AppNavigator.tsx - ligne 237-240
useEffect(() => {
  // Charger l'utilisateur depuis le stockage au démarrage
  dispatch(loadUserFromStorageThunk());
}, [dispatch]);
```

**Flux de chargement** :
1. ✅ Lit `AsyncStorage` pour récupérer l'utilisateur sauvegardé
2. ✅ Vérifie si l'utilisateur existe dans la **base de données SQLite**
3. ✅ Si trouvé dans la DB → utilise les données de la DB (plus à jour)
4. ✅ Si pas trouvé dans la DB → utilise les données d'AsyncStorage
5. ✅ Met à jour le **Redux Store** avec les données récupérées

**Code** : `src/store/slices/authSlice.ts` - `loadUserFromStorageThunk()`

---

### 2. **Quand l'Écran Profil est Ouvert**

```typescript
// ProfilScreen.tsx - ligne 90-94
useFocusEffect(
  React.useCallback(() => {
    loadProfilData();
  }, [user?.id])
);
```

**Flux de chargement** :
1. ✅ Appelle `loadProfilData()` à chaque fois que l'écran revient au focus
2. ✅ Charge directement depuis la **base de données SQLite** via `databaseService.getUserById(user.id)`
3. ✅ Si trouvé dans la DB → remplit les champs du formulaire
4. ✅ Si pas trouvé → utilise les données du **Redux Store** comme fallback
5. ✅ Affiche un indicateur de chargement pendant le processus

**Code** : `src/screens/ProfilScreen.tsx` - `loadProfilData()`

---

### 3. **Pour l'Affichage dans le Dashboard**

```typescript
// useProfilData.ts - ligne 88-92
useFocusEffect(
  useCallback(() => {
    loadProfilPhoto();
  }, [loadProfilPhoto])
);
```

**Flux de chargement** :
1. ✅ Le hook `useProfilData()` charge la photo et les infos pour le Dashboard
2. ✅ Charge depuis la **base de données SQLite** via `databaseService.getUserById(user.id)`
3. ✅ Calcule les initiales (ex: "JD" pour "Jean Dupont")
4. ✅ Met à jour les états locaux (`profilPhotoUri`, `profilPrenom`, `profilInitiales`)
5. ✅ Se recharge automatiquement quand l'écran revient au focus

**Code** : `src/hooks/useProfilData.ts` - `loadProfilPhoto()`

---

## 💾 Processus de Sauvegarde

### Quand l'utilisateur clique sur "Enregistrer"

```typescript
// ProfilScreen.tsx - ligne 120-174
const validateAndSave = async () => {
  // 1. Validation des champs obligatoires
  if (!nom.trim() || !prenom.trim()) {
    Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires');
    return;
  }

  // 2. Mise à jour dans la base de données SQLite
  await databaseService.updateUser(user.id, {
    nom,
    prenom,
    email: email || undefined,
    telephone: telephone || undefined,
    photo: photo || undefined,
  });

  // 3. Recharger l'utilisateur dans Redux pour synchroniser
  await dispatch(loadUserFromStorageThunk());

  // 4. Afficher un message de succès
  Alert.alert('Succès', 'Profil enregistré avec succès');
};
```

**Flux de sauvegarde** :
1. ✅ **Validation** : Vérifie que nom et prénom sont remplis
2. ✅ **Mise à jour DB** : Appelle `databaseService.updateUser()` pour sauvegarder dans SQLite
3. ✅ **Synchronisation Redux** : Appelle `loadUserFromStorageThunk()` pour mettre à jour le store
4. ✅ **Synchronisation AsyncStorage** : `loadUserFromStorageThunk()` met aussi à jour AsyncStorage
5. ✅ **Feedback utilisateur** : Affiche un message de succès

---

## 🔍 Ordre de Priorité des Données

Quand plusieurs sources existent, l'ordre de priorité est :

1. **🥇 Base de données SQLite** (source de vérité)
   - Toujours utilisée en priorité
   - Contient les données les plus récentes

2. **🥈 Redux Store** (fallback)
   - Utilisé si la DB n'a pas de données
   - Peut être obsolète si pas synchronisé

3. **🥉 AsyncStorage** (fallback ultime)
   - Utilisé uniquement au démarrage si la DB n'est pas accessible
   - Peut être obsolète

---

## 📊 Schéma de Flux Complet

```
┌─────────────────────────────────────────────────────────────┐
│                    DÉMARRAGE DE L'APP                        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  loadUserFromStorageThunk()     │
        └────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
        ▼                                  ▼
┌───────────────┐                  ┌──────────────┐
│ AsyncStorage │                  │  SQLite DB   │
│   (lecture)  │                  │  (lecture)   │
└───────────────┘                  └──────────────┘
        │                                  │
        └────────────────┬─────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Redux Store    │
                │  (mise à jour)  │
                └─────────────────┘


┌─────────────────────────────────────────────────────────────┐
│              OUVERTURE DE L'ÉCRAN PROFIL                     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │     useFocusEffect()            │
        │     loadProfilData()            │
        └────────────────────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  SQLite DB      │
                │  getUserById()  │
                └─────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
        ▼                                  ▼
┌───────────────┐                  ┌──────────────┐
│  Données DB   │                  │  Redux Store │
│  (trouvées)   │                  │  (fallback)  │
└───────────────┘                  └──────────────┘
        │                                  │
        └────────────────┬─────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Formulaire     │
                │  (rempli)       │
                └─────────────────┘


┌─────────────────────────────────────────────────────────────┐
│              SAUVEGARDE DU PROFIL                            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   validateAndSave()             │
        └────────────────────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  SQLite DB      │
                │  updateUser()   │
                └─────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  loadUserFromStorageThunk()    │
        └────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
        ▼                                  ▼
┌───────────────┐                  ┌──────────────┐
│  Redux Store  │                  │ AsyncStorage │
│  (mis à jour) │                  │  (mis à jour)│
└───────────────┘                  └──────────────┘
```

---

## 🎯 Points Clés à Retenir

1. **La base de données SQLite est la source de vérité**
   - Toutes les modifications sont d'abord sauvegardées dans la DB
   - Les autres sources sont synchronisées après

2. **Chargement au focus de l'écran**
   - `useFocusEffect()` garantit que les données sont toujours à jour
   - Se recharge automatiquement quand l'utilisateur revient sur l'écran

3. **Système de fallback robuste**
   - Si la DB échoue → utilise Redux
   - Si Redux échoue → utilise AsyncStorage
   - L'application ne plante jamais même si une source échoue

4. **Synchronisation automatique**
   - Après chaque sauvegarde, toutes les sources sont mises à jour
   - Les autres composants (Dashboard, etc.) voient immédiatement les changements

---

## 🔧 Fichiers Impliqués

- **`src/screens/ProfilScreen.tsx`** : Écran principal du profil
- **`src/hooks/useProfilData.ts`** : Hook pour charger les données de profil
- **`src/store/slices/authSlice.ts`** : Gestion de l'état Redux et AsyncStorage
- **`src/services/database.ts`** : Service de base de données SQLite
- **`src/navigation/AppNavigator.tsx`** : Chargement initial au démarrage

---

## ⚠️ Notes Importantes

- Les données sont **toujours chargées depuis la DB** quand l'écran profil s'ouvre
- Le Redux Store est utilisé comme **cache** et **fallback**
- AsyncStorage est utilisé uniquement pour la **persistance au démarrage**
- La photo de profil est stockée comme **URI locale** (chemin du fichier)
- Les initiales sont **calculées dynamiquement** à partir du nom et prénom

