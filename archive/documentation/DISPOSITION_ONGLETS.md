# 📱 Disposition des 9 Onglets - Fermier Pro

## 🎯 Disposition Actuelle

Les 9 onglets sont configurés dans une **Bottom Tab Navigator** (barre d'onglets en bas de l'écran).

### Ordre des Onglets

```
┌─────────────────────────────────────────────────────────────┐
│              Barre d'onglets (Bottom Tab)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Dashboard] [Reproduction] [Nutrition] [Finance] [Rapports]│
│                                                              │
│  [Planning] [Paramètres] [Collaboration] [Mortalités]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Configuration dans le Code

```43:105:fermier-pro/src/navigation/AppNavigator.tsx
      <Tab.Screen
        name={SCREENS.DASHBOARD}
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name={SCREENS.REPRODUCTION}
        component={ReproductionScreen}
        options={{
          tabBarLabel: 'Reproduction',
        }}
      />
      <Tab.Screen
        name={SCREENS.NUTRITION}
        component={NutritionScreen}
        options={{
          tabBarLabel: 'Nutrition',
        }}
      />
      <Tab.Screen
        name={SCREENS.FINANCE}
        component={FinanceScreen}
        options={{
          tabBarLabel: 'Finance',
        }}
      />
      <Tab.Screen
        name={SCREENS.REPORTS}
        component={ReportsScreen}
        options={{
          tabBarLabel: 'Rapports',
        }}
      />
      <Tab.Screen
        name={SCREENS.PLANIFICATION}
        component={PlanificationScreen}
        options={{
          tabBarLabel: 'Planning',
        }}
      />
      <Tab.Screen
        name={SCREENS.PARAMETRES}
        component={ParametresScreen}
        options={{
          tabBarLabel: 'Paramètres',
        }}
      />
      <Tab.Screen
        name={SCREENS.COLLABORATION}
        component={CollaborationScreen}
        options={{
          tabBarLabel: 'Collaboration',
        }}
      />
      <Tab.Screen
        name={SCREENS.MORTALITES}
        component={MortalitesScreen}
        options={{
          tabBarLabel: 'Mortalités',
        }}
      />
```

## 📐 Comportement sur Différentes Tailles d'Écran

### Sur Grands Écrans (Tablettes)
```
┌─────────────────────────────────────────────────────────────┐
│  [Dashboard] [Reproduction] [Nutrition] [Finance] [Rapports]│
│  [Planning] [Paramètres] [Collaboration] [Mortalités]      │
└─────────────────────────────────────────────────────────────┘
```
→ Tous les 9 onglets peuvent être visibles sur une seule ligne

### Sur Petits Écrans (Smartphones)
```
┌─────────────────────────────────────────────────────────────┐
│  [Dashboard] [Reprod.] [Nutrition] [Finance] [Rapports] ...│
│  ← Défilement horizontal automatique →                     │
└─────────────────────────────────────────────────────────────┘
```
→ React Navigation gère automatiquement le défilement horizontal

## 🎨 Style Actuel

- **Couleur active** : Vert primaire (`#2E7D32`)
- **Couleur inactive** : Gris secondaire (`#757575`)
- **Fond** : Blanc (`#FAFAFA`)
- **Bordure supérieure** : Gris clair (`#E0E0E0`)

## ⚠️ Note Importante

Avec **9 onglets**, la barre peut être :
- **Trop chargée** sur petits écrans
- **Lisible** mais nécessite du défilement
- **Optimale** sur tablettes

## 💡 Recommandations d'Amélioration (Optionnel)

Si vous souhaitez améliorer la disposition, voici quelques options :

### Option 1 : Icônes seulement (plus compact)
```
┌─────────────────────────────────────────────────────────────┐
│  [🏠] [🤰] [🥗] [💰] [📈] [📅] [⚙️] [👥] [💀]              │
└─────────────────────────────────────────────────────────────┘
```

### Option 2 : Regroupement par catégories
```
┌─────────────────────────────────────────────────────────────┐
│  [Dashboard] [Reprod.] [Nutrition] [Finance] [Rapports]    │
│  [Plus ▼] → Menu déroulant avec les 4 autres               │
└─────────────────────────────────────────────────────────────┘
```

### Option 3 : Ligne double (si supporté)
```
┌─────────────────────────────────────────────────────────────┐
│  [Dashboard] [Reprod.] [Nutrition] [Finance] [Rapports]    │
│  [Planning] [Paramètres] [Collaboration] [Mortalités]      │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Comportement Actuel

1. **Tous les 9 onglets sont affichés** dans l'ordre défini
2. **Défilement horizontal** si nécessaire sur petits écrans
3. **Labels visibles** pour chaque onglet
4. **Pas d'icônes** configurées actuellement (texte uniquement)

## 📝 Résumé

- **Type** : Bottom Tab Navigator
- **Nombre** : 9 onglets
- **Ordre** : Dashboard → Reproduction → Nutrition → Finance → Rapports → Planning → Paramètres → Collaboration → Mortalités
- **Disposition** : Ligne unique avec défilement horizontal automatique
- **Style** : Texte uniquement (pas d'icônes)

La disposition actuelle fonctionne, mais peut être optimisée avec des icônes pour réduire l'encombrement !

