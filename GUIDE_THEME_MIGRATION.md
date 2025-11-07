# Guide de Migration vers le Thème Dynamique

Ce guide explique comment mettre à jour les composants pour utiliser le thème dynamique au lieu de `COLORS` directement.

## Pattern de Migration

### 1. Imports

**Avant :**
```typescript
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';
```

**Après :**
```typescript
import { SPACING, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
```

### 2. Utilisation dans le composant

**Avant :**
```typescript
export default function MonComposant() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
  },
  text: {
    color: COLORS.text,
  },
});
```

**Après :**
```typescript
export default function MonComposant() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Hello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Plus de backgroundColor ici
  },
  text: {
    // Plus de color ici
  },
});
```

### 3. Règles Générales

1. **Couleurs dynamiques** : Utiliser `colors.xxx` dans les styles inline
2. **Ombres** : Utiliser `colors.shadow.small/medium/large` dans les styles inline
3. **Bordures** : Utiliser `colors.border` dans les styles inline
4. **Styles statiques** : Garder dans `StyleSheet.create()` (padding, fontSize, etc.)

### 4. Exemples de Migration

#### Exemple 1 : Composant simple
```typescript
// Avant
<View style={{ backgroundColor: COLORS.surface, padding: SPACING.md }}>
  <Text style={{ color: COLORS.text }}>Texte</Text>
</View>

// Après
const { colors } = useTheme();
<View style={[{ backgroundColor: colors.surface }, { padding: SPACING.md }]}>
  <Text style={{ color: colors.text }}>Texte</Text>
</View>
```

#### Exemple 2 : Avec StyleSheet
```typescript
// Avant
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    ...COLORS.shadow.medium,
    borderColor: COLORS.border,
  },
});

// Après
const { colors } = useTheme();
const styles = StyleSheet.create({
  card: {
    // Styles statiques uniquement
  },
});

// Dans le JSX
<View style={[
  styles.card,
  {
    backgroundColor: colors.surface,
    ...colors.shadow.medium,
    borderColor: colors.border,
  }
]} />
```

## Liste des Fichiers à Migrer

### Screens (13 fichiers)
- [x] DashboardScreen.tsx
- [ ] WelcomeScreen.tsx
- [ ] AuthScreen.tsx
- [ ] CreateProjectScreen.tsx
- [ ] ReproductionScreen.tsx
- [ ] NutritionScreen.tsx
- [ ] FinanceScreen.tsx
- [ ] ReportsScreen.tsx
- [ ] PlanificationScreen.tsx
- [ ] ParametresScreen.tsx
- [ ] CollaborationScreen.tsx
- [ ] MortalitesScreen.tsx
- [ ] ProductionScreen.tsx

### Composants de Base (✅ Complétés)
- [x] Button.tsx
- [x] Card.tsx
- [x] FormField.tsx
- [x] CustomModal.tsx
- [x] EmptyState.tsx
- [x] LoadingSpinner.tsx
- [x] StatCard.tsx

### Widgets
- [ ] OverviewWidget.tsx
- [ ] ReproductionWidget.tsx
- [ ] FinanceWidget.tsx
- [ ] PerformanceWidget.tsx
- [ ] SecondaryWidget.tsx
- [ ] AlertesWidget.tsx

### Composants de Modules
- [ ] GestationsListComponent.tsx
- [ ] GestationsCalendarComponent.tsx
- [ ] GestationFormModal.tsx
- [ ] SevragesListComponent.tsx
- [ ] FinanceGraphiquesComponent.tsx
- [ ] FinanceChargesFixesComponent.tsx
- [ ] FinanceDepensesComponent.tsx
- [ ] PerformanceIndicatorsComponent.tsx
- [ ] TendancesChartsComponent.tsx
- [ ] PlanificationListComponent.tsx
- [ ] PlanificationCalendarComponent.tsx
- [ ] PlanificationFormModal.tsx
- [ ] CollaborationListComponent.tsx
- [ ] CollaborationFormModal.tsx
- [ ] MortalitesListComponent.tsx
- [ ] MortalitesFormModal.tsx
- [ ] NutritionStockComponent.tsx
- [ ] ProductionAnimalsListComponent.tsx
- [ ] ... (et autres)

## Notes Importantes

1. **Performance** : Les styles inline avec `colors` sont recalculés à chaque render, mais c'est acceptable car React Native optimise cela.

2. **Compatibilité** : `COLORS` est toujours exporté pour compatibilité, mais ne doit plus être utilisé dans les nouveaux composants.

3. **Tests** : Après migration, tester en mode clair ET sombre pour vérifier que tout fonctionne.

4. **Priorité** : Commencer par les composants les plus utilisés (screens, widgets) puis les composants spécifiques.

