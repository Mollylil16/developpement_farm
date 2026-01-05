# Logique des Invitations de Collaboration

## Vue d'ensemble

Le système d'invitations permet aux propriétaires de projets d'inviter d'autres utilisateurs (ou personnes non encore inscrites) à collaborer sur leurs projets de ferme. Le système utilise une combinaison d'**email** et d'**user_id** pour identifier les destinataires.

## Flux complet

### 1. Création d'une invitation

#### Interface utilisateur
- **Composant** : `CollaborationFormModal.tsx`
- **Accès** : Seul le propriétaire du projet peut créer des invitations
- **Champs requis** :
  - Nom
  - Prénom
  - **Email** (identifiant principal du destinataire)
  - Téléphone (optionnel)
  - Rôle (propriétaire, gestionnaire, vétérinaire, ouvrier, observateur)
  - Permissions (basées sur le rôle par défaut)
  - Notes (optionnel)

#### Backend - Création
```typescript
// backend/src/collaborations/collaborations.service.ts
async create(createCollaborateurDto: CreateCollaborateurDto, userId: string) {
  // Vérifier que le créateur est propriétaire du projet
  await this.checkProjetOwnership(createCollaborateurDto.projet_id, userId);
  
  // Créer l'invitation avec:
  // - user_id: Optionnel (null si l'utilisateur n'existe pas encore)
  // - email: Obligatoire (identifiant principal)
  // - statut: 'en_attente' par défaut
}
```

**Points importants** :
- L'`email` est **obligatoire** et sert d'identifiant principal
- Le `user_id` est **optionnel** (peut être `null`) si la personne n'a pas encore de compte
- Le `statut` est défini à `'en_attente'` par défaut
- Les permissions sont basées sur le rôle choisi avec des valeurs par défaut

### 2. Identification du destinataire

Le système identifie les destinataires de deux manières :

#### Méthode 1 : Par User ID (si l'utilisateur existe déjà)
- Si le propriétaire connaît l'`user_id` de la personne, il peut l'inclure lors de la création
- L'invitation sera directement liée à ce compte utilisateur

#### Méthode 2 : Par Email (cas le plus courant)
- Le système utilise l'**email** comme identifiant principal
- Si `user_id` est `null` mais que l'email correspond à un utilisateur existant, le système peut faire le lien plus tard

### 3. Récupération des invitations par le destinataire

#### Endpoint API
```
GET /collaborations/invitations?email={email}
```

#### Logique de recherche
```typescript
// backend/src/collaborations/collaborations.service.ts
async findInvitationsEnAttente(userId?: string, email?: string) {
  // Recherche les invitations où :
  // 1. user_id correspond à l'utilisateur connecté OU
  // 2. email correspond à l'email de l'utilisateur connecté OU
  // 3. email correspond à l'email fourni en paramètre
  
  // Si une invitation est trouvée par email ET qu'on a un userId :
  // -> Le système met automatiquement à jour l'invitation pour lier le user_id
  if (userId && email && result.rows.length > 0) {
    for (const row of result.rows) {
      if (!row.user_id && row.email === email) {
        // Liaison automatique !
        await this.databaseService.query(
          `UPDATE collaborations SET user_id = $1 WHERE id = $2`,
          [userId, row.id]
        );
      }
    }
  }
}
```

**Scénarios d'identification** :

| Cas | user_id lors création | Email existe dans DB | Résultat |
|-----|----------------------|---------------------|----------|
| 1 | Fourni | - | Invitation directement liée |
| 2 | `null` | Oui | Liaison automatique au premier login |
| 3 | `null` | Non | Invitation reste liée uniquement par email |

### 4. Acceptation d'une invitation

#### Vérifications du backend
```typescript
async accepterInvitation(id: string, userId: string) {
  // Vérifie que l'invitation :
  // 1. Existe (id valide)
  // 2. Appartient à l'utilisateur :
  //    - user_id de l'invitation = userId de l'utilisateur connecté OU
  //    - email de l'invitation = email de l'utilisateur connecté
  // 3. Est toujours en statut 'en_attente'
  
  // Si tout est OK :
  // - Change statut → 'actif'
  // - Enregistre date_acceptation
  // - Lie définitivement le user_id si ce n'était pas déjà fait
}
```

**Conditions d'acceptation** :
1. L'invitation doit exister dans la base de données
2. L'invitation doit correspondre à l'utilisateur connecté (par `user_id` OU `email`)
3. L'invitation doit être en statut `'en_attente'`

### 5. Rejet d'une invitation

Même logique que l'acceptation, mais change le statut à `'inactif'` au lieu de `'actif'`.

## Schéma de la table `collaborations`

