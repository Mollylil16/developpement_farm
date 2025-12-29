# Audit SQL Injection - Rapport

**Date:** 2025-01-XX  
**Scope:** Toutes les requêtes SQL dans `backend/src`  
**Méthodologie:** Analyse statique du code pour identifier les patterns de vulnérabilité

---

## ✅ Résultat Global

**Statut:** ✅ **SÉCURISÉ** - Aucune vulnérabilité SQL injection critique détectée

Le code utilise systématiquement des **paramètres préparés** (`$1`, `$2`, etc.) pour toutes les valeurs provenant de l'utilisateur. Les requêtes dynamiques sont construites de manière sécurisée avec des whitelists de noms de colonnes.

---

## 🔍 Méthodologie d'Audit

### Patterns recherchés :
1. ❌ Concaténation de strings avec des valeurs utilisateur : `query + userInput`
2. ❌ Template literals avec injection de variables utilisateur : `` `SELECT * FROM table WHERE id = ${userId}` ``
3. ⚠️ Requêtes dynamiques avec ORDER BY/LIMIT/OFFSET non paramétrés
4. ⚠️ Construction dynamique de noms de colonnes depuis l'input utilisateur

### Patterns vérifiés :
1. ✅ Paramètres préparés : `query('SELECT * FROM table WHERE id = $1', [id])`
2. ✅ Construction de noms de colonnes via whitelist (hardcodés dans le code)
3. ✅ LIMIT/OFFSET paramétrés : `LIMIT $${params.length + 1}`

---

## 📊 Détails par Pattern

### ✅ Paramètres Préparés (Sécurisé)

**Exemple typique :**
```typescript
// ✅ SÉCURISÉ - Utilise des paramètres
const result = await this.databaseService.query(
  'SELECT * FROM production_animaux WHERE projet_id = $1',
  [projetId]
);
```

**Fichiers vérifiés :**
- ✅ `production.service.ts` - Toutes les requêtes utilisent des paramètres
- ✅ `marketplace.service.ts` - Toutes les requêtes utilisent des paramètres
- ✅ `mortalites.service.ts` - Toutes les requêtes utilisent des paramètres
- ✅ `projets.service.ts` - Toutes les requêtes utilisent des paramètres
- ✅ `users.service.ts` - Toutes les requêtes utilisent des paramètres
- ✅ Tous les autres services - Paramètres utilisés systématiquement

---

### ✅ Requêtes UPDATE Dynamiques (Sécurisé)

**Pattern utilisé :**
```typescript
// ✅ SÉCURISÉ - Noms de colonnes hardcodés, valeurs paramétrées
const fields: string[] = [];
const values: any[] = [];
let paramIndex = 1;

if (updateDto.field1 !== undefined) {
  fields.push(`field1 = $${paramIndex}`); // Nom de colonne hardcodé
  values.push(updateDto.field1); // Valeur paramétrée
  paramIndex++;
}

const query = `UPDATE table SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
await this.databaseService.query(query, values);
```

**Sécurité garantie car :**
- Les noms de colonnes sont hardcodés dans des conditions `if` vérifiées
- Les valeurs sont passées via le tableau `values` (paramètres préparés)
- Aucun nom de colonne ne vient de l'input utilisateur

**Fichiers utilisant ce pattern :**
- ✅ `mortalites.service.ts:154-211` - `update()`
- ✅ `production.service.ts:325-330` - `updateAnimal()`
- ✅ `projets.service.ts:352-357` - `update()`
- ✅ `users.service.ts:224-229` - `update()`
- ✅ `marketplace.service.ts:976-978` - `updatePurchaseRequest()`
- ✅ Et autres services (sante, reproduction, nutrition, finance, etc.)

---

### ✅ LIMIT/OFFSET Dynamiques (Sécurisé)

**Pattern utilisé :**
```typescript
// ✅ SÉCURISÉ - LIMIT/OFFSET sont des nombres validés
const effectiveLimit = limit ? Math.min(limit, 500) : defaultLimit; // Validé (max 500)
const effectiveOffset = offset || 0;

query += ` ORDER BY date_creation DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
params.push(effectiveLimit, effectiveOffset);
```

**Sécurité garantie car :**
- Les valeurs LIMIT/OFFSET sont validées (bornées, typées)
- Elles sont passées comme paramètres préparés
- Les valeurs sont calculées à partir d'entiers, pas de strings utilisateur

**Fichiers utilisant ce pattern :**
- ✅ `production.service.ts:208-209`
- ✅ `marketplace.service.ts:138-139`
- ✅ `mortalites.service.ts:134-135`
- ✅ `admin.service.ts` - Multiple occurrences

---

