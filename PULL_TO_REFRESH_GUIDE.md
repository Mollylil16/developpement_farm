# 🔄 Guide d'utilisation du Pull-to-Refresh

## ✅ Écrans avec Pull-to-Refresh activé

### 1. **DashboardScreen** 📊
- **Localisation**: `src/screens/DashboardScreen.tsx`
- **Données actualisées**:
  - Mortalités du projet
  - Animaux du cheptel (actifs et inactifs)
  - Pesées récentes
- **Utilisation**: Tirez vers le bas dans le Dashboard pour rafraîchir tous les widgets

### 2. **ProductionCheptelComponent** 🐷
- **Localisation**: `src/components/ProductionCheptelComponent.tsx`
- **Données actualisées**:
  - Liste complète des animaux actifs
  - Statistiques du cheptel
- **Utilisation**: Tirez vers le bas dans la liste du Cheptel

### 3. **ProductionHistoriqueComponent** 📜
- **Localisation**: `src/components/ProductionHistoriqueComponent.tsx`
- **Données actualisées**:
  - Animaux vendus, offerts, morts
- **Utilisation**: Tirez vers le bas dans l'Historique

## 🎨 Personnalisation

Le RefreshControl utilise automatiquement les couleurs du thème actif :
- **Couleur du spinner**: `colors.primary`
- **Texte (iOS)**: "Actualisation..."
- **Adapté au mode sombre**: ✅

## 🔧 Comment ça marche

1. **État de rafraîchissement** (`refreshing`):
   ```typescript
   const [refreshing, setRefreshing] = useState(false);
   ```

2. **Fonction de rafraîchissement** (`onRefresh`):
   ```typescript
   const onRefresh = useCallback(async () => {
     if (!projetActif?.id) return;
     
     setRefreshing(true);
     try {
       await dispatch(loadData(...)).unwrap();
     } catch (error) {
       console.error('Erreur:', error);
     } finally {
       setRefreshing(false);
     }
   }, [projetActif?.id, dispatch]);
   ```

3. **Intégration dans FlatList/ScrollView**:
   ```typescript
   <ScrollView
     refreshControl={
       <RefreshControl
         refreshing={refreshing}
         onRefresh={onRefresh}
         colors={[colors.primary]}
         tintColor={colors.primary}
       />
     }
   >
   ```

## 📝 Composants à ajouter (optionnel)

Si vous souhaitez ajouter le pull-to-refresh à d'autres écrans, voici les candidats potentiels :

### Composants de liste recommandés :
- ✅ `GestationsListComponent.tsx`
- ✅ `SevragesListComponent.tsx`
- ✅ `PlanificationListComponent.tsx`
- ✅ `MortalitesListComponent.tsx`
- ✅ `NutritionStockComponent.tsx`
- ✅ `FinanceRevenusComponent.tsx`
- ✅ `CollaborationListComponent.tsx`

### Template pour ajouter le pull-to-refresh :

```typescript
// 1. Importer RefreshControl
import { RefreshControl } from 'react-native';

// 2. Ajouter l'état
const [refreshing, setRefreshing] = useState(false);

// 3. Créer la fonction
const onRefresh = useCallback(async () => {
  if (!projetActif?.id) return;
  
  setRefreshing(true);
  try {
    await dispatch(loadYourData(projetActif.id)).unwrap();
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    setRefreshing(false);
  }
}, [projetActif?.id, dispatch]);

// 4. Ajouter à FlatList
<FlatList
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
    />
  }
  // ... autres props
/>
```

## 💡 Bonnes pratiques

1. ✅ Toujours utiliser `useCallback` pour `onRefresh`
2. ✅ Gérer les erreurs avec `try/catch`
3. ✅ Toujours appeler `setRefreshing(false)` dans `finally`
4. ✅ Vérifier que `projetActif` existe avant de charger
5. ✅ Utiliser `.unwrap()` avec les actions Redux asynchrones
6. ✅ Utiliser les couleurs du thème pour une cohérence visuelle

## 🎯 Résultat

- **Geste intuitif**: Tirez vers le bas pour actualiser
- **Feedback visuel**: Spinner animé pendant le chargement
- **Responsive**: Fonctionne instantanément
- **Cohérent**: Même expérience sur tous les écrans
- **Adaptatif**: S'adapte au thème clair/sombre

## 📱 Compatibilité

- ✅ iOS
- ✅ Android
- ✅ Mode clair
- ✅ Mode sombre

---

**Status**: ✅ Fonctionnalité implémentée et testée

