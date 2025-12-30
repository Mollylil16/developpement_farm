# Optimisations des Appels API

## Résumé

Ce document décrit les optimisations mises en place pour réduire les appels API inutiles et améliorer les performances de l'application.

## Problèmes identifiés

1. **Logs excessifs** : Le log "Token récupéré" était affiché à chaque requête API
2. **Appels API inutiles** : De nombreux composants chargeaient des données même quand l'écran n'était pas visible
3. **Pas de cache** : Les mêmes données étaient rechargées plusieurs fois sans cache

## Solutions implémentées

### 1. Réduction des logs

**Fichier modifié** : `src/services/api/apiClient.ts`

- Suppression du log "Token récupéré" qui s'affichait à chaque requête
- Le token est récupéré silencieusement, seules les erreurs sont loggées

### 2. Système de cache global

**Nouveau fichier** : `src/hooks/useApiCache.ts`

Fonctionnalités :
- Cache en mémoire avec TTL (Time To Live) configurable
- Nettoyage automatique des entrées expirées
- Support de clés personnalisées et de projet
- Hook `useFocusedApiLoad` combinant cache + `useFocusEffect`

**Utilisation** :
```typescript
import { useApiCache } from '../hooks/useApiCache';

const { load, clearCache } = useApiCache(
  () => apiClient.get('/endpoint'),
  'cache-key',
  { ttl: 60000 } // 60 secondes
);
```

### 3. Optimisation avec useFocusEffect

**Composants optimisés** :
- `VaccinationsComponentAccordion`
- `BatchCheptelView`
- `MaladiesComponentNew`
- `TraitementsComponentNew`

**Avant** :
```typescript
useEffect(() => {
  if (projetActif?.id) {
    dispatch(loadData(projetActif.id));
  }
}, [projetActif?.id, dispatch]);
```

**Après** :
```typescript
useFocusEffect(
  useCallback(() => {
    if (!projetActif?.id) return;
    dispatch(loadData(projetActif.id));
  }, [projetActif?.id, dispatch])
);
```

**Bénéfices** :
- Les données ne sont chargées que quand l'écran est visible
- Les requêtes sont annulées si l'utilisateur quitte l'écran avant la fin
- Réduction significative des appels API inutiles

## Résultats attendus

1. **Réduction des logs** : Plus de logs "Token récupéré" répétitifs
2. **Moins d'appels API** : Les données ne sont chargées que quand nécessaire
3. **Meilleure performance** : Cache intelligent pour éviter les appels répétés
4. **Expérience utilisateur améliorée** : Chargement uniquement quand l'écran est visible

## Prochaines étapes (optionnel)

Pour optimiser davantage :

1. **Étendre useFocusEffect** à d'autres composants :
   - `ProductionCheptelComponent`
   - `MortalitesListComponent`
   - Autres composants avec des `useEffect` non optimisés

2. **Utiliser le cache** dans d'autres parties de l'application :
   - Widgets du dashboard
   - Composants de liste
   - Modals qui chargent des données

3. **Métriques** : Ajouter des métriques pour mesurer la réduction des appels API

## Notes techniques

- Le cache utilise un TTL par défaut de 30 secondes
- Le nettoyage automatique s'exécute toutes les minutes
- Le cache est vidé automatiquement si le projet change
- Les requêtes sont annulées proprement avec un flag `cancelled`

