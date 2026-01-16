# 🔌 API Reference - Module QR Code Collaborations

## Vue d'ensemble

Documentation complète des endpoints API pour le module QR Code dans les Collaborations.

## 📑 Table des matières

1. [Authentification](#authentification)
2. [Endpoints QR Code](#endpoints-qr-code)
3. [Endpoints Collaborations QR](#endpoints-collaborations-qr)
4. [Codes d'erreur](#codes-derreur)
5. [Rate Limiting](#rate-limiting)
6. [Exemples](#exemples)

## 🔐 Authentification

Tous les endpoints nécessitent une authentification JWT :

```
Authorization: Bearer <token>
```

## 📍 Endpoints QR Code

### 1. Générer un QR code utilisateur

Génère un QR code personnel pour l'utilisateur connecté.

**Endpoint** : `GET /users/me/qr-code`

**Rate Limit** : 10 requêtes / heure

**Query Parameters** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `expiry` | number | Non | Durée d'expiration en minutes (défaut: 5) |

**Response 200 OK** :

```json
{
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "expires_in": 300,
  "expires_at": "2025-01-16T20:30:00.000Z"
}
```

**Response 429 Too Many Requests** :

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 3600
}
```

**Exemple cURL** :

```bash
curl -X GET "https://api.example.com/users/me/qr-code?expiry=5" \
  -H "Authorization: Bearer <token>"
```

**Exemple JavaScript** :

```javascript
const response = await fetch('https://api.example.com/users/me/qr-code?expiry=5', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.qr_code); // Base64 image
```

---

### 2. Valider un QR code (endpoint utilisateur)

Valide un QR code et retourne les informations de l'utilisateur.

**Endpoint** : `POST /users/validate-qr`

**Rate Limit** : 20 requêtes / heure

**Request Body** :

```json
{
  "qr_data": "base64-encrypted-data-here"
}
```

**Response 200 OK** :

```json
{
  "userId": "user-123",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@example.com",
  "telephone": "+33612345678",
  "photo": "https://example.com/photos/user-123.jpg",
  "canBeAdded": true
}
```

**Response 400 Bad Request** (QR expiré) :

```json
{
  "statusCode": 400,
  "message": "Le QR code a expiré. Veuillez en générer un nouveau.",
  "error": "QR_EXPIRED"
}
```

**Response 401 Unauthorized** (QR invalide) :

```json
{
  "statusCode": 401,
  "message": "QR code invalide ou déjà utilisé",
  "error": "INVALID_QR"
}
```

**Exemple cURL** :

```bash
curl -X POST "https://api.example.com/users/validate-qr" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_data": "base64-encrypted-data"
  }'
```

---

## 🤝 Endpoints Collaborations QR

### 3. Valider un QR code pour ajout

Valide un QR code dans le contexte d'une collaboration et vérifie si l'utilisateur peut être ajouté.

**Endpoint** : `POST /collaborations/validate-qr`

**Rate Limit** : 20 requêtes / heure

**Request Body** :

```json
{
  "qr_data": "base64-encrypted-data-here",
  "projet_id": "projet-123"
}
```

**Response 200 OK** (peut être ajouté) :

```json
{
  "userId": "user-123",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@example.com",
  "telephone": "+33612345678",
  "photo": "https://example.com/photos/user-123.jpg",
  "canBeAdded": true
}
```

**Response 200 OK** (ne peut pas être ajouté) :

```json
{
  "userId": "user-123",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@example.com",
  "telephone": "+33612345678",
  "photo": "https://example.com/photos/user-123.jpg",
  "canBeAdded": false,
  "reason": "Cet utilisateur est déjà collaborateur de ce projet"
}
```

**Response 409 Conflict** (doublon) :

```json
{
  "statusCode": 409,
  "message": "Un collaborateur avec cet email existe déjà pour ce projet",
  "error": "DUPLICATE_COLLABORATOR"
}
```

**Exemple cURL** :

```bash
curl -X POST "https://api.example.com/collaborations/validate-qr" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_data": "base64-encrypted-data",
    "projet_id": "projet-123"
  }'
```

---

### 4. Créer une collaboration depuis un scan QR

Crée une collaboration après validation du QR code.

**Endpoint** : `POST /collaborations/from-qr`

**Rate Limit** : 10 requêtes / heure

**Request Body** :

```json
{
  "scanned_user_id": "user-123",
  "projet_id": "projet-123",
  "role": "veterinaire",
  "permissions": {
    "reproduction": true,
    "nutrition": false,
    "finance": false,
    "rapports": true,
    "planification": true,
    "mortalites": true,
    "sante": true
  }
}
```

**Request Headers** (optionnels, pour traceability) :

```
X-Forwarded-For: 192.168.1.1
User-Agent: FermierPro/1.0.0 (iOS 17.0)
```

**Response 201 Created** :

```json
{
  "id": "collab-456",
  "projet_id": "projet-123",
  "user_id": "user-123",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@example.com",
  "telephone": "+33612345678",
  "role": "veterinaire",
  "statut": "actif",
  "permissions": {
    "reproduction": true,
    "nutrition": false,
    "finance": false,
    "rapports": true,
    "planification": true,
    "mortalites": true,
    "sante": true
  },
  "invitation_type": "qr_scan",
  "qr_scan_data": {
    "timestamp": "2025-01-16T19:25:00.000Z",
    "ip_address": "192.168.1.1",
    "user_agent": "FermierPro/1.0.0",
    "scanner_id": "user-producer-456"
  },
  "date_creation": "2025-01-16T19:25:00.000Z",
  "date_acceptation": "2025-01-16T19:25:00.000Z",
  "expiration_date": null
}
```

**Response 400 Bad Request** (limite atteinte) :

```json
{
  "statusCode": 400,
  "message": "La limite de 50 collaborateurs par projet est atteinte",
  "error": "LIMIT_REACHED"
}
```

**Response 403 Forbidden** (auto-ajout) :

```json
{
  "statusCode": 403,
  "message": "Vous ne pouvez pas vous ajouter vous-même en tant que collaborateur",
  "error": "SELF_ADDITION_FORBIDDEN"
}
```

**Response 404 Not Found** (utilisateur inexistant) :

```json
{
  "statusCode": 404,
  "message": "L'utilisateur scanné n'existe pas ou n'est pas actif",
  "error": "USER_NOT_FOUND"
}
```

**Exemple cURL** :

```bash
curl -X POST "https://api.example.com/collaborations/from-qr" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.168.1.1" \
  -H "User-Agent: FermierPro/1.0.0" \
  -d '{
    "scanned_user_id": "user-123",
    "projet_id": "projet-123",
    "role": "veterinaire",
    "permissions": {
      "reproduction": true,
      "sante": true
    }
  }'
```

---

## ❌ Codes d'erreur

### Codes HTTP standards

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée avec succès |
| 400 | Bad Request | Requête mal formée ou paramètres invalides |
| 401 | Unauthorized | Token invalide ou QR code invalide |
| 403 | Forbidden | Permission refusée (ex: auto-ajout) |
| 404 | Not Found | Ressource non trouvée (ex: utilisateur, projet) |
| 409 | Conflict | Conflit (ex: doublon de collaborateur) |
| 429 | Too Many Requests | Limite de requêtes dépassée |
| 500 | Internal Server Error | Erreur serveur |

### Erreurs spécifiques

#### QR_EXPIRED

**Code HTTP** : 400

**Message** : "Le QR code a expiré. Veuillez en générer un nouveau."

**Cause** : Le QR code a dépassé sa durée d'expiration (par défaut 5 minutes).

**Solution** : Générer un nouveau QR code.

---

#### INVALID_QR

**Code HTTP** : 401

**Message** : "QR code invalide ou déjà utilisé"

**Causes possibles** :
- QR code corrompu ou malformé
- QR code déjà utilisé (nonce déjà marqué)
- Données chiffrées invalides

**Solution** : Vérifier le QR code ou en générer un nouveau.

---

#### DUPLICATE_COLLABORATOR

**Code HTTP** : 409

**Message** : "Un collaborateur avec cet email/téléphone/user_id existe déjà pour ce projet"

**Cause** : Tentative d'ajout d'un collaborateur déjà présent.

**Solution** : Vérifier la liste des collaborateurs existants.

---

#### LIMIT_REACHED

**Code HTTP** : 400

**Message** : "La limite de 50 collaborateurs par projet est atteinte"

**Cause** : Le projet a déjà atteint la limite maximale de collaborateurs.

**Solution** : Supprimer un collaborateur existant ou contacter le support.

---

#### SELF_ADDITION_FORBIDDEN

**Code HTTP** : 403

**Message** : "Vous ne pouvez pas vous ajouter vous-même en tant que collaborateur"

**Cause** : Tentative d'ajout de son propre QR code.

**Solution** : Utiliser une autre méthode d'ajout ou inviter un autre utilisateur.

---

#### USER_NOT_FOUND

**Code HTTP** : 404

**Message** : "L'utilisateur scanné n'existe pas ou n'est pas actif"

**Cause** : L'utilisateur associé au QR code n'existe plus ou est inactif.

**Solution** : Vérifier que l'utilisateur est actif dans le système.

---

#### PROJECT_NOT_FOUND

**Code HTTP** : 404

**Message** : "Projet non trouvé ou vous n'êtes pas propriétaire"

**Cause** : Le projet spécifié n'existe pas ou l'utilisateur n'est pas propriétaire.

**Solution** : Vérifier l'ID du projet et les permissions.

---

## 🚦 Rate Limiting

### Limites par endpoint

| Endpoint | Limite | Fenêtre | Headers de réponse |
|----------|--------|---------|-------------------|
| `GET /users/me/qr-code` | 10 | 1 heure | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| `POST /users/validate-qr` | 20 | 1 heure | Idem |
| `POST /collaborations/validate-qr` | 20 | 1 heure | Idem |
| `POST /collaborations/from-qr` | 10 | 1 heure | Idem |

### Headers de réponse

Lorsqu'une limite est atteinte, les headers suivants sont retournés :

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642262400
Retry-After: 3600
```

### Réponse 429

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 3600
}
```

---

## 📝 Exemples complets

### Exemple 1 : Générer et partager un QR code

```javascript
// 1. Générer le QR code
const generateQR = async () => {
  const response = await fetch('https://api.example.com/users/me/qr-code?expiry=5', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la génération du QR code');
  }

  const { qr_code, expires_in, expires_at } = await response.json();
  
  return {
    qrCode: qr_code, // Base64 image
    expiresIn: expires_in, // secondes
    expiresAt: new Date(expires_at)
  };
};

// 2. Partager le QR code
const shareQR = async (qrCodeBase64) => {
  // Utiliser expo-sharing ou React Native Share
  await Sharing.shareAsync(qrCodeBase64, {
    mimeType: 'image/png',
    dialogTitle: 'Partager mon QR code'
  });
};
```

### Exemple 2 : Scanner et ajouter un collaborateur

```javascript
// 1. Scanner le QR code
const scannedData = await CameraView.scan(); // "base64-encrypted-data"

// 2. Valider le QR code
const validateQR = async (qrData, projetId) => {
  const response = await fetch('https://api.example.com/collaborations/validate-qr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      qr_data: qrData,
      projet_id: projetId
    })
  });

  const data = await response.json();
  
  if (!data.canBeAdded) {
    throw new Error(data.reason || 'Impossible d\'ajouter ce collaborateur');
  }

  return data; // { userId, nom, prenom, email, ... }
};

