# Composants Frontend - Système de Migration

## ✅ Composants Créés

### 1. Service API
**Fichier :** `src/services/migration/migrationService.ts`

Service TypeScript pour appeler les endpoints de migration :
- `previewBatchToIndividual()` : Prévisualisation batch → individualisé
- `previewIndividualToBatch()` : Prévisualisation individualisé → batch
- `convertBatchToIndividual()` : Conversion batch → individualisé
- `convertIndividualToBatch()` : Conversion individualisé → batch
- `getMigrationHistory()` : Récupération de l'historique

**Types exportés :**
- `BatchToIndividualOptions`
- `IndividualToBatchOptions`
- `MigrationPreview`
- `MigrationResult`
- `MigrationHistoryItem`

### 2. Composants UI

#### MigrationPreview.tsx
**Fichier :** `src/components/migration/MigrationPreview.tsx`

Affiche la prévisualisation avant migration :
- Statistiques (porcs/bandes à créer, enregistrements à migrer)
- Durée estimée
- Avertissements et erreurs
- Données d'exemple

#### MigrationProgress.tsx
**Fichier :** `src/components/migration/MigrationProgress.tsx`

Barre de progression pendant la migration :
- Barre de progression animée
- Liste des étapes avec statut (complété, en cours, à venir)
- Étape actuelle affichée
- Option d'annulation

#### MigrationReport.tsx
**Fichier :** `src/components/migration/MigrationReport.tsx`

Rapport final après migration :
- Résultats de la migration (succès/échec)
- Statistiques détaillées
- Avertissements et erreurs
- ID de migration
- Option de partage du rapport

### 3. Écrans (À Créer)

#### MigrationWizardScreen.tsx
**Fichier :** `src/screens/MigrationWizardScreen.tsx` (À CRÉER)

Assistant principal en plusieurs étapes :
- **Étape 1** : Sélection du type de conversion (batch → individualisé ou individualisé → batch)
- **Étape 2** : Sélection des données (bandes ou animaux)
- **Étape 3** : Configuration des options
- **Étape 4** : Prévisualisation (utilise `MigrationPreview`)
- **Étape 5** : Exécution avec progression (utilise `MigrationProgress`)
- **Étape 6** : Confirmation et rapport (utilise `MigrationReport`)

#### MigrationHistoryScreen.tsx
**Fichier :** `src/screens/MigrationHistoryScreen.tsx` (À CRÉER)

Écran pour consulter l'historique des migrations :
- Liste des migrations passées
- Filtres par type, date, statut
- Détails de chaque migration
- Option de réexécution (si échec)

## 📋 Structure des Écrans

### MigrationWizardScreen

```typescript
type WizardStep = 
  | 'select_type'
  | 'select_data'
  | 'configure_options'
  | 'preview'
  | 'executing'
  | 'completed';
```

**Étapes :**

1. **select_type**
   - Choix : Batch → Individualisé OU Individualisé → Batch
   - Explication visuelle avec diagrammes

2. **select_data**
   - Si batch → individualisé : Sélection de bande(s)
   - Si individualisé → batch : Sélection de porcs (avec filtres)

3. **configure_options**
   - Options spécifiques selon le type
   - Valeurs par défaut intelligentes
   - Validation en temps réel

4. **preview**
   - Affiche `MigrationPreview`
   - Permet de revenir en arrière
   - Bouton "Lancer la migration"

5. **executing**
   - Affiche `MigrationProgress`
   - Option d'annulation (avec confirmation)

6. **completed**
   - Affiche `MigrationReport`
   - Boutons : Partager, Voir l'historique, Fermer

### MigrationHistoryScreen

- Liste des migrations avec :
  - Type et statut
  - Date et durée
  - Nombre d'éléments créés
  - Icône de statut (succès/échec/en cours)
- Filtres : Type, Statut, Période
- Détails au clic sur une migration
- Actions : Réexécuter (si échec), Partager rapport

## 🔗 Intégration dans l'Application

### Navigation

Ajouter dans `src/navigation/types.ts` :
```typescript
MIGRATION_WIZARD: 'MigrationWizard';
MIGRATION_HISTORY: 'MigrationHistory';
```

### Menu Paramètres Projet

Dans `src/components/ParametresProjetComponent.tsx`, ajouter :
```typescript
{
  icon: 'swap-horizontal-outline',
  title: 'Migration de données',
  subtitle: 'Convertir entre modes batch et individualisé',
  onPress: () => navigation.navigate(SCREENS.MIGRATION_WIZARD),
}
```

## 📝 Notes d'Implémentation

### État du Wizard

Utiliser `useState` pour gérer :
- `currentStep` : Étape actuelle
- `migrationType` : Type de migration sélectionné
- `selectedBatches` / `selectedPigs` : Données sélectionnées
- `options` : Options configurées
- `preview` : Résultat de la prévisualisation
- `migrationResult` : Résultat de la migration

### Gestion des Erreurs

- Validation à chaque étape avant de continuer
- Messages d'erreur clairs et contextuels
- Retour en arrière possible en cas d'erreur

### Performance

- Chargement paginé pour grandes listes
- Optimisation des requêtes de prévisualisation
- Indicateurs de chargement appropriés

## 🎨 Design

- Cohérence avec les écrans existants (`BatchVaccinationScreen`, etc.)
- Utilisation de `StandardHeader`, `Card`, `Button`
- Animations fluides entre les étapes
- Feedback visuel clair à chaque action

## ✅ Prochaines Étapes

1. ✅ Service API créé
2. ✅ Composants UI créés (Preview, Progress, Report)
3. ⏳ Créer `MigrationWizardScreen.tsx`
4. ⏳ Créer `MigrationHistoryScreen.tsx`
5. ⏳ Ajouter la navigation
6. ⏳ Intégrer dans les paramètres du projet
7. ⏳ Tests et validation

