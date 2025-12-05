# ✅ Validation au Niveau Base de Données

Guide sur les validations CHECK constraints SQLite pour garantir l'intégrité des données.

## 📋 Table des matières

1. [Introduction](#introduction)
2. [CHECK Constraints existantes](#check-constraints-existantes)
3. [Validations à ajouter](#validations-à-ajouter)
4. [Bonnes pratiques](#bonnes-pratiques)
5. [Exemples](#exemples)

---

## Introduction

### Pourquoi valider au niveau DB ?

Les validations côté application peuvent être contournées :
- ❌ Accès direct à la base de données
- ❌ Bugs dans le code applicatif
- ❌ Migrations mal écrites
- ❌ Import de données externes

Les CHECK constraints SQLite garantissent :
- ✅ Intégrité des données même si la validation applicative échoue
- ✅ Protection contre les erreurs de programmation
- ✅ Cohérence des données importées
- ✅ Documentation des règles métier dans le schéma

### Limitations SQLite

SQLite supporte les CHECK constraints mais avec quelques limitations :
- ⚠️ Pas de validation de format de date (utiliser TEXT avec format ISO)
- ⚠️ Pas de validation d'email (utiliser CHECK avec LIKE ou regex limité)
- ⚠️ Pas de validation de téléphone (utiliser CHECK avec LIKE)

---

## CHECK Constraints existantes

### Users

```sql
-- Provider valide
provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'telephone'))

-- Email ou téléphone requis
CHECK (email IS NOT NULL OR telephone IS NOT NULL)

-- Booléens
is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1))
is_onboarded INTEGER DEFAULT 0 CHECK (is_onboarded IN (0, 1))
```

### Production Animaux

```sql
-- Sexe valide
sexe TEXT NOT NULL CHECK (sexe IN ('male', 'femelle', 'indetermine'))

-- Statut valide
statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'mort', 'vendu', 'offert', 'autre'))

-- Reproducteur booléen
reproducteur INTEGER DEFAULT 0 CHECK (reproducteur IN (0, 1))
```

### Revenus

```sql
-- Catégorie valide
categorie TEXT NOT NULL CHECK (categorie IN ('vente_porc', 'vente_autre', 'subvention', 'autre'))
```

### Vaccinations

```sql
-- Statut valide
statut TEXT NOT NULL CHECK (statut IN ('planifie', 'effectue', 'en_retard', 'annule'))
```

### Maladies

```sql
-- Type valide
type TEXT NOT NULL CHECK (type IN ('diarrhee', 'respiratoire', 'gale_parasites', 'fievre', 'boiterie', 'digestive', 'cutanee', 'reproduction', 'neurologique', 'autre'))

-- Gravité valide
gravite TEXT NOT NULL CHECK (gravite IN ('faible', 'moderee', 'grave', 'critique'))

-- Booléens
contagieux INTEGER DEFAULT 0 CHECK (contagieux IN (0, 1))
gueri INTEGER DEFAULT 0 CHECK (gueri IN (0, 1))
```

### Collaborations

```sql
-- Rôle valide
role TEXT NOT NULL CHECK (role IN ('proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur'))

-- Statut valide
statut TEXT NOT NULL CHECK (statut IN ('actif', 'inactif', 'en_attente'))
```

---

## Validations à ajouter

### 1. Montants positifs

**Tables concernées :**
- `revenus` : `montant`, `cout_*`, `marge_*`
- `depenses_ponctuelles` : `montant`
- `charges_fixes` : `montant`
- `vaccinations` : `cout`
- `traitements` : `cout`
- `visites_veterinaires` : `cout`
- `maladies` : `cout_traitement`

**Exemple :**
```sql
montant REAL NOT NULL CHECK (montant >= 0),
cout REAL CHECK (cout >= 0),
```

### 2. Poids positifs

**Tables concernées :**
- `production_animaux` : `poids_initial`
- `production_pesees` : `poids_kg`
- `revenus` : `poids_kg`
- `mortalites` : `poids_kg`

**Exemple :**
```sql
poids_kg REAL CHECK (poids_kg > 0),
poids_initial REAL CHECK (poids_initial > 0),
```

### 3. Pourcentages valides (0-100)

**Tables concernées :**
- `revenus` : `marge_opex_pourcent`, `marge_complete_pourcent`
- `ingredients` : `proteine_pourcent`
- `rations` : `proteine_pourcent`, `energie_kcal`

**Exemple :**
```sql
marge_opex_pourcent REAL CHECK (marge_opex_pourcent >= -100 AND marge_opex_pourcent <= 100),
proteine_pourcent REAL CHECK (proteine_pourcent >= 0 AND proteine_pourcent <= 100),
```

### 4. Quantités positives

**Tables concernées :**
- `stocks_aliments` : `quantite`
- `stocks_mouvements` : `quantite`
- `ingredients_ration` : `quantite`
- `mortalites` : `nombre_porcs`, `nombre_deces`
- `maladies` : `nombre_animaux_affectes`, `nombre_deces`

**Exemple :**
```sql
quantite REAL NOT NULL CHECK (quantite > 0),
nombre_porcs INTEGER CHECK (nombre_porcs > 0),
```

### 5. Dates cohérentes

**Tables concernées :**
- `gestations` : `date_saillie` < `date_mise_bas_prevue`
- `production_pesees` : `date` >= `date_entree` (animal)
- `vaccinations` : `date_vaccination` <= `date_rappel` (si rappel)
- `mortalites` : `date_deces` >= `date_entree` (animal)

**Exemple :**
```sql
-- Dans gestations
CHECK (date_mise_bas_prevue IS NULL OR date_mise_bas_prevue >= date_saillie)

-- Dans vaccinations
CHECK (date_rappel IS NULL OR date_rappel >= date_vaccination)
```

### 6. Unités valides

**Tables concernées :**
- `ingredients` : `unite`
- `stocks_aliments` : `unite`
- `vaccinations` : `unite_dosage`

**Exemple :**
```sql
unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
unite_dosage TEXT DEFAULT 'ml' CHECK (unite_dosage IN ('ml', 'g', 'mg', 'unite')),
```

### 7. Types de dépenses valides

**Tables concernées :**
- `depenses_ponctuelles` : `categorie`, `type_opex_capex`

**Exemple :**
```sql
categorie TEXT NOT NULL CHECK (categorie IN ('aliment', 'medicament', 'equipement', 'maintenance', 'transport', 'autre')),
type_opex_capex TEXT CHECK (type_opex_capex IN ('opex', 'capex')),
```

### 8. Types de charges fixes valides

**Tables concernées :**
- `charges_fixes` : `categorie`, `type_opex_capex`

**Exemple :**
```sql
categorie TEXT NOT NULL CHECK (categorie IN ('loyer', 'salaire', 'assurance', 'eau', 'electricite', 'autre')),
type_opex_capex TEXT CHECK (type_opex_capex IN ('opex', 'capex')),
```

---

## Bonnes pratiques

### ✅ À faire

1. **Valider les valeurs critiques**
   - Montants, poids, quantités : toujours >= 0
   - Pourcentages : entre -100 et 100 (ou 0 et 100 selon le cas)
   - Énumérations : utiliser CHECK avec IN

2. **Valider les relations**
   - Dates cohérentes (fin >= début)
   - Foreign keys avec ON DELETE CASCADE/ SET NULL

3. **Valider les formats**
   - Dates : TEXT avec format ISO (YYYY-MM-DD)
   - Emails : CHECK avec LIKE (limité en SQLite)
   - Téléphones : CHECK avec LIKE (limité en SQLite)

4. **Documenter les contraintes**
   - Commentaires dans le schéma
   - Documentation dans ce guide

### ❌ À éviter

1. **Ne pas valider ce qui change souvent**
   - Éviter les contraintes trop strictes qui nécessitent des migrations fréquentes

2. **Ne pas dupliquer la validation applicative**
   - La validation DB est un complément, pas un remplacement

3. **Ne pas valider les formats complexes**
   - SQLite ne supporte pas les regex complètes
   - Utiliser la validation applicative pour les formats complexes

---

## Exemples

### Exemple 1 : Table revenus complète

```sql
CREATE TABLE revenus (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  montant REAL NOT NULL CHECK (montant >= 0),
  categorie TEXT NOT NULL CHECK (categorie IN ('vente_porc', 'vente_autre', 'subvention', 'autre')),
  date TEXT NOT NULL,
  poids_kg REAL CHECK (poids_kg > 0),
  animal_id TEXT,
  -- Marges
  cout_kg_opex REAL CHECK (cout_kg_opex >= 0),
  cout_kg_complet REAL CHECK (cout_kg_complet >= 0),
  marge_opex REAL,
  marge_complete REAL,
  marge_opex_pourcent REAL CHECK (marge_opex_pourcent >= -100 AND marge_opex_pourcent <= 100),
  marge_complete_pourcent REAL CHECK (marge_complete_pourcent >= -100 AND marge_complete_pourcent <= 100),
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projet_id) REFERENCES projets(id)
);
```

### Exemple 2 : Table depenses_ponctuelles

```sql
CREATE TABLE depenses_ponctuelles (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  montant REAL NOT NULL CHECK (montant >= 0),
  categorie TEXT NOT NULL CHECK (categorie IN ('aliment', 'medicament', 'equipement', 'maintenance', 'transport', 'autre')),
  type_opex_capex TEXT CHECK (type_opex_capex IN ('opex', 'capex')),
  date TEXT NOT NULL,
  description TEXT,
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projet_id) REFERENCES projets(id)
);
```

### Exemple 3 : Table production_pesees

```sql
CREATE TABLE production_pesees (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  animal_id TEXT NOT NULL,
  date TEXT NOT NULL,
  poids_kg REAL NOT NULL CHECK (poids_kg > 0),
  gmq REAL,
  difference_standard REAL,
  notes TEXT,
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projet_id) REFERENCES projets(id),
  FOREIGN KEY (animal_id) REFERENCES production_animaux(id)
);
```

### Exemple 4 : Table gestations avec dates cohérentes

```sql
CREATE TABLE gestations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  truie_id TEXT NOT NULL,
  verrat_id TEXT,
  date_saillie TEXT NOT NULL,
  date_mise_bas_prevue TEXT,
  date_mise_bas_reelle TEXT,
  statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'terminee', 'avortee')),
  nombre_porcelets INTEGER CHECK (nombre_porcelets >= 0),
  CHECK (date_mise_bas_prevue IS NULL OR date_mise_bas_prevue >= date_saillie),
  CHECK (date_mise_bas_reelle IS NULL OR date_mise_bas_reelle >= date_saillie),
  FOREIGN KEY (projet_id) REFERENCES projets(id),
  FOREIGN KEY (truie_id) REFERENCES production_animaux(id)
);
```

---

## Migration des contraintes

### Ajouter une contrainte à une table existante

SQLite ne supporte pas `ALTER TABLE ADD CONSTRAINT`. Il faut :

1. Créer une migration qui recrée la table avec la nouvelle contrainte
2. Copier les données
3. Supprimer l'ancienne table

**Exemple :**
```typescript
// Migration pour ajouter CHECK (montant >= 0) à revenus
export async function addMontantCheckConstraint(db: SQLiteDatabase): Promise<void> {
  // Renommer l'ancienne table
  await db.execAsync('ALTER TABLE revenus RENAME TO revenus_old;');
  
  // Créer la nouvelle table avec la contrainte
  await db.execAsync(`
    CREATE TABLE revenus (
      id TEXT PRIMARY KEY,
      projet_id TEXT NOT NULL,
      montant REAL NOT NULL CHECK (montant >= 0),
      -- ... autres colonnes
    );
  `);
  
  // Copier les données (filtrer les montants négatifs si nécessaire)
  await db.execAsync(`
    INSERT INTO revenus SELECT * FROM revenus_old WHERE montant >= 0;
  `);
  
  // Supprimer l'ancienne table
  await db.execAsync('DROP TABLE revenus_old;');
}
```

---

## Références

- [SQLite CHECK Constraints](https://www.sqlite.org/lang_createtable.html#check_constraints)
- [Schémas existants](../../src/database/schemas/)
- [Guide migrations](DATABASE_MIGRATIONS.md)

---

**Dernière mise à jour:** 21 Novembre 2025

