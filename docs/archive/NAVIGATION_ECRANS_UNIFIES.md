# 🧭 Navigation vers les Écrans Unifiés

## 📋 Routes Ajoutées

Les écrans unifiés sont maintenant accessibles via la navigation. Les routes suivantes ont été ajoutées :

### Dans `src/navigation/types.ts`
```typescript
export const SCREENS = {
  // ... autres écrans
  // Écrans unifiés (supportent les deux modes : individuel et batch)
  VACCINATION: 'Vaccination',
  WEIGHING: 'Weighing',
  SALE: 'Sale',
  MORTALITY: 'Mortality',
  DISEASE: 'Disease',
  GESTATION: 'Gestation',
} as const;
```

### Dans `src/navigation/LazyScreens.tsx`
```typescript
// Écrans unifiés (supportent les deux modes : individuel et batch)
export const WeighingScreen = createLazyScreen(
  () => import('../screens/WeighingScreen')
);
export const SaleScreen = createLazyScreen(
  () => import('../screens/SaleScreen')
);
export const MortalityScreen = createLazyScreen(
  () => import('../screens/MortalityScreen')
);
export const DiseaseScreen = createLazyScreen(
  () => import('../screens/DiseaseScreen')
);
export const GestationScreen = createLazyScreen(
  () => import('../screens/GestationScreen')
);
```

### Dans `src/navigation/AppNavigator.tsx`
```typescript
{/* Écrans unifiés (supportent les deux modes : individuel et batch) */}
<Stack.Screen name={SCREENS.VACCINATION}>
  {() => <LazyScreens.VaccinationScreen />}
</Stack.Screen>
<Stack.Screen name={SCREENS.WEIGHING}>
  {() => <LazyScreens.WeighingScreen />}
</Stack.Screen>
<Stack.Screen name={SCREENS.SALE}>
  {() => <LazyScreens.SaleScreen />}
</Stack.Screen>
<Stack.Screen name={SCREENS.MORTALITY}>
  {() => <LazyScreens.MortalityScreen />}
</Stack.Screen>
<Stack.Screen name={SCREENS.DISEASE}>
  {() => <LazyScreens.DiseaseScreen />}
</Stack.Screen>
<Stack.Screen name={SCREENS.GESTATION}>
  {() => <LazyScreens.GestationScreen />}
</Stack.Screen>
```

## 🧭 Comment Naviguer

### Mode Individuel
```typescript
import { SCREENS } from '../navigation/types';
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();

// Navigation simple (mode individuel)
navigation.navigate(SCREENS.VACCINATION);
navigation.navigate(SCREENS.WEIGHING);
navigation.navigate(SCREENS.SALE);
navigation.navigate(SCREENS.MORTALITY);
navigation.navigate(SCREENS.DISEASE);
navigation.navigate(SCREENS.GESTATION);
```

### Mode Batch
```typescript
import { SCREENS } from '../navigation/types';
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();

// Navigation avec paramètre batch (mode batch)
navigation.navigate(SCREENS.VACCINATION, {
  batch: {
    id: batch.id,
    pen_name: batch.pen_name,
    total_count: batch.total_count,
  },
});

navigation.navigate(SCREENS.WEIGHING, {
  batch: {
    id: batch.id,
    pen_name: batch.pen_name,
    total_count: batch.total_count,
  },
});

navigation.navigate(SCREENS.SALE, {
  batch: {
    id: batch.id,
    pen_name: batch.pen_name,
    total_count: batch.total_count,
  },
});

navigation.navigate(SCREENS.MORTALITY, {
  batch: {
    id: batch.id,
    pen_name: batch.pen_name,
    total_count: batch.total_count,
  },
});

navigation.navigate(SCREENS.DISEASE, {
  batch: {
    id: batch.id,
    pen_name: batch.pen_name,
    total_count: batch.total_count,
  },
});

navigation.navigate(SCREENS.GESTATION, {
  batch: {
    id: batch.id,
    pen_name: batch.pen_name,
    total_count: batch.total_count,
  },
});
```

### Mode Individuel avec Animal Pré-sélectionné
```typescript
// Pour SaleScreen et WeighingScreen, on peut pré-sélectionner un animal
navigation.navigate(SCREENS.SALE, {
  animalId: animal.id,
});

navigation.navigate(SCREENS.WEIGHING, {
  animalId: animal.id,
});
```

## 📝 Exemple d'Utilisation dans un Composant

```typescript
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SCREENS } from '../navigation/types';
import { Batch } from '../types/batch';

interface BatchCardProps {
  batch: Batch;
}

export default function BatchCard({ batch }: BatchCardProps) {
  const navigation = useNavigation();

  const handleOpenVaccination = () => {
    navigation.navigate(SCREENS.VACCINATION, {
      batch: {
        id: batch.id,
        pen_name: batch.pen_name,
        total_count: batch.total_count,
      },
    });
  };

  const handleOpenWeighing = () => {
    navigation.navigate(SCREENS.WEIGHING, {
      batch: {
        id: batch.id,
        pen_name: batch.pen_name,
        total_count: batch.total_count,
      },
    });
  };

  return (
    <>
      <TouchableOpacity onPress={handleOpenVaccination}>
        <Text>Voir Vaccinations</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleOpenWeighing}>
        <Text>Voir Pesées</Text>
      </TouchableOpacity>
    </>
  );
}
```

## ✅ Statut

- ✅ Routes ajoutées dans `types.ts`
- ✅ Exports ajoutés dans `LazyScreens.tsx`
- ✅ Routes ajoutées dans `AppNavigator.tsx`
- ✅ Aucune erreur de linting
- ✅ Navigation prête pour les deux modes

## 🎯 Prochaines Étapes

1. **Tester la navigation** vers chaque écran unifié
2. **Vérifier que les paramètres** sont correctement passés
3. **Tester dans les deux modes** (individuel et batch)
4. **Intégrer dans les composants** qui doivent naviguer vers ces écrans

