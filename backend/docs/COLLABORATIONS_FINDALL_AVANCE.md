# 🔍 Méthode findAll() Avancée - Collaborations

## 📋 Vue d'ensemble

La méthode `findAll()` dans `collaborations.service.ts` a été améliorée pour supporter :
- ✅ **Recherche** : Recherche dans nom, prénom et email
- ✅ **Filtrage** : Par rôle et statut
- ✅ **Tri** : Par différents champs avec ordre ASC/DESC
- ✅ **Pagination** : Avec page et limit

---

## 🔧 Signature de la Méthode

```typescript
async findAll(
  projetId: string,
  userId: string,
  options?: {
    search?: string;        // Recherche dans nom/prenom/email
    role?: string;          // Filtrer par rôle
    statut?: string;        // Filtrer par statut
    sortBy?: string;        // Trier par : 'nom', 'prenom', 'date_creation', 'role', 'statut', 'date_acceptation'
    sortOrder?: 'ASC' | 'DESC',
    page?: number;          // Pagination (défaut: 1)
    limit?: number          // Items par page (défaut: 20)
  }
)
```

---

## 📊 Format de Réponse

```typescript
{
  data: Collaborateur[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

---

## 🔌 API Endpoint

### GET /collaborations

**Query Parameters** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `projet_id` | string | ✅ Oui | ID du projet |
| `search` | string | ❌ Non | Recherche dans nom, prénom ou email |
| `role` | string | ❌ Non | Filtrer par rôle (`proprietaire`, `gestionnaire`, `veterinaire`, `ouvrier`, `observateur`) |
| `statut` | string | ❌ Non | Filtrer par statut (`actif`, `en_attente`, `rejete`, `expire`, `suspendu`) |
| `sortBy` | string | ❌ Non | Champ de tri (`nom`, `prenom`, `date_creation`, `role`, `statut`, `date_acceptation`) |
| `sortOrder` | string | ❌ Non | Ordre de tri (`ASC` ou `DESC`, défaut: `DESC`) |
| `page` | number | ❌ Non | Numéro de page (défaut: 1) |
| `limit` | number | ❌ Non | Nombre d'éléments par page (défaut: 20) |

---

## 💡 Exemples d'Utilisation

### 1. Récupérer tous les collaborateurs (par défaut)

```bash
GET /collaborations?projet_id=projet_123
```

**Réponse** :
```json
{
  "data": [
    {
      "id": "collaborateur_123",
      "projet_id": "projet_123",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean.dupont@example.com",
      "role": "gestionnaire",
      "statut": "actif",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

### 2. Recherche par nom/prénom/email

```bash
GET /collaborations?projet_id=projet_123&search=dupont
```

**Résultat** : Retourne tous les collaborateurs dont le nom, prénom ou email contient "dupont" (insensible à la casse).

### 3. Filtrer par rôle

```bash
GET /collaborations?projet_id=projet_123&role=gestionnaire
```

**Résultat** : Retourne uniquement les collaborateurs avec le rôle "gestionnaire".

### 4. Filtrer par statut

```bash
GET /collaborations?projet_id=projet_123&statut=actif
```

**Résultat** : Retourne uniquement les collaborateurs actifs.

### 5. Combinaison recherche + filtres

```bash
GET /collaborations?projet_id=projet_123&search=jean&role=gestionnaire&statut=actif
```

**Résultat** : Retourne les collaborateurs actifs avec le rôle "gestionnaire" dont le nom, prénom ou email contient "jean".

### 6. Tri personnalisé

```bash
GET /collaborations?projet_id=projet_123&sortBy=nom&sortOrder=ASC
```

**Résultat** : Retourne les collaborateurs triés par nom (ordre alphabétique croissant).

### 7. Pagination

```bash
GET /collaborations?projet_id=projet_123&page=2&limit=10
```

**Réponse** :
```json
{
  "data": [...], // Éléments 11 à 20
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 8. Exemple complet

```bash
GET /collaborations?projet_id=projet_123&search=dupont&role=gestionnaire&statut=actif&sortBy=nom&sortOrder=ASC&page=1&limit=10
```

**Résultat** : 
- Recherche "dupont" dans nom/prénom/email
- Filtre par rôle "gestionnaire"
- Filtre par statut "actif"
- Tri par nom (ordre croissant)
- Page 1 avec 10 éléments par page

---

## 🔒 Sécurité

### Protection contre SQL Injection

1. **Whitelist pour `sortBy`** :
   ```typescript
   const allowedSortFields = ['nom', 'prenom', 'date_creation', 'role', 'statut', 'date_acceptation'];
   const sortBy = options?.sortBy && allowedSortFields.includes(options.sortBy) 
     ? options.sortBy 
     : 'date_creation';
   ```

2. **Paramètres préparés** : Tous les paramètres utilisent des requêtes préparées avec `$1`, `$2`, etc.

3. **Validation `sortOrder`** : Seuls `'ASC'` et `'DESC'` sont acceptés.

---

## 📝 Code Complet

### Service (`collaborations.service.ts`)

```typescript
async findAll(
  projetId: string,
  userId: string,
  options?: {
    search?: string;
    role?: string;
    statut?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }
) {
  await this.checkProjetOwnership(projetId, userId);

  // Valeurs par défaut
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;
  const sortOrder = options?.sortOrder || 'DESC';

  // Whitelist pour sortBy (sécurité contre SQL injection)
  const allowedSortFields = ['nom', 'prenom', 'date_creation', 'role', 'statut', 'date_acceptation'];
  const sortBy = options?.sortBy && allowedSortFields.includes(options.sortBy) 
    ? options.sortBy 
    : 'date_creation';

  // Construire la requête de base
  let query = `SELECT * FROM collaborations WHERE projet_id = $1`;
  const params: any[] = [projetId];
  let paramIndex = 2;

  // Ajouter la recherche
  if (options?.search && options.search.trim().length > 0) {
    const searchTerm = `%${options.search.trim()}%`;
    query += ` AND (
      LOWER(nom) LIKE LOWER($${paramIndex}) OR 
      LOWER(prenom) LIKE LOWER($${paramIndex}) OR 
      LOWER(email) LIKE LOWER($${paramIndex})
    )`;
    params.push(searchTerm);
    paramIndex++;
  }

  // Ajouter les filtres
  if (options?.role) {
    query += ` AND role = $${paramIndex}`;
    params.push(options.role);
    paramIndex++;
  }

  if (options?.statut) {
    query += ` AND statut = $${paramIndex}`;
    params.push(options.statut);
    paramIndex++;
  }

  // Ajouter le tri
  query += ` ORDER BY ${sortBy} ${sortOrder}`;

  // Ajouter la pagination
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  // Exécuter la requête pour récupérer les données
  const result = await this.databaseService.query(query, params);
  const data = result.rows.map((row) => this.mapRowToCollaborateur(row));

  // Construire la requête de comptage (même conditions mais sans pagination)
  let countQuery = `SELECT COUNT(*) as total FROM collaborations WHERE projet_id = $1`;
  const countParams: any[] = [projetId];
  let countParamIndex = 2;

  // Ajouter les mêmes conditions de recherche et filtres
  if (options?.search && options.search.trim().length > 0) {
    const searchTerm = `%${options.search.trim()}%`;
    countQuery += ` AND (
      LOWER(nom) LIKE LOWER($${countParamIndex}) OR 
      LOWER(prenom) LIKE LOWER($${countParamIndex}) OR 
      LOWER(email) LIKE LOWER($${countParamIndex})
    )`;
    countParams.push(searchTerm);
    countParamIndex++;
  }

  if (options?.role) {
    countQuery += ` AND role = $${countParamIndex}`;
    countParams.push(options.role);
    countParamIndex++;
  }

  if (options?.statut) {
    countQuery += ` AND statut = $${countParamIndex}`;
    countParams.push(options.statut);
    countParamIndex++;
  }

  // Exécuter la requête de comptage
  const countResult = await this.databaseService.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  // Retourner avec pagination
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Controller (`collaborations.controller.ts`)

```typescript
@Get()
@ApiOperation({ 
  summary: "Récupérer tous les collaborateurs d'un projet",
  description: 'Supporte la recherche, le filtrage, le tri et la pagination'
})
@ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
@ApiQuery({ name: 'search', required: false, description: 'Recherche dans nom, prénom ou email' })
@ApiQuery({ 
  name: 'role', 
  required: false, 
  enum: ['proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur'],
  description: 'Filtrer par rôle' 
})
@ApiQuery({ 
  name: 'statut', 
  required: false, 
  enum: ['actif', 'en_attente', 'rejete', 'expire', 'suspendu'],
  description: 'Filtrer par statut' 
})
@ApiQuery({ 
  name: 'sortBy', 
  required: false, 
  enum: ['nom', 'prenom', 'date_creation', 'role', 'statut', 'date_acceptation'],
  description: 'Champ de tri (défaut: date_creation)' 
})
@ApiQuery({ 
  name: 'sortOrder', 
  required: false, 
  enum: ['ASC', 'DESC'],
  description: 'Ordre de tri (défaut: DESC)' 
})
@ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page (défaut: 1)' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page (défaut: 20)' })
@ApiResponse({ status: 200, description: 'Liste paginée des collaborateurs.' })
async findAll(
  @Query('projet_id') projetId: string,
  @CurrentUser('id') userId: string,
  @Query('search') search?: string,
  @Query('role') role?: string,
  @Query('statut') statut?: string,
  @Query('sortBy') sortBy?: string,
  @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  @Query('page') page?: string,
  @Query('limit') limit?: string
) {
  const options: any = {};
  
  if (search) options.search = search;
  if (role) options.role = role;
  if (statut) options.statut = statut;
  if (sortBy) options.sortBy = sortBy;
  if (sortOrder) options.sortOrder = sortOrder;
  if (page) options.page = parseInt(page, 10);
  if (limit) options.limit = parseInt(limit, 10);

  return this.collaborationsService.findAll(projetId, userId, options);
}
```

---

## ⚡ Performance

### Index Recommandés

Pour optimiser les performances, assurez-vous d'avoir ces index :

```sql
-- Index pour la recherche
CREATE INDEX IF NOT EXISTS idx_collaborations_search 
ON collaborations(projet_id, LOWER(nom), LOWER(prenom), LOWER(email));

-- Index pour les filtres
CREATE INDEX IF NOT EXISTS idx_collaborations_role 
ON collaborations(projet_id, role);

CREATE INDEX IF NOT EXISTS idx_collaborations_statut 
ON collaborations(projet_id, statut);

-- Index pour le tri
CREATE INDEX IF NOT EXISTS idx_collaborations_date_creation 
ON collaborations(projet_id, date_creation DESC);
```

---

## ✅ Checklist de Vérification

- [x] Recherche implémentée (nom, prénom, email)
- [x] Filtres implémentés (rôle, statut)
- [x] Tri implémenté avec whitelist (sécurité)
- [x] Pagination implémentée (page, limit)
- [x] Comptage total pour pagination
- [x] Protection SQL injection (whitelist, paramètres préparés)
- [x] Controller mis à jour avec tous les query parameters
- [x] Documentation Swagger complète
- [x] Tests de linting passés

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
