# 🔗 Foreign Keys et Relations Normalisées

Guide sur les contraintes de clés étrangères et la normalisation des relations.

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Stratégies ON DELETE](#stratégies-on-delete)
3. [Relations par domaine](#relations-par-domaine)
4. [Migration des foreign keys](#migration-des-foreign-keys)
5. [Bonnes pratiques](#bonnes-pratiques)

---

## Introduction

### Pourquoi des Foreign Keys strictes ?

Les foreign keys garantissent :
- ✅ Intégrité référentielle
- ✅ Prévention des orphelins (orphans)
- ✅ Cohérence des données
- ✅ Suppression en cascade automatique

### Problème actuel

Beaucoup de tables ont `projet_id` et autres références sans contraintes FK strictes :
- ❌ Risque d'orphelins si un projet est supprimé
- ❌ Pas de cascade automatique
- ❌ Données incohérentes possibles

---

## Stratégies ON DELETE

### ON DELETE CASCADE

Supprime automatiquement les enregistrements enfants quand le parent est supprimé.

**Utilisation :** Données dépendantes qui n'ont pas de sens sans le parent.

**Exemples :**
- `production_animaux` → `production_pesees` (si l'animal est supprimé, ses pesées aussi)
- `projets` → `production_animaux` (si le projet est supprimé, tous les animaux aussi)
- `gestations` → `sevrages` (si la gestation est supprimée, les sevrages aussi)

### ON DELETE SET NULL

Met à NULL les références quand le parent est supprimé.

**Utilisation :** Données qui peuvent exister indépendamment mais perdent leur référence.

**Exemples :**
- `production_animaux` → `pere_id`, `mere_id` (si le parent est supprimé, mettre NULL)
- `revenus` → `animal_id` (si l'animal est supprimé, garder le revenu mais sans référence)

### ON DELETE RESTRICT (défaut)

Empêche la suppression si des enregistrements enfants existent.

**Utilisation :** Données critiques qui ne doivent jamais être supprimées si référencées.

**Exemples :**
- `projets` → `users` (ne pas supprimer un utilisateur s'il a des projets)

---

## Relations par domaine

### Production

#### Animaux
```sql
-- production_animaux
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (pere_id) REFERENCES production_animaux(id) ON DELETE SET NULL
FOREIGN KEY (mere_id) REFERENCES production_animaux(id) ON DELETE SET NULL

-- production_pesees
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE CASCADE

-- gestations
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (truie_id) REFERENCES production_animaux(id) ON DELETE CASCADE
FOREIGN KEY (verrat_id) REFERENCES production_animaux(id) ON DELETE SET NULL

-- sevrages
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (gestation_id) REFERENCES gestations(id) ON DELETE CASCADE

-- planifications
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (lien_gestation_id) REFERENCES gestations(id) ON DELETE SET NULL
FOREIGN KEY (lien_sevrage_id) REFERENCES sevrages(id) ON DELETE SET NULL

-- mortalites
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
```

### Finance

#### Revenus et Dépenses
```sql
-- revenus
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL

-- depenses_ponctuelles
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE

-- charges_fixes
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
```

### Santé

#### Vaccinations et Traitements
```sql
-- vaccinations
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (calendrier_id) REFERENCES calendrier_vaccinations(id) ON DELETE SET NULL
FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL

-- traitements
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (maladie_id) REFERENCES maladies(id) ON DELETE SET NULL
FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL

-- maladies
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL

-- visites_veterinaires
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE

-- calendrier_vaccinations
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE

-- rappels_vaccination
FOREIGN KEY (vaccination_id) REFERENCES vaccinations(id) ON DELETE CASCADE
```

### Nutrition

#### Rations et Stocks
```sql
-- rations
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE

-- ingredients_ration
FOREIGN KEY (ration_id) REFERENCES rations(id) ON DELETE CASCADE
FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT

-- stocks_aliments
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE

-- stocks_mouvements
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (aliment_id) REFERENCES stocks_aliments(id) ON DELETE CASCADE
```

### Collaboration

```sql
-- collaborations
FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
```

---

## Migration des foreign keys

### Ajouter ON DELETE à une table existante

SQLite ne supporte pas `ALTER TABLE ADD CONSTRAINT`. Il faut recréer la table :

```typescript
export async function addForeignKeyCascade(db: SQLiteDatabase): Promise<void> {
  // Renommer l'ancienne table
  await db.execAsync('ALTER TABLE production_pesees RENAME TO production_pesees_old;');
  
  // Créer la nouvelle table avec ON DELETE CASCADE
  await db.execAsync(`
    CREATE TABLE production_pesees (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      animal_id TEXT NOT NULL,
      -- ... autres colonnes
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE CASCADE
    );
  `);
  
  // Copier les données
  await db.execAsync(`
    INSERT INTO production_pesees SELECT * FROM production_pesees_old;
  `);
  
  // Supprimer l'ancienne table
  await db.execAsync('DROP TABLE production_pesees_old;');
}
```

---

## Bonnes pratiques

### ✅ À faire

1. **Toujours définir ON DELETE**
   - CASCADE pour les données dépendantes
   - SET NULL pour les références optionnelles
   - RESTRICT pour les données critiques

2. **Documenter les relations**
   - Commenter les foreign keys dans les schémas
   - Documenter les cascades dans ce guide

3. **Tester les cascades**
   - Vérifier que la suppression d'un projet supprime bien tous ses enfants
   - Vérifier que SET NULL fonctionne correctement

### ❌ À éviter

1. **Ne pas laisser de foreign keys sans ON DELETE**
   - SQLite utilise RESTRICT par défaut, ce qui peut bloquer des suppressions

2. **Ne pas utiliser CASCADE partout**
   - Certaines données doivent être préservées (ex: revenus même si l'animal est supprimé)

3. **Ne pas créer de cycles de dépendances**
   - Éviter A → B → C → A

---

## Exemples complets

### Exemple 1 : Table avec CASCADE

```sql
CREATE TABLE production_pesees (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  animal_id TEXT NOT NULL,
  date TEXT NOT NULL,
  poids_kg REAL NOT NULL CHECK (poids_kg > 0),
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE CASCADE
);
```

### Exemple 2 : Table avec SET NULL

```sql
CREATE TABLE revenus (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  animal_id TEXT,
  montant REAL NOT NULL CHECK (montant >= 0),
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL
);
```

### Exemple 3 : Table avec RESTRICT

```sql
CREATE TABLE ingredients_ration (
  id TEXT PRIMARY KEY,
  ration_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  quantite REAL NOT NULL CHECK (quantite > 0),
  FOREIGN KEY (ration_id) REFERENCES rations(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
);
```

---

## Références

- [SQLite Foreign Keys](https://www.sqlite.org/foreignkeys.html)
- [Schémas existants](../../src/database/schemas/)
- [Guide migrations](DATABASE_MIGRATIONS.md)
- [Guide validation](DATABASE_VALIDATION.md)

---

**Dernière mise à jour:** 21 Novembre 2025

