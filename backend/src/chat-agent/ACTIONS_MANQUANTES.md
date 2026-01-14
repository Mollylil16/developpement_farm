# Actions Manquantes - Backend Gemini Functions

## 📊 Résumé
- **Actions frontend (AgentActionExecutor)** : 55 actions
- **Actions backend (toolDeclarations)** : 24 actions
- **Actions manquantes** : 39 actions

## ✅ Actions Déjà Implémentées (24)
1. `create_expense` ✅
2. `create_revenue` ✅
3. `get_transactions` ✅
4. `modify_transaction` ✅
5. `search_knowledge_base` ✅
6. `get_financial_summary` ✅
7. `create_fixed_charge` ✅
8. `generate_financial_graph` ✅
9. `get_market_price_trends` ✅
10. `create_marketplace_listing` ✅ (retourne erreur informative)
11. `update_listing_price` ✅
12. `get_my_listings` ✅
13. `check_offers` ✅
14. `respond_to_offer` ✅
15. `get_animals` ✅
16. `search_animal` ✅
17. `create_weighing` ✅
18. `get_project_stats` ✅
19. `get_animal_statistics` ✅
20. `create_vaccination` ✅
21. `create_treatment` ✅
22. `create_vet_visit` ✅
23. `get_health_reminders` ✅
24. `list_knowledge_topics` ✅

## ❌ Actions Manquantes (39)

### 🔴 PRIORITÉ HAUTE - Finance (8 actions)
Ces actions sont essentielles pour la gestion financière complète :

1. **`update_revenu`** - Modifier un revenu existant
   - Utilise `FinanceService.updateRevenu`
   - Paramètres : `id`, `updates` (amount, source, description, date)

2. **`delete_revenu`** - Supprimer un revenu
   - Utilise `FinanceService.deleteRevenu`
   - Paramètres : `id`

3. **`update_depense`** - Modifier une dépense existante
   - Utilise `FinanceService.updateDepensePonctuelle`
   - Paramètres : `id`, `updates` (amount, category, description, date)

4. **`delete_depense`** - Supprimer une dépense
   - Utilise `FinanceService.deleteDepensePonctuelle`
   - Paramètres : `id`

5. **`get_ventes`** - Obtenir les ventes
   - Utilise `FinanceService.findAllRevenus` avec filtre
   - Paramètres : `dateDebut?`, `dateFin?`, `category?`

6. **`analyze_ventes`** - Analyser les ventes
   - Utilise `FinanceService.findAllRevenus` + calculs
   - Paramètres : `period?` (month, quarter, year)

7. **`get_dettes_en_cours`** - Obtenir les dettes en cours
   - Utilise `FinanceService.findAllDettes`
   - Paramètres : `projetId` (déjà dans context)

8. **`describe_graph_trends`** - Décrire les tendances des graphiques
   - Utilise `FinanceService.getBilanComplet` + analyse
   - Paramètres : `graphType?`, `period?`

### 🟡 PRIORITÉ MOYENNE - Production & Santé (7 actions)

9. **`update_pesee`** - Modifier une pesée
   - Utilise `ProductionService.updatePesee`
   - Paramètres : `id`, `updates` (poids_kg, date, commentaire)

10. **`update_vaccination`** - Modifier une vaccination
    - Utilise `SanteService.updateVaccination`
    - Paramètres : `id`, `updates`

11. **`update_visite_veterinaire`** - Modifier une visite vétérinaire
    - Utilise `SanteService.updateVisiteVeterinaire`
    - Paramètres : `id`, `updates`

12. **`get_weighing_details`** - Détails des pesées
    - Utilise `ProductionService` (méthode à vérifier)
    - Paramètres : `animalId?`, `dateDebut?`, `dateFin?`

13. **`get_cheptel_details`** - Détails du cheptel
    - Utilise `ProductionService.getProjetStats` (déjà implémenté partiellement)
    - Paramètres : `projetId` (déjà dans context)

