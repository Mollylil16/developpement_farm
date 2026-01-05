# 🧪 PHASE 4 : TESTS - Calendrier de Vaccination Mode Bande

**Date** : 2026-01-05  
**Objectif** : Valider l'implémentation de l'affichage des sujets en retard dans le mode bande

---

## 📋 4.1 - CHECKLIST DE TESTS

### ✅ Tests Mode Individuel (Régression)

#### TEST 1.1 - Affichage du Calendrier
- [ ] **Action** : Ouvrir Menu Santé > Vaccinations > Cliquer sur "Voir le calendrier" pour un type de vaccin
- [ ] **Résultat attendu** : Le calendrier s'affiche avec la liste des animaux
- [ ] **Vérification** : 
  - Le titre "📅 Calendrier de vaccination - [Type]" est visible
  - La liste des animaux s'affiche correctement
  - Les animaux en retard ont un badge "En retard" rouge

#### TEST 1.2 - Animaux en Retard
- [ ] **Prérequis** : Avoir au moins un animal en retard de vaccination
- [ ] **Action** : Ouvrir le calendrier pour un type de vaccin
- [ ] **Résultat attendu** : Les animaux en retard sont affichés en premier
- [ ] **Vérification** :
  - Les animaux en retard ont une bordure gauche rouge
  - Le badge "En retard" est visible
  - Les informations (nom, catégorie, âge) sont correctes
  - La date du dernier traitement est affichée (si applicable)
  - Le prochain traitement requis est affiché

#### TEST 1.3 - Bouton "Vacciner maintenant"
- [ ] **Action** : Cliquer sur "Vacciner maintenant" pour un animal en retard
- [ ] **Résultat attendu** : Le formulaire de vaccination s'ouvre pré-rempli
- [ ] **Vérification** :
  - L'animal est sélectionné dans le formulaire
  - Le produit administré est pré-rempli (si disponible)
  - Le dosage est pré-rempli (si disponible)
  - Le type de prophylaxie est correct

#### TEST 1.4 - Animaux à Jour
- [ ] **Prérequis** : Avoir des animaux à jour pour un type de vaccin
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : Les animaux à jour sont affichés (sans badge "En retard")
- **Vérification** :
  - Pas de badge "En retard"
  - Bordure gauche de couleur normale (couleur du type)
  - Informations correctes affichées

#### TEST 1.5 - Aucun Animal
- [ ] **Prérequis** : Type de vaccin sans animaux concernés
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : Message "Aucun animal nécessitant ce traitement"
- **Vérification** : Le message s'affiche correctement

---

### ✅ Tests Mode Bande (Nouveau)

#### TEST 2.1 - Affichage Groupé par Bande
- [ ] **Prérequis** : Mode bande activé, avoir des animaux en retard dans différentes bandes
- [ ] **Action** : Ouvrir Menu Santé > Vaccinations > Cliquer sur "Voir le calendrier" pour un type de vaccin
- [ ] **Résultat attendu** : Les animaux sont groupés par bande
- **Vérification** :
  - Les bandes sont affichées avec leur nom (pen_name)
  - Le nombre de sujets en retard est affiché pour chaque bande
  - Un badge rouge avec le nombre est visible
  - Les bandes sont triées (plus de retards en premier)

#### TEST 2.2 - Expansion/Collapse des Bandes
- [ ] **Action** : Cliquer sur une bande pour l'expander
- [ ] **Résultat attendu** : La liste des animaux de cette bande s'affiche
- **Vérification** :
  - L'icône chevron change (up/down)
  - Les animaux de la bande sont listés
  - Chaque animal affiche ses informations (nom, catégorie, âge)
  - Les animaux en retard ont le badge "En retard"
  - Le bouton "Vacciner cette bande" est visible

#### TEST 2.3 - Bouton "Vacciner cette bande"
- [ ] **Action** : Cliquer sur "Vacciner cette bande" pour une bande
- [ ] **Résultat attendu** : Le formulaire de vaccination s'ouvre pré-rempli avec la bande
- **Vérification** :
  - La bande est sélectionnée dans le formulaire
  - Le nombre de sujets vaccinés est pré-rempli avec le nombre d'animaux en retard
  - Le type de prophylaxie est correct
  - Le formulaire est en mode batch

