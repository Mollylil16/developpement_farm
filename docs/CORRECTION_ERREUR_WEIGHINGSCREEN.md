# Correction de l'erreur dans WeighingScreen.tsx

## Problème identifié

L'erreur `Error caught by boundary` dans `WeighingScreen.tsx` était causée par l'utilisation de variables non déclarées :
- `periode` et `setPeriode` utilisés aux lignes 916, 923, et 929
- `animaux` utilisé à la ligne 946

## Analyse

Le composant `WeighingScreen` utilise ces variables dans le mode individuel pour :
- `periode` : Filtrer les données par période (7j, 30j, 90j, tout)
- `animaux` : Afficher la liste des animaux avec leurs pesées

Ces variables étaient référencées mais jamais déclarées, causant une `ReferenceError` lors du rendu.

## Solution appliquée

### 1. Ajout de la déclaration de `periode`

**Avant :**
```typescript
// Map pour stocker les pesées par batch (pour les stats globales)
const [weighingsMap, setWeighingsMap] = useState<Map<string, any[]>>(new Map());

// Redux pour mode individuel
const peseesRecents = useAppSelector(selectPeseesRecents);
```

**Après :**
```typescript
// Map pour stocker les pesées par batch (pour les stats globales)
const [weighingsMap, setWeighingsMap] = useState<Map<string, any[]>>(new Map());

// État pour la période d'affichage (mode individuel)
const [periode, setPeriode] = useState<'7j' | '30j' | '90j' | 'tout'>('30j');

// Redux pour mode individuel
const peseesRecents = useAppSelector(selectPeseesRecents);
```

### 2. Ajout de la déclaration de `animaux`

**Avant :**
```typescript
const peseesRecents = useAppSelector(selectPeseesRecents);
const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
```

**Après :**
```typescript
const peseesRecents = useAppSelector(selectPeseesRecents);
const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
const animaux = useAppSelector(selectAllAnimaux);
```

### 3. Nettoyage des imports inutilisés

Suppression de l'import `useLoadAnimauxOnMount` qui n'était pas utilisé dans le composant.

## Impact

- **Avant** : L'écran `WeighingScreen` plantait avec une erreur `ReferenceError` lors du rendu en mode individuel
- **Après** : L'écran fonctionne correctement, avec la période par défaut à '30j' et la liste des animaux chargée depuis Redux

## Fichiers modifiés

- `src/screens/WeighingScreen.tsx` :
  - Ajout de `const [periode, setPeriode] = useState<'7j' | '30j' | '90j' | 'tout'>('30j');`
  - Ajout de `const animaux = useAppSelector(selectAllAnimaux);`
  - Suppression de l'import inutilisé `useLoadAnimauxOnMount`

## Tests recommandés

1. Ouvrir l'écran de pesées en mode individuel
2. Vérifier que les graphiques s'affichent correctement avec la période par défaut (30j)
3. Vérifier que la liste des animaux s'affiche correctement
4. Tester le changement de période (7j, 30j, 90j, tout)
5. Vérifier que l'écran ne plante plus avec une erreur

