# Plan d'Implémentation - Opérations Batch

## 📋 Vue d'ensemble

Ce document décrit le plan d'implémentation pour les opérations batch (vaccinations, gestations, pesées, maladies, mortalités, ventes) dans le système de gestion d'élevage par bande.

## 🗄️ Structure de Base de Données

### Tables à créer

1. **batch_vaccinations** - Vaccinations par batch
2. **batch_gestations** - Gestations (truies)
3. **batch_weighings** - Pesées collectives
4. **batch_diseases** - Maladies (porcs malades)
5. **batch_sales** - Ventes (avec lien vers batch_pig_movements)

### Modifications nécessaires

- **batch_pigs** : Ajouter colonnes pour suivi (gestation_status, last_weighing_date, etc.)
- **batch_pig_movements** : Déjà existant, utilisé pour mortalités et ventes

## 🔧 Services Backend

1. **BatchVaccinationService** - Gestion des vaccinations
2. **BatchGestationService** - Gestion des gestations
3. **BatchWeighingService** - Gestion des pesées
4. **BatchDiseaseService** - Gestion des maladies
5. **BatchMortalityService** - Gestion des mortalités
6. **BatchSaleService** - Gestion des ventes

## 🎨 Screens Frontend

1. **BatchVaccinationScreen** - Interface vaccination par batch
2. **BatchGestationScreen** - Interface gestion gestations
3. **BatchWeighingScreen** - Interface pesées collectives
4. **BatchDiseaseScreen** - Interface gestion maladies
5. **BatchMortalityScreen** - Interface enregistrement mortalités
6. **BatchSaleScreen** - Interface ventes

## 🤖 Logiques de Sélection Automatique

- **Gestations** : Sélectionner truies non gestantes
- **Pesées** : Sélectionner porcs non pesés récemment
- **Vaccinations** : Sélectionner porcs non vaccinés pour ce type
- **Maladies** : Sélectionner porcs healthy (marquer comme sick)
- **Mortalités** : Priorité aux porcs malades
- **Ventes** : Sélectionner les porcs les plus lourds


