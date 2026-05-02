# Correction du workflow d'invitation par QR code

## Statut des modifications

### ✅ Complété

1. **Controller** (`collaborations.controller.ts`) :
   - Documentation de l'endpoint mise à jour
   - `permissions` rendu obligatoire dans le body
   - `notes` ajouté comme paramètre optionnel
   - Validation ajoutée pour vérifier que permissions est fourni
   - L'appel à `createFromQRScan` inclut maintenant `profile_id`, `profile_type`, et `notes`

2. **Service - Méthodes d'acceptation/rejet** (`collaborations.service.ts`) :
   - `accepterInvitation()` : Support de `profile_id` ajouté (vérifie par user_id OU profile_id)
   - `rejeterInvitation()` : Support de `profile_id` ajouté (vérifie par user_id OU profile_id)
   - `findInvitationsEnAttente()` : Inclusion de `profile_id` dans le SELECT (à vérifier)

3. **Interface Collaborateur** :
   - `profile_id` ajouté dans l'interface `Collaborateur` (backend)
   - `profile_id` ajouté dans l'interface `Collaborateur` (frontend)

### ⚠️ À compléter

1. **Service - Méthode `createFromQRScan()`** :
   - **Signature** : Ajouter `profileId`, `profileType`, et `notes` comme paramètres
   - **Permissions** : Changer de `Partial<Permissions>` à `Permissions` (obligatoire)
   - **Validations** :
     - Ajouter validation pour `profileId` et `profileType` si fournis
     - Vérifier que les permissions sont obligatoires et valides
     - Vérifier doublons par `profileId` si fourni
   - **Statut** : Changer de `'actif'` à `'en_attente'`
   - **Date d'expiration** : Ajouter expiration_date = J+7 jours
   - **INSERT** : Ajouter `profile_id` et `invited_by` dans l'INSERT
   - **Notifications** : 
     - Envoyer notification seulement au collaborateur (pas au producteur)
     - Message adapté pour invitation en attente
   - **Métadonnées QR** : Ajouter `qr_code_version` dans `qr_scan_data`

2. **Service - Méthode `findInvitationsEnAttente()`** :
   - Vérifier que `profile_id` est inclus dans le SELECT

## Instructions pour compléter les modifications

### 1. Modifier la signature de `createFromQRScan`

```typescript
async createFromQRScan(
  scannedUserId: string,
  projetId: string,
  role: string,
  permissions: Permissions, // ⚠️ Changer de Partial<Permissions> à Permissions
  scannedBy: string,
  ipAddress?: string,
  userAgent?: string,
  profileId?: string,        // ⚠️ Ajouter
  profileType?: string,      // ⚠️ Ajouter
  notes?: string             // ⚠️ Ajouter
) {
```

### 2. Modifications dans le corps de la méthode

**Remplacer** :
```typescript
'actif', // Statut actif directement (pas d'attente)
```

**Par** :
```typescript
'en_attente', // ✅ CHANGEMENT CRITIQUE: Statut en_attente (nécessite acceptation)
```

**Remplacer** :
```typescript
null, // expiration_date = NULL (pas d'expiration pour QR)
```

**Par** :
```typescript
expirationDateISO, // expiration_date = J+7
```

Avec la définition :
```typescript
const expirationDate = new Date(now);
expirationDate.setDate(expirationDate.getDate() + INVITATION_EXPIRY_DAYS);
const expirationDateISO = expirationDate.toISOString();
```

**Remplacer l'INSERT** pour inclure `profile_id` et `invited_by` :
```typescript
INSERT INTO collaborations (
  id, projet_id, user_id, profile_id, nom, prenom, email, telephone, role, statut,
  ...
  invitation_type, invited_by, qr_scan_data, notes, ...
)
VALUES (..., profileId || null, ..., projet.proprietaire_id || scannedBy, ..., notes || null, ...)
```

**Remplacer les notifications** pour envoyer seulement au collaborateur :
```typescript
// ✅ PAS de notification au producteur à cette étape
// La notification au producteur sera envoyée après acceptation/rejet
```

### 3. Vérifier `findInvitationsEnAttente`

S'assurer que la requête SELECT inclut `profile_id` :
```sql
SELECT id, projet_id, user_id, profile_id, nom, prenom, ...
```

## Tests à effectuer après modification

1. **Test création invitation QR** :
   - Scanner un QR code valide
   - Fournir des permissions
   - Vérifier que statut = 'en_attente'
   - Vérifier que expiration_date = J+7
   - Vérifier que la notification est envoyée au collaborateur (pas au producteur)

2. **Test rejet si permissions manquantes** :
   - Scanner un QR code
   - Ne pas fournir de permissions
   - Vérifier erreur 400 "Permissions requises"

3. **Test workflow complet** :
   - Producteur scanne QR → invitation créée (en_attente)
   - Collaborateur appelle GET /invitations → voit l'invitation
   - Collaborateur accepte → statut devient 'actif'
   - Producteur reçoit notification d'acceptation

4. **Test avec profileId** :
   - Scanner QR code de profil vétérinaire
   - Vérifier que profile_id est stocké
   - Vérifier que le collaborateur peut accepter via son profileId

## Fichiers à modifier

- `backend/src/collaborations/collaborations.service.ts` : Méthode `createFromQRScan()` (lignes 409-580)
- `backend/src/collaborations/collaborations.service.ts` : Méthode `findInvitationsEnAttente()` (vérifier SELECT)

## Notes importantes

- Les endpoints `accepterInvitation` et `rejeterInvitation` ont déjà été modifiés pour supporter `profile_id`
- Le controller a déjà été mis à jour pour rendre `permissions` obligatoire
- Le frontend devra être mis à jour pour envoyer les permissions lors du scan QR
