# Tests - Audit Trail et Métadonnées QR

## Objectif
Valider que toutes les fonctionnalités d'audit et de métadonnées enrichies fonctionnent correctement.

## Prérequis

1. **Migration appliquée** :
   ```bash
   # La migration 086_enrich_collaboration_history_audit.sql doit être appliquée
   # Elle est appliquée automatiquement au démarrage du backend
   # Vérifier dans les logs : "Migration 086_enrich_collaboration_history_audit.sql applied successfully"
   ```

2. **Base de données à jour** :
   - Table `collaboration_history` avec les colonnes `device_info`, `action_metadata`, `profile_id`
   - Table `collaborations` avec la colonne `profile_id`

3. **Utilisateurs de test** :
   - Un producteur avec un projet
   - Un vétérinaire avec un profil valide
   - Un technicien avec un profil valide

## Tests à effectuer

### 1. Test de la migration

**Vérifier que la migration a été appliquée :**

```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'collaboration_history' 
  AND column_name IN ('device_info', 'action_metadata', 'profile_id');

-- Résultat attendu : 3 lignes (device_info, action_metadata, profile_id)
```

**Vérifier l'index :**

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'collaboration_history' 
  AND indexname = 'idx_collab_history_profile_id';

-- Résultat attendu : 1 ligne
```

### 2. Test de l'enrichissement des métadonnées QR

**Scénario :** Un producteur scanne le QR code d'un vétérinaire

**Étapes :**
1. Le producteur génère un QR code pour son projet (ou utilise un QR existant)
2. Le vétérinaire génère son QR code de profil
3. Le producteur scanne le QR code du vétérinaire
4. Le producteur configure les permissions et envoie l'invitation

**Vérifications :**

```sql
-- Vérifier que qr_scan_data contient toutes les métadonnées enrichies
SELECT 
  id,
  qr_scan_data,
  profile_id,
  statut,
  expiration_date
FROM collaborations
WHERE invitation_type = 'qr_scan'
ORDER BY date_creation DESC
LIMIT 1;
```

**Résultat attendu :**
- `statut` = `'en_attente'`
- `profile_id` n'est pas NULL
- `expiration_date` = date_invitation + 7 jours
- `qr_scan_data` contient :
  - `scanned_at`
  - `scanner_user_id`
  - `scanner_profile_id`
  - `scanner_ip`
  - `scanner_user_agent`
  - `scanner_device_info` (avec platform, os_version, app_version si disponible)
  - `scanned_profile_id`
  - `scanned_user_id`
  - `scanned_profile_type`
  - `qr_code_version` = `'v2_profileId'`
  - `permissions_defined_at`
  - `invitation_sent_at`

### 3. Test du logging enrichi

**Vérifier que les actions sont loggées avec les métadonnées enrichies :**

```sql
-- Vérifier les logs pour une invitation QR
SELECT 
  ch.id,
  ch.action,
  ch.performed_by,
  ch.profile_id,
  ch.device_info,
  ch.action_metadata,
  ch.ip_address,
  ch.user_agent,
  ch.created_at
FROM collaboration_history ch
JOIN collaborations c ON ch.collaboration_id = c.id
WHERE c.invitation_type = 'qr_scan'
ORDER BY ch.created_at ASC;
```

**Résultat attendu :**
- 3 actions loggées pour chaque invitation QR :
  1. `qr_scanned` - avec device_info et action_metadata
  2. `permissions_defined` - avec action_metadata contenant les permissions
  3. `invitation_sent` - avec action_metadata contenant invitation_sent_at

**Vérifications spécifiques :**
- `device_info` contient `platform`, `os_version`, `app_version` (si disponible)
- `action_metadata` contient les métadonnées spécifiques à chaque action
- `profile_id` est rempli pour le producteur qui a scanné

### 4. Test du tracking invitation_viewed

**Scénario :** Le vétérinaire consulte ses invitations en attente

**Étapes :**
1. Le vétérinaire appelle `GET /collaborations/invitations`
2. Une action `invitation_viewed` doit être loggée pour chaque invitation trouvée

**Vérifications :**

```sql
-- Vérifier que invitation_viewed est loggée
SELECT 
  ch.id,
  ch.action,
  ch.performed_by,
  ch.profile_id,
  ch.device_info,
  ch.action_metadata,
  ch.created_at
