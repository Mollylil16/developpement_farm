# 🔍 Analyse de la Carte "Performance Globale"

## 📋 Problème Identifié

La carte "Performance Globale" dans le Dashboard affiche toujours des valeurs à 0 :
- Coût/kg (OPEX) : 0 FCFA
- Prix marché : 0 FCFA
- Écart : +0 FCFA/kg (+0.0 %)
- Diagnostic non disponible
- "Coût calculé sur 0 kg vendus"
- "OPEX : 0 FCFA • CAPEX amorti : 0 FCFA"

## 🔎 Analyse de la Logique de Calcul

### 1. Flux de Données

**Frontend** (`src/components/widgets/PerformanceWidget.tsx`) :
- Appelle `PerformanceGlobaleService.calculatePerformanceGlobale(projetId, projetActif)`
- Affiche les données retournées

**Service Frontend** (`src/services/PerformanceGlobaleService.ts`) :
- Appelle l'API `/reports/performance-globale?projet_id={projetId}`
- Retourne directement `result` (⚠️ **PROBLÈME ICI**)

**Backend Controller** (`backend/src/reports/reports.controller.ts`) :
- Retourne `{ available: true, data: result }` si succès
- Retourne `{ available: false, reason: 'not_enough_data', ... }` si pas de données

**Backend Service** (`backend/src/reports/reports.service.ts`) :
- Calcule la performance globale

### 2. Logique de Calcul Backend

#### Étape 1 : Récupération du Projet
```sql
SELECT prix_kg_carcasse, duree_amortissement_par_defaut_mois 
FROM projets 
WHERE id = $1
```
- Utilise `prix_kg_carcasse` comme prix du marché (défaut: 1300 FCFA)
- Utilise `duree_amortissement_par_defaut_mois` (défaut: 36 mois)

#### Étape 2 : Récupération des Dépenses
```sql
SELECT id, montant, date, type_opex_capex, duree_amortissement_mois 
FROM depenses_ponctuelles 
WHERE projet_id = $1 
ORDER BY date ASC
```
- ⚠️ **PROBLÈME** : Ne récupère que les `depenses_ponctuelles`, pas les `charges_fixes`
- Les charges fixes (OPEX récurrents) ne sont pas incluses dans le calcul

#### Étape 3 : Récupération des Ventes
```sql
SELECT id, poids_kg, date 
FROM revenus 
WHERE projet_id = $1 
AND categorie = 'vente_porc'
ORDER BY date ASC
```
- ⚠️ **PROBLÈME** : Filtre uniquement sur `categorie = 'vente_porc'`
- ⚠️ **PROBLÈME** : Si `poids_kg` est NULL, la vente n'est pas comptée
- ⚠️ **PROBLÈME** : Ne gère pas l'estimation du poids à partir du montant/prix (comme dans `getBilanComplet`)

#### Étape 4 : Calcul du Total kg Vendus
```typescript
const totalKgVendusGlobal = ventes.reduce((sum, v) => sum + (v.poids_kg || 0), 0);
if (totalKgVendusGlobal === 0) {
  return null; // Pas assez de données
}
```
- ⚠️ **PROBLÈME** : Si aucune vente n'a de `poids_kg`, retourne `null` même s'il y a des ventes

#### Étape 5 : Calcul OPEX
```typescript
const depensesOpex = depenses.filter(
  (d) => !d.type_depense || d.type_depense.toUpperCase() === 'OPEX'
);
const totalOpexGlobal = depensesOpex.reduce((sum, d) => sum + d.montant, 0);
```
- ⚠️ **PROBLÈME** : Ne compte que les dépenses ponctuelles OPEX
- ⚠️ **PROBLÈME** : N'inclut pas les charges fixes (qui sont des OPEX récurrents)

#### Étape 6 : Calcul CAPEX Amorti
- Calcule l'amortissement des dépenses CAPEX sur la période de production
- La période de production = de la première vente à aujourd'hui
- ⚠️ **PROBLÈME** : Si aucune vente, la période n'est pas définie

#### Étape 7 : Calcul des Coûts par kg
```typescript
const coutKgOpexGlobal = totalOpexGlobal / totalKgVendusGlobal;
const coutKgCompletGlobal = (totalOpexGlobal + totalAmortissementCapexGlobal) / totalKgVendusGlobal;
```

### 3. Problèmes Identifiés

#### ❌ Problème 1 : Parsing de la Réponse Frontend
**Fichier** : `src/services/PerformanceGlobaleService.ts`

**Code actuel** :
```typescript
const result = await apiClient.get<PerformanceGlobale>('/reports/performance-globale', {
  params: { projet_id: projetId },
});
return result;
```

**Problème** : Le backend retourne `{ available: true, data: result }` mais le frontend s'attend à recevoir directement `PerformanceGlobale`.

**Solution** : Extraire `result.data` si `result.available === true`.

#### ❌ Problème 2 : Charges Fixes Non Incluses
**Fichier** : `backend/src/reports/reports.service.ts`

