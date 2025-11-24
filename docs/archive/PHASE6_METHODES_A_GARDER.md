# 📋 Phase 6 : Méthodes à GARDER dans database.ts

**Objectif:** Liste précise des méthodes à conserver après cleanup

---

## ✅ CORE - À GARDER ABSOLUMENT

### Initialisation & DB
```typescript
async initialize(): Promise<void>
private async migrateTables(): Promise<void>
private async createTables(): Promise<void>
private async createIndexesWithProjetId(): Promise<void>
async repairMissingIndexes(): Promise<{ repaired: number; failed: number }>
getDatabase(): SQLite.SQLiteDatabase
closeDatabase(): Promise<void>
```

---

## ✅ PROJETS - À GARDER (Pas de Repository)

```typescript
async createProjet(projet: Omit<Projet, 'id' | 'date_creation' | 'derniere_modification'>): Promise<Projet>
async getProjetById(id: string): Promise<Projet | null>
async getProjetsByUser(userId: string): Promise<Projet[]>
async updateProjet(id: string, updates: Partial<Projet>): Promise<Projet>
async deleteProjet(id: string): Promise<void>
```

---

## ✅ USERS - À GARDER (Pas de Repository)

```typescript
async createUser(user: Omit<User, 'id' | 'date_creation'>): Promise<User>
async getUserById(id: string): Promise<User | null>
async getUserByEmail(email: string): Promise<User | null>
async getUserByTelephone(telephone: string): Promise<User | null>
async updateUser(id: string, updates: Partial<User>): Promise<User>
```

---

## ✅ COLLABORATEURS - À GARDER (Pas de Repository)

```typescript
async createCollaborateur(collaborateur: Omit<Collaborateur, 'id' | 'date_ajout'>): Promise<Collaborateur>
async getCollaborateursParProjet(projetId: string): Promise<Collaborateur[]>
async getCollaborateurById(id: string): Promise<Collaborateur | null>
async updateCollaborateur(id: string, updates: UpdateCollaborateurInput): Promise<Collaborateur>
async deleteCollaborateur(id: string): Promise<void>
```

---

## ✅ PLANIFICATIONS - À GARDER (Pas de Repository)

```typescript
async createPlanification(planification: Omit<Planification, 'id' | 'date_creation'>): Promise<Planification>
async getPlanificationsParProjet(projetId: string): Promise<Planification[]>
async getPlanificationById(id: string): Promise<Planification | null>
async updatePlanification(id: string, updates: Partial<Planification>): Promise<Planification>
async deletePlanification(id: string): Promise<void>
async getPlanificationParAnimal(animalId: string): Promise<Planification | null>
```

---

## ✅ NUTRITION - À GARDER (Pas de Repository)

### Ingrédients
```typescript
async createIngredient(ingredient: Omit<Ingredient, 'id' | 'date_creation'>): Promise<Ingredient>
async getIngredientsParProjet(projetId: string): Promise<Ingredient[]>
async getIngredientById(id: string): Promise<Ingredient | null>
async updateIngredient(id: string, updates: Partial<Ingredient>): Promise<Ingredient>
async deleteIngredient(id: string): Promise<void>
```

### Rations
```typescript
async createRation(ration: Omit<Ration, 'id' | 'date_creation'>): Promise<Ration>
async getRationsParProjet(projetId: string): Promise<Ration[]>
async getRationById(id: string): Promise<Ration | null>
async updateRation(id: string, updates: Partial<Ration>): Promise<Ration>
async deleteRation(id: string): Promise<void>
async getRationParNom(nom: string, projetId: string): Promise<Ration | null>
async calculerCoutRationJour(rationId: string): Promise<number>
```

---

## ✅ RAPPORTS - À GARDER (Pas de Repository)

```typescript
async createRapportCroissance(rapport: Omit<RapportCroissance, 'id' | 'date_creation'>): Promise<RapportCroissance>
async getRapportsParProjet(projetId: string): Promise<RapportCroissance[]>
async getDernierRapport(projetId: string): Promise<RapportCroissance | null>
```

---

## ❌ À SUPPRIMER (Déjà dans Repositories)

### Finance
- createRevenu, getRevenusParProjet, updateRevenu, deleteRevenu
- createDepensePonctuelle, getDepensesPonctuellesParProjet, updateDepensePonctuelle, deleteDepensePonctuelle
- createChargeFixe, getChargesFixesActives, updateChargeFixe, deleteChargeFixe
- Toutes méthodes getRevenu*, getDepense*, getCharge*

### Reproduction
- createGestation, getGestationsParProjet, updateGestation, terminerGestation
- createSaillie, getSailliesParProjet, updateSaillie, deleteSaillie
- createSevrage, getSevragesParProjet, updateSevrage
- createChaleur, getChaleursParProjet, updateChaleur
- Toutes méthodes de stats reproduction

### Production
- createProductionAnimal, getProductionAnimaux, updateProductionAnimal, deleteProductionAnimal
- createPesee, getPeseesParAnimal, calculateGMQ
- Toutes méthodes d'animaux et pesées

### Stocks
- createStockAliment, getStocksAlimentsParProjet, updateStockAliment
- ajouterStockAliment, retirerStockAliment
- createStockMouvement, getMouvementsParStock
- Toutes méthodes de stocks

### Mortalités
- createMortalite, getMortalitesParProjet, updateMortalite, deleteMortalite
- getMortalitesParDateRange, getMortalitesParCategorie
- Toutes méthodes de mortalités

### Santé (Vaccinations)
- createVaccination, getVaccinationsByProjet, updateVaccination, deleteVaccination
- getVaccinationsByAnimal, getVaccinationsEnRetard
- Toutes méthodes de vaccinations

### Santé (Maladies & Traitements)  
- createMaladie, getMaladiesByProjet, updateMaladie, deleteMaladie
- createTraitement, getTraitementsByProjet, updateTraitement, deleteTraitement
- Toutes méthodes maladies et traitements

---

## 📊 Récapitulatif

| Catégorie | Méthodes à garder | Raison |
|-----------|-------------------|--------|
| **Core** | 7 | Essentiel (init, migrations) |
| **Projets** | 5 | Pas encore de repository |
| **Users** | 5 | Pas encore de repository |
| **Collaborateurs** | 5 | Pas encore de repository |
| **Planifications** | 6 | Pas encore de repository |
| **Nutrition** | 13 | Pas encore de repository |
| **Rapports** | 3 | Pas encore de repository |
| **TOTAL GARDER** | **~44 méthodes** | |
| | | |
| **Finance** | ~15 méthodes | ✅ Migré |
| **Reproduction** | ~20 méthodes | ✅ Migré |
| **Production** | ~15 méthodes | ✅ Migré |
| **Stocks** | ~10 méthodes | ✅ Migré |
| **Mortalités** | ~8 méthodes | ✅ Migré |
| **Santé** | ~20 méthodes | ✅ Migré |
| **TOTAL SUPPRIMER** | **~88 méthodes** | |

---

## 🎯 Estimation Finale

### Après Cleanup
```
Méthodes conservées:  ~44
Lignes estimées:      ~2000-2500
Réduction:            ~65-70%
```

---

**Date:** 21 Novembre 2025

