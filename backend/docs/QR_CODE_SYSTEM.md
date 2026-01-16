# 🔐 Système de QR Code pour Invitations - Documentation Complète

## 📋 Vue d'ensemble

Système sécurisé de QR codes pour faciliter les invitations de collaboration. Les QR codes sont :
- ✅ **Chiffrés** : User ID chiffré avec AES-256-GCM
- ✅ **Temporaires** : Expiration configurable (défaut: 5 minutes)
- ✅ **Anti-replay** : Chaque QR code ne peut être utilisé qu'une seule fois
- ✅ **Rate limited** : Protection contre les abus

---

## 🔧 Installation

Les packages suivants ont été installés :
```bash
npm install qrcode uuid @types/qrcode @types/uuid
```

---

## 🔐 Variables d'Environnement

Ajoutez dans `backend/.env` :

```env
# Clé de chiffrement pour les QR codes (minimum 32 caractères)
QR_ENCRYPTION_KEY=your-very-secure-32-character-secret-key-here

# Durée de validité par défaut en minutes
QR_DEFAULT_EXPIRY_MINUTES=5
```

**⚠️ Important** : 
- `QR_ENCRYPTION_KEY` doit faire au moins 32 caractères
- Utilisez une clé forte et unique en production
- Ne commitez jamais cette clé dans le dépôt

---

## 📄 Structure des Fichiers

### Fichiers Créés

1. **`backend/src/common/services/qrcode.service.ts`**
   - Service complet pour génération, décodage et validation des QR codes
   - Chiffrement AES-256-GCM
   - Anti-replay avec cache

2. **`backend/src/users/dto/validate-qr.dto.ts`**
   - DTO pour la validation de QR code

### Fichiers Modifiés

1. **`backend/src/common/common.module.ts`**
   - Ajout de `QRCodeService` aux providers et exports

2. **`backend/src/users/users.controller.ts`**
   - Ajout des routes `GET /users/me/qr-code` et `POST /users/validate-qr`
   - Rate limiting configuré

---

## 🔌 API Endpoints

### 1. GET /users/me/qr-code

Génère un QR code sécurisé pour l'utilisateur connecté.

**Authentification** : Requise (JWT)

**Query Parameters** :
- `expiry` (optionnel) : Durée de validité en minutes (défaut: 5, max: 60)

**Rate Limit** : 10 générations par heure

**Réponse** :
```json
{
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "expires_in": 300
}
```

**Exemple d'utilisation** :
```bash
GET /users/me/qr-code?expiry=5
Authorization: Bearer <token>
```

---

### 2. POST /users/validate-qr

Valide un QR code scanné et retourne les informations utilisateur.

**Authentification** : Non requise (Public)

**Body** :
```json
{
  "qr_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Rate Limit** : 20 validations par heure

**Réponse** :
```json
{
  "user": {
    "id": "user_123",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "telephone": "+2250712345678",
    "photo": "https://example.com/photo.jpg"
  },
  "expires_at": "2025-01-15T10:35:00.000Z"
}
```

**Exemple d'utilisation** :
```bash
POST /users/validate-qr
Content-Type: application/json

