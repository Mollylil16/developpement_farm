# 🔍 Analyse Authentification Frontend ↔ Backend

## 📊 ÉTAT ACTUEL DU FRONTEND

### 🔐 Système d'Authentification Frontend

**Fichier principal** : `src/store/slices/authSlice.ts`

#### Caractéristiques actuelles :

1. **❌ PAS DE MOT DE PASSE**
   - L'authentification se fait **uniquement avec email ou téléphone**
   - Aucune vérification de mot de passe
   - Connexion directe si l'utilisateur existe dans SQLite

2. **Stockage** :
   - Utilise `AsyncStorage` avec la clé `@fermier_pro:auth`
   - Stocke l'objet `User` complet (pas de tokens JWT)
   - Pas de gestion de tokens d'accès

3. **Base de données** :
   - Utilise **SQLite local** (expo-sqlite)
   - Repository : `UserRepository`
   - Vérifie l'existence de l'utilisateur par email/téléphone

4. **Flux d'authentification** :

```typescript
// INSCRIPTION (signUp)
- Email OU Téléphone (pas les deux obligatoires)
- Nom + Prénom
- Création dans SQLite local
- Sauvegarde dans AsyncStorage
- Pas de mot de passe

// CONNEXION (signIn)
- Email OU Téléphone
- Recherche dans SQLite
- Si trouvé → connexion directe
- Si non trouvé → erreur
- Pas de vérification de mot de passe

// DÉCONNEXION (signOut)
- Supprime AsyncStorage
- Réinitialise le projet actif
```

5. **Écrans** :
   - `AuthScreen.tsx` : Formulaire email/téléphone + nom/prénom
   - `OnboardingAuthScreen.tsx` : Même principe pour onboarding

6. **Types** :
```typescript
interface SignUpInput {
  email?: string;
  telephone?: string;
  nom: string;
  prenom: string;
  // ❌ PAS de password
}

interface SignInInput {
  identifier: string; // email ou téléphone
  // ❌ PAS de password
}
```

---

## 🔐 ÉTAT ACTUEL DU BACKEND

### Système d'Authentification Backend

**Fichier principal** : `backend/src/auth/auth.service.ts`

#### Caractéristiques actuelles :

1. **✅ AVEC MOT DE PASSE**
   - Authentification **email + password**
   - Validation stricte avec bcrypt
   - JWT avec refresh tokens

2. **Stockage** :
   - Tokens JWT stockés côté client (à implémenter)
   - Refresh tokens stockés en DB (table `refresh_tokens`)
   - Blacklist pour révoquer les tokens

3. **Base de données** :
   - **PostgreSQL**
   - Table `users` avec `password_hash`
   - Table `refresh_tokens` pour gérer les sessions

4. **Flux d'authentification** :

```typescript
// INSCRIPTION (POST /auth/register)
- Email (obligatoire)
- Password (obligatoire, min 6 caractères)
- Nom + Prénom
- Hash du mot de passe avec bcrypt
- Création dans PostgreSQL
- Retourne l'utilisateur (sans password_hash)

// CONNEXION (POST /auth/login)
- Email + Password
- Vérification avec bcrypt
- Génération JWT access_token (1h)
- Génération refresh_token (7 jours)
- Retourne { access_token, refresh_token, user }

// RAFRAÎCHISSEMENT (POST /auth/refresh)
- Refresh token
- Génère nouveau access_token
- Retourne nouveaux tokens

// DÉCONNEXION (POST /auth/logout)
- Révoque le refresh_token
- Blacklist en DB
```

5. **DTOs** :
```typescript
class RegisterDto {
  email: string;        // ✅ Obligatoire
  password: string;     // ✅ Obligatoire (min 6)
  nom: string;
  prenom: string;
  telephone?: string;   // Optionnel
}

class LoginDto {
  email: string;        // ✅ Obligatoire
  password: string;     // ✅ Obligatoire (min 6)
}
```

---

## ⚠️ INCOMPATIBILITÉS MAJEURES

### 1. **MOT DE PASSE**
- ❌ **Frontend** : Pas de mot de passe
- ✅ **Backend** : Mot de passe obligatoire

