# Implémentation Backend - Calcul des Marges Finance

**Date** : 2025-01-XX  
**Statut** : ✅ **TERMINÉ**

---

## 🎯 Objectif

Implémenter les endpoints backend pour le calcul des marges OPEX/CAPEX pour les ventes de porcs, permettant de calculer automatiquement les marges basées sur les coûts de production.

---

## ✅ Endpoints Implémentés

### 1. `POST /finance/revenus/:id/calculer-marges` ✅

**Description** : Calcule les marges OPEX et complètes pour une vente de porc spécifique.

**Paramètres** :
- `id` (path) : ID du revenu/vente
- `poids_kg` (body) : Poids du porc vendu en kg (1-500 kg)

**Logique** :
1. Vérifie que la vente existe et appartient à l'utilisateur
2. Calcule les coûts par kg en utilisant une période glissante de 30 jours avant la date de vente
3. Calcule les coûts réels OPEX et complets pour cette vente (`coût = coût_par_kg * poids`)
4. Calcule les marges en valeur et en pourcentage
5. Met à jour la vente avec le poids, les coûts et les marges

**DTO** : `CalculerMargesDto` (validation : poids entre 1 et 500 kg)

**Fichiers** :
- `backend/src/finance/dto/calculer-marges.dto.ts`
- `backend/src/finance/finance.controller.ts` (ligne 162-171)
- `backend/src/finance/finance.service.ts` (méthode `calculerMargesVente`, lignes 666-726)

---

### 2. `POST /finance/revenus/recalculer-marges` ✅

**Description** : Recalcule les marges pour toutes les ventes de porcs d'une période donnée.

**Paramètres** :
- `projet_id` (query) : ID du projet
- `date_debut` (body) : Date de début de la période (ISO 8601)
- `date_fin` (body) : Date de fin de la période (ISO 8601)

**Logique** :
1. Vérifie que le projet appartient à l'utilisateur
2. Récupère toutes les ventes de porcs de la période qui ont un poids
3. Calcule les coûts moyens pour la période complète
4. Pour chaque vente :
   - Utilise les coûts moyens de la période (ou recalcule pour la date spécifique si nécessaire)
   - Calcule les marges et met à jour la vente
5. Retourne le nombre de ventes recalculées et les détails

**DTO** : `RecalculerMargesDto` (validation : dates ISO 8601)

**Fichiers** :
- `backend/src/finance/dto/recalculer-marges.dto.ts`
- `backend/src/finance/finance.controller.ts` (ligne 173-185)
- `backend/src/finance/finance.service.ts` (méthode `recalculerMargesPeriode`, lignes 728-813)

---

## 📊 Calcul des Coûts

### Méthode `calculerCoutsProduction` (Améliorée)

**Fichier** : `backend/src/finance/finance.service.ts` (lignes 917-1041)

**Améliorations apportées** :
- ✅ Ajout du calcul des **charges fixes actives** dans les coûts OPEX
- ✅ Prise en compte de la fréquence des charges fixes (mensuel, trimestriel, annuel)
- ✅ Calcul des coûts par kg : `coût_kg = total_coûts / total_kg_vendus`

**Formule des coûts OPEX** :
```
Total OPEX = Dépenses OPEX de la période + Charges fixes actives de la période
```

**Formule des coûts complets** :
```
Total Complet = Total OPEX + Amortissements CAPEX de la période
```

**Formule des coûts par kg** :
```
Coût par kg OPEX = Total OPEX / Total kg vendus (dans la période)
Coût par kg Complet = Total Complet / Total kg vendus (dans la période)
```

### Méthode `calculerCoutsParKgPourVente` (Nouvelle)

**Fichier** : `backend/src/finance/finance.service.ts` (lignes 619-664)

**Description** : Méthode privée qui calcule les coûts par kg pour une date de vente spécifique.

**Logique** :
1. Utilise une période glissante de 30 jours avant la date de vente
2. Appelle `calculerCoutsProduction` pour cette période
3. Si pas de kg vendus ou coûts = 0, essaie d'utiliser les coûts moyens du projet (si disponibles)
4. Retourne les coûts par kg OPEX et complets

---

## 🔧 Améliorations Techniques

### 1. Calcul des Charges Fixes

