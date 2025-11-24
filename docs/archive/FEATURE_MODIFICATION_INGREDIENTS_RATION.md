# 🥕 Fonctionnalité : Modification des Ingrédients de Ration

**Date:** 21 Novembre 2025  
**Contexte:** Amélioration de la gestion des rations avec alternatives africaines

---

## 🎯 Objectif

Permettre aux utilisateurs de :
1. **Modifier les ingrédients** d'une ration existante (ajouter/retirer)
2. **Ajuster les pourcentages** de chaque ingrédient
3. **Recalculer automatiquement** les coûts
4. **Voir des alternatives** d'ingrédients adaptées au contexte africain

---

## ✨ Fonctionnalités Ajoutées

### 1. Nouveau Bouton dans les Cartes de Ration

Dans chaque carte de ration, un nouveau bouton 🥕 permet de modifier les ingrédients :

```tsx
<TouchableOpacity
  style={[styles.actionButton, { backgroundColor: colors.info + '20' }]}
  onPress={() => handleModifierIngredients(item)}
>
  <Text style={[styles.actionButtonText, { color: colors.info }]}>🥕</Text>
</TouchableOpacity>
```

**Ordre des boutons :**
- ✏️ Modifier la ration (paramètres généraux)
- 🥕 **NOUVEAU** Modifier les ingrédients
- 🔄 Recalculer avec prix actuels
- 🗑️ Supprimer

---

### 2. Modale de Modification des Ingrédients

**Fichier:** `src/components/ModifierIngredientsRationModal.tsx`

#### Fonctionnalités

✅ **Afficher les ingrédients actuels** avec leurs pourcentages  
✅ **Modifier les pourcentages** via input numérique  
✅ **Supprimer des ingrédients** (bouton 🗑️)  
✅ **Ajouter des ingrédients** depuis la liste disponible  
✅ **Voir des alternatives** (bouton ℹ️) pour chaque ingrédient  
✅ **Validation automatique** du total à 100%  
✅ **Recalcul automatique** des coûts

#### Interface

**Modale principale:**
```
┌─────────────────────────────────────┐
│ Modifier les ingrédients           │ ❌
│ Ration: Porcelets - Bâtiment A     │
├─────────────────────────────────────┤
│ Total : 100.0% ✅                   │
├─────────────────────────────────────┤
│ ┌─ Maïs grain ──────────────── ℹ️🗑️│
│ │ Pourcentage : [  50  ] %        │
│ │ Prix: 250 FCFA/kg               │
│ └─────────────────────────────────│
│ ┌─ Tourteau de soja ────────── ℹ️🗑️│
│ │ Pourcentage : [  30  ] %        │
│ │ Prix: 350 FCFA/kg               │
│ └─────────────────────────────────│
│ ┌─ Son de blé ────────────────  ℹ️🗑️│
│ │ Pourcentage : [  20  ] %        │
│ │ Prix: 150 FCFA/kg               │
│ └─────────────────────────────────│
│                                     │
│ ➕ Ajouter un ingrédient           │
├─────────────────────────────────────┤
│ [Annuler]         [Valider]         │
└─────────────────────────────────────┘
```

**Modale de sélection d'ingrédient:**
```
┌─────────────────────────────────────┐
│ Sélectionner un ingrédient         │ ❌
├─────────────────────────────────────┤
│ ┌─ Riz brisé ───────────────────✓│
│ │ 200 FCFA/kg                     │
│ └─────────────────────────────────│
│ ┌─ Manioc séché ──────────────────│
│ │ 180 FCFA/kg                     │
│ └─────────────────────────────────│
│ ┌─ Farine de niébé ───────────────│
│ │ 300 FCFA/kg                     │
│ └─────────────────────────────────│
├─────────────────────────────────────┤
│ Pourcentage dans la ration :       │
│ [  10  ] %                         │
│ 💡 Ajustez les % ensuite pour 100% │
├─────────────────────────────────────┤
│ [Annuler]         [Ajouter]         │
└─────────────────────────────────────┘
```

---

### 3. Base de Données d'Alternatives Africaines

**Fichier:** `src/constants/alternativesIngredients.ts`

#### 10 Ingrédients de Base avec Alternatives

| Ingrédient Original | Alternatives Proposées | Disponibilité |
|--------------------|----------------------|---------------|
| **Maïs grain** | Sorgho, Mil, Riz brisé, Manioc séché | ✅ Facile |
| **Tourteau de soja** | Tourteau d'arachide, Tourteau de coton, Farine de niébé, Farine de poisson, Termites séchés | ✅ Facile |
| **Son de blé** | Son de riz, Son de maïs, Drêche de sorgho | ✅ Facile |
| **Tourteau de palmiste** | Amande de palme broyée, Coprah | ✅ Facile |
| **Farine de viande** | Farine de sang, Farine d'os, Escargots séchés | ⚠️ Moyenne |
| **CMV** | Coquilles d'œufs broyées, Coquilles d'huîtres, Sel + Argile, Feuilles de moringa | ✅ Facile |
| **Mélasse** | Jus de canne, Pulpe de fruits mûrs, Jus de baobab | ✅ Facile |
| **Huile de soja** | Huile de palme rouge, Huile d'arachide, Graines de coton | ✅ Facile |
| **Lysine** | Farine de poisson local, Vers de terre séchés | ⚠️ Moyenne |
| **Phosphate bicalcique** | Farine d'os calcinés, Cendre de bois | ⚠️ Moyenne |

