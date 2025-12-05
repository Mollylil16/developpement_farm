# 🔄 Plan d'ajout du RefreshControl à tous les écrans

## ✅ Composants déjà avec RefreshControl

- ✅ DashboardScreen
- ✅ SanteScreen (SanteContent)
- ✅ VaccinationScreen
- ✅ PlanningProductionScreen
- ✅ FinanceGraphiquesComponent
- ✅ ProductionCheptelComponent
- ✅ ProductionHistoriqueComponent
- ✅ MortalitesListComponent
- ✅ GestationsListComponent (vient d'être ajouté)

## 🔧 Composants à mettre à jour

### Reproduction
- [ ] SevragesListComponent
- [ ] GestationsCalendarComponent

### Finance
- [ ] FinanceChargesFixesComponent
- [ ] FinanceDepensesComponent
- [ ] FinanceRevenusComponent

### Nutrition
- [ ] IngredientsComponent
- [ ] NutritionStockComponent
- [ ] RationsHistoryComponent
- [ ] BudgetisationAlimentComponent

### Production
- [ ] ProductionAnimalsListComponent

### Planification
- [ ] PlanificationListComponent

### Collaboration
- [ ] CollaborationListComponent

### Profil
- [ ] ProfilScreen (composant principal)

### Paramètres
- [ ] ParametresProjetComponent
- [ ] ParametresAppComponent

## 📋 Template à appliquer

```typescript
// 1. Ajouter import
import { RefreshControl } from 'react-native';

// 2. Ajouter état
const [refreshing, setRefreshing] = useState(false);

// 3. Ajouter fonction de refresh
const onRefresh = useCallback(async () => {
  if (!projetActif?.id) return;
  
  setRefreshing(true);
  try {
    await Promise.all([
      dispatch(loadData1(projetActif.id)).unwrap(),
      dispatch(loadData2(projetActif.id)).unwrap(),
      // ... autres chargements
    ]);
  } catch (error) {
    console.error('Erreur lors du rafraîchissement:', error);
  } finally {
    setRefreshing(false);
  }
}, [dispatch, projetActif?.id]);

// 4. Ajouter au FlatList/ScrollView
refreshControl={
  <RefreshControl
    refreshing={refreshing}
    onRefresh={onRefresh}
    colors={[colors.primary]}
    tintColor={colors.primary}
  />
}
```

