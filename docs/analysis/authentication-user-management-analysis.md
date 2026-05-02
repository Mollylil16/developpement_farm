# Analyse du Module AUTHENTICATION & USER MANAGEMENT

**Date** : 2025-01-XX  
**Module** : Authentification et Gestion des Utilisateurs  
**Priorité** : HAUTE (Sécurité critique)

---

## 📋 État Actuel du Module

### Architecture

Le module d'authentification utilise une architecture token-based avec :
- **Tokens d'accès** (Access Tokens) : Stockés dans AsyncStorage, utilisés pour les requêtes API
- **Refresh Tokens** : Utilisés pour renouveler les tokens d'accès expirés
- **OAuth** : Support pour Google et Apple Sign-In
- **Stockage** : AsyncStorage pour les tokens et l'utilisateur (compatibilité)

### Fichiers Principaux

**Frontend** :
- `src/store/slices/authSlice.ts` - Redux slice pour l'authentification
- `src/screens/AuthScreen.tsx` - Écran de connexion/inscription
- `src/services/auth/oauthService.ts` - Service OAuth (Google/Apple)
- `src/utils/validation.ts` - Validation des données d'inscription
- `src/services/api/apiClient.ts` - Client API avec gestion automatique des tokens

**Backend** :
- `backend/src/auth/auth.service.ts` - Service d'authentification backend
- `backend/src/auth/auth.controller.ts` - Contrôleur d'authentification

---

## 🔍 Problèmes Détectés

### 🔴 CRITIQUE - Problèmes de Sécurité

#### 1. Stockage des Tokens en Clair dans AsyncStorage

**Problème** :
- Les tokens sont stockés en **clair** dans AsyncStorage
- AsyncStorage n'est pas chiffré par défaut
- Risque : Si l'appareil est compromis, les tokens peuvent être extraits

**Code concerné** :
```typescript:src/services/api/apiClient.ts
// Lignes 122-129
async function setTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken); // ⚠️ Stockage en clair
    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken); // ⚠️ Stockage en clair
    }
  } catch (error) {
    logger.error('Erreur lors du stockage des tokens:', error);
  }
}
```

**Impact** : 🔴 **HAUTE** - Vulnérabilité de sécurité critique

**Recommandation** :
- Utiliser `expo-secure-store` ou `react-native-keychain` pour stocker les tokens de manière sécurisée
- Ces bibliothèques utilisent le Keychain iOS / Keystore Android (chiffré)

---

#### 2. Logs Potentiels des Tokens

**Problème** :
- Les tokens peuvent être loggés accidentellement dans les logs
- Les logs sont visibles dans les outils de développement

**Code concerné** :
```typescript:src/services/api/apiClient.ts
// Ligne 109
// Ne logger le token que si le logging très détaillé est activé (évite les logs excessifs)
// Le token est récupéré à chaque requête API, donc pas besoin de logger systématiquement
return token;
```

**Impact** : 🟡 **MOYENNE** - Risque de fuite de tokens dans les logs

**Recommandation** :
- Ajouter un filtre de logs qui masque automatiquement les tokens
- Ne jamais logger les tokens, même en mode développement

---

#### 3. Validation du Mot de Passe Incohérente (Backend vs Frontend)

**Problème** :
- **Frontend** : Validation stricte (8 caractères min, majuscules, minuscules, chiffres)
- **Backend** : Validation faible (6 caractères min uniquement)
- Un attaquant peut contourner la validation frontend et créer un compte avec un mot de passe faible (6 caractères)

**Code concerné** :

**Frontend** (`src/utils/validation.ts`, lignes 68-100) :
```typescript
export function validatePassword(password: string): ValidationResult {
  if (password.length < 8) { // ⚠️ Frontend : 8 caractères min
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/(?=.*[a-z])/.test(password)) { // ⚠️ Frontend : minuscules requises
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  if (!/(?=.*[A-Z])/.test(password)) { // ⚠️ Frontend : majuscules requises
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  if (!/(?=.*\d)/.test(password)) { // ⚠️ Frontend : chiffres requis
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
}
```

**Backend** (`backend/src/auth/dto/register.dto.ts`, lignes 28-32) :
```typescript
@MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' }) // ⚠️ Backend : 6 caractères min
@MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
password?: string;
```

**Impact** : 🔴 **HAUTE** - Sécurité compromise, validation peut être contournée

**Recommandation** :
- **CRITIQUE** : Aligner la validation backend avec la validation frontend
- Backend doit exiger : 8 caractères min, majuscules, minuscules, chiffres
- Ajouter une validation backend avec `class-validator` personnalisée ou utiliser `Matches()` avec regex

---

#### 4. Pas de Rotation des Refresh Tokens

**Problème** :
- Lors du refresh, le même refresh token est utilisé jusqu'à expiration
- Pas de rotation des refresh tokens (nouveau refresh token à chaque refresh)

