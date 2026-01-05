# 🧪 Tests de Validation - Correction des Cartes Inactives Marketplace

**Date** : 2025-01-XX  
**Version** : Après correction  
**Statut** : ⏳ À VALIDER

---

## 📋 Résumé des Corrections Appliquées

### Problème Corrigé
- Les cartes de listing en mode "élevage en bande" (batch) étaient inactives au clic
- Le modal d'offre ne s'affichait pas pour les batch listings
- Les offres n'étaient pas créées avec les bons `pigIds`

### Modifications Effectuées
1. **MarketplaceScreen.tsx** :
   - `handleListingPress` : Détection et traitement des batch listings
   - Création de subjects virtuels pour représenter les bandes
   - Utilisation de `selectedSubjectsForOffer` pour les batch listings
   - `handleOfferSubmit` : Utilisation de `pigIds` comme `subjectIds` pour les batch

---

## ✅ TEST 1 - Mode Individuel (Ne doit pas être cassé)

### Prérequis
- [x] Un compte acheteur existant
- [x] Au moins un listing individuel (avec `subjectId`) dans le Marketplace
- [x] Backend en cours d'exécution

### Étapes de Test

1. **Connexion avec profil acheteur**
   - [ ] Se connecter avec un compte ayant le rôle `buyer`
   - [ ] Vérifier que la navigation fonctionne correctement
   - [ ] Vérifier que l'onglet "Acheter" est visible dans Marketplace

2. **Accès au Marketplace**
   - [ ] Naviguer vers l'écran Marketplace
   - [ ] Vérifier que l'onglet "Acheter" est actif par défaut
   - [ ] Vérifier que les listings sont chargés et affichés

3. **Clic sur une carte d'animal en mode individuel**
   - [ ] Identifier une carte avec un listing individuel (affiche un seul animal)
   - [ ] Cliquer sur la carte
   - [ ] **Vérification attendue** : Le clic est détecté (pas de blocage)

4. **Vérification de l'affichage des détails**
   - [ ] **Vérification attendue** : Le modal `OfferModal` s'affiche
   - [ ] **Vérification attendue** : Les informations suivantes sont visibles :
     - Code du sujet
     - Race
     - Poids
     - Prix au kg
     - Prix total
     - Statut de santé
     - Vaccinations

5. **Vérification du bouton "Faire une offre"**
   - [ ] **Vérification attendue** : Le bouton "Envoyer l'offre" est visible dans le footer du modal
   - [ ] **Vérification attendue** : Le bouton est cliquable (non désactivé après remplissage du formulaire)
   - [ ] **Vérification attendue** : Les conditions de vente sont affichées
   - [ ] **Vérification attendue** : La checkbox d'acceptation des conditions fonctionne

### Résultat Attendu
- ✅ Modal s'affiche correctement
- ✅ Toutes les informations sont visibles
- ✅ Bouton "Faire une offre" est fonctionnel

### Résultat Observé
- [ ] ✅ Succès / ❌ Échec
- **Détails** : _[À remplir lors du test]_
- **Screenshots/Logs** : _[À ajouter si échec]_

---

## ✅ TEST 2 - Mode Bande (Doit maintenant fonctionner)

### Prérequis
- [x] Même compte acheteur que TEST 1
- [x] Au moins un listing batch (avec `batchId` et `pigIds`) dans le Marketplace
- [x] Backend en cours d'exécution

### Étapes de Test

1. **Connexion avec profil acheteur**
   - [ ] Se connecter avec le même compte acheteur
   - [ ] Naviguer vers Marketplace

2. **Clic sur une carte d'animal en mode bande**
   - [ ] Identifier une carte avec un listing batch (affiche "Bande" avec plusieurs porcs)
   - [ ] **Indicateur visuel** : La carte devrait afficher "Bande" ou un badge similaire
   - [ ] Cliquer sur la carte `BatchListingCard`
   - [ ] **Vérification attendue** : Le clic est détecté (pas de blocage)

