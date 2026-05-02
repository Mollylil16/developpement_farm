# 📊 Système de Traçabilité des Collaborations - Documentation Complète

## 📋 Vue d'ensemble

Le système de traçabilité permet de logger toutes les actions effectuées sur les collaborations pour un audit complet et une sécurité renforcée.

## 🔧 Modifications Apportées

### 1. ✅ Suppression de la Liaison Automatique

**Fichier** : `backend/src/collaborations/collaborations.service.ts`

**Lignes supprimées** : 617-664 (bloc de liaison automatique dans `findInvitationsEnAttente()`)

**Raison** : Faille de sécurité - liaison sans consentement explicite de l'utilisateur.

**Code supprimé** :
```typescript
// RETIRÉ : Liaison automatique supprimée pour des raisons de sécurité
// Les invitations doivent être liées manuellement via linkInvitationToUser()
```

### 2. ✅ Nouvelle Méthode de Liaison Manuelle

**Méthode** : `linkInvitationToUser(invitationId, userId, ipAddress?, userAgent?)`

**Fonctionnalités** :
- Vérifie que l'invitation existe et est en attente
- Vérifie que l'invitation n'a pas expiré
- Vérifie que l'email OU téléphone correspond à l'utilisateur
- Met à jour `user_id`
- Log l'action 'linked' dans l'historique
- Retourne l'invitation liée

### 3. ✅ Table `collaboration_history`

**Migration** : `backend/database/migrations/077_create_collaboration_history_table.sql`