Les charges fixes actives sont maintenant incluses dans le calcul des coûts OPEX :
- Calcul selon la fréquence (mensuel, trimestriel, annuel)
- Prorata selon la période effective (si la charge commence après le début de la période)
- Uniquement les charges fixes avec `statut = 'actif'`

### 2. Gestion des Cas Limites

- ✅ Si pas de kg vendus dans la période : utilise les coûts moyens du projet (si disponibles)
- ✅ Si pas de coûts moyens : retourne 0 (pas d'erreur, mais marges = montant)
- ✅ Validation du poids : entre 1 et 500 kg
- ✅ Validation des dates : date début < date fin

### 3. Performance

- ✅ Utilisation de requêtes SQL optimisées (colonnes spécifiques au lieu de SELECT *)
- ✅ Calcul des coûts moyens une seule fois pour toutes les ventes d'une période
- ✅ Gestion des erreurs individuelles (une vente qui échoue n'empêche pas les autres)

---

## 📝 Intégration Frontend

### Thunk `calculateAndSaveMargesVente` ✅

**Fichier** : `src/store/slices/financeSlice.ts` (lignes 423-472)

**Changements** :
- ✅ Utilise maintenant l'endpoint backend amélioré
- ✅ Validation du poids côté frontend (utilise `FINANCE_WEIGHT_LIMITS`)
- ✅ Validation post-calcul des marges avec `validateCalculMarges()`

### Thunk `recalculerMargesPeriode` ✅

**Fichier** : `src/store/slices/financeSlice.ts` (lignes 479-547)

**Changements** :
- ✅ Utilise maintenant l'endpoint backend `POST /finance/revenus/recalculer-marges`
- ✅ Validation des dates côté frontend
- ✅ Rechargement automatique des revenus après le recalcul
- ✅ Validation post-recalcul des marges pour chaque revenu

---

## 🧪 Tests Recommandés

### Tests Backend
- [ ] Test `calculerMargesVente` avec une vente valide
- [ ] Test `calculerMargesVente` avec poids invalide (0, négatif, > 500)
- [ ] Test `calculerMargesVente` avec vente inexistante
- [ ] Test `recalculerMargesPeriode` avec période valide
- [ ] Test `recalculerMargesPeriode` avec période sans ventes
- [ ] Test `calculerCoutsProduction` avec charges fixes actives
- [ ] Test `calculerCoutsProduction` avec dépenses OPEX et CAPEX

### Tests Frontend
- [ ] Test `calculateAndSaveMargesVente` avec poids valide
- [ ] Test `calculateAndSaveMargesVente` avec poids invalide
- [ ] Test `recalculerMargesPeriode` avec dates valides
- [ ] Test `recalculerMargesPeriode` avec dates invalides
- [ ] Test validation post-calcul des marges

---

## ✅ Checklist d'Implémentation

### Backend
- [x] ✅ DTO `CalculerMargesDto` créé avec validation
- [x] ✅ DTO `RecalculerMargesDto` créé avec validation
- [x] ✅ Endpoint `POST /finance/revenus/:id/calculer-marges` amélioré
- [x] ✅ Endpoint `POST /finance/revenus/recalculer-marges` implémenté
- [x] ✅ Méthode `calculerCoutsParKgPourVente` créée
- [x] ✅ Méthode `calculerCoutsProduction` améliorée (charges fixes incluses)
- [x] ✅ Méthode `calculerMargesVente` améliorée (utilise les coûts calculés)
- [x] ✅ Méthode `recalculerMargesPeriode` implémentée
- [x] ✅ Gestion des erreurs et cas limites

### Frontend
- [x] ✅ Thunk `calculateAndSaveMargesVente` mis à jour
- [x] ✅ Thunk `recalculerMargesPeriode` mis à jour
- [x] ✅ Validation des données côté frontend
- [x] ✅ Validation post-calcul des marges

### Documentation
- [x] ✅ Documentation des endpoints (Swagger)
- [x] ✅ Documentation technique (ce fichier)

---

**Statut** : ✅ **TERMINÉ** - Les endpoints backend pour le calcul des marges sont implémentés et intégrés avec le frontend. Le système calcule maintenant automatiquement les marges OPEX et complètes en utilisant les coûts de production réels (dépenses OPEX, charges fixes, amortissements CAPEX).
