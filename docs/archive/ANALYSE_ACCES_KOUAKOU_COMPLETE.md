# 🔍 Analyse Complète de l'Accès de Kouakou aux Données et Fonctionnalités

**Date:** 2025-01-XX  
**Objectif:** Évaluer si Kouakou a un accès à 100% à tous les menus, écrans, services et données nécessaires pour fournir des informations précises, complètes et en temps réel.

---

## 📊 Résumé Exécutif

**Couverture Actuelle:** ~65%  
**Lacunes Identifiées:** 12 actions manquantes  
**Priorité:** Haute

### ✅ Points Forts
- Accès complet aux finances (revenus, dépenses, charges fixes)
- Accès aux statistiques de base (animaux, pesées)
- Accès aux stocks d'aliments
- Support des vaccinations, traitements, visites vétérinaires
- Base de connaissances pour questions de formation

### ❌ Lacunes Critiques
1. **Reproduction** : Pas d'accès aux gestations, mises bas, sevrages
2. **Graphes Finances** : Pas de génération/description de graphiques
3. **Composition Alimentaire** : Pas de proposition personnalisée
4. **Mode Batch** : Accès limité aux données batch
5. **Mortalités** : Pas d'accès aux données de mortalité
6. **Ventes** : Accès limité (via revenus uniquement)
7. **Consommation** : Pas de calcul de consommation moyenne
8. **Porcelets** : Pas de suivi spécifique des porcelets
9. **Alertes Proactives** : Limitées aux rappels de vaccination

---

## 📋 Étape 1 : Mapping de la Structure Globale

### Menus et Écrans Principaux

| Menu | Écran | Fonctionnalités Clés |
|------|-------|---------------------|
| **Accueil** | DashboardScreen | Statistiques globales, actions rapides |
| **Ma Ferme** | ProductionScreen | Cheptel, animaux, pesées |
| **Finances** | FinanceScreen | Revenus, dépenses, charges fixes, **graphiques** |
| **Santé** | SanteScreen | Vaccinations, traitements, maladies, visites |
| **Reproduction** | ReproductionScreen | **Gestations, sevrages, mises bas** |
| **Nutrition** | NutritionScreen | Stocks, ingrédients, rations, **calculateur** |
| **Mortalité** | MortalityScreen | **Enregistrement et suivi des mortalités** |
| **Ventes** | SaleScreen | **Ventes de porcs** |
| **Formation** | TrainingScreen | Base de connaissances |
| **Marketplace** | MarketplaceScreen | Annonces, achats, ventes |

### Services Backend Disponibles

#### ✅ Finance
- `/finance/revenus` - GET, POST, PATCH, DELETE
- `/finance/depenses-ponctuelles` - GET, POST, PATCH, DELETE
- `/finance/charges-fixes` - GET, POST, PATCH, DELETE

#### ✅ Production
- `/production/animaux` - GET, POST, PATCH, DELETE
- `/production/pesees` - GET, POST, PATCH, DELETE

#### ✅ Santé
- `/sante/vaccinations` - GET, POST, PATCH, DELETE
- `/sante/traitements` - GET, POST, PATCH, DELETE
- `/sante/maladies` - GET, POST, PATCH, DELETE
- `/sante/visites-veterinaires` - GET, POST, PATCH, DELETE

#### ✅ Nutrition
- `/nutrition/ingredients` - GET, POST, PATCH, DELETE
- `/nutrition/stocks-aliments` - GET, POST, PATCH, DELETE
- `/nutrition/rations` - GET, POST, PATCH, DELETE

#### ❌ Reproduction (NON ACCESSIBLE PAR KOUAKOU)
- `/reproduction/gestations` - GET, POST, PATCH, DELETE
- `/reproduction/sevrages` - GET, POST, PATCH, DELETE
- `/reproduction/stats/gestations` - GET
- `/reproduction/stats/sevrages` - GET
- `/reproduction/stats/taux-survie` - GET

#### ❌ Mortalités (NON ACCESSIBLE PAR KOUAKOU)
- `/mortalites` - GET, POST, PATCH, DELETE

