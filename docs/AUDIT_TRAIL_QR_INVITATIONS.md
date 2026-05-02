# Amélioration des métadonnées et de la traçabilité - Invitations QR

## Objectif
Enrichir les métadonnées de scan QR pour améliorer l'audit, la sécurité et le debugging.

## Modifications apportées

### 1. Migration de base de données

**Fichier : `backend/database/migrations/086_enrich_collaboration_history_audit.sql`**

Ajoute les colonnes suivantes à la table `collaboration_history` :
- `device_info` (JSONB) : Informations du device (plateforme, OS, version app)
- `action_metadata` (JSONB) : Métadonnées spécifiques à l'action
- `profile_id` (VARCHAR) : ID du profil de l'utilisateur qui a effectué l'action

### 2. Enrichissement de qr_scan_data

**Structure enrichie de `qr_scan_data` :**

```javascript
{
  scanned_at: Date,                    // Timestamp du scan
  scanner_user_id: string,             // ID du producteur qui a scanné
  scanner_profile_id: string,          // Profil producteur qui a scanné
  scanner_ip: string,                  // IP du scanner
  scanner_user_agent: string,          // User-Agent du scanner
  scanner_device_info: {               // Informations du device
    platform: 'ios' | 'android' | 'web',
    os_version: string,
    app_version: string
  },
  scanned_profile_id: string,          // Profil du QR scanné
  scanned_user_id: string,             // User ID du QR scanné
  scanned_profile_type: string,        // Type de profil (veterinarian/technician)
  qr_code_version: 'v1_userId' | 'v2_profileId',  // Format du QR
  permissions_defined_at: Date,        // Quand le producteur a défini les permissions
  invitation_sent_at: Date             // Quand l'invitation a été envoyée
}
```

### 3. Méthode getAuditTrail

**Endpoint : GET /collaborations/:id/audit-trail**

Accessible uniquement par :
- Le producteur qui a créé l'invitation (propriétaire du projet)
- L'administrateur système (TODO: à implémenter)

**Retourne :**

```javascript
{
  collaboration_id: string,
  invitation_type: 'qr_scan' | 'manual',
  timeline: [
    {
      action: 'qr_scanned',
      timestamp: Date,
      actor: { user_id, profile_id, nom, prenom },
      metadata: {
        qr_code_version: string,
        scanned_profile_id: string,
        scanned_user_id: string,
        scanned_profile_type: string,
        scanner_ip: string,
        scanner_user_agent: string,
        scanner_device_info: {...}
      }
    },
    {
      action: 'permissions_defined',
      timestamp: Date,
      actor: {...},
      metadata: {
        permissions_defined_at: Date
      }
    },
    {
      action: 'invitation_sent',
      timestamp: Date,
      actor: {...},
      metadata: {}
    },
    {
      action: 'invitation_viewed',  // Nouveau
      timestamp: Date,
      actor: { user_id, profile_id, nom, prenom },
      metadata: { device_info, ip_address, user_agent }
    },
    {
      action: 'accepted' | 'rejected',
      timestamp: Date,
      actor: { user_id, profile_id, nom, prenom },
      metadata: {
        rejection_reason: string,  // Si rejet
        device_info: {...},
        ip_address: string,
        user_agent: string
      }
    }
  ]
}
```

### 4. Logging amélioré

**Méthode `logCollaborationAction` enrichie :**

Support des nouveaux paramètres :
- `deviceInfo` : Informations du device (plateforme, OS, version app)
- `actionMetadata` : Métadonnées spécifiques à l'action
- `profileId` : ID du profil de l'utilisateur

**Nouvelles actions supportées :**
- `qr_scanned` : QR code scanné
- `permissions_defined` : Permissions définies par le producteur
- `invitation_sent` : Invitation envoyée
- `invitation_viewed` : Invitation visualisée par le collaborateur

**Compatibilité rétroactive :**
La méthode essaie d'insérer avec les nouveaux champs, et si les colonnes n'existent pas encore (avant migration), elle utilise l'ancien format.

## Instructions pour compléter

### 1. Enrichir qr_scan_data dans createFromQRScan

**À modifier dans `backend/src/collaborations/collaborations.service.ts` (lignes ~461-467) :**

Remplacer :
```typescript
const qrScanData = {
  timestamp: now,
  ip_address: ipAddress || null,
  user_agent: userAgent || null,
  scanner_id: scannedBy,
};
```

