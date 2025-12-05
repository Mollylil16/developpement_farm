# 📊 Phase 6 : Analyse de database.ts

**Date:** 21 Novembre 2025  
**Objectif:** Identifier méthodes à supprimer vs conserver

---

## 📏 État Actuel

- **Taille:** ~7665 lignes
- **Méthodes:** ~176 méthodes
- **Objectif final:** ~500 lignes

---

## ✅ Méthodes à GARDER (Essentielles)

### 1. Core (Initialisation & DB)
- `initialize()` - Initialise la connexion DB
- `createTables()` - Crée toutes les tables
- `migrateTables()` - Migrations de schéma
- `createIndexesWithProjetId()` - Index pour performance
- `getDatabase()` - Retourne instance DB
- `closeDatabase()` - Ferme connexion

**Raison:** Core fonctionnel, ne peut pas être déplacé

---

### 2. Projets (Gestion de base)
- `createProjet()`
- `getProjetById()`
- `getProjetsByUser()`
- `updateProjet()`
- `deleteProjet()`

**Raison:** Utilisé partout, pas migré vers repository

---

### 3. Users (Authentification)
- `createUser()`
- `getUserById()`
- `getUserByEmail()`
- `getUserByTelephone()`
- `updateUser()`

**Raison:** Auth critique, pas encore de UserRepository

---

### 4. Collaborateurs (Si pas de repository)
- `createCollaborateur()`
- `getCollaborateursParProjet()`
- `updateCollaborateur()`
- `deleteCollaborateur()`

**Raison:** Pas encore migré (à vérifier)

---

### 5. Planifications (Si pas de repository)
- `createPlanification()`
- `getPlanificationsParProjet()`
- `updatePlanification()`

**Raison:** Pas encore migré (à vérifier)

---

### 6. Nutrition (Ingrédients, Rations - Si pas de repository)
- `createIngredient()`
- `getIngredientsParProjet()`
- `createRation()`
- `getRationsParProjet()`

**Raison:** Pas encore migré (à vérifier)

---

## ❌ Méthodes à SUPPRIMER (Migrées vers Repositories)

### 1. Finance (→ FinanceService)

**Revenus:**
- ❌ `createRevenu()` → RevenuRepository.create()
- ❌ `getRevenusParProjet()` → RevenuRepository.findByProjet()
- ❌ `updateRevenu()` → RevenuRepository.update()
- ❌ `deleteRevenu()` → RevenuRepository.delete()
- ❌ `getRevenuById()` → RevenuRepository.findById()

**Dépenses Ponctuelles:**
- ❌ `createDepensePonctuelle()` → DepensePonctuelleRepository.create()
- ❌ `getDepensesPonctuellesParProjet()` → DepensePonctuelleRepository.findByProjet()
- ❌ `updateDepensePonctuelle()` → DepensePonctuelleRepository.update()
- ❌ `deleteDepensePonctuelle()` → DepensePonctuelleRepository.delete()

**Charges Fixes:**
- ❌ `createChargeFixe()` → ChargeFixeRepository.create()
- ❌ `getChargesFixesParProjet()` → ChargeFixeRepository.findByProjet()
- ❌ `updateChargeFixe()` → ChargeFixeRepository.update()
- ❌ `deleteChargeFixe()` → ChargeFixeRepository.delete()

---

### 2. Reproduction (→ Repositories Reproduction)

**Gestations:**
- ❌ `createGestation()` → GestationRepository.create()
- ❌ `getGestationsParProjet()` → GestationRepository.findByProjet()
- ❌ `getGestationById()` → GestationRepository.findById()
- ❌ `updateGestation()` → GestationRepository.update()
- ❌ `terminerGestation()` → GestationRepository.terminer()
- ❌ `getGestationsEnCours()` → GestationRepository.findEnCours()

**Saillies:**
- ❌ `createSaillie()` → SaillieRepository.create()
- ❌ `getSailliesParProjet()` → SaillieRepository.findByProjet()
- ❌ `updateSaillie()` → SaillieRepository.update()
- ❌ `deleteSaillie()` → SaillieRepository.delete()

