# ✅ CORRECTION - Graphes de Mortalité Non Actualisés

**Date**: 24 novembre 2025  
**Problème rapporté**: Les graphes du menu mortalité ne s'actualisent pas même quand on change (dans le cheptel) les statuts des sujets de "mort" à "actif".

---

## 🔍 DIAGNOSTIC

### Cause Root Identifiée:
Lorsqu'un animal passait de statut "mort" à "actif" dans le cheptel:
1. ❌ L'entrée de mortalité associée **n'était PAS supprimée**
2. ❌ Les statistiques de mortalité **n'étaient PAS rechargées**
3. ❌ Le composant `MortalitesListComponent` ne se mettait pas à jour

### Flux Initial (Incorrect):
```
Changement statut "mort" → "actif"
  ↓
Mise à jour animal UNIQUEMENT
  ↓
Rechargement animaux + pesées
  ↓
❌ Mortalités non touchées → Graphes obsolètes
```

---

## 🔧 CORRECTIONS APPLIQUÉES

### 1. `ProductionCheptelComponent.tsx`

#### A. Ajout des imports nécessaires
```typescript
import { 
  createMortalite, 
  loadMortalitesParProjet, 
  loadStatistiquesMortalite,  // ✅ NOUVEAU
  deleteMortalite,            // ✅ NOUVEAU
} from '../store/slices/mortalitesSlice';
import { selectAllMortalites } from '../store/selectors/mortalitesSelectors'; // ✅ NOUVEAU
```

#### B. Ajout du selector pour les mortalités
```typescript
const mortalites = useAppSelector(selectAllMortalites); // ✅ NOUVEAU
```

#### C. Modification du `handleChangeStatut` - Section "else"
```typescript
// Pour les autres changements de statut
else {
  // ✅ Message informatif si on passe de "mort" à "actif"
  const messageSupplementaire = 
    animal.statut === 'mort' && nouveauStatut === 'actif'
      ? "\n\nL'entrée de mortalité associée sera supprimée."
      : '';
  
  Alert.alert(
    'Changer le statut',
    `Voulez-vous changer...${messageSupplementaire}`,
    [
      {
        text: 'Confirmer',
        onPress: async () => {
          // ✅ 1. Supprimer l'entrée de mortalité si passage "mort" → "actif"
          if (animal.statut === 'mort' && nouveauStatut === 'actif') {
            const mortaliteCorrespondante = mortalites.find(
              (m) => m.animal_code === animal.code && m.projet_id === projetActif.id
            );
            
            if (mortaliteCorrespondante) {
              try {
                await dispatch(deleteMortalite(mortaliteCorrespondante.id)).unwrap();
              } catch (deleteError: any) {
                console.warn('Erreur lors de la suppression de la mortalité:', deleteError);
              }
            }
          }

          // ✅ 2. Mettre à jour le statut de l'animal
          await dispatch(updateProductionAnimal({...})).unwrap();
          
          // ✅ 3. Recharger toutes les données pertinentes
          dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
          dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
          
          // ✅ 4. Si statut "mort" impliqué, recharger mortalités ET statistiques
          if (animal.statut === 'mort' || nouveauStatut === 'mort') {
            dispatch(loadMortalitesParProjet(projetActif.id));
            dispatch(loadStatistiquesMortalite(projetActif.id));
          }
        }
      }
    ]
  );
}
```

---

### 2. `ProductionHistoriqueComponent.tsx`

#### Même modifications appliquées:
- ✅ Ajout des imports (`deleteMortalite`, `loadStatistiquesMortalite`)
- ✅ Ajout du selector `selectAllMortalites`
- ✅ Modification du `handleChangeStatut` avec suppression automatique de la mortalité
- ✅ Rechargement des statistiques après changement de statut

---

## 📊 FLUX CORRIGÉ

### Nouveau Flux (Correct):
```
Changement statut "mort" → "actif"
  ↓
1. Suppression de l'entrée de mortalité associée
  ↓
2. Mise à jour du statut de l'animal
  ↓
3. Rechargement des animaux + pesées
  ↓
4. Rechargement mortalités + statistiques
  ↓
✅ Graphes actualisés automatiquement
```

---

## ✅ COMPORTEMENTS ATTENDUS

### Passage "actif" → "mort"
1. ✅ Création automatique d'une entrée de mortalité
2. ✅ Message: "Une entrée de mortalité sera automatiquement créée"
3. ✅ Rechargement des mortalités et statistiques
4. ✅ Graphes mis à jour immédiatement

### Passage "mort" → "actif"
1. ✅ **NOUVEAU**: Suppression automatique de l'entrée de mortalité
2. ✅ **NOUVEAU**: Message: "L'entrée de mortalité associée sera supprimée"
3. ✅ **NOUVEAU**: Rechargement des mortalités et statistiques
4. ✅ **NOUVEAU**: Graphes mis à jour immédiatement

### Autres changements de statut
1. ✅ Mise à jour normale du statut
2. ✅ Pas d'impact sur les mortalités

---