#### Format des Alternatives

Chaque alternative contient :
```typescript
{
  nom: string,
  description: string,
  disponibilite: 'facile' | 'moyenne' | 'difficile',
  cout: 'economique' | 'moyen' | 'cher',
  remarques?: string  // Conseils pratiques
}
```

#### Exemple d'Affichage

```
💡 Alternatives pour "Tourteau de soja" :

1. Tourteau d'arachide ✅ 💰
   Résidu de l'extraction d'huile d'arachide
   ℹ️ Très disponible en Afrique de l'Ouest. 
   Riche en protéines (45-50%).

2. Tourteau de coton ✅ 💰
   Résidu de l'extraction d'huile de coton
   ℹ️ Disponible dans les zones cotonnières. 
   Attention au gossypol (max 15% de la ration).

3. Farine de niébé (haricot) ✅ 💰💰
   Haricots locaux broyés
   ℹ️ Riche en protéines (22-25%). 
   Facilement disponible sur les marchés.

4. Farine de poisson ⚠️ 💰💰
   Poisson séché et broyé
   ℹ️ Excellente source de protéines (60-70%). 
   Disponible en zones côtières.

5. Termites séchés ⚠️ 💰
   Termites collectés et séchés
   ℹ️ Très riche en protéines (45-50%). 
   Pratique traditionnelle en zone rurale.

Légende:
✅ = Facile à trouver | ⚠️ = Disponibilité moyenne | ❌ = Difficile
💰 = Économique | 💰💰 = Prix moyen | 💰💰💰 = Cher
```

---

## 🔄 Flux Utilisateur

### 1. Modification Simple

```
1. Clic sur bouton 🥕 d'une ration
2. Modale s'ouvre avec ingrédients actuels
3. Modifier pourcentages
4. Clic "Valider"
5. ✅ Ration mise à jour avec nouveaux coûts
```

### 2. Ajout d'Ingrédient

```
1. Dans la modale, clic "➕ Ajouter un ingrédient"
2. Une nouvelle modale s'ouvre avec la liste des ingrédients disponibles
3. Sélectionner l'ingrédient désiré
4. Définir le pourcentage voulu (ex: 10%)
5. Clic "Ajouter"
6. L'ingrédient est ajouté à la liste
7. Ajuster les autres pourcentages pour atteindre 100%
8. Clic "Valider"
9. ✅ Ration mise à jour avec recalcul des coûts
```

### 3. Voir les Alternatives

```
1. Dans la modale, clic bouton ℹ️ d'un ingrédient
2. Alert s'affiche avec liste d'alternatives
3. Lecture des alternatives avec descriptions
4. Fermer l'alert
5. Utilisateur peut aller dans "Ingrédients" pour ajouter l'alternative
```

### 4. Suppression d'Ingrédient

```
1. Dans la modale, clic bouton 🗑️ d'un ingrédient
2. Confirmation demandée
3. Clic "Supprimer"
4. Ingrédient retiré de la liste
5. Ajuster les autres pourcentages pour atteindre 100%
```

---

## 💻 Implémentation Technique

### Fichiers Créés

1. **`src/constants/alternativesIngredients.ts`** (250 lignes)
   - Base de données des alternatives
   - Fonctions helpers : `getAlternatives()`, `hasAlternatives()`, `getAlternativesText()`

2. **`src/components/ModifierIngredientsRationModal.tsx`** (400 lignes)
   - Modale de modification
   - Gestion des états
   - Validation des pourcentages
   - Interface utilisateur

### Fichiers Modifiés

3. **`src/components/BudgetisationAlimentComponent.tsx`**
   - Ajout import de la modale
   - Ajout états : `showModifierIngredientsModal`, `rationAModifier`
   - Ajout fonctions : `handleModifierIngredients()`, `handleSauvegarderIngredientsModifies()`
   - Ajout bouton 🥕 dans carte de ration
   - Ajout modale dans le JSX

---

## 🎨 Design

### Boutons d'Action

| Bouton | Couleur | Fonction |
|--------|---------|----------|
| ✏️ | Vert | Modifier paramètres généraux |
| 🥕 | Bleu | **Modifier ingrédients** |
| 🔄 | Primary | Recalculer avec prix actuels |
| 🗑️ | Rouge | Supprimer la ration |

### Validation Visuelle

- **Total = 100%** : Carte verte ✅
- **Total ≠ 100%** : Carte orange ⚠️

---

## 🌍 Alternatives Africaines - Détails

### Critères de Sélection