#### ⚠️ Batch (ACCÈS LIMITÉ)
- `/batch-pigs/*` - Endpoints batch disponibles mais non utilisés par Kouakou
- `/batch-weighings/*` - Pesées batch
- `/batch-vaccinations/*` - Vaccinations batch
- `/batch-sales/*` - Ventes batch
- `/batch-mortalities/*` - Mortalités batch

---

## 📋 Étape 2 : Évaluation de l'Accès Actuel de Kouakou

### Actions Disponibles (AgentActionExecutor)

#### ✅ Finance (3 actions)
- `create_revenu` ✅
- `create_depense` ✅
- `create_charge_fixe` ✅

#### ✅ Production (2 actions)
- `create_pesee` ✅
- `search_animal` ✅
- `search_lot` ✅

#### ✅ Santé (4 actions)
- `create_visite_veterinaire` ✅
- `create_vaccination` ✅
- `create_traitement` ✅
- `create_maladie` ✅ (implémenté dans AgentActionExecutor, pas dans module dédié)

#### ✅ Nutrition (2 actions)
- `create_ingredient` ✅
- `get_stock_status` ✅

#### ✅ Info (3 actions)
- `get_statistics` ✅
- `calculate_costs` ✅
- `analyze_data` ✅

#### ✅ Connaissances (2 actions)
- `answer_knowledge_question` ✅
- `list_knowledge_topics` ✅

#### ⚠️ Rappels (2 actions - implémentées dans AgentActionExecutor, pas dans module)
- `get_reminders` ✅ (mais limité aux vaccinations)
- `schedule_reminder` ✅ (mais limité aux vaccinations)

#### ❌ Actions Manquantes (12 actions)

1. **`get_gestations`** - Récupérer les gestations en cours
2. **`get_gestation_by_truie`** - Statut gestation d'une truie spécifique
3. **`predict_mise_bas`** - Date prévue de mise bas
4. **`get_sevrages`** - Récupérer les sevrages récents
5. **`get_porcelets`** - Liste des porcelets (naissances récentes)
6. **`get_porcelets_transition`** - Porcelets en transition (sevrage → croissance)
7. **`get_mortalites`** - Récupérer les mortalités
8. **`get_ventes`** - Récupérer les ventes (actuellement via revenus uniquement)
9. **`calculate_consommation_moyenne`** - Consommation moyenne par animal/bande
10. **`generate_graph_finances`** - Générer/extraire graphes finances
11. **`propose_composition_alimentaire`** - Proposition personnalisée de ration
12. **`get_batch_data`** - Accès aux données batch (pesées, ventes, etc.)

---

## 📋 Étape 3 : Vérification de la Couverture des Menus

### ✅ Menus Accessibles (7/10)

| Menu | Accès | Actions Disponibles | Lacunes |
|------|-------|---------------------|---------|
| **Accueil** | ✅ | `get_statistics`, `analyze_data` | - |
| **Ma Ferme** | ✅ | `search_animal`, `create_pesee` | Pas d'accès batch |
| **Finances** | ⚠️ | `create_revenu`, `create_depense`, `calculate_costs` | **Pas de graphes** |
| **Santé** | ✅ | `create_vaccination`, `create_traitement`, `create_maladie` | - |
| **Nutrition** | ⚠️ | `get_stock_status`, `create_ingredient` | **Pas de composition personnalisée** |
| **Reproduction** | ❌ | **AUCUNE ACTION** | **Toutes les fonctionnalités manquantes** |
| **Mortalité** | ❌ | **AUCUNE ACTION** | **Toutes les fonctionnalités manquantes** |
| **Ventes** | ⚠️ | `create_revenu` (générique) | **Pas d'accès spécifique aux ventes** |
| **Formation** | ✅ | `answer_knowledge_question` | - |
| **Marketplace** | ❌ | **AUCUNE ACTION** | **Pas d'accès au marketplace** |

---

## 📋 Étape 4 : Analyse Détaillée des Lacunes

### 🔴 Lacune 1 : Reproduction (CRITIQUE)

