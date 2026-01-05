# 📋 PHASE 1 : ANALYSE - Calendrier de Vaccination Mode Bande

**Date** : 2026-01-05  
**Objectif** : Documenter les différences entre mode individuel et mode bande pour le calendrier de vaccination

---

## ✅ 1.1 - LOCALISATION DES FICHIERS

### A) Mode Suivi Individuel (Référence)

#### 📍 Fichier Principal : `src/components/VaccinationsComponentAccordion.tsx`

**Fonction clé** : `renderCalendrier(type: TypeProphylaxie, couleur: string)` (lignes 1335-1486)

**Comment les sujets en retard sont calculés** :

```1335:1486:src/components/VaccinationsComponentAccordion.tsx
const renderCalendrier = (type: TypeProphylaxie, couleur: string) => {
  const animauxActifs = (animaux || []).filter((a) => a.statut === 'actif');

  // Calculer les animaux en retard ou à venir pour ce type
  const animauxCalendrier = animauxActifs
    .map((animal) => {
      if (!animal.date_naissance) return null;

      const ageJours = calculerAgeJours(animal.date_naissance);
      const traitementsType = CALENDRIER_VACCINAL_TYPE.filter(
        (cal) => cal.type_prophylaxie === type
      );

      const prochainTraitement = traitementsType.find((traitement) => {
        const aRecuTraitement = (vaccinations || []).some(
          (v) =>
            animalIncludedInVaccination(v.animal_ids, animal.id) &&
            v.type_prophylaxie === traitement.type_prophylaxie &&
            v.statut === 'effectue'
        );
        return !aRecuTraitement && traitement.age_jours <= ageJours + 7; // À faire dans 7 jours max
      });

      const dernierTraitement = (vaccinations || [])
        .filter(
          (v) =>
            animalIncludedInVaccination(v.animal_ids, animal.id) && v.type_prophylaxie === type
        )
        .sort(
          (a, b) =>
            new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime()
        )[0];

      if (!prochainTraitement && !dernierTraitement) return null;

      const nom = animal.nom || animal.code || `Animal ${animal.id.slice(0, 6)}`;
      const categorie = getCategorieAnimal(animal);

      return {
        animal,
        nom,
        categorie,
        ageJours,
        prochainTraitement,
        dernierTraitement,
        enRetard: prochainTraitement && prochainTraitement.age_jours < ageJours,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      // En retard d'abord
      if (a.enRetard && !b.enRetard) return -1;
      if (!a.enRetard && b.enRetard) return 1;
      // Puis par âge décroissant
      return b.ageJours - a.ageJours;
    });
```

