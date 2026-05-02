# 📊 Statistiques des Collaborations - Documentation

## 📋 Vue d'ensemble

Le module collaborations propose deux endpoints de statistiques pour analyser les collaborations d'un projet et l'activité d'un collaborateur spécifique.

---

## 🔌 API Endpoints

### 1. GET /collaborations/statistics

Récupère les statistiques globales des collaborations d'un projet.

**Query Parameters** :
- `projet_id` (requis) : ID du projet

**Accès** : Uniquement par le propriétaire du projet

**Réponse** :
```json
{
  "total_collaborateurs": 15,
  "actifs": 10,
  "en_attente": 3,
  "rejetes": 1,
  "expires": 1,
  "par_role": {
    "veterinaire": 2,
    "gestionnaire": 5,
    "ouvrier": 2,
    "observateur": 1,
    "proprietaire": 0
  },
  "derniere_invitation": "2025-01-15T10:30:00.000Z",
  "derniere_acceptation": "2025-01-14T15:20:00.000Z"
}
```

**Exemple d'utilisation** :
```bash
GET /collaborations/statistics?projet_id=projet_123
Authorization: Bearer <token>
```

---

### 2. GET /collaborations/:id/activity

Récupère l'activité d'un collaborateur spécifique.

**Path Parameters** :
- `id` : ID de la collaboration

**Accès** : 
- Propriétaire du projet
- Collaborateur concerné (lui-même)

**Réponse** :
```json
{
  "derniere_connexion": "2025-01-15T09:00:00.000Z",
  "nombre_actions": 5,
  "actions_recentes": [
    {
      "action": "accepted",
      "date": "2025-01-15T10:30:00.000Z",
      "details": {
        "old_value": {
          "statut": "en_attente",
          "user_id": null
        },
        "new_value": {
          "statut": "actif",
          "user_id": "user_123",
          "date_acceptation": "2025-01-15T10:30:00.000Z"
        },
        "performed_by": {
          "id": "user_123",
          "email": "jean.dupont@example.com",
          "nom": "Dupont",
          "prenom": "Jean"
        }
      }
    },
    {
      "action": "invited",
      "date": "2025-01-14T15:20:00.000Z",
      "details": {
        "old_value": null,
        "new_value": {
          "projet_id": "projet_123",
          "nom": "Dupont",
          "prenom": "Jean",
          "email": "jean.dupont@example.com",
          "role": "gestionnaire",
          "statut": "en_attente"
        },
        "performed_by": {
          "id": "user_456",
          "email": "proprietaire@example.com",
          "nom": "Martin",
          "prenom": "Pierre"
        }
      }
    }
  ]
}
```

**Exemple d'utilisation** :
```bash
GET /collaborations/collaborateur_123/activity
Authorization: Bearer <token>
```

---

## 📊 Détails des Statistiques

### getProjetStatistics()

**Méthode** : `async getProjetStatistics(projetId: string, userId: string)`

**Retourne** :
- `total_collaborateurs` : Nombre total de collaborateurs (tous statuts confondus)
- `actifs` : Nombre de collaborateurs actifs
- `en_attente` : Nombre d'invitations en attente
- `rejetes` : Nombre d'invitations rejetées
- `expires` : Nombre d'invitations expirées
- `par_role` : Répartition par rôle (uniquement les actifs)
  - `veterinaire`
  - `gestionnaire`
  - `ouvrier`
  - `observateur`
  - `proprietaire`
- `derniere_invitation` : Date de la dernière invitation envoyée (ou `null`)
- `derniere_acceptation` : Date de la dernière acceptation d'invitation (ou `null`)

**Sécurité** :
- Vérifie que l'utilisateur est propriétaire du projet via `checkProjetOwnership()`

---

### getCollaborateurActivity()

**Méthode** : `async getCollaborateurActivity(collaborationId: string, userId: string)`

**Retourne** :
- `derniere_connexion` : Date de la dernière connexion de l'utilisateur (depuis `auth_logs`) ou `null`
- `nombre_actions` : Nombre total d'actions enregistrées dans l'historique
- `actions_recentes` : Les 10 dernières actions avec :
  - `action` : Type d'action (`invited`, `accepted`, `rejected`, etc.)
  - `date` : Date de l'action
  - `details` : Détails de l'action
    - `old_value` : Valeurs avant modification (ou `null`)
    - `new_value` : Valeurs après modification (ou `null`)
    - `performed_by` : Utilisateur qui a effectué l'action (ou `null` pour actions système)

**Sécurité** :
- Vérifie que la collaboration existe
- Vérifie que l'utilisateur est soit le propriétaire du projet, soit le collaborateur concerné
- Lance `ForbiddenException` si l'accès est refusé

**Note** : La récupération de la dernière connexion utilise la table `auth_logs`. Si cette table n'existe pas ou n'est pas accessible, `derniere_connexion` sera `null` (sans erreur).

