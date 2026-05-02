# Analyse des Calculs d'Efficacité Alimentaire et de Taux de Croissance

## 📊 Vue d'ensemble

Ce document analyse la logique de calcul de l'**efficacité alimentaire** et du **taux de croissance** dans le menu "Rapport" du projet Fermier Pro, identifie les limites actuelles et propose des améliorations.

---

## 🔍 1. Logique de Calcul Actuelle

### 1.1 Taux de Croissance

**Localisation** : `fermier-pro/src/components/PerformanceIndicatorsComponent.tsx` (lignes 244-249)

```244:249:fermier-pro/src/components/PerformanceIndicatorsComponent.tsx
    // Calculer le taux de croissance (basé sur les sevrages)
    const gestationsTerminees = gestations.filter((g: Gestation) => g.statut === 'terminee');
    const tauxCroissance =
      gestationsTerminees.length > 0 && sevrages.length > 0
        ? (sevrages.length / gestationsTerminees.length) * 100
        : 0;
```

**Formule actuelle** :
```
Taux de croissance = (Nombre de sevrages / Nombre de gestations terminées) × 100
```

**Interprétation** : Le calcul actuel mesure en réalité le **taux de survie au sevrage** (ratio sevrages/gestations), pas un taux de croissance basé sur le gain de poids.

---

### 1.2 Efficacité Alimentaire

**Localisation** : `fermier-pro/src/components/PerformanceIndicatorsComponent.tsx` (lignes 251-268)

```251:268:fermier-pro/src/components/PerformanceIndicatorsComponent.tsx
    // Calculer l'efficacité alimentaire (ratio poids_gain / alimentation_consommee)
    // On utilise le poids réel basé sur les pesées si disponible
    const alimentationTotale = coutAlimentationTotal; // En CFA, à convertir en kg si nécessaire

    // Calculer le poids réel pour l'efficacité alimentaire (dernières pesées des animaux actifs)
    let poidsReelPourEfficacite = calculatePoidsTotalAnimauxActifs(
      animauxProjet,
      peseesParAnimal,
      projetActif.poids_moyen_actuel || 0
    );

    // Si pas de pesées, utiliser l'approximation
    if (poidsReelPourEfficacite === 0) {
      poidsReelPourEfficacite = poidsTotal;
    }

    const efficaciteAlimentaire =
      alimentationTotale > 0 ? poidsReelPourEfficacite / (alimentationTotale / 1000) : 0; // Approximation
```

**Formule actuelle** :
```
Efficacité alimentaire = Poids total actuel / (Coût total alimentation en CFA / 1000)
```

**Problème majeur** : 
- `alimentationTotale` est en **CFA** (coût monétaire), pas en **kg** (quantité consommée)
- La division par 1000 est une approximation arbitraire qui ne reflète pas la réalité
- L'efficacité alimentaire devrait être : `Gain de poids (kg) / Alimentation consommée (kg)`

**Source des données** : Les rations sont récupérées depuis `state.nutrition.rations` et seule la propriété `cout_total` est utilisée :

```199:201:fermier-pro/src/components/PerformanceIndicatorsComponent.tsx
    const coutAlimentationTotal = rations.reduce((sum, ration) => {
      return sum + (ration.cout_total || 0);
    }, 0);
```

---

## ⚠️ 2. Limites Identifiées

### 2.1 Limites du Taux de Croissance

1. **Terminologie incorrecte** : Le calcul mesure le taux de survie au sevrage, pas la croissance
2. **Pas de prise en compte du gain de poids** : Le calcul ignore complètement les pesées et le gain de poids réel
3. **Pas de période temporelle** : Aucune notion de durée (croissance sur combien de temps ?)
4. **Pas de distinction par catégorie** : Tous les animaux sont traités de la même manière

### 2.2 Limites de l'Efficacité Alimentaire

1. **Unité incorrecte** : Utilisation du coût (CFA) au lieu de la quantité (kg)
2. **Pas de calcul du gain de poids** : Utilise le poids total actuel au lieu du gain de poids
3. **Approximation arbitraire** : Division par 1000 sans justification
4. **Pas de période temporelle** : Ne calcule pas l'efficacité sur une période donnée
5. **Pas de distinction par type de porc** : Les besoins nutritionnels varient selon l'âge/poids
6. **Pas de prise en compte des rations budget** : Seules les rations simples sont utilisées, pas les `RationBudget` qui contiennent `quantite_totale_kg`

