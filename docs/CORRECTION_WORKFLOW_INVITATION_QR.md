# Correction du workflow d'invitation par QR code

## Objectif
Aligner le workflow QR code sur le workflow d'invitation manuelle : ajout d'une étape de définition des permissions par le producteur, puis acceptation obligatoire par le collaborateur.

## Problème identifié
Le processus d'invitation par QR code créait directement une collaboration avec statut 'actif' sans consentement du collaborateur et sans permettre au producteur de définir les permissions. Cela violait le principe de consentement et créait une asymétrie avec l'invitation manuelle.

## Modifications apportées

### 1. Modification de `createFromQRScan()` dans `collaborations.service.ts`

#### Changements principaux :

**AVANT :**
- Créait une collaboration avec statut 'actif' immédiatement
- Permissions optionnelles (fusionnées avec les permissions par défaut)
- Pas de date d'expiration
- Notification immédiate au producteur

**APRÈS :**
- ✅ Crée une invitation avec statut 'en_attente' (nécessite acceptation)
- ✅ Permissions obligatoires (le producteur doit les définir explicitement)
- ✅ Date d'expiration : J+7 jours (comme les invitations manuelles)
- ✅ Notification uniquement au collaborateur (pas au producteur jusqu'à acceptation/rejet)

#### Validations ajoutées :

1. **Permissions obligatoires** :
   ```typescript
   if (!permissions || Object.keys(permissions).length === 0) {
     throw new BadRequestException('Les permissions sont obligatoires pour créer une invitation via QR code');
   }
   ```

2. **Validation des permissions** :
   - Vérifie que toutes les permissions sont des booléens valides
   - Vérifie que les clés de permissions sont valides (reproduction, nutrition, finance, rapports, planification, mortalites, sante)

3. **Enregistrement des données** :
   ```typescript
   {
     statut: 'en_attente', // Au lieu de 'actif'
     date_acceptation: null, // Sera défini lors de l'acceptation
     expiration_date: J+7, // Expiration après 7 jours
     invitation_type: 'qr_scan',
     invited_by: scannedBy, // ID du producteur qui a scanné
     qr_scan_data: {
       scanned_at: timestamp,
       scanner_user_id: scannedBy,
       scanner_ip: ipAddress,
       scanner_user_agent: userAgent,
       qr_code_version: 'v2_profileId' | 'v1_userId'
     }
   }
   ```

### 2. Modification des notifications

**Notification au collaborateur** :
- Type : `invitation_received`
- Message : "[Nom producteur] vous invite à rejoindre le projet [Nom projet] en tant que [rôle]. Veuillez accepter ou refuser cette invitation."
- Payload : `{ collaboration_id, projet_id, projet_nom, invited_by_name, role, permissions, invitation_type, expiration_date }`

**Notification au producteur** :
- ❌ **SUPPRIMÉE** à l'étape de création de l'invitation
- ✅ **ENVOYÉE** après acceptation ou rejet par le collaborateur (via `accepterInvitation` et `rejeterInvitation`)

### 3. Mise à jour de `accepterInvitation()`

#### Support des invitations QR avec `profile_id` :

```typescript
// Vérifier que l'invitation appartient à l'utilisateur
// Par user_id OU profile_id OU email OU telephone
const matchByUserId = collaboration.user_id === userId;
const matchByEmail = userEmail && invitationEmail && userEmail === invitationEmail;
const matchByTelephone = userTelephone && invitationTelephone && userTelephone === invitationTelephone;

// Pour les invitations QR avec profile_id
let matchByProfileId = false;
if (collaboration.profile_id) {
  const profileIdMatch = collaboration.profile_id.match(/^profile_(.+)_(veterinarian|technician)$/);
  if (profileIdMatch && profileIdMatch[1] === userId) {
    matchByProfileId = true;
  }
}
```

### 4. Mise à jour de `rejeterInvitation()`

- Support déjà présent pour les invitations QR avec `profile_id`
- Vérifie par `user_id`, `profile_id`, `email` ou `telephone`

### 5. Mise à jour de `findInvitationsEnAttente()`

- Inclusion de `profile_id` dans la requête SELECT
- Permet de récupérer les invitations QR avec profil spécifique

### 6. Mise à jour du controller

#### Endpoint `POST /collaborations/from-qr` :

**Documentation Swagger mise à jour** :
- Description : "Crée une invitation en attente (statut 'en_attente') après scan d'un QR code. Le collaborateur doit accepter l'invitation pour devenir actif."
- `permissions` : Maintenant **obligatoire** (required: true)
- Réponse 201 : "Invitation créée avec succès depuis le QR code. En attente d'acceptation du collaborateur."

## Workflow complet après modification

### 1. Producteur scanne le QR code
- Le producteur ouvre l'écran Collaborations
- Il scanne le QR code du vétérinaire/technicien
- Le backend valide le QR code et retourne les informations

### 2. Producteur définit les permissions
- Le producteur sélectionne les permissions à accorder
- Les permissions sont **obligatoires** (toutes les permissions doivent être définies)
- Le producteur envoie la requête avec `permissions` dans le body

### 3. Création de l'invitation
- Le backend crée une invitation avec statut 'en_attente'
- Date d'expiration : J+7 jours
- Notification envoyée au collaborateur

### 4. Collaborateur reçoit l'invitation
- Le collaborateur voit l'invitation dans `GET /collaborations/invitations`
- Il peut voir les permissions proposées
- Il peut accepter ou refuser

### 5. Acceptation ou rejet
- **Acceptation** : Statut devient 'actif', notification au producteur
- **Rejet** : Statut devient 'rejete', notification au producteur

## Tests à effectuer

### Test 1 : Création d'invitation QR avec permissions
- [ ] Scanner un QR code valide
- [ ] Fournir des permissions complètes
- [ ] Vérifier que statut = 'en_attente'
- [ ] Vérifier que expiration_date = J+7
- [ ] Vérifier que la notification est envoyée au collaborateur
- [ ] Vérifier qu'**aucune** notification n'est envoyée au producteur

### Test 2 : Rejet si permissions manquantes
- [ ] Scanner un QR code
- [ ] Ne pas fournir de permissions
- [ ] Vérifier erreur 400 "Les permissions sont obligatoires pour créer une invitation via QR code"

### Test 3 : Rejet si permissions invalides
- [ ] Scanner un QR code
- [ ] Fournir des permissions avec des valeurs non-booléennes
- [ ] Vérifier erreur 400 "La permission [X] doit être un booléen"

### Test 4 : Workflow complet QR
- [ ] Producteur scanne QR → invitation créée (en_attente)
- [ ] Collaborateur appelle GET /invitations → voit l'invitation avec permissions
- [ ] Collaborateur accepte → statut devient 'actif'
- [ ] Producteur reçoit notification d'acceptation
- [ ] Vérifier que date_acceptation est définie

### Test 5 : Rejet d'invitation QR
- [ ] Producteur scanne QR → invitation créée
- [ ] Collaborateur rejette l'invitation
- [ ] Statut devient 'rejete'
- [ ] Producteur reçoit notification de rejet

### Test 6 : Expiration de l'invitation QR
- [ ] Créer invitation QR
- [ ] Simuler passage de 8 jours
- [ ] Vérifier que le cron job marque l'invitation comme 'expire'
- [ ] Vérifier que l'invitation expirée n'apparaît plus dans GET /invitations

### Test 7 : Support profile_id dans acceptation
- [ ] Créer invitation QR avec profile_id
- [ ] Collaborateur avec profil actif correspondant accepte
- [ ] Vérifier que l'acceptation fonctionne via profile_id

## Fichiers modifiés

- `backend/src/collaborations/collaborations.service.ts` :
  - `createFromQRScan()` : Crée invitation en_attente avec permissions obligatoires
  - `accepterInvitation()` : Support profile_id
  - `findInvitationsEnAttente()` : Inclusion de profile_id dans SELECT

- `backend/src/collaborations/collaborations.controller.ts` :
  - Documentation Swagger de `POST /collaborations/from-qr` mise à jour
  - `permissions` maintenant obligatoire

## Différences avec l'ancien workflow

| Aspect | Ancien (avant correction) | Nouveau (après correction) |
|--------|---------------------------|----------------------------|
| Statut initial | `actif` | `en_attente` |
| Permissions | Optionnelles (valeurs par défaut) | **Obligatoires** |
| Date expiration | `null` | J+7 jours |
| Consentement | Automatique | Requiert acceptation |
| Notification producteur | Immédiate | Après acceptation/rejet |
| Alignement avec invitation manuelle | Non | ✅ Oui |

## Compatibilité

- ✅ Les QR codes basés sur `userId` (ancien format) continuent de fonctionner
- ✅ Les QR codes basés sur `profileId` (nouveau format) fonctionnent
- ✅ Les invitations manuelles ne sont pas affectées
- ⚠️ **Breaking change** : Les permissions sont maintenant obligatoires pour les invitations QR

## Notes importantes

- Les permissions doivent être **complètes** (toutes les clés présentes : reproduction, nutrition, finance, rapports, planification, mortalites, sante)
- Chaque permission doit être un booléen (`true` ou `false`)
- Le collaborateur peut voir les permissions proposées avant d'accepter
- L'invitation expire après 7 jours si non acceptée
