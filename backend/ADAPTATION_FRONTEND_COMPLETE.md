# ✅ Adaptation Backend au Frontend - TERMINÉ

## 🎯 Objectif
Adapter le backend pour correspondre **exactement** au fonctionnement du frontend existant (sans mot de passe, email OU téléphone).

---

## ✅ MODIFICATIONS EFFECTUÉES

### 1. **RegisterDto** - Inscription adaptée
**Fichier** : `backend/src/auth/dto/register.dto.ts`

**Changements** :
- ✅ `email` : **Optionnel** (si téléphone fourni)
- ✅ `password` : **Optionnel** (compatibilité frontend)
- ✅ `telephone` : **Optionnel** (si email fourni)
- ✅ Validation : Au moins email OU téléphone requis

**Avant** :
```typescript
email: string;        // Obligatoire
password: string;     // Obligatoire
telephone?: string;   // Optionnel
```

**Après** :
```typescript
email?: string;       // Optionnel (si téléphone fourni)
password?: string;    // Optionnel
telephone?: string;   // Optionnel (si email fourni)
```

---

### 2. **LoginSimpleDto** - Connexion sans mot de passe
**Fichier** : `backend/src/auth/dto/login-simple.dto.ts` (NOUVEAU)

**Fonctionnalité** :
- ✅ Accepte `identifier` (email OU téléphone)
- ✅ Pas de mot de passe requis
- ✅ Compatible avec le frontend existant

```typescript
export class LoginSimpleDto {
  identifier: string; // email ou téléphone
}
```

---

### 3. **UsersService** - Adaptation complète
**Fichier** : `backend/src/users/users.service.ts`

**Changements** :

#### a) Génération d'ID comme le frontend
```typescript
// AVANT
private generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// APRÈS
private generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

#### b) Normalisation email/téléphone
- ✅ Email : trim + lowercase
- ✅ Téléphone : trim + supprime espaces

#### c) Méthode `create()` améliorée
- ✅ Vérifie qu'au moins email OU téléphone est fourni
- ✅ Vérifie l'unicité de l'email (si fourni)
- ✅ Vérifie l'unicité du téléphone (si fourni)
- ✅ Génère le provider automatiquement (telephone ou email)
- ✅ Gère tous les champs : `roles`, `active_role`, `is_onboarded`, etc.

#### d) Méthode `mapRowToUser()` - Mapping complet
- ✅ Parse `saved_farms` depuis JSON
- ✅ Parse `roles` depuis JSON
- ✅ Retourne la structure User **exactement** comme le frontend

#### e) Méthode `updateLastConnection()` ajoutée
```typescript
async updateLastConnection(id: string): Promise<void> {
  await this.databaseService.query(
    'UPDATE users SET derniere_connexion = $1 WHERE id = $2',
    [new Date().toISOString(), id],
  );
}
```

#### f) Méthodes de recherche améliorées
- ✅ `findByEmail()` : Normalise l'email
- ✅ `findByTelephone()` : Normalise le téléphone
- ✅ `findByIdentifier()` : Détecte automatiquement email ou téléphone
- ✅ Toutes retournent `null` si non trouvé (comme le frontend)

---

### 4. **AuthService** - Authentification adaptée
**Fichier** : `backend/src/auth/auth.service.ts`

**Changements** :

#### a) Méthode `register()` adaptée
- ✅ Accepte email OU téléphone
- ✅ Password optionnel (hashé si fourni)
- ✅ Retourne la structure User **complète** (comme le frontend)
- ✅ Génère les tokens JWT même sans mot de passe

#### b) Méthode `loginSimple()` créée (NOUVELLE)
```typescript
async loginSimple(identifier: string, ipAddress?: string, userAgent?: string) {
  // Trouve l'utilisateur par email ou téléphone
  const user = await this.usersService.findByIdentifier(identifier.trim());
  
  if (!user) {
    throw new UnauthorizedException('Aucun compte trouvé...');
  }
  
  // Met à jour la dernière connexion
  await this.usersService.updateLastConnection(user.id);
  
  // Génère les tokens JWT
  // Retourne la structure User complète
}
```

#### c) Méthode `login()` améliorée
- ✅ Retourne la structure User **complète** (pas seulement id, email, nom, prenom)

---

### 5. **AuthController** - Nouveaux endpoints
**Fichier** : `backend/src/auth/auth.controller.ts`

**Nouveau endpoint** :
```typescript
@Public()
@Post('login-simple')
async loginSimple(@Body() loginSimpleDto: LoginSimpleDto, @Request() req: any) {
  return this.authService.loginSimple(loginSimpleDto.identifier, ...);
}
```

**Endpoints disponibles** :
- ✅ `POST /auth/register` - Inscription (email OU téléphone, password optionnel)
- ✅ `POST /auth/login` - Connexion avec mot de passe
- ✅ `POST /auth/login-simple` - Connexion sans mot de passe (NOUVEAU)
- ✅ `POST /auth/refresh` - Rafraîchir le token
- ✅ `POST /auth/logout` - Déconnexion
- ✅ `GET /auth/me` - Profil utilisateur

---

### 6. **Migration Base de Données**
**Fichier** : `backend/database/migrations/000_create_users_table.sql` (NOUVEAU)

**Structure de la table `users`** :
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  telephone TEXT UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  password_hash TEXT,              -- Optionnel
  provider TEXT NOT NULL DEFAULT 'email',
  provider_id TEXT,
  photo TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_connexion TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  saved_farms TEXT,                -- JSON array
  roles TEXT,                      -- JSON object
  active_role TEXT,
  is_onboarded BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP,
  
  CONSTRAINT check_email_or_telephone CHECK (email IS NOT NULL OR telephone IS NOT NULL)
);
```

