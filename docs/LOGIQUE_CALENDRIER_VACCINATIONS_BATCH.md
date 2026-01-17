# 🔍 Logique du Calendrier des Vaccinations en Mode Bande

## 📋 Problème Identifié

Le calendrier des vaccinations en mode "élevage en bande" affichait "Aucun animal nécessitant ce traitement" alors que des sujets étaient en retard pour certains vaccins.

## 🔬 Analyse de la Logique

### Architecture des Données

En mode batch, l'application utilise deux structures de données différentes :

1. **`production_animaux`** : Table pour les animaux en mode individuel
2. **`batch_pigs`** : Table pour les sujets en mode bande

### Problème Root Cause

La fonction `calculerAnimauxCalendrier` utilisait `selectAllAnimaux` qui retourne uniquement les `production_animaux`. En mode batch :
- Les `production_animaux` sont vides ou inexistants
- Les vrais animaux sont dans `batch_pigs`
- Le calendrier ne trouvait donc aucun animal à afficher

### Flux de Données Avant Correction

```
Mode Batch:
├── loadProductionAnimaux() → charge production_animaux (vide en mode batch)
├── selectAllAnimaux → retourne []
├── calculerAnimauxCalendrier([], type) → retourne []
└── renderCalendrierBande([], ...) → "Aucun animal nécessitant ce traitement"
```

### Flux de Données Après Correction

```
Mode Batch:
├── loadBatches() → charge les batches
├── loadBatchPigs() → charge les batch_pigs pour chaque batch
├── convertBatchPigsToAnimals() → convertit batch_pigs en ProductionAnimal
├── calculerAnimauxCalendrier(batchPigsAsAnimals, type) → retourne les sujets concernés
└── renderCalendrierBande(animauxCalendrier, ...) → affiche les sujets groupés par bande
```

## ✅ Corrections Apportées

### 1. Chargement des Batch Pigs

**Fichier** : `src/components/VaccinationsComponentAccordion.tsx`

**Changement** : Ajout d'un état pour stocker les `batch_pigs` convertis en `ProductionAnimal` :

```typescript
const [batchPigsAsAnimals, setBatchPigsAsAnimals] = useState<ProductionAnimal[]>([]);
```

### 2. Conversion Batch Pigs → ProductionAnimal

Lors du chargement des batches, chaque `batch_pig` est converti en format `ProductionAnimal` :

```typescript
const animal: ProductionAnimal = {
  id: pig.id,
  projet_id: projetActif.id,
  code: pig.pig_code || pig.code || `BP-${pig.id.slice(0, 8)}`,
  nom: pig.nom || undefined,
  race: pig.race || pig.batch_category || 'Non spécifiée',
  sexe: (pig.sex || pig.sexe || 'indetermine') as any,
  date_naissance: pig.birth_date || pig.date_naissance || undefined, // ⚠️ CRITIQUE
  poids_initial: pig.current_weight_kg || pig.initial_weight_kg || 0,
  actif: true,
  reproducteur: false,
  statut: 'actif' as any,
  date_creation: pig.created_at || new Date().toISOString(),
  derniere_modification: pig.updated_at || new Date().toISOString(),
  batch_id: pig.batch_id,
};
```

**Point critique** : La `date_naissance` est essentielle car `calculerAnimauxCalendrier` filtre les animaux sans `date_naissance` :

```typescript
if (!animal.date_naissance) return null; // ❌ Exclut les animaux sans date
```

### 3. Utilisation des Batch Pigs dans le Calendrier

**Fonction** : `renderCalendrier`

**Avant** :
```typescript
const animauxActifs = (animaux || []).filter((a) => a.statut === 'actif');
```

**Après** :
```typescript
const animauxActifs = isModeBatch
  ? batchPigsAsAnimals.filter((a) => a.statut === 'actif' && a.date_naissance)
  : (animaux || []).filter((a) => a.statut === 'actif');
```

## 🔄 Logique de Calcul du Calendrier

### Fonction `calculerAnimauxCalendrier`

Cette fonction détermine quels animaux nécessitent un vaccin :

1. **Filtre par date de naissance** : Exclut les animaux sans `date_naissance`
2. **Calcule l'âge** : `ageJours = calculerAgeJours(animal.date_naissance)`
3. **Trouve les traitements du type** : Filtre `CALENDRIER_VACCINAL_TYPE` par `type_prophylaxie`
4. **Vérifie si déjà vacciné** : 
   ```typescript
   const aRecuTraitement = vaccinations.some(
     (v) => animalIncludedInVaccination(v.animal_ids, animal.id) &&
            v.type_prophylaxie === traitement.type_prophylaxie &&
            v.statut === 'effectue'
   );
   ```
5. **Détermine le prochain traitement** :
   ```typescript
   const prochainTraitement = traitementsType.find((traitement) => {
     return !aRecuTraitement && traitement.age_jours <= ageJours + 7;
   });
   ```
6. **Détermine si en retard** :
   ```typescript
   enRetard: prochainTraitement && prochainTraitement.age_jours < ageJours
   ```

### Points d'Attention

⚠️ **Date de naissance requise** : Les `batch_pigs` doivent avoir une `birth_date` ou `date_naissance` pour apparaître dans le calendrier.

⚠️ **Vaccinations liées** : Les vaccinations doivent avoir `animal_ids` contenant l'ID du `batch_pig` pour être détectées.

⚠️ **Mode batch vs individuel** : 
- Mode batch : Utilise `batch_pigs` convertis
- Mode individuel : Utilise `production_animaux`

## 🧪 Tests à Effectuer

1. ✅ Vérifier que les `batch_pigs` ont une `date_naissance`
2. ✅ Vérifier que les vaccinations en mode batch ont `animal_ids` correctement rempli
3. ✅ Vérifier que le calendrier affiche les sujets en retard
4. ✅ Vérifier que le calendrier affiche les sujets à venir (dans les 7 prochains jours)
5. ✅ Vérifier le groupement par bande

## 📝 Notes Techniques

- Les `batch_pigs` sont chargés via l'endpoint `/batch-pigs/batch/{batchId}`
- La conversion en `ProductionAnimal` permet de réutiliser la logique existante
- Le filtrage par `date_naissance` est conservé pour éviter les erreurs de calcul d'âge
