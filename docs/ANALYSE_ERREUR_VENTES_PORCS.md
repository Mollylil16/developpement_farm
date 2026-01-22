# 🔍 Analyse Erreur Bad Request - Endpoint `/finance/ventes-porcs`

## 📋 Contexte

**Endpoint :** `POST /finance/ventes-porcs`  
**Erreur :** `Bad Request Exception`  
**Timestamp :** 2026-01-22T18:40:31.300Z  
**User Agent :** okhttp/4.9.2 (Android)

---

## 🔎 Causes Possibles

### 1. **Validation class-validator (ValidationPipe)**

Le `ValidationPipe` de NestJS valide automatiquement le DTO `CreateVentePorcDto` avant d'atteindre le service. Les erreurs peuvent être :

#### Champs obligatoires manquants ou invalides :
- ❌ `projet_id` : manquant, vide, ou n'est pas une string
- ❌ `montant` : manquant, n'est pas un nombre, ou < 0
- ❌ `date` : manquant, vide, ou n'est pas une string

#### Champs conditionnels invalides :
- ❌ `animal_ids` : fourni mais n'est pas un array, ou contient des valeurs non-string, ou contient des strings vides
- ❌ `batch_id` : fourni mais n'est pas une string ou est vide
- ❌ `quantite` : fourni mais n'est pas un nombre ou < 1

#### Exemple d'erreur class-validator :
```json
{
  "statusCode": 400,
  "message": [
    "projet_id must be a string",
    "montant must be a number",
    "montant must not be less than 0"
  ],
  "error": "Bad Request"
}
```

### 2. **Validation métier dans le service**

Après la validation class-validator, le service effectue des validations métier :

#### A. Identification des sujets vendus (ligne 1482-1488)
```typescript
if (!hasAnimalIds && !hasBatchId) {
  throw new BadRequestException(
    'Pour enregistrer une vente, vous devez obligatoirement identifier les porcs vendus : ' +
    'en mode suivi individuel, fournissez les IDs des animaux (animal_ids), ' +
    'ou en mode élevage en bande, fournissez la loge (batch_id) et la quantité (quantite).'
  );
}
```

**Cause :** Ni `animal_ids` ni `batch_id/quantite` ne sont fournis.

#### B. Mode individuel - animal_ids manquant (ligne 1508-1512)
```typescript
if (!hasAnimalIds) {
  throw new BadRequestException(
    'En mode suivi individuel, vous devez fournir les IDs des animaux vendus (animal_ids).'
  );
}
```

**Cause :** Le projet est en mode `individual` mais `animal_ids` n'est pas fourni.

#### C. Animaux introuvables ou inactifs (ligne 1522-1535)
```typescript
if (animauxResult.rows.length !== createVentePorcDto.animal_ids.length) {
  throw new BadRequestException(
    'Certains animaux spécifiés n\'existent pas ou n\'appartiennent pas à ce projet.'
  );
}

const animauxInactifs = animauxResult.rows.filter((a) => a.statut !== 'actif');
if (animauxInactifs.length > 0) {
  throw new BadRequestException(
    `Les animaux suivants ne sont pas actifs et ne peuvent pas être vendus : ${codesInactifs}`
  );
}
```

**Cause :** 
- Les `animal_ids` fournis n'existent pas dans la base de données
- Les animaux n'appartiennent pas au projet
- Les animaux ne sont pas en statut "actif"

#### D. Mode bande - Quantité invalide (ligne 1574-1591)
```typescript
if (createVentePorcDto.quantite > batch.total_count) {
  throw new BadRequestException(
    `La bande ne contient que ${batch.total_count} porc(s), ` +
    `impossible de vendre ${createVentePorcDto.quantite} porc(s).`
  );
}

if (pigsResult.rows.length < createVentePorcDto.quantite) {
  throw new BadRequestException(
    `La bande ne contient que ${pigsResult.rows.length} porc(s) actif(s), ` +
    `impossible de vendre ${createVentePorcDto.quantite} porc(s).`
  );
}
```

