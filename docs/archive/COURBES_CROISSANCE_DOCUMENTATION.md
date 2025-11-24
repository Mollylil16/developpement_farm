# 📈 Courbes de Croissance - Documentation

## 📋 Vue d'ensemble

Le module **Courbes de Croissance** permet de visualiser et comparer les performances de croissance réelles des porcs avec les standards recommandés basés sur les rations nutritionnelles. Il offre une analyse détaillée par type de porc pour optimiser l'alimentation et améliorer les performances du cheptel.

## 🎯 Objectifs

1. **Suivi de la croissance** : Visualiser l'évolution du poids des animaux dans le temps
2. **Comparaison avec standards** : Comparer le GMQ réel avec les recommandations nutritionnelles
3. **Optimisation de l'alimentation** : Identifier les écarts et ajuster les rations
4. **Prise de décision** : Données visuelles pour améliorer les performances
5. **Traçabilité** : Historique complet des performances par type de porc

## 📊 Fonctionnalités

### 1. Sélection par Type de Porc

Le module permet d'analyser 5 types de porcs :

| Type | Emoji | Couleur | Description |
|------|-------|---------|-------------|
| **Porcelets** | 🐷 | Orange | < 30 kg |
| **Truies Gestantes** | 🤰 | Rose | Femelles reproductrices en gestation |
| **Truies Allaitantes** | 🍼 | Violet | Femelles en lactation |
| **Verrats** | 🐗 | Bleu | Mâles reproducteurs |
| **Porcs en Croissance** | 📈 | Vert | > 30 kg, non reproducteurs |

### 2. Statistiques Clés

Pour chaque type de porc, le module affiche :

#### GMQ (Gain Moyen Quotidien)
- **GMQ Moyen Réel** : Calculé à partir des pesées
- **GMQ Recommandé** : Basé sur les rations nutritionnelles
- **Écart** : Différence entre réel et recommandé (avec code couleur)

#### Effectif et Poids
- **Effectif** : Nombre d'animaux du type sélectionné
- **Poids Minimum** : Poids le plus bas enregistré
- **Poids Maximum** : Poids le plus élevé enregistré

### 3. Graphique de Croissance

#### Courbes Affichées

1. **Poids Réel** (Vert)
   - Données issues des pesées effectuées
   - Courbe lisse (bezier) pour meilleure lisibilité
   - Points de données visibles

2. **Poids Théorique** (Rouge)
   - Calculé à partir du GMQ recommandé
   - Basé sur la ration nutritionnelle optimale
   - Ligne de référence sans points

#### Caractéristiques
- **Scroll horizontal** : Si plus de 10 points de données
- **Échelle automatique** : Adapté aux données
- **Labels de dates** : Format JJ/MM
- **Suffixe "kg"** : Sur l'axe Y

### 4. Recommandations Nutritionnelles

Affichage détaillé pour le type de porc sélectionné :

- **Ration quotidienne** : kg/jour
- **Protéines** : Pourcentage requis
- **Énergie** : kcal/kg
- **Nombre de repas par jour** : Si applicable

## 🔧 Fonctionnement Technique

### Classification Automatique des Animaux

L'algorithme classe les animaux en fonction de :

```typescript
if (poids < 30 kg) {
  type = 'porcelet';
} else if (sexe === 'femelle' && reproducteur) {
  type = 'truie_gestante'; // ou truie_allaitante selon contexte
} else if (sexe === 'male' && reproducteur) {
  type = 'verrat';
} else {
  type = 'porc_croissance';
}
```

### Calcul du GMQ Moyen

```typescript
// Pour chaque animal
gmqTotal = 0;
nbPesees = 0;

for (pesee in pesees) {
  if (pesee.gmq) {
    gmqTotal += pesee.gmq;
    nbPesees++;
  }
}

gmqMoyen = gmqTotal / nbPesees;
```

### Calcul du Poids Théorique

```typescript
poidsTheorique = poidsInitial + (gmqCible * joursEcoules) / 1000;

// Exemple:
// Poids initial: 20 kg
// GMQ cible: 550 g/jour
// Jours écoulés: 30
// Poids théorique = 20 + (550 * 30) / 1000 = 36.5 kg
```

### Sources de Données

1. **Redux Store**
   - `selectAllAnimaux` : Liste des animaux
   - `selectAllPesees` : Liste des pesées

2. **Nutrition Types**
   - `RECOMMANDATIONS_NUTRITION` : Standards par type de porc
   - GMQ cible, ration quotidienne, protéines, énergie

3. **Filtres**
   - Projet actif
   - Statut actif uniquement
   - Type de porc sélectionné

## 📱 Interface Utilisateur

### Navigation

```
Rapports → Onglet "📈 Croissance"
```

### Structure de l'Écran

