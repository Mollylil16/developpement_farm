# 📋 Logique de Création de Compte

## 🎯 Vue d'ensemble

La création de compte dans l'application Fermier Pro suit un flux en plusieurs étapes, avec support pour plusieurs méthodes d'authentification (Email/Téléphone, Google OAuth, Apple OAuth).

---

## 🔄 Flux de Création de Compte

### 1. **Point d'entrée : `OnboardingAuthScreen`**
**Fichier :** `src/screens/OnboardingAuthScreen.tsx`

L'utilisateur arrive sur l'écran d'authentification avec 3 options :

#### Option A : Connexion Google OAuth
```typescript
handleGoogleAuth() → dispatch(signInWithGoogle())
```
- Si nouvel utilisateur (pas de rôles) → Navigation vers `PROFILE_SELECTION`
- Si utilisateur existant → Connexion directe

#### Option B : Connexion Apple OAuth (iOS uniquement)
```typescript
handleAppleAuth() → dispatch(signInWithApple())
```
- Même logique que Google OAuth

#### Option C : Email/Téléphone
```typescript
handleContinue() → dispatch(signIn({ identifier }))
```

**Logique :**
1. Validation du format (email ou téléphone)
2. Tentative de connexion au backend PostgreSQL
3. Si utilisateur non trouvé (erreur 401/404) → Navigation vers `PROFILE_SELECTION` avec l'identifiant
4. Si utilisateur existe → Connexion directe

---

### 2. **Sélection du Profil : `ProfileSelectionScreen`**
**Fichier :** `src/screens/ProfileSelectionScreen.tsx` (probablement)

L'utilisateur choisit son type de profil :
- `producer` (Producteur)
- `buyer` (Acheteur)
- `veterinarian` (Vétérinaire)
- `technician` (Technicien)

---

### 3. **Création de l'Utilisateur : `OnboardingService.createUser()`**
**Fichier :** `src/services/OnboardingService.ts` (lignes 91-264)

#### Étape 3.1 : Vérification de l'existence
```typescript
// Vérifier si l'email existe déjà
if (input.email) {
  const existingUser = await apiClient.get(`/users/email/${email}`);
  if (existingUser) return existingUser; // Retourner l'utilisateur existant
}

// Vérifier si le téléphone existe déjà
if (input.phone) {
  const existingUser = await apiClient.get(`/users/telephone/${phone}`);
  if (existingUser) return existingUser;
}
```

#### Étape 3.2 : Préparation des données
```typescript
const registerPayload = {
  email: input.email,
  telephone: input.phone,
  nom: input.lastName || 'Mobile',      // Min 2 caractères
  prenom: input.firstName || 'Utilisateur', // Min 2 caractères
  password: input.password,              // Optionnel, min 6 caractères
};
```

#### Étape 3.3 : Appel API Backend
```typescript
const created = await apiClient.post('/auth/register', registerPayload, {
  skipAuth: true // Route publique
});
```

**Réponse :**
```typescript
{
  access_token: string,
  refresh_token: string,
  expires_in: 3600,
  user: User
}
```

#### Étape 3.4 : Stockage des tokens
```typescript
await apiClient.tokens.set(created.access_token, created.refresh_token);
```

#### Étape 3.5 : Création du profil Producer (si applicable)
```typescript
if (input.profileType === 'producer') {
  await apiClient.patch(`/users/${created.user.id}`, {
    roles: { producer: {...} },
    activeRole: 'producer',
  });
}
```

---

### 4. **Backend : `AuthService.register()`**
**Fichier :** `backend/src/auth/auth.service.ts` (lignes 112-173)

#### Étape 4.1 : Validation des données
```typescript
// Vérifier qu'au moins email ou téléphone est fourni
if (!registerDto.email && !registerDto.telephone) {
  throw new ConflictException('Email ou numéro de téléphone requis');
}
```

#### Étape 4.2 : Vérification des doublons
```typescript
// Vérifier si l'email existe déjà
if (registerDto.email) {
  const existingUser = await this.usersService.findByEmail(registerDto.email);
  if (existingUser) {
    throw new ConflictException('Un compte existe déjà avec cet email');
  }
}

// Vérifier si le téléphone existe déjà
if (registerDto.telephone) {
  const existingPhone = await this.usersService.findByTelephone(registerDto.telephone);
  if (existingPhone) {
    throw new ConflictException('Un compte existe déjà avec ce numéro de téléphone');
  }
}
```

#### Étape 4.3 : Hashage du mot de passe
```typescript
let passwordHash = null;
if (registerDto.password) {
  passwordHash = await bcrypt.hash(registerDto.password, 12);
}
```

#### Étape 4.4 : Création de l'utilisateur
```typescript
const user = await this.usersService.create({
  email: registerDto.email,
  telephone: registerDto.telephone,
  nom: registerDto.nom,
  prenom: registerDto.prenom,
  password_hash: passwordHash,
  provider: registerDto.telephone ? 'telephone' : 'email',
});
```

