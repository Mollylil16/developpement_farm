# 📋 TODO - Authentification

## ✅ CE QUI A ÉTÉ FAIT (Backend)

1. ✅ **RegisterDto** - Email optionnel, password optionnel, accepter email OU téléphone
2. ✅ **LoginSimpleDto** - DTO pour connexion sans mot de passe
3. ✅ **UsersService** - Génère IDs comme frontend, mapping complet, updateLastConnection
4. ✅ **AuthService** - register() et loginSimple() adaptés, retourne User complet
5. ✅ **AuthController** - Endpoint `/auth/login-simple` ajouté
6. ✅ **Migration DB** - Fichier `000_create_users_table.sql` créé

---

## ❌ CE QUI RESTE À FAIRE

### 🔴 1. Exécuter les Migrations PostgreSQL (PRIORITÉ #1)

**Fichier** : `backend/database/migrations/000_create_users_table.sql`

**Action** :
```bash
cd backend
psql -U farmtrack_user -d farmtrack_db -f database/migrations/000_create_users_table.sql
```

**Vérifier** :
```sql
-- Vérifier que la table existe avec tous les champs
\d users
```

---

### 🔴 2. Créer le Service API Client dans le Frontend (PRIORITÉ #2)

**Fichier à créer** : `fermier-pro/src/services/api/apiClient.ts`

**Fonctionnalités nécessaires** :
- ✅ Configuration base URL (dev/prod)
- ✅ Intercepteur pour ajouter le token JWT
- ✅ Intercepteur pour refresh automatique du token
- ✅ Gestion des erreurs (401, 403, 500, etc.)
- ✅ Timeout configurable

**Code à créer** :
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000'  // Dev
  : 'https://api.fermier-pro.com';  // Prod

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour refresh automatique
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const { access_token, refresh_token } = response.data;
        await AsyncStorage.setItem('access_token', access_token);
        if (refresh_token) {
          await AsyncStorage.setItem('refresh_token', refresh_token);
        }
        
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh échoué, déconnecter l'utilisateur
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        // Rediriger vers login
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### 🔴 3. Adapter authSlice.ts pour utiliser l'API (PRIORITÉ #3)

**Fichier** : `fermier-pro/src/store/slices/authSlice.ts`

**Modifications nécessaires** :

#### a) Importer apiClient
```typescript
import apiClient from '../../services/api/apiClient';
```

#### b) Modifier `signUp` thunk
**AVANT** (SQLite) :
```typescript
const { getDatabase } = await import('../../services/database');
const { UserRepository } = await import('../../database/repositories');
const db = await getDatabase();
const userRepo = new UserRepository(db);
const user = await userRepo.create({...});
```

**APRÈS** (API) :
```typescript
const response = await apiClient.post('/auth/register', {
  email: input.email?.trim(),
  telephone: input.telephone?.replace(/\s+/g, ''),
  nom: input.nom.trim(),
  prenom: input.prenom.trim(),
});

const { access_token, refresh_token, user } = response.data;

// Stocker les tokens
await AsyncStorage.setItem('access_token', access_token);
await AsyncStorage.setItem('refresh_token', refresh_token);

return user;
```

#### c) Modifier `signIn` thunk
**AVANT** (SQLite) :
```typescript
const user = await userRepo.findByIdentifier(input.identifier.trim());
```

**APRÈS** (API) :
```typescript
const response = await apiClient.post('/auth/login-simple', {
  identifier: input.identifier.trim(),
});

const { access_token, refresh_token, user } = response.data;

// Stocker les tokens
await AsyncStorage.setItem('access_token', access_token);
await AsyncStorage.setItem('refresh_token', refresh_token);

return user;
```

#### d) Modifier `signOut` thunk
**APRÈS** :
```typescript
export const signOut = createAsyncThunk('auth/signOut', async (_, { dispatch }) => {
  try {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    }
  } catch (error) {
    console.warn('Erreur lors de la déconnexion:', error);
  }
  
  // Nettoyer le stockage
  await AsyncStorage.multiRemove(['access_token', 'refresh_token', AUTH_STORAGE_KEY]);
  dispatch(setProjetActif(null));
  return null;
});
```

