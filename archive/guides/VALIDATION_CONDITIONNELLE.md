# 🔍 Guide: Validation Conditionnelle avec Yup

Ce guide explique comment implémenter correctement une validation conditionnelle avec Yup, suite à la correction du bug de `depenseSchema`.

---

## ❌ Le Problème Identifié

### Symptôme

Les utilisateurs ne pouvaient pas soumettre le formulaire de dépense avec des catégories comme `aliment`, `medicament`, etc., car la validation échouait systématiquement.

### Cause Racine

Le schéma Yup `depenseSchema` avait une validation incorrecte :

```typescript
// ❌ MAUVAIS - libelle_categorie toujours requis
libelle_categorie: yup
  .string()
  .required('La catégorie est obligatoire'),
```

**Problème** : Le champ `libelle_categorie` était requis pour **toutes** les catégories, mais l'UI ne l'affichait que quand `categorie === 'autre'`.

**Résultat** : Les utilisateurs sélectionnant `aliment`, `medicament`, etc. ne pouvaient pas entrer de valeur pour un champ requis → validation échouait toujours.

---

## ✅ La Solution

### Validation Conditionnelle avec `.when()`

Yup fournit la méthode `.when()` pour créer des validations conditionnelles basées sur la valeur d'un autre champ.

```typescript
// ✅ BON - libelle_categorie requis SEULEMENT si categorie === 'autre'
libelle_categorie: yup
  .string()
  .nullable()
  .when('categorie', {
    is: 'autre',
    then: (schema) => schema
      .required('Le libellé de la catégorie est obligatoire')
      .min(3, 'Le libellé doit contenir au moins 3 caractères')
      .max(100, 'Le libellé ne peut pas dépasser 100 caractères'),
    otherwise: (schema) => schema.nullable(),
  }),
```

### Explication

1. **`.nullable()`** : Le champ peut être `null` par défaut
2. **`.when('categorie', { ... })`** : Condition basée sur le champ `categorie`
3. **`is: 'autre'`** : Si `categorie` vaut `'autre'`
4. **`then: (schema) => schema.required(...)`** : Alors appliquer ces validations
5. **`otherwise: (schema) => schema.nullable()`** : Sinon, laisser nullable

---

## 📋 Checklist pour Validation Conditionnelle

Avant d'ajouter une validation conditionnelle, vérifier :

- [ ] Le champ est-il affiché conditionnellement dans l'UI ?
- [ ] La condition UI correspond-elle à la condition Yup ?
- [ ] Le champ de base est-il `.nullable()` ?
- [ ] Les deux branches (`then` et `otherwise`) sont-elles définies ?
- [ ] Des tests couvrent-ils les deux cas (condition vraie/fausse) ?

---

## 🎯 Exemples d'Usage

### Exemple 1 : Champ requis si enum = valeur

```typescript
// Durée d'amortissement obligatoire pour CAPEX
duree_amortissement_mois: yup
  .number()
  .nullable()
  .when('type_depense', {
    is: 'CAPEX',
    then: (schema) => schema
      .required('La durée est obligatoire pour les CAPEX')
      .positive('La durée doit être positive')
      .integer('La durée doit être un entier'),
    otherwise: (schema) => schema.nullable(),
  }),
```

### Exemple 2 : Champ requis si booléen = true

```typescript
// Libellé d'autre catégorie obligatoire si "autre" coché
autre_libelle: yup
  .string()
  .nullable()
  .when('is_autre_categorie', {
    is: true,
    then: (schema) => schema
      .required('Précisez la catégorie')
      .min(3, 'Au moins 3 caractères'),
    otherwise: (schema) => schema.nullable(),
  }),
```

### Exemple 3 : Validation basée sur valeur numérique

```typescript
// Date de fin requise si durée > 0
date_fin: yup
  .string()
  .nullable()
  .when('duree_mois', {
    is: (val: number) => val > 0,
    then: (schema) => schema.required('Date de fin obligatoire'),
    otherwise: (schema) => schema.nullable(),
  }),
```

### Exemple 4 : Validation basée sur plusieurs champs