---

### 5. **Backend : `UsersService.create()`**
**Fichier :** `backend/src/users/users.service.ts` (lignes 29-89)

#### Étape 5.1 : Normalisation des données
```typescript
// Normaliser l'email (trim + lowercase)
const normalizedEmail = createUserDto.email
  ? createUserDto.email.trim().toLowerCase()
  : null;

// Normaliser le téléphone (supprimer espaces)
const normalizedTelephone = this.normalizeTelephone(createUserDto.telephone);
```

#### Étape 5.2 : Génération de l'ID
```typescript
const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

#### Étape 5.3 : Insertion en base de données
```sql
INSERT INTO users (
  id, email, telephone, nom, prenom, password_hash, 
  provider, provider_id, photo, date_creation, derniere_connexion, is_active,
  roles, active_role, is_onboarded, onboarding_completed_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
RETURNING *
```

**Valeurs par défaut :**
- `is_active`: `true`
- `is_onboarded`: `false`
- `roles`: `null` (sera créé plus tard)
- `date_creation`: `now()`
- `derniere_connexion`: `now()`

#### Étape 5.4 : Génération des tokens JWT
```typescript
const payload = {
  sub: user.id,
  email: user.email || '',
  roles: user.roles || [],
  iat: Math.floor(Date.now() / 1000),
  jti: uuidv4(),
};

const accessToken = this.jwtService.sign(payload);
const refreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);
```

---

## 📝 DTO de Validation (Backend)

**Fichier :** `backend/src/auth/dto/register.dto.ts`

```typescript
export class RegisterDto {
  @IsEmail()
  @IsOptional()
  @ValidateIf((o) => !o.telephone)
  email?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  @IsOptional()
  password?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nom: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  prenom: string;

  @IsString()
  @Matches(/^[0-9]{8,15}$/)
  @IsOptional()
  @ValidateIf((o) => !o.email)
  telephone?: string;
}
```

**Règles de validation :**
- Au moins `email` OU `telephone` requis
- `nom` et `prenom` : min 2 caractères, max 100
- `password` : optionnel, mais si fourni, min 6 caractères
- `telephone` : 8-15 chiffres

---

## 🔐 Gestion des Tokens

### Access Token
- **Durée de vie :** 3600 secondes (1 heure)
- **Format :** JWT
- **Contenu :** `sub`, `email`, `roles`, `iat`, `jti`

### Refresh Token
- **Stockage :** Table `refresh_tokens` en PostgreSQL
- **Durée de vie :** Configurable (généralement 7-30 jours)
- **Usage :** Permet de renouveler l'access token sans se reconnecter

---

## 🎨 Création de Profils Spécialisés

### Profil Producer
**Fichier :** `src/services/OnboardingService.ts` (lignes 164-189)

Créé automatiquement lors de la création du compte si `profileType === 'producer'` :

```typescript
user.roles = {
  producer: {
    isActive: true,
    activatedAt: new Date().toISOString(),
    farmName: '',
    farmType: 'individual',
    capacity: { totalCapacity: 0, currentOccupancy: 0 },
    stats: { totalSales: 0, totalRevenue: 0, averageRating: 0, totalReviews: 0 },
    marketplaceSettings: {
      defaultPricePerKg: 450,
      autoAcceptOffers: false,
      minimumOfferPercentage: 80,
      notificationsEnabled: true,
    },
  },
};
```

### Profil Buyer
**Fichier :** `src/services/OnboardingService.ts` (lignes 269-323)

Créé via `createBuyerProfile()` :

```typescript
const buyerProfile: BuyerProfile = {
  isActive: hasExistingProject, // Basé sur l'existence d'un projet
  activatedAt: new Date().toISOString(),
  buyerType: input.buyerType, // 'individual' | 'restaurant' | 'butcher' | etc.
  businessInfo: input.businessInfo,
  purchaseHistory: { totalPurchases: 0, totalSpent: 0, ... },
  preferences: { preferredWeightRange: { min: 20, max: 150 }, ... },
  rating: { asReviewer: 0, totalReviewsGiven: 0 },
};
```

### Profil Veterinarian
**Fichier :** `src/services/OnboardingService.ts` (lignes 328-391)

Créé via `createVeterinarianProfile()` avec validation :

```typescript
const veterinarianProfile: VeterinarianProfile = {
  isActive: true,
  validationStatus: 'pending', // Nécessite validation admin
  qualifications: { degree, university, licenseNumber, ... },
  specializations: string[],
  experience: { yearsOfPractice, previousPositions },
  workLocation: { address, city, region, latitude, longitude, serviceRadius },
  documents: { identityCard, professionalProof },
};
```

### Profil Technician
**Fichier :** `src/services/OnboardingService.ts` (lignes 396-429)

Créé via `createTechnicianProfile()` :

```typescript
const technicianProfile: TechnicianProfile = {
  isActive: true,
  qualifications: { level: 'beginner' | 'intermediate' | 'advanced' | 'expert' },
  skills: string[],
  assistedFarms: [],
};
```

---

## 🚨 Gestion des Erreurs

### Erreurs Frontend (`OnboardingAuthScreen.tsx`)

**Types d'erreurs détectées :**
1. **USER_NOT_FOUND** (401/404) → Navigation vers création de compte
2. **NETWORK_ERROR** → Message "Vérifiez votre connexion Internet"
3. **SERVER_ERROR** (500-599) → Message "Service temporairement indisponible"
4. **VALIDATION_ERROR** (400) → Message "Données invalides"
5. **CONFLICT_ERROR** (409) → Message "Compte existant"
6. **DATABASE_ERROR** → Navigation vers création (mode dégradé)
7. **CANCELLED** → Pas de message (utilisateur a annulé)

### Erreurs Backend (`AuthService.register()`)

- **409 Conflict** : Email ou téléphone déjà utilisé
- **400 Bad Request** : Données invalides (validation DTO)
- **500 Internal Server Error** : Erreur serveur/database

---

## 📊 Schéma de Base de Données

**Table : `users`**

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  telephone TEXT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  password_hash TEXT,
  provider TEXT NOT NULL, -- 'email' | 'telephone' | 'google' | 'apple'
  provider_id TEXT,
  photo TEXT,
  date_creation TIMESTAMP NOT NULL,
  derniere_connexion TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  roles JSONB, -- Structure complexe avec profils
  active_role TEXT, -- 'producer' | 'buyer' | 'veterinarian' | 'technician'
  is_onboarded BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMP
);
```

