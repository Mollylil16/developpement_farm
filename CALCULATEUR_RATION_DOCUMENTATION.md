# 📊 Documentation - Calculateur de Ration avec Recommandations Automatiques

## ✅ **Implémentation Terminée**

Date : 17 novembre 2024  
Statut : ✅ Opérationnel

---

## 🎯 **Vue d'ensemble**

Le module **Nutrition > Calculateur** a été restructuré en **2 sous-sections** distinctes avec un système de recommandations automatiques et calcul des coûts.

---

## 📁 **Structure Mise à Jour**

### **Avant**
```
Nutrition
├── Calculateur (mélange ingrédients + calcul)
├── Stocks
├── Historique Rations
└── Mouvements
```

### **Après** ✅
```
Nutrition
├── 🧮 Calculateur
│   ├── 📦 Ingrédients (Gestion des ingrédients et prix)
│   └── 🧮 Calculateur (Recommandations + Calculs)
├── 📦 Stocks
├── 📝 Historique
└── 📊 Mouvements
```

---

## 🔧 **Fonctionnalités Implémentées**

### **1. Section "📦 Ingrédients"**

**Emplacement** : `Nutrition > Calculateur > Ingrédients`

**Fonctionnalités** :
- ✅ Liste complète des ingrédients
- ✅ Affichage des prix unitaires (FCFA/kg, FCFA/g, etc.)
- ✅ Affichage des valeurs nutritionnelles (protéines %, énergie kcal/kg)
- ✅ Statistiques : Nombre total d'ingrédients, Prix moyen
- ✅ CRUD complet :
  - ➕ Ajouter un ingrédient
  - 🗑️ Supprimer un ingrédient
- ✅ Design moderne avec cartes colorées
- ✅ Gestion des permissions

**Fichier** : `src/components/IngredientsComponent.tsx`

---

### **2. Section "🧮 Calculateur de Ration"**

**Emplacement** : `Nutrition > Calculateur > Calculateur`

#### **📥 Inputs (Formulaire)**

L'utilisateur saisit :
1. **Type de porc** (sélection parmi 5 options) :
   - 🐷 Porcelet
   - 🐖 Truie gestante
   - 🐖 Truie allaitante
   - 🐗 Verrat
   - 🐷 Porc en croissance

2. **Poids moyen** (en kg)
   - Ex : 50 kg

3. **Nombre de porcs**
   - Ex : 20 porcs

4. **Durée d'alimentation** (en jours)
   - Par défaut : 30 jours (1 mois)
   - Modifiable

#### **💡 Recommandation Automatique**

Le système génère automatiquement une **formule alimentaire** adaptée au type de porc sélectionné.

**Exemple pour "Porc en croissance"** :
```
Formule : Aliment Croissance / Finition
Description : Formule pour porcs en croissance (25-100 kg)

Composition recommandée :
- Maïs : 65%
- Tourteau de soja : 20%
- Son de blé : 10%
- CMV (Complément Minéral Vitaminé) : 3%
- Lysine : 2%

Ration journalière : 2.5 kg/jour/porc
```

**Formules disponibles** (basées sur standards FAO) :
- ✅ Porcelet : Aliment Pré-démarrage (50% Maïs, 28% Tourteau, etc.)
- ✅ Truie gestante : Aliment Truie Gestante (60% Maïs, 15% Tourteau, etc.)
- ✅ Truie allaitante : Aliment Truie Allaitante (55% Maïs, 25% Tourteau, etc.)
- ✅ Verrat : Aliment Verrat (62% Maïs, 18% Tourteau, etc.)
- ✅ Porc en croissance : Aliment Croissance/Finition (65% Maïs, 20% Tourteau, etc.)

#### **📊 Calculs Automatiques**

Sur la base des **prix des ingrédients** (section Ingrédients) et de la **formule recommandée**, le système calcule :

##### **1. Quantité d'aliment requise**
```
Formule : Ration journalière × Nombre de porcs × Durée
Exemple : 2.5 kg/jour × 20 porcs × 30 jours = 1 500 kg
```

##### **2. Détails par ingrédient**
```
Pour chaque ingrédient :
- Quantité (kg) = Quantité totale × Pourcentage dans la formule
- Coût = Quantité × Prix unitaire

Exemple pour Maïs (65%, 300 FCFA/kg) :
- Quantité : 1 500 kg × 65% = 975 kg
- Coût : 975 kg × 300 FCFA/kg = 292 500 FCFA
```

##### **3. Coût total**
```
Somme des coûts de tous les ingrédients
Exemple : 292 500 + 135 000 + 30 000 + 112 500 = 570 000 FCFA
```

##### **4. Coût par kg d'aliment**
```
Formule : Coût total ÷ Quantité totale
Exemple : 570 000 FCFA ÷ 1 500 kg = 380 FCFA/kg
```