**Cause :** La quantité demandée dépasse le nombre de porcs disponibles dans la bande.

---

## 🔧 Améliorations Apportées

### 1. **Logging amélioré dans le contrôleur**

Ajout de logs détaillés pour diagnostiquer les données reçues :

```typescript
console.log('[FinanceController] createVentePorc - Données reçues:', {
  projet_id: createVentePorcDto.projet_id,
  montant: createVentePorcDto.montant,
  date: createVentePorcDto.date,
  has_animal_ids: !!createVentePorcDto.animal_ids,
  animal_ids_count: createVentePorcDto.animal_ids?.length || 0,
  has_batch_id: !!createVentePorcDto.batch_id,
  has_quantite: !!createVentePorcDto.quantite,
  quantite: createVentePorcDto.quantite,
  user_id: user.id,
});
```

### 2. **Logging amélioré dans le service**

Ajout de logs d'erreur détaillés lors des validations métier :

```typescript
console.error('[FinanceService] createVentePorc - Validation échouée:', {
  projet_id: createVentePorcDto.projet_id,
  has_animal_ids: hasAnimalIds,
  animal_ids: createVentePorcDto.animal_ids,
  has_batch_id: !!createVentePorcDto.batch_id,
  batch_id: createVentePorcDto.batch_id,
  has_quantite: !!createVentePorcDto.quantite,
  quantite: createVentePorcDto.quantite,
  user_id: userId,
});
```

---

## 📊 Structure du DTO `CreateVentePorcDto`

### Champs obligatoires :
```typescript
{
  projet_id: string;      // ✅ Requis
  montant: number;         // ✅ Requis, >= 0
  date: string;            // ✅ Requis (ISO string)
}
```

### Champs optionnels :
```typescript
{
  description?: string;
  commentaire?: string;
  photos?: string[];
  poids_kg?: number;      // >= 0 si fourni
}
```

### Identification des sujets (un des deux modes requis) :

#### Mode 1 : Suivi individuel
```typescript
{
  animal_ids?: string[];   // ✅ Requis si batch_id non fourni
  // Chaque élément doit être une string non vide
}
```

#### Mode 2 : Élevage en bande
```typescript
{
  batch_id?: string;       // ✅ Requis si animal_ids non fourni
  quantite?: number;       // ✅ Requis si batch_id fourni, >= 1
}
```

---

## 🎯 Prochaines Étapes pour Diagnostic

1. **Vérifier les logs Render** pour voir les nouveaux logs détaillés
2. **Vérifier le payload envoyé** depuis l'application mobile
3. **Vérifier le mode de gestion du projet** (`management_method` dans la table `projets`)
4. **Vérifier l'état des animaux/bandes** dans la base de données

---

## 📝 Exemples de Requêtes Valides

### Mode individuel :
```json
{
  "projet_id": "uuid-du-projet",
  "montant": 50000,
  "date": "2026-01-22T18:40:31.300Z",
  "animal_ids": ["animal-id-1", "animal-id-2"],
  "poids_kg": 120
}
```

### Mode bande :
```json
{
  "projet_id": "uuid-du-projet",
  "montant": 50000,
  "date": "2026-01-22T18:40:31.300Z",
  "batch_id": "batch-id-1",
  "quantite": 5,
  "poids_kg": 600
}
```

---

## ✅ Checklist de Validation

- [ ] `projet_id` est fourni et est une string non vide
- [ ] `montant` est fourni, est un nombre, et >= 0
- [ ] `date` est fourni et est une string non vide
- [ ] **OU** `animal_ids` est fourni (array de strings non vides)
- [ ] **OU** `batch_id` et `quantite` sont fournis (batch_id string, quantite >= 1)
- [ ] Les animaux existent et sont actifs (si mode individuel)
- [ ] La quantité ne dépasse pas le nombre de porcs disponibles (si mode bande)