**Contraintes :**
- Au moins `email` OU `telephone` doit être présent
- `nom` et `prenom` : min 2 caractères
- `provider` : déterminé automatiquement (`telephone` si téléphone fourni, sinon `email`)

---

## 🔄 Flux Complet (Diagramme)

```
┌─────────────────────────────────────┐
│   OnboardingAuthScreen              │
│   (Email/Tel, Google, Apple)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Tentative de connexion            │
│   (signIn / OAuth)                  │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    Existe      N'existe pas
        │             │
        ▼             ▼
┌─────────────┐  ┌──────────────────┐
│ Connexion   │  │ ProfileSelection │
│ directe     │  │ (choix du type)  │
└─────────────┘  └────────┬─────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ OnboardingService     │
              │ .createUser()         │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ POST /auth/register   │
              │ (Backend)             │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ AuthService.register() │
              │ - Validation          │
              │ - Vérification doublons│
              │ - Hash password       │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ UsersService.create() │
              │ - Normalisation       │
              │ - INSERT INTO users   │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Génération tokens JWT │
              │ - access_token        │
              │ - refresh_token       │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Création profil       │
              │ (Producer si applicable)│
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Navigation Dashboard   │
              │ (selon activeRole)    │
              └───────────────────────┘
```

---

## 🔑 Points Clés

1. **Flexibilité d'authentification** : Email, Téléphone, Google, ou Apple
2. **Validation stricte** : Au moins email OU téléphone requis
3. **Protection contre doublons** : Vérification avant création
4. **Mot de passe optionnel** : Permet création sans mot de passe (OAuth)
5. **Profils multiples** : Un utilisateur peut avoir plusieurs rôles
6. **Onboarding progressif** : `is_onboarded` permet de suivre l'avancement
7. **Tokens sécurisés** : JWT avec refresh token pour sécurité renforcée

---

## 📁 Fichiers Clés

### Frontend
- `src/screens/OnboardingAuthScreen.tsx` - Écran d'authentification
- `src/services/OnboardingService.ts` - Service de création de compte
- `src/store/slices/authSlice.ts` - Redux slice pour l'authentification
- `src/database/repositories/UserRepository.ts` - Repository utilisateur (obsolète, utilise API)

### Backend
- `backend/src/auth/auth.controller.ts` - Contrôleur d'authentification
- `backend/src/auth/auth.service.ts` - Service d'authentification
- `backend/src/auth/dto/register.dto.ts` - DTO de validation
- `backend/src/users/users.service.ts` - Service utilisateur
- `backend/src/users/users.controller.ts` - Contrôleur utilisateur

---

## 🧪 Tests Recommandés

1. ✅ Création avec email uniquement
2. ✅ Création avec téléphone uniquement
3. ✅ Création avec email + téléphone
4. ✅ Création avec mot de passe
5. ✅ Création sans mot de passe (OAuth)
6. ✅ Tentative de création avec email existant (409)
7. ✅ Tentative de création avec téléphone existant (409)
8. ✅ Validation des champs (nom/prénom trop courts)
9. ✅ Création profil Producer
10. ✅ Création profil Buyer
11. ✅ Création profil Veterinarian (avec validation)
12. ✅ Création profil Technician

---

**Dernière mise à jour :** 2024
**Version :** 1.0