3. **Vérification de l'affichage des détails**
   - [ ] **Vérification attendue** : Le modal `OfferModal` s'affiche (NOUVEAU - corrigé)
   - [ ] **Vérification attendue** : Les informations suivantes sont visibles :
     - Code de la bande : `Bande #[batchId]`
     - Race
     - Poids total de la bande (et non poids moyen)
     - Prix au kg
     - Prix total
     - Nombre de porcs dans la bande (affiché dans le code ou le poids)

4. **Vérification du bouton "Faire une offre"**
   - [ ] **Vérification attendue** : Le bouton "Envoyer l'offre" est visible
   - [ ] **Vérification attendue** : Le bouton est cliquable
   - [ ] **Vérification attendue** : Le formulaire de prix peut être rempli
   - [ ] **Vérification attendue** : Les conditions de vente sont affichées

### Points Critiques à Vérifier

- **Console Logs** : Vérifier dans la console du navigateur/DevTools :
  ```javascript
  // Devrait afficher :
  [MarketplaceScreen.tsx:594] handleListingPress appelé
  [MarketplaceScreen.tsx:598] Listing batch détecté
  ```
  
- **State React** : Vérifier que :
  - `selectedListing` est `null` pour les batch listings
  - `selectedSubjectsForOffer` est défini avec les subjects virtuels
  - `offerModalVisible` est `true`

### Résultat Attendu
- ✅ Modal s'affiche (corrigé - ne devrait plus être bloqué)
- ✅ Informations de la bande affichées correctement
- ✅ Bouton "Faire une offre" est fonctionnel

### Résultat Observé
- [ ] ✅ Succès / ❌ Échec
- **Détails** : _[À remplir lors du test]_
- **Screenshots/Logs** : _[À ajouter si échec]_

---

## ✅ TEST 3 - Flow Complet d'Offre