**Problème** : Les charges fixes (OPEX récurrents) ne sont pas incluses dans le calcul de `total_opex_global`.

**Solution** : Ajouter les charges fixes au calcul OPEX.

#### ❌ Problème 3 : Estimation du Poids Vendu
**Fichier** : `backend/src/reports/reports.service.ts`

**Problème** : Si les ventes n'ont pas de `poids_kg`, elles ne sont pas comptées, même si on peut estimer le poids à partir du montant et du prix.

**Solution** : Utiliser la même logique que dans `getBilanComplet` pour estimer le poids si nécessaire.

#### ❌ Problème 4 : Gestion du Mode Batch
**Fichier** : `backend/src/reports/reports.service.ts`

**Problème** : Le calcul ne prend pas en compte le mode batch pour les ventes.

**Solution** :** Adapter le calcul pour le mode batch si nécessaire.

## 🔧 Solutions Proposées

### Solution 1 : Corriger le Parsing Frontend
Modifier `src/services/PerformanceGlobaleService.ts` pour extraire `data` de la réponse.

### Solution 2 : Inclure les Charges Fixes dans OPEX
Modifier `backend/src/reports/reports.service.ts` pour inclure les charges fixes dans le calcul OPEX.

### Solution 3 : Estimer le Poids Vendu
Modifier `backend/src/reports/reports.service.ts` pour estimer le poids si `poids_kg` est NULL.

### Solution 4 : Améliorer la Gestion des Erreurs
Ajouter des logs pour identifier pourquoi les données ne sont pas récupérées.

## 📊 Logique de Calcul Attendue

### Total OPEX Global
```
Total OPEX = 
  + Somme des dépenses ponctuelles OPEX
  + Somme des charges fixes (montant × nombre de périodes depuis création)
```

### Total kg Vendus Global
```
Total kg = 
  + Somme des poids_kg des ventes (si disponible)
  + Estimation : Somme des (montant / prix_kg_vif) pour les ventes sans poids_kg
```

### Coût par kg
```
Coût OPEX/kg = Total OPEX / Total kg vendus
Coût Complet/kg = (Total OPEX + Total CAPEX amorti) / Total kg vendus
```

### Écart
```
Écart = Prix marché - Coût Complet/kg
Écart % = (Écart / Prix marché) × 100
```

## ✅ Corrections Appliquées

### Correction 1 : Parsing de la Réponse Frontend ✅
**Fichier** : `src/services/PerformanceGlobaleService.ts`

**Modification** :
```typescript
const response = await apiClient.get<{ available: boolean; data: PerformanceGlobale | null; reason?: string; message?: string }>(
  '/reports/performance-globale',
  { params: { projet_id: projetId } }
);

if (!response.available || !response.data) {
  return null;
}

return response.data;
```

**Résultat** : Le service extrait maintenant correctement `data` de la réponse backend.

### Correction 2 : Inclusion des Charges Fixes dans OPEX ✅
**Fichier** : `backend/src/reports/reports.service.ts`

**Modification** :
- Ajout de la récupération des charges fixes depuis la table `charges_fixes`
- Calcul du nombre de périodes pour chaque charge fixe selon sa fréquence (mensuel, trimestriel, annuel)
- Somme des charges fixes au total OPEX :
```typescript
const totalOpexGlobal = totalOpexDepenses + totalChargesFixes;
```

**Résultat** : Les charges fixes sont maintenant incluses dans le calcul OPEX global.

### Correction 3 : Estimation du Poids Vendu ✅
**Fichier** : `backend/src/reports/reports.service.ts`

**Modification** :
- Pour chaque vente, si `poids_kg` est NULL ou 0, estimation du poids à partir de `montant / prix_kg_vif`
- Séparation entre `totalKgVendusReel` (poids réel) et `totalKgVendusApprox` (poids estimé)
- `totalKgVendusGlobal = totalKgVendusReel + totalKgVendusApprox`

**Résultat** : Les ventes sans poids explicite sont maintenant prises en compte via estimation.

### Correction 4 : Logs de Débogage ✅
**Fichier** : `backend/src/reports/reports.service.ts`

**Modification** :
- Ajout de logs pour le calcul des kg vendus (réel vs estimé)
- Ajout de logs pour le calcul OPEX (dépenses ponctuelles vs charges fixes)
- Ajout d'un log final avec toutes les valeurs calculées

**Résultat** : Les logs permettent maintenant d'identifier facilement les problèmes de calcul.

### Correction 5 : Gestion de la Période de Production ✅
**Fichier** : `backend/src/reports/reports.service.ts`

**Modification** :
- Si aucune vente, `dateDebutProduction` utilise `dateCreationProjet` comme fallback
- Amélioration du calcul du nombre de périodes pour les charges fixes (minimum 1 période)

**Résultat** : La période de production est maintenant correctement définie même sans ventes.

---

**Date d'analyse** : 2025-01-XX
**Date de correction** : 2025-01-XX
**Statut** : ✅ Corrections appliquées - À tester

