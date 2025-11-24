# 🧹 Phase 6 : Guide de Cleanup database.ts

**Date:** 21 Novembre 2025  
**Objectif:** Réduire database.ts de ~7665 lignes à ~2000-2500 lignes

---

## ⚠️ IMPORTANT - Approche Sécurisée

**Ne PAS supprimer tout d'un coup !**

Au lieu de ça, nous allons:
1. ✅ Créer un backup (fait)
2. ✅ Documenter précisément ce qui doit partir/rester (fait)
3. **🎯 Créer un nouveau fichier propre** (`database.clean.ts`)
4. **Copier** uniquement les méthodes à garder
5. Tester le nouveau fichier
6. Si OK, remplacer l'ancien

---

## 📊 Résumé de ce qu'on garde

### CORE (Obligatoire)
- `initialize()`, `createTables()`, `migrateTables()`, `createIndexesWithProjetId()`
- `getDatabase()`, `closeDatabase()`
- `repairMissingIndexes()`

### Modules SANS Repository (À garder)
- **Projets:** CRUD complet (5 méthodes)
- **Users:** CRUD complet (5 méthodes)
- **Collaborateurs:** CRUD complet (5 méthodes)
- **Planifications:** CRUD complet (6 méthodes)
- **Nutrition:** Ingrédients + Rations (13 méthodes)
- **Rapports:** Rapports croissance (3 méthodes)

### Modules AVEC Repository (À SUPPRIMER)
- ❌ **Finance:** Tout (Revenus, Dépenses, Charges)
- ❌ **Reproduction:** Tout (Gestations, Saillies, Sevrages, Chaleurs)
- ❌ **Production:** Tout (Animaux, Pesées)
- ❌ **Stocks:** Tout (Aliments, Mouvements)
- ❌ **Mortalités:** Tout
- ❌ **Santé:** Tout (Vaccinations, Maladies, Traitements)

---

## 🎯 Plan d'Action Recommandé

### Option A: Cleanup Manuel Progressif (SÛRE mais LONGUE)

**Avantage:** Très sûr, on teste à chaque étape  
**Inconvénient:** Prend 2-3 heures

**Étapes:**
1. Supprimer méthodes Finance (test)
2. Supprimer méthodes Reproduction (test)
3. Supprimer méthodes Production (test)
4. Supprimer méthodes Stocks (test)
5. Supprimer méthodes Mortalités (test)
6. Supprimer méthodes Santé (test)
7. Nettoyer imports
8. Test final

---

### Option B: Nouveau Fichier Propre (RAPIDE mais Risquée)

**Avantage:** Très rapide (30 min)  
**Inconvénient:** Risque d'oublier des méthodes utiles

**Étapes:**
1. Créer `database.clean.ts`
2. Copier CORE + méthodes à garder
3. Tester intensivement
4. Si OK → remplacer

---

### Option C: Commentage Massif (INTERMÉDIAIRE)

**Avantage:** Réversible facilement  
**Inconvénient:** Fichier reste gros temporairement

**Étapes:**
1. Commenter (/* */) toutes les méthodes à supprimer
2. Tester que tout fonctionne
3. Si OK → supprimer les commentaires
4. Nettoyer

---

## 🚀 Je Recommande: Option B (Nouveau Fichier)

**Pourquoi ?**
- Plus rapide
- Plus propre
- On garde l'ancien en backup
- Facile de revenir en arrière

---

## 📝 Structure du Nouveau Fichier

```typescript
/**
 * Service de base de données SQLite - Version Nettoyée
 * Seules les méthodes non migrées vers repositories
 */

import * as SQLite from 'expo-sqlite';
import { Projet, User, Collaborateur, ... } from '../types';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  // ========================================
  // CORE - Initialisation & Migrations
  // ========================================
  
  async initialize(): Promise<void> { ... }
  private async createTables(): Promise<void> { ... }
  private async migrateTables(): Promise<void> { ... }
  private async createIndexesWithProjetId(): Promise<void> { ... }
  async repairMissingIndexes(): Promise<...> { ... }
  
  getDatabase(): SQLite.SQLiteDatabase { ... }
  async closeDatabase(): Promise<void> { ... }

  // ========================================
  // PROJETS
  // ========================================
  
  async createProjet(...) { ... }
  async getProjetById(...) { ... }
  async getProjetsByUser(...) { ... }
  async updateProjet(...) { ... }
  async deleteProjet(...) { ... }

  // ========================================
  // USERS
  // ========================================
  
  async createUser(...) { ... }
  async getUserById(...) { ... }
  async getUserByEmail(...) { ... }
  async getUserByTelephone(...) { ... }
  async updateUser(...) { ... }

  // ========================================
  // COLLABORATEURS
  // ========================================
  
  async createCollaborateur(...) { ... }
  async getCollaborateursParProjet(...) { ... }
  async getCollaborateurById(...) { ... }
  async updateCollaborateur(...) { ... }
  async deleteCollaborateur(...) { ... }

  // ========================================
  // PLANIFICATIONS
  // ========================================
  
  async createPlanification(...) { ... }
  async getPlanificationsParProjet(...) { ... }
  async getPlanificationById(...) { ... }
  async updatePlanification(...) { ... }
  async deletePlanification(...) { ... }
  async getPlanificationParAnimal(...) { ... }

  // ========================================
  // NUTRITION - Ingrédients
  // ========================================
  
  async createIngredient(...) { ... }
  async getIngredientsParProjet(...) { ... }
  async getIngredientById(...) { ... }
  async updateIngredient(...) { ... }
  async deleteIngredient(...) { ... }

  // ========================================
  // NUTRITION - Rations
  // ========================================
  
  async createRation(...) { ... }
  async getRationsParProjet(...) { ... }
  async getRationById(...) { ... }
  async updateRation(...) { ... }
  async deleteRation(...) { ... }
  async getRationParNom(...) { ... }
  async calculerCoutRationJour(...) { ... }

  // ========================================
  // RAPPORTS CROISSANCE
  // ========================================
  
  async createRapportCroissance(...) { ... }
  async getRapportsParProjet(...) { ... }
  async getDernierRapport(...) { ... }
}

export const databaseService = new DatabaseService();
export const getDatabase = () => databaseService.getDatabase();
```

**Estimation:** ~2000-2500 lignes

---

## ✅ Checklist Post-Cleanup

### Tests Manuels
- [ ] L'app démarre
- [ ] Création projet
- [ ] Authentification
- [ ] Navigation
- [ ] Lecture données existantes
- [ ] Création nouvelles données (via repositories)
- [ ] Statistiques/dashboards

### Tests Techniques
```bash
npm run type-check   # 0 erreur
npm run lint         # 0 warning
npm test             # Tous passent
```

### Vérifications Code
- [ ] Aucun import de méthodes supprimées
- [ ] Tous les slices utilisent repositories
- [ ] getDatabase() toujours accessible
- [ ] Migrations toujours présentes

---

## 🎯 Prochaine Action

**Choisir l'option:**
- 🟢 Option B (Nouveau fichier) - **RECOMMANDÉE**
- 🟡 Option A (Manuel progressif)
- 🟡 Option C (Commentage)

**Une fois choisi, on procède !**

---

**Temps estimé:**
- Option A: 2-3h
- Option B: 30-45min ⭐
- Option C: 1-2h

---

**Date:** 21 Novembre 2025