**Code concerné** :
```typescript:src/services/api/apiClient.ts
// Lignes 217-218
const data = await response.json();
await setTokens(data.access_token, data.refresh_token); // ⚠️ Pas de vérification si refresh_token existe
```

**Impact** : 🟡 **MOYENNE** - Risque si un refresh token est compromis

**Recommandation** :
- Implémenter la rotation des refresh tokens (Backend + Frontend)
- Invalider l'ancien refresh token lors de l'émission d'un nouveau

---

### 🟡 MOYEN - Problèmes de Performance et UX

#### 5. Double Stockage Utilisateur (AsyncStorage + Redux)

**Problème** :
- L'utilisateur est stocké dans AsyncStorage **ET** dans Redux
- Redondance inutile
- Risque de désynchronisation

**Code concerné** :
```typescript:src/store/slices/authSlice.ts
// Lignes 77-78
await saveUserToStorage(user); // Stockage AsyncStorage
// ... puis stockage dans Redux via fulfilled
```

**Impact** : 🟢 **FAIBLE** - Performance et maintenabilité

**Recommandation** :
- Supprimer le stockage AsyncStorage de l'utilisateur
- Utiliser uniquement Redux + persist pour la persistance
- Garder uniquement les tokens dans AsyncStorage (ou SecureStore)

---

#### 6. Cooldown sur Refresh Token (2 secondes)

**Problème** :
- Cooldown de 2 secondes peut causer des délais perceptibles pour l'utilisateur
- Si plusieurs requêtes échouent simultanément (401), elles doivent attendre

**Code concerné** :
```typescript:src/services/api/apiClient.ts
// Ligne 28
const REFRESH_COOLDOWN = 2000; // 2 secondes entre les tentatives de refresh
```

**Impact** : 🟢 **FAIBLE** - UX dégradée dans certains cas

**Recommandation** :
- Réduire le cooldown à 500ms (suffisant pour éviter les appels multiples)
- Le verrouillage par `activeRefreshPromises` devrait suffire

---

#### 7. Gestion des Erreurs OAuth

**Problème** :
- Les erreurs OAuth peuvent ne pas être clairement communiquées à l'utilisateur
- Pas de gestion spécifique pour les erreurs de consentement utilisateur

**Code concerné** :
```typescript:src/store/slices/authSlice.ts
// Lignes 354-357
} catch (error: unknown) {
  return rejectWithValue(getErrorMessage(error)); // ⚠️ Message générique
}
```

**Impact** : 🟢 **FAIBLE** - UX dégradée

**Recommandation** :
- Ajouter des messages d'erreur spécifiques pour les différents cas OAuth
- Gérer spécifiquement le cas où l'utilisateur annule la connexion

---

### 🟢 MINEUR - Améliorations Recommandées

#### 8. Validation Email Dupliquée

**Problème** :
- Validation email dans `AuthScreen.tsx` ET dans `validation.ts`
- Logique dupliquée

**Code concerné** :
```typescript:src/screens/AuthScreen.tsx
// Lignes 95-99
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(identifier.trim())) {
  Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
  return;
}
```

**Impact** : 🟢 **FAIBLE** - Code dupliqué

**Recommandation** :
- Utiliser uniquement `validateEmail` de `validation.ts`
- Supprimer la validation dupliquée dans `AuthScreen.tsx`

---

#### 9. Pas de Rate Limiting Visible Côté Client

**Problème** :
- Pas de protection contre les tentatives de connexion répétées côté client
- Seule protection : retry avec backoff, mais pas de rate limiting pour l'auth

**Impact** : 🟢 **FAIBLE** - Dépend du backend

**Recommandation** :
- Ajouter un rate limiting côté client pour les tentatives de connexion (ex: 5 tentatives max par minute)
- Implémenter un système de "lockout" temporaire après échecs répétés

---

## 🔗 Dépendances avec Autres Modules

### Dépendances Sortantes (Ce module utilise)

1. **API Client** (`src/services/api/apiClient.ts`)
   - Utilisé pour toutes les requêtes d'authentification
   - Dépendance : Gestion des tokens, retry, refresh

2. **Redux Store** (`src/store/`)
   - Utilisé pour stocker l'état d'authentification
   - Dépendance : `projetSlice` (réinitialisation du projet actif lors de la déconnexion)

3. **SQLite Local** (`src/database/repositories`)
   - Utilisé pour lier les collaborateurs aux utilisateurs
   - Dépendance : `CollaborateurRepository`

4. **OAuth Services** (`src/services/auth/oauthService.ts`)
   - Utilisé pour Google et Apple Sign-In
   - Dépendance : Expo AuthSession

5. **Validation Utils** (`src/utils/validation.ts`)
   - Utilisé pour valider les données d'inscription
   - Dépendance : Fonctions de validation

