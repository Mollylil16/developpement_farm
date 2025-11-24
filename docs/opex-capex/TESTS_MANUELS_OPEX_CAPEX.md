# 🧪 Tests Manuels - Système OPEX/CAPEX

**Date:** 21 Novembre 2025  
**Version:** 1.0  
**Durée estimée:** 30-45 minutes

---

## 📋 Prérequis

- [ ] Migration database intégrée (voir `INTEGRATION_DB_OPEX_CAPEX.md`)
- [ ] Application compilée sans erreur
- [ ] Projet actif créé dans l'application
- [ ] Console de développement accessible

---

## 🎯 Plan de Tests

### Phase 1: Configuration Initiale (5 min)
### Phase 2: Gestion des Dépenses OPEX/CAPEX (10 min)
### Phase 3: Gestion des Ventes et Marges (10 min)
### Phase 4: Affichage Dashboard et Widgets (10 min)
### Phase 5: Graphiques et Rapports (5 min)

---

## ✅ Phase 1: Configuration Initiale

### Test 1.1: Paramètres du Projet

**Objectif:** Vérifier l'ajout du champ durée d'amortissement

**Étapes:**
1. Ouvrir l'application
2. Aller dans **Profil > Paramètres**
3. Cliquer sur **"Modifier"** le projet actif
4. Scroller jusqu'à la section **"💰 Gestion OPEX / CAPEX"**

**Résultat attendu:**
- ✅ Section visible
- ✅ Champ **"Durée d'amortissement (mois)"** présent
- ✅ Valeur par défaut: 36
- ✅ Texte d'aide explicatif visible

**Test:**
1. Changer la valeur à **24 mois**
2. Sauvegarder
3. Rouvrir l'édition
4. ✅ Valeur doit être **24**

**Statut:** ⬜ PASS / ⬜ FAIL

---

## ✅ Phase 2: Gestion des Dépenses OPEX/CAPEX

### Test 2.1: Créer une Dépense OPEX

**Objectif:** Vérifier que les dépenses opérationnelles sont classées OPEX

**Étapes:**
1. Aller dans **Finance > Dépenses**
2. Cliquer **"+ Ajouter une dépense"**
3. Remplir:
   - Montant: 50000 FCFA
   - Catégorie: **"Alimentation"**
   - Date: Aujourd'hui

**Résultat attendu:**
- ✅ Indicateur **"📊 OPEX - Dépense opérationnelle"** affiché
- ✅ Fond bleu clair (info)

**Test:**
1. Sauvegarder
2. ✅ Dépense créée sans erreur

**Statut:** ⬜ PASS / ⬜ FAIL

---

### Test 2.2: Créer une Dépense CAPEX (Investissement)

**Objectif:** Vérifier que les investissements sont classés CAPEX avec amortissement

**Étapes:**
1. **Finance > Dépenses > "+ Ajouter"**
2. Remplir:
   - Montant: 2000000 FCFA
   - Catégorie: **"💰 Investissement"**
   - Date: Aujourd'hui

**Résultat attendu:**
- ✅ Indicateur **"💰 CAPEX - Investissement (amorti sur 24 mois)"** affiché
  (ou 36 si non modifié en Test 1.1)
- ✅ Fond orange clair (warning)

**Test:**
1. Sauvegarder
2. ✅ Dépense créée sans erreur

**Statut:** ⬜ PASS / ⬜ FAIL

---

### Test 2.3: Créer une Dépense CAPEX (Équipement Lourd)

**Objectif:** Vérifier les autres catégories CAPEX

**Étapes:**
1. **Finance > Dépenses > "+ Ajouter"**
2. Montant: 5000000 FCFA
3. Catégorie: **"🚜 Équipement lourd"**

**Résultat attendu:**
- ✅ Indicateur CAPEX affiché

**Statut:** ⬜ PASS / ⬜ FAIL

---

### Test 2.4: Créer une Dépense CAPEX (Infrastructure)

**Étapes:**
1. Montant: 1500000 FCFA
2. Catégorie: **"🔧 Infrastructure"**

**Résultat attendu:**
- ✅ Indicateur CAPEX affiché

**Statut:** ⬜ PASS / ⬜ FAIL

---

## ✅ Phase 3: Gestion des Ventes et Marges

### Test 3.1: Créer une Vente SANS Poids

**Objectif:** Vérifier que l'app fonctionne sans poids (rétrocompatibilité)

**Étapes:**
1. Aller dans **Finance > Revenus**
2. **"+ Ajouter un revenu"**
3. Remplir:
   - Montant: 200000 FCFA
   - Catégorie: **"Vente de porc"**
   - Date: Aujourd'hui
   - **NE PAS** remplir le poids

**Résultat attendu:**
- ✅ Champ poids visible mais vide
- ✅ Texte d'aide explicatif
- ✅ Sauvegarde réussie