### 2.3 Problèmes de Données

1. **Structure des rations** : 
   - Les `Ration` n'ont pas de champ `quantite_totale_kg` directement
   - Il faut calculer la quantité totale à partir des ingrédients
   - Les `RationBudget` ont `quantite_totale_kg` mais ne sont pas utilisées dans le calcul

2. **Manque de traçabilité** :
   - Pas de lien entre les rations et les animaux qui les consomment
   - Pas de suivi de la consommation réelle vs. prévue

---

## 💡 3. Propositions d'Amélioration

### 3.1 Amélioration du Taux de Croissance

#### Option A : Taux de Croissance Basé sur le Gain de Poids (Recommandé)

**Formule** :
```
Taux de croissance (%) = ((Poids final - Poids initial) / Poids initial) × 100
```

**Implémentation** :
- Calculer le gain de poids moyen par animal sur une période donnée
- Utiliser les pesées pour obtenir poids initial et final
- Calculer la moyenne pour tous les animaux actifs
- Exprimer en pourcentage

**Code proposé** :
```typescript
// Calculer le taux de croissance basé sur le gain de poids
const calculerTauxCroissance = (
  animaux: Animal[],
  peseesParAnimal: Record<string, Pesee[]>,
  periodeJours: number = 30
): number => {
  const dateLimite = new Date();
  dateLimite.setDate(dateLimite.getDate() - periodeJours);

  let totalGain = 0;
  let nombreAnimauxAvecPesees = 0;

  animaux
    .filter(a => a.statut?.toLowerCase() === 'actif')
    .forEach(animal => {
      const pesees = peseesParAnimal[animal.id] || [];
      if (pesees.length < 2) return; // Besoin d'au moins 2 pesées

      // Trier par date
      const peseesTriees = [...pesees].sort(
        (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
      );

      // Première pesée dans la période
      const premierePesee = peseesTriees.find(
        p => parseISO(p.date) >= dateLimite
      ) || peseesTriees[0];

      // Dernière pesée
      const dernierePesee = peseesTriees[peseesTriees.length - 1];

      if (premierePesee && dernierePesee && premierePesee.poids_kg > 0) {
        const gain = dernierePesee.poids_kg - premierePesee.poids_kg;
        const taux = (gain / premierePesee.poids_kg) * 100;
        totalGain += taux;
        nombreAnimauxAvecPesees++;
      }
    });

  return nombreAnimauxAvecPesees > 0 
    ? totalGain / nombreAnimauxAvecPesees 
    : 0;
};
```

#### Option B : GMQ (Gain Moyen Quotidien) comme Indicateur

Le GMQ est déjà calculé dans certaines pesées. On pourrait l'utiliser directement :

```typescript
const calculerGMQMoyen = (
  animaux: Animal[],
  peseesParAnimal: Record<string, Pesee[]>
): number => {
  const gmqValues: number[] = [];
  
  animaux
    .filter(a => a.statut?.toLowerCase() === 'actif')
    .forEach(animal => {
      const pesees = peseesParAnimal[animal.id] || [];
      pesees.forEach(pesee => {
        if (pesee.gmq) {
          gmqValues.push(pesee.gmq);
        }
      });
    });

  return gmqValues.length > 0
    ? gmqValues.reduce((sum, val) => sum + val, 0) / gmqValues.length
    : 0;
};
```

---

### 3.2 Amélioration de l'Efficacité Alimentaire

#### Formule Correcte

**Définition standard** :
```
Efficacité alimentaire (IC - Indice de Consommation) = 
  Alimentation consommée (kg) / Gain de poids (kg)
```

**Ou en ratio inverse (plus intuitif)** :
```
Efficacité alimentaire = Gain de poids (kg) / Alimentation consommée (kg)
```

#### Implémentation Proposée

**Étape 1 : Calculer la quantité totale d'alimentation consommée (en kg)**

