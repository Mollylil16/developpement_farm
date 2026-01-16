# 🔔 Système de Notifications et Gestion des Statuts - Documentation Complète

## 📋 Vue d'ensemble

Ce document décrit les améliorations apportées au système de collaborations :
1. **Clarification des statuts** : Remplacement de 'inactif' par 'rejete' et ajout de 'suspendu'
2. **Système de notifications** : Module complet pour notifier les utilisateurs des actions importantes

---

## 🔧 Modifications Apportées

### 1. ✅ Clarification du Statut 'inactif' → 'rejete'

**Fichier modifié** : `backend/src/collaborations/collaborations.service.ts`

**Changements** :
- `rejeterInvitation()` utilise maintenant `statut = 'rejete'` au lieu de `statut = 'inactif'`
- Ajout du paramètre `rejection_reason` (optionnel) pour stocker la raison du rejet
- Mise à jour du DTO `UpdateCollaborateurDto` pour inclure `rejection_reason` et `suspension_reason`

**Nouveaux statuts disponibles** :
- `actif` : Collaborateur actif
- `en_attente` : Invitation en attente
- `rejete` : Invitation rejetée (remplace 'inactif')
- `expire` : Invitation expirée
- `suspendu` : Collaborateur suspendu

### 2. ✅ Migration SQL

**Fichier** : `backend/database/migrations/078_update_collaborations_statuts_and_add_notifications.sql`

**Modifications** :
1. **Statuts collaborations** :
   - Suppression de l'ancienne contrainte CHECK
   - Modification du type de colonne `statut` en VARCHAR(20)
   - Mise à jour des valeurs existantes (`inactif` → `rejete`)
   - Ajout de la nouvelle contrainte CHECK avec tous les statuts
   - Ajout des colonnes `rejection_reason` et `suspension_reason`

2. **Table notifications** :
   - Création de la table `notifications` générale
   - Index pour optimiser les requêtes

### 3. ✅ Module Notifications

**Fichiers créés** :
- `backend/src/notifications/notifications.service.ts`
- `backend/src/notifications/notifications.controller.ts`
- `backend/src/notifications/notifications.module.ts`

**Fonctionnalités** :
- Création de notifications
- Marquage comme lue/non lue
- Récupération des notifications (avec filtres)
- Comptage des notifications non lues
- Suppression de notifications

### 4. ✅ Intégration dans Collaborations

**Notifications envoyées** :
- `create()` → Notification au collaborateur invité (si `user_id` fourni)
- `accepterInvitation()` → Notification au propriétaire du projet
- `rejeterInvitation()` → Notification au propriétaire du projet

---

## 📄 Fichiers Créés/Modifiés

### Fichiers Créés

1. **`backend/database/migrations/078_update_collaborations_statuts_and_add_notifications.sql`**
   - Migration complète pour les statuts et notifications

2. **`backend/src/notifications/notifications.service.ts`**
   - Service complet pour gérer les notifications

3. **`backend/src/notifications/notifications.controller.ts`**
   - Controller avec toutes les routes API

4. **`backend/src/notifications/notifications.module.ts`**
   - Module NestJS (décoré @Global() pour être accessible partout)

### Fichiers Modifiés

1. **`backend/src/collaborations/collaborations.service.ts`**
   - Import de `NotificationsService`
   - Modification de `rejeterInvitation()` pour utiliser 'rejete'
   - Ajout de notifications dans `create()`, `accepterInvitation()`, `rejeterInvitation()`
   - Mise à jour de `mapRowToCollaborateur()` pour inclure `rejection_reason` et `suspension_reason`

2. **`backend/src/collaborations/collaborations.controller.ts`**
   - Ajout du paramètre `rejection_reason` dans `rejeterInvitation()`

3. **`backend/src/collaborations/dto/update-collaborateur.dto.ts`**
   - Mise à jour de l'enum `statut` pour inclure 'rejete' et 'suspendu'
   - Ajout de `rejection_reason` et `suspension_reason`

4. **`backend/src/collaborations/collaborations.module.ts`**
   - Import de `NotificationsModule`

5. **`backend/src/app.module.ts`**
   - Ajout de `NotificationsModule` dans les imports

---

## 🔌 API Endpoints

### Notifications

#### GET /notifications
Récupère les notifications de l'utilisateur connecté.

**Query Parameters** :
- `unread_only` (optionnel) : `true` pour récupérer uniquement les non lues
- `limit` (optionnel) : Nombre maximum de notifications (défaut: 50)

**Exemple** :
```bash
GET /notifications?unread_only=true&limit=20
```