##### **5. Coût par porc**
```
Formule : Coût total ÷ Nombre de porcs
Exemple : 570 000 FCFA ÷ 20 porcs = 28 500 FCFA/porc (pour 30 jours)
```

#### **🎨 Affichage du Résultat**

Le résultat s'affiche en **3 cartes** :

1. **💡 Recommandation Nutritionnelle**
   - Nom de la formule
   - Description
   - Ration journalière recommandée

2. **📊 Composition Recommandée**
   - Tableau détaillé de chaque ingrédient :
     - Nom
     - Pourcentage
     - Quantité (kg)
     - Prix unitaire
     - Coût total
   - ⚠️ Alerte si un ingrédient n'a pas de prix défini

3. **💰 Résumé des Coûts**
   - Quantité totale requise
   - **Coût total** (en gros)
   - Coût par kg
   - Coût par porc

**Fichier** : `src/components/CalculateurRationComponent.tsx`

---

## 📚 **Fichiers Créés/Modifiés**

### **Nouveaux Fichiers**

1. **`src/components/IngredientsComponent.tsx`** (324 lignes)
   - Composant pour la gestion des ingrédients
   - Liste, statistiques, CRUD

2. **`src/components/CalculateurRationComponent.tsx`** (521 lignes)
   - Calculateur avec recommandations automatiques
   - Matching ingrédients BDD ↔ Formules
   - Calculs complets

3. **`src/screens/CalculateurNavigationScreen.tsx`** (42 lignes)
   - Navigation entre les 2 sous-sections
   - Tabs Material Top Navigator

### **Fichiers Modifiés**

1. **`src/types/nutrition.ts`**
   - Ajout des nouveaux types :
     - `CompositionIngredient`
     - `FormuleAlimentaire`
     - `ResultatCalculRation`
   - Ajout de `FORMULES_RECOMMANDEES` (formules par type de porc)
   - Correction du label "Verrat" (au lieu de "Verrats")

2. **`src/screens/NutritionScreen.tsx`**
   - Remplacement de `RationCalculatorComponent` par `CalculateurNavigationScreen`
   - Amélioration du style des tabs
   - Ajout d'emojis pour meilleure UX

---

## 🔄 **Logique de Matching Ingrédients**

Le système fait un **matching intelligent** entre les ingrédients recommandés et ceux en base de données :

```typescript
// Recherche par similarité de nom (insensible à la casse)
const ingredientTrouve = ingredients.find(ing => 
  ing.nom.toLowerCase().includes(comp.nom.toLowerCase()) ||
  comp.nom.toLowerCase().includes(ing.nom.toLowerCase())
);
```

**Exemples de matching** :
- Formule : "Maïs" → BDD : "Maïs grain" ✅
- Formule : "Tourteau de soja" → BDD : "Tourteau soja 44%" ✅
- Formule : "CMV" → BDD : "CMV Porc 5%" ✅

Si un ingrédient n'est pas trouvé :
- Prix = 0
- ⚠️ Alerte affichée à l'utilisateur
- Suggestion d'ajouter l'ingrédient manquant

---

## 📊 **Exemple Concret d'Utilisation**

### **Scénario** : Alimentation de porcs en croissance

#### **Inputs**
```
Type : Porc en croissance
Poids moyen : 50 kg
Nombre : 20 porcs
Durée : 30 jours
```

#### **Recommandation Automatique**
```
Formule : Aliment Croissance / Finition
Ration : 2.5 kg/jour/porc

Composition :
- Maïs (65%)
- Tourteau de soja (20%)
- Son de blé (10%)
- CMV (3%)
- Lysine (2%)
```

#### **Calculs**
```
Quantité totale : 2.5 × 20 × 30 = 1 500 kg

Détails :
┌─────────────────────┬────────┬─────────┬───────────┬─────────────┐
│ Ingrédient          │ %      │ Qté (kg)│ Prix/kg   │ Coût Total  │
├─────────────────────┼────────┼─────────┼───────────┼─────────────┤
│ Maïs                │ 65%    │ 975     │ 300 FCFA  │ 292 500 F   │
│ Tourteau de soja    │ 20%    │ 300     │ 450 FCFA  │ 135 000 F   │
│ Son de blé          │ 10%    │ 150     │ 200 FCFA  │ 30 000 F    │
│ CMV                 │ 3%     │ 45      │ 1500 FCFA │ 67 500 F    │
│ Lysine              │ 2%     │ 30      │ 2500 FCFA │ 75 000 F    │
└─────────────────────┴────────┴─────────┴───────────┴─────────────┘

═══════════════════════════════════════════════════════════════════
 Coût total         : 600 000 FCFA
 Coût/kg aliment    : 400 FCFA/kg
 Coût/porc (30 j)   : 30 000 FCFA
═══════════════════════════════════════════════════════════════════
```