**Logique de calcul du retard** :
1. Pour chaque animal actif, calculer son âge en jours
2. Filtrer les traitements requis selon le type de prophylaxie
3. Trouver le prochain traitement requis (basé sur l'âge)
4. Vérifier si l'animal a reçu ce traitement
5. Si `prochainTraitement.age_jours < ageJours` → **animal en retard**

**Comment les sujets en retard sont affichés** :

```1410:1480:src/components/VaccinationsComponentAccordion.tsx
<ScrollView style={styles.calendrierListe} nestedScrollEnabled>
  {animauxCalendrier.map((item, index) => (
    <View
      key={item.animal.id}
      style={[
        styles.calendrierItem,
        {
          backgroundColor: colors.surface,
          borderLeftColor: item.enRetard ? colors.error : couleur,
          ...colors.shadow.small,
        },
      ]}
    >
      <View style={styles.calendrierItemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.calendrierItemNom, { color: colors.text }]}>
            {item.nom}
          </Text>
          <Text style={[styles.calendrierItemDetails, { color: colors.textSecondary }]}>
            {item.categorie} • {item.ageJours}j
          </Text>
        </View>
        {item.enRetard && (
          <View style={[styles.badgeRetard, { backgroundColor: colors.error }]}>
            <Text style={styles.badgeRetardTexte}>En retard</Text>
          </View>
        )}
      </View>
```

**Structure des données** :
```typescript
interface AnimalCalendrier {
  animal: ProductionAnimal;
  nom: string;
  categorie: string;
  ageJours: number;
  prochainTraitement?: CalendrierTypeAge;
  dernierTraitement?: Vaccination;
  enRetard: boolean; // true si prochainTraitement.age_jours < ageJours
}
```

---

### B) Mode Élevage en Bande (État Actuel)

#### 📍 Même Fichier : `src/components/VaccinationsComponentAccordion.tsx`

**Détection du mode** :
```72:73:src/components/VaccinationsComponentAccordion.tsx
const modeElevage = useModeElevage();
const isModeBatch = modeElevage === 'bande';
```

**Problème identifié** : 
La fonction `renderCalendrier` **ne prend PAS en compte le mode bande**. Elle calcule toujours les retards par animal individuel, même en mode bande.

**Preuve** : La fonction `renderCalendrier` (ligne 1335) n'utilise jamais `isModeBatch` et ne groupe pas les animaux par bande.

**Calcul des retards en mode bande (statistiques globales)** :

```210:232:src/components/VaccinationsComponentAccordion.tsx
if (isModeBatch) {
  // Mode batch : calculer la couverture basée sur les vaccinations par bande
  // Une bande est "couverte" si elle a au moins une vaccination effectuée
  const bandesVaccineesSet = new Set<string>();
  let totalSujetsVaccines = 0;

  (vaccinations || []).forEach((v) => {
    if (v.statut === 'effectue' && v.batch_id) {
      bandesVaccineesSet.add(v.batch_id);
      // Utiliser nombre_sujets_vaccines si défini, sinon le total de la bande
      if (v.nombre_sujets_vaccines) {
        totalSujetsVaccines += v.nombre_sujets_vaccines;
      } else {
        const batch = batches.find((b) => b.id === v.batch_id);
        totalSujetsVaccines += batch?.total_count || 0;
      }
    }
  });

  // Éviter les doublons : prendre le minimum entre sujets vaccinés et total
  const sujetsVaccinesUniques = Math.min(totalSujetsVaccines, totalAnimaux);
  porcsEnRetard = Math.max(0, totalAnimaux - sujetsVaccinesUniques);
  tauxCouverture = totalAnimaux > 0 ? Math.round((sujetsVaccinesUniques / totalAnimaux) * 100) : 0;
}
```

**⚠️ PROBLÈME** : Cette logique calcule seulement le nombre total de sujets en retard, mais **ne liste pas les animaux individuels en retard par bande**.

---

## 📊 1.2 - ANALYSE DE LA LOGIQUE MÉTIER

### A) Fréquence de Vaccination

**Source** : `src/types/sante.ts` - Constante `CALENDRIER_VACCINAL_TYPE`

```typescript
export const CALENDRIER_VACCINAL_TYPE: CalendrierTypeAge[] = [
  // Exemples :
  { type_prophylaxie: 'vaccin_obligatoire', age_jours: 7, nom_traitement: 'Fer dextran', ... },
  { type_prophylaxie: 'vaccin_obligatoire', age_jours: 21, nom_traitement: 'Parvovirose', ... },
  // ...
];
```

**Stockage** : Les fréquences sont codées en dur dans le frontend via `age_jours` (âge recommandé en jours depuis la naissance).

**Fréquence identique** : ✅ Oui, la même pour mode individuel et mode bande.

---

### B) Calcul du Retard

#### Mode Individuel (Actuel) :

**Formule** :
```
Retard = (Âge actuel de l'animal en jours) > (Âge recommandé du traitement en jours)
```

**Exemple** :
- Animal né il y a 30 jours
- Traitement requis à 21 jours
- Animal n'a pas reçu le traitement
- → **En retard de 9 jours**

**Code** :
```typescript
enRetard: prochainTraitement && prochainTraitement.age_jours < ageJours
```

#### Mode Bande (À Implémenter) :

**Logique nécessaire** :
1. Pour chaque bande, récupérer tous les animaux de la bande
2. Pour chaque animal, calculer s'il est en retard (même logique que mode individuel)
3. Grouper les animaux en retard par bande
4. Afficher : "Bande X : Y sujets en retard"

**Adaptation requise** :
- Récupérer les animaux avec leur `batch_id`
- Grouper par `batch_id`
- Calculer les retards par animal (même logique)
- Afficher groupé par bande

---

### C) Données Nécessaires

#### Mode Individuel (Actuel) :

**Données utilisées** :
- ✅ Liste des animaux du projet (`animaux`)
- ✅ Date de naissance de chaque animal (`animal.date_naissance`)
- ✅ Vaccinations effectuées (`vaccinations`)
- ✅ Calendrier vaccinal (`CALENDRIER_VACCINAL_TYPE`)

**Structure** :
```typescript
interface ProductionAnimal {
  id: string;
  nom?: string;
  code?: string;
  date_naissance?: string;
  statut: 'actif' | 'inactif' | ...;
  // ...
}
```

#### Mode Bande (À Implémenter) :

**Données nécessaires** :
- ✅ Liste des bandes du projet (`batches`)
- ✅ Liste des animaux par bande (via `batch_pigs` ou `animal.batch_id`)
- ✅ Vaccinations effectuées avec `batch_id` (`vaccinations`)
- ✅ Calendrier vaccinal (`CALENDRIER_VACCINAL_TYPE`)

**Structure** :
```typescript
interface Batch {
  id: string;
  pen_name: string;
  total_count: number;
  // ...
}

interface Vaccination {
  batch_id?: string; // ID de la bande (mode batch)
  nombre_sujets_vaccines?: number; // Nombre de sujets vaccinés (mode batch)
  // ...
}
```

**⚠️ PROBLÈME IDENTIFIÉ** : 
Les animaux en mode bande sont dans la table `batch_pigs`, mais le composant `VaccinationsComponentAccordion` utilise `animaux` (table `production_animaux`). Il faut vérifier si les animaux en mode bande sont aussi dans `production_animaux` avec un `batch_id`.

---

## 🔍 1.3 - STRUCTURE DE LA BASE DE DONNÉES

### Table `vaccinations` :

```sql
CREATE TABLE vaccinations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  animal_ids TEXT, -- JSON array (mode individuel)
  batch_id TEXT, -- ID de la bande (mode batch) ⚠️ À vérifier si cette colonne existe
  nombre_sujets_vaccines INTEGER, -- Nombre de sujets vaccinés (mode batch) ⚠️ À vérifier
  type_prophylaxie TEXT,
  date_vaccination TIMESTAMP NOT NULL,
  -- ...
);
```

**⚠️ À VÉRIFIER** : 
- La colonne `batch_id` existe-t-elle dans la table `vaccinations` ?
- La colonne `nombre_sujets_vaccines` existe-t-elle ?

### Table `batch_pigs` :

```sql
CREATE TABLE batch_pigs (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  name TEXT,
  birth_date DATE,
  -- ...
);
```

### Table `production_animaux` :

```sql
CREATE TABLE production_animaux (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  batch_id TEXT, -- ⚠️ À vérifier si cette colonne existe
  date_naissance DATE,
  -- ...
);
```

---

## 📝 1.4 - IDENTIFICATION DES DIFFÉRENCES TECHNIQUES

### Différences Clés :

| Aspect | Mode Individuel | Mode Bande (Actuel) | Mode Bande (Souhaité) |
|--------|----------------|---------------------|------------------------|
| **Calcul des retards** | ✅ Par animal individuel | ❌ Non implémenté dans le calendrier | ✅ Par animal, groupé par bande |
| **Affichage** | ✅ Liste d'animaux avec badge "En retard" | ❌ Liste d'animaux (pas groupée) | ✅ Groupé par bande avec nombre de sujets en retard |
| **Données utilisées** | `animaux` (production_animaux) | `animaux` (production_animaux) | `batches` + `batch_pigs` ou `animaux` avec `batch_id` |
| **Vaccinations** | `vaccinations.animal_ids` | `vaccinations.batch_id` + `nombre_sujets_vaccines` | `vaccinations.batch_id` + `nombre_sujets_vaccines` |
| **Action "Vacciner"** | ✅ Pré-remplit avec l'animal | ❌ Non adapté | ✅ Pré-remplit avec la bande |

---

## 🎯 1.5 - POURQUOI LA FONCTIONNALITÉ N'EST PAS AFFICHÉE ?

### Raisons Identifiées :

1. **Oubli d'implémentation** : La fonction `renderCalendrier` n'a pas été adaptée pour le mode bande
2. **Logique différente** : Le calcul des retards en mode bande nécessite de grouper par bande
3. **Données différentes** : En mode bande, il faut utiliser `batches` et `batch_pigs` au lieu de `animaux`
4. **UX différente** : L'affichage doit être groupé par bande, pas une liste plate d'animaux

---

## ✅ 1.6 - RÉSUMÉ DE L'ANALYSE

### Ce qui fonctionne (Mode Individuel) :

✅ Calcul des animaux en retard basé sur l'âge et les traitements requis  
✅ Affichage avec badge "En retard"  
✅ Tri : animaux en retard en premier  
✅ Bouton "Vacciner maintenant" qui pré-remplit le formulaire  

### Ce qui manque (Mode Bande) :

❌ Groupement des animaux par bande dans le calendrier  
❌ Affichage du nombre de sujets en retard par bande  
❌ Calcul des retards adapté au mode bande (même logique mais groupé)  
❌ Bouton "Vacciner cette bande" au lieu de "Vacciner maintenant"  

### Prochaines Étapes :

1. ✅ **ANALYSE COMPLÈTE** (ce document)
2. ⏳ **ARCHITECTURE** : Proposer la structure du code pour le mode bande
3. ⏳ **IMPLÉMENTATION** : Adapter `renderCalendrier` pour le mode bande
4. ⏳ **TESTS** : Valider dans les deux modes

---

**Date de création** : 2026-01-05  
**Auteur** : Analyse automatique du codebase  
**Statut** : ✅ Phase 1 complétée