---

## 💡 Exemples d'Utilisation

### Dashboard Propriétaire

```typescript
// Récupérer les statistiques du projet
const stats = await apiClient.get('/collaborations/statistics', {
  params: { projet_id: projetActif.id }
});

console.log(`Total: ${stats.total_collaborateurs}`);
console.log(`Actifs: ${stats.actifs}`);
console.log(`En attente: ${stats.en_attente}`);
console.log(`Vétérinaires: ${stats.par_role.veterinaire}`);
```

### Suivi d'Activité Collaborateur

```typescript
// Récupérer l'activité d'un collaborateur
const activity = await apiClient.get(`/collaborations/${collaborationId}/activity`);

console.log(`Dernière connexion: ${activity.derniere_connexion}`);
console.log(`Nombre d'actions: ${activity.nombre_actions}`);
console.log(`Dernière action: ${activity.actions_recentes[0]?.action}`);
```

---

## 🔍 Code Complet

### Service (`collaborations.service.ts`)

```typescript
/**
 * Récupère les statistiques d'un projet concernant les collaborations
 */
async getProjetStatistics(projetId: string, userId: string) {
  await this.checkProjetOwnership(projetId, userId);

  // Statistiques par statut
  const statutResult = await this.databaseService.query(
    `SELECT 
      COUNT(*) as total_collaborateurs,
      COUNT(*) FILTER (WHERE statut = 'actif') as actifs,
      COUNT(*) FILTER (WHERE statut = 'en_attente') as en_attente,
      COUNT(*) FILTER (WHERE statut = 'rejete') as rejetes,
      COUNT(*) FILTER (WHERE statut = 'expire') as expires
     FROM collaborations
     WHERE projet_id = $1`,
    [projetId]
  );

  const stats = statutResult.rows[0];
  const total_collaborateurs = parseInt(stats.total_collaborateurs || '0', 10);
  const actifs = parseInt(stats.actifs || '0', 10);
  const en_attente = parseInt(stats.en_attente || '0', 10);
  const rejetes = parseInt(stats.rejetes || '0', 10);
  const expires = parseInt(stats.expires || '0', 10);

  // Statistiques par rôle
  const roleResult = await this.databaseService.query(
    `SELECT 
      role,
      COUNT(*) as count
     FROM collaborations
     WHERE projet_id = $1 AND statut = 'actif'
     GROUP BY role`,
    [projetId]
  );

  const par_role = {
    veterinaire: 0,
    gestionnaire: 0,
    ouvrier: 0,
    observateur: 0,
    proprietaire: 0,
  };

  roleResult.rows.forEach((row) => {
    if (par_role.hasOwnProperty(row.role)) {
      par_role[row.role] = parseInt(row.count, 10);
    }
  });

  // Dernière invitation
  const derniereInvitationResult = await this.databaseService.query(
    `SELECT MAX(date_invitation) as derniere_invitation
     FROM collaborations
     WHERE projet_id = $1`,
    [projetId]
  );
  const derniere_invitation = derniereInvitationResult.rows[0]?.derniere_invitation || null;

  // Dernière acceptation
  const derniereAcceptationResult = await this.databaseService.query(
    `SELECT MAX(date_acceptation) as derniere_acceptation
     FROM collaborations
     WHERE projet_id = $1 AND date_acceptation IS NOT NULL`,
    [projetId]
  );
  const derniere_acceptation = derniereAcceptationResult.rows[0]?.derniere_acceptation || null;

  return {
    total_collaborateurs,
    actifs,
    en_attente,
    rejetes,
    expires,
    par_role,
    derniere_invitation,
    derniere_acceptation,
  };
}

/**
 * Récupère l'activité d'un collaborateur spécifique
 */
