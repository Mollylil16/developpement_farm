# Accès de Kouakou aux Écrans, Fonctionnalités et Services

## 📋 Résumé

Documentation complète de l'accès de Kouakou à tous les écrans, fonctionnalités et services de l'application.

## ✅ Fonctionnalités Disponibles

### 1. Finance

#### Revenus
- ✅ `create_revenu` - Enregistrer une vente
- ✅ `update_revenu` - Modifier un revenu (vente) existant
- ✅ `delete_revenu` - Supprimer un revenu (vente) existant
- ✅ `get_ventes` - Récupérer les ventes de porcs
- ✅ `analyze_ventes` - Analyser les ventes (tendances, prix moyen, etc.)

#### Dépenses
- ✅ `create_depense` - Enregistrer une dépense ponctuelle
- ✅ `update_depense` - Modifier une dépense existante
- ✅ `delete_depense` - Supprimer une dépense existante
- ✅ `create_charge_fixe` - Enregistrer une charge fixe récurrente
- ✅ `calculate_costs` - Calculer les coûts et dépenses

#### Bilans et Graphiques
- ✅ `get_bilan_financier` - Récupérer le bilan financier complet
- ✅ `get_dettes_en_cours` - Récupérer la liste des dettes en cours
- ✅ `generate_graph_finances` - Générer les données de graphique financier
- ✅ `describe_graph_trends` - Décrire les tendances des graphiques financiers

### 2. Production

#### Animaux
- ✅ `search_animal` - Rechercher un animal (code ou nom)
- ✅ `search_lot` - Rechercher un lot d'animaux
- ✅ `get_cheptel_details` - Récupérer les détails du cheptel

#### Pesées
- ✅ `create_pesee` - Enregistrer une pesée
- ✅ `update_pesee` - Modifier une pesée existante
- ✅ `get_weighing_details` - Récupérer les détails des pesées

### 3. Santé

#### Vaccinations
- ✅ `create_vaccination` - Enregistrer une vaccination
- ✅ `update_vaccination` - Modifier une vaccination existante
- ✅ `get_reminders` - Récupérer les rappels et tâches à venir
- ✅ `schedule_reminder` - Programmer un rappel

#### Traitements
- ✅ `create_traitement` - Enregistrer un traitement
- ✅ `create_maladie` - Enregistrer une maladie

#### Visites Vétérinaires
- ✅ `create_visite_veterinaire` - Enregistrer une visite vétérinaire
- ✅ `update_visite_veterinaire` - Modifier une visite vétérinaire existante

### 4. Reproduction

- ✅ `get_gestations` - Récupérer les gestations en cours
- ✅ `get_gestation_by_truie` - Récupérer le statut de gestation d'une truie spécifique
- ✅ `predict_mise_bas` - Prédire la date de mise bas pour une truie
- ✅ `get_porcelets` - Récupérer les porcelets (naissances récentes)
- ✅ `get_porcelets_transition` - Récupérer les porcelets en transition (sevrage → croissance)

### 5. Mortalités

- ✅ `get_mortalites` - Récupérer les mortalités
- ✅ `get_taux_mortalite` - Calculer le taux de mortalité
- ✅ `analyze_causes_mortalite` - Analyser les causes de mortalité

### 6. Nutrition

#### Stocks
- ✅ `create_ingredient` - Créer un ingrédient
- ✅ `get_stock_status` - État des stocks d'alimentation

#### Composition Alimentaire
- ✅ `propose_composition_alimentaire` - Proposer une composition alimentaire personnalisée
- ✅ `calculate_consommation_moyenne` - Calculer la consommation moyenne d'aliments

### 7. Gestion des Bandes (Mode Bande)

- ✅ `creer_loge` - Créer une nouvelle loge/bande
- ✅ `deplacer_animaux` - Déplacer un ou plusieurs animaux d'une loge vers une autre
- ✅ `get_animaux_par_loge` - Récupérer les animaux par loge

### 8. Statistiques et Analyses

- ✅ `get_statistics` - Statistiques du cheptel
- ✅ `analyze_data` - Analyse globale de l'exploitation
- ✅ `create_planification` - Créer un rappel personnalisé

