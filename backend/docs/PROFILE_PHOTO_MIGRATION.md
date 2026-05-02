# 🔄 Migration et Nettoyage des URIs Locales de Photos de Profil

**Date**: 2025-01-XX  
**Version**: 1.0.0

## 📋 Vue d'ensemble

Ce document décrit le système de migration et de nettoyage des URIs locales (`file://`, `content://`, `ph://`, etc.) dans la colonne `photo` de la table `users`. Les URIs locales ne doivent pas être stockées en base de données car elles sont spécifiques à chaque appareil et ne sont pas accessibles depuis d'autres terminaux.

## 🎯 Objectifs

1. **Nettoyer les données existantes** : Supprimer toutes les URIs locales de la base de données
2. **Prévenir les futures erreurs** : Valider côté backend pour rejeter les URIs locales
3. **Migration côté client** : Nettoyer automatiquement les URIs locales au démarrage de l'application

## 📁 Fichiers Créés

### 1. Migration SQL : `backend/database/migrations/081_clean_local_photo_uris.sql`

Migration PostgreSQL qui :
- Identifie tous les utilisateurs avec des URIs locales
- Remplace ces URIs par `NULL`
- Logge le nombre d'utilisateurs affectés
- Vérifie qu'aucune URI locale ne reste après la migration

**Exécution** :
```bash
cd backend
psql -U farmtrack_user -d farmtrack_db -f database/migrations/081_clean_local_photo_uris.sql
```

### 2. Fonction Backend : `UsersService.cleanLocalPhotoUris()`

Méthode NestJS dans `backend/src/users/users.service.ts` qui :
- Compte les utilisateurs avec des URIs locales
- Nettoie ces URIs en les remplaçant par `NULL`
- Logge les résultats détaillés
- Retourne le nombre d'utilisateurs affectés

**Utilisation** :
```typescript
const usersService = new UsersService(databaseService);
const affectedCount = await usersService.cleanLocalPhotoUris();
console.log(`${affectedCount} utilisateurs nettoyés`);
```

### 3. Validation Backend : `UsersService.update()`

Validation ajoutée dans la méthode `update()` qui :
- Détecte les tentatives de mise à jour avec des URIs locales
- Rejette ces mises à jour avec une erreur explicite
- Logge les tentatives rejetées

**Erreur retournée** :
```
BadRequestException: Les URIs locales (file://, content://, ph://, etc.) ne peuvent pas être stockées en base de données. 
Veuillez uploader la photo vers le serveur en utilisant l'endpoint /users/:id/photo
```

### 4. Migration Client : `App.tsx`

Hook `useEffect` dans `AppContent` qui :
- Détecte les URIs locales dans `user.photo` au démarrage
- Nettoie automatiquement ces URIs en appelant `userRepo.update(user.id, { photo: null })`
- Recharge le profil depuis le serveur pour synchroniser
- S'exécute une seule fois par session

## 🔍 URIs Locales Détectées

Les schémas d'URI suivants sont considérés comme locaux et seront nettoyés :

- `file://` - Fichiers locaux
- `content://` - Content Provider (Android)
- `ph://` - Photo Library (iOS)
- `assets-library://` - Assets Library (iOS)
- `ph-asset://` - Photo Asset (iOS)

## 📊 Logs et Monitoring

### Migration SQL

Les logs PostgreSQL affichent :
```
[Migration 081] Nombre d'utilisateurs avec URIs locales détectés: X
[Migration 081] Nombre d'utilisateurs nettoyés: X
[Migration 081] ✅ Vérification: Aucune URI locale restante
```

### Backend (NestJS)

Les logs affichent :
```
[UsersService] [cleanLocalPhotoUris] Début du nettoyage des URIs locales...
[UsersService] [cleanLocalPhotoUris] X utilisateur(s) avec URI(s) locale(s) détecté(s)
[UsersService] [cleanLocalPhotoUris] ✅ X utilisateur(s) nettoyé(s) avec succès
```

### Client (React Native)

Les logs en mode développement affichent :
```
[Migration Client] Détection d'URI locale dans user.photo pour userId=user_123, photo=file://...
[Migration Client] ✅ URI locale nettoyée pour userId=user_123
```

## 🚀 Déploiement

### Étape 1 : Migration SQL (Backend)

Exécuter la migration SQL sur la base de données de production :

```bash
cd backend
psql -U farmtrack_user -d farmtrack_db -f database/migrations/081_clean_local_photo_uris.sql
```

### Étape 2 : Déploiement Backend

Déployer le nouveau code backend avec :
- La fonction `cleanLocalPhotoUris()`
- La validation dans `update()`

### Étape 3 : Déploiement Frontend

Déployer le nouveau code frontend avec :
- Le hook `useEffect` dans `App.tsx`
- L'import de `isLocalUri` depuis `profilePhotoUtils`

### Étape 4 : Migration Automatique Client

Les utilisateurs existants avec des URIs locales verront leur photo nettoyée automatiquement au prochain démarrage de l'application.

## ✅ Vérification Post-Migration

### Vérifier dans la base de données

```sql
-- Compter les URIs locales restantes (devrait être 0)
SELECT COUNT(*) 
FROM users 
WHERE photo IS NOT NULL 
  AND (
    photo LIKE 'file://%'
    OR photo LIKE 'content://%'
    OR photo LIKE 'ph://%'
    OR photo LIKE 'assets-library://%'
    OR photo LIKE 'ph-asset://%'
  );
```

### Vérifier les logs backend

Vérifier que la fonction `cleanLocalPhotoUris()` a bien nettoyé toutes les URIs locales.

### Vérifier les logs client

En mode développement, vérifier que la migration côté client fonctionne correctement.

## 🔒 Sécurité

- ✅ Les URIs locales sont rejetées côté backend avant d'être stockées
- ✅ La migration SQL est idempotente (peut être exécutée plusieurs fois sans effet)
- ✅ Les logs ne contiennent pas d'informations sensibles (seulement les IDs et les préfixes d'URI)

## 📝 Notes Importantes

1. **Migration unique** : La migration SQL doit être exécutée une seule fois, mais elle est idempotente
2. **Migration client** : S'exécute automatiquement au démarrage pour chaque utilisateur concerné
3. **Validation préventive** : La validation backend empêche l'ajout de nouvelles URIs locales
4. **Pas de perte de données** : Les photos ne sont pas supprimées, seulement les URIs locales invalides

## 🐛 Dépannage

### Problème : Des URIs locales persistent après la migration

**Solution** :
1. Vérifier que la migration SQL a bien été exécutée
2. Vérifier que la validation backend est active
3. Exécuter manuellement `cleanLocalPhotoUris()` via l'API

### Problème : Erreur "Les URIs locales ne peuvent pas être stockées"

**Solution** :
- C'est normal ! L'utilisateur doit uploader la photo via l'endpoint `/users/:id/photo` au lieu de passer directement l'URI locale

### Problème : La migration client ne s'exécute pas

**Solution** :
1. Vérifier que l'utilisateur est bien connecté
2. Vérifier que `user.photo` contient bien une URI locale
3. Vérifier les logs en mode développement

## 📚 Références

- [Documentation Upload Photo de Profil](./PROFILE_PHOTO_UPLOAD.md)
- [Utilitaires Photo de Profil](../../src/utils/profilePhotoUtils.ts)
- [Service de Synchronisation de Profil](../../src/services/profileSyncService.ts)