{
  "qr_data": "data:image/png;base64,..."
}
```

**Codes d'erreur** :
- `401 Unauthorized` : QR code invalide, expiré ou déjà utilisé
- `429 Too Many Requests` : Limite de rate limit atteinte

---

## 🔒 Sécurité

### 1. Chiffrement

- **Algorithme** : AES-256-GCM (Authenticated Encryption)
- **Clé** : Dérivée depuis `QR_ENCRYPTION_KEY` avec scrypt
- **IV** : Généré aléatoirement pour chaque QR code
- **Auth Tag** : Vérification d'intégrité incluse

### 2. Anti-Replay

- **Nonce unique** : UUID v4 pour chaque QR code
- **Cache** : Stockage des nonces utilisés dans `CacheService`
- **TTL** : Conservation du nonce jusqu'à expiration + 1 heure
- **Vérification** : Rejet si le nonce a déjà été utilisé

### 3. Expiration

- **Par défaut** : 5 minutes
- **Configurable** : 1 à 60 minutes
- **Vérification** : Rejet si `exp < now`

### 4. Rate Limiting

- **Génération** : 10 QR codes par heure par utilisateur
- **Validation** : 20 validations par heure par IP
- **Protection** : Prévention des abus et attaques par force brute

---

## 📊 Format des Données QR

Le QR code contient un objet JSON encodé en base64 :

```json
{
  "type": "collab",
  "uid": "encrypted_user_id_base64",
  "exp": 1705320000000,
  "nonce": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Structure** :
- `type` : Type de QR code (toujours `'collab'`)
- `uid` : User ID chiffré en base64
- `exp` : Timestamp d'expiration (millisecondes)
- `nonce` : UUID unique pour anti-replay

---

## 💡 Exemples d'Utilisation

### Frontend : Générer un QR Code

```typescript
// Récupérer le QR code
const response = await fetch('/users/me/qr-code?expiry=5', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const { qr_code, expires_in } = await response.json();

// Afficher le QR code
<Image source={{ uri: qr_code }} style={{ width: 300, height: 300 }} />
```

### Frontend : Scanner et Valider un QR Code

```typescript
// Après avoir scanné le QR code avec une bibliothèque (ex: expo-camera)
const qrData = scannedData; // "data:image/png;base64,..."

// Valider le QR code
const response = await fetch('/users/validate-qr', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ qr_data: qrData }),
});

if (response.ok) {
  const { user, expires_at } = await response.json();
  // Utiliser les informations pour créer une invitation
  await createCollaboration({
    user_id: user.id,
    email: user.email,
    telephone: user.telephone,
    // ...
  });
} else {
  // Gérer l'erreur (QR expiré, déjà utilisé, etc.)
}
```

---

## 🔍 Code Complet

### QRCodeService

```typescript
@Injectable()
export class QRCodeService {
  // Chiffrement AES-256-GCM
  // Anti-replay avec nonce UUID
  // Expiration configurable
  // Cache pour stocker les nonces utilisés
}
```

**Méthodes principales** :
- `generateUserQRCode(userId, expiryMinutes)` : Génère un QR code
- `decodeQRData(qrData)` : Décode et valide un QR code
- `markQRAsUsed(qrData)` : Marque un QR code comme utilisé

### UsersController

```typescript
@Get('me/qr-code')
@RateLimit({ maxRequests: 10, windowMs: 3600000 })
async generateQRCode(@CurrentUser('id') userId, @Query('expiry') expiry?)

@Post('validate-qr')
@Public()
@RateLimit({ maxRequests: 20, windowMs: 3600000 })
async validateQR(@Body() validateQrDto: ValidateQrDto)
```

---

## ⚠️ Points d'Attention

1. **Clé de chiffrement** :
   - Doit être unique et forte (minimum 32 caractères)
   - Ne jamais commiter dans le dépôt
   - Générer avec : `openssl rand -base64 32`

2. **Cache** :
   - Actuellement en mémoire (perdu au redémarrage)
   - En production, utiliser Redis pour la persistance

3. **Rate Limiting** :
   - Basé sur IP pour la validation (public)
   - Basé sur user ID pour la génération (authentifié)

4. **Expiration** :
   - Les QR codes expirés sont automatiquement rejetés
   - Les nonces utilisés sont conservés 1 heure après expiration

---

## 🚀 Génération de la Clé de Chiffrement

```bash
# Générer une clé sécurisée (32 caractères minimum)
openssl rand -base64 32

# Ou avec Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Ajoutez le résultat dans `backend/.env` :
```env
QR_ENCRYPTION_KEY=<votre-clé-générée>
```

---

## ✅ Checklist de Vérification

- [x] Packages installés (qrcode, uuid)
- [x] QRCodeService créé avec chiffrement AES-256-GCM
- [x] Anti-replay implémenté (nonce + cache)
- [x] Expiration configurable
- [x] Routes API créées
- [x] Rate limiting configuré
- [x] DTO de validation créé
- [x] Documentation Swagger complète
- [x] Variables d'environnement documentées
- [x] Tests de linting passés

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