```typescript
const calculerAlimentationConsommeeKg = (
  rations: Ration[],
  rationsBudget: RationBudget[],
  periodeDebut?: Date,
  periodeFin?: Date
): number => {
  let totalKg = 0;

  // Utiliser les RationBudget qui ont quantite_totale_kg
  rationsBudget.forEach(ration => {
    const dateRation = parseISO(ration.date_creation);
    if (
      (!periodeDebut || dateRation >= periodeDebut) &&
      (!periodeFin || dateRation <= periodeFin)
    ) {
      totalKg += ration.quantite_totale_kg;
    }
  });

  // Pour les Ration simples, calculer à partir des ingrédients
  rations.forEach(ration => {
    const dateRation = parseISO(ration.date_creation);
    if (
      (!periodeDebut || dateRation >= periodeDebut) &&
      (!periodeFin || dateRation <= periodeFin)
    ) {
      // Calculer la quantité totale à partir des ingrédients
      const quantiteTotale = ration.ingredients.reduce((sum, ing) => {
        // Convertir selon l'unité de l'ingrédient
        const ingredient = ingredients.find(i => i.id === ing.ingredient_id);
        if (!ingredient) return sum;
        
        let quantiteKg = ing.quantite;
        if (ingredient.unite === 'g') quantiteKg = ing.quantite / 1000;
        else if (ingredient.unite === 'l') quantiteKg = ing.quantite; // 1L ≈ 1kg
        else if (ingredient.unite === 'ml') quantiteKg = ing.quantite / 1000;
        else if (ingredient.unite === 'sac') quantiteKg = ing.quantite * 50; // Sac de 50kg
        
        return sum + quantiteKg;
      }, 0);
      
      totalKg += quantiteTotale;
    }
  });

  return totalKg;
};
```

**Étape 2 : Calculer le gain de poids total**

```typescript
const calculerGainPoidsTotal = (
  animaux: Animal[],
  peseesParAnimal: Record<string, Pesee[]>,
  periodeDebut: Date,
  periodeFin: Date
): number => {
  let gainTotal = 0;

  animaux
    .filter(a => a.statut?.toLowerCase() === 'actif' && !a.reproducteur)
    .forEach(animal => {
      const pesees = peseesParAnimal[animal.id] || [];
      if (pesees.length < 2) return;

      // Trier par date
      const peseesTriees = [...pesees].sort(
        (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
      );

      // Première pesée dans la période
      const premierePesee = peseesTriees.find(
        p => {
          const dateP = parseISO(p.date);
          return dateP >= periodeDebut && dateP <= periodeFin;
        }
      ) || peseesTriees[0];

      // Dernière pesée dans la période
      const dernierePesee = [...peseesTriees]
        .reverse()
        .find(
          p => {
            const dateP = parseISO(p.date);
            return dateP >= periodeDebut && dateP <= periodeFin;
          }
        ) || peseesTriees[peseesTriees.length - 1];

      if (premierePesee && dernierePesee && premierePesee.poids_kg > 0) {
        gainTotal += dernierePesee.poids_kg - premierePesee.poids_kg;
      }
    });

  return gainTotal;
};
```

**Étape 3 : Calculer l'efficacité alimentaire**

```typescript
const calculerEfficaciteAlimentaire = (
  animaux: Animal[],
  peseesParAnimal: Record<string, Pesee[]>,
  rations: Ration[],
  rationsBudget: RationBudget[],
  periodeJours: number = 30
): number => {
  const dateFin = new Date();
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - periodeJours);

  const alimentationConsommeeKg = calculerAlimentationConsommeeKg(
    rations,
    rationsBudget,
    dateDebut,
    dateFin
  );

  const gainPoidsTotal = calculerGainPoidsTotal(
    animaux,
    peseesParAnimal,
    dateDebut,
    dateFin
  );

  // Efficacité = Gain de poids / Alimentation consommée
  // Plus la valeur est élevée, meilleure est l'efficacité
  return alimentationConsommeeKg > 0 
    ? gainPoidsTotal / alimentationConsommeeKg 
    : 0;
};
```

---

### 3.3 Améliorations Complémentaires

#### A. Ajout d'un Indice de Consommation (IC)

L'IC est l'inverse de l'efficacité alimentaire et est plus couramment utilisé :

```typescript
const calculerIndiceConsommation = (
  alimentationConsommeeKg: number,
  gainPoidsKg: number
): number => {
  return gainPoidsKg > 0 
    ? alimentationConsommeeKg / gainPoidsKg 
    : 0;
};
```