**Sevrages:**
- ❌ `createSevrage()` → SevrageRepository.create()
- ❌ `getSevragesParProjet()` → SevrageRepository.findByProjet()
- ❌ `getSevrageParGestation()` → SevrageRepository.findByGestation()
- ❌ `updateSevrage()` → SevrageRepository.update()

**Chaleurs:**
- ❌ `createChaleur()` → ChaleurRepository.create()
- ❌ `getChaleursParProjet()` → ChaleurRepository.findByProjet()
- ❌ `updateChaleur()` → ChaleurRepository.update()

---

### 3. Production (→ AnimalRepository, PeseeRepository)

**Animaux:**
- ❌ `createProductionAnimal()` → AnimalRepository.create()
- ❌ `getProductionAnimaux()` → AnimalRepository.findByProjet()
- ❌ `getProductionAnimalById()` → AnimalRepository.findById()
- ❌ `updateProductionAnimal()` → AnimalRepository.update()
- ❌ `deleteProductionAnimal()` → AnimalRepository.delete()
- ❌ `getProductionAnimauxActifs()` → AnimalRepository.findActifs()

**Pesées:**
- ❌ `createPesee()` → PeseeRepository.create()
- ❌ `getPeseesParAnimal()` → PeseeRepository.findByAnimal()
- ❌ `getPeseesParProjet()` → PeseeRepository.findByProjet()
- ❌ `getDernierePesee()` → PeseeRepository.findDerniere()
- ❌ `calculateGMQ()` → PeseeRepository.calculateGMQ()

---

### 4. Stocks (→ StockRepository)

**Stocks Aliments:**
- ❌ `createStockAliment()` → StockRepository.create()
- ❌ `getStocksAlimentsParProjet()` → StockRepository.findByProjet()
- ❌ `getStockAlimentById()` → StockRepository.findById()
- ❌ `updateStockAliment()` → StockRepository.update()
- ❌ `deleteStockAliment()` → StockRepository.delete()
- ❌ `ajouterStockAliment()` → StockRepository.ajouterStock()
- ❌ `retirerStockAliment()` → StockRepository.retirerStock()

**Mouvements:**
- ❌ `createStockMouvement()` → StockRepository.ajouterStock/retirerStock
- ❌ `getMouvementsParStock()` → StockRepository.getMouvements()

---

### 5. Mortalités (→ MortaliteRepository)

- ❌ `createMortalite()` → MortaliteRepository.create()
- ❌ `getMortalitesParProjet()` → MortaliteRepository.findByProjet()
- ❌ `getMortaliteById()` → MortaliteRepository.findById()
- ❌ `updateMortalite()` → MortaliteRepository.update()
- ❌ `deleteMortalite()` → MortaliteRepository.delete()
- ❌ `getMortalitesParDateRange()` → MortaliteRepository.findByDateRange()
- ❌ `getMortalitesParCategorie()` → MortaliteRepository.findByCategorie()

---

### 6. Santé (→ VaccinationRepository + autres)

**Vaccinations:**
- ❌ `createVaccination()` → VaccinationRepository.create()
- ❌ `getVaccinationsParProjet()` → VaccinationRepository.findByProjet()
- ❌ `getVaccinationsByAnimal()` → VaccinationRepository.findByAnimal()
- ❌ `updateVaccination()` → VaccinationRepository.update()
- ❌ `deleteVaccination()` → VaccinationRepository.delete()

**Maladies (si MaladieRepository existe):**
- ❌ `createMaladie()`
- ❌ `getMaladiesParProjet()`
- ❌ `getMaladiesByAnimal()`
- ❌ `updateMaladie()`

**Traitements (si TraitementRepository existe):**
- ❌ `createTraitement()`
- ❌ `getTraitementsParProjet()`
- ❌ `getTraitementsByAnimal()`
- ❌ `updateTraitement()`

