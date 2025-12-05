# 🔍 Guide de Débogage - Erreur "Text strings must be rendered within a <Text> component"

## Problème

L'erreur `Text strings must be rendered within a <Text> component` persiste et aucun log n'arrive à capturer le call stack complet.

## Solutions Appliquées

### 1. Amélioration de l'ErrorBoundary

**Fichier:** `src/components/ErrorBoundary.tsx`

**Améliorations:**
- Extraction de TOUS les composants depuis le componentStack (pas seulement le premier)
- Extraction des fichiers et numéros de ligne depuis le componentStack
- Log du stack trace complet (premières 20 lignes)
- Log détaillé avec timestamp

**Logs maintenant disponibles:**
```javascript
🔴 [ErrorBoundary] ERREUR DE RENDU DE TEXTE DÉTECTÉE: {
  error: ...,
  message: ...,
  stack: ...,
  componentStack: ...,
  errorCount: ...,
  isRecurring: ...,
}
🔍 Composants dans la stack (ordre d'appel): [...]
📋 Stack trace complet (premières 20 lignes): [...]
📁 Fichiers dans la stack: [{ file: ..., line: ..., col: ... }]
```

### 2. Amélioration du GlobalTextRenderGuard

**Fichier:** `src/components/GlobalTextRenderGuard.tsx`

**Améliorations:**
- Logs détaillés avec stack trace complet (30 lignes)
- Extraction de tous les composants et fichiers
- Timestamp pour chaque erreur

### 3. Corrections de Code

**Fichiers modifiés:**

1. **`src/components/PerformanceIndicatorsComponent.tsx`**
   - Ligne 858: `''` → `null` dans expression ternaire
   - Ligne 874: `''` → `null` dans expression ternaire

2. **`src/components/production/AnimalCard.tsx`**
   - Ligne 96: `''` → `null` dans expression ternaire
   - Ligne 266: Correction de l'expression avec `unite_dosage`

3. **`src/components/marketplace/tabs/MarketplaceMyListingsTab.tsx`**
   - Ligne 76: `''` → `null` dans expression ternaire

### 4. Utilitaire de Débogage Créé

**Fichier:** `src/utils/textRenderingDebugger.tsx`

**Fonctionnalités:**
- `TextRenderingErrorBoundary`: ErrorBoundary spécialisé pour les erreurs de rendu de texte
- `useTextRenderingLogger`: Hook pour logger les valeurs avant de les rendre
- `safeRender`: Fonction utilitaire pour sécuriser le rendu d'une valeur

## Comment Utiliser

### Option 1: Vérifier les Logs Améliorés

Quand l'erreur se produit, vérifiez la console pour:
1. `🔴 [ErrorBoundary] ERREUR DE RENDU DE TEXTE DÉTECTÉE`
2. `🔍 Composants dans la stack`
3. `📋 Stack trace complet`
4. `📁 Fichiers dans la stack`

### Option 2: Utiliser TextRenderingErrorBoundary

Enveloppez un composant suspect avec `TextRenderingErrorBoundary`:

```tsx
import { TextRenderingErrorBoundary } from '../utils/textRenderingDebugger';

<TextRenderingErrorBoundary componentName="MonComposant">
  <MonComposant />
</TextRenderingErrorBoundary>
```

### Option 3: Utiliser useTextRenderingLogger

Ajoutez le hook dans un composant suspect:

```tsx
import { useTextRenderingLogger } from '../utils/textRenderingDebugger';

function MonComposant({ value }) {
  useTextRenderingLogger(value, 'value', 'MonComposant');
  // ...
}
```

## Patterns à Éviter

### ❌ Mauvais
```tsx
<View>
  {condition ? 'string' : ''}  // Chaîne vide rendue directement
</View>

<Text>
  {value || ''}  // Peut retourner chaîne vide
</Text>
```

### ✅ Bon
```tsx
<View>
  {condition ? <Text>string</Text> : null}  // null au lieu de ''
</View>

<Text>
  {value || null}  // null au lieu de ''
</Text>
```

## Prochaines Étapes

1. **Relancer l'application** et vérifier les nouveaux logs
2. **Identifier le composant** depuis les logs améliorés
3. **Vérifier les expressions ternaires** qui retournent des chaînes vides
4. **Remplacer `''` par `null`** dans les expressions conditionnelles

## Notes

- Les chaînes vides `''` dans un `<Text>` ne devraient normalement pas causer d'erreur
- Le problème peut venir de fragments ou de contextes où les chaînes sont rendues en dehors d'un Text
- Les logs améliorés devraient maintenant capturer le call stack complet