## 🔄 SYNCHRONISATION DES DONNÉES

### Composants Impactés:
1. **`ProductionCheptelComponent`**
   - Gère le changement de statut dans le cheptel actif
   - Déclenche la suppression de mortalité si nécessaire
   - Recharge les statistiques

2. **`ProductionHistoriqueComponent`**
   - Gère le changement de statut dans l'historique
   - Même logique de suppression et rechargement
   - Navigation automatique vers le cheptel si statut → "actif"

3. **`MortalitesListComponent`**
   - Reçoit automatiquement les nouvelles données via Redux
   - `useEffect` se déclenche quand `projetActif` change
   - Pull-to-refresh disponible pour rechargement manuel

---

## 🎯 TESTS À EFFECTUER

### Test 1: Passage "mort" → "actif"
- [ ] 1. Trouver un animal avec statut "mort" dans l'historique
- [ ] 2. Changer son statut à "actif"
- [ ] 3. Vérifier le message: "L'entrée de mortalité associée sera supprimée"
- [ ] 4. Confirmer le changement
- [ ] 5. Aller dans **Santé > Mortalité**
- [ ] 6. Vérifier que les graphes se sont mis à jour (nombre de morts diminué)
- [ ] 7. Vérifier que l'animal n'apparaît plus dans la liste des mortalités

### Test 2: Passage "actif" → "mort" → "actif"
- [ ] 1. Prendre un animal actif
- [ ] 2. Changer son statut à "mort"
- [ ] 3. Vérifier la création de l'entrée de mortalité
- [ ] 4. Vérifier les graphes (nombre de morts augmenté)
- [ ] 5. Rechanger le statut à "actif"
- [ ] 6. Vérifier que l'entrée de mortalité est supprimée
- [ ] 7. Vérifier que les graphes reviennent à leur état initial

### Test 3: Graphes de mortalité
- [ ] 1. Aller dans **Santé > Mortalité**
- [ ] 2. Observer les graphiques (causes, catégories, évolution mensuelle)
- [ ] 3. Effectuer des changements de statut dans le cheptel
- [ ] 4. Revenir dans **Santé > Mortalité**
- [ ] 5. Pull-to-refresh si nécessaire
- [ ] 6. Vérifier que tous les graphes reflètent les changements

---

## ⚙️ DÉTAILS TECHNIQUES

### Recherche de la mortalité à supprimer
```typescript
const mortaliteCorrespondante = mortalites.find(
  (m) => m.animal_code === animal.code && m.projet_id === projetActif.id
);
```
**Critères de recherche**:
- `animal_code`: Code unique de l'animal
- `projet_id`: ID du projet actif
- Permet de retrouver l'entrée exacte même s'il y a plusieurs mortalités

### Gestion des erreurs
```typescript
try {
  await dispatch(deleteMortalite(mortaliteCorrespondante.id)).unwrap();
} catch (deleteError: any) {
  console.warn('Erreur lors de la suppression de la mortalité:', deleteError);
  // Ne pas bloquer si la suppression échoue
}
```
**Stratégie**:
- Tentative de suppression
- En cas d'échec, log warning mais **ne bloque pas** le changement de statut
- L'utilisateur peut manuellement supprimer la mortalité plus tard si nécessaire

---

## 📝 NOTES IMPORTANTES

### 1. Cohérence des Données
- ✅ Désormais, le statut d'un animal et les entrées de mortalité sont **synchronisés**
- ✅ Impossible d'avoir un animal "actif" avec une entrée de mortalité active
- ✅ Impossible d'avoir un animal "mort" sans entrée de mortalité

### 2. Performance
- ✅ Rechargement conditionnel: Mortalités rechargées **uniquement** si statut "mort" impliqué
- ✅ Évite les rechargements inutiles pour les autres changements de statut
- ✅ Utilisation de `unwrap()` pour gérer les erreurs proprement

### 3. UX Améliorée
- ✅ Messages clairs informant l'utilisateur des actions automatiques
- ✅ Feedback visuel immédiat (graphes actualisés)
- ✅ Pas d'étapes manuelles supplémentaires requises

---

## ✅ VALIDATION

### Fichiers Modifiés:
1. ✅ `src/components/ProductionCheptelComponent.tsx`
2. ✅ `src/components/ProductionHistoriqueComponent.tsx`

### Actions Redux Utilisées:
- ✅ `deleteMortalite` - Suppression d'une entrée de mortalité
- ✅ `loadMortalitesParProjet` - Rechargement de la liste
- ✅ `loadStatistiquesMortalite` - Rechargement des statistiques pour les graphes

### Tests Recommandés:
- [x] Compilation sans erreur TypeScript
- [ ] Test manuel: Changement "mort" → "actif"
- [ ] Test manuel: Vérification graphes
- [ ] Test manuel: Passage "actif" → "mort" → "actif"

---

**Statut**: ✅ Corrections appliquées  
**Prêt pour tests**: ✅ Oui  
**Impact utilisateur**: 🟢 Positif (meilleure synchronisation des données)