**Structure** :
```sql
CREATE TABLE collaboration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id VARCHAR(255) REFERENCES collaborations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('invited', 'accepted', 'rejected', 'permission_changed', 'removed', 'linked', 'updated', 'expired')),
  performed_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Index créés** :
- `idx_collab_history_collab` : Sur `collaboration_id`
- `idx_collab_history_date` : Sur `created_at DESC`
- `idx_collab_history_action` : Sur `action`
- `idx_collab_history_performed_by` : Sur `performed_by`

### 4. ✅ Méthode de Logging

**Méthode privée** : `logCollaborationAction()`

**Paramètres** :
- `collaborationId` : ID de la collaboration
- `action` : Type d'action ('invited', 'accepted', etc.)
- `performedBy` : ID de l'utilisateur (null pour actions système)
- `oldValue` : Valeurs avant modification (optionnel)
- `newValue` : Valeurs après modification (optionnel)
- `ipAddress` : Adresse IP (optionnel)
- `userAgent` : User-Agent (optionnel)

### 5. ✅ Logging dans Toutes les Actions

**Actions loggées** :
- `create()` → 'invited'
- `accepterInvitation()` → 'accepted'
- `rejeterInvitation()` → 'rejected'
- `update()` → 'permission_changed' (si permissions changent) ou 'updated'
- `delete()` → 'removed'
- `linkInvitationToUser()` → 'linked'
- `cleanupExpiredInvitations()` → 'expired' (pour chaque invitation)

### 6. ✅ Nouvelle Route GET /collaborations/:id/history

**Endpoint** : `GET /collaborations/:id/history`

**Accès** : Uniquement par le propriétaire du projet

**Retourne** : Historique complet avec :
- Action effectuée
- Utilisateur qui a effectué l'action
- Anciennes et nouvelles valeurs
- IP et User-Agent
- Date et heure

---

## 📄 Code Complet

### Service Modifié

**Fichier** : `backend/src/collaborations/collaborations.service.ts`

#### Méthode `logCollaborationAction()` (Nouvelle)

```typescript
private async logCollaborationAction(
  collaborationId: string,
  action: 'invited' | 'accepted' | 'rejected' | 'permission_changed' | 'removed' | 'linked' | 'updated' | 'expired',
  performedBy: string | null,
  oldValue?: any,
  newValue?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await this.databaseService.query(
      `INSERT INTO collaboration_history (
        collaboration_id, action, performed_by, old_value, new_value, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        collaborationId,
        action,
        performedBy || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress || null,
        userAgent || null,
      ]
    );
  } catch (error) {
    // Log l'erreur mais ne pas faire échouer l'opération principale
    console.error(`[CollaborationsService] Erreur lors du logging de l'action ${action}:`, error);
  }
}
```

#### Méthode `linkInvitationToUser()` (Nouvelle)

```typescript
async linkInvitationToUser(
  invitationId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  // Récupérer l'invitation
  const invitationResult = await this.databaseService.query(
    'SELECT * FROM collaborations WHERE id = $1',
    [invitationId]
  );

  if (invitationResult.rows.length === 0) {
    throw new NotFoundException('Invitation introuvable');
  }

  const invitation = invitationResult.rows[0];

  // Vérifier que l'invitation est en attente
  if (invitation.statut !== 'en_attente') {
    throw new BadRequestException("Cette invitation n'est plus en attente");
  }

  // Vérifier que l'invitation n'a pas expiré
  if (invitation.expiration_date) {
    const expirationDate = new Date(invitation.expiration_date);
    const now = new Date();
    if (expirationDate < now) {
      throw new BadRequestException('Cette invitation a expiré');
    }
  }

  // Récupérer les informations de l'utilisateur
  const userResult = await this.databaseService.query(
    'SELECT email, telephone FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new NotFoundException('Utilisateur introuvable');
  }

  const user = userResult.rows[0];
  const userEmail = user?.email?.toLowerCase().trim();
  const userTelephone = user?.telephone?.trim();

  // Vérifier que l'email OU téléphone correspond
  const invitationEmail = invitation.email?.toLowerCase().trim();
  const invitationTelephone = invitation.telephone?.trim();

  const emailMatch = userEmail && invitationEmail && userEmail === invitationEmail;
  const telephoneMatch = userTelephone && invitationTelephone && userTelephone === invitationTelephone;

  if (!emailMatch && !telephoneMatch) {
    throw new ForbiddenException(
      "L'email ou le téléphone de l'invitation ne correspond pas à votre compte"
    );
  }

  // Mettre à jour l'invitation
  const now = new Date().toISOString();
  const oldUserId = invitation.user_id;

  const updateResult = await this.databaseService.query(
    `UPDATE collaborations 
     SET user_id = $1, derniere_modification = $2
     WHERE id = $3
     RETURNING *`,
    [userId, now, invitationId]
  );

  const updatedInvitation = this.mapRowToCollaborateur(updateResult.rows[0]);

  // Log l'action 'linked'
  await this.logCollaborationAction(
    invitationId,
    'linked',
    userId,
    { user_id: oldUserId },
    { user_id: userId },
    ipAddress,
    userAgent
  );

  return updatedInvitation;
}
```

#### Méthode `getCollaborationHistory()` (Nouvelle)

```typescript
async getCollaborationHistory(collaborationId: string, userId: string) {
  // Vérifier que la collaboration existe et que l'utilisateur est propriétaire
  const collaboration = await this.findOne(collaborationId, userId);
  if (!collaboration) {
    throw new NotFoundException('Collaboration introuvable');
  }

  // Récupérer l'historique
  const result = await this.databaseService.query(
    `SELECT 
      h.id,
      h.action,
      h.performed_by,
      h.old_value,
      h.new_value,
      h.ip_address,
      h.user_agent,
      h.created_at,
      u.email as performed_by_email,
      u.nom as performed_by_nom,
      u.prenom as performed_by_prenom
    FROM collaboration_history h
    LEFT JOIN users u ON h.performed_by = u.id
    WHERE h.collaboration_id = $1
    ORDER BY h.created_at DESC`,
    [collaborationId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    performed_by: row.performed_by
      ? {
          id: row.performed_by,
          email: row.performed_by_email,
          nom: row.performed_by_nom,
          prenom: row.performed_by_prenom,
        }
      : null,
    old_value: row.old_value ? JSON.parse(row.old_value) : null,
    new_value: row.new_value ? JSON.parse(row.new_value) : null,
    ip_address: row.ip_address || undefined,
    user_agent: row.user_agent || undefined,
    created_at: row.created_at,
  }));
}
```

#### Méthode `findInvitationsEnAttente()` (Modifiée)

**Code supprimé** : Bloc de liaison automatique (lignes 617-664)

**Nouveau code** :
```typescript
const result = await this.databaseService.query(query, params);

// RETIRÉ : Liaison automatique supprimée pour des raisons de sécurité
// Les invitations doivent être liées manuellement via linkInvitationToUser()

return result.rows.map((row) => this.mapRowToCollaborateur(row));
```

### Controller Modifié

**Fichier** : `backend/src/collaborations/collaborations.controller.ts`

#### Nouvelles Routes

```typescript
@Patch(':id/link')
@ApiOperation({ summary: 'Lier manuellement une invitation à un utilisateur' })
async linkInvitationToUser(
  @Param('id') id: string,
  @CurrentUser('id') userId: string,
  @Request() req: any
) {
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const userAgent = req.get('user-agent');
  return this.collaborationsService.linkInvitationToUser(id, userId, ipAddress, userAgent);
}