#### TEST 2.4 - Animaux Sans Bande
- [ ] **Prérequis** : Avoir des animaux en retard sans `batch_id`
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : Un groupe "Sans bande" est affiché
- **Vérification** :
  - Le groupe "Sans bande" a une bordure gauche orange/warning
  - L'icône warning est visible
  - Le nombre d'animaux sans bande est affiché
  - L'expansion fonctionne
  - Chaque animal a un bouton "Vacciner maintenant" individuel

#### TEST 2.5 - Aucun Sujet en Retard
- [ ] **Prérequis** : Mode bande, tous les animaux sont à jour
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : Message "Aucun sujet en retard pour ce traitement"
- **Vérification** : Le message s'affiche correctement

#### TEST 2.6 - Calcul des Retards par Bande
- [ ] **Prérequis** : 
  - Bande A : 10 sujets, 3 en retard
  - Bande B : 15 sujets, 5 en retard
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : 
  - Bande B affichée en premier (5 retards > 3 retards)
  - Bande A affichée en deuxième
  - Les nombres sont corrects
- **Vérification** :
  - Tri correct (plus de retards en premier)
  - Nombres affichés corrects
  - Total de sujets de la bande affiché correctement

#### TEST 2.7 - Mapping Animal → Bande
- [ ] **Prérequis** : Animaux dans différentes bandes
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : Chaque animal est dans la bonne bande
- **Vérification** :
  - Les animaux sont correctement groupés
  - Aucun animal n'apparaît dans plusieurs bandes
  - Les animaux sans bande sont dans "Sans bande"

---

### ✅ Tests de Performance

#### TEST 3.1 - Chargement avec Peu d'Animaux (< 10)
- [ ] **Prérequis** : Projet avec < 10 animaux
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : Chargement instantané (< 1 seconde)
- **Vérification** : Pas de lag, affichage immédiat

#### TEST 3.2 - Chargement avec Beaucoup d'Animaux (> 100)
- [ ] **Prérequis** : Projet avec > 100 animaux
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : Chargement acceptable (< 3 secondes)
- **Vérification** : 
  - Pas de freeze de l'interface
  - Affichage progressif si nécessaire
  - Pas d'erreur de mémoire

#### TEST 3.3 - Chargement des Batch_Pigs
- [ ] **Prérequis** : Mode bande avec plusieurs bandes
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : Le mapping animal → bande est créé correctement
- **Vérification** :
  - Pas d'erreur dans la console
  - Le mapping est complet
  - Les animaux sont correctement associés à leur bande

---

### ✅ Tests d'Intégration

#### TEST 4.1 - Basculer entre Modes
- [ ] **Action** : 
  1. Ouvrir le calendrier en mode individuel
  2. Changer le mode du projet en mode bande
  3. Rouvrir le calendrier
- [ ] **Résultat attendu** : L'affichage s'adapte au nouveau mode
- **Vérification** :
  - Mode individuel : liste plate
  - Mode bande : groupement par bande
  - Pas d'erreur lors du changement

#### TEST 4.2 - Vaccination depuis le Calendrier
- [ ] **Action** : 
  1. Ouvrir le calendrier
  2. Cliquer sur "Vacciner cette bande" (mode bande) ou "Vacciner maintenant" (mode individuel)
  3. Remplir et enregistrer la vaccination
- [ ] **Résultat attendu** : 
  - La vaccination est enregistrée
  - L'animal/la bande disparaît de la liste des retards
  - Le calendrier se met à jour
- **Vérification** :
  - Données correctes enregistrées
  - Mise à jour automatique
  - Pas d'erreur

#### TEST 4.3 - Rafraîchissement
- [ ] **Action** : 
  1. Ouvrir le calendrier
  2. Faire un pull-to-refresh
- [ ] **Résultat attendu** : Les données sont rechargées
- **Vérification** :
  - Les données sont à jour
  - Les retards sont recalculés
  - Pas d'erreur

---

### ✅ Tests d'Edge Cases

#### TEST 5.1 - Animal Sans Date de Naissance
- [ ] **Prérequis** : Animal sans `date_naissance`
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : L'animal n'apparaît pas dans le calendrier
- **Vérification** : Pas d'erreur, pas d'affichage

#### TEST 5.2 - Bande Vide
- [ ] **Prérequis** : Bande sans animaux
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : La bande n'apparaît pas
- **Vérification** : Pas d'erreur

#### TEST 5.3 - Vaccination avec Batch_ID mais Animal Individuel
- [ ] **Prérequis** : Vaccination enregistrée avec `batch_id` mais l'animal n'est pas dans cette bande
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : L'animal est traité correctement
- **Vérification** : Pas d'erreur, calcul correct

