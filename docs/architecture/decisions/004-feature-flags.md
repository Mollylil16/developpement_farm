# ADR-004: Système de Feature Flags

## Status
Accepted

## Date
21 Novembre 2025

## Context

L'application nécessite :
- Déploiement progressif de nouvelles fonctionnalités
- Tests A/B pour optimiser l'UX
- Activation/désactivation de features sans redéploiement
- Réduction des risques lors des déploiements

Aucun système de feature flags n'existait, rendant les déploiements risqués.

## Decision

Implémenter un **système de Feature Flags** avec support local et préparation pour LaunchDarkly.

Composants :
- `FeatureFlagsService` : Service singleton pour gérer les flags
- `useFeatureFlag` : Hook React pour utiliser les flags
- Configuration centralisée dans `config/featureFlags.ts`

## Consequences

### Avantages

- ✅ Déploiement progressif sécurisé
- ✅ Tests A/B facilités
- ✅ Rollback rapide en cas de problème
- ✅ Préparé pour migration vers LaunchDarkly

### Inconvénients

- ⚠️ Code supplémentaire à maintenir
- ⚠️ Nécessite une discipline pour supprimer les flags obsolètes

### Utilisation

```typescript
// Dans un composant
const { isEnabled } = useFeatureFlag('new_dashboard');

if (isEnabled) {
  return <NewDashboard />;
}
return <OldDashboard />;
```

## Références

- [Feature Flags Guide](../../guides/FEATURE_FLAGS.md)
- [FeatureFlagsService](../../../src/services/FeatureFlagsService.ts)

