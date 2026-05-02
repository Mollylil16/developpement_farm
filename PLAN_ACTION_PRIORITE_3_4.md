# 🎯 Plan d'Action - PRIORITÉ 3 & 4

**Objectif** : Migration complète SQLite → PostgreSQL + Création de tous les endpoints backend

---

## 📊 INVENTAIRE DES TABLES SQLite À MIGRER

### ✅ Tables déjà migrées
- ✅ `users` - Migration `000_create_users_table.sql`
- ✅ `refresh_tokens` - Migration `001_create_refresh_tokens.sql`

### ❌ Tables à migrer (28 tables)

#### Core (2 tables)
1. `projets` - Projets (fermes)
2. `regional_pork_price` - Prix régionaux du porc

#### Production (6 tables)
3. `animaux` - Animaux (porcs)
4. `pesees` - Pesées des animaux
5. `gestations` - Gestations
6. `sevrages` - Sevrages
7. `mortalites` - Mortalités
8. `planifications` - Planifications

#### Finance (3 tables)
9. `revenus` - Revenus
10. `depenses_ponctuelles` - Dépenses ponctuelles
11. `charges_fixes` - Charges fixes

#### Nutrition (7 tables)
12. `ingredients` - Ingrédients
13. `rations` - Rations
14. `ingredients_ration` - Lien ingredients-rations
15. `stocks_aliments` - Stocks d'aliments
16. `stocks_mouvements` - Mouvements de stock
17. `rations_budget` - Budgets de rations
18. `rapports_croissance` - Rapports de croissance

#### Santé (6 tables)
19. `calendrier_vaccinations` - Calendrier de vaccinations
20. `vaccinations` - Vaccinations effectuées
21. `maladies` - Maladies
22. `traitements` - Traitements médicaux
23. `visites_veterinaires` - Visites vétérinaires
24. `rappels_vaccinations` - Rappels de vaccinations

#### Collaboration (1 table)
25. `collaborations` - Collaborateurs

#### Marketplace (à vérifier)
26. Tables marketplace (listings, offers, etc.)

#### Autres (2 tables)
27. `veterinarians` - Vétérinaires
28. `chat_agent_conversations` - Conversations chat agent
29. `chat_agent_messages` - Messages chat agent

---

## 🔄 PRIORITÉ 3 : MIGRATION POSTGRESQL

### Étape 3.1 : Créer toutes les migrations PostgreSQL

**Structure** : `backend/database/migrations/XXX_create_<table>.sql`

**Ordre de création** :
1. Tables core (projets, regional_pork_price)
2. Tables production (animaux, pesees, gestations, sevrages, mortalites, planifications)
3. Tables finance (revenus, depenses_ponctuelles, charges_fixes)
4. Tables nutrition (ingredients, rations, ingredients_ration, stocks_aliments, stocks_mouvements, rations_budget, rapports_croissance)
5. Tables santé (calendrier_vaccinations, vaccinations, maladies, traitements, visites_veterinaires, rappels_vaccinations)
6. Tables collaboration (collaborations)
7. Tables autres (veterinarians, chat_agent_*)

### Étape 3.2 : Convertir les schémas SQLite → PostgreSQL

**Différences à gérer** :
- `INTEGER PRIMARY KEY` → `TEXT PRIMARY KEY` (on utilise TEXT pour les IDs)
- `TEXT` → `TEXT` (identique)
- `REAL` → `NUMERIC` ou `DECIMAL`
- `INTEGER` → `INTEGER` ou `BIGINT`
- `CHECK (is_active IN (0, 1))` → `BOOLEAN DEFAULT TRUE`
- `CURRENT_TIMESTAMP` → `DEFAULT NOW()`
- `FOREIGN KEY` → Ajouter les contraintes
- Index → Créer les index PostgreSQL

### Étape 3.3 : Script de migration SQLite → PostgreSQL

**Fichier** : `backend/scripts/migrate-sqlite-to-postgres.ts`

**Fonctionnalités** :
1. Lire toutes les données SQLite
2. Convertir les types de données
3. Insérer dans PostgreSQL
4. Gérer les relations (foreign keys)
5. Logs détaillés

---

## 🚀 PRIORITÉ 4 : ENDPOINTS BACKEND + ADAPTATION FRONTEND

### Étape 4.1 : Créer les modules NestJS

**Structure par domaine** :
```
backend/src/
├── projets/          # Module Projets
├── production/       # Module Production (animaux, pesées)
├── reproduction/     # Module Reproduction (gestations, sevrages)
├── finance/          # Module Finance (revenus, dépenses, charges)
├── nutrition/        # Module Nutrition (ingredients, rations, stocks)
├── sante/            # Module Santé (vaccinations, maladies, traitements)
├── planning/         # Module Planification
├── collaboration/    # Module Collaboration
├── marketplace/      # Module Marketplace
└── reports/          # Module Rapports
```

### Étape 4.2 : Créer les endpoints pour chaque module

**Pattern standard par module** :
- `GET /<module>/<resource>?projet_id=xxx` - Liste
- `GET /<module>/<resource>/:id` - Détails
- `POST /<module>/<resource>` - Créer
- `PATCH /<module>/<resource>/:id` - Modifier
- `DELETE /<module>/<resource>/:id` - Supprimer
- Endpoints spécifiques selon les besoins

### Étape 4.3 : Adapter les slices Redux

**Pour chaque slice** :
1. Remplacer les appels SQLite par des appels `apiClient`
2. Adapter les thunks pour utiliser l'API
3. Gérer les erreurs réseau
4. Gérer le mode hors ligne (si nécessaire)

---

## 📋 PLAN D'EXÉCUTION DÉTAILLÉ

### Phase 1 : Migrations PostgreSQL (PRIORITÉ 3)