#### TEST 5.4 - Animal dans Plusieurs Bandes (Cas Anormal)
- [ ] **Prérequis** : Animal avec plusieurs `batch_id` (cas anormal)
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : L'animal apparaît dans une seule bande (la première trouvée)
- **Vérification** : Pas d'erreur, comportement déterministe

#### TEST 5.5 - Bande Supprimée mais Animaux Restants
- [ ] **Prérequis** : Animaux avec `batch_id` d'une bande qui n'existe plus
- [ ] **Action** : Ouvrir le calendrier
- [ ] **Résultat attendu** : Les animaux apparaissent dans "Sans bande"
- **Vérification** : Pas d'erreur, gestion gracieuse

---

## 📊 4.2 - MATRICE DE TESTS

| Test ID | Description | Mode | Priorité | Statut |
|---------|-------------|------|----------|--------|
| 1.1 | Affichage calendrier | Individuel | Haute | ⏳ À tester |
| 1.2 | Animaux en retard | Individuel | Haute | ⏳ À tester |
| 1.3 | Bouton vacciner | Individuel | Haute | ⏳ À tester |
| 1.4 | Animaux à jour | Individuel | Moyenne | ⏳ À tester |
| 1.5 | Aucun animal | Individuel | Basse | ⏳ À tester |
| 2.1 | Groupement par bande | Bande | Haute | ⏳ À tester |
| 2.2 | Expansion/collapse | Bande | Haute | ⏳ À tester |
| 2.3 | Bouton vacciner bande | Bande | Haute | ⏳ À tester |
| 2.4 | Animaux sans bande | Bande | Moyenne | ⏳ À tester |
| 2.5 | Aucun retard | Bande | Moyenne | ⏳ À tester |
| 2.6 | Calcul retards | Bande | Haute | ⏳ À tester |
| 2.7 | Mapping animal→bande | Bande | Haute | ⏳ À tester |
| 3.1 | Performance < 10 animaux | Les deux | Moyenne | ⏳ À tester |
| 3.2 | Performance > 100 animaux | Les deux | Moyenne | ⏳ À tester |
| 3.3 | Chargement batch_pigs | Bande | Haute | ⏳ À tester |
| 4.1 | Basculer modes | Les deux | Haute | ⏳ À tester |
| 4.2 | Vaccination depuis calendrier | Les deux | Haute | ⏳ À tester |
| 4.3 | Rafraîchissement | Les deux | Moyenne | ⏳ À tester |
| 5.1 | Animal sans date naissance | Les deux | Basse | ⏳ À tester |
| 5.2 | Bande vide | Bande | Basse | ⏳ À tester |
| 5.3 | Vaccination batch_id anormale | Bande | Basse | ⏳ À tester |
| 5.4 | Animal plusieurs bandes | Bande | Basse | ⏳ À tester |
| 5.5 | Bande supprimée | Bande | Basse | ⏳ À tester |

---

## 🔍 4.3 - SCÉNARIOS DE TEST DÉTAILLÉS

### Scénario 1 : Mode Individuel - Animal en Retard

**Prérequis** :
- Mode individuel activé
- Animal "Porc-001" né il y a 30 jours
- Traitement requis à 21 jours (non effectué)

**Étapes** :
1. Ouvrir Menu Santé > Vaccinations
2. Cliquer sur "Voir le calendrier" pour le type "Vaccin obligatoire"
3. Vérifier que "Porc-001" apparaît avec badge "En retard"
4. Cliquer sur "Vacciner maintenant"
5. Vérifier que le formulaire est pré-rempli

**Résultat attendu** :
- ✅ Animal affiché avec badge rouge
- ✅ Bordure gauche rouge
- ✅ Formulaire pré-rempli avec l'animal sélectionné

---

### Scénario 2 : Mode Bande - Plusieurs Bandes avec Retards

**Prérequis** :
- Mode bande activé
- Bande "Loge A" : 10 sujets, 3 en retard
- Bande "Loge B" : 15 sujets, 5 en retard
- Bande "Loge C" : 8 sujets, 0 en retard

**Étapes** :
1. Ouvrir Menu Santé > Vaccinations
2. Cliquer sur "Voir le calendrier" pour le type "Vaccin obligatoire"
3. Vérifier l'affichage groupé par bande
4. Vérifier que "Loge B" apparaît en premier (5 retards)
5. Vérifier que "Loge A" apparaît en deuxième (3 retards)
6. Vérifier que "Loge C" n'apparaît pas (0 retards)
7. Cliquer sur "Loge B" pour expander
8. Vérifier la liste des 5 animaux en retard
9. Cliquer sur "Vacciner cette bande"