14. **`search_lot`** - Rechercher un lot
    - Utilise `ProductionService` (méthode à vérifier)
    - Paramètres : `code?`, `projetId`

15. **`get_reminders`** - Obtenir les rappels
    - Utilise `SanteService.genererRappelsAutomatiques` (déjà implémenté via `get_health_reminders`)
    - Paramètres : `days?` (nombre de jours à l'avance)

### 🟢 PRIORITÉ BASSE - Statistiques & Analyse (6 actions)

16. **`get_statistics`** - Statistiques générales
    - Utilise `ProductionService.getProjetStats` (déjà partiellement couvert)
    - Paramètres : `projetId` (déjà dans context)

17. **`calculate_costs`** - Calculer les coûts
    - Utilise `FinanceService.getBilanComplet` (déjà partiellement couvert)
    - Paramètres : `dateDebut?`, `dateFin?`

18. **`analyze_data`** - Analyser les données
    - Action complexe qui combine plusieurs sources
    - Paramètres : `type?` (finances, production, santé)

19. **`create_planification`** - Créer une planification
    - Action complexe (nécessite module dédié)
    - Paramètres : `type`, `dateDebut`, `dateFin`, `objectifs`

20. **`describe_capabilities`** - Décrire les capacités de Kouakou
    - Action informative (pas d'appel backend)
    - Paramètres : aucun

21. **`answer_knowledge_question`** - Répondre à une question de connaissance
    - Utilise `KnowledgeBaseService.search` (déjà implémenté via `search_knowledge_base`)
    - Paramètres : `question`, `category?`

### 🔵 PRIORITÉ BASSE - Marketplace (2 actions)

22. **`marketplace_sell_animal`** - Vendre un animal via marketplace
    - Différent de `create_marketplace_listing` (c'est pour finaliser une vente)
    - Utilise `MarketplaceService.completeSale` ou similaire
    - Paramètres : `listingId`, `offerId?`, `buyerId?`

23. **`marketplace_set_price`** - Définir le prix d'une annonce
    - Similaire à `update_listing_price` (peut être un alias)
    - Paramètres : `listingId`, `pricePerKg`

### 🟣 PRIORITÉ BASSE - Nutrition (2 actions)

24. **`create_ingredient`** - Créer un ingrédient
    - Nécessite module nutrition (à vérifier si existe)
    - Paramètres : `nom`, `categorie`, `prix_unitaire?`

25. **`get_stock_status`** - État des stocks
    - Nécessite module nutrition (à vérifier si existe)
    - Paramètres : `projetId` (déjà dans context)

26. **`propose_composition_alimentaire`** - Proposer une composition alimentaire
    - Nécessite module nutrition (à vérifier si existe)
    - Paramètres : `type_animal`, `age?`, `poids?`

27. **`calculate_consommation_moyenne`** - Calculer la consommation moyenne
    - Nécessite module nutrition (à vérifier si existe)
    - Paramètres : `dateDebut?`, `dateFin?`

### 🟠 PRIORITÉ BASSE - Reproduction (5 actions)

28. **`get_gestations`** - Obtenir les gestations
    - Nécessite module reproduction (à vérifier si existe)
    - Paramètres : `projetId` (déjà dans context), `statut?`

29. **`get_gestation_by_truie`** - Obtenir la gestation d'une truie
    - Nécessite module reproduction
    - Paramètres : `truieId`

30. **`predict_mise_bas`** - Prédire la mise bas
    - Nécessite module reproduction
    - Paramètres : `gestationId` ou `truieId`

31. **`get_porcelets`** - Obtenir les porcelets
    - Nécessite module reproduction
    - Paramètres : `projetId`, `age?`, `statut?`

32. **`get_porcelets_transition`** - Obtenir les porcelets en transition
    - Nécessite module reproduction
    - Paramètres : `projetId`

### 🔴 PRIORITÉ BASSE - Mortalités (3 actions)

33. **`get_mortalites`** - Obtenir les mortalités
    - Nécessite module mortalités (à vérifier si existe)
    - Paramètres : `projetId`, `dateDebut?`, `dateFin?`

34. **`get_taux_mortalite`** - Obtenir le taux de mortalité
    - Nécessite module mortalités
    - Paramètres : `projetId`, `period?`

35. **`analyze_causes_mortalite`** - Analyser les causes de mortalité
    - Nécessite module mortalités
    - Paramètres : `projetId`, `dateDebut?`, `dateFin?`

### 🟡 PRIORITÉ BASSE - Batch/Loges (2 actions)

36. **`creer_loge`** - Créer une loge
    - Nécessite module batch (à vérifier si existe)
    - Paramètres : `nom`, `capacite?`, `projetId`

37. **`deplacer_animaux`** - Déplacer des animaux
    - Nécessite module batch
    - Paramètres : `animalIds`, `loge_destination`, `loge_source?`

38. **`get_animaux_par_loge`** - Obtenir les animaux par loge
    - Nécessite module batch
    - Paramètres : `logeName?`, `projetId`

### 🟢 PRIORITÉ BASSE - Autres (2 actions)

39. **`create_maladie`** - Créer une maladie
    - Utilise `SanteService.createMaladie`
    - Paramètres : `nom`, `animalIds?`, `date_debut?`, `symptomes?`

40. **`schedule_reminder`** - Programmer un rappel
    - Nécessite module rappels (à vérifier si existe)
    - Paramètres : `type`, `date`, `message?`

## 📋 Plan d'Implémentation Recommandé

### Phase 1 : Finance (Priorité Haute) - 8 actions
Ces actions sont les plus utilisées et les plus critiques :
- `update_revenu`, `delete_revenu`
- `update_depense`, `delete_depense`
- `get_ventes`, `analyze_ventes`
- `get_dettes_en_cours`
- `describe_graph_trends`

### Phase 2 : Production & Santé (Priorité Moyenne) - 7 actions
- `update_pesee`, `update_vaccination`, `update_visite_veterinaire`
- `get_weighing_details`, `get_cheptel_details`
- `search_lot`, `get_reminders`

### Phase 3 : Autres (Priorité Basse) - 24 actions
À implémenter selon les besoins et la disponibilité des modules backend.

## 🔍 Notes Importantes

1. **Modules manquants** : Certaines actions nécessitent des modules qui n'existent peut-être pas encore dans le backend :
   - Module nutrition (stocks, ingrédients)
   - Module reproduction (gestations, porcelets)
   - Module mortalités
   - Module batch/loges

2. **Actions déjà couvertes** : Certaines actions frontend sont déjà couvertes avec des noms différents :
   - `create_revenu` → `create_revenue` ✅
   - `create_depense` → `create_expense` ✅
   - `create_pesee` → `create_weighing` ✅
   - `create_visite_veterinaire` → `create_vet_visit` ✅
   - `create_traitement` → `create_treatment` ✅
   - `get_bilan_financier` → `get_financial_summary` ✅
   - `create_charge_fixe` → `create_fixed_charge` ✅
   - `generate_graph_finances` → `generate_financial_graph` ✅
   - `marketplace_get_price_trends` → `get_market_price_trends` ✅
   - `marketplace_get_my_listings` → `get_my_listings` ✅
   - `marketplace_check_offers` → `check_offers` ✅
   - `marketplace_respond_offer` → `respond_to_offer` ✅

3. **Actions informatives** : Certaines actions ne nécessitent pas d'appel backend :
   - `describe_capabilities` - Retourne juste une description textuelle
   - `answer_knowledge_question` - Déjà couvert par `search_knowledge_base`

## ✅ Prochaines Étapes

1. Vérifier l'existence des modules backend nécessaires
2. Implémenter les actions de Phase 1 (Finance - Priorité Haute)
3. Implémenter les actions de Phase 2 (Production & Santé - Priorité Moyenne)
4. Documenter les actions qui nécessitent des modules manquants