Les alternatives proposées respectent :
1. ✅ **Disponibilité locale** en Afrique subsaharienne
2. ✅ **Coût abordable** pour les éleveurs
3. ✅ **Valeur nutritionnelle** équivalente ou proche
4. ✅ **Pratiques traditionnelles** reconnues

### Zones Géographiques Couvertes

- **Afrique de l'Ouest** : Sénégal, Mali, Burkina Faso, Côte d'Ivoire, Ghana, Niger
- **Afrique Centrale** : Cameroun, RDC, Congo
- **Afrique de l'Est** : Kenya, Tanzanie, Ouganda
- **Zone Sahélienne** : Sorgho, mil, drêche de dolo
- **Zones côtières** : Farine de poisson, coquilles d'huîtres
- **Zones tropicales** : Palmiste, manioc, fruits tropicaux

### Sources de Protéines Alternatives

**Protéines végétales :**
- Tourteau d'arachide (45-50%)
- Tourteau de coton (35-40%)
- Farine de niébé (22-25%)
- Farine de soja local

**Protéines animales :**
- Farine de poisson local (60-70%)
- Termites séchés (45-50%)
- Escargots géants séchés (40-45%)
- Vers de terre séchés (50-60%)
- Farine de sang (80-85%)

**Sources de calcium :**
- Coquilles d'œufs broyées
- Coquilles d'huîtres broyées
- Farine d'os calcinés
- Cendre de bois (2% max)

**Sources d'énergie :**
- Sorgho, mil, riz brisé
- Manioc séché
- Huile de palme rouge
- Jus de canne à sucre

---

## 📊 Avantages

### Pour l'Utilisateur

✅ **Flexibilité** - Adapter les rations selon disponibilité locale  
✅ **Économies** - Utiliser des alternatives moins chères  
✅ **Autonomie** - Moins de dépendance aux ingrédients importés  
✅ **Innovation** - Tester différentes formulations  
✅ **Savoir local** - Valoriser les ressources locales

### Pour l'Application

✅ **Valeur ajoutée** - Fonctionnalité unique et adaptée  
✅ **Contextualisation** - Spécifique au contexte africain  
✅ **Éducation** - Informe sur les alternatives disponibles  
✅ **Praticité** - Facilite la gestion au quotidien

---

## 🧪 Tests Recommandés

### Tests Fonctionnels

1. ✅ Ouvrir la modale de modification
2. ✅ Modifier les pourcentages
3. ✅ Ajouter un ingrédient
4. ✅ Supprimer un ingrédient
5. ✅ Voir les alternatives
6. ✅ Valider avec total = 100%
7. ✅ Tenter de valider avec total ≠ 100%
8. ✅ Annuler les modifications
9. ✅ Recalcul des coûts après modification

### Tests d'Intégration

1. ✅ Modifier ingrédients → Sauvegarder → Vérifier en base de données
2. ✅ Modifier ingrédients → Recalculer → Vérifier nouveaux coûts
3. ✅ Ajouter alternative → Créer ration → Vérifier calculs

---

## 📝 Documentation Utilisateur

### Guide Rapide

**Comment modifier les ingrédients d'une ration ?**

1. Sur la carte de la ration, cliquez sur 🥕
2. Modifiez les pourcentages des ingrédients
3. Ajoutez ou retirez des ingrédients si nécessaire
4. Assurez-vous que le total fait 100%
5. Cliquez sur "Valider"

**Comment trouver des alternatives locales ?**

1. Dans la modale de modification, cliquez sur ℹ️ à côté d'un ingrédient
2. Consultez la liste d'alternatives adaptées à votre région
3. Notez les alternatives intéressantes
4. Allez dans "Ingrédients" pour ajouter ces alternatives à votre base
5. Revenez modifier la ration pour utiliser les nouvelles alternatives

---

## 🚀 Évolutions Futures

### Court Terme
- [ ] Ajouter plus d'alternatives (20+ ingrédients)
- [ ] Filtrer alternatives par région (Ouest, Centre, Est)
- [ ] Calculateur de conversion (sac → kg)

### Moyen Terme
- [ ] Photos des alternatives
- [ ] Vidéos de préparation
- [ ] Fournisseurs locaux suggérés
- [ ] Prix moyens par région

### Long Terme
- [ ] IA pour suggérer meilleures alternatives
- [ ] Communauté : partage de formulations
- [ ] Certification qualité alternatives
- [ ] Marketplace ingrédients locaux

---

## ✅ Résultat

Une fonctionnalité complète et contextual isée qui :
- ✅ Permet de **modifier facilement** les ingrédients des rations
- ✅ Propose des **alternatives africaines** adaptées
- ✅ **Recalcule automatiquement** les coûts
- ✅ **Valorise les ressources locales**
- ✅ Offre une **expérience utilisateur fluide**

**Cette fonctionnalité rend l'application véritablement utile et adaptée au contexte africain ! 🌍🥕**

---

**Date:** 21 Novembre 2025  
**Version:** 1.0.0  
**Status:** ✅ Implémentation complète