#### e) Modifier `loadUserFromStorageThunk`
**APRÈS** :
```typescript
export const loadUserFromStorageThunk = createAsyncThunk('auth/loadUserFromStorage', async () => {
  // Vérifier si on a un token
  const token = await AsyncStorage.getItem('access_token');
  if (!token) {
    return null;
  }
  
  try {
    // Récupérer le profil depuis l'API
    const response = await apiClient.get('/auth/me');
    const user = response.data;
    
    // Sauvegarder dans AsyncStorage pour compatibilité
    await saveUserToStorage(user);
    
    return user;
  } catch (error) {
    // Token invalide, nettoyer
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', AUTH_STORAGE_KEY]);
    return null;
  }
});
```

---

### 🟡 4. Adapter Google/Apple Auth (PRIORITÉ #4)

**Fichier** : `fermier-pro/src/store/slices/authSlice.ts`

**Modifications nécessaires** :

#### a) `signInWithGoogle`
**APRÈS** :
```typescript
export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Implémenter avec expo-auth-session
      // Pour l'instant, utiliser l'API backend
      const googleEmail = 'user@gmail.com'; // À remplacer par le vrai email Google
      
      // Vérifier si l'utilisateur existe
      const response = await apiClient.post('/auth/login-simple', {
        identifier: googleEmail,
      });
      
      const { access_token, refresh_token, user } = response.data;
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('refresh_token', refresh_token);
      await saveUserToStorage(user);
      
      return user;
    } catch (error: unknown) {
      // Si utilisateur n'existe pas, le créer
      // ...
    }
  }
);
```

---

### 🟡 5. Tester les Endpoints (PRIORITÉ #5)

**Script de test** : `backend/scripts/test-auth-endpoints.ts` (existe déjà)

**Actions** :
1. Démarrer le backend : `npm run start:dev`
2. Exécuter les tests : `npm run test:auth`
3. Vérifier que tous les tests passent

**Tests à vérifier** :
- ✅ POST /auth/register (sans password)
- ✅ POST /auth/register (avec password)
- ✅ POST /auth/login-simple (email)
- ✅ POST /auth/login-simple (téléphone)
- ✅ POST /auth/login (avec password)
- ✅ POST /auth/refresh
- ✅ POST /auth/logout
- ✅ GET /auth/me

---

### 🟡 6. Gérer les Erreurs et Messages (PRIORITÉ #6)

**Fichier** : `fermier-pro/src/services/api/apiClient.ts`

**Améliorations** :
- ✅ Messages d'erreur en français
- ✅ Gestion des erreurs réseau (timeout, pas de connexion)
- ✅ Retry automatique pour les erreurs temporaires
- ✅ Logging des erreurs pour debug

---

## 📊 RÉSUMÉ DES PRIORITÉS

| Priorité | Tâche | Statut | Fichier |
|----------|-------|--------|---------|
| 🔴 **#1** | Exécuter migrations DB | ❌ À faire | `000_create_users_table.sql` |
| 🔴 **#2** | Créer service API client | ❌ À faire | `src/services/api/apiClient.ts` |
| 🔴 **#3** | Adapter authSlice.ts | ❌ À faire | `src/store/slices/authSlice.ts` |
| 🟡 **#4** | Adapter Google/Apple auth | ❌ À faire | `src/store/slices/authSlice.ts` |
| 🟡 **#5** | Tester les endpoints | ❌ À faire | `backend/scripts/test-auth-endpoints.ts` |
| 🟡 **#6** | Gérer les erreurs | ❌ À faire | `src/services/api/apiClient.ts` |

---

## 🎯 PROCHAINES ÉTAPES IMMÉDIATES

1. **Exécuter la migration** : `psql -U farmtrack_user -d farmtrack_db -f database/migrations/000_create_users_table.sql`
2. **Créer le service API client** : `src/services/api/apiClient.ts`
3. **Adapter authSlice.ts** : Remplacer SQLite par API calls

---

**Date** : 2025-01-08  
**Statut** : Backend ✅ | Frontend ❌

