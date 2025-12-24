# Audit des Transactions - Rapport

**Date:** 2025-01-XX  
**Scope:** Toutes les opérations multi-étapes dans `backend/src`  
**Objectif:** Identifier les opérations nécessitant des transactions pour garantir la cohérence des données

---

## ✅ Résultat Global

**Statut:** ⚠️ **AMÉLIORATION NÉCESSAIRE** - Quelques opérations multi-étapes sans transactions détectées

La plupart des opérations critiques utilisent déjà des transactions. Quelques opérations moins critiques nécessitent encore des transactions pour garantir la cohérence.

---

## ✅ Transactions Déjà Implémentées

### 1. Marketplace Service

#### ✅ `acceptOffer` (ligne 359)
**Opérations:** UPDATE offer + UPDATE listing + INSERT transaction  
**Transaction:** ✅ OUI  
**Impact:** Critique - Garantit que l'offre, le listing et la transaction sont cohérents

#### ✅ `createListing` (ligne 32)
**Opérations:** INSERT listing + UPDATE animal (marketplace_status)  
**Transaction:** ✅ OUI  
**Impact:** Important - Garantit la cohérence entre listing et statut animal

#### ✅ `createPurchaseRequestOffer` (ligne 1004)
**Opérations:** INSERT offer + UPDATE compteur (offers_count)  
**Transaction:** ✅ OUI  
**Impact:** Important - Garantit que le compteur est synchronisé

---

### 2. Mortalites Service

#### ✅ `create` (ligne 58)
**Opérations:** UPDATE animal (statut = 'mort') + INSERT mortalite  
**Transaction:** ✅ OUI  
**Impact:** Critique - Garantit que le statut animal et la mortalité sont cohérents

---

## ⚠️ Transactions Manquantes (À Implémenter)

### 🔴 Priorité Haute

#### 1. `projets.service.ts:create` (ligne 72)

**Opérations:**
1. UPDATE projets SET statut = 'archive' (archiver tous les autres projets actifs)
2. INSERT nouveau projet

**Problème:**
- Si l'INSERT échoue après l'UPDATE, l'utilisateur peut perdre son projet actif
- Si l'UPDATE échoue après l'INSERT, l'utilisateur peut avoir plusieurs projets actifs

**Solution:**
```typescript
async create(createProjetDto: CreateProjetDto, userId: string) {
  await this.checkProjetOwnership(...); // Validation avant transaction
  
  return await this.databaseService.transaction(async (client) => {
    // 1. Archiver tous les autres projets actifs
    await client.query(
      `UPDATE projets SET statut = 'archive', derniere_modification = $1 
       WHERE proprietaire_id = $2 AND statut = 'actif'`,
      [now, userId]
    );
    
    // 2. Créer le nouveau projet
    const result = await client.query(`INSERT INTO projets ...`);
    
    return this.mapRowToProjet(result.rows[0]);
  });
}
```

**Impact:** 🔴 Critique - Intégrité des données (un seul projet actif par utilisateur)

---

#### 2. `projets.service.ts:switchActive` (si existe)

**Opérations:**
1. UPDATE projets SET statut = 'archive' (archiver tous les projets actifs)
2. UPDATE projet SET statut = 'actif' (activer le projet sélectionné)

**Impact:** 🔴 Critique - Même problème que `create`

---

### 🟡 Priorité Moyenne

#### 3. `nutrition.service.ts:deleteRation` (ligne 323)

**Opérations:**
1. DELETE FROM ingredients_ration WHERE ration_id = $1
2. DELETE FROM rations WHERE id = $1

**Problème:**
- Si le 2ème DELETE échoue, les relations ingredients_ration sont supprimées mais la ration existe encore (orphaned)
- Note: CASCADE devrait gérer cela, mais c'est une bonne pratique d'utiliser une transaction

**Solution:**
```typescript
async deleteRation(id: string, userId: string) {
  const existing = await this.findOneRation(id, userId);
  if (!existing) {
    throw new NotFoundException('Ration introuvable');
  }

  return await this.databaseService.transaction(async (client) => {
    // Supprimer les relations d'abord (pour clarté, même si CASCADE le ferait)
    await client.query('DELETE FROM ingredients_ration WHERE ration_id = $1', [id]);
    await client.query('DELETE FROM rations WHERE id = $1', [id]);
    return { id };
  });
}
```

**Impact:** 🟡 Moyen - Cohérence des données (CASCADE devrait gérer, mais transaction recommandée)

---

### 🟢 Priorité Basse

#### 4. `marketplace.service.ts:findOneListing` (ligne 153)

**Opérations:**
1. SELECT listing
2. UPDATE marketplace_listings SET views = views + 1

**Problème:**
- Le compteur de vues peut être perdu si l'UPDATE échoue
- Pas critique car c'est juste un compteur statistique

**Recommandation:**
- Option 1: Utiliser une transaction (surcharge minime pour compteur)
- Option 2: Laisser tel quel (acceptable pour compteur non-critique)
- Option 3: Utiliser un compteur asynchrone/background job (meilleure performance)