---

## 📊 Résumé des Suppressions

| Catégorie | Méthodes à supprimer | Repository destination |
|-----------|---------------------|------------------------|
| **Finance** | ~15 | RevenuRepo, DepenseRepo, ChargeRepo |
| **Reproduction** | ~20 | GestationRepo, SaillieRepo, SevrageRepo, ChaleurRepo |
| **Production** | ~15 | AnimalRepository, PeseeRepository |
| **Stocks** | ~10 | StockRepository |
| **Mortalités** | ~8 | MortaliteRepository |
| **Santé** | ~15 | VaccinationRepo, MaladieRepo, TraitementRepo |
| **TOTAL** | **~83 méthodes** | **~15 repositories** |

---

## 📏 Estimation Lignes

### Avant Cleanup
```
Total:                    ~7665 lignes
Méthodes migrées:         ~5000 lignes (65%)
À conserver:              ~2665 lignes (35%)
```

### Après Cleanup Estimé
```
Core (init, tables, migrations):  ~1500 lignes
Projets:                          ~200 lignes
Users:                            ~150 lignes
Collaborateurs:                   ~150 lignes
Planifications:                   ~100 lignes
Nutrition:                        ~200 lignes
Utils:                            ~100 lignes
-----------------------------------------
TOTAL ESTIMÉ:                     ~2400 lignes
```

**Note:** Peut être encore réduit si on migre Collaborateurs, Planifications, Nutrition vers repositories.

---

## ⚠️ Vérifications Avant Suppression

### 1. Vérifier qu'aucun fichier n'utilise directement database.ts

**Commandes:**
```bash
# Chercher imports de databaseService
grep -r "from.*database" src/ --include="*.ts" --include="*.tsx"

# Chercher appels directs
grep -r "databaseService\." src/ --include="*.ts" --include="*.tsx"
```

### 2. Vérifier que tous les slices utilisent repositories

**Déjà fait en Phase 4:** ✅
- financeSlice → FinanceService
- reproductionSlice → Repositories reproduction
- productionSlice → AnimalRepository, PeseeRepository
- stocksSlice → StockRepository
- mortalitesSlice → MortaliteRepository
- santeSlice → VaccinationRepository

### 3. Tests après suppression

**À tester:**
- [ ] Création de données (CRUD)
- [ ] Lecture de données
- [ ] Mise à jour
- [ ] Suppression
- [ ] Statistiques
- [ ] Filtres et recherches

---

## 🎯 Plan de Suppression

### Étape 1: Backup
```bash
cp src/services/database.ts src/services/database.ts.backup
```

### Étape 2: Suppression Progressive

**Ordre recommandé:**
1. Finance (12-15 méthodes)
2. Reproduction (18-20 méthodes)
3. Production (12-15 méthodes)
4. Stocks (8-10 méthodes)
5. Mortalités (6-8 méthodes)
6. Santé (12-15 méthodes)

**Après chaque suppression:**
- Vérifier compilation TypeScript
- Lancer tests
- Tester manuellement feature concernée

### Étape 3: Nettoyage Final

- Supprimer imports inutilisés
- Supprimer types inutilisés
- Nettoyer commentaires obsolètes
- Formatter le code

---

## 🚀 Prochaines Actions

1. ✅ Créer ce fichier d'analyse
2. ⏳ Créer backup de database.ts
3. ⏳ Commencer suppression Finance
4. ⏳ Suppression Reproduction
5. ⏳ Suppression Production
6. ⏳ Suppression Stocks
7. ⏳ Suppression Mortalités
8. ⏳ Suppression Santé
9. ⏳ Nettoyage imports/types
10. ⏳ Tests complets
11. ⏳ Documentation

---

**Estimation temps:** 1-2 heures  
**Risque:** Faible (tout est dans repositories)  
**Bénéfice:** Énorme (code 3x plus petit)

---

**Date de création:** 21 Novembre 2025  
**Version:** 1.0.0