**Test:**
1. Sauvegarder
2. ✅ Vente créée
3. Vérifier dans la liste
4. ✅ Pas de bouton **"📊 Voir détails & marges"** (normal, pas de poids)

**Statut:** ⬜ PASS / ⬜ FAIL

---

### Test 3.2: Créer une Vente AVEC Poids

**Objectif:** Vérifier le calcul automatique des marges

**Étapes:**
1. **Finance > Revenus > "+ Ajouter"**
2. Remplir:
   - Montant: 180000 FCFA
   - Catégorie: **"Vente de porc"**
   - **Poids: 120 kg**
   - Date: Aujourd'hui

**Résultat attendu:**
- ✅ Champ poids visible et rempli
- ✅ Message "💡 Le système calculera automatiquement..."

**Test:**
1. Sauvegarder
2. Attendre 2-3 secondes (calcul en arrière-plan)
3. ✅ Vente créée sans erreur
4. Dans la liste, vérifier présence du bouton **"📊 Voir détails & marges"**

**Statut:** ⬜ PASS / ⬜ FAIL

---

### Test 3.3: Voir les Détails d'une Vente

**Objectif:** Vérifier l'affichage complet des marges

**Étapes:**
1. Dans **Finance > Revenus**
2. Trouver la vente créée en Test 3.2
3. Cliquer sur **"📊 Voir détails & marges"**

**Résultat attendu:**

**Section 1: Informations générales**
- ✅ Date affichée
- ✅ Prix de vente: 180000 FCFA
- ✅ Poids: 120 kg
- ✅ Prix/kg vif calculé: 1500 FCFA/kg

**Section 2: Coûts de production**
- ✅ Carte OPEX (fond bleu)
  - Coût/kg OPEX affiché
  - Coût réel OPEX calculé (coût/kg × 120)
- ✅ Carte COMPLET (fond violet/primary)
  - Coût/kg Complet affiché
  - Coût réel Complet calculé

**Section 3: Marges**
- ✅ Marge OPEX (valeur + pourcentage)
- ✅ Marge Complète (carte avec couleur)
  - Emoji: ✅ (confortable) ou ⚠️ (faible) ou ❌ (négative)
  - Couleur selon statut
  - Label descriptif

**Section 4: Info**
- ✅ Texte explicatif sur la marge complète

**Statut:** ⬜ PASS / ⬜ FAIL

**Notes:** _______________________________________

---

### Test 3.4: Créer Plusieurs Ventes

**Objectif:** Alimenter les données pour tests suivants

**Créer 3 ventes supplémentaires:**
1. 150000 FCFA, 100 kg
2. 200000 FCFA, 130 kg
3. 175000 FCFA, 115 kg

**Statut:** ⬜ PASS / ⬜ FAIL

---

## ✅ Phase 4: Dashboard et Widgets

### Test 4.1: Widget Coût de Production

**Objectif:** Vérifier l'affichage des coûts au dashboard

**Étapes:**
1. Retourner au **Dashboard** (écran principal)
2. Scroller jusqu'au widget **"📊 Coût de Production"**

**Résultat attendu:**
- ✅ Widget visible
- ✅ **Coût/kg (OPEX)** affiché en FCFA
- ✅ **Coût/kg (Complet)** affiché en FCFA
- ✅ **Marge moyenne** affichée en %
- ✅ Emoji statut: ✅ / ⚠️ / ❌
- ✅ Label statut: Confortable / Faible / Négative
- ✅ Info explicative en bas

**Test:**
1. Vérifier que les valeurs sont cohérentes
2. Coût Complet > Coût OPEX (normal, inclut amortissement)
3. ✅ Pas d'erreur, pas de "NaN", pas de "undefined"

**Statut:** ⬜ PASS / ⬜ FAIL

**Valeurs observées:**
- Coût/kg OPEX: _________ FCFA
- Coût/kg Complet: _________ FCFA
- Marge moyenne: _________ %

---

### Test 4.2: Widget Finance Existant

**Objectif:** Vérifier que les widgets existants fonctionnent toujours

**Étapes:**
1. Vérifier le widget **"💰 Finance"** (au-dessus de Coût Production)
2. ✅ Doit afficher budget et dépenses mensuelles
3. ✅ Pas d'erreur

**Statut:** ⬜ PASS / ⬜ FAIL

---

## ✅ Phase 5: Graphiques et Rapports

### Test 5.1: Graphique OPEX vs CAPEX

**Objectif:** Vérifier l'affichage du graphique de répartition

**Étapes:**
1. Aller dans **Finance > Graphiques**
2. Scroller jusqu'au graphique **"📊 OPEX vs CAPEX Amorti"**

**Résultat attendu:**
- ✅ Graphique visible (BarChart)
- ✅ Légende avec 2 couleurs:
  - Bleu: OPEX (Opérationnel)
  - Orange: CAPEX (Amorti)