#### Jour 1 : Core & Production
- [ ] Migration `003_create_projets_table.sql`
- [ ] Migration `004_create_regional_pork_price_table.sql`
- [ ] Migration `005_create_animaux_table.sql`
- [ ] Migration `006_create_pesees_table.sql`
- [ ] Migration `007_create_gestations_table.sql`
- [ ] Migration `008_create_sevrages_table.sql`
- [ ] Migration `009_create_mortalites_table.sql`
- [ ] Migration `010_create_planifications_table.sql`

#### Jour 2 : Finance & Nutrition
- [ ] Migration `011_create_revenus_table.sql`
- [ ] Migration `012_create_depenses_ponctuelles_table.sql`
- [ ] Migration `013_create_charges_fixes_table.sql`
- [ ] Migration `014_create_ingredients_table.sql`
- [ ] Migration `015_create_rations_table.sql`
- [ ] Migration `016_create_ingredients_ration_table.sql`
- [ ] Migration `017_create_stocks_aliments_table.sql`
- [ ] Migration `018_create_stocks_mouvements_table.sql`
- [ ] Migration `019_create_rations_budget_table.sql`
- [ ] Migration `020_create_rapports_croissance_table.sql`

#### Jour 3 : Santé & Autres
- [ ] Migration `021_create_calendrier_vaccinations_table.sql`
- [ ] Migration `022_create_vaccinations_table.sql`
- [ ] Migration `023_create_maladies_table.sql`
- [ ] Migration `024_create_traitements_table.sql`
- [ ] Migration `025_create_visites_veterinaires_table.sql`
- [ ] Migration `026_create_rappels_vaccinations_table.sql`
- [ ] Migration `027_create_collaborations_table.sql`
- [ ] Migration `028_create_veterinarians_table.sql`
- [ ] Migration `029_create_chat_agent_tables.sql`

#### Jour 4 : Script de Migration
- [ ] Compléter `migrate-sqlite-to-postgres.ts`
- [ ] Tester la migration complète
- [ ] Vérifier l'intégrité des données

### Phase 2 : Endpoints Backend (PRIORITÉ 4)

#### Jour 5 : Module Projets
- [ ] Créer `projets.module.ts`
- [ ] Créer `projets.controller.ts`
- [ ] Créer `projets.service.ts`
- [ ] Créer les DTOs
- [ ] Endpoints : GET, POST, PATCH, DELETE

#### Jour 6 : Module Production
- [ ] Créer `production.module.ts`
- [ ] Créer `production.controller.ts` (animaux + pesées)
- [ ] Créer `production.service.ts`
- [ ] Créer les DTOs
- [ ] Endpoints : GET, POST, PATCH, DELETE pour animaux et pesées

#### Jour 7 : Module Reproduction
- [ ] Créer `reproduction.module.ts`
- [ ] Créer `reproduction.controller.ts` (gestations + sevrages)
- [ ] Créer `reproduction.service.ts`
- [ ] Créer les DTOs
- [ ] Endpoints : GET, POST, PATCH, DELETE

#### Jour 8 : Module Finance
- [ ] Créer `finance.module.ts`
- [ ] Créer `finance.controller.ts` (revenus + dépenses + charges)
- [ ] Créer `finance.service.ts`
- [ ] Créer les DTOs
- [ ] Endpoints : GET, POST, PATCH, DELETE

#### Jour 9 : Module Nutrition
- [ ] Créer `nutrition.module.ts`
- [ ] Créer `nutrition.controller.ts` (ingredients + rations + stocks)
- [ ] Créer `nutrition.service.ts`
- [ ] Créer les DTOs
- [ ] Endpoints : GET, POST, PATCH, DELETE

#### Jour 10 : Module Santé
- [ ] Créer `sante.module.ts`
- [ ] Créer `sante.controller.ts` (vaccinations + maladies + traitements)
- [ ] Créer `sante.service.ts`
- [ ] Créer les DTOs
- [ ] Endpoints : GET, POST, PATCH, DELETE

#### Jour 11 : Modules Restants
- [ ] Module Planning
- [ ] Module Collaboration
- [ ] Module Reports
- [ ] Module Marketplace (si nécessaire)

### Phase 3 : Adaptation Frontend (PRIORITÉ 4)

#### Jour 12-13 : Slices Redux
- [ ] Adapter `projetSlice.ts` pour utiliser l'API
- [ ] Adapter `productionSlice.ts` pour utiliser l'API
- [ ] Adapter `reproductionSlice.ts` pour utiliser l'API
- [ ] Adapter `financeSlice.ts` pour utiliser l'API
- [ ] Adapter `nutritionSlice.ts` pour utiliser l'API
- [ ] Adapter `stocksSlice.ts` pour utiliser l'API
- [ ] Adapter `santeSlice.ts` pour utiliser l'API
- [ ] Adapter `planificationSlice.ts` pour utiliser l'API
- [ ] Adapter `collaborationSlice.ts` pour utiliser l'API
- [ ] Adapter `reportsSlice.ts` pour utiliser l'API
- [ ] Adapter `mortalitesSlice.ts` pour utiliser l'API

#### Jour 14 : Tests & Vérifications
- [ ] Tester tous les endpoints
- [ ] Vérifier les imports
- [ ] Corriger les erreurs
- [ ] Tester sur téléphone

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Créer les migrations PostgreSQL** (Phase 1, Jours 1-3)
2. **Exécuter les migrations** (Phase 1, Jour 4)
3. **Créer les modules backend** (Phase 2, Jours 5-11)
4. **Adapter le frontend** (Phase 3, Jours 12-13)
5. **Tests finaux** (Phase 3, Jour 14)

---

**Date de création** : 2025-01-09  
**Statut** : Prêt à commencer