**Réponse** :
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user_123",
    "type": "invitation_received",
    "title": "Nouvelle invitation",
    "message": "Vous avez été invité à rejoindre Mon Projet en tant que gestionnaire",
    "data": {
      "projet_id": "projet_123",
      "collaboration_id": "collaborateur_123",
      "projet_nom": "Mon Projet",
      "role": "gestionnaire"
    },
    "read": false,
    "created_at": "2025-01-15T10:30:00.000Z"
  }
]
```

#### GET /notifications/unread-count
Récupère le nombre de notifications non lues.

**Réponse** :
```json
{
  "count": 5
}
```

#### PATCH /notifications/:id/read
Marque une notification comme lue.

**Réponse** : 204 No Content

#### PATCH /notifications/read-all
Marque toutes les notifications comme lues.

**Réponse** :
```json
{
  "count": 5,
  "message": "5 notification(s) marquée(s) comme lue(s)"
}
```

#### DELETE /notifications/:id
Supprime une notification.

**Réponse** : 204 No Content

### Collaborations (Modifié)

#### PATCH /collaborations/:id/rejeter
Rejeter une invitation (modifié pour accepter `rejection_reason`).

**Query Parameters** :
- `rejection_reason` (optionnel) : Raison du rejet

**Exemple** :
```bash
PATCH /collaborations/collaborateur_123/rejeter?rejection_reason=Je%20ne%20suis%20plus%20disponible
```

---

## 📊 Types de Notifications

| Type | Description | Déclencheur |
|------|-------------|-------------|
| `invitation_received` | Invitation reçue | `create()` (si user_id fourni) |
| `invitation_accepted` | Invitation acceptée | `accepterInvitation()` |
| `invitation_rejected` | Invitation rejetée | `rejeterInvitation()` |
| `invitation_expired` | Invitation expirée | `cleanupExpiredInvitations()` (à implémenter) |
| `collaboration_removed` | Collaboration supprimée | `delete()` (à implémenter) |
| `permission_changed` | Permissions modifiées | `update()` (à implémenter) |

---

## 🔍 Structure de la Table `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Index** :
- `idx_notifications_user` : Sur `(user_id, created_at DESC)`
- `idx_notifications_read` : Sur `(user_id, read)`
- `idx_notifications_type` : Sur `type`
- `idx_notifications_created_at` : Sur `created_at DESC`

---

## 🔍 Structure de la Table `collaborations` (Modifiée)

**Nouvelles colonnes** :
- `rejection_reason TEXT` : Raison du rejet (optionnel)
- `suspension_reason TEXT` : Raison de la suspension (optionnel)

**Statuts mis à jour** :
- `actif`
- `en_attente`
- `rejete` (remplace 'inactif')
- `expire`
- `suspendu` (nouveau)

---

## 💡 Exemples d'Utilisation

### Créer une Invitation avec Notification

```typescript
// Dans collaborations.service.ts
const collaboration = await this.create(createDto, userId);

// Si user_id est fourni, une notification est automatiquement envoyée
// au collaborateur invité
```

### Rejeter une Invitation avec Raison

```typescript
// Dans collaborations.controller.ts
await this.collaborationsService.rejeterInvitation(
  id,
  userId,
  'Je ne suis plus disponible pour ce projet',
  ipAddress,
  userAgent
);

// Une notification est automatiquement envoyée au propriétaire
```

### Récupérer les Notifications Non Lues

```typescript
// Dans le frontend
const notifications = await fetch('/notifications?unread_only=true', {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## 🚀 Prochaines Étapes (Optionnel)

1. **Notifications push** : Intégrer Firebase Cloud Messaging ou OneSignal
2. **Notifications email** : Envoyer des emails pour les notifications importantes
3. **Notifications en temps réel** : Utiliser WebSockets ou Server-Sent Events
4. **Préférences de notifications** : Permettre aux utilisateurs de configurer leurs préférences
5. **Notifications groupées** : Grouper les notifications similaires

---

## ✅ Checklist de Vérification

- [x] Migration SQL créée et exécutée
- [x] Statut 'inactif' remplacé par 'rejete'
- [x] Colonnes `rejection_reason` et `suspension_reason` ajoutées
- [x] Module Notifications créé
- [x] Service Notifications implémenté
- [x] Controller Notifications avec toutes les routes
- [x] Notifications intégrées dans `create()`
- [x] Notifications intégrées dans `accepterInvitation()`
- [x] Notifications intégrées dans `rejeterInvitation()`
- [x] DTO mis à jour
- [x] Modules NestJS configurés
- [x] Tests de linting passés

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