**Impact:** 🟢 Faible - Statistiques seulement, pas critique pour la cohérence

---

## 📊 Analyse par Pattern

### Pattern 1: UPDATE + INSERT (Changement d'État)
**Exemples:**
- `projets.create`: UPDATE archive + INSERT nouveau
- `projets.switchActive`: UPDATE archive + UPDATE active

**Risque:** 🔴 Critique - Changement d'état doit être atomique

**Recommandation:** ✅ Toujours utiliser une transaction

---

### Pattern 2: INSERT + UPDATE (Création avec Mise à Jour)
**Exemples:**
- `marketplace.createListing`: INSERT listing + UPDATE animal
- `mortalites.create`: INSERT mortalite + UPDATE animal

**Risque:** 🔴 Critique - Les deux doivent réussir ensemble

**Recommandation:** ✅ Toujours utiliser une transaction (✅ déjà fait)

---

### Pattern 3: INSERT + UPDATE Counter (Création avec Compteur)
**Exemples:**
- `marketplace.createPurchaseRequestOffer`: INSERT offer + UPDATE offers_count

**Risque:** 🟡 Moyen - Compteur peut être désynchronisé

**Recommandation:** ✅ Utiliser une transaction (✅ déjà fait)

---

### Pattern 4: DELETE Multiple (Suppression en Cascade)
**Exemples:**
- `nutrition.deleteRation`: DELETE ingredients_ration + DELETE rations

**Risque:** 🟡 Moyen - CASCADE devrait gérer, mais transaction recommandée

**Recommandation:** ✅ Utiliser une transaction pour sécurité

---

### Pattern 5: SELECT + UPDATE Counter (Lecture avec Incrément)
**Exemples:**
- `marketplace.findOneListing`: SELECT + UPDATE views

**Risque:** 🟢 Faible - Compteur statistique non-critique

**Recommandation:** ⚠️ Optionnel - Transaction acceptable mais pas critique

---

## 🔍 Opérations Analysées (Non-Critiques)

### Opérations Simples (Pas de Transaction Nécessaire)
- ✅ `create` avec une seule opération INSERT
- ✅ `update` avec une seule opération UPDATE
- ✅ `delete` avec une seule opération DELETE
- ✅ `find` avec une seule opération SELECT

### Opérations avec Validation Préalable (Acceptable)
- ✅ Opérations qui font une validation avant (checkOwnership, checkExistence)
- ✅ Si la validation échoue, pas de transaction nécessaire (pas de modification DB)

---

## 📋 Checklist d'Implémentation

### Priorité 1 (Critique)
- [ ] `projets.service.ts:create` - Transaction UPDATE + INSERT
- [ ] `projets.service.ts:switchActive` (si existe) - Transaction UPDATE + UPDATE

### Priorité 2 (Moyenne)
- [ ] `nutrition.service.ts:deleteRation` - Transaction DELETE + DELETE

### Priorité 3 (Optionnelle)
- [ ] `marketplace.service.ts:findOneListing` - Transaction SELECT + UPDATE (compteur views)

---

## 🔧 Bonnes Pratiques Identifiées

1. ✅ **Validation avant transaction** - Toutes les transactions validées d'abord (checkOwnership, etc.)
2. ✅ **Gestion d'erreur** - Try/catch dans les transactions pour colonnes optionnelles
3. ✅ **Utilisation cohérente** - Pattern `databaseService.transaction(async (client) => {...})`

---

## 📝 Recommandations Générales

### Quand Utiliser une Transaction

✅ **TOUJOURS utiliser une transaction pour :**
- Opérations qui modifient plusieurs tables liées
- Changements d'état (ex: archiver un projet et en activer un autre)
- Opérations avec compteurs/agrégats (ex: offers_count)
- Suppressions multiples (même si CASCADE existe)

⚠️ **CONSIDÉRER une transaction pour :**
- Compteurs statistiques (views, etc.) - Optionnel selon criticité
- Opérations de mise à jour complexes avec validations multiples

❌ **PAS nécessaire pour :**
- Opérations simples (un seul INSERT/UPDATE/DELETE)
- Validations préalables (SELECT avant INSERT/UPDATE)

---

## 🎯 Impact Estimé

| Opération | Priorité | Impact | Risque Actuel | Effort |
|-----------|----------|--------|---------------|--------|
| projets.create | 🔴 Haute | Critique | Perte de projet actif si échec | Faible |
| projets.switchActive | 🔴 Haute | Critique | Plusieurs projets actifs | Faible |
| nutrition.deleteRation | 🟡 Moyenne | Moyen | Données orphelines (rare avec CASCADE) | Faible |
| marketplace.findOneListing | 🟢 Basse | Faible | Compteur désynchronisé (non-critique) | Faible |

---

## 📚 Références

- [NestJS Transactions Documentation](https://docs.nestjs.com/techniques/database#transactions)
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [ACID Properties](https://en.wikipedia.org/wiki/ACID)

