# 🔧 Corrections Repositories - Noms de Tables

**Date:** 21 Novembre 2025  
**Contexte:** Après refactoring Phase 5

---

## ❌ Problèmes Identifiés

Plusieurs repositories utilisaient des noms de tables incorrects (anciens noms ou noms inexistants dans le schéma actuel).

---

## ✅ Corrections Appliquées

### 1. VaccinationRepository

**Problèmes multiples:**
1. Utilisait `veterinaire_vaccinations` (table inexistante) → Remplacé par `vaccinations`
2. Utilisait des noms de colonnes incorrects → Aligné avec le schéma réel

**Fichier:** `src/database/repositories/VaccinationRepository.ts`

**Schéma réel de la table:**
```sql
CREATE TABLE vaccinations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  animal_id TEXT,
  vaccin TEXT,  -- ✅ Pas "type_vaccin"
  nom_vaccin TEXT,
  date_vaccination TEXT NOT NULL,  -- ✅ Pas "date_administration"
  date_rappel TEXT,
  numero_lot_vaccin TEXT,  -- ✅ Pas "lot_numero"
  veterinaire TEXT,  -- ✅ Pas "veterinaire_id"
  ...
);
```

**Changements appliqués:**
```typescript
// Avant ❌
super(db, 'veterinaire_vaccinations');
INSERT INTO vaccinations (
  type_vaccin, date_administration, lot_numero, 
  veterinaire_id, duree_protection_jours
)

// Après ✅
super(db, 'vaccinations');
INSERT INTO vaccinations (
  vaccin, date_vaccination, numero_lot_vaccin,
  veterinaire, date_rappel
)
```

---

### 2. GestationRepository

**Problème:** Utilisait `reproduction_gestations` (table inexistante)  
**Solution:** Remplacé par `gestations` (nom correct)

**Fichier:** `src/database/repositories/GestationRepository.ts`

**Changements:**
```typescript
// Avant ❌
super(db, 'reproduction_gestations');
INSERT INTO reproduction_gestations (...)
SELECT * FROM reproduction_gestations ...
INNER JOIN reproduction_gestations g ON ...

// Après ✅
super(db, 'gestations');
INSERT INTO gestations (...)
SELECT * FROM gestations ...
INNER JOIN gestations g ON ...
```

---

### 3. SevrageRepository

**Problème:** Utilisait `reproduction_sevrages` et `reproduction_gestations` (tables inexistantes)  
**Solution:** Remplacé par `sevrages` et `gestations` (noms corrects)

**Fichier:** `src/database/repositories/SevrageRepository.ts`

**Changements:**
```typescript
// Avant ❌
super(db, 'reproduction_sevrages');
INSERT INTO reproduction_sevrages (...)
INNER JOIN reproduction_gestations g ON ...

// Après ✅
super(db, 'sevrages');
INSERT INTO sevrages (...)
INNER JOIN gestations g ON ...
```

---

### 4. MortaliteRepository

**Problème:** Utilisait `date_deces` (colonne inexistante)  
**Solution:** Remplacé par `date` (nom correct)

**Fichier:** `src/database/repositories/MortaliteRepository.ts`

**Schéma de la table:**
```sql
CREATE TABLE mortalites (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  nombre_porcs INTEGER NOT NULL,
  date TEXT NOT NULL,  -- ✅ C'est "date", pas "date_deces"
  cause TEXT,
  categorie TEXT NOT NULL,
  animal_code TEXT,
  notes TEXT,
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Changements:**
```typescript
// Avant ❌
INSERT INTO mortalites (..., date_deces, ...)
data.date_deces || now
ORDER BY date_deces DESC

// Après ✅
INSERT INTO mortalites (..., date, ...)
data.date || now
ORDER BY date DESC
```

---

## 🎯 Résumé des Corrections

| Repository | Problème | Solution | Status |
|-----------|----------|----------|--------|
| **VaccinationRepository** | Table: `veterinaire_vaccinations`<br>Colonnes: `type_vaccin`, `date_administration`, etc.<br>ORDER BY avec mauvaise colonne | Table: `vaccinations`<br>Colonnes: `vaccin`, `date_vaccination`, etc.<br>ORDER BY corrigé | ✅ |
| **GestationRepository** | `reproduction_gestations` | `gestations` | ✅ |
| **SevrageRepository** | `reproduction_sevrages`,<br>`reproduction_gestations` (JOIN) | `sevrages`,<br>`gestations` (JOIN) | ✅ |
| **MortaliteRepository** | Colonne: `date_deces` | Colonne: `date` | ✅ |
| **AnimalRepository** | Méthode manquante: `findByProjet()`<br>Méthode manquante: `findActifs()` | Méthodes ajoutées:<br>`findByProjet()`, `findActiveByProjet()` | ✅ |
| **productionSlice** | Appel à `findActifs()` inexistant | Corrigé vers `findActiveByProjet()` | ✅ |

---

## 🔍 Comment Éviter Ces Problèmes à l'Avenir

### 1. Documentation du Schéma

Créer un fichier `docs/DATABASE_SCHEMA.md` avec :
- Liste de toutes les tables
- Colonnes de chaque table
- Types et contraintes

### 2. Types TypeScript Alignés

S'assurer que les types TypeScript correspondent exactement au schéma :

```typescript
// src/types/mortalite.ts
export interface Mortalite {
  id: string;
  projet_id: string;
  nombre_porcs: number;
  date: string;  // ✅ Aligné avec le schéma
  cause?: string;
  categorie: 'porcelet' | 'truie' | 'verrat' | 'autre';
  animal_code?: string;
  notes?: string;
  date_creation: string;
}
```

### 3. Tests d'Intégration

Ajouter des tests qui :
- Vérifient que les tables existent
- Testent les insertions/lectures
- Valident le schéma

```typescript
// Exemple de test
describe('MortaliteRepository', () => {
  it('devrait créer une mortalité avec succès', async () => {
    const mortalite = await repo.create({
      projet_id: 'test',
      nombre_porcs: 1,
      date: new Date().toISOString(),  // ✅
      cause: 'maladie',
      categorie: 'porcelet',
    });
    
    expect(mortalite.id).toBeDefined();
    expect(mortalite.date).toBeDefined();
  });
});
```

### 4. Vérification au Démarrage

Ajouter une fonction qui vérifie l'intégrité du schéma :

```typescript
async function verifySchema() {
  const tables = ['vaccinations', 'sevrages', 'mortalites', ...];
  
  for (const table of tables) {
    const exists = await db.getFirstAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [table]
    );
    
    if (!exists) {
      throw new Error(`Table ${table} n'existe pas !`);
    }
  }
}
```

---

## ✅ État Actuel

**Tous les repositories utilisent maintenant les noms corrects de tables et colonnes.**

**L'application devrait démarrer sans erreurs de base de données.** 🎉

---

## 📝 Notes Importantes

### Tables Actuelles (Schéma Validé)

**Vaccinations:**
- Table: `vaccinations` ✅
- Colonnes principales: id, projet_id, vaccin, date_vaccination, etc.

**Sevrages:**
- Table: `sevrages` ✅
- Colonnes principales: id, projet_id, gestation_id, date_sevrage, nombre_porcelets, etc.

**Mortalités:**
- Table: `mortalites` ✅
- Colonnes principales: id, projet_id, nombre_porcs, **date** (pas date_deces), cause, categorie, etc.

---

**Date:** 21 Novembre 2025  
**Status:** ✅ Toutes les corrections appliquées  
**Application:** Prête à démarrer

---

**Version:** 1.0.0

