# 🔧 Corrections Appliquées - Performance Globale

## 📋 Problèmes Identifiés et Corrigés

### ✅ Problème 1 : Parsing de la Réponse Frontend
**Fichier** : `src/services/PerformanceGlobaleService.ts`

**Problème** : Le backend retourne `{ available: true, data: result }` mais le frontend retournait directement `result` sans extraire `data`.

**Solution** : 
- Modifié pour extraire `response.data` si `response.available === true`
- Gestion correcte du cas où `available === false`

### ✅ Problème 2 : Charges Fixes Non Incluses dans OPEX
**Fichier** : `backend/src/reports/reports.service.ts`

**Problème** : Les charges fixes (OPEX récurrents) n'étaient pas incluses dans le calcul de `total_opex_global`.

**Solution** :
- Ajout de la récupération des charges fixes actives
- Calcul du total des charges fixes depuis la création du projet jusqu'à aujourd'hui
- Prise en compte de la fréquence (mensuel, trimestriel, annuel)
- Ajout des charges fixes au total OPEX

**Code ajouté** :
```typescript
// 2b. Charger toutes les charges fixes (OPEX récurrents)
const chargesFixesResult = await this.databaseService.query(
  `SELECT id, montant, frequence, date_debut, statut 
   FROM charges_fixes 
   WHERE projet_id = $1 
   AND statut = 'actif'
   ORDER BY date_debut ASC`,
  [projetId]
);

// Calcul du total des charges fixes
for (const charge of chargesFixes) {
  // Calcul du nombre de périodes depuis date_debut jusqu'à aujourd'hui
  // Selon la fréquence (mensuel, trimestriel, annuel)
  totalChargesFixes += charge.montant * nombrePeriodes;
}

const totalOpexGlobal = totalOpexDepenses + totalChargesFixes;
```

### ✅ Problème 3 : Estimation du Poids Vendu
**Fichier** : `backend/src/reports/reports.service.ts`

**Problème** : Si les ventes n'avaient pas de `poids_kg`, elles n'étaient pas comptées, même si on pouvait estimer le poids à partir du montant.

**Solution** :
- Ajout de `montant` dans la requête des ventes
- Ajout de `prix_kg_vif` dans la requête du projet
- Estimation du poids si `poids_kg` est NULL : `poids_estimé = montant / prix_kg_vif`
- Calcul séparé de `totalKgVendusReel` et `totalKgVendusApprox`
- Logs de débogage pour identifier les problèmes

**Code modifié** :
```typescript
// Récupération avec montant
const revenuColumns = `id, poids_kg, montant, date`;

// Calcul avec estimation
for (const vente of ventes) {
  if (vente.poids_kg && vente.poids_kg > 0) {
    totalKgVendusReel += vente.poids_kg;
  } else if (vente.montant > 0 && prixKgVif > 0) {
    const kgApprox = vente.montant / prixKgVif;
    totalKgVendusApprox += kgApprox;
  }
}
```

### ✅ Problème 4 : Gestion de la Période de Production
**Fichier** : `backend/src/reports/reports.service.ts`

**Problème** : Si aucune vente, `dateDebutProduction` était `new Date()` au lieu d'utiliser la date de création du projet.

**Solution** :
- Utilisation de `dateCreationProjet` comme fallback si aucune vente
- Récupération de `date_creation` dans la requête du projet

## 📊 Logique de Calcul Finale

### Total OPEX Global
```
Total OPEX = 
  + Somme des dépenses ponctuelles OPEX
  + Somme des charges fixes (montant × nombre de périodes depuis date_debut)
```

**Nombre de périodes** :
- **Mensuel** : Nombre de mois depuis `date_debut` jusqu'à aujourd'hui
- **Trimestriel** : Nombre de trimestres
- **Annuel** : Nombre d'années

### Total kg Vendus Global
```
Total kg = 
  + Somme des poids_kg des ventes (si disponible)
  + Estimation : Somme des (montant / prix_kg_vif) pour les ventes sans poids_kg
```

**Conditions** :
- Si `poids_kg` est disponible et > 0 : utiliser la valeur réelle
- Sinon, si `montant > 0` et `prix_kg_vif > 0` : estimation = `montant / prix_kg_vif`
- Sinon : la vente n'est pas comptée

### Coût par kg
```
Coût OPEX/kg = Total OPEX / Total kg vendus
Coût Complet/kg = (Total OPEX + Total CAPEX amorti) / Total kg vendus
```

### Écart
```
Écart = Prix marché (prix_kg_carcasse) - Coût Complet/kg
Écart % = (Écart / Prix marché) × 100
```

## 🔍 Logs de Débogage Ajoutés

Si `totalKgVendusGlobal === 0`, le backend logge maintenant :
- `projetId`
- `nombreVentes` : Nombre total de ventes trouvées
- `ventesAvecPoids` : Nombre de ventes avec `poids_kg` disponible
- `prixKgVif` : Prix utilisé pour l'estimation
- `totalKgVendusReel` : Total kg avec poids réel
- `totalKgVendusApprox` : Total kg estimé

## ✅ Résultat

La carte "Performance Globale" devrait maintenant :
- ✅ Afficher correctement les coûts OPEX (incluant les charges fixes)
- ✅ Afficher correctement le prix du marché
- ✅ Calculer correctement l'écart
- ✅ Afficher un diagnostic si des données sont disponibles
- ✅ Afficher les informations de calcul (kg vendus, OPEX, CAPEX)

---

**Date d'implémentation** : 2025-01-XX
**Statut** : ✅ Corrections appliquées

