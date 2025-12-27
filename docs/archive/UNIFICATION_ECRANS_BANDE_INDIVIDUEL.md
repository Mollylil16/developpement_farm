# Unification des Écrans entre Mode Bande et Mode Suivi Individuel

## 📋 Objectif
Unifier tous les écrans pour qu'ils s'adaptent automatiquement au mode d'élevage (bande ou individuel) sans duplication de code.

## 🔍 Écrans Identifiés à Unifier

### ✅ Écrans Batch (à supprimer après unification)
1. `src/screens/BatchVaccinationScreen.tsx` → Unifier dans `VaccinationScreen.tsx`
2. `src/screens/BatchWeighingScreen.tsx` → Unifier dans écran de pesée
3. `src/screens/BatchSaleScreen.tsx` → Unifier dans écran de vente
4. `src/screens/BatchMortalityScreen.tsx` → Unifier dans `MortalitesScreen.tsx`
5. `src/screens/BatchDiseaseScreen.tsx` → Unifier dans écran de maladie
6. `src/screens/BatchGestationScreen.tsx` → Unifier dans écran de gestation

### 📝 Écrans Individuels (à adapter)
1. `src/screens/VaccinationScreen.tsx` - ✅ À adapter
2. `src/components/ProductionAnimalsListComponent.tsx` (pesées) - ✅ À adapter
3. `src/screens/MortalitesScreen.tsx` - ✅ À adapter
4. Autres écrans de santé/production - ✅ À identifier

## 🛠️ Implémentation

### Étape 1 : Hook de Détection ✅
- ✅ Créé `src/hooks/useModeElevage.ts`
- Fonctions : `useModeElevage()`, `useIsModeBande()`, `useIsModeIndividuel()`

### Étape 2 : Unification VaccinationScreen
- [ ] Adapter `VaccinationScreen.tsx` pour supporter les deux modes
- [ ] Adapter `VaccinationFormModal.tsx` pour les deux modes
- [ ] Adapter `useVaccinationLogic.ts` pour les deux modes
- [ ] Supprimer `BatchVaccinationScreen.tsx`
- [ ] Mettre à jour les routes de navigation

### Étape 3 : Unification PeséeScreen
- [ ] Créer/Adapter écran de pesée unifié
- [ ] Supprimer `BatchWeighingScreen.tsx`
- [ ] Mettre à jour les routes

### Étape 4 : Unification SaleScreen
- [ ] Créer/Adapter écran de vente unifié
- [ ] Supprimer `BatchSaleScreen.tsx`
- [ ] Mettre à jour les routes

### Étape 5 : Unification MortalityScreen
- [ ] Adapter `MortalitesScreen.tsx`
- [ ] Supprimer `BatchMortalityScreen.tsx`
- [ ] Mettre à jour les routes

### Étape 6 : Unification DiseaseScreen
- [ ] Créer/Adapter écran de maladie unifié
- [ ] Supprimer `BatchDiseaseScreen.tsx`
- [ ] Mettre à jour les routes

### Étape 7 : Unification GestationScreen
- [ ] Créer/Adapter écran de gestation unifié
- [ ] Supprimer `BatchGestationScreen.tsx`
- [ ] Mettre à jour les routes

### Étape 8 : Nettoyage
- [ ] Supprimer tous les fichiers batch dupliqués
- [ ] Vérifier qu'il n'y a plus de routes vers les écrans batch
- [ ] Tester tous les écrans dans les deux modes

## 📐 Principes d'Unification

### UI Identique
- Même layout, mêmes icônes, mêmes boutons
- Seuls les champs de saisie changent selon le mode

### Champs de Saisie
**Mode Bande :**
- Nombre de porcs (input numérique)
- Valeur moyenne (poids moyen, prix moyen, etc.)
- Sélection de bande (si nécessaire)

**Mode Individuel :**
- Sélection d'animal (picker/recherche)
- Valeur individuelle (poids, prix, etc.)

### Listes
**Mode Bande :**
- Une ligne par bande/date
- Affichage des agrégats (total, moyenne)

**Mode Individuel :**
- Une ligne par animal
- Affichage des valeurs individuelles

### API
- Un seul endpoint qui détecte le mode côté backend
- Ou deux endpoints mais abstraction côté frontend

## 🧪 Tests
Pour chaque écran unifié, tester :
1. Affichage en mode bande
2. Affichage en mode individuel
3. Création d'enregistrement en mode bande
4. Création d'enregistrement en mode individuel
5. Modification d'enregistrement
6. Suppression d'enregistrement
7. Navigation fluide entre les modes

