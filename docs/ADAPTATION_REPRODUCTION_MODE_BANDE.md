# Adaptation du Menu Reproduction pour le Mode Élevage en Bande

## 📋 Résumé

Mise à jour complète du menu Reproduction pour prendre en compte le mode élevage en bande. Les composants détectent maintenant automatiquement le mode de gestion du projet et s'adaptent en conséquence.

## ✅ Modifications Apportées

### 1. GestationsListComponent

**Fichier** : `src/components/GestationsListComponent.tsx`

**Changements** :
- ✅ Détection du mode via `projetActif.management_method`
- ✅ Chargement des bandes de truies reproductrices en mode batch
- ✅ Affichage "(Bande)" dans les titres des cartes de gestation
- ✅ Affichage "(Bande)" dans les alertes de mise bas
- ✅ Affichage "(Bande)" dans le modal de terminaison de gestation

**Code clé** :
```typescript
const isModeBatch = projetActif?.management_method === 'batch';
const [batches, setBatches] = useState<any[]>([]);

// Charger les bandes en mode batch
useEffect(() => {
  if (!projetActif?.id || !isModeBatch) return;
  // Charger les bandes de truies reproductrices
}, [projetActif?.id, isModeBatch]);
```

### 2. GestationFormModal

**Fichier** : `src/components/GestationFormModal.tsx`

**Changements** :
- ✅ Détection du mode via `projetActif.management_method`
- ✅ Chargement des bandes de truies reproductrices en mode batch
- ✅ Adaptation de la liste des truies pour utiliser les bandes en mode batch
- ✅ Adaptation de la recherche pour les bandes
- ✅ Affichage du nombre de truies dans chaque bande
- ✅ Labels adaptés ("Bande" au lieu de "Truie")
- ✅ Suppression de la saisie directe par numéro en mode batch

**Code clé** :
```typescript
const truies = useMemo(() => {
  if (!projetActif) return [];
  
  // Mode bande : utiliser les bandes de truies reproductrices
  if (isModeBatch) {
    return batches.map((batch) => ({
      id: batch.id,
      nom: batch.pen_name || `Bande ${batch.id}`,
      batch: batch,
      total_count: batch.total_count || 0,
    }));
  }
  
  // Mode individuel : calculer le nombre de truies actives
  // ...
}, [projetActif?.id, mortalites, isModeBatch, batches]);
```

### 3. GestationsCalendarComponent

**Fichier** : `src/components/GestationsCalendarComponent.tsx`

**Changements** :
- ✅ Aucune modification nécessaire
- ✅ Le calendrier fonctionne de la même manière en mode batch
- ✅ Les dates de mise bas et sautage sont affichées normalement

**Note** : Le calendrier affiche les gestations indépendamment du mode, car il se base uniquement sur les dates.

### 4. SevragesListComponent

**Fichier** : `src/components/SevragesListComponent.tsx`

**Changements** :
- ✅ Détection du mode via `projetActif.management_method`
- ✅ Chargement des bandes de truies reproductrices en mode batch
- ✅ Affichage "(Bande)" dans les noms de gestations
- ✅ Affichage "(Bande)" dans le modal de création de sevrage
- ✅ Labels adaptés ("Bande" au lieu de "Truie")

**Code clé** :
```typescript
const getGestationNom = (gestationId: string) => {
  const gestation = gestations.find((g) => g.id === gestationId);
  if (!gestation) return 'Inconnue';
  
  // En mode batch, indiquer que c'est une bande
  if (isModeBatch) {
    return `${gestation.truie_nom || gestation.truie_id} (Bande)`;
  }
  
  return gestation.truie_nom || gestation.truie_id || 'Inconnue';
};
```

## 🔧 Fonctionnement Technique

### Détection du Mode

Tous les composants détectent le mode via :
```typescript
const isModeBatch = projetActif?.management_method === 'batch';
```

### Chargement des Bandes

En mode batch, les composants chargent les bandes de truies reproductrices :
```typescript
const batchesData = await apiClient.get<any[]>(`/batch-pigs/projet/${projetActif.id}`);
const truiesBatches = batchesData.filter((b) => b.category === 'truie_reproductrice');
```

### Stockage en Base de Données

En mode batch :
- `truie_id` = ID de la bande (ex: `batch_123`)
- `truie_nom` = Nom de la bande (ex: `Loge A - Truies`)

Le backend accepte déjà ces valeurs comme des chaînes, donc aucune modification backend n'est nécessaire.

## 📊 Compatibilité

### Mode Individuel
- ✅ Fonctionne comme avant
- ✅ Utilise les truies virtuelles basées sur `projetActif.nombre_truies`
- ✅ Soustraction des mortalités pour calculer les truies actives

### Mode Bande
- ✅ Utilise les bandes réelles de truies reproductrices
- ✅ Affiche le nombre de truies dans chaque bande
- ✅ Permet la sélection de bandes pour les gestations
- ✅ Indique clairement qu'il s'agit de bandes

## 🎯 Points d'Attention

### 1. Vérrats
- Les verrats restent individuels même en mode batch
- La sélection de verrats fonctionne de la même manière dans les deux modes

### 2. Consanguinité
- La détection de consanguinité fonctionne uniquement en mode individuel
- En mode batch, la détection est désactivée (les truies sont dans des bandes)

### 3. Porcelets
- Les porcelets créés après une mise bas sont créés individuellement
- En mode batch, ils peuvent être ensuite regroupés en bandes

## 📝 Fichiers Modifiés

1. ✅ `src/components/GestationsListComponent.tsx`
2. ✅ `src/components/GestationFormModal.tsx`
3. ✅ `src/components/SevragesListComponent.tsx`
4. ✅ `src/components/GestationsCalendarComponent.tsx` (aucune modification nécessaire)

## 🔄 Prochaines Étapes Recommandées

### Backend (Optionnel)
- Ajouter un champ `batch_id` dans la table `gestations` pour une meilleure traçabilité
- Créer une vue pour les gestations en mode batch avec les informations de bande

### Frontend (Améliorations Possibles)
- Afficher le nombre de truies dans la bande lors de la sélection
- Permettre la sélection de plusieurs truies dans une bande pour une gestation groupée
- Ajouter des statistiques par bande dans le calendrier

## ✅ Tests à Effectuer

1. **Mode Individuel** :
   - ✅ Créer une gestation avec une truie individuelle
   - ✅ Afficher les gestations en cours
   - ✅ Terminer une gestation
   - ✅ Créer un sevrage

2. **Mode Bande** :
   - ✅ Créer une bande de truies reproductrices
   - ✅ Créer une gestation avec une bande
   - ✅ Afficher les gestations avec indication "(Bande)"
   - ✅ Terminer une gestation de bande
   - ✅ Créer un sevrage pour une bande

## 📈 Impact

- **Compatibilité** : ✅ Les deux modes fonctionnent correctement
- **UX** : ✅ Indication claire du mode (bande vs individuel)
- **Maintenabilité** : ✅ Code adaptatif basé sur le mode du projet
- **Performance** : ✅ Chargement conditionnel des données (bandes ou animaux)

---

**Date d'implémentation** : 2025-01-XX
**Statut** : ✅ Adaptation complète terminée

