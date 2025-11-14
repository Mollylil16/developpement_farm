# Guide de Test Complet - FarmTrack Pro

## 📋 Table des Matières

1. [Prérequis et Installation](#1-prérequis-et-installation)
2. [Démarrage de l'Application](#2-démarrage-de-lapplication)
3. [Tests d'Authentification](#3-tests-dauthentification)
4. [Création et Gestion de Projet](#4-création-et-gestion-de-projet)
5. [Module Dashboard](#5-module-dashboard)
6. [Module Production](#6-module-production)
7. [Module Reproduction](#7-module-reproduction)
8. [Module Finance](#8-module-finance)
9. [Module Nutrition](#9-module-nutrition)
10. [Module Rapports](#10-module-rapports)
11. [Paramètres](#11-paramètres)
12. [Tests de Performance](#12-tests-de-performance)
13. [Tests de Validation](#13-tests-de-validation)

---

## 1. Prérequis et Installation

### 1.1 Vérification de l'Environnement

**Sur Windows :**

```powershell
# Vérifier Node.js (version 18+)
node --version

# Vérifier npm
npm --version

# Vérifier Expo CLI
npx expo --version
```

**Sur Android :**

- Avoir un émulateur Android configuré OU un appareil physique connecté
- Activer le mode développeur et le débogage USB sur l'appareil

### 1.2 Installation des Dépendances

```powershell
# Se placer dans le dossier du projet
cd fermier-pro

# Installer les dépendances
npm install

# Vérifier qu'il n'y a pas d'erreurs
npm run start
```

### 1.3 Démarrage du Serveur de Développement

```powershell
# Démarrer Expo
npm start

# OU directement sur Android
npm run android
```

**Résultat attendu :**

- Le terminal affiche un QR code
- Un menu Expo s'affiche
- L'application se lance sur l'émulateur/appareil

---

## 2. Démarrage de l'Application

### 2.1 Premier Lancement

**Écran attendu :** Écran de bienvenue (Welcome Screen)

**Actions à vérifier :**

- ✅ L'écran s'affiche correctement
- ✅ Les boutons sont visibles et cliquables
- ✅ La navigation fonctionne

**Étapes :**

1. Observer l'écran de bienvenue
2. Vérifier que les boutons "Se connecter" et "Créer un compte" sont présents
3. Vérifier que le design est cohérent

---

## 3. Tests d'Authentification

### 3.1 Création de Compte (Inscription)

**Écran :** Écran d'inscription

**Données de test :**

**Test 1 - Inscription avec Email :**

```
Nom : Test
Prénom : User
Email : test@example.com
Téléphone : (optionnel)
Mot de passe : Test1234!
Confirmation : Test1234!
```

**Actions :**

1. Cliquer sur "Créer un compte"
2. Remplir tous les champs
3. Cliquer sur "Créer mon compte"

**Résultats attendus :**

- ✅ Aucune erreur de validation
- ✅ Redirection automatique vers la création de projet
- ✅ Message de succès (si présent)

**Test 2 - Inscription avec Téléphone uniquement :**

```
Nom : Test2
Prénom : User2
Email : (laisser vide)
Téléphone : +221771234567
Mot de passe : Test1234!
Confirmation : Test1234!
```

**Résultats attendus :**

- ✅ L'inscription fonctionne avec téléphone uniquement
- ✅ Redirection vers la création de projet

**Test 3 - Validation des Champs :**

- Essayer de soumettre avec des champs vides → Erreur attendue
- Essayer avec un mot de passe trop court → Erreur attendue
- Essayer avec des mots de passe différents → Erreur attendue

### 3.2 Connexion (Login)

**Écran :** Écran de connexion

**Test 1 - Connexion avec Email :**

```
Email : test@example.com
Mot de passe : Test1234!
```

**Actions :**

1. Cliquer sur "Se connecter"
2. Entrer les identifiants
3. Cliquer sur "Connexion"

**Résultats attendus :**

- ✅ Connexion réussie
- ✅ Redirection vers le Dashboard (si projet existe) OU vers la création de projet

**Test 2 - Connexion avec Téléphone :**

```
Téléphone : +221771234567
Mot de passe : Test1234!
```

**Résultats attendus :**

- ✅ Connexion réussie avec téléphone

**Test 3 - Erreurs de Connexion :**

- Mauvais email/téléphone → Message d'erreur
- Mauvais mot de passe → Message d'erreur
- Champs vides → Message d'erreur

### 3.3 Déconnexion

**Actions :**

1. Aller dans Paramètres
2. Cliquer sur "Se déconnecter"

**Résultats attendus :**

- ✅ Déconnexion réussie
- ✅ Redirection vers l'écran de bienvenue
- ✅ Les données de session sont effacées

---

## 4. Création et Gestion de Projet

### 4.1 Création d'un Nouveau Projet

**Écran :** Écran "Créer votre projet"

**Données de test :**

```
Nom de la ferme : Ferme Test ABC
Localisation : Dakar, Sénégal
Nombre de truies : 500
Nombre de verrats : 28
Nombre de porcelets : 13
Poids moyen actuel (kg) : 45
Âge moyen actuel (jours) : 120
Notes : Projet de test pour validation
```

**Actions :**

1. Remplir tous les champs obligatoires
2. Vérifier que les champs numériques acceptent uniquement des nombres
3. Cliquer sur "Créer le projet"

**Résultats attendus :**

- ✅ Le projet est créé avec succès
- ✅ Redirection automatique vers le Dashboard
- ✅ Les données du projet apparaissent dans le Dashboard
- ✅ Aucun bouton "Se déconnecter" visible sur cet écran

**Vérifications post-création :**

- ✅ Le Dashboard affiche les bonnes statistiques
- ✅ Les widgets montrent les effectifs corrects
- ✅ Le projet apparaît dans les Paramètres

### 4.2 Modification du Projet

**Actions :**

1. Aller dans Paramètres → Projet
2. Cliquer sur "Modifier"
3. Modifier quelques champs (ex: nombre de truies à 750)
4. Cliquer sur "Enregistrer"

**Résultats attendus :**

- ✅ Les modifications sont sauvegardées
- ✅ Le Dashboard se met à jour avec les nouvelles valeurs
- ✅ Message de succès affiché

### 4.3 Gestion de Plusieurs Projets

**Actions :**

1. Créer un deuxième projet avec des données différentes
2. Aller dans Paramètres → Projets
3. Vérifier que les deux projets sont listés
4. Cliquer sur un autre projet pour l'activer

**Résultats attendus :**

- ✅ Le projet actif change
- ✅ Le Dashboard affiche les données du nouveau projet actif
- ✅ Toutes les données sont filtrées par projet actif

---

## 5. Module Dashboard

### 5.1 Affichage Initial

**Écran :** Dashboard (onglet principal)

**Vérifications :**

- ✅ Les widgets s'affichent correctement
- ✅ Les statistiques correspondent aux données du projet
- ✅ La date du jour est affichée
- ✅ Les animations (si présentes) fonctionnent

**Widgets à vérifier :**

1. **Widget Vue d'ensemble (Overview)**

   - Nombre de truies (doit correspondre aux animaux actifs du cheptel)
   - Nombre de verrats (doit correspondre aux animaux actifs du cheptel)
   - Nombre de porcelets (doit correspondre aux animaux actifs du cheptel)

2. **Widget Alertes**

   - Affiche les alertes importantes (gestations, pesées, etc.)

3. **Widget Secondaires**
   - Statistiques de reproduction
   - Statistiques financières
   - Statistiques de production

### 5.2 Mise à Jour Dynamique

**Test de mise à jour :**

1. Enregistrer une mortalité (voir section 5.3)
2. Observer le Dashboard
3. Vérifier que les statistiques se mettent à jour automatiquement

**Résultats attendus :**

- ✅ Les compteurs se mettent à jour sans rechargement manuel
- ✅ Les widgets reflètent les changements en temps réel

### 5.3 Enregistrement de Mortalités

**Actions :**

1. Cliquer sur le widget "Mortalités" ou aller dans Dashboard → Mortalités
2. Cliquer sur "Nouvelle mortalité"
3. Remplir le formulaire :
   ```
   Catégorie : Truie
   Nombre de porcs : 25
   Date : (date d'aujourd'hui)
   Cause : Maladie
   Notes : Test de mortalité
   ```
4. Enregistrer

**Résultats attendus :**

- ✅ La mortalité est enregistrée
- ✅ Le Dashboard se met à jour automatiquement
- ✅ Le nombre de truies diminue de 25
- ✅ La mortalité apparaît dans la liste

**Vérifications :**

- ✅ Dans "Nouvelle gestation", le nombre de truies disponibles a diminué
- ✅ Dans les Paramètres, les effectifs réels reflètent la mortalité

### 5.4 Navigation depuis le Dashboard

**Actions :**

1. Cliquer sur chaque widget
2. Vérifier que la navigation fonctionne vers les modules correspondants

**Résultats attendus :**

- ✅ Navigation fluide vers les modules
- ✅ Les données sont correctement chargées

---

## 6. Module Production

### 6.1 Onglet Cheptel

**Écran :** Production → Cheptel

**Vérifications initiales :**

- ✅ La liste des animaux s'affiche
- ✅ Les filtres fonctionnent (Actif, Mort, Vendu, etc.)
- ✅ Le chargement est rapide (pas de boucle infinie)

**Test 1 - Ajout d'un Animal :**

1. Cliquer sur "Ajouter un animal"
2. Remplir le formulaire :
   ```
   Code : VER1
   Nom : Verrat Alpha
   Sexe : Mâle
   Date de naissance : 01/01/2023
   Race : Large White
   Statut : Actif
   Reproducteur : Oui
   Poids initial (kg) : 120
   Date d'entrée : 01/01/2023
   Notes : Verrat de test
   ```
3. Enregistrer

**Résultats attendus :**

- ✅ L'animal est ajouté au cheptel
- ✅ Il apparaît dans la liste
- ✅ Il est disponible pour sélection dans les gestations

**Test 2 - Modification d'un Animal :**

1. Cliquer sur un animal dans la liste
2. Modifier quelques informations
3. Enregistrer

**Résultats attendus :**

- ✅ Les modifications sont sauvegardées
- ✅ La liste se met à jour

**Test 3 - Suppression/Retrait d'un Animal :**

1. Sélectionner un animal
2. Changer son statut à "Mort" ou "Vendu"
3. Enregistrer

**Résultats attendus :**

- ✅ L'animal disparaît du cheptel actif
- ✅ Il apparaît dans l'historique si applicable

### 6.2 Onglet Suivi des Pesées

**Écran :** Production → Suivi des pesées

**Vérifications initiales :**

- ✅ La liste des animaux avec leurs pesées s'affiche
- ✅ Le chargement est rapide (pas de boucle infinie)
- ✅ Les animaux sont triés correctement

**Test 1 - Ajout d'une Pesée :**

1. Cliquer sur un animal
2. Cliquer sur "Ajouter une pesée"
3. Remplir :
   ```
   Date : (date d'aujourd'hui)
   Poids (kg) : 150
   Notes : Pesée de test
   ```
4. Enregistrer

**Résultats attendus :**

- ✅ La pesée est enregistrée
- ✅ Le GMQ est calculé automatiquement
- ✅ La pesée apparaît dans l'historique de l'animal
- ✅ Les statistiques se mettent à jour

**Test 2 - Vérification du GMQ :**

- Vérifier que le GMQ est calculé correctement
- Formule : `((poids_actuel - poids_référence) * 1000) / nombre_de_jours`

**Test 3 - Historique des Pesées :**

1. Cliquer sur un animal avec plusieurs pesées
2. Vérifier l'historique complet
3. Vérifier que les dates sont triées (plus récentes en premier)

### 6.3 Onglet Estimations

**Écran :** Production → Estimations

**Vérifications initiales :**

- ✅ Les deux modes sont disponibles (Date cible / Animaux cibles)
- ✅ Le chargement est rapide (pas de boucle infinie)

**Test 1 - Estimation de Date :**

1. Sélectionner le mode "Date cible"
2. Choisir un animal dans la liste
3. Entrer un poids cible (ex: 100 kg)
4. Observer l'estimation

**Résultats attendus :**

- ✅ La date estimée est calculée
- ✅ Le nombre de jours nécessaires est affiché
- ✅ Le GMQ actuel et cible sont comparés
- ✅ Le statut (en avance/en retard/normal) est affiché

**Test 2 - Estimation d'Animaux :**

1. Sélectionner le mode "Animaux cibles"
2. Entrer un poids cible (ex: 100 kg)
3. Entrer une date cible (ex: 3 mois plus tard)
4. Observer les résultats

**Résultats attendus :**

- ✅ La liste des animaux qui atteindront le poids est affichée
- ✅ Les écarts sont calculés
- ✅ Les animaux sont triés par écart (plus proche en premier)

---

## 7. Module Reproduction

### 7.1 Onglet Gestations

**Écran :** Reproduction → Gestations

**Vérifications initiales :**

- ✅ La liste des gestations s'affiche
- ✅ Les gestations sont filtrées par projet actif
- ✅ Les dates sont correctement formatées

**Test 1 - Création d'une Nouvelle Gestation :**

**Étape 1 - Sélection de la Truie :**

1. Cliquer sur "Nouvelle gestation"
2. Dans le champ "Truie", tester deux méthodes :
   - **Méthode A :** Saisie directe du numéro (ex: 856)
   - **Méthode B :** Recherche par nom ou numéro
3. Vérifier que la truie est sélectionnée

**Résultats attendus :**

- ✅ La saisie directe fonctionne
- ✅ La recherche fonctionne
- ✅ La truie sélectionnée s'affiche clairement

**Étape 2 - Sélection du Verrat :**

1. Cliquer sur "Sélectionner un verrat \*"
2. **IMPORTANT :** Vérifier que le modal s'affiche correctement
3. Vérifier que la liste des verrats est visible
4. Rechercher un verrat si nécessaire
5. Sélectionner un verrat

**Résultats attendus :**

- ✅ Le modal s'affiche en bottom sheet
- ✅ La liste des verrats est complète (virtuels + enregistrés)
- ✅ La recherche fonctionne
- ✅ La sélection fonctionne
- ✅ Le verrat sélectionné apparaît dans le formulaire
- ✅ Le champ "Verrat utilisé" n'est plus vide

**Étape 3 - Compléter le Formulaire :**

```
Date de sautage : (date d'aujourd'hui)
Nombre de porcelets prévu : 12
Notes : Gestation de test
```

**Étape 4 - Validation :**

1. Vérifier que la date de mise bas prévue est calculée (date_sautage + 114 jours)
2. Cliquer sur "Créer"

**Résultats attendus :**

- ✅ La gestation est créée avec succès
- ✅ Elle apparaît dans la liste des gestations
- ✅ La date de mise bas prévue est correcte
- ✅ Aucune erreur de validation

**Test 2 - Vérification des Données :**

1. Vérifier que les truies disponibles excluent les mortalités
2. Vérifier que les verrats disponibles incluent :
   - Les verrats virtuels (basés sur nombre_verrats - mortalités)
   - Les verrats enregistrés dans le cheptel
3. Vérifier qu'il n'y a pas de doublons

**Test 3 - Modification d'une Gestation :**

1. Cliquer sur une gestation existante
2. Modifier quelques informations
3. Enregistrer

**Résultats attendus :**

- ✅ Les modifications sont sauvegardées
- ✅ La liste se met à jour

**Test 4 - Filtrage et Pagination :**

1. Vérifier les filtres (En cours, Terminées, etc.)
2. Vérifier la pagination si beaucoup de gestations

### 7.2 Onglet Calendrier

**Écran :** Reproduction → Calendrier

**Vérifications :**

- ✅ Le calendrier s'affiche correctement
- ✅ Les gestations sont marquées sur les dates appropriées
- ✅ Les dates de mise bas prévue sont visibles
- ✅ Les dates de sautage sont visibles

**Actions :**

1. Naviguer entre les mois
2. Cliquer sur une date avec une gestation
3. Vérifier les détails affichés

### 7.3 Onglet Sevrages

**Écran :** Reproduction → Sevrages

**Vérifications initiales :**

- ✅ La liste des sevrages s'affiche
- ✅ Les sevrages sont filtrés par projet actif
- ✅ Les dates sont correctement formatées

**Test 1 - Création d'un Sevrage :**

1. Sélectionner une gestation terminée
2. Cliquer sur "Enregistrer le sevrage"
3. Remplir :
   ```
   Date de sevrage : (date d'aujourd'hui)
   Nombre de porcelets sevrés : 10
   Poids moyen au sevrage (kg) : 8.5
   Notes : Sevrage de test
   ```
4. Enregistrer

**Résultats attendus :**

- ✅ Le sevrage est enregistré
- ✅ Il apparaît dans la liste
- ✅ La gestation est marquée comme terminée

---

## 8. Module Finance

### 8.1 Gestion des Charges Fixes

**Écran :** Finance → Charges Fixes

**Test 1 - Ajout d'une Charge Fixe :**

1. Cliquer sur "Ajouter une charge fixe"
2. Remplir :
   ```
   Libellé : Alimentation mensuelle
   Montant : 500000
   Fréquence : Mensuel
   Date de début : (date d'aujourd'hui)
   Statut : Actif
   ```
3. Enregistrer

**Résultats attendus :**

- ✅ La charge fixe est enregistrée
- ✅ Elle apparaît dans la liste
- ✅ Elle est prise en compte dans les calculs

**Test 2 - Modification et Désactivation :**

1. Modifier une charge fixe
2. Désactiver une charge fixe
3. Vérifier que les calculs se mettent à jour

### 8.2 Gestion des Dépenses Ponctuelles

**Écran :** Finance → Dépenses

**Test 1 - Ajout d'une Dépense :**

1. Cliquer sur "Nouvelle dépense"
2. Remplir :
   ```
   Libellé : Achat de matériel
   Montant : 250000
   Date : (date d'aujourd'hui)
   Catégorie : Équipement
   Notes : Achat de test
   ```
3. Enregistrer

**Résultats attendus :**

- ✅ La dépense est enregistrée
- ✅ Elle apparaît dans la liste
- ✅ Elle est prise en compte dans les calculs

### 8.3 Gestion des Revenus

**Écran :** Finance → Revenus

**Test 1 - Ajout d'un Revenu :**

1. Cliquer sur "Nouveau revenu"
2. Remplir :
   ```
   Libellé : Vente de porcs
   Montant : 1500000
   Date : (date d'aujourd'hui)
   Catégorie : Vente
   Notes : Vente de test
   ```
3. Enregistrer

**Résultats attendus :**

- ✅ Le revenu est enregistré
- ✅ Il apparaît dans la liste
- ✅ Il est pris en compte dans les calculs

### 8.4 Tableau de Bord Financier

**Vérifications :**

- ✅ Le solde est calculé correctement
- ✅ Les graphiques s'affichent
- ✅ Les totaux sont corrects

---

## 9. Module Nutrition

### 9.1 Gestion des Rations

**Écran :** Nutrition → Rations

**Test 1 - Création d'une Ration :**

1. Cliquer sur "Nouvelle ration"
2. Remplir :
   ```
   Nom : Ration croissance
   Date : (date d'aujourd'hui)
   Ingrédients :
     - Maïs : 50 kg
     - Soja : 20 kg
     - Complément : 5 kg
   Coût total : 75000
   Notes : Ration de test
   ```
3. Enregistrer

**Résultats attendus :**

- ✅ La ration est enregistrée
- ✅ Elle apparaît dans la liste
- ✅ Le coût est calculé

### 9.2 Gestion des Stocks

**Écran :** Nutrition → Stocks

**Test 1 - Ajout d'un Stock :**

1. Cliquer sur "Ajouter un stock"
2. Remplir :
   ```
   Produit : Maïs
   Quantité : 1000 kg
   Prix unitaire : 500
   Date d'achat : (date d'aujourd'hui)
   Date d'expiration : (date future)
   ```
3. Enregistrer

**Résultats attendus :**

- ✅ Le stock est enregistré
- ✅ Il apparaît dans la liste
- ✅ Les alertes d'expiration fonctionnent

---

## 10. Module Rapports

### 10.1 Indicateurs de Performance

**Écran :** Rapports → Indicateurs

**Vérifications :**

- ✅ Le chargement est rapide (pas de boucle infinie)
- ✅ Les indicateurs sont calculés correctement :
  - Taux de mortalité
  - Taux de croissance
  - Efficacité alimentaire
  - Coût de production par kg
- ✅ Les recommandations sont affichées

**Test de Calcul :**

1. Vérifier que le taux de mortalité = (morts / total initial) \* 100
2. Vérifier que le coût de production inclut :
   - Charges fixes
   - Dépenses ponctuelles
   - Coût d'alimentation
3. Vérifier que le poids total est basé sur les pesées réelles

### 10.2 Rapports Détaillés

**Vérifications :**

- ✅ Les rapports s'affichent correctement
- ✅ Les données sont filtrées par projet
- ✅ Les dates sont correctes
- ✅ Les totaux sont exacts

---

## 11. Paramètres

### 11.1 Gestion du Compte

**Écran :** Paramètres → Compte

**Test 1 - Modification du Profil :**

1. Modifier le nom ou prénom
2. Enregistrer
3. Vérifier que les modifications sont sauvegardées

**Test 2 - Changement de Mot de Passe :**

1. Cliquer sur "Changer le mot de passe"
2. Entrer l'ancien mot de passe
3. Entrer le nouveau mot de passe
4. Confirmer
5. Se déconnecter et se reconnecter avec le nouveau mot de passe

### 11.2 Gestion des Projets

**Vérifications :**

- ✅ La liste des projets s'affiche
- ✅ Le projet actif est clairement indiqué
- ✅ Le changement de projet fonctionne
- ✅ Les effectifs réels sont calculés correctement

### 11.3 Paramètres de l'Application

**Vérifications :**

- ✅ Le thème (clair/sombre) fonctionne
- ✅ Les notifications sont configurables
- ✅ Les préférences sont sauvegardées

---

## 12. Tests de Performance

### 12.1 Tests de Chargement

**Scénarios à tester :**

1. **Chargement initial :**

   - Temps de chargement < 3 secondes
   - Pas de boucle infinie
   - Pas de freeze de l'interface

2. **Changement d'onglet :**

   - Les onglets se chargent rapidement
   - Pas de rechargement inutile
   - Les données sont mises en cache

3. **Navigation entre écrans :**
   - Navigation fluide
   - Pas de délai perceptible
   - Les transitions sont smooth

### 12.2 Tests avec Beaucoup de Données

**Scénarios :**

1. Créer 100+ animaux
2. Créer 50+ gestations
3. Créer 200+ pesées
4. Vérifier que l'application reste performante

**Résultats attendus :**

- ✅ La pagination fonctionne
- ✅ Les listes se chargent progressivement
- ✅ Pas de ralentissement significatif

### 12.3 Tests de Mémoire

**Vérifications :**

- ✅ Pas de fuites de mémoire
- ✅ Les données sont libérées quand non utilisées
- ✅ L'application ne plante pas après utilisation prolongée

---

## 13. Tests de Validation

### 13.1 Validation des Formulaires

**Champs à tester :**

- Champs obligatoires → Erreur si vide
- Champs numériques → Erreur si texte
- Champs de date → Erreur si date invalide
- Champs d'email → Erreur si format invalide
- Champs de téléphone → Erreur si format invalide

### 13.2 Validation des Données

**Vérifications :**

- ✅ Les dates ne peuvent pas être dans le futur (selon le contexte)
- ✅ Les nombres ne peuvent pas être négatifs (selon le contexte)
- ✅ Les pourcentages sont entre 0 et 100
- ✅ Les montants sont positifs

### 13.3 Validation des Relations

**Vérifications :**

- ✅ Une gestation nécessite une truie ET un verrat
- ✅ Une pesée nécessite un animal existant
- ✅ Un sevrage nécessite une gestation terminée
- ✅ Les données sont liées au bon projet

### 13.4 Tests de Cohérence

**Vérifications :**

- ✅ Les effectifs réels correspondent aux animaux actifs
- ✅ Les mortalités sont soustraites des effectifs
- ✅ Les gestations sont filtrées par projet
- ✅ Les calculs (GMQ, coûts, etc.) sont corrects

---

## 14. Checklist Finale

### Fonctionnalités Critiques

- [ ] Authentification (inscription, connexion, déconnexion)
- [ ] Création et gestion de projet
- [ ] Dashboard avec mise à jour dynamique
- [ ] Enregistrement de mortalités
- [ ] Module Production (Cheptel, Pesées, Estimations)
- [ ] Module Reproduction (Gestations avec sélection verrat, Calendrier, Sevrages)
- [ ] Module Finance (Charges, Dépenses, Revenus)
- [ ] Module Nutrition (Rations, Stocks)
- [ ] Module Rapports (Indicateurs, Rapports détaillés)
- [ ] Paramètres (Compte, Projets, Application)

### Performance

- [ ] Chargement rapide (< 3 secondes)
- [ ] Pas de boucle infinie
- [ ] Navigation fluide
- [ ] Performance avec beaucoup de données

### Validation

- [ ] Tous les formulaires sont validés
- [ ] Les erreurs sont affichées correctement
- [ ] Les données sont cohérentes
- [ ] Les calculs sont exacts

### UX/UI

- [ ] Interface intuitive
- [ ] Messages d'erreur clairs
- [ ] Feedback visuel pour les actions
- [ ] Design cohérent

---

## 15. Problèmes Connus et Solutions

### Problème : Modal de sélection de verrat ne s'affiche pas

**Solution :** Vérifier que le modal est rendu avant le CustomModal dans le JSX

### Problème : Boucle infinie de chargement

**Solution :** Vérifier les dépendances des `useEffect` et `useFocusEffect`

### Problème : Données ne se mettent pas à jour

**Solution :** Vérifier que les actions Redux sont dispatchées correctement

### Problème : Navigation bloquée

**Solution :** Vérifier la logique de navigation dans `AppNavigator.tsx`

---

## 16. Notes Importantes

1. **Toujours tester avec un projet actif** : La plupart des fonctionnalités nécessitent un projet actif
2. **Vérifier les logs** : Utiliser `console.log` pour déboguer si nécessaire
3. **Tester sur différents appareils** : Tester sur émulateur ET appareil physique
4. **Tester avec différentes quantités de données** : Peu de données, beaucoup de données
5. **Tester les cas limites** : Données vides, valeurs extrêmes, etc.

---

## 17. Contact et Support

En cas de problème lors des tests :

1. Noter le problème avec précision
2. Noter les étapes pour reproduire
3. Noter les messages d'erreur
4. Faire une capture d'écran si possible
5. Vérifier les logs dans la console

---

**Bon test ! 🚀**
