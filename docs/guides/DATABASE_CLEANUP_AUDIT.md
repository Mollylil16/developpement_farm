# 🔍 Audit Complet - Nettoyage database.ts

**Date:** 2025-01-27  
**Fichier:** `src/services/database.ts`  
**Taille actuelle:** 7277 lignes  
**Objectif:** Réduire à ~500 lignes

---

## 📊 Repositories Existants

### ✅ Déjà Créés
- `AnimalRepository` - CRUD animaux
- `PeseeRepository` - Gestion pesées
- `SevrageRepository` - Gestion sevrages
- `GestationRepository` - CRUD gestations
- `MortaliteRepository` - CRUD mortalités
- `VaccinationRepository` - CRUD vaccinations
- `StockRepository` - CRUD stocks
- `FinanceRepository` - Finance (à vérifier contenu)
- Marketplace repositories (6 fichiers)

### ❌ Manquants (à créer)
- `UserRepository` - CRUD utilisateurs
- `ProjetRepository` - CRUD projets
- `CalendrierVaccinationRepository` - Calendriers de vaccination
- `MaladieRepository` - CRUD maladies
- `TraitementRepository` - CRUD traitements
- `VisiteVeterinaireRepository` - CRUD visites vétérinaires
- `RappelVaccinationRepository` - CRUD rappels vaccination
- `IngredientRepository` - CRUD ingrédients
- `RationRepository` - CRUD rations
- `PlanificationRepository` - CRUD planifications
- `CollaborateurRepository` - CRUD collaborateurs

---

## 🔍 Fonctions Utilisées dans le Codebase

### User Operations (13 usages)
```typescript
// Fichiers utilisant:
- src/store/slices/authSlice.ts
- src/screens/ProfilScreen.tsx
- src/hooks/useProfilData.ts
- src/screens/AdminScreen.tsx

Fonctions:
✅ getUserById(id: string) - 4 usages
✅ createUser(input) - 3 usages
✅ getUserByEmail(email: string) - 3 usages
✅ updateUser(id, updates) - 1 usage
✅ getAllUsers() - 1 usage
```

### Projet Operations (11 usages)
```typescript
// Fichiers utilisant:
- src/store/slices/projetSlice.ts
- src/components/InvitationsModal.tsx
- src/screens/AdminScreen.tsx

Fonctions:
✅ getAllProjets(userId?: string) - 4 usages
✅ getProjetById(id: string) - 2 usages
✅ createProjet(input) - 1 usage
✅ updateProjet(id, updates, userId?) - 3 usages
✅ getProjetActif(userId?: string) - 1 usage
```

### Santé Operations (20+ usages)
```typescript
// Fichiers utilisant:
- src/store/slices/santeSlice.ts

Fonctions:
✅ getCalendrierVaccinationsByProjet(projetId) - 2 usages
✅ createCalendrierVaccination(input) - 1 usage
✅ updateCalendrierVaccination(id, updates) - 1 usage
✅ deleteCalendrierVaccination(id) - 1 usage
✅ getVaccinationsEnRetard(projetId) - 1 usage
✅ getVaccinationsAVenir(projetId) - 1 usage
✅ getMaladiesByProjet(projetId) - 1 usage
✅ createMaladie(input) - 1 usage
✅ updateMaladie(id, updates) - 1 usage
✅ deleteMaladie(id) - 1 usage
✅ getMaladiesEnCours(projetId) - 1 usage
✅ getTraitementsByProjet(projetId) - 1 usage
```

### Reproduction Operations (1 usage)
```typescript
// Fichiers utilisant:
- src/store/slices/reproductionSlice.ts

Fonctions:
✅ deleteSevrage(id) - 1 usage (déjà dans SevrageRepository!)
```

---

## 🎯 Plan de Migration

### Phase 1: Créer Repositories Manquants (Priorité Haute)
1. **UserRepository** - CRUD utilisateurs
2. **ProjetRepository** - CRUD projets
3. **CalendrierVaccinationRepository** - Calendriers vaccination
4. **MaladieRepository** - CRUD maladies
5. **TraitementRepository** - CRUD traitements

### Phase 2: Migrer les Appels
1. Migrer `authSlice.ts` → UserRepository
2. Migrer `projetSlice.ts` → ProjetRepository
3. Migrer `santeSlice.ts` → Repositories santé
4. Migrer `reproductionSlice.ts` → SevrageRepository (déjà créé!)

### Phase 3: Supprimer Code Dupliqué
- Supprimer toutes les fonctions CRUD de database.ts
- Garder uniquement: init, migrations, helpers

---

## ⚠️ Fonctions à GARDER dans database.ts

### Initialisation
- `initialize()` ✅
- `getDatabase()` ✅

### Migrations
- `createTables()` ✅
- `migrateTables()` ✅
- `createIndexesWithProjetId()` ✅

### Helpers
- `cleanup()` ✅
- `clearUserData()` ✅ (utilitaire spécial)
- `executeInTransaction()` (si existe) ✅

### Configuration
- Toute la configuration SQLite ✅

---

## 📝 Prochaines Actions

1. ✅ Créer UserRepository
2. ✅ Créer ProjetRepository
3. ✅ Créer CalendrierVaccinationRepository
4. ✅ Créer MaladieRepository
5. ✅ Créer TraitementRepository
6. Migrer les appels
7. Supprimer le code dupliqué
8. Tests

---

**Status:** 🟡 En cours d'audit