**Problème:** Kouakou ne peut pas répondre à :
- "Quelle est la date prévue de mise bas pour la truie P012 ?"
- "Combien de truies sont saillies ?"
- "Quels sont les porcelets nés ce mois ?"
- "Quels porcelets sont en transition (sevrage) ?"

**Endpoints Disponibles mais Non Utilisés:**
- `GET /reproduction/gestations?projet_id=xxx&en_cours=true`
- `GET /reproduction/gestations/:id`
- `GET /reproduction/sevrages?projet_id=xxx`
- `GET /reproduction/stats/gestations?projet_id=xxx`

**Solution:**
Créer `ReproductionActions.ts` avec :
- `getGestations` - Liste des gestations en cours
- `getGestationByTruie` - Gestation d'une truie spécifique
- `predictMiseBas` - Calcul de la date prévue (date_saillie + 114 jours)
- `getPorcelets` - Porcelets récents (animaux avec `categorie_poids === 'porcelet'` et `date_naissance` récente)
- `getPorceletsTransition` - Porcelets en sevrage (âge 18-28 jours)

### 🔴 Lacune 2 : Graphes Finances (IMPORTANT)

**Problème:** Kouakou ne peut pas :
- Extraire et décrire les graphiques de la section Finances
- Générer des graphiques à la demande
- Analyser les tendances visuelles

**Solution:**
Créer `FinanceGraphActions.ts` avec :
- `generateGraphFinances` - Génère des données de graphique (revenus/dépenses sur 6 mois)
- `describeGraphTrends` - Décrit les tendances textuellement
- Utilise les mêmes calculs que `FinanceGraphiquesComponent.tsx`

### 🟡 Lacune 3 : Composition Alimentaire Personnalisée (IMPORTANT)

**Problème:** Kouakou ne peut pas proposer une ration personnalisée basée sur :
- Stade de l'animal (porcelet, truie gestante, etc.)
- Race
- Ingrédients locaux disponibles
- Climat ivoirien

**Solution:**
Créer `NutritionActions.ts` (étendre) avec :
- `proposeCompositionAlimentaire` - Utilise `FORMULES_RECOMMANDEES` de `nutrition.ts`
- Adapte selon les ingrédients disponibles dans les stocks
- Prend en compte le stade et la race

### 🟡 Lacune 4 : Mode Batch (IMPORTANT)

**Problème:** Kouakou ne gère que le mode individuel. Les requêtes batch ne sont pas supportées.

**Solution:**
Adapter les actions existantes pour détecter le mode via `useModeElevage()` et utiliser les endpoints batch :
- `PeseeActions` → utiliser `/batch-weighings` si mode batch
- `VaccinationActions` → utiliser `/batch-vaccinations` si mode batch
- Créer `BatchActions.ts` pour actions spécifiques batch

### 🟡 Lacune 5 : Mortalités (IMPORTANT)

**Problème:** Kouakou ne peut pas :
- Récupérer les mortalités
- Analyser les causes de mortalité
- Calculer le taux de mortalité

**Solution:**
Créer `MortaliteActions.ts` avec :
- `getMortalites` - Liste des mortalités
- `getTauxMortalite` - Calcul du taux
- `analyzeCausesMortalite` - Analyse des causes

### 🟡 Lacune 6 : Ventes (MOYEN)

**Problème:** Les ventes sont enregistrées via `create_revenu` mais Kouakou ne peut pas :
- Lister les ventes spécifiques
- Analyser les ventes par période
- Calculer le nombre de porcs vendus

**Solution:**
Étendre `RevenuActions.ts` avec :
- `getVentes` - Liste des ventes (revenus avec `categorie === 'vente_porc'`)
- `analyzeVentes` - Analyse des ventes

### 🟡 Lacune 7 : Consommation (MOYEN)

**Problème:** Kouakou ne peut pas calculer la consommation moyenne d'aliments.

**Solution:**
Étendre `StockAlimentActions.ts` avec :
- `calculateConsommationMoyenne` - Calcule la consommation par animal/bande
- Utilise les données de stocks et le nombre d'animaux

---

## 📋 Étape 5 : Plan d'Implémentation

### Phase 1 : Actions Critiques (Priorité Haute)

