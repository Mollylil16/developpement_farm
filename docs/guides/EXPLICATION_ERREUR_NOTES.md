# 🔍 Explication : Erreur "near 'notes': syntax error"

## ❌ Qu'est-ce que cette erreur ?

C'est une **erreur de syntaxe SQL** qui se produit quand la structure d'une table SQLite est mal formée.

## 🔍 Pourquoi cette erreur apparaît ?

Dans SQLite, il y a deux types de contraintes `CHECK` :

### 1. **CHECK au niveau de la colonne** (✅ Valide)
```sql
CREATE TABLE exemple (
  id TEXT PRIMARY KEY,
  age INTEGER CHECK (age >= 0),  -- ✅ CHECK directement après la colonne
  nom TEXT
);
```

### 2. **CHECK au niveau de la table** (✅ Valide)
```sql
CREATE TABLE exemple (
  id TEXT PRIMARY KEY,
  age INTEGER,
  nom TEXT,
  CHECK (age >= 0)  -- ✅ CHECK APRÈS toutes les colonnes
);
```

## ❌ Le problème dans notre cas

La table `vaccinations` avait une contrainte `CHECK` **mal placée** :

### ❌ Schéma INVALIDE (avant correction)
```sql
CREATE TABLE vaccinations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  -- ... autres colonnes ...
  notes TEXT,
  CHECK (date_rappel IS NULL OR date_rappel >= date_vaccination),  -- ❌ ERREUR ICI
  date_creation TEXT,  -- ❌ Colonnes après le CHECK !
  raison_autre TEXT,
  FOREIGN KEY (...)
);
```

**Problème :** La contrainte `CHECK` était placée **entre les colonnes** (juste après `notes`), alors qu'il y avait encore des colonnes après (`date_creation`, `raison_autre`, etc.).

SQLite s'attend à ce que :
- Soit le `CHECK` soit après **toutes** les colonnes
- Soit le `CHECK` soit directement après une colonne (mais alors c'est une contrainte de colonne, pas de table)

Quand SQLite voit `CHECK (...)` suivi d'autres colonnes, il ne comprend pas et génère l'erreur : **"near 'notes': syntax error"**

### ✅ Schéma VALIDE (après correction)
```sql
CREATE TABLE vaccinations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  -- ... toutes les colonnes ...
  notes TEXT,
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  raison_autre TEXT,
  CHECK (date_rappel IS NULL OR date_rappel >= date_vaccination),  -- ✅ CHECK APRÈS toutes les colonnes
  FOREIGN KEY (projet_id) REFERENCES projets(id)
);
```

**Solution :** La contrainte `CHECK` est maintenant placée **après toutes les colonnes**, juste avant les `FOREIGN KEY`.

## 📋 Ordre correct dans SQLite

L'ordre correct pour créer une table SQLite est :

```sql
CREATE TABLE nom_table (
  -- 1. Colonnes avec leurs contraintes de colonne
  colonne1 TYPE1 CONSTRAINT_COLONNE,
  colonne2 TYPE2 CHECK (condition_colonne),
  
  -- 2. Contraintes au niveau de la table (après TOUTES les colonnes)
  CHECK (condition_table),
  UNIQUE (colonne1, colonne2),
  
  -- 3. Clés étrangères (après les contraintes de table)
  FOREIGN KEY (colonne1) REFERENCES autre_table(id)
);
```

## 🔧 Comment on a corrigé le problème ?

1. **Migration 026** : Recrée la table avec le bon schéma
2. **Suppression préventive** : Supprime la table avant de la recréer si elle existe avec un schéma invalide
3. **Schéma corrigé** : La contrainte `CHECK` est maintenant au bon endroit

## 💡 Pourquoi l'erreur mentionne "notes" ?

SQLite indique où il a détecté l'erreur. Comme la contrainte `CHECK` était placée juste après la colonne `notes`, SQLite signale l'erreur "near 'notes'" pour indiquer l'emplacement approximatif du problème.

---

**En résumé :** C'est une erreur de syntaxe SQL causée par une contrainte `CHECK` mal placée dans la définition de la table. La solution est de placer toutes les contraintes au niveau de la table **après toutes les définitions de colonnes**.