### 2. **IDENTIFIANT DE CONNEXION**
- ✅ **Frontend** : Email OU Téléphone
- ❌ **Backend** : Email uniquement (pas de téléphone)

### 3. **STOCKAGE**
- ❌ **Frontend** : AsyncStorage (objet User)
- ✅ **Backend** : Tokens JWT (access_token + refresh_token)

### 4. **BASE DE DONNÉES**
- ❌ **Frontend** : SQLite local
- ✅ **Backend** : PostgreSQL distant

### 5. **SÉCURITÉ**
- ❌ **Frontend** : Aucune (connexion directe si utilisateur existe)
- ✅ **Backend** : JWT + bcrypt + refresh tokens

---

## 🎯 OPTIONS DE RÉSOLUTION

### Option A : Adapter le Backend pour le Frontend (RECOMMANDÉ)

**Avantages** :
- ✅ Pas de changement dans le frontend existant
- ✅ Migration progressive possible
- ✅ Supporte les deux modes (avec/sans mot de passe)

**Modifications Backend** :

1. **Ajouter un endpoint de connexion sans mot de passe** :
```typescript
// POST /auth/login-simple
{
  identifier: string; // email ou téléphone
}
// Retourne un token temporaire (expire rapidement)
```

2. **Modifier l'inscription pour rendre le password optionnel** :
```typescript
// POST /auth/register
{
  email?: string;
  telephone?: string;
  password?: string; // Optionnel
  nom: string;
  prenom: string;
}
```

3. **Créer un système de tokens temporaires** :
   - Token court (15 minutes) pour connexion sans mot de passe
   - Nécessite de définir un mot de passe après première connexion

**Inconvénients** :
- ⚠️ Moins sécurisé (connexion sans mot de passe)
- ⚠️ Nécessite une migration des utilisateurs existants

---

### Option B : Adapter le Frontend pour le Backend (MEILLEURE SÉCURITÉ)

**Avantages** :
- ✅ Sécurité maximale (JWT + bcrypt)
- ✅ Standard de l'industrie
- ✅ Scalable et professionnel

**Modifications Frontend** :

1. **Ajouter un champ password dans les écrans** :
   - `AuthScreen.tsx` : Ajouter un champ password
   - `OnboardingAuthScreen.tsx` : Ajouter un champ password

2. **Modifier authSlice.ts** :
```typescript
interface SignUpInput {
  email?: string;
  telephone?: string;
  password: string; // ✅ Ajouter
  nom: string;
  prenom: string;
}

interface SignInInput {
  identifier: string; // email ou téléphone
  password: string; // ✅ Ajouter
}
```

3. **Créer un service API client** :
   - Gérer les tokens JWT
   - Stocker access_token et refresh_token dans AsyncStorage
   - Intercepteur pour refresh automatique

4. **Adapter les thunks** :
```typescript
// signUp
const response = await apiClient.post('/auth/register', {
  email: input.email,
  password: input.password,
  nom: input.nom,
  prenom: input.prenom,
});
// Stocker tokens
await AsyncStorage.setItem('access_token', response.data.access_token);
await AsyncStorage.setItem('refresh_token', response.data.refresh_token);

// signIn
const response = await apiClient.post('/auth/login', {
  email: input.identifier.includes('@') ? input.identifier : undefined,
  telephone: !input.identifier.includes('@') ? input.identifier : undefined,
  password: input.password,
});
```

**Inconvénients** :
- ⚠️ Changements importants dans le frontend
- ⚠️ Nécessite de migrer les utilisateurs existants (définir des mots de passe)
- ⚠️ Casse la compatibilité avec l'existant

---

### Option C : Mode Hybride (TRANSITION PROGRESSIVE)

**Avantages** :
- ✅ Migration progressive
- ✅ Compatibilité avec l'existant
- ✅ Amélioration de la sécurité au fil du temps

**Stratégie** :

1. **Phase 1** : Backend supporte les deux modes
   - Endpoint `/auth/login-simple` (sans mot de passe)
   - Endpoint `/auth/login` (avec mot de passe)

2. **Phase 2** : Frontend ajoute le support du mot de passe
   - Option "Se connecter avec mot de passe" dans l'UI
   - Migration progressive des utilisateurs