---

## 📊 COMPATIBILITÉ FRONTEND ↔ BACKEND

### ✅ Inscription (signUp)
**Frontend** :
```typescript
signUp({ email?: string, telephone?: string, nom: string, prenom: string })
```

**Backend** :
```typescript
POST /auth/register
{
  email?: string,
  telephone?: string,
  password?: string,  // Optionnel
  nom: string,
  prenom: string
}
```

✅ **COMPATIBLE** - Le frontend peut appeler `/auth/register` sans password

---

### ✅ Connexion (signIn)
**Frontend** :
```typescript
signIn({ identifier: string }) // email ou téléphone, pas de password
```

**Backend** :
```typescript
POST /auth/login-simple
{
  identifier: string  // email ou téléphone
}
```

✅ **COMPATIBLE** - Le frontend peut appeler `/auth/login-simple` avec identifier

---

### ✅ Structure User retournée
**Frontend attend** :
```typescript
{
  id: string,
  email?: string,
  telephone?: string,
  nom: string,
  prenom: string,
  provider: 'email' | 'google' | 'apple' | 'telephone',
  photo?: string,
  saved_farms?: string[],
  date_creation: string,
  derniere_connexion: string,
  roles?: UserRoles,
  activeRole?: RoleType,
  isOnboarded?: boolean,
  onboardingCompletedAt?: string
}
```

**Backend retourne** :
```typescript
{
  access_token: string,
  refresh_token: string,
  expires_in: number,
  user: {
    // Structure complète comme ci-dessus
  }
}
```

✅ **COMPATIBLE** - Structure identique

---

## 🔄 PROCHAINES ÉTAPES

### 1. Créer le service API client dans le frontend
**Fichier** : `fermier-pro/src/services/api/apiClient.ts`

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: __DEV__ ? 'http://localhost:3000' : 'https://api.fermier-pro.com',
  timeout: 10000,
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
    if (error.response?.status === 401) {
      // Refresh token logic
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2. Adapter authSlice.ts pour utiliser l'API
**Fichier** : `fermier-pro/src/store/slices/authSlice.ts`

**Modifier** :
- `signUp` : Appeler `POST /auth/register`
- `signIn` : Appeler `POST /auth/login-simple`
- Stocker `access_token` et `refresh_token` dans AsyncStorage
- Retourner l'utilisateur depuis `response.data.user`

---

## ✅ RÉSUMÉ

| Composant | Statut | Compatibilité |
|-----------|--------|---------------|
| **RegisterDto** | ✅ Adapté | Email OU téléphone, password optionnel |
| **LoginSimpleDto** | ✅ Créé | Connexion sans mot de passe |
| **UsersService** | ✅ Adapté | IDs comme frontend, mapping complet |
| **AuthService** | ✅ Adapté | register + login-simple |
| **AuthController** | ✅ Adapté | Endpoint login-simple ajouté |
| **Migration DB** | ✅ Créée | Table users complète |

**Le backend est maintenant 100% compatible avec le frontend existant !** 🎉

---

**Date** : 2025-01-08  
**Statut** : ✅ TERMINÉ