// 3. Créer la collaboration
const createCollaboration = async (scannedUser, projetId, role, permissions) => {
  const response = await fetch('https://api.example.com/collaborations/from-qr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Forwarded-For': await getIpAddress(),
      'User-Agent': 'FermierPro/1.0.0'
    },
    body: JSON.stringify({
      scanned_user_id: scannedUser.userId,
      projet_id: projetId,
      role: role,
      permissions: permissions
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la création de la collaboration');
  }

  return await response.json();
};

// 4. Utilisation complète
try {
  const scannedData = 'base64-encrypted-data-from-camera';
  const projetId = 'projet-123';
  
  // Valider
  const scannedUser = await validateQR(scannedData, projetId);
  
  // Créer
  const collaboration = await createCollaboration(
    scannedUser,
    projetId,
    'veterinaire',
    { sante: true, reproduction: true }
  );
  
  console.log('Collaboration créée:', collaboration);
} catch (error) {
  console.error('Erreur:', error.message);
}
```

### Exemple 3 : Gestion des erreurs

```javascript
const handleQRValidation = async (qrData, projetId) => {
  try {
    const response = await fetch('https://api.example.com/collaborations/validate-qr', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ qr_data: qrData, projet_id: projetId })
    });

    if (response.status === 429) {
      const { retryAfter } = await response.json();
      throw new Error(`Trop de requêtes. Réessayez dans ${retryAfter} secondes`);
    }

    if (!response.ok) {
      const error = await response.json();
      
      switch (error.error) {
        case 'QR_EXPIRED':
          throw new Error('Le QR code a expiré. Demandez-en un nouveau.');
        case 'INVALID_QR':
          throw new Error('QR code invalide. Vérifiez le code scanné.');
        case 'DUPLICATE_COLLABORATOR':
          throw new Error('Cet utilisateur est déjà collaborateur de ce projet.');
        default:
          throw new Error(error.message || 'Erreur inconnue');
      }
    }

    return await response.json();
  } catch (error) {
    if (error.message) {
      throw error;
    }
    throw new Error('Erreur réseau. Vérifiez votre connexion.');
  }
};
```

---

## 🔗 Collection Postman

### Import de la collection

1. Ouvrir Postman
2. Cliquer sur "Import"
3. Coller le JSON suivant :

```json
{
  "info": {
    "name": "Collaborations QR API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Générer QR code",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users/me/qr-code?expiry=5",
          "host": ["{{baseUrl}}"],
          "path": ["users", "me", "qr-code"],
          "query": [
            { "key": "expiry", "value": "5" }
          ]
        }
      }
    },
    {
      "name": "Valider QR code",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"qr_data\": \"base64-encrypted-data\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/collaborations/validate-qr",
          "host": ["{{baseUrl}}"],
          "path": ["collaborations", "validate-qr"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://api.example.com"
    },
    {
      "key": "token",
      "value": "your-jwt-token-here"
    }
  ]
}
```

---

## 📊 Monitoring et logs

### Logs d'audit

Toutes les actions QR sont loggées dans `collaboration_history` :

```sql
SELECT 
  action,
  performed_by,
  old_value,
  new_value,
  ip_address,
  user_agent,
  created_at
FROM collaboration_history
WHERE new_value->>'qr_scan_data' IS NOT NULL
ORDER BY created_at DESC;
```

### Métriques recommandées

- Nombre de QR codes générés par jour
- Taux de succès des scans
- Temps moyen entre génération et utilisation
- Taux d'expiration (QR codes non utilisés)
- Erreurs les plus fréquentes

---

## 🔗 Voir aussi

- [Guide d'intégration](./COLLABORATIONS_QR_README.md)
- [Documentation Frontend](./COLLABORATIONS_QR_FRONTEND.md)
- [Guide de test](./COLLABORATIONS_QR_TESTING.md)
- [Dépannage](./COLLABORATIONS_QR_TROUBLESHOOTING.md)
