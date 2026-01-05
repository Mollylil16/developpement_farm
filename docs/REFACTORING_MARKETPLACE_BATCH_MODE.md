# Refactoring : Alignement du mode élevage en bande sur le mode suivi individuel

## 📋 PHASE 1 : ANALYSE COMPLÈTE

### 1.1 - MODE SUIVI INDIVIDUEL (Référence)

#### A) Écran de sélection des animaux
- **Fichier** : `src/components/ProductionCheptelComponent.tsx`
- **Composant** : `AnimalCard` avec toggle marketplace
- **Processus** :
  1. Producteur clique sur toggle marketplace d'un animal
  2. `handleToggleMarketplace` (depuis `useProductionCheptelLogic`) vérifie si l'animal est déjà en vente
  3. Si non : Ouvre modal de prix (`showPriceModal`)
  4. Producteur saisit le prix/kg et confirme
  5. `handleConfirmMarketplaceAdd` :
     - Récupère la dernière pesée depuis `/production/pesees`
     - Appelle `createListing` (Redux) avec :
       - `subjectId`: `animal.id` (ID réel de `production_animaux`)
       - `weight`: dernière pesée ou `poids_initial`
       - `pricePerKg`: prix saisi
     - Crée le listing via `POST /marketplace/listings`

#### B) API d'ajout au marketplace
- **Endpoint** : `POST /marketplace/listings`
- **Body** :
```typescript
{
  subjectId: string; // ID de production_animaux
  producerId: string;
  farmId: string;
  pricePerKg: number;
  weight: number; // Poids réel (dernière pesée)
  lastWeightDate: string;
  location: Location;
  saleTerms?: object;
}
```

#### C) Affichage dans le marketplace
- Les listings apparaissent dans `FarmCard` groupés par ferme
- Clic sur `FarmCard` → `FarmDetailsModal` s'ouvre
- `FarmDetailsModal` affiche tous les sujets en vente avec leurs détails réels

#### D) Backend
- **Fichier** : `backend/src/marketplace/marketplace.service.ts`
- **Fonction** : `createListing`
- **Table** : `marketplace_listings`
- **Champ** : `subject_id` = ID de `production_animaux`

---

### 1.2 - MODE ÉLEVAGE EN BANDE (État actuel - À REFACTORER)

#### A) Écran de sélection des animaux
- **Fichier** : `src/components/marketplace/BatchAddModal.tsx`
- **Problème** : Modal intermédiaire (différent du mode individuel)
- **Processus actuel** :
  1. Producteur ouvre `BatchAddModal` depuis le marketplace
  2. Sélectionne plusieurs `batch_pigs`
  3. Saisit prix/kg
  4. Soumet → `handleSubmit` :
     - **Mode bande** : Crée listing batch via `POST /marketplace/listings/batch`
     - **Mode individuel** : Crée listings individuels (comme référence)

#### B) API actuelle (mode bande)
- **Endpoint** : `POST /marketplace/listings/batch` ❌ (différent du mode individuel)
- **Body** :
```typescript
{
  batchId: string;
  farmId: string;
  pricePerKg: number;
  averageWeight: number; // ❌ Poids moyen au lieu du poids réel
  pigCount: number;
  pigIds: string[]; // IDs des batch_pigs
  lastWeightDate: string;
  location: Location;
}
```

#### C) Problèmes identifiés
1. ❌ Endpoint différent (`/batch` vs `/listings`)
2. ❌ Poids moyen au lieu du poids réel par animal
3. ❌ Listing de type "batch" au lieu de listings individuels
4. ❌ Processus différent (modal intermédiaire)
5. ❌ IDs virtuels/générés possibles

---

## 📋 PHASE 2 : PLAN DE REFACTORING

### 2.1 - SUPPRESSION DES ÉLÉMENTS INTERMÉDIAIRES

#### Fichiers à MODIFIER (pas supprimer)
- `src/components/marketplace/BatchAddModal.tsx` : Refactoriser pour créer des listings individuels

#### Code à SUPPRIMER
- Appel à `POST /marketplace/listings/batch` dans `BatchAddModal.tsx` (lignes 389-411)
- Logique de groupement par `batchId` (lignes 358-366)

### 2.2 - UNIFICATION DES PROCESSUS

#### Changements dans `BatchAddModal.tsx`