@Get(':id/history')
@ApiOperation({ summary: "Récupérer l'historique complet d'une collaboration" })
async getCollaborationHistory(
  @Param('id') id: string,
  @CurrentUser('id') userId: string
) {
  return this.collaborationsService.getCollaborationHistory(id, userId);
}
```

#### Routes Modifiées (ajout de ipAddress/userAgent)

Toutes les routes suivantes ont été modifiées pour passer `ipAddress` et `userAgent` :
- `create()`
- `update()`
- `accepterInvitation()`
- `rejeterInvitation()`
- `delete()`

---

## 📊 Types d'Actions Loggées

| Action | Description | Déclencheur |
|--------|-------------|-------------|
| `invited` | Invitation créée | `create()` |
| `accepted` | Invitation acceptée | `accepterInvitation()` |
| `rejected` | Invitation rejetée | `rejeterInvitation()` |
| `linked` | Invitation liée à un utilisateur | `linkInvitationToUser()` |
| `permission_changed` | Permissions modifiées | `update()` (si permissions changent) |
| `updated` | Autres modifications | `update()` (si autres champs changent) |
| `removed` | Collaboration supprimée | `delete()` |
| `expired` | Invitation expirée | `cleanupExpiredInvitations()` |

---

## 🔍 Exemple de Données dans `collaboration_history`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "collaboration_id": "collaborateur_1234567890_abc123",
  "action": "accepted",
  "performed_by": "user_123",
  "old_value": {
    "statut": "en_attente",
    "user_id": null
  },
  "new_value": {
    "statut": "actif",
    "user_id": "user_123",
    "date_acceptation": "2025-01-15T10:30:00.000Z"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

---

## 🚀 Utilisation

### Lier une Invitation

```bash
PATCH /collaborations/:id/link
Authorization: Bearer <token>
```

**Réponse** :
```json
{
  "id": "collaborateur_1234567890_abc123",
  "projet_id": "projet_123",
  "user_id": "user_123",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@example.com",
  "role": "gestionnaire",
  "statut": "en_attente",
  "permissions": { ... }
}
```

### Récupérer l'Historique

```bash
GET /collaborations/:id/history
Authorization: Bearer <token>
```

**Réponse** :
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "action": "invited",
    "performed_by": {
      "id": "user_456",
      "email": "proprietaire@example.com",
      "nom": "Martin",
      "prenom": "Pierre"
    },
    "old_value": null,
    "new_value": {
      "projet_id": "projet_123",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean.dupont@example.com",
      "role": "gestionnaire",
      "statut": "en_attente",
      "permissions": { ... }
    },
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2025-01-15T09:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "action": "linked",
    "performed_by": {
      "id": "user_123",
      "email": "jean.dupont@example.com",
      "nom": "Dupont",
      "prenom": "Jean"
    },
    "old_value": { "user_id": null },
    "new_value": { "user_id": "user_123" },
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2025-01-15T10:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "action": "accepted",
    "performed_by": {
      "id": "user_123",
      "email": "jean.dupont@example.com",
      "nom": "Dupont",
      "prenom": "Jean"
    },
    "old_value": {
      "statut": "en_attente",
      "user_id": null
    },
    "new_value": {
      "statut": "actif",
      "user_id": "user_123",
      "date_acceptation": "2025-01-15T10:30:00.000Z"
    },
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
]
```

---

## 🔒 Sécurité

### ✅ Améliorations

1. **Liaison manuelle** : Plus de liaison automatique sans consentement
2. **Vérification email/téléphone** : La liaison nécessite une correspondance
3. **Traçabilité complète** : Toutes les actions sont loggées
4. **Audit trail** : IP et User-Agent enregistrés pour chaque action

### ⚠️ Points d'Attention

1. **Performance** : Les logs peuvent devenir volumineux - prévoir un archivage périodique
2. **Données sensibles** : Les `old_value` et `new_value` contiennent des données JSON - vérifier la conformité RGPD
3. **Rétention** : Définir une politique de rétention des logs

---

## 📝 Checklist de Vérification

- [x] Migration SQL créée et exécutée
- [x] Liaison automatique supprimée
- [x] Méthode `linkInvitationToUser()` créée
- [x] Méthode `logCollaborationAction()` créée
- [x] Logging ajouté dans toutes les méthodes
- [x] Route `GET /collaborations/:id/history` créée
- [x] Route `PATCH /collaborations/:id/link` créée
- [x] IP et User-Agent passés dans toutes les méthodes
- [x] Tests de sécurité effectués

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