### Prérequis
- [x] Un compte acheteur
- [x] Un compte producteur (différent de l'acheteur)
- [x] Un listing batch disponible dans le Marketplace
- [x] Backend avec notifications activées

### Étapes de Test

#### Partie 1 : Création d'Offre par l'Acheteur

1. **Faire une offre sur un animal en mode bande**
   - [ ] Se connecter avec le compte acheteur
   - [ ] Naviguer vers Marketplace
   - [ ] Cliquer sur une carte batch listing
   - [ ] Vérifier que le modal s'affiche
   - [ ] Remplir le formulaire d'offre :
     - Prix proposé (différent du prix original pour tester)
     - Message optionnel
     - Accepter les conditions
   - [ ] Cliquer sur "Envoyer l'offre"
   - [ ] **Vérification attendue** : Message de succès affiché
   - [ ] **Vérification attendue** : Le modal se ferme

2. **Vérifier que l'offre est créée**
   - [ ] Vérifier dans l'onglet "Offres" que l'offre envoyée apparaît
   - [ ] Vérifier le statut : `pending`
   - [ ] Vérifier que les détails sont corrects :
     - Listing ID correct
     - Prix proposé correct
     - Message affiché si fourni

#### Partie 2 : Notification au Producteur

3. **Le producteur doit recevoir la notification**
   - [ ] Se connecter avec le compte producteur
   - [ ] Naviguer vers Marketplace
   - [ ] Vérifier l'icône de notification (cloche)
   - [ ] **Vérification attendue** : Badge avec un nombre > 0
   - [ ] Cliquer sur l'icône de notification
   - [ ] **Vérification attendue** : Notification de type `offer_received` visible
   - [ ] **Vérification attendue** : Le message indique qu'une offre a été reçue

#### Partie 3 : Contre-proposition par le Producteur

4. **Le producteur peut faire une contre-proposition**
   - [ ] Depuis les notifications, cliquer sur l'offre reçue
   - [ ] Ou aller dans l'onglet "Offres" → "Reçues"
   - [ ] **Vérification attendue** : L'offre est visible avec les détails
   - [ ] Cliquer sur "Faire une contre-proposition" ou "Répondre"
   - [ ] **Vérification attendue** : Un modal/écran de contre-proposition s'affiche
   - [ ] Remplir le nouveau prix proposé
   - [ ] Envoyer la contre-proposition
   - [ ] **Vérification attendue** : Statut de l'offre change à `countered`

#### Partie 4 : Réception de la Contre-proposition par l'Acheteur

5. **L'acheteur reçoit la contre-proposition**
   - [ ] Se reconnecter avec le compte acheteur
   - [ ] Naviguer vers Marketplace
   - [ ] Vérifier l'icône de notification
   - [ ] **Vérification attendue** : Notification de type `offer_countered` visible
   - [ ] Aller dans l'onglet "Offres" → "Envoyées"
   - [ ] **Vérification attendue** : Statut de l'offre est `countered`
   - [ ] **Vérification attendue** : Le nouveau prix proposé est visible

### Points Critiques Backend à Vérifier

- **Création d'offre** : Vérifier dans la base de données :
  ```sql
  SELECT * FROM marketplace_offers 
  WHERE listing_id = '[listingId]' 
  ORDER BY created_at DESC LIMIT 1;
  ```
  - `subject_ids` doit contenir les `pigIds` pour les batch listings
  - `buyer_id` doit être l'ID de l'acheteur
  - `producer_id` doit être l'ID du producteur propriétaire
  - `status` doit être `'pending'`

- **Notifications** : Vérifier dans la base de données :
  ```sql
  SELECT * FROM marketplace_notifications 
  WHERE related_id = '[offerId]' 
  AND related_type = 'offer'
  ORDER BY created_at DESC;
  ```

### Résultat Attendu
- ✅ Offre créée avec les bons `pigIds` pour batch
- ✅ Notification envoyée au producteur
- ✅ Contre-proposition possible
- ✅ Notification de contre-proposition envoyée à l'acheteur

### Résultat Observé
- [ ] ✅ Succès / ❌ Échec
- **Détails** : _[À remplir lors du test]_
- **Screenshots/Logs** : _[À ajouter si échec]_

---

## ✅ TEST 4 - Permissions

### Prérequis
- [x] Un compte producteur avec des listings actifs
- [x] Un compte acheteur
- [x] Un compte vétérinaire (optionnel)
- [x] Un compte technicien (optionnel)

### Étapes de Test

#### Partie 1 : Producteur ne peut pas acheter ses propres animaux

1. **Vérifier qu'un producteur ne voit pas ses propres listings**
   - [ ] Se connecter avec le compte producteur
   - [ ] Naviguer vers Marketplace → Onglet "Acheter"
   - [ ] **Vérification attendue** : Les listings du producteur ne sont PAS visibles
   - [ ] **Vérification attendue** : Seuls les listings d'autres producteurs sont visibles

2. **Tentative de clic sur son propre listing (si visible par erreur)**
   - [ ] Si un listing du producteur est visible (BUG), cliquer dessus
   - [ ] **Vérification attendue** : Soit le clic ne fonctionne pas, soit un message d'erreur s'affiche
   - [ ] **Backend** : Vérifier que `handleOfferSubmit` bloque si `listing.producerId === user.id`

#### Partie 2 : Acheteur ne voit que les animaux en vente

3. **Vérifier que l'acheteur ne voit que les listings disponibles**
   - [ ] Se connecter avec le compte acheteur
   - [ ] Naviguer vers Marketplace
   - [ ] **Vérification attendue** : Seuls les listings avec `status = 'available'` sont visibles
   - [ ] **Vérification attendue** : Les listings avec `status = 'sold'` ou `status = 'removed'` ne sont PAS visibles

4. **Vérifier les filtres de statut**
   - [ ] Tester les filtres si disponibles
   - [ ] **Vérification attendue** : Impossible de filtrer pour voir les listings vendus/retirés

#### Partie 3 : Rôles Vétérinaire et Technicien

5. **Test avec profil vétérinaire**
   - [ ] Se connecter avec un compte ayant uniquement le rôle `veterinarian`
   - [ ] Naviguer vers Marketplace
   - [ ] **Vérification attendue** : L'onglet "Acheter" est visible (si le vétérinaire peut acheter)
   - [ ] **Vérification attendue** : Les listings sont visibles
   - [ ] Cliquer sur un listing
   - [ ] **Vérification attendue** : Le modal s'affiche (si permissions accordées)
   - [ ] **OU** : **Vérification attendue** : Le clic est bloqué si le vétérinaire ne peut pas acheter

6. **Test avec profil technicien**
   - [ ] Se connecter avec un compte ayant uniquement le rôle `technician`
   - [ ] Naviguer vers Marketplace
   - [ ] **Vérification attendue** : Même comportement que vétérinaire (selon les permissions définies)

### Points Critiques Backend à Vérifier

- **Filtrage par producteur** : Vérifier dans le backend que la requête exclut les listings du producteur :
  ```sql
  -- Dans marketplace.service.ts - findAllListings
  WHERE status = 'available' 
  AND producer_id != $userId  -- Doit être présent
  ```

- **Permissions d'achat** : Vérifier que `createOffer` vérifie :
  ```typescript
  // Dans marketplace.service.ts - createOffer
  if (listing.producerId === userId) {
    throw new ForbiddenException('Vous ne pouvez pas acheter vos propres animaux');
  }
  ```

### Résultat Attendu
- ✅ Producteur ne voit pas ses propres listings
- ✅ Producteur ne peut pas créer d'offre sur ses propres listings
- ✅ Acheteur ne voit que les listings disponibles
- ✅ Permissions correctes pour vétérinaire et technicien

### Résultat Observé
- [ ] ✅ Succès / ❌ Échec
- **Détails** : _[À remplir lors du test]_
- **Screenshots/Logs** : _[À ajouter si échec]_

---

## 📊 Tableau Récapitulatif des Tests

| Test | Statut | Date | Testeur | Commentaires |
|------|--------|------|---------|--------------|
| TEST 1 - Mode Individuel | ⏳ | _ | _ | _ |
| TEST 2 - Mode Bande | ⏳ | _ | _ | _ |
| TEST 3 - Flow Complet | ⏳ | _ | _ | _ |
| TEST 4 - Permissions | ⏳ | _ | _ | _ |

**Légende** :
- ✅ Succès
- ❌ Échec
- ⏳ En attente
- ⚠️ Succès partiel (détailler dans commentaires)

---

## 🐛 Issues Découvertes

### Issues Critiques
_Liste des problèmes critiques découverts lors des tests_

### Issues Mineures
_Liste des problèmes mineurs découverts lors des tests_

### Améliorations Suggérées
_Liste des améliorations suggérées basées sur les tests_

---

## 📝 Notes Additionnelles

### Environnement de Test
- **Backend** : `localhost:3000` / `production`
- **Frontend** : `localhost:19000` / Expo Go
- **Base de données** : PostgreSQL / SQLite
- **Version** : `[À remplir]`

### Données de Test Utilisées
- **Compte Acheteur** : `[À remplir]`
- **Compte Producteur** : `[À remplir]`
- **Listing Test Individuel** : `[À remplir]`
- **Listing Test Batch** : `[À remplir]`

---

## ✅ Validation Finale

- [ ] Tous les tests passent (✅)
- [ ] Aucun régression détectée
- [ ] Documentation à jour
- [ ] Code review effectué
- [ ] Prêt pour déploiement

**Validé par** : _[Nom du validateur]_  
**Date de validation** : _[Date]_

