# 📊 État du Nettoyage database.ts

**Date:** 2025-01-27  
**Fichier:** `src/services/database.ts`  
**Taille actuelle:** 7277 lignes  
**Objectif:** Réduire à ~500 lignes

---

## ✅ Réalisé

### 1. Audit Complet
- ✅ Identifié toutes les fonctions utilisées dans le codebase
- ✅ Documenté dans `DATABASE_CLEANUP_AUDIT.md`
- ✅ Identifié 13 fichiers utilisant `databaseService` directement

### 2. Repositories Créés
- ✅ **UserRepository** - CRUD utilisateurs (créé)
- ✅ **ProjetRepository** - CRUD projets (créé)
- ✅ Ajoutés à `src/database/repositories/index.ts`

### 3. Repositories Existants (17)
- ✅ AnimalRepository
- ✅ PeseeRepository
- ✅ SevrageRepository
- ✅ GestationRepository
- ✅ MortaliteRepository
- ✅ VaccinationRepository
- ✅ StockRepository
- ✅ FinanceRepository (Revenu, Depense, ChargeFixe)
- ✅ Marketplace repositories (6 fichiers)

---

## 🚧 En Cours / À Faire

### Phase 1: Migration des Appels (Priorité Haute)

#### User Operations (13 usages à migrer)
**Fichiers:**
- `src/store/slices/authSlice.ts` (4 usages)
- `src/screens/ProfilScreen.tsx` (2 usages)
- `src/hooks/useProfilData.ts` (1 usage)
- `src/screens/AdminScreen.tsx` (1 usage)

**Fonctions à migrer:**
```typescript
// Avant:
await databaseService.getUserById(id)
await databaseService.createUser(input)
await databaseService.getUserByEmail(email)
await databaseService.updateUser(id, updates)
await databaseService.getAllUsers()

// Après:
const db = await getDatabase();
const userRepo = new UserRepository(db);
await userRepo.findById(id)
await userRepo.create(input)
await userRepo.findByEmail(email)
await userRepo.update(id, updates)
await userRepo.findAll()
```

#### Projet Operations (11 usages à migrer)
**Fichiers:**
- `src/store/slices/projetSlice.ts` (8 usages)
- `src/components/InvitationsModal.tsx` (1 usage)
- `src/screens/AdminScreen.tsx` (2 usages)

**Fonctions à migrer:**
```typescript
// Avant:
await databaseService.getAllProjets(userId)
await databaseService.getProjetById(id)
await databaseService.createProjet(input)
await databaseService.updateProjet(id, updates, userId)
await databaseService.getProjetActif(userId)

// Après:
const db = await getDatabase();
const projetRepo = new ProjetRepository(db);
await projetRepo.findAllByUserId(userId)
await projetRepo.getById(id)
await projetRepo.create(input)
await projetRepo.update(id, updates, userId)
await projetRepo.findActiveByUserId(userId)
```

### Phase 2: Repositories Manquants (Priorité Moyenne)

#### Santé Operations (20+ usages)
- ❌ **CalendrierVaccinationRepository** - À créer
- ❌ **MaladieRepository** - À créer
- ❌ **TraitementRepository** - À créer
- ❌ **VisiteVeterinaireRepository** - À créer
- ❌ **RappelVaccinationRepository** - À créer

**Fichiers utilisant:**
- `src/store/slices/santeSlice.ts`

### Phase 3: Suppression Code Dupliqué

Une fois toutes les migrations faites:
- ❌ Supprimer `createUser`, `getUserById`, etc. de database.ts
- ❌ Supprimer `createProjet`, `getProjetById`, etc. de database.ts
- ❌ Supprimer toutes les fonctions CRUD dupliquées
- ✅ Garder uniquement: init, migrations, helpers

---

## 📈 Progression

| Phase | Status | Progression |
|-------|--------|------------|
| Audit | ✅ | 100% |
| Repositories User/Projet | ✅ | 100% |
| Migration User/Projet | 🚧 | 0% |
| Repositories Santé | ❌ | 0% |
| Migration Santé | ❌ | 0% |
| Suppression Code | ❌ | 0% |
| Tests | ❌ | 0% |

**Progression globale: ~20%**

---

## 🎯 Prochaines Étapes

1. **Immédiat:** Migrer les appels User/Projet vers les repositories
2. **Court terme:** Créer les repositories Santé manquants
3. **Moyen terme:** Migrer tous les appels Santé
4. **Long terme:** Supprimer le code dupliqué et tester

---

## ⚠️ Notes Importantes

- La création des animaux initiaux lors de la création d'un projet reste dans `database.ts` pour l'instant (logique complexe)
- Certaines fonctions statistiques peuvent rester dans `database.ts` si elles sont spécifiques
- Tester après chaque migration pour éviter les régressions

---

**Status:** 🟡 En cours - Repositories créés, migration à faire

