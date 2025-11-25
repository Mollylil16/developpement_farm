# 🔧 Correction: Parsing des Photos JSON

**Date**: 24 Novembre 2025  
**Erreur**: `revenu.photos?.filter is not a function (it is undefined)`

---

## 🔍 Cause du Problème

### Stockage vs Lecture Asymétrique

Les photos sont **stockées** en JSON dans la base de données mais ne sont **pas parsées** lors de la lecture.

**Stockage (✅ correct):**
```typescript
// Dans FinanceRepository.create()
photos: data.photos ? JSON.stringify(data.photos) : null
// → Stocke: '["uri1", "uri2"]' (chaîne JSON)
```

**Lecture (❌ incorrect):**
```typescript
// Dans RevenuRepository
const rows = await this.query<Revenu>('SELECT * FROM revenus ...');
// → row.photos = '["uri1", "uri2"]' (chaîne, PAS un tableau)
```

**Utilisation dans le composant:**
```typescript
// FinanceRevenusComponent.tsx
const photosValides = revenu.photos?.filter(p => p && p.trim() !== '');
// ❌ ERREUR: revenu.photos est une chaîne, pas un tableau !
// → "filter is not a function"
```

---

## ✅ Solution Implémentée

### Ajout de Méthodes de Parsing

Dans `RevenuRepository` et `DepensePonctuelleRepository`, ajout d'une méthode `parsePhotos()` :

```typescript
/**
 * Parser les photos depuis JSON
 */
private parsePhotos(photos: any): string[] | undefined {
  if (!photos) return undefined;
  if (Array.isArray(photos)) return photos;
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}
```

**Avantages:**
- ✅ Gère `null`, `undefined`
- ✅ Gère les tableaux déjà parsés
- ✅ Gère les chaînes JSON valides
- ✅ Gère les erreurs de parsing (retourne `undefined`)

### Surcharge des Méthodes de Lecture

#### 1. `findAll()`

```typescript
async findAll(projetId?: string): Promise<Revenu[]> {
  const rows = await super.findAll(projetId);
  return rows.map(row => ({
    ...row,
    photos: this.parsePhotos((row as any).photos)
  }));
}
```

#### 2. `findById()`

```typescript
async findById(id: string): Promise<Revenu | null> {
  const row = await super.findById(id);
  if (!row) return null;
  return {
    ...row,
    photos: this.parsePhotos((row as any).photos)
  };
}
```

#### 3. `findByPeriod()`

```typescript
async findByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Revenu[]> {
  const rows = await this.query<any>('SELECT * FROM revenus ...');
  
  // Parser les photos JSON
  return rows.map(row => ({
    ...row,
    photos: this.parsePhotos(row.photos)
  }));
}
```

---

## 📊 Impact

### Avant

```typescript
// Données en DB
photos: '["file:///photo1.jpg", "file:///photo2.jpg"]' (chaîne JSON)

// Lecture depuis DB
revenu.photos = '["file:///photo1.jpg", "file:///photo2.jpg"]' (chaîne)

// Utilisation dans composant
revenu.photos?.filter(...) 
// ❌ ERREUR: filter is not a function
```

### Après

```typescript
// Données en DB
photos: '["file:///photo1.jpg", "file:///photo2.jpg"]' (chaîne JSON)

// Lecture depuis DB + Parsing
revenu.photos = ["file:///photo1.jpg", "file:///photo2.jpg"] (tableau)

// Utilisation dans composant
revenu.photos?.filter(...) 
// ✅ FONCTIONNE: Array.filter()
```

---

## 🧪 Test à Effectuer

1. ☐ Ajouter une facture à un revenu avec 2 photos
2. ☐ Fermer et rouvrir l'application
3. ☐ Aller dans Finance → Revenus
4. ☐ **Vérifier**: Le nombre de photos s'affiche correctement
5. ☐ Cliquer sur "Voir photos"
6. ☐ **Vérifier**: Les photos s'affichent correctement
7. ☐ **Vérifier**: Plus d'erreur "filter is not a function" ✅

---

## 📝 Fichiers Modifiés

✅ **`src/database/repositories/FinanceRepository.ts`**

**RevenuRepository:**
- Méthode `parsePhotos()` ajoutée
- `findAll()` surchargé avec parsing
- `findById()` surchargé avec parsing
- `findByPeriod()` modifié avec parsing

**DepensePonctuelleRepository:**
- Méthode `parsePhotos()` ajoutée
- `findAll()` surchargé avec parsing
- `findById()` surchargé avec parsing
- `findByPeriod()` modifié avec parsing

---

**Status**: ✅ Corrigé  
**Testez**: Les photos de factures devraient maintenant fonctionner correctement ! 🎉

