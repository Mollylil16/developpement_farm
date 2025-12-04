# 🚩 Feature Flags & A/B Testing

Guide complet pour utiliser le système de Feature Flags et A/B Testing dans l'application.

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Configuration](#configuration)
3. [Utilisation dans les composants](#utilisation-dans-les-composants)
4. [Tests A/B](#tests-ab)
5. [Rollout progressif](#rollout-progressif)
6. [Migration vers LaunchDarkly](#migration-vers-launchdarkly)
7. [Exemples pratiques](#exemples-pratiques)

---

## Introduction

Le système de Feature Flags permet de :
- ✅ Déployer progressivement de nouvelles fonctionnalités
- ✅ Tester des variantes avec A/B Testing
- ✅ Activer/désactiver des features sans redéploiement
- ✅ Cibler des utilisateurs ou rôles spécifiques
- ✅ Réduire les risques lors des déploiements

### Architecture

```
src/
├── services/
│   └── FeatureFlagsService.ts    # Service principal
├── config/
│   └── featureFlags.ts            # Configuration des flags
├── hooks/
│   └── useFeatureFlag.ts         # Hook React
└── docs/guides/
    └── FEATURE_FLAGS.md          # Cette documentation
```

---

## Configuration

### 1. Définir un Feature Flag

Dans `src/config/featureFlags.ts` :

```typescript
import { FeatureFlagConfig } from '../services/FeatureFlagsService';

export const FEATURE_FLAGS: FeatureFlagConfig[] = [
  {
    key: 'new_dashboard',
    defaultValue: false,
    description: 'Nouveau dashboard avec design amélioré',
    rolloutPercentage: 0, // 0% = désactivé
    targetRoles: ['producer'], // Seulement pour les producteurs
  },
];
```

### 2. Initialiser les flags

Dans `App.tsx` ou au démarrage de l'application :

```typescript
import { initializeFeatureFlags } from './config/featureFlags';

// Au démarrage
initializeFeatureFlags();
```

### 3. Options de configuration

| Option | Type | Description |
|--------|------|-------------|
| `key` | `string` | Identifiant unique du flag |
| `defaultValue` | `boolean \| string \| number \| object` | Valeur par défaut |
| `description` | `string?` | Description du flag |
| `rolloutPercentage` | `number?` | Pourcentage d'utilisateurs (0-100) |
| `targetUsers` | `string[]?` | IDs d'utilisateurs ciblés |
| `targetRoles` | `string[]?` | Rôles ciblés (producer, buyer, etc.) |
| `environment` | `string?` | Environnement (dev, staging, prod) |

---

## Utilisation dans les composants

### Hook `useFeatureFlag`

```typescript
import { useFeatureFlag } from '../hooks/useFeatureFlag';

function Dashboard() {
  const { isEnabled, isLoading } = useFeatureFlag('new_dashboard');

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isEnabled) {
    return <NewDashboard />;
  }

  return <OldDashboard />;
}
```

### Avec contexte utilisateur

```typescript
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useAppSelector } from '../store/hooks';

function Component() {
  const user = useAppSelector((state) => state.auth.user);
  
  const { isEnabled } = useFeatureFlag('advanced_analytics', {
    userId: user?.id,
    role: user?.activeRole,
  });

  return isEnabled ? <AdvancedAnalytics /> : <BasicAnalytics />;
}
```

### Récupérer la valeur complète

```typescript
const { value, isEnabled } = useFeatureFlag('pricing_display');

// value peut être boolean, string, number, ou object
if (typeof value === 'string') {
  console.log('Variante:', value);
}
```

### Plusieurs flags à la fois

```typescript
import { useFeatureFlags } from '../hooks/useFeatureFlag';

function Component() {
  const flags = useFeatureFlags(['flag1', 'flag2', 'flag3']);

  if (flags.flag1.isEnabled && flags.flag2.isEnabled) {
    return <CombinedFeature />;
  }
}
```

---

## Tests A/B

### Définir un test A/B

```typescript
import { ABTestConfig } from '../services/FeatureFlagsService';

export const AB_TESTS: ABTestConfig[] = [
  {
    key: 'dashboard_layout',
    description: 'Test A/B du layout du dashboard',
    variants: [
      {
        name: 'control',
        percentage: 50,
        value: 'grid', // Layout en grille (actuel)
      },
      {
        name: 'variant_a',
        percentage: 50,
        value: 'list', // Layout en liste
      },
    ],
    defaultVariant: 'control',
    targetRoles: ['producer'],
  },
];
```

### Utiliser dans un composant

```typescript
import { useABTest } from '../hooks/useFeatureFlag';

function Dashboard() {
  const { variant, value } = useABTest('dashboard_layout');

  if (variant === 'list') {
    return <DashboardListLayout />;
  }

  return <DashboardGridLayout />;
}
```

### Assignation déterministe

L'assignation est **déterministe** : un utilisateur aura toujours la même variante.

```typescript
// User A → toujours "control"
// User B → toujours "variant_a"
// Même après redémarrage de l'app
```

---

## Rollout progressif

### Activer progressivement

```typescript
{
  key: 'new_feature',
  defaultValue: false,
  rolloutPercentage: 10, // 10% des utilisateurs
}
```

### Étapes recommandées

1. **Phase 1** : `rolloutPercentage: 0` (désactivé)
2. **Phase 2** : `rolloutPercentage: 10` (10% des utilisateurs)
3. **Phase 3** : `rolloutPercentage: 50` (50% des utilisateurs)
4. **Phase 4** : `rolloutPercentage: 100` (tous les utilisateurs)
5. **Phase 5** : Supprimer le flag (feature devenue permanente)

### Cibler des utilisateurs spécifiques

```typescript
{
  key: 'beta_feature',
  defaultValue: false,
  targetUsers: ['user-123', 'user-456'], // Beta testeurs
}
```

### Cibler par rôle

```typescript
{
  key: 'producer_only',
  defaultValue: false,
  targetRoles: ['producer'], // Seulement les producteurs
}
```

---

## Migration vers LaunchDarkly

Le système actuel est conçu pour être facilement migré vers LaunchDarkly.

### Étape 1 : Installer LaunchDarkly

```bash
npm install launchdarkly-react-native-client-sdk
```

### Étape 2 : Adapter le service

```typescript
import * as LaunchDarkly from 'launchdarkly-react-native-client-sdk';

class FeatureFlagsService {
  private ldClient: any;

  async initialize(userId: string) {
    this.ldClient = await LaunchDarkly.init('YOUR_SDK_KEY', {
      key: userId,
    });
  }

  async getFlagValue(flagKey: string, context: UserContext) {
    // Utiliser LaunchDarkly
    return await this.ldClient.variation(flagKey, context.defaultValue);
  }
}
```

### Étape 3 : Conserver la compatibilité

Le hook `useFeatureFlag` reste identique, seul le service change.

---

## Exemples pratiques

### Exemple 1 : Nouveau dashboard

```typescript
// config/featureFlags.ts
{
  key: 'new_dashboard',
  defaultValue: false,
  rolloutPercentage: 25, // 25% des utilisateurs
  targetRoles: ['producer'],
}

// screens/DashboardScreen.tsx
import { useFeatureFlag } from '../hooks/useFeatureFlag';

export default function DashboardScreen() {
  const { isEnabled, isLoading } = useFeatureFlag('new_dashboard');

  if (isLoading) return <LoadingSpinner />;
  
  return isEnabled ? <NewDashboard /> : <OldDashboard />;
}
```

### Exemple 2 : WebSocket Chat

```typescript
// config/featureFlags.ts
{
  key: 'websocket_chat',
  defaultValue: false,
  rolloutPercentage: 0,
  environment: 'development',
}

// hooks/useMarketplaceChat.ts
import { useFeatureFlag } from './useFeatureFlag';

export function useMarketplaceChat(transactionId: string) {
  const { isEnabled } = useFeatureFlag('websocket_chat');
  
  const transportType = isEnabled ? 'websocket' : 'polling';
  
  return createChatService({ transportType });
}
```

### Exemple 3 : Test A/B de layout

```typescript
// config/featureFlags.ts
{
  key: 'dashboard_layout',
  variants: [
    { name: 'grid', percentage: 50, value: 'grid' },
    { name: 'list', percentage: 50, value: 'list' },
  ],
}

// components/DashboardLayout.tsx
import { useABTest } from '../hooks/useFeatureFlag';

export function DashboardLayout() {
  const { variant } = useABTest('dashboard_layout');
  
  return variant === 'list' 
    ? <ListLayout /> 
    : <GridLayout />;
}
```

### Exemple 4 : Feature conditionnelle

```typescript
// Composant avec plusieurs flags
function AdvancedFeatures() {
  const analytics = useFeatureFlag('advanced_analytics');
  const ai = useFeatureFlag('ai_recommendations');
  
  return (
    <View>
      {analytics.isEnabled && <AdvancedAnalytics />}
      {ai.isEnabled && <AIRecommendations />}
    </View>
  );
}
```

---

## Bonnes pratiques

### ✅ À faire

- Utiliser des noms de flags descriptifs (`new_dashboard` plutôt que `flag1`)
- Documenter chaque flag avec `description`
- Tester les flags en développement avant le rollout
- Surveiller les métriques après activation
- Supprimer les flags obsolètes

### ❌ À éviter

- Ne pas créer trop de flags (max 10-15 actifs)
- Ne pas oublier de supprimer les flags après migration
- Ne pas utiliser les flags pour des configurations utilisateur
- Ne pas changer les pourcentages trop souvent

---

## Dépannage

### Le flag ne s'active pas

1. Vérifier que `initializeFeatureFlags()` est appelé
2. Vérifier le `rolloutPercentage` (0 = désactivé)
3. Vérifier le `targetRoles` ou `targetUsers`
4. Vérifier que l'utilisateur correspond aux critères

### L'assignation A/B change

L'assignation est déterministe basée sur `userId:flagKey`. Si l'utilisateur change, l'assignation peut changer. Pour forcer une assignation, utiliser `targetUsers`.

### Performance

Les flags sont mis en cache localement. Le premier appel peut être plus lent, les suivants sont instantanés.

---

## Support

Pour toute question ou problème :
- Voir les tests : `src/services/__tests__/FeatureFlagsService.test.ts`
- Voir la configuration : `src/config/featureFlags.ts`
- Voir les exemples dans cette documentation