**Interprétation** :
- IC < 3.0 : Excellent
- IC entre 3.0 et 3.5 : Bon
- IC entre 3.5 et 4.0 : Acceptable
- IC > 4.0 : À améliorer

#### B. Calcul par Catégorie d'Animaux

Calculer l'efficacité séparément pour :
- Porcelets (0-30 kg)
- Porcs croissance (30-60 kg)
- Porcs finition (60-110 kg)
- Truies gestantes
- Truies allaitantes

#### C. Suivi Temporel

Ajouter des graphiques montrant l'évolution de :
- L'efficacité alimentaire sur le temps
- Le taux de croissance mensuel
- Comparaison avec les objectifs

#### D. Intégration avec les Stocks

Utiliser les mouvements de stock (sorties) pour calculer la consommation réelle :

```typescript
const calculerConsommationReelleDepuisStocks = (
  mouvementsStock: MouvementStock[],
  periodeDebut: Date,
  periodeFin: Date
): number => {
  return mouvementsStock
    .filter(m => 
      m.type === 'sortie' &&
      parseISO(m.date) >= periodeDebut &&
      parseISO(m.date) <= periodeFin
    )
    .reduce((sum, m) => sum + m.quantite, 0);
};
```

---

## 📋 4. Plan d'Implémentation Recommandé

### Phase 1 : Corrections Urgentes
1. ✅ Corriger le calcul de l'efficacité alimentaire (utiliser kg au lieu de CFA)
2. ✅ Renommer "Taux de croissance" en "Taux de survie au sevrage" ou implémenter le vrai taux de croissance
3. ✅ Intégrer les `RationBudget` dans les calculs

### Phase 2 : Améliorations Fonctionnelles
1. ✅ Implémenter le calcul du gain de poids réel
2. ✅ Ajouter le calcul par période (30, 60, 90 jours)
3. ✅ Ajouter l'Indice de Consommation (IC)

### Phase 3 : Fonctionnalités Avancées
1. ✅ Calcul par catégorie d'animaux
2. ✅ Intégration avec les mouvements de stock
3. ✅ Graphiques d'évolution temporelle
4. ✅ Comparaison avec les objectifs/standards

---

## 🎯 5. Standards de Référence

### Efficacité Alimentaire (Porcs d'engraissement)
- **Excellent** : > 0.35 (IC < 2.85)
- **Bon** : 0.30 - 0.35 (IC 2.85 - 3.33)
- **Acceptable** : 0.25 - 0.30 (IC 3.33 - 4.0)
- **À améliorer** : < 0.25 (IC > 4.0)

### Taux de Croissance
- **Porcelets (7-30 kg)** : 400-600 g/jour
- **Croissance (30-60 kg)** : 600-800 g/jour
- **Finition (60-110 kg)** : 700-900 g/jour

---

## 📝 Notes Techniques

### Structure des Données

**Ration** (actuelle) :
```typescript
interface Ration {
  id: string;
  cout_total?: number; // En CFA
  ingredients: IngredientRation[]; // Quantités par ingrédient
  // Pas de quantite_totale_kg directe
}
```

**RationBudget** (à utiliser) :
```typescript
interface RationBudget {
  id: string;
  quantite_totale_kg: number; // ✅ Disponible directement
  cout_total: number;
  // ...
}
```

### Dépendances Nécessaires

Pour implémenter les améliorations, il faudra :
1. Charger les `rationsBudget` depuis le store
2. Accéder aux `ingredients` complets pour calculer les quantités des `Ration` simples
3. Filtrer les données par période temporelle
4. Gérer les cas où les données sont incomplètes

---

## ✅ Conclusion

Les calculs actuels présentent des **limites significatives** qui affectent la fiabilité des indicateurs. Les principales améliorations à apporter sont :

1. **Corriger l'unité** : Utiliser les kg au lieu des CFA pour l'efficacité alimentaire
2. **Calculer le gain de poids réel** : Utiliser les pesées pour obtenir le vrai gain
3. **Intégrer toutes les sources** : Utiliser `RationBudget` en plus des `Ration`
4. **Ajouter la dimension temporelle** : Calculer sur des périodes définies
5. **Améliorer la terminologie** : Renommer ou recalculer le "taux de croissance"

Ces améliorations permettront d'obtenir des indicateurs plus précis et actionnables pour les éleveurs.