---

## 🎨 **Interface Utilisateur**

### **Design**
- ✅ Cartes colorées avec ombres
- ✅ Emojis pour meilleure lisibilité
- ✅ Code couleur :
  - 🟢 Vert : Coûts, revenus, succès
  - 🔵 Bleu : Informations, recommandations
  - 🔴 Rouge : Alertes, suppressions
  - 🟡 Jaune : Avertissements
- ✅ Responsive et scrollable
- ✅ Animations fluides

### **Navigation**
```
Nutrition (Tab principale)
  ↓
🧮 Calculateur (Tab secondaire)
  ↓
  ├─ 📦 Ingrédients (Sous-tab 1)
  └─ 🧮 Calculateur (Sous-tab 2)
```

---

## ⚠️ **Gestion des Cas Limites**

### **1. Aucun ingrédient en BDD**
```
⚠️ Aucun ingrédient disponible

Ajoutez des ingrédients avec leurs prix dans la section 
"Ingrédients" pour utiliser le calculateur.
```

### **2. Ingrédients sans prix**
```
⚠️ Prix manquants

Certains ingrédients n'ont pas de prix défini :
• Lysine
• CMV (Complément Minéral Vitaminé)

Ajoutez-les dans la section "Ingrédients" pour un calcul précis.
```

### **3. Validation des inputs**
- ❌ Poids moyen ≤ 0 → Erreur
- ❌ Nombre de porcs ≤ 0 → Erreur
- ❌ Durée ≤ 0 → Erreur

---

## 🔐 **Permissions**

- **Créer ingrédient** : Permission `nutrition` + action `create`
- **Supprimer ingrédient** : Permission `nutrition` + action `delete`
- **Calculer ration** : Accessible à tous les utilisateurs avec permission `nutrition`

---

## 📱 **Compatibilité**

- ✅ iOS
- ✅ Android
- ✅ Mode clair / sombre
- ✅ Responsive (toutes tailles d'écran)

---

## 🚀 **Comment Utiliser**

### **Étape 1 : Ajouter des ingrédients**
1. Aller dans `Nutrition > Calculateur > Ingrédients`
2. Cliquer sur "➕ Ajouter un ingrédient"
3. Remplir :
   - Nom (ex: Maïs grain)
   - Unité (kg, g, l, ml)
   - Prix unitaire (ex: 300 FCFA/kg)
   - (Optionnel) % Protéines, Énergie kcal
4. Enregistrer

**Répéter pour tous les ingrédients** (Maïs, Tourteau de soja, Son, CMV, Lysine, etc.)

### **Étape 2 : Calculer une ration**
1. Aller dans `Nutrition > Calculateur > Calculateur`
2. Sélectionner le **type de porc**
3. Saisir le **poids moyen**
4. Saisir le **nombre de porcs**
5. Saisir la **durée** (par défaut 30 jours)
6. Cliquer sur "🧮 Calculer la ration"
7. **Résultat immédiat** :
   - Recommandation nutritionnelle
   - Composition détaillée
   - Coûts calculés

### **Étape 3 : Analyser les résultats**
- Vérifier la **quantité totale** nécessaire
- Consulter le **coût total**
- Comparer le **coût/kg** avec le marché
- Calculer la **rentabilité** (coût/porc)

---

## 🧪 **Tests Effectués**

✅ **Tests Fonctionnels**
- Ajout/suppression d'ingrédients
- Calcul de ration pour chaque type de porc
- Matching ingrédients BDD ↔ Formules
- Validation des inputs
- Gestion des prix manquants

✅ **Tests d'Interface**
- Navigation entre tabs
- Scroll des listes
- Responsive design
- Mode clair/sombre

✅ **Tests de Performance**
- Chargement rapide
- Calculs instantanés
- Pas de lag

---

## 📌 **Points Clés**

1. **✅ Séparation claire** : Ingrédients vs Calculateur
2. **✅ Recommandations automatiques** basées sur standards FAO
3. **✅ Calculs complets** : Quantité, coûts, détails
4. **✅ Matching intelligent** des ingrédients
5. **✅ Interface moderne** et intuitive
6. **✅ Gestion des erreurs** et cas limites

---

## 🎉 **Résultat Final**

Le module Nutrition dispose maintenant d'un **calculateur professionnel** qui :
- Recommande automatiquement des formules alimentaires adaptées
- Calcule précisément les quantités nécessaires
- Estime les coûts en temps réel
- Aide à la prise de décision pour l'alimentation du cheptel

**Parfait pour** :
- Planification budgétaire
- Optimisation des coûts d'alimentation
- Suivi de la rentabilité
- Prise de décision éclairée

---

**Date de mise à jour** : 17 novembre 2024  
**Statut** : ✅ Production Ready  
**Version** : 1.0.0