```
┌─────────────────────────────────────────┐
│ 📈 Courbes de Croissance                │
│ Comparez le GMQ réel avec les rations   │
├─────────────────────────────────────────┤
│ Type de porc:                           │
│ [🐷 Porcelets] [🤰 Truies G.] [...]    │
├─────────────────────────────────────────┤
│ 🐷 Porcelets                            │
│                                         │
│ Effectif: 25     GMQ Réel: 520 g/j     │
│ GMQ Recom: 550   Écart: -30 g/j        │
│ Poids Min: 8kg   Poids Max: 28kg       │
├─────────────────────────────────────────┤
│ 📊 Évolution du Poids                   │
│ ┌─────────────────────────────────────┐ │
│ │        Graphique Courbes            │ │
│ │  [Ligne Verte = Poids Réel]        │ │
│ │  [Ligne Rouge = Poids Théorique]   │ │
│ └─────────────────────────────────────┘ │
│ ● Poids Réel  ● Poids Théorique        │
├─────────────────────────────────────────┤
│ 🍽️ Recommandations Nutritionnelles     │
│ Ration quotidienne : 1.25 kg/jour      │
│ Protéines : 18%                        │
│ Énergie : 3300 kcal/kg                 │
│ Repas par jour : 3                     │
└─────────────────────────────────────────┘
```

### Codes Couleur

#### Écart GMQ
- **Vert** : GMQ réel ≥ GMQ recommandé ✅
- **Jaune** : GMQ réel < GMQ recommandé ⚠️