async getCollaborateurActivity(collaborationId: string, userId: string) {
  // Vérifier que la collaboration existe et que l'utilisateur a accès
  const collaboration = await this.findOne(collaborationId, userId);
  if (!collaboration) {
    throw new NotFoundException('Collaboration introuvable');
  }

  // Vérifier que l'utilisateur est soit le propriétaire, soit le collaborateur concerné
  const projetResult = await this.databaseService.query(
    'SELECT proprietaire_id FROM projets WHERE id = $1',
    [collaboration.projet_id]
  );
  const proprietaireId = projetResult.rows[0]?.proprietaire_id;

  if (proprietaireId !== userId && collaboration.user_id !== userId) {
    throw new ForbiddenException('Vous n\'avez pas accès à cette activité');
  }

  // Récupérer la dernière connexion depuis auth_logs (si disponible)
  let derniere_connexion: Date | null = null;
  if (collaboration.user_id) {
    try {
      const connexionResult = await this.databaseService.query(
        `SELECT MAX(timestamp) as derniere_connexion
         FROM auth_logs
         WHERE user_id = $1 AND success = TRUE`,
        [collaboration.user_id]
      );
      derniere_connexion = connexionResult.rows[0]?.derniere_connexion || null;
    } catch (error) {
      // Si la table auth_logs n'existe pas ou n'est pas accessible, ignorer
      console.warn('[CollaborationsService] Impossible de récupérer la dernière connexion:', error);
    }
  }

  // Récupérer le nombre total d'actions depuis collaboration_history
  const nombreActionsResult = await this.databaseService.query(
    `SELECT COUNT(*) as total
     FROM collaboration_history
     WHERE collaboration_id = $1`,
    [collaborationId]
  );
  const nombre_actions = parseInt(nombreActionsResult.rows[0]?.total || '0', 10);

  // Récupérer les 10 dernières actions
  const actionsResult = await this.databaseService.query(
    `SELECT 
      h.action,
      h.created_at as date,
      h.old_value,
      h.new_value,
      h.performed_by,
      u.email as performed_by_email,
      u.nom as performed_by_nom,
      u.prenom as performed_by_prenom
    FROM collaboration_history h
    LEFT JOIN users u ON h.performed_by = u.id
    WHERE h.collaboration_id = $1
    ORDER BY h.created_at DESC
    LIMIT 10`,
    [collaborationId]
  );

  const actions_recentes = actionsResult.rows.map((row) => ({
    action: row.action,
    date: row.date,
    details: {
      old_value: row.old_value ? (typeof row.old_value === 'string' ? JSON.parse(row.old_value) : row.old_value) : null,
      new_value: row.new_value ? (typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value) : null,
      performed_by: row.performed_by
        ? {
            id: row.performed_by,
            email: row.performed_by_email,
            nom: row.performed_by_nom,
            prenom: row.performed_by_prenom,
          }
        : null,
    },
  }));

  return {
    derniere_connexion,
    nombre_actions,
    actions_recentes,
  };
}
```

### Controller (`collaborations.controller.ts`)

```typescript
@Get('statistics')
@ApiOperation({ 
  summary: "Récupérer les statistiques des collaborations d'un projet",
  description: 'Retourne des statistiques détaillées sur les collaborateurs d\'un projet (total, par statut, par rôle, etc.)'
})
@ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
@ApiResponse({ status: 200, description: 'Statistiques des collaborations.' })
@ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
async getProjetStatistics(
  @Query('projet_id') projetId: string,
  @CurrentUser('id') userId: string
) {
  return this.collaborationsService.getProjetStatistics(projetId, userId);
}

@Get(':id/activity')
@ApiOperation({ 
  summary: "Récupérer l'activité d'un collaborateur",
  description: 'Retourne la dernière connexion, le nombre d\'actions et les 10 dernières actions d\'un collaborateur.'
})
@ApiResponse({ status: 200, description: 'Activité du collaborateur.' })
@ApiResponse({ status: 404, description: 'Collaboration introuvable.' })
@ApiResponse({ status: 403, description: 'Vous n\'avez pas accès à cette activité.' })
async getCollaborateurActivity(
  @Param('id') id: string,
  @CurrentUser('id') userId: string
) {
  return this.collaborationsService.getCollaborateurActivity(id, userId);
}
```

---

## 🔒 Sécurité

### getProjetStatistics()
- ✅ Vérifie la propriété du projet via `checkProjetOwnership()`
- ✅ Lance `ForbiddenException` si l'utilisateur n'est pas propriétaire

### getCollaborateurActivity()
- ✅ Vérifie que la collaboration existe
- ✅ Vérifie que l'utilisateur est soit le propriétaire, soit le collaborateur concerné
- ✅ Lance `ForbiddenException` si l'accès est refusé

---

## 📝 Notes Techniques

1. **Ordre des routes** : La route `GET /collaborations/statistics` doit être définie **avant** `GET /collaborations/:id` pour éviter les conflits (sinon "statistics" serait interprété comme un ID).

2. **Dernière connexion** : La récupération de la dernière connexion utilise la table `auth_logs`. Si cette table n'existe pas, `derniere_connexion` sera `null` sans erreur.

3. **Actions récentes** : Limitées aux 10 dernières actions pour des raisons de performance.

4. **Parsing JSON** : Les valeurs `old_value` et `new_value` sont parsées depuis JSON si elles sont des chaînes.

---

## ✅ Checklist de Vérification

- [x] Méthode `getProjetStatistics()` créée
- [x] Méthode `getCollaborateurActivity()` créée
- [x] Route `GET /collaborations/statistics` ajoutée
- [x] Route `GET /collaborations/:id/activity` ajoutée
- [x] Documentation Swagger complète
- [x] Vérifications de sécurité implémentées
- [x] Gestion des erreurs (table auth_logs optionnelle)
- [x] Tests de linting passés

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
