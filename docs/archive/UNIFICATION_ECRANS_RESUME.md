# Résumé : Unification des Écrans Bande/Individuel

## ✅ Réalisé

1. **Hook de détection créé** : `src/hooks/useModeElevage.ts`
   - `useModeElevage()` : retourne 'bande' ou 'individuel'
   - `useIsModeBande()` : retourne true si mode bande
   - `useIsModeIndividuel()` : retourne true si mode individuel

2. **Documentation créée** :
   - `docs/UNIFICATION_ECRANS_BANDE_INDIVIDUEL.md` : Plan détaillé
   - `docs/UNIFICATION_ECRANS_RESUME.md` : Ce document

## 📋 Écrans à Unifier

### Écrans Batch (à supprimer)
- `src/screens/BatchVaccinationScreen.tsx` → Unifier dans `VaccinationScreen.tsx`
- `src/screens/BatchWeighingScreen.tsx` → Unifier dans écran pesée
- `src/screens/BatchSaleScreen.tsx` → Unifier dans écran vente
- `src/screens/BatchMortalityScreen.tsx` → Unifier dans `MortalitesScreen.tsx`
- `src/screens/BatchDiseaseScreen.tsx` → Unifier dans écran maladie
- `src/screens/BatchGestationScreen.tsx` → Unifier dans écran gestation

### Écrans Individuels (à adapter)
- `src/screens/VaccinationScreen.tsx` - ✅ En cours
- `src/components/ProductionAnimalsListComponent.tsx` (pesées)
- `src/screens/MortalitesScreen.tsx`
- Autres écrans santé/production

## 🎯 Prochaines Étapes

1. **Unifier VaccinationScreen** (exemple de référence)
   - Adapter `VaccinationScreen.tsx` pour les deux modes
   - Adapter `VaccinationFormModal.tsx` pour les deux modes
   - Adapter `useVaccinationLogic.ts` pour charger les données batch si nécessaire
   - Supprimer `BatchVaccinationScreen.tsx`
   - Mettre à jour la navigation

2. **Répéter pour les autres écrans** en suivant le même pattern

## 📐 Pattern d'Unification

```typescript
// Dans chaque écran unifié
import { useModeElevage } from '../hooks/useModeElevage';

const mode = useModeElevage();

// Affichage conditionnel
{mode === 'bande' ? (
  // Champs pour mode bande
  <Input label="Nombre de porcs" />
  <Input label="Poids moyen (kg)" />
) : (
  // Champs pour mode individuel
  <AnimalSelector onSelect={setAnimal} />
  <Input label="Poids (kg)" />
)}
```

## ⚠️ Notes Importantes

- Les écrans batch utilisent des routes avec paramètres (`batch` dans `route.params`)
- Les écrans individuels utilisent généralement le projet actif
- Il faut adapter la logique pour supporter les deux cas
- Les appels API doivent être adaptés selon le mode