FROM collaboration_history ch
WHERE ch.action = 'invitation_viewed'
ORDER BY ch.created_at DESC
LIMIT 5;
```

**Résultat attendu :**
- Une entrée `invitation_viewed` pour chaque invitation consultée
- `performed_by` = user_id du vétérinaire
- `profile_id` = profile_id du vétérinaire (ex: `profile_user123_veterinarian`)
- `device_info` contient les informations du device du vétérinaire
- `action_metadata` contient `viewed_at` et `invitation_count`

### 5. Test de l'endpoint d'audit trail

**Scénario :** Le producteur consulte l'audit trail d'une collaboration QR

**Requête :**
```http
GET /collaborations/:id/audit-trail
Authorization: Bearer <token_producteur>
```

**Réponse attendue :**
```json
{
  "collaboration_id": "collaborateur_xxx",
  "invitation_type": "qr_scan",
  "timeline": [
    {
      "action": "qr_scanned",
      "timestamp": "2025-01-XX...",
      "actor": {
        "user_id": "user_xxx",
        "profile_id": "profile_xxx_producer",
        "nom": "Producteur",
        "prenom": "Nom"
      },
      "metadata": {
        "qr_code_version": "v2_profileId",
        "scanned_profile_id": "profile_xxx_veterinarian",
        "scanned_user_id": "user_xxx",
        "scanned_profile_type": "veterinarian",
        "scanner_ip": "...",
        "scanner_user_agent": "...",
        "scanner_device_info": {
          "platform": "android",
          "os_version": "13",
          "app_version": "1.0.0"
        }
      }
    },
    {
      "action": "permissions_defined",
      "timestamp": "2025-01-XX...",
      "actor": { ... },
      "metadata": {
        "permissions_defined_at": "2025-01-XX..."
      }
    },
    {
      "action": "invitation_sent",
      "timestamp": "2025-01-XX...",
      "actor": { ... },
      "metadata": {}
    },
    {
      "action": "invitation_viewed",
      "timestamp": "2025-01-XX...",
      "actor": {
        "user_id": "user_xxx",
        "profile_id": "profile_xxx_veterinarian",
        "nom": "Vétérinaire",
        "prenom": "Nom"
      },
      "metadata": {
        "device_info": { ... },
        "ip_address": "...",
        "user_agent": "...",
        "viewed_at": "2025-01-XX...",
        "invitation_count": 1
      }
    }
  ]
}
```

**Vérifications :**
- ✅ Le producteur peut accéder à l'audit trail de ses collaborations
- ✅ Un autre utilisateur (non propriétaire) reçoit une erreur 403
- ✅ La timeline est complète et dans l'ordre chronologique
- ✅ Toutes les métadonnées sont présentes

### 6. Test de compatibilité rétroactive

**Scénario :** Vérifier que le système fonctionne même si la migration n'est pas encore appliquée

**Étapes :**
1. Si les colonnes n'existent pas encore, le système doit utiliser l'ancien format
2. Vérifier dans les logs : "Colonnes d'audit enrichies non disponibles, utilisation de l'ancien format"

**Vérification :**
- Le logging fonctionne avec ou sans les nouvelles colonnes
- Aucune erreur n'est générée si les colonnes n'existent pas

### 7. Test d'acceptation d'invitation

**Scénario :** Le vétérinaire accepte l'invitation

**Étapes :**
1. Le vétérinaire appelle `PATCH /collaborations/:id/accepter`
2. Une action `accepted` doit être loggée avec les métadonnées enrichies

**Vérifications :**

```sql
-- Vérifier le log d'acceptation
SELECT 
  ch.id,
  ch.action,
  ch.performed_by,
  ch.profile_id,
  ch.device_info,
  ch.action_metadata,
  ch.new_value
FROM collaboration_history ch
WHERE ch.action = 'accepted'
  AND ch.collaboration_id = '<collaboration_id>'