#### Courbes
- **Vert (#10B981)** : Poids réel
- **Rouge (#EF4444)** : Poids théorique

#### Boutons Type
- **Fond coloré + bordure épaisse** : Type sélectionné
- **Fond gris + bordure fine** : Type non sélectionné

## 📊 Interprétation des Données

### Scénario 1 : GMQ Réel > GMQ Recommandé

```
GMQ Réel : 580 g/j
GMQ Recommandé : 550 g/j
Écart : +30 g/j (VERT)
```

**Interprétation :**
- ✅ Excellente performance
- ✅ Alimentation optimale ou supérieure
- ✅ Potentiel de réduction des coûts alimentaires

**Actions :**
- Maintenir la ration actuelle
- Analyser le coût/bénéfice d'une réduction
- Utiliser comme référence

### Scénario 2 : GMQ Réel < GMQ Recommandé

```
GMQ Réel : 480 g/j
GMQ Recommandé : 550 g/j
Écart : -70 g/j (JAUNE)
```

**Interprétation :**
- ⚠️ Performance inférieure aux standards
- ⚠️ Possible sous-alimentation
- ⚠️ Problème sanitaire ou environnemental

**Actions :**
- Augmenter la ration quotidienne
- Vérifier la qualité de l'aliment
- Examiner l'état de santé du cheptel
- Améliorer les conditions d'élevage

### Scénario 3 : Écart Important entre Courbes

```
Poids Réel : Plateau ou stagnation
Poids Théorique : Croissance continue
```

**Interprétation :**
- 🚨 Problème de croissance
- 🚨 Alimentation inadéquate
- 🚨 Stress ou maladie

**Actions :**
- Diagnostic vétérinaire
- Révision complète de l'alimentation
- Analyse des facteurs environnementaux

## 🎓 Bonnes Pratiques

### 1. Pesées Régulières

**Fréquence recommandée :**
- Porcelets : 1x/semaine
- Porcs en croissance : 1x/2 semaines
- Reproducteurs : 1x/mois

**Pourquoi ?**
- Plus de points de données = graphiques plus précis
- Détection précoce des problèmes
- Ajustements rapides possibles

### 2. Saisie Complète

**Informations essentielles :**
- Date exacte de la pesée
- Poids précis (balance calibrée)
- Commentaires (si anomalie)

### 3. Interprétation Contextuelle

**Facteurs à considérer :**
- **Saison** : Température influence la croissance
- **Santé** : Maladies ralentissent le GMQ
- **Densité** : Surpopulation réduit les performances
- **Qualité aliment** : Fraîcheur et composition

### 4. Actions Correctives

**Si GMQ < Recommandé :**

1. **Court terme (immédiat)**
   - Augmenter la ration de 10-15%
   - Vérifier la disponibilité en eau
   - Contrôler la température

2. **Moyen terme (1-2 semaines)**
   - Analyser la composition de l'aliment
   - Déparasitage si nécessaire
   - Améliorer la ventilation

3. **Long terme (1 mois+)**
   - Revoir la formule alimentaire
   - Investir dans l'infrastructure
   - Former le personnel

## 📈 Exemples d'Utilisation

### Exemple 1 : Porcelets

**Données :**
- Effectif : 30 porcelets
- GMQ Réel : 420 g/j
- GMQ Recommandé : 550 g/j
- Poids Min/Max : 5-25 kg

**Analyse :**
- Écart de -130 g/j (23% en dessous)
- Performance insuffisante

**Actions :**
- Augmenter la ration à 1.5 kg/jour
- Ajouter complément protéique (20%)
- Vérifier température maternité (28-30°C)
- Prévoir pesée dans 7 jours

**Résultat Attendu :**
- GMQ passe à 500-520 g/j sous 2 semaines
- Courbe verte se rapproche de la rouge

### Exemple 2 : Porcs en Croissance

**Données :**
- Effectif : 50 porcs
- GMQ Réel : 680 g/j
- GMQ Recommandé : 650 g/j
- Poids Min/Max : 35-95 kg

**Analyse :**
- Écart de +30 g/j (5% au-dessus)
- Excellente performance

**Actions :**
- Maintenir la ration actuelle
- Calculer le coût au kg de gain
- Envisager réduction de 5% si coût élevé
- Documenter pour future référence

**Résultat :**
- Performance optimale
- Rentabilité maximale

## 🔍 Diagnostics Courants

### Problème 1 : "Aucune donnée disponible"

**Causes :**
- Pas d'animaux de ce type dans le cheptel
- Animaux présents mais aucune pesée
- Toutes les pesées sont pour d'autres types

**Solutions :**
1. Ajouter des animaux (Production → Cheptel)
2. Effectuer des pesées (Production → Suivi des Pesées)
3. Attendre quelques minutes (rechargement)

### Problème 2 : GMQ à 0

**Causes :**
- Une seule pesée par animal
- Pesées trop espacées
- Dates de pesée incorrectes

**Solutions :**
1. Effectuer au moins 2 pesées par animal
2. Respecter la fréquence recommandée
3. Vérifier les dates saisies

### Problème 3 : Courbes erratiques

**Causes :**
- Erreurs de saisie de poids
- Balance non calibrée
- Animaux différents confondus

**Solutions :**
1. Vérifier les données dans "Suivi des Pesées"
2. Calibrer la balance
3. Corriger les poids erronés

## 🔄 Mises à Jour

### Fréquence de Rafraîchissement

- **Automatique** : À chaque ouverture de l'onglet
- **Manuel** : Quitter et rouvrir l'écran Rapports
- **Données en temps réel** : Dès qu'une pesée est ajoutée

### Calculs Recalculés

Lors de l'ouverture :
- Classification des animaux par type
- Calcul des GMQ moyens
- Génération des courbes
- Mise à jour des statistiques

## 📚 Références

### Normes GMQ (g/jour)

| Type | GMQ Cible | Source |
|------|-----------|--------|
| Porcelet (0-30kg) | 350-450 | INRAE |
| Croissance (30-60kg) | 550-650 | IFIP |
| Croissance (60-100kg) | 700-800 | IFIP |
| Truie Gestante | N/A | Maintien poids |
| Truie Allaitante | N/A | Maintien poids |
| Verrat | N/A | Maintien poids |

### Besoins Nutritionnels

Basés sur les standards :
- **INRAE** (Institut National de Recherche Agronomique)
- **IFIP** (Institut du Porc)
- **Tables de composition** : INRA-CIRAD-AFZ

## 🆘 Support

### Problèmes Techniques

1. **Graphique ne s'affiche pas**
   - Vérifier qu'il y a au moins 2 pesées
   - Vérifier que les dates sont correctes
   - Redémarrer l'application

2. **Données incohérentes**
   - Exporter les pesées
   - Vérifier les doublons
   - Corriger dans "Suivi des Pesées"

3. **Performance lente**
   - Archiver les vieux animaux
   - Limiter à 100 animaux actifs/type
   - Optimiser la base de données

### Questions Fréquentes

**Q : Pourquoi mon porcelet est classé en "Croissance" ?**
R : Si son poids dépasse 30 kg, il passe automatiquement en catégorie "Porc en Croissance".

**Q : Comment changer le GMQ recommandé ?**
R : Les GMQ recommandés sont basés sur les standards internationaux et ne peuvent pas être modifiés directement.

**Q : Puis-je exporter les courbes ?**
R : Oui, via le bouton "Rapport Complet" dans l'onglet "Indicateurs".

---

## 📊 Tableau Récapitulatif

| Fonctionnalité | Description | Bénéfice |
|---------------|-------------|----------|
| **Sélection par type** | 5 types de porcs | Analyse ciblée |
| **Statistiques clés** | 6 indicateurs | Vue d'ensemble |
| **Graphique courbes** | Réel vs Théorique | Comparaison visuelle |
| **Recommandations** | Ration optimale | Guidance alimentaire |
| **Écart GMQ** | Code couleur | Alerte rapide |
| **Scroll horizontal** | Navigation fluide | Lisibilité |
| **Mise à jour auto** | Temps réel | Données actuelles |

---

**Version** : 1.0.0  
**Date de création** : Novembre 2024  
**Dernière mise à jour** : Novembre 2024  
**Module** : Rapports → Croissance