3. **Phase 3** : Déprécier le mode sans mot de passe
   - Forcer la définition d'un mot de passe après X connexions
   - Notification pour définir un mot de passe

---

## 📋 RECOMMANDATION

### 🎯 **Option C : Mode Hybride** (RECOMMANDÉ)

**Pourquoi** :
1. ✅ Permet une migration progressive
2. ✅ Ne casse pas l'existant
3. ✅ Améliore la sécurité progressivement
4. ✅ Compatible avec les utilisateurs existants

**Plan d'implémentation** :

#### Étape 1 : Adapter le Backend (Maintenant)
- [ ] Ajouter endpoint `/auth/login-simple` (sans mot de passe)
- [ ] Rendre password optionnel dans `/auth/register`
- [ ] Créer tokens temporaires (15 min) pour connexion simple
- [ ] Endpoint pour définir un mot de passe après connexion

#### Étape 2 : Créer le Service API Client (Frontend)
- [ ] Créer `src/services/api/apiClient.ts`
- [ ] Gérer les tokens JWT
- [ ] Intercepteur pour refresh automatique

#### Étape 3 : Adapter authSlice.ts (Frontend)
- [ ] Modifier `signUp` pour appeler `/auth/register`
- [ ] Modifier `signIn` pour appeler `/auth/login-simple` (sans mot de passe)
- [ ] Stocker les tokens dans AsyncStorage
- [ ] Gérer le refresh automatique

#### Étape 4 : Migration Progressive (Plus tard)
- [ ] Ajouter option "Définir un mot de passe" dans le profil
- [ ] Forcer la définition après X connexions
- [ ] Migrer vers `/auth/login` (avec mot de passe)

---

## 🔧 MODIFICATIONS NÉCESSAIRES

### Backend (À FAIRE)

1. **Nouveau endpoint** : `POST /auth/login-simple`
```typescript
// auth.controller.ts
@Public()
@Post('login-simple')
async loginSimple(@Body() dto: LoginSimpleDto) {
  return this.authService.loginSimple(dto);
}

// auth.service.ts
async loginSimple(dto: LoginSimpleDto) {
  // Trouver par email ou téléphone
  const user = await this.usersService.findByIdentifier(dto.identifier);
  if (!user) {
    throw new UnauthorizedException('Utilisateur introuvable');
  }
  
  // Générer token temporaire (15 min)
  const payload = { sub: user.id, email: user.email, temp: true };
  const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
  
  return {
    access_token: accessToken,
    expires_in: 900, // 15 minutes
    user: { ...user },
    requires_password: !user.password_hash, // Indique si un mot de passe doit être défini
  };
}
```

2. **Modifier RegisterDto** : Rendre password optionnel
```typescript
class RegisterDto {
  email?: string;
  telephone?: string;
  password?: string; // Optionnel
  nom: string;
  prenom: string;
}
```

3. **Nouveau endpoint** : `POST /auth/set-password`
```typescript
@Post('set-password')
async setPassword(@CurrentUser() user, @Body() dto: SetPasswordDto) {
  return this.authService.setPassword(user.id, dto.password);
}
```

### Frontend (À FAIRE)

1. **Créer service API** : `src/services/api/apiClient.ts`
2. **Modifier authSlice.ts** : Utiliser l'API au lieu de SQLite
3. **Adapter les écrans** : Gérer les tokens et erreurs API

---

## 📊 COMPARAISON DES OPTIONS

| Critère | Option A (Backend) | Option B (Frontend) | Option C (Hybride) |
|---------|-------------------|---------------------|-------------------|
| **Sécurité** | ⚠️ Moyenne | ✅ Élevée | ✅ Progressive |
| **Compatibilité** | ✅ Totale | ❌ Casse l'existant | ✅ Totale |
| **Complexité** | ⚠️ Moyenne | ⚠️ Élevée | ✅ Faible |
| **Migration** | ✅ Facile | ❌ Difficile | ✅ Progressive |
| **Recommandé** | ❌ | ❌ | ✅ **OUI** |

---

**Date d'analyse** : 2025-01-08  
**Prochaine étape** : Implémenter l'Option C (Mode Hybride)

