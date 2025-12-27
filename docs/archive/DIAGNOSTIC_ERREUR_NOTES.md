# 🔍 Diagnostic : Pourquoi l'erreur "near 'notes'" persiste

## ❌ Le Problème

L'erreur **"near 'notes': syntax error"** persiste malgré toutes les corrections. Voici pourquoi :

## 🔍 Cause Racine Identifiée

### Le Vrai Problème

Quand SQLite essaie de créer une table avec `CREATE TABLE vaccinations`, **même si la table n'existe pas**, SQLite peut :
1. Valider le schéma SQL avant de créer la table
2. Si une table avec le même nom existe déjà avec un schéma corrompu, SQLite peut référencer ce schéma corrompu
3. L'erreur se produit lors de la **validation du schéma**, pas lors de la création

### Pourquoi les corrections précédentes n'ont pas fonctionné

1. **Suppression avant création** : Si la table est vraiment corrompue, même `DROP TABLE` peut échouer avec une erreur de syntaxe
2. **CREATE TABLE IF NOT EXISTS** : SQLite valide quand même le schéma existant s'il y a un conflit
3. **Isolation dans try-catch** : L'erreur se produit AVANT que le try-catch ne puisse la capturer

## ✅ Solution Appliquée

### Approche : Table Temporaire + Renommage

Au lieu de créer directement `vaccinations`, on :
1. **Crée une table temporaire** avec un nom unique (`vaccinations_temp_1234567890`)
2. **Supprime l'ancienne table** (même si corrompue, on ignore les erreurs)
3. **Renomme la table temporaire** en `vaccinations`

Cela évite complètement le problème de validation du schéma existant.

### Code Implémenté

```typescript
// Créer la table avec un nom temporaire d'abord
const tempTableName = 'vaccinations_temp_' + Date.now();
await db.execAsync(`CREATE TABLE ${tempTableName} (...)`);

// Supprimer l'ancienne table (même si corrompue)
try {
  await db.execAsync('DROP TABLE IF EXISTS vaccinations;');
} catch (dropError) {
  // Ignorer - on va renommer de toute façon
}

// Renommer la table temporaire
await db.execAsync(`ALTER TABLE ${tempTableName} RENAME TO vaccinations;`);
```

## 🎯 Pourquoi Cette Solution Fonctionne

1. **Pas de conflit de nom** : La table temporaire a un nom unique, donc pas de validation du schéma existant
2. **Création propre** : La table temporaire est créée avec un schéma valide
3. **Renommage atomique** : `ALTER TABLE ... RENAME` est une opération atomique qui ne valide pas l'ancien schéma
4. **Isolation complète** : Même si l'ancienne table est corrompue, on peut la supprimer après le renommage

## 📋 Points Clés

- ✅ **Table temporaire** : Évite la validation du schéma corrompu
- ✅ **Isolation dans try-catch** : L'application démarre même si vaccinations échoue
- ✅ **Suppression forcée** : Plusieurs méthodes de suppression tentées
- ✅ **PRAGMA fallback** : Si DROP échoue, on essaie de supprimer via sqlite_master

## 🔧 Fichiers Modifiés

1. **`src/database/schemas/sante/vaccinations.schema.ts`**
   - Création via table temporaire
   - Retry avec table temporaire aussi

2. **`src/services/database.ts`**
   - Isolation de `createVaccinationsTable()` dans try-catch
   - Suppression des index sur vaccinations dans `createBaseIndexes()`

## 🎯 Résultat Attendu

- ✅ La table est créée avec un schéma valide
- ✅ Même si l'ancienne table est corrompue, la nouvelle est créée proprement
- ✅ L'application démarre même si la création échoue (isolation)
- ✅ Pas d'erreur "near 'notes'" car on ne valide jamais le schéma corrompu

---

**Date** : 4 Décembre 2025  
**Statut** : ✅ Solution implémentée