### Dépendances Entrantes (Autres modules utilisent ce module)

1. **Tous les écrans protégés**
   - Vérifient `isAuthenticated` via Redux
   - Dépendance : `authSlice`

2. **API Client** (`src/services/api/apiClient.ts`)
   - Utilise les tokens stockés par ce module
   - Dépendance : Récupération des tokens pour les requêtes

3. **Navigation** (`src/navigation/AppNavigator.tsx`)
   - Utilise `isAuthenticated` pour déterminer les routes accessibles
   - Dépendance : État d'authentification

4. **Profile Sync Service** (`src/services/profileSyncService.ts`)
   - Utilise l'utilisateur authentifié
   - Dépendance : ID utilisateur, tokens

---

## 🛠️ Recommandations de Refactoring

### Priorité 1 : Sécurité (CRITIQUE)

#### 1. Migrer vers SecureStore pour les Tokens

**Action** :
- Installer `expo-secure-store` : `npm install expo-secure-store`
- Remplacer `AsyncStorage.setItem` par `SecureStore.setItemAsync`
- Remplacer `AsyncStorage.getItem` par `SecureStore.getItemAsync`
- Remplacer `AsyncStorage.removeItem` par `SecureStore.deleteItemAsync`

**Fichiers à modifier** :
- `src/services/api/apiClient.ts` (lignes 106-141)

**Code proposé** :
```typescript
import * as SecureStore from 'expo-secure-store';

async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    logger.error('Erreur lors de la récupération du token:', error);
    return null;
  }
}

async function setTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (error) {
    logger.error('Erreur lors du stockage des tokens:', error);
  }
}
```

**Note** : `expo-secure-store` est déjà installé si `expo` est utilisé, mais vérifier la disponibilité.

---

#### 2. Ajouter un Filtre de Logs pour Masquer les Tokens

**Action** :
- Créer un utilitaire qui masque les tokens dans les logs
- Appliquer ce filtre dans le logger

**Fichiers à créer/modifier** :
- `src/utils/logger.ts` - Ajouter un filtre pour masquer les tokens

**Code proposé** :
```typescript
function sanitizeLogMessage(message: string): string {
  // Masquer les tokens JWT (format: Bearer <token> ou juste le token)
  return message.replace(/Bearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, 'Bearer ***');
}
```

---

#### 3. Vérifier la Validation Backend

**Action** :
- Vérifier que le backend valide les mots de passe avec les mêmes critères
- Ajouter des tests pour confirmer que la validation backend fonctionne

