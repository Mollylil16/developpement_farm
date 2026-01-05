# Correction de l'affichage des poids dans le marketplace

## Problème identifié

Lors de l'ajout de sujets depuis le marketplace (écran "Ajouter des sujets en vente"), les poids affichaient "0.0 kg" pour tous les sujets, alors qu'ils devraient afficher les poids réels comme dans le cheptel.

## Analyse

**Fichier concerné :**
- `src/components/marketplace/BatchAddModal.tsx`

**Problème :**
Dans le mode individuel, les pesées étaient construites manuellement à partir de `peseesRecents` et `peseesEntities`, mais le mapping ne fonctionnait pas correctement. Le code utilisait des variables locales (`peseesRecents`, `peseesEntities`) qui n'étaient pas à jour après le chargement des pesées.

## Solution appliquée

### 1. Utilisation du sélecteur Redux `selectPeseesParAnimal`

**Avant :**
```typescript
const peseesRecents = useAppSelector((state) => state.production.peseesRecents);
const peseesEntities = useAppSelector((state) => state.production.entities.pesees);

// Dans loadAvailableSubjects, construction manuelle du map
const peseesMap: Record<string, Array<{ date: string; poids_kg: number }>> = {};
for (const animal of animauxActifs) {
  const peseesAnimal = peseesRecents
    .map((id) => peseesEntities[id])
    .filter((p) => p && p.animal_id === animal.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  peseesMap[animal.id] = peseesAnimal.map((p) => ({
    date: p.date,
    poids_kg: p.poids_kg,
  }));
}
```

**Après :**
```typescript
import { selectAllAnimaux, selectPeseesParAnimal } from '../../store/selectors/productionSelectors';

const peseesParAnimalRedux = useAppSelector(selectPeseesParAnimal);

// Dans loadAvailableSubjects, on laisse le useEffect mettre à jour le map
setLocalSubjects(animauxActifs);

// useEffect pour mettre à jour peseesParAnimal quand les pesées Redux changent
useEffect(() => {
  if (!isBatchMode && localSubjects.length > 0) {
    const peseesMap: Record<string, Array<{ date: string; poids_kg: number }>> = {};
    for (const animal of localSubjects) {
      const peseesAnimal = peseesParAnimalRedux[animal.id] || [];
      // Trier par date (plus récente en premier) et convertir au format attendu
      const peseesSorted = [...peseesAnimal]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((p) => ({
          date: p.date,
          poids_kg: p.poids_kg,
        }));
      
      peseesMap[animal.id] = peseesSorted;
    }
    setPeseesParAnimal(peseesMap);
  }
}, [peseesParAnimalRedux, localSubjects, isBatchMode]);
```

### 2. Amélioration de `getCurrentWeight`

**Avant :**
```typescript
const getCurrentWeight = (animalId: string): number => {
  const pesees = peseesParAnimal[animalId] || [];
  if (pesees.length > 0) {
    // Trier par date et prendre la plus récente
    const sorted = [...pesees].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0].poids_kg;
  }
  return 0;
};
```

**Après :**
```typescript
const getCurrentWeight = (animalId: string): number => {
  // Utiliser d'abord le map local (pour mode batch), puis le sélecteur Redux (pour mode individuel)
  const peseesLocal = peseesParAnimal[animalId];
  if (peseesLocal && peseesLocal.length > 0) {
    // Trier par date et prendre la plus récente
    const sorted = [...peseesLocal].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0].poids_kg;
  }
  
  // Fallback : utiliser le sélecteur Redux (mode individuel)
  const peseesRedux = peseesParAnimalRedux[animalId] || [];
  if (peseesRedux.length > 0) {
    // Trier par date et prendre la plus récente
    const sorted = [...peseesRedux].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0].poids_kg;
  }
  
  return 0;
};
```

### 3. Augmentation de la limite de pesées chargées

**Changement :**
- `limit: 100` → `limit: 1000` pour charger plus de pesées récentes

## Améliorations

1. **Utilisation du sélecteur Redux** : Utilisation de `selectPeseesParAnimal` qui est déjà optimisé et dénormalisé
2. **Synchronisation automatique** : `useEffect` met à jour automatiquement `peseesParAnimal` quand les pesées Redux changent
3. **Fallback robuste** : `getCurrentWeight` utilise d'abord le map local (mode batch) puis le sélecteur Redux (mode individuel)
4. **Chargement plus complet** : Augmentation de la limite de pesées chargées pour s'assurer que toutes les pesées récentes sont disponibles

## Impact

- **Avant** : Les poids affichaient "0.0 kg" car les pesées n'étaient pas correctement mappées
- **Après** : 
  - Les poids sont correctement récupérés depuis Redux
  - Les pesées sont automatiquement mises à jour quand elles changent
  - Le code est plus robuste avec un fallback vers le sélecteur Redux

## Fichiers modifiés

- `src/components/marketplace/BatchAddModal.tsx` :
  - Import de `selectPeseesParAnimal` depuis les sélecteurs
  - Utilisation de `peseesParAnimalRedux` pour récupérer les pesées depuis Redux
  - Ajout d'un `useEffect` pour mettre à jour `peseesParAnimal` quand les pesées Redux changent
  - Amélioration de `getCurrentWeight` avec un fallback vers le sélecteur Redux
  - Augmentation de la limite de pesées chargées à 1000

## Tests recommandés

1. Ouvrir l'écran "Ajouter des sujets en vente" depuis le marketplace
2. Vérifier que les poids sont correctement affichés (pas "0.0 kg")
3. Vérifier que le poids total sélectionné est correct
4. Vérifier que les poids sont corrects en mode batch et mode individuel
5. Vérifier que les poids se mettent à jour après une nouvelle pesée

## Notes

- Cette correction utilise le même mécanisme que `WeighingScreen.tsx` qui utilise `selectPeseesParAnimal`
- Le sélecteur Redux est optimisé et dénormalisé, ce qui améliore les performances
- Le fallback vers le sélecteur Redux garantit que les poids sont toujours récupérés même si le map local n'est pas à jour