```sql
CREATE TABLE collaborations (
  id VARCHAR PRIMARY KEY,              -- ID unique de l'invitation
  projet_id VARCHAR NOT NULL,          -- Projet concerné
  user_id VARCHAR NULL,                -- ID utilisateur (peut être NULL)
  nom VARCHAR NOT NULL,                -- Nom du collaborateur
  prenom VARCHAR NOT NULL,             -- Prénom
  email VARCHAR NOT NULL,              -- Email (identifiant principal)
  telephone VARCHAR NULL,              -- Téléphone optionnel
  role VARCHAR NOT NULL,               -- Rôle assigné
  statut VARCHAR NOT NULL,             -- 'en_attente', 'actif', 'inactif'
  -- Permissions...
  date_invitation TIMESTAMP NOT NULL,  -- Date de création
  date_acceptation TIMESTAMP NULL,     -- Date d'acceptation (si acceptée)
  date_creation TIMESTAMP NOT NULL,
  derniere_modification TIMESTAMP NOT NULL
);
```

## Cas d'usage typiques

### Cas 1 : Inviter un utilisateur existant (par email)
1. Propriétaire saisit l'email dans le formulaire
2. Système crée une invitation avec `user_id = null` et `email = "user@example.com"`
3. Utilisateur se connecte avec cet email
4. Système recherche les invitations avec cet email
5. Liaison automatique : `user_id` est mis à jour
6. L'utilisateur voit l'invitation dans `InvitationsModal`
7. L'utilisateur accepte → statut passe à `'actif'`

### Cas 2 : Inviter quelqu'un qui n'a pas encore de compte
1. Propriétaire saisit nom, prénom, email
2. Système crée une invitation avec `user_id = null`
3. La personne crée un compte plus tard avec cet email
4. Au premier login, le système lie automatiquement l'invitation
5. La personne voit l'invitation et peut l'accepter

### Cas 3 : Invitation déjà acceptée/rejetée
1. Si une invitation a déjà été acceptée (`statut = 'actif'`) ou rejetée (`statut = 'inactif'`)
2. Tentative d'accepter/rejeter → Erreur 404 ou 400
3. Le système vérifie le statut et rejette l'opération
4. Les invitations obsolètes sont automatiquement rechargées

## Sécurité

### Vérifications
- ✅ Seul le propriétaire peut créer des invitations pour son projet
- ✅ Seul le destinataire (par `user_id` OU `email`) peut accepter/rejeter
- ✅ Les invitations sont liées à un projet spécifique
- ✅ Le statut est vérifié avant chaque opération

### Points d'attention
- ⚠️ Le système fait confiance à l'email comme identifiant
- ⚠️ Si quelqu'un crée un compte avec un email utilisé dans une invitation, il reçoit automatiquement l'invitation
- ⚠️ Pas de système de validation d'email (pas d'envoi d'email de vérification)

## Flots de données

```
┌─────────────────┐
│ Propriétaire    │
│ crée invitation │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ CREATE /collaborations      │
│ - email (obligatoire)       │
│ - user_id (optionnel)       │
│ - statut: 'en_attente'      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Invitation créée en DB      │
│ user_id peut être NULL      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Utilisateur se connecte     │
│ GET /collaborations/        │
│    invitations?email=...    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Backend recherche par:      │
│ - user_id OU                │
│ - email                     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Si user_id NULL mais email  │
│ correspond → Liaison auto   │
│ UPDATE collaborations       │
│ SET user_id = ...           │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Invitation visible dans     │
│ InvitationsModal            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Utilisateur accepte/rejette │
│ PATCH /collaborations/      │
│    {id}/accepter ou /rejeter│
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Backend vérifie:            │
│ - Invitation existe         │
│ - user_id OU email match    │
│ - statut = 'en_attente'     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Si OK:                      │
│ - statut → 'actif'/'inactif'│
│ - date_acceptation enregistrée│
│ - user_id lié définitivement│
└─────────────────────────────┘
```

## Points clés

1. **Email = Identifiant principal** : L'email est l'identifiant le plus fiable, car il peut exister même sans compte utilisateur

2. **Liaison automatique** : Si une invitation existe avec un email et que quelqu'un se connecte avec cet email, la liaison est automatique

3. **Double vérification** : Lors de l'acceptation, le backend vérifie à la fois `user_id` ET `email` pour s'assurer que c'est le bon destinataire

4. **Statut important** : Le statut `'en_attente'` doit être maintenu jusqu'à acceptation/rejet, sinon l'opération échoue

5. **Synchronisation** : Le frontend recharge automatiquement les invitations après chaque opération pour éviter les états obsolètes