```typescript
// Poids requis si catégorie = vente_porc ET animal sélectionné
poids_kg: yup
  .number()
  .nullable()
  .when(['categorie', 'animal_id'], {
    is: (categorie: string, animal_id: string) => 
      categorie === 'vente_porc' && !!animal_id,
    then: (schema) => schema
      .required('Le poids est obligatoire pour une vente de porc')
      .positive('Le poids doit être positif'),
    otherwise: (schema) => schema.nullable(),
  }),
```

---

## 🧪 Tests de Validation Conditionnelle

### Structure de Test Recommandée

Pour chaque validation conditionnelle, créer au moins 3 tests :

```typescript
describe('Validation conditionnelle de libelle_categorie', () => {
  it('ne devrait PAS requérir si condition fausse', async () => {
    const validData = {
      categorie: 'aliment',
      libelle_categorie: null, // Pas requis
      // ...
    };
    await expect(schema.validate(validData)).resolves.toBeDefined();
  });

  it('devrait requérir si condition vraie', async () => {
    const invalidData = {
      categorie: 'autre',
      libelle_categorie: null, // Requis !
      // ...
    };
    await expect(schema.validate(invalidData)).rejects.toThrow(
      'Le libellé de la catégorie est obligatoire'
    );
  });

  it('devrait accepter si condition vraie ET valeur fournie', async () => {
    const validData = {
      categorie: 'autre',
      libelle_categorie: 'Ma catégorie',
      // ...
    };
    await expect(schema.validate(validData)).resolves.toBeDefined();
  });
});
```

---

## ⚠️ Pièges à Éviter

### 1. Oublier `.nullable()` de base

```typescript
// ❌ MAUVAIS
libelle_categorie: yup
  .string()
  .when('categorie', { ... })

// ✅ BON
libelle_categorie: yup
  .string()
  .nullable()  // ← Important !
  .when('categorie', { ... })
```

### 2. Ne pas définir `otherwise`

```typescript
// ❌ MAUVAIS - otherwise manquant
.when('categorie', {
  is: 'autre',
  then: (schema) => schema.required(),
  // otherwise manquant !
})

// ✅ BON
.when('categorie', {
  is: 'autre',
  then: (schema) => schema.required(),
  otherwise: (schema) => schema.nullable(),
})
```

### 3. Condition UI ≠ Condition Yup

```typescript
// ❌ MAUVAIS - UI affiche si categorie === 'autre'
// Mais Yup valide si categorie === 'custom'
.when('categorie', {
  is: 'custom',  // ← Incohérent avec UI !
  then: (schema) => schema.required(),
})
```

**Règle** : La condition Yup doit **toujours** correspondre exactement à la condition d'affichage dans l'UI.

### 4. Oublier de tester

```typescript
// ❌ MAUVAIS - Pas de tests
depenseSchema.validate(data); // Espérer que ça marche

// ✅ BON - Tests complets
// Voir section "Tests de Validation Conditionnelle"
```

---

## 📚 Ressources

### Documentation Yup

- [Yup Conditional Validation](https://github.com/jquense/yup#mixedwhenkeys-string--string-builder-object--values-any-schema--schema-schema)
- [Yup API Reference](https://github.com/jquense/yup#api)

### Fichiers du Projet

- **Schémas** : `src/validation/financeSchemas.ts`
- **Tests** : `src/validation/__tests__/financeSchemas.test.ts`
- **Hook** : `src/hooks/useFormValidation.ts`
- **Exemple d'usage** : `src/components/DepenseFormModal.tsx`

---

## ✅ Checklist de Validation

Avant de soumettre un schéma avec validation conditionnelle :

1. [ ] Le champ de base est `.nullable()`
2. [ ] La condition `.when()` correspond à l'UI
3. [ ] Les branches `then` et `otherwise` sont définies
4. [ ] Au moins 3 tests écrits (faux, vrai sans valeur, vrai avec valeur)
5. [ ] Les tests passent : `node test-<schema>-schema.js`
6. [ ] Le formulaire UI testé manuellement
7. [ ] Documentation mise à jour si pattern nouveau

---

**Date de création** : 26 Novembre 2024  
**Dernière mise à jour** : 26 Novembre 2024  
**Version** : 1.0.0