**1. Modifier `handleSubmit` pour mode bande :**
```typescript
// AVANT (lignes 351-412) :
if (isBatchMode) {
  // Créer listing batch
  await apiClient.post('/marketplace/listings/batch', {...});
}

// APRÈS :
if (isBatchMode) {
  // Créer un listing individuel pour CHAQUE batch_pig sélectionné
  const selectedPigs = batchPigs.filter((pig) => selectedIds.has(pig.id));
  
  for (const pig of selectedPigs) {
    // Récupérer la dernière pesée réelle pour ce porc
    const pesees = await apiClient.get(`/batch-pigs/pigs/${pig.id}/weighings`, {
      params: { limit: 1 }
    });
    const dernierePesee = pesees?.[0];
    const poidsActuel = dernierePesee?.weight_kg || pig.current_weight_kg || 0;
    const lastWeightDate = dernierePesee?.date || pig.last_weighing_date || new Date().toISOString();
    
    // Arrondir le poids en nombre entier
    const poidsArrondi = Math.round(poidsActuel);
    
    if (poidsArrondi <= 0) {
      // Utiliser poids moyen de la bande si poids réel indisponible
      const batch = batches.find(b => b.id === pig.batch_id);
      poidsArrondi = Math.round(batch?.average_weight_kg || 0);
    }
    
    // Créer le listing individuel avec l'ID réel du batch_pig
    await dispatch(
      createListing({
        subjectId: pig.id, // ✅ ID réel du batch_pig
        producerId: user.id,
        farmId: projetId,
        pricePerKg: price,
        weight: poidsArrondi, // ✅ Poids réel arrondi
        lastWeightDate,
        location: {...},
      })
    ).unwrap();
  }
}
```

**2. Modifier la récupération des pesées :**
- Utiliser l'endpoint `/batch-pigs/pigs/{pigId}/weighings` pour récupérer les pesées réelles
- Si aucune pesée : utiliser `pig.current_weight_kg`
- Si toujours 0 : utiliser poids moyen de la bande

**3. Formatage des poids :**
- Tous les poids doivent être arrondis avec `Math.round()` avant création du listing

### 2.3 - MODIFICATIONS BACKEND (si nécessaire)

#### Vérifier si le backend accepte `subjectId` = `batch_pig.id`

**Option A : Backend accepte déjà les IDs de batch_pigs**
- Aucune modification backend nécessaire
- Le champ `subject_id` dans `marketplace_listings` peut pointer vers `batch_pigs.id` ou `production_animaux.id`

**Option B : Backend n'accepte que les IDs de production_animaux**
- Modifier `marketplace.service.ts` pour :
  1. Vérifier si `subjectId` existe dans `production_animaux`
  2. Si non, vérifier dans `batch_pigs`
  3. Créer le listing avec le bon `subject_id`

---

## 📋 PHASE 3 : IMPLÉMENTATION

### ✅ Modifications effectuées

#### 1. `src/components/marketplace/BatchAddModal.tsx`
- **Lignes 351-412** : Supprimé la logique de création de listings batch
- **Remplacé par** : Création de listings individuels pour chaque `batch_pig` sélectionné
- **Changements clés** :
  - Utilisation de `pig.id` (ID réel du batch_pig) comme `subjectId`
  - Utilisation de `pig.current_weight_kg` comme poids réel
  - Fallback vers `batch.average_weight_kg` si poids réel indisponible
  - Arrondi du poids avec `Math.round()` pour avoir des nombres entiers
  - Utilisation de `createListing` (Redux) au lieu de `apiClient.post('/marketplace/listings/batch')`
  - Processus identique au mode individuel

#### 2. `src/hooks/production/useProductionCheptelLogic.ts`
- **Ligne 158** : Ajout de l'arrondi du poids avec `Math.round()` pour le mode individuel
- **Cohérence** : Les deux modes utilisent maintenant le même formatage de poids

#### 3. Cohérence des processus
- ✅ Les deux modes (individuel et bande) utilisent maintenant le même endpoint : `POST /marketplace/listings`
- ✅ Les deux modes arrondissent les poids en nombres entiers
- ✅ Les deux modes utilisent les IDs réels (pas d'IDs virtuels)
- ✅ Les deux modes utilisent le même Redux action : `createListing`

### ⚠️ Points à vérifier après déploiement

1. **Backend** : Vérifier que le backend accepte `subjectId` = `batch_pig.id` (pas seulement `production_animaux.id`)
   - Si le backend ne l'accepte pas, modifier `marketplace.service.ts` pour vérifier les deux tables

2. **Affichage** : Vérifier que les listings de batch_pigs apparaissent correctement dans `FarmDetailsModal`
   - Les IDs doivent être les IDs réels des batch_pigs
   - Les poids doivent être affichés en nombres entiers

3. **FarmCard** : Vérifier que les FarmCards groupent correctement les listings de batch_pigs avec les listings individuels

### 📝 Résumé des changements

| Aspect | Avant (Mode bande) | Après (Mode bande) |
|--------|-------------------|-------------------|
| Endpoint API | `POST /marketplace/listings/batch` | `POST /marketplace/listings` |
| Type de listing | Listing batch (1 par batch) | Listings individuels (1 par batch_pig) |
| Poids utilisé | Poids moyen de la bande | Poids réel de chaque batch_pig |
| Format poids | Décimal | Nombre entier (arrondi) |
| ID utilisé | `batchId` + `pigIds[]` | `batch_pig.id` (ID réel) |
| Processus | Différent du mode individuel | Identique au mode individuel |