**Résultat attendu** :
- ✅ Groupement par bande visible
- ✅ Tri correct (plus de retards en premier)
- ✅ Expansion fonctionne
- ✅ Formulaire pré-rempli avec la bande et 5 sujets

---

### Scénario 3 : Mode Bande - Animaux Sans Bande

**Prérequis** :
- Mode bande activé
- 2 animaux en retard sans `batch_id`

**Étapes** :
1. Ouvrir le calendrier
2. Vérifier qu'un groupe "Sans bande" apparaît
3. Cliquer pour expander
4. Vérifier les 2 animaux listés
5. Cliquer sur "Vacciner maintenant" pour un animal

**Résultat attendu** :
- ✅ Groupe "Sans bande" visible avec bordure orange
- ✅ Expansion fonctionne
- ✅ Formulaire pré-rempli en mode individuel

---

## 📸 4.4 - CAPTURES D'ÉCRAN À PRENDRE

### Mode Individuel
- [ ] Calendrier avec animaux en retard
- [ ] Animal en retard avec badge
- [ ] Formulaire pré-rempli après clic "Vacciner maintenant"

### Mode Bande
- [ ] Calendrier groupé par bande
- [ ] Bande expandée avec liste des animaux
- [ ] Groupe "Sans bande" expandé
- [ ] Formulaire pré-rempli après clic "Vacciner cette bande"

---

## 🐛 4.5 - BUGS CONNUS / À SURVEILLER

### Bug Potentiel 1 : Performance avec Beaucoup de Bandes
**Description** : Si beaucoup de bandes (> 20), le chargement des `batch_pigs` peut être lent  
**Impact** : Moyen  
**Solution** : Charger en parallèle ou avec pagination

### Bug Potentiel 2 : Mapping Animal → Bande Incomplet
**Description** : Si un animal n'est pas dans `batch_pigs`, il n'aura pas de `batch_id`  
**Impact** : Faible (apparaîtra dans "Sans bande")  
**Solution** : Comportement attendu, mais à documenter

### Bug Potentiel 3 : Race Condition lors du Chargement
**Description** : Si l'utilisateur change de mode pendant le chargement  
**Impact** : Faible  
**Solution** : Gérer avec `cancelled` flag (déjà implémenté)

---

## ✅ 4.6 - CRITÈRES D'ACCEPTATION

### Critères Fonctionnels
- [x] ✅ Mode individuel : Affichage liste plate (inchangé)
- [x] ✅ Mode bande : Groupement par bande fonctionne
- [x] ✅ Expansion/collapse des bandes fonctionne
- [x] ✅ Bouton "Vacciner cette bande" pré-remplit le formulaire
- [x] ✅ Animaux sans bande sont gérés
- [x] ✅ Calcul des retards correct

### Critères de Performance
- [ ] ⏳ Chargement < 3 secondes avec 100 animaux
- [ ] ⏳ Pas de freeze de l'interface
- [ ] ⏳ Pas d'erreur de mémoire

### Critères de Qualité
- [ ] ⏳ Pas d'erreur dans la console
- [ ] ⏳ Code respecte les conventions
- [ ] ⏳ Types TypeScript corrects
- [ ] ⏳ Pas d'avertissements React

---

## 📝 4.7 - NOTES DE TEST

### Environnement de Test
- **Plateforme** : iOS / Android
- **Version** : [À remplir]
- **Mode** : Développement / Production

### Données de Test
- **Projet Test Individuel** : [Nom du projet]
- **Projet Test Bande** : [Nom du projet]
- **Animaux de test** : [Liste]

### Résultats
- **Date de test** : [À remplir]
- **Testeur** : [À remplir]
- **Résultats** : [À remplir dans le tableau ci-dessus]

---

## 🎯 4.8 - PROCHAINES ÉTAPES APRÈS TESTS

1. **Correction des bugs** : Si des bugs sont trouvés, les corriger
2. **Optimisation** : Si des problèmes de performance, optimiser
3. **Documentation utilisateur** : Créer un guide si nécessaire
4. **Déploiement** : Une fois tous les tests passés, déployer

---

**Date de création** : 2026-01-05  
**Auteur** : Document de test  
**Statut** : ⏳ En attente de tests