### 9. Connaissances / Formation

- ✅ `answer_knowledge_question` - Répondre à une question sur l'élevage porcin
- ✅ `list_knowledge_topics` - Lister les sujets de formation disponibles

## ❌ Fonctionnalités NON Disponibles

### Navigation vers d'autres écrans
- ❌ Kouakou ne peut pas naviguer vers d'autres écrans de l'application
- ❌ Kouakou ne peut pas ouvrir des modals ou des formulaires
- ❌ Kouakou ne peut pas accéder directement aux écrans (Finance, Production, Santé, etc.)

### Marketplace
- ❌ Kouakou n'a pas accès au Marketplace
- ❌ Kouakou ne peut pas créer/modifier des annonces
- ❌ Kouakou ne peut pas gérer les demandes d'achat

### Rapports PDF
- ❌ Kouakou ne peut pas générer des rapports PDF
- ❌ Kouakou ne peut pas télécharger des documents

### Notifications
- ❌ Kouakou ne peut pas envoyer des notifications push
- ❌ Kouakou ne peut pas gérer les notifications

### Paramètres
- ❌ Kouakou ne peut pas modifier les paramètres de l'application
- ❌ Kouakou ne peut pas gérer les préférences utilisateur

## 🔧 Services Backend Accessibles

Kouakou accède aux services backend via `apiClient` :

### Finance
- ✅ `/finance/revenus` - CRUD revenus
- ✅ `/finance/depenses-ponctuelles` - CRUD dépenses
- ✅ `/finance/charges-fixes` - CRUD charges fixes
- ✅ `/finance/bilan` - Bilan financier

### Production
- ✅ `/production/animaux` - CRUD animaux
- ✅ `/production/pesees` - CRUD pesées
- ✅ `/production/lots` - CRUD lots

### Santé
- ✅ `/sante/vaccinations` - CRUD vaccinations
- ✅ `/sante/traitements` - CRUD traitements
- ✅ `/sante/maladies` - CRUD maladies
- ✅ `/sante/visites-veterinaires` - CRUD visites vétérinaires
- ✅ `/sante/rappels-vaccinations` - CRUD rappels

### Reproduction
- ✅ `/reproduction/gestations` - CRUD gestations
- ✅ `/reproduction/porcelets` - CRUD porcelets

### Bandes (Mode Bande)
- ✅ `/batch-pigs/batch` - CRUD bandes
- ✅ `/batch-pigs/pigs` - CRUD sujets dans les bandes

### Statistiques
- ✅ `/reports/statistics` - Statistiques
- ✅ `/reports/performance` - Indicateurs de performance

## 📱 Écrans Accessibles

Kouakou fonctionne uniquement dans l'écran de chat (`ChatAgentScreen`). Il ne peut pas :
- Naviguer vers d'autres écrans
- Ouvrir des modals
- Accéder directement aux données d'autres écrans

## 🎯 Recommandations

### Améliorations Possibles

1. **Navigation vers d'autres écrans**
   - Ajouter une action `navigate_to_screen` pour permettre à Kouakou de suggérer la navigation
   - Exemple : "Je peux t'aider à voir tes ventes. Veux-tu que j'ouvre l'écran Finance ?"

2. **Marketplace**
   - Ajouter des actions pour créer/modifier des annonces
   - Permettre à Kouakou de suggérer des sujets à vendre

3. **Rapports PDF**
   - Ajouter une action `generate_pdf_report` pour générer des rapports
   - Permettre à Kouakou de suggérer des rapports pertinents

4. **Notifications**
   - Ajouter une action `send_notification` pour envoyer des notifications
   - Permettre à Kouakou de rappeler les tâches importantes

## 📊 Statistiques

- **Total d'actions disponibles** : ~40 actions
- **Catégories couvertes** : 9 catégories
- **Services backend accessibles** : ~15 endpoints
- **Écrans accessibles** : 1 (ChatAgentScreen uniquement)

## 🔄 Mise à Jour

**Date de dernière mise à jour** : 2025-01-XX
**Version** : 1.0

---

**Note** : Ce document doit être mis à jour chaque fois qu'une nouvelle action ou fonctionnalité est ajoutée à Kouakou.