Par :
```typescript
// Récupérer les informations du producteur qui scanne
const scannerResult = await this.databaseService.query(
  `SELECT id, nom, prenom, email, active_role FROM users WHERE id = $1`,
  [scannedBy]
);
const scannerUser = scannerResult.rows[0] || null;

// Récupérer les informations du projet
const projetResult = await this.databaseService.query(
  `SELECT id, nom FROM projets WHERE id = $1`,
  [projetId]
);
const projet = projetResult.rows[0] || null;

// Extraire les informations de device depuis userAgent
let deviceInfo: { platform?: string; os_version?: string; app_version?: string } = {};
if (userAgent) {
  if (userAgent.includes('Android')) {
    deviceInfo.platform = 'android';
    const androidVersion = userAgent.match(/Android (\d+(?:\.\d+)?)/);
    if (androidVersion) {
      deviceInfo.os_version = androidVersion[1];
    }
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iOS')) {
    deviceInfo.platform = 'ios';
    const iosVersion = userAgent.match(/OS (\d+)_(\d+)/);
    if (iosVersion) {
      deviceInfo.os_version = `${iosVersion[1]}.${iosVersion[2]}`;
    }
  } else if (userAgent.includes('Mobile')) {
    deviceInfo.platform = 'web';
  }
  const appVersion = userAgent.match(/FermierPro\/([^\s]+)/);
  if (appVersion) {
    deviceInfo.app_version = appVersion[1];
  }
}

const qrScanData = {
  scanned_at: nowISO,
  scanner_user_id: scannedBy,
  scanner_profile_id: profileId ? `profile_${scannedBy}_${scannerUser?.active_role || 'producer'}` : null,
  scanner_ip: ipAddress || null,
  scanner_user_agent: userAgent || null,
  scanner_device_info: Object.keys(deviceInfo).length > 0 ? deviceInfo : null,
  scanned_profile_id: profileId || null,
  scanned_user_id: scannedUserId,
  scanned_profile_type: profileType || null,
  qr_code_version: profileId ? 'v2_profileId' : 'v1_userId',
  permissions_defined_at: nowISO,
  invitation_sent_at: nowISO,
};
```

### 2. Ajouter la méthode getAuditTrail au service

**À ajouter dans `backend/src/collaborations/collaborations.service.ts` avant la fermeture de la classe (ligne ~1738) :**

Voir le contenu dans `backend/src/collaborations/collaborations.service.audit-trail.ts` (fichier temporaire créé).

### 3. Améliorer logCollaborationAction

**Signature mise à jour :**

```typescript
private async logCollaborationAction(
  collaborationId: string,
  action: 'invited' | 'accepted' | 'rejected' | 'permission_changed' | 'removed' | 'linked' | 'updated' | 'expired' | 'qr_scanned' | 'permissions_defined' | 'invitation_sent' | 'invitation_viewed',
  performedBy: string | null,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string,
  deviceInfo?: Record<string, unknown>,
  actionMetadata?: Record<string, unknown>,
  profileId?: string
): Promise<void>
```

### 4. Ajouter le tracking invitation_viewed

**À ajouter dans `findInvitationsEnAttente` ou dans un nouveau endpoint de visualisation :**

```typescript
// Lorsqu'un collaborateur consulte ses invitations
await this.logCollaborationAction(
  invitationId,
  'invitation_viewed',
  userId,
  undefined,
  undefined,
  ipAddress,
  userAgent,
  deviceInfo,
  { viewed_at: new Date().toISOString() },
  profileId
);
```

## Tests

1. **Tester l'enrichissement des métadonnées QR :**
   - Scanner un QR code
   - Vérifier que toutes les métadonnées sont enregistrées dans `qr_scan_data`

2. **Tester l'endpoint d'audit :**
   - GET /collaborations/:id/audit-trail
   - Vérifier les permissions (seul le propriétaire peut accéder)
   - Vérifier que la timeline est complète

3. **Tester le logging enrichi :**
   - Effectuer différentes actions (scan QR, acceptation, rejet)
   - Vérifier que `device_info`, `action_metadata`, et `profile_id` sont enregistrés

4. **Tester la compatibilité rétroactive :**
   - Vérifier que les anciennes collaborations fonctionnent toujours
   - Vérifier que les nouvelles métadonnées sont compatibles avec les anciennes

## Migration

**À exécuter :**

```bash
# Appliquer la migration
psql -d votre_database -f backend/database/migrations/086_enrich_collaboration_history_audit.sql
```

## Statut

- ✅ Migration créée
- ✅ Endpoint GET /collaborations/:id/audit-trail créé dans le controller
- ⚠️ Méthode getAuditTrail à ajouter au service
- ⚠️ Enrichissement de qr_scan_data à compléter
- ⚠️ Amélioration de logCollaborationAction à compléter
- ⚠️ Tracking invitation_viewed à implémenter