**Fichiers à vérifier** :
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/dto/create-user.dto.ts`

---

### Priorité 2 : Performance et UX

#### 4. Supprimer le Stockage AsyncStorage de l'Utilisateur

**Action** :
- Supprimer `saveUserToStorage` et `loadUserFromStorage` pour l'utilisateur
- Utiliser Redux Persist pour persister uniquement l'état Redux
- Garder uniquement les tokens dans SecureStore

**Fichiers à modifier** :
- `src/store/slices/authSlice.ts` (lignes 19-49, 77-78)

---

#### 5. Réduire le Cooldown du Refresh Token

**Action** :
- Réduire `REFRESH_COOLDOWN` de 2000ms à 500ms
- Le verrouillage par `activeRefreshPromises` devrait suffire

**Fichiers à modifier** :
- `src/services/api/apiClient.ts` (ligne 28)

---

#### 6. Améliorer les Messages d'Erreur OAuth

**Action** :
- Ajouter des messages d'erreur spécifiques pour chaque type d'erreur OAuth
- Gérer le cas où l'utilisateur annule la connexion

**Fichiers à modifier** :
- `src/store/slices/authSlice.ts` (lignes 354-357, 401-402)
- `src/services/auth/oauthService.ts`

---

### Priorité 3 : Code Quality

#### 7. Utiliser Uniquement validateEmail

**Action** :
- Supprimer la validation email dupliquée dans `AuthScreen.tsx`
- Utiliser uniquement `validateEmail` de `validation.ts`

**Fichiers à modifier** :
- `src/screens/AuthScreen.tsx` (lignes 95-99)

---

#### 8. Ajouter Rate Limiting Côté Client

**Action** :
- Implémenter un système de rate limiting pour les tentatives de connexion
- Bloquer temporairement après 5 échecs consécutifs

**Fichiers à créer/modifier** :
- `src/services/auth/rateLimiter.ts` (nouveau)
- `src/store/slices/authSlice.ts` - Intégrer le rate limiter

---

## 📊 Métriques et Tests Recommandés

### Tests de Sécurité

1. **Test de Stockage des Tokens**
   - Vérifier que les tokens ne sont pas stockés en clair
   - Vérifier que SecureStore est utilisé correctement

2. **Test de Rotation des Refresh Tokens**
   - Vérifier que le backend émet de nouveaux refresh tokens
   - Vérifier que les anciens refresh tokens sont invalidés

3. **Test de Validation Backend**
   - Vérifier que le backend rejette les mots de passe faibles
   - Vérifier que le backend valide les emails correctement

### Tests Fonctionnels

1. **Test de Connexion/Déconnexion**
   - Tester le flux complet de connexion
   - Tester la déconnexion et le nettoyage des tokens

2. **Test de Refresh Token**
   - Tester le refresh automatique lors d'un 401
   - Tester le refresh avec plusieurs requêtes simultanées

3. **Test OAuth**
   - Tester la connexion Google
   - Tester la connexion Apple
   - Tester l'annulation utilisateur

---

## 🎯 Résumé des Problèmes par Priorité

### 🔴 CRITIQUE (À corriger immédiatement) - ✅ TOUS CORRIGÉS
1. ✅ Stockage des tokens en clair dans AsyncStorage → **CORRIGÉ** (Migration vers SecureStore)
2. ✅ Logs potentiels des tokens → **CORRIGÉ** (Masquage automatique dans logger)
3. ✅ Validation du mot de passe incohérente → **CORRIGÉ** (Backend aligné avec frontend)
4. ✅ Pas de rotation des refresh tokens → **CORRIGÉ** (Rotation implémentée backend + frontend)

### 🟡 MOYEN (À corriger dans les prochaines versions) - ✅ TOUS CORRIGÉS
5. ✅ Double stockage utilisateur (AsyncStorage + Redux) → **CORRIGÉ** (Supprimé stockage AsyncStorage)
6. ✅ Cooldown sur refresh token (2 secondes) → **CORRIGÉ** (Réduit à 500ms)
7. ✅ Gestion des erreurs OAuth → **CORRIGÉ** (Messages d'erreur spécifiques par type d'erreur)

### 🟢 MINEUR (Améliorations) - ✅ TOUS CORRIGÉS
8. ✅ Validation email dupliquée → **CORRIGÉ** (Utilisation uniquement de validateEmail)
9. ✅ Pas de rate limiting côté client → **CORRIGÉ** (Rate limiting implémenté pour toutes les actions d'authentification)

---

## 📝 Notes Techniques

### Architecture Actuelle

```
┌─────────────────────┐
│   AuthScreen.tsx    │
│   (UI Layer)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   authSlice.ts      │
│   (Redux Layer)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   apiClient.ts      │
│   (API Layer)       │
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│   Backend API       │
│   /auth/*           │
└─────────────────────┘
```

### Flux d'Authentification

1. **Inscription** :
   - Validation côté client → API `/auth/register` → Stockage tokens → Redux

2. **Connexion** :
   - Validation côté client → API `/auth/login` → Stockage tokens → Redux

3. **OAuth (Google/Apple)** :
   - OAuth Flow → API `/auth/oauth/*` → Stockage tokens → Redux

4. **Refresh Token** :
   - 401 détecté → Refresh automatique → Nouveau token → Retry requête

5. **Déconnexion** :
   - API `/auth/logout` → Nettoyage tokens → Redux cleared

---

## ✅ Checklist d'Implémentation

### Phase 1 : Sécurité (Priorité HAUTE)
- [ ] Migrer vers SecureStore pour les tokens
- [ ] Ajouter un filtre de logs pour masquer les tokens
- [ ] Vérifier la validation backend des mots de passe
- [ ] Implémenter la rotation des refresh tokens

### Phase 2 : Performance et UX (Priorité MOYENNE)
- [ ] Supprimer le stockage AsyncStorage de l'utilisateur
- [ ] Réduire le cooldown du refresh token (2s → 500ms)
- [ ] Améliorer les messages d'erreur OAuth

### Phase 3 : Code Quality (Priorité BASSE)
- [ ] Utiliser uniquement validateEmail (supprimer duplication)
- [ ] Ajouter rate limiting côté client

---

**Statut** : ✅ **CORRECTIONS DE SÉCURITÉ APPLIQUÉES** - Toutes les vulnérabilités critiques ont été corrigées. Le module est maintenant sécurisé et prêt pour la production (après tests).

---

## ✅ Corrections Appliquées

**Voir le document détaillé** : `docs/analysis/authentication-security-fixes.md`

### Résumé des Corrections
- ✅ **Stockage SecureStore** : Tokens maintenant stockés de manière chiffrée
- ✅ **Validation Backend** : Mots de passe validés avec les mêmes critères que le frontend
- ✅ **Masquage des Tokens** : Tokens automatiquement masqués dans tous les logs
- ✅ **Rotation des Tokens** : Refresh tokens maintenant rotés à chaque refresh
- ✅ **Nettoyage AsyncStorage** : Suppression du stockage utilisateur redondant
- ✅ **Optimisations** : Cooldown réduit, validation email unifiée