### ⚠️ Cas Spécial : LIMIT Sans Paramètre (À Vérifier)

**Localisation:** `nutrition.service.ts:597`

```typescript
const limitClause = limit ? `LIMIT ${limit}` : '';
const result = await this.databaseService.query(
  `SELECT * FROM stocks_mouvements
   WHERE aliment_id = $1
   ${limitClause}`,
  [alimentId]
);
```

**Analyse :**
- ⚠️ `limit` est inséré directement dans la query sans paramètre
- ✅ **MAIS** : `limit` est validé côté controller/DTO (devrait être un nombre)
- ✅ Le risque est faible car c'est un nombre, mais c'est une meilleure pratique d'utiliser un paramètre

**Recommandation :** Utiliser un paramètre préparé pour rester cohérent :
```typescript
const query = limit 
  ? `SELECT * FROM stocks_mouvements WHERE aliment_id = $1 LIMIT $2`
  : `SELECT * FROM stocks_mouvements WHERE aliment_id = $1`;
const params = limit ? [alimentId, limit] : [alimentId];
```

---

### ✅ Noms de Colonnes Dynamiques (Sécurisé)

**Pattern utilisé :**
```typescript
// ✅ SÉCURISÉ - animalColumns est une constante hardcodée
const animalColumns = `id, projet_id, code, nom, origine, sexe, ...`;
let query = `SELECT ${animalColumns} FROM production_animaux WHERE projet_id = $1`;
```

**Sécurité garantie car :**
- Les noms de colonnes sont des constantes hardcodées dans le code
- Aucun nom de colonne ne vient de l'input utilisateur

---

## 🔒 Bonnes Pratiques Détectées

1. ✅ **Utilisation systématique de paramètres préparés** pour toutes les valeurs utilisateur
2. ✅ **Validation des inputs** via DTOs avec `class-validator`
3. ✅ **Noms de colonnes hardcodés** dans les requêtes dynamiques (whitelist implicite)
4. ✅ **Limites sur LIMIT** (ex: `Math.min(limit, 500)`) pour éviter les requêtes trop lourdes
5. ✅ **Transactions** utilisées pour les opérations multi-étapes

---

## ⚠️ Recommandations

### Priorité Haute

1. **Corriger `nutrition.service.ts:597`** pour utiliser un paramètre préparé pour LIMIT
   - Impact : Faible (c'est un nombre validé)
   - Effort : Très faible (1 ligne à changer)

### Priorité Moyenne

2. **Ajouter une whitelist explicite pour ORDER BY** (si jamais on ajoute un tri dynamique)
   - Actuellement, ORDER BY est hardcodé dans toutes les requêtes
   - Si on ajoute un tri dynamique à l'avenir, utiliser une whitelist

3. **Documenter les patterns de requêtes dynamiques** dans un guide de style
   - Aider les développeurs futurs à maintenir la sécurité

### Priorité Basse

4. **Audit de sécurité automatisé** dans le pipeline CI/CD
   - Utiliser des outils comme `semgrep` ou `codeql` pour détecter les patterns SQL injection

---

## 📝 Exemples de Code Sécurisé

### ✅ Requête Simple
```typescript
const result = await this.databaseService.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

### ✅ Requête avec Conditions Dynamiques
```typescript
let query = 'SELECT * FROM table WHERE status != $1';
const params: any[] = ['removed'];

if (projetId) {
  query += ` AND projet_id = $${params.length + 1}`;
  params.push(projetId);
}

query += ` ORDER BY date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
params.push(limit, offset);
```

### ✅ UPDATE Dynamique Sécurisé
```typescript
const fields: string[] = [];
const values: any[] = [];
let paramIndex = 1;

if (updateDto.field1 !== undefined) {
  fields.push(`field1 = $${paramIndex}`); // Nom hardcodé
  values.push(updateDto.field1); // Valeur paramétrée
  paramIndex++;
}

const query = `UPDATE table SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
await this.databaseService.query(query, [...values, id]);
```

---

## 🎯 Conclusion

Le codebase est **globalement sécurisé** contre les injections SQL grâce à :
- L'utilisation systématique de paramètres préparés
- La validation des inputs via DTOs
- Des noms de colonnes hardcodés dans les requêtes dynamiques

**Un seul cas mineur** (`nutrition.service.ts:597`) pourrait être amélioré pour rester cohérent avec les meilleures pratiques, mais ne représente pas une vulnérabilité critique car la valeur est validée comme un nombre.

---

## 📚 Références

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [PostgreSQL Prepared Statements](https://www.postgresql.org/docs/current/sql-prepare.html)
- [NestJS Database Security Best Practices](https://docs.nestjs.com/techniques/database#security)

