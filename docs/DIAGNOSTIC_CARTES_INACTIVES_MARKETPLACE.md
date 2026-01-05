# 🔍 Diagnostic : Cartes Inactives dans le Marketplace pour Profils Acheteurs

**Date** : 2025-01-XX  
**Statut** : ❌ PROBLÈME IDENTIFIÉ - CORRECTION EN COURS

---

## 📋 Résumé Exécutif

Les cartes de listing de sujets en vente dans le Marketplace restent inactives au clic pour les profils acheteurs, empêchant le processus de vente (soumission d'offre). Le problème affecte spécifiquement les listings en mode "élevage en bande" (batch).

---

## 🔬 Analyse Détaillée

### 1. FLOW ACTUEL (Mode Individuel vs Mode Bande)

#### MODE INDIVIDUEL (Fonctionnel) ✅
```
Clic sur SubjectCard 
  → onPress() appelé
    → MarketplaceBuyTab.onListingPress(listing)
      → MarketplaceScreen.handleListingPress(listing)
        → listing.subjectId existe
          → Enrichissement données animal
          → setSelectedListing(enrichedListing)
          → setOfferModalVisible(true)
            → Condition ligne 1051: selectedListing && selectedListing.subjectId ✅
              → OfferModal s'affiche ✅
                → Soumission offre possible ✅
```

#### MODE BANDE (Problématique) ❌
```
Clic sur BatchListingCard 
  → onPress() appelé
    → MarketplaceBuyTab.onListingPress(listing)
      → MarketplaceScreen.handleListingPress(listing)
        → !listing.subjectId (détecté ligne 600)
          → setSelectedListing(listing) (ligne 605)
          → setOfferModalVisible(true) (ligne 606)
            → Condition ligne 1051: selectedListing && selectedListing.subjectId ❌
              → subjectId n'existe pas pour batch
              → OfferModal ne s'affiche JAMAIS ❌
```

---

## 🎯 CAUSE RACINE IDENTIFIÉE

### Fichier : `src/screens/marketplace/MarketplaceScreen.tsx`

**Ligne 1051** : Condition d'affichage restrictive du modal

```typescript
{selectedListing && selectedListing.subjectId && (
  <OfferModal
    visible={offerModalVisible}
    subjects={[...]}  // Nécessite subjectId
    ...
  />
)}
```

**Problème** : 
- Pour les listings batch, `subjectId` n'existe pas (ils ont `batchId` et `pigIds`)
- Le modal ne s'affiche jamais pour les batch listings
- Même si `handleListingPress` détecte correctement le batch et ouvre le modal, la condition bloque l'affichage

---

## 📁 FICHIERS IDENTIFIÉS

### Frontend - Composants Marketplace

1. **`src/screens/marketplace/MarketplaceScreen.tsx`**
   - Ligne 594-673 : `handleListingPress` - Gère le clic sur les listings
   - Ligne 1051-1077 : Condition d'affichage `OfferModal` - **PROBLÈME ICI**
   - Ligne 1079-1103 : Modal pour `selectedSubjectsForOffer` - Fonctionnel

2. **`src/components/marketplace/OfferModal.tsx`**
   - Nécessite un tableau de `subjects` (SubjectCard[])
   - Pour batch, doit adapter pour accepter `pigIds` ou créer des subjects virtuels

3. **`src/components/marketplace/BatchListingCard.tsx`**
   - Ligne 52-67 : `handlePress` - Appelle correctement `onPress()`
   - Ligne 97 : `disabled={!isAvailable}` - Vérifie le statut

4. **`src/components/marketplace/SubjectCard.tsx`**
   - Ligne 79-94 : `handlePress` - Appelle correctement `onPress()`
   - Ligne 116 : `disabled={!subject.available}` - Vérifie la disponibilité

5. **`src/components/marketplace/tabs/MarketplaceBuyTab.tsx`**
   - Ligne 66-128 : `renderListing` - Route correctement vers BatchListingCard ou SubjectCard
   - Ligne 74-88 : Clic sur BatchListingCard - Appelle `onListingPress(item)`

### Backend - API Marketplace

6. **`backend/src/marketplace/marketplace.service.ts`**
   - Ligne 1067-1073 : `mapRowToListing` - Retourne `batchId`, `pigIds`, `pigCount`
   - Ligne 614-663 : `createOffer` - Accepte `subjectIds` (peut être pigIds)

### Types

7. **`src/types/marketplace.ts`**
   - Ligne 67-97 : `MarketplaceListing` - Définit `subjectId?`, `batchId?`, `pigIds?`, `pigCount?`

---

## 🔧 CORRECTIONS NÉCESSAIRES

### Correction 1 : MarketplaceScreen.tsx - Condition d'affichage du modal

**Fichier** : `src/screens/marketplace/MarketplaceScreen.tsx`  
**Lignes** : 1051-1103

**Problème** : La condition `selectedListing && selectedListing.subjectId` exclut les batch listings

**Solution** : Adapter la condition pour accepter aussi les batch listings

```typescript
// AVANT (ligne 1051)
{selectedListing && selectedListing.subjectId && (
  <OfferModal ... />
)}

// APRÈS
{(selectedListing && selectedListing.subjectId) || 
 (selectedListing && selectedListing.batchId && selectedListing.pigIds) && (
  <OfferModal ... />
)}
```

**ET** : Adapter le contenu du modal pour gérer les batch listings

---

### Correction 2 : handleListingPress - Préparer les données pour batch

**Fichier** : `src/screens/marketplace/MarketplaceScreen.tsx`  
**Lignes** : 594-673

**Problème** : Pour les batch, on fait juste `setSelectedListing(listing)` sans préparer les subjects

**Solution** : Créer des "subjects virtuels" à partir de `pigIds` ou adapter `OfferModal`

---

### Correction 3 : OfferModal.tsx - Support des batch listings

**Fichier** : `src/components/marketplace/OfferModal.tsx`

**Options** :
- **Option A** : Adapter `OfferModal` pour accepter un listing batch directement
- **Option B** : Créer des subjects virtuels à partir de `pigIds` avant d'appeler `OfferModal`

**Recommandation** : Option B (créer subjects virtuels) pour minimiser les changements

---

## 📊 STRUCTURE DES DONNÉES

### Listing Individuel (Fonctionnel)
```typescript
{
  id: "listing-123",
  listingType: "individual",
  subjectId: "animal-456",  // ✅ Présent
  batchId: undefined,
  pigIds: undefined,
  // ...
}
```

### Listing Batch (Problématique)
```typescript
{
  id: "listing-789",
  listingType: "batch",
  subjectId: undefined,  // ❌ Absent
  batchId: "batch-123",  // ✅ Présent
  pigIds: ["pig-1", "pig-2", "pig-3"],  // ✅ Présent
  pigCount: 3,
  weight: 85.5,  // Poids moyen
  // ...
}
```

---

## ✅ PLAN DE CORRECTION

### Étape 1 : Modifier MarketplaceScreen.tsx
- [ ] Adapter la condition ligne 1051 pour inclure batch listings
- [ ] Adapter `handleListingPress` pour créer subjects virtuels à partir de `pigIds` pour batch
- [ ] S'assurer que les données sont correctement passées à `OfferModal`

### Étape 2 : Vérifier OfferModal.tsx
- [ ] Vérifier que `OfferModal` peut gérer les subjects créés à partir de `pigIds`
- [ ] Tester la soumission d'offre avec `subjectIds` = `pigIds`

### Étape 3 : Tests
- [ ] Tester clic sur listing individuel → Modal s'affiche ✅
- [ ] Tester clic sur listing batch → Modal s'affiche ✅
- [ ] Tester soumission offre sur individuel → Offre créée ✅
- [ ] Tester soumission offre sur batch → Offre créée avec pigIds ✅

---

## 🚨 RISQUES ET PRÉCAUTIONS

1. **Ne pas casser le mode individuel** : Vérifier que toutes les conditions incluent le cas individuel
2. **PigIds vs SubjectIds** : S'assurer que le backend accepte `pigIds` comme `subjectIds` dans les offres
3. **Affichage des sujets** : Pour batch, afficher une représentation cohérente dans le modal

---

## 📝 NOTES TECHNIQUES

- Les `pigIds` dans un listing batch correspondent aux IDs des animaux dans `batch_pigs`
- Ces IDs peuvent être utilisés comme `subjectIds` lors de la création d'offre
- Le backend doit gérer les offres avec `subjectIds` = `pigIds` pour les listings batch