1. **Créer `ReproductionActions.ts`**
   - `getGestations`
   - `getGestationByTruie`
   - `predictMiseBas`
   - `getPorcelets`
   - `getPorceletsTransition`

2. **Créer `MortaliteActions.ts`**
   - `getMortalites`
   - `getTauxMortalite`
   - `analyzeCausesMortalite`

3. **Étendre `AgentActionExecutor.ts`**
   - Ajouter les nouveaux types d'actions
   - Mapper vers les nouveaux modules

### Phase 2 : Actions Importantes (Priorité Moyenne)

4. **Créer `FinanceGraphActions.ts`**
   - `generateGraphFinances`
   - `describeGraphTrends`

5. **Étendre `StockAlimentActions.ts`**
   - `proposeCompositionAlimentaire`
   - `calculateConsommationMoyenne`

6. **Adapter pour Mode Batch**
   - Détecter le mode dans les actions
   - Utiliser les endpoints batch appropriés

### Phase 3 : Actions Complémentaires (Priorité Basse)

7. **Étendre `RevenuActions.ts`**
   - `getVentes`
   - `analyzeVentes`

8. **Mettre à jour `systemPrompt.ts`**
   - Ajouter les nouvelles actions au schéma
   - Ajouter des exemples

---

## 📋 Étape 6 : Tests et Validation

### Scénarios de Test

#### Test 1 : Reproduction
```
Utilisateur: "Quelle est la date prévue de mise bas pour la truie P012 ?"
Attendu: Kouakou récupère la gestation et calcule la date (date_saillie + 114 jours)
```

#### Test 2 : Graphes Finances
```
Utilisateur: "Montre-moi l'évolution des dépenses des 6 derniers mois"
Attendu: Kouakou génère les données de graphique et les décrit textuellement
```

#### Test 3 : Composition Alimentaire
```
Utilisateur: "Propose une ration pour truies gestantes avec ingrédients locaux"
Attendu: Kouakou propose une composition basée sur FORMULES_RECOMMANDEES et stocks disponibles
```

#### Test 4 : Mode Batch
```
Utilisateur: "Combien de porcs dans la bande B001 ?"
Attendu: Kouakou détecte le mode batch et utilise les endpoints batch
```

---

## 📊 Rapport de Couverture Final

### Couverture Actuelle: **65%**

| Domaine | Couverture | Actions Disponibles | Actions Manquantes |
|---------|------------|---------------------|-------------------|
| Finance | 80% | 3 | 1 (graphes) |
| Production | 70% | 3 | 1 (batch) |
| Santé | 100% | 4 | 0 |
| Nutrition | 50% | 2 | 2 (composition, consommation) |
| Reproduction | 0% | 0 | 5 |
| Mortalités | 0% | 0 | 3 |
| Ventes | 50% | 1 | 1 (analyse) |
| Connaissances | 100% | 2 | 0 |
| **TOTAL** | **65%** | **15** | **12** |

### Couverture Cible: **100%**

Après implémentation de toutes les actions manquantes, Kouakou aura un accès complet à :
- ✅ Toutes les données de reproduction
- ✅ Génération et description de graphes
- ✅ Composition alimentaire personnalisée
- ✅ Mode batch et individuel
- ✅ Mortalités et analyses
- ✅ Ventes détaillées
- ✅ Consommation moyenne

---

## 🎯 Conclusion

Kouakou a actuellement un accès à **65%** des fonctionnalités de l'application. Les lacunes principales concernent :
1. **Reproduction** (0% d'accès)
2. **Mortalités** (0% d'accès)
3. **Graphes Finances** (non accessible)
4. **Composition Alimentaire** (non accessible)
5. **Mode Batch** (accès limité)

L'implémentation des 12 actions manquantes permettra d'atteindre **100% de couverture** et de fournir des réponses complètes et précises à toutes les requêtes utilisateur.

---

## 📝 Prochaines Étapes

1. ✅ Analyser la structure actuelle (FAIT)
2. ⏳ Implémenter les actions manquantes (EN COURS)
3. ⏳ Mettre à jour le systemPrompt
4. ⏳ Tester tous les scénarios
5. ⏳ Valider la couverture à 100%