ORDER BY ch.created_at DESC
LIMIT 1;
```

**Résultat attendu :**
- `action` = `'accepted'`
- `performed_by` = user_id du vétérinaire
- `profile_id` = profile_id du vétérinaire
- `device_info` contient les informations du device
- `new_value.statut` = `'actif'`
- `new_value.date_acceptation` est rempli

### 8. Test de rejet d'invitation

**Scénario :** Le vétérinaire rejette l'invitation

**Étapes :**
1. Le vétérinaire appelle `PATCH /collaborations/:id/rejeter` avec une raison
2. Une action `rejected` doit être loggée avec les métadonnées enrichies

**Vérifications :**
- `action` = `'rejected'`
- `new_value.statut` = `'rejete'`
- `new_value.rejection_reason` = raison fournie
- `action_metadata` ou `new_value` contient la raison

## Tests d'intégration

### Test complet du workflow QR

1. **Producteur scanne QR vétérinaire** → Invitation créée avec statut `en_attente`
2. **Vérification dans la base de données** → Toutes les métadonnées sont présentes
3. **Vétérinaire consulte ses invitations** → Action `invitation_viewed` loggée
4. **Producteur consulte l'audit trail** → Timeline complète visible
5. **Vétérinaire accepte** → Action `accepted` loggée avec métadonnées
6. **Producteur consulte l'audit trail final** → Timeline complète avec acceptation

## Commandes utiles

### Vérifier l'état de la migration

```sql
SELECT * FROM schema_migrations 
WHERE migration_name = '086_enrich_collaboration_history_audit.sql';
```

### Vérifier les colonnes de collaboration_history

```sql
\d collaboration_history
```

### Vérifier les dernières actions loggées

```sql
SELECT 
  ch.action,
  ch.created_at,
  ch.profile_id,
  c.invitation_type,
  u.nom || ' ' || u.prenom as utilisateur
FROM collaboration_history ch
LEFT JOIN collaborations c ON ch.collaboration_id = c.id
LEFT JOIN users u ON ch.performed_by = u.id
ORDER BY ch.created_at DESC
LIMIT 20;
```

### Statistiques des métadonnées enrichies

```sql
SELECT 
  COUNT(*) as total_actions,
  COUNT(device_info) as actions_with_device_info,
  COUNT(action_metadata) as actions_with_metadata,
  COUNT(profile_id) as actions_with_profile_id
FROM collaboration_history
WHERE created_at > NOW() - INTERVAL '7 days';
```

## Problèmes courants et solutions

### 1. Colonnes manquantes
**Symptôme :** Erreur "column does not exist"
**Solution :** Appliquer la migration 086 manuellement

### 2. Métadonnées manquantes
**Symptôme :** `qr_scan_data` ne contient pas tous les champs
**Solution :** Vérifier que le code backend est à jour (version enrichie de `createFromQRScan`)

### 3. device_info non rempli
**Symptôme :** `scanner_device_info` est NULL
**Solution :** Vérifier que `user-agent` est envoyé dans la requête HTTP

### 4. profile_id non rempli
**Symptôme :** `profile_id` est NULL dans `collaboration_history`
**Solution :** Vérifier que `activeRole` est correctement passé au controller

## Checklist de validation

- [ ] Migration 086 appliquée avec succès
- [ ] Colonnes `device_info`, `action_metadata`, `profile_id` existent
- [ ] Index `idx_collab_history_profile_id` créé
- [ ] `qr_scan_data` contient toutes les métadonnées enrichies
- [ ] Actions `qr_scanned`, `permissions_defined`, `invitation_sent` loggées
- [ ] Action `invitation_viewed` loggée lors de la consultation
- [ ] Endpoint `/collaborations/:id/audit-trail` fonctionne
- [ ] Timeline complète retournée par l'endpoint d'audit
- [ ] Permissions correctes (seul le propriétaire peut accéder)
- [ ] Compatibilité rétroactive testée (sans les nouvelles colonnes)
- [ ] Métadonnées d'acceptation/rejet enrichies