- ✅ 6 mois affichés (labels)
- ✅ Barres visibles pour chaque mois
- ✅ **Total OPEX** affiché en FCFA + pourcentage
- ✅ **Total CAPEX** affiché en FCFA + pourcentage
- ✅ Info explicative sur l'amortissement

**Test:**
1. Vérifier que le graphique affiche les données
2. Les dépenses OPEX créées doivent apparaître dans le mois actuel
3. Les dépenses CAPEX doivent être amorties sur plusieurs mois

**Statut:** ⬜ PASS / ⬜ FAIL

**Observations:** _______________________________________

---

### Test 5.2: Autres Graphiques

**Objectif:** Vérifier que les graphiques existants fonctionnent

**Étapes:**
1. Vérifier les autres graphiques (revenus, dépenses, etc.)
2. ✅ Tous doivent s'afficher sans erreur

**Statut:** ⬜ PASS / ⬜ FAIL

---

## 🔍 Tests Avancés (Optionnel)

### Test A1: Modifier la Durée d'Amortissement

**Objectif:** Vérifier l'impact de la modification

**Étapes:**
1. Noter les coûts actuels (dashboard)
2. Aller dans **Paramètres**
3. Changer durée d'amortissement de 24 à **12 mois**
4. Sauvegarder
5. Retourner au dashboard
6. Attendre quelques secondes (recalcul)
7. Vérifier les nouveaux coûts

**Résultat attendu:**
- ✅ Coût/kg Complet **augmente** (amortissement plus rapide)
- ✅ Marge moyenne **diminue**

**Statut:** ⬜ PASS / ⬜ FAIL

---

### Test A2: Créer une Dépense dans le Passé

**Objectif:** Vérifier l'amortissement sur période passée

**Étapes:**
1. Créer une dépense CAPEX
2. Montant: 3600000 FCFA
3. Catégorie: Équipement lourd
4. Date: Il y a **18 mois** (ex: Mai 2024 si on est en Nov 2025)
5. Sauvegarder
6. Aller au graphique OPEX/CAPEX
7. Vérifier que l'amortissement apparaît sur les mois concernés

**Résultat attendu:**
- ✅ Amortissement de 100000 FCFA/mois (3600000/36)
- ✅ Visible sur les 6 derniers mois du graphique
- ✅ Total CAPEX amorti augmenté de ~600000 (6 mois)

**Statut:** ⬜ PASS / ⬜ FAIL

---

## 📊 Résumé des Tests

### Statistiques

- **Total tests:** 14 tests principaux + 2 optionnels
- **Tests PASS:** _____ / 14
- **Tests FAIL:** _____ / 14
- **Taux de réussite:** _____ %

### Tests Critiques (DOIVENT passer)

- [ ] Test 1.1: Champ amortissement visible
- [ ] Test 2.1: Dépense OPEX créée
- [ ] Test 2.2: Dépense CAPEX créée avec indicateur
- [ ] Test 3.2: Vente avec poids créée
- [ ] Test 3.3: Modal détails vente complet
- [ ] Test 4.1: Widget coûts affiché
- [ ] Test 5.1: Graphique OPEX/CAPEX affiché

**Si tous ces tests passent:** ✅ Système fonctionnel, prêt pour production

**Si un test critique échoue:** ⚠️ Problème à résoudre avant déploiement

---

## 🐛 Bugs Identifiés

### Bug 1
**Titre:** _______________________________________  
**Sévérité:** ⬜ Critique / ⬜ Majeure / ⬜ Mineure  
**Description:** _______________________________________  
**Reproduction:** _______________________________________  
**Statut:** ⬜ À corriger / ⬜ Corrigé

### Bug 2
**Titre:** _______________________________________  
**Sévérité:** ⬜ Critique / ⬜ Majeure / ⬜ Mineure  
**Description:** _______________________________________  
**Reproduction:** _______________________________________  
**Statut:** ⬜ À corriger / ⬜ Corrigé

---

## ✅ Validation Finale

- [ ] Tous les tests critiques passent
- [ ] Aucune erreur dans la console
- [ ] Aucun crash de l'application
- [ ] Les données sont sauvegardées correctement
- [ ] Les calculs sont cohérents
- [ ] L'UI est réactive et fluide
- [ ] Les graphiques s'affichent correctement
- [ ] La documentation est à jour

**Testé par:** _______________________________________  
**Date:** _______________________________________  
**Signature:** _______________________________________

---

## 📞 Support

En cas de problème durant les tests :

1. **Vérifier** `INTEGRATION_DB_OPEX_CAPEX.md` pour la migration
2. **Consulter** `OPEX_CAPEX_STATUS_FINAL.md` pour le status
3. **Lire** les logs de la console
4. **Noter** précisément le bug pour correction

---

**Date de création:** 21 Novembre 2025  
**Version:** 1.0  
**Durée estimée:** 30-45 minutes

🧪 **Bons tests !**

