# Phase 3.5 : Tests de Validation - Système d'Achat Marketplace

## 📋 Objectif

Valider le fonctionnement complet du système d'achat unifié avec :
- ✅ Contre-propositions illimitées
- ✅ Date de récupération souhaitée
- ✅ Automatisation post-vente
- ✅ Parité entre mode individuel et mode batch

---

## 🔬 Tests à Effectuer

### **TEST 1 : Création d'Offre avec Date de Récupération**

**Contexte** : Acheteur crée une offre pour un sujet

**Étapes** :
1. Connecter avec un profil **Acheteur**
2. Aller dans **Marketplace > Acheter**
3. Cliquer sur une **FarmCard** ou un **Listing**
4. Sélectionner un ou plusieurs sujets
5. Cliquer sur **"Faire une offre"**
6. Remplir le formulaire :
   - Prix total proposé : `100 000 FCFA`
   - **Date de récupération souhaitée** : Sélectionner une date (ex: 7 jours)
   - Message optionnel : `"Je souhaite récupérer les sujets le [date]"`
   - Accepter les conditions
7. Cliquer sur **"Envoyer l'offre"**

**Résultats attendus** :
- ✅ L'offre est créée avec succès
- ✅ Le producteur reçoit une notification "Nouvelle offre reçue"
- ✅ L'offre contient la date de récupération souhaitée
- ✅ L'offre apparaît dans les notifications du producteur

**Validation Backend** :
```sql
SELECT id, date_recuperation_souhaitee, proposed_price 
FROM marketplace_offers 
WHERE buyer_id = '[acheteur_id]' 
ORDER BY created_at DESC 
LIMIT 1;
```
- Vérifier que `date_recuperation_souhaitee` contient la date sélectionnée

---

### **TEST 2 : Producteur Accepte l'Offre Initiale**

**Contexte** : Producteur accepte directement l'offre de l'acheteur

**Étapes** :
1. Connecter avec un profil **Producteur**
2. Aller dans **Marketplace > Offres > Reçues**
3. Cliquer sur l'offre en attente
4. Cliquer sur **"Accepter l'offre"**

**Résultats attendus** :
- ✅ Une transaction est créée avec statut `confirmed`
- ✅ L'acheteur reçoit une notification "Offre acceptée"
- ✅ Le listing passe en statut `reserved`
- ✅ L'offre passe en statut `accepted` avec `prix_total_final` défini

**Validation Backend** :
```sql
-- Vérifier la transaction
SELECT id, status, final_price, offer_id 
FROM marketplace_transactions 
WHERE offer_id = '[offer_id]';

-- Vérifier l'offre
SELECT id, status, prix_total_final 
FROM marketplace_offers 
WHERE id = '[offer_id]';
```
- Vérifier que `prix_total_final` = `proposed_price` (offre initiale acceptée)

---

### **TEST 3 : Producteur Fait une Contre-Proposition**

**Contexte** : Producteur refuse le prix initial et propose un nouveau prix

**Étapes** :
1. Connecter avec un profil **Producteur**
2. Aller dans **Marketplace > Offres > Reçues**
3. Cliquer sur l'offre en attente
4. Cliquer sur **"Contre-proposer"**
5. Remplir :
   - Nouveau prix total : `110 000 FCFA`
   - Message : `"Je peux vous proposer ce prix"`
6. Cliquer sur **"Envoyer la contre-proposition"**

**Résultats attendus** :
- ✅ Une nouvelle offre est créée avec statut `countered`
- ✅ L'offre originale passe en statut `countered`
- ✅ La nouvelle offre est liée à l'originale via `counter_offer_of`
- ✅ L'acheteur reçoit une notification "Contre-proposition reçue"
- ✅ L'acheteur voit la contre-proposition dans ses offres envoyées

**Validation Backend** :
```sql
-- Vérifier la contre-proposition
SELECT id, status, proposed_price, counter_offer_of 
FROM marketplace_offers 
WHERE counter_offer_of = '[original_offer_id]';

-- Vérifier l'offre originale
SELECT id, status 
FROM marketplace_offers 
WHERE id = '[original_offer_id]';
```

---

### **TEST 4 : Acheteur Accepte la Contre-Proposition**

**Contexte** : Acheteur accepte la contre-proposition du producteur

**Étapes** :
1. Connecter avec un profil **Acheteur**
2. Aller dans **Marketplace > Offres > Envoyées**
3. Cliquer sur l'offre avec statut **"Contre-offre"**
4. Vérifier que le prix de la contre-proposition est affiché
5. Cliquer sur **"Accepter la contre-proposition"**

**Résultats attendus** :
- ✅ Une transaction est créée avec statut `confirmed`
- ✅ Le prix final utilisé est celui de la contre-proposition (`110 000 FCFA`)
- ✅ Le producteur reçoit une notification "Contre-proposition acceptée"
- ✅ Le listing passe en statut `reserved`
- ✅ L'offre contre-proposée passe en statut `accepted` avec `prix_total_final`

**Validation Backend** :
```sql
-- Vérifier la transaction
SELECT id, status, final_price 
FROM marketplace_transactions 
WHERE offer_id = '[counter_offer_id]';

-- Vérifier l'offre
SELECT id, status, prix_total_final, proposed_price 
FROM marketplace_offers 
WHERE id = '[counter_offer_id]';
```
- Vérifier que `prix_total_final` = `110 000` (prix de la contre-proposition)

---

### **TEST 5 : Acheteur Refuse la Contre-Proposition**

**Contexte** : Acheteur refuse la contre-proposition

**Étapes** :
1. Connecter avec un profil **Acheteur**
2. Aller dans **Marketplace > Offres > Envoyées**
3. Cliquer sur l'offre avec statut **"Contre-offre"**
4. Cliquer sur **"Refuser la contre-proposition"**

**Résultats attendus** :
- ✅ L'offre contre-proposée passe en statut `rejected`
- ✅ Le producteur reçoit une notification "Offre refusée"
- ✅ La transaction n'est pas créée
- ✅ Les sujets restent disponibles sur le marketplace

---

### **TEST 6 : Cycle Complet - Plusieurs Contre-Propositions**

**Contexte** : Négociation avec plusieurs allers-retours

**Étapes** :
1. Acheteur fait une offre : `100 000 FCFA`
2. Producteur contre-propose : `110 000 FCFA`
3. Acheteur refuse et fait une nouvelle offre : `105 000 FCFA`
4. Producteur contre-propose : `107 500 FCFA`
5. Acheteur accepte

**Résultats attendus** :
- ✅ Chaque contre-proposition crée une nouvelle offre liée
- ✅ Le système supporte un nombre illimité de contre-propositions
- ✅ La transaction finale utilise le prix de la dernière contre-proposition acceptée (`107 500 FCFA`)

**Validation Backend** :
```sql
-- Vérifier la chaîne de contre-propositions
WITH RECURSIVE offer_chain AS (
  SELECT id, proposed_price, status, counter_offer_of
  FROM marketplace_offers
  WHERE id = '[final_offer_id]'
  
  UNION ALL
  
  SELECT o.id, o.proposed_price, o.status, o.counter_offer_of
  FROM marketplace_offers o
  INNER JOIN offer_chain oc ON o.id = oc.counter_offer_of
)
SELECT * FROM offer_chain;
```

---

### **TEST 7 : Confirmation de Livraison - Automatisation Post-Vente**

**Contexte** : Les deux parties confirment la livraison

**Étapes** :
1. Transaction créée (offre acceptée)
2. Producteur confirme la livraison
3. Acheteur confirme la livraison

**Résultats attendus** :
- ✅ Après la **double confirmation**, le système automatise :
  - ✅ Création d'une entrée dans `ventes`
  - ✅ Création d'entrées dans `ventes_animaux` pour chaque sujet
  - ✅ Mise à jour des animaux : `statut = 'vendu'`, `actif = false`
  - ✅ Pour mode batch : Création d'un mouvement dans `batch_pig_movements` puis suppression du `batch_pig`
  - ✅ Décrément du cheptel : `projets.nombre_animaux_total -= nombre_sujets`
  - ✅ Décrément des compteurs de bande (si mode batch) : `bandes.nombre_animaux_actifs -= nombre_sujets`
  - ✅ Création d'un revenu dans `revenus` avec :
    - Montant total
    - Poids total (nombre entier)
    - Nombre d'animaux
    - Nom de l'acheteur
    - Lien vers `vente_id`
  - ✅ Mise à jour du listing : `status = 'sold'` si tous les animaux vendus
  - ✅ Mise à jour de la transaction : `vente_id` et `revenu_id` renseignés
  - ✅ Notifications envoyées aux deux parties

**Validation Backend** :
```sql
-- Vérifier la vente
SELECT vente_id, prix_total, nombre_sujets, poids_total, statut 
FROM ventes 
WHERE offer_id = '[offer_id]';

-- Vérifier les animaux vendus
SELECT animal_id, poids_vente, prix_unitaire 
FROM ventes_animaux 
WHERE vente_id = '[vente_id]';

-- Vérifier le revenu
SELECT id, montant, poids_total, nombre_animaux, acheteur 
FROM revenus 
WHERE vente_id = '[vente_id]';

-- Vérifier les animaux mis à jour (mode individuel)
SELECT id, statut, actif 
FROM production_animaux 
WHERE id IN (SELECT animal_id FROM ventes_animaux WHERE vente_id = '[vente_id]');

-- Vérifier le mouvement batch (mode batch)
SELECT id, movement_type, removal_reason, sale_price 
FROM batch_pig_movements 
WHERE sale_price IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;

-- Vérifier le cheptel
SELECT id, nombre_animaux_total 
FROM projets 
WHERE id = '[projet_id]';
```

---

### **TEST 8 : Mode Individuel vs Mode Batch - Parité**

**Contexte** : Vérifier que les deux modes fonctionnent de manière identique

**Étapes** :
1. **Test avec mode individuel** :
   - Créer un listing individuel
   - Faire une offre
   - Accepter
   - Confirmer livraison
   - Vérifier l'automatisation

2. **Test avec mode batch** :
   - Créer un listing batch (plusieurs sujets)
   - Faire une offre pour plusieurs sujets
   - Accepter
   - Confirmer livraison
   - Vérifier l'automatisation

**Résultats attendus** :
- ✅ Les deux modes suivent le même flux
- ✅ L'automatisation fonctionne pour les deux modes
- ✅ Les poids sont des nombres entiers (pas de décimales)
- ✅ Les IDs utilisés sont les vrais IDs des animaux (pas d'IDs virtuels)

**Validation** :
```sql
-- Vérifier que tous les animaux ont des IDs réels
SELECT DISTINCT 
  CASE 
    WHEN animal_type = 'production_animaux' THEN 
      (SELECT code FROM production_animaux WHERE id = va.animal_id)
    WHEN animal_type = 'batch_pigs' THEN 
      (SELECT name FROM batch_pigs WHERE id = va.animal_id)
  END as animal_code
FROM ventes_animaux va
WHERE vente_id = '[vente_id]';

-- Vérifier que les poids sont entiers
SELECT animal_id, poids_vente 
FROM ventes_animaux 
WHERE vente_id = '[vente_id]' 
AND poids_vente != ROUND(poids_vente);
-- Cette requête doit retourner 0 lignes
```

---

### **TEST 9 : Vente Partielle (Plusieurs Sujets, Certains Vendus)**

**Contexte** : Offre pour plusieurs sujets, mais pas tous

**Étapes** :
1. Producteur met en vente 5 sujets dans un listing batch
2. Acheteur sélectionne 3 sujets et fait une offre
3. Producteur accepte
4. Confirmer livraison

**Résultats attendus** :
- ✅ Seulement les 3 sujets sélectionnés sont vendus
- ✅ Le listing reste disponible avec les 2 sujets restants
- ✅ Seulement les 3 sujets sont marqués "vendu"
- ✅ Le compteur de la bande est décrémenté de 3 (pas 5)
- ✅ Le revenu contient `nombre_animaux = 3`

**Validation Backend** :
```sql
-- Vérifier que le listing reste disponible
SELECT status, pig_ids 
FROM marketplace_listings 
WHERE id = '[listing_id]';
-- Le listing doit avoir encore 2 pigIds dans la liste

-- Vérifier le nombre d'animaux vendus
SELECT COUNT(*) as animaux_vendus 
FROM ventes_animaux 
WHERE vente_id = '[vente_id]';
-- Doit retourner 3

-- Vérifier le revenu
SELECT nombre_animaux 
FROM revenus 
WHERE vente_id = '[vente_id]';
-- Doit retourner 3
```

---

### **TEST 10 : Affichage Frontend - Offres et Contre-Propositions**

**Contexte** : Vérifier l'affichage correct dans l'interface

**Étapes** :
1. Acheteur : Voir ses offres envoyées
2. Producteur : Voir ses offres reçues
3. Vérifier les statuts et actions disponibles

**Résultats attendus** :
- ✅ Les offres `pending` affichent "En attente"
- ✅ Les offres `countered` affichent "Contre-offre" (pour l'acheteur)
- ✅ Les offres `accepted` affichent "Acceptée"
- ✅ Le producteur peut : Accepter / Refuser / Contre-proposer (pour `pending`)
- ✅ L'acheteur peut : Accepter / Refuser (pour `countered`)
- ✅ Les dates de récupération sont affichées
- ✅ Les prix sont formatés correctement (FCFA)

---

### **TEST 11 : Notifications**

**Contexte** : Vérifier que toutes les notifications sont envoyées

**Étapes** :
1. Acheteur crée une offre → Producteur doit recevoir notification
2. Producteur fait une contre-proposition → Acheteur doit recevoir notification
3. Producteur accepte → Acheteur doit recevoir notification
4. Acheteur accepte contre-proposition → Producteur doit recevoir notification
5. Double confirmation livraison → Les deux doivent recevoir notification

**Résultats attendus** :
- ✅ Toutes les notifications sont créées dans `marketplace_notifications`
- ✅ Les notifications apparaissent dans l'interface
- ✅ Les compteurs de notifications non lues sont à jour

**Validation Backend** :
```sql
SELECT type, title, message, user_id 
FROM marketplace_notifications 
WHERE related_id = '[offer_id]' OR related_id = '[transaction_id]'
ORDER BY created_at DESC;
```

---

### **TEST 12 : Finance > Revenus**

**Contexte** : Vérifier que le revenu est correctement créé et visible

**Étapes** :
1. Compléter une vente (double confirmation)
2. Aller dans **Finance > Revenus**
3. Vérifier la nouvelle entrée

**Résultats attendus** :
- ✅ Une nouvelle entrée apparaît dans la liste des revenus
- ✅ Catégorie : `vente_porc`
- ✅ Montant : Prix final négocié
- ✅ Poids total : Nombre entier (kg)
- ✅ Nombre d'animaux : Nombre de sujets vendus
- ✅ Acheteur : Nom complet de l'acheteur
- ✅ Description : Contient les codes des animaux vendus
- ✅ Date : Date de la vente
- ✅ Lien vers `vente_id` : Permet de retrouver la vente

**Validation Backend** :
```sql
SELECT 
  montant, 
  poids_total, 
  nombre_animaux, 
  acheteur, 
  description, 
  categorie,
  date
FROM revenus 
WHERE vente_id = '[vente_id]';
```

---

### **TEST 13 : Mise à Jour du Cheptel**

**Contexte** : Vérifier que le cheptel est correctement mis à jour

**Étapes** :
1. Noter le nombre d'animaux avant la vente
2. Compléter une vente
3. Vérifier le nombre d'animaux après

**Résultats attendus** :
- ✅ `projets.nombre_animaux_total` est décrémenté du nombre de sujets vendus
- ✅ Les animaux vendus ont `statut = 'vendu'` et `actif = false`
- ✅ Pour mode batch : `bandes.nombre_animaux_actifs` est décrémenté
- ✅ Les compteurs restent cohérents (pas de valeurs négatives)

**Validation Backend** :
```sql
-- Avant vente
SELECT nombre_animaux_total FROM projets WHERE id = '[projet_id]';

-- Après vente (doit être diminué de nombre_sujets)
SELECT nombre_animaux_total FROM projets WHERE id = '[projet_id]';

-- Vérifier les animaux vendus
SELECT COUNT(*) as vendus 
FROM production_animaux 
WHERE projet_id = '[projet_id]' AND statut = 'vendu';

-- Pour batch : vérifier les mouvements
SELECT COUNT(*) as retires 
FROM batch_pig_movements 
WHERE movement_type = 'removal' AND removal_reason = 'sale' 
AND pig_id IN (SELECT id FROM batch_pigs WHERE batch_id = '[batch_id]');
```

---

## 🐛 Tests de Gestion d'Erreurs

### **TEST 14 : Erreurs et Validations**

1. **Offre avec date passée** :
   - Essayer de sélectionner une date dans le passé
   - ✅ Le système doit refuser avec message d'erreur

2. **Prix invalide** :
   - Essayer de proposer un prix négatif ou nul
   - ✅ Le système doit refuser

3. **Accepter une offre déjà traitée** :
   - Essayer d'accepter une offre déjà acceptée/refusée
   - ✅ Le système doit refuser avec message approprié

4. **Contre-proposer sur une offre non-pending** :
   - Essayer de contre-proposer sur une offre déjà acceptée
   - ✅ Le système doit refuser

---

## ✅ Checklist de Validation Finale

### Backend
- [ ] Migrations SQL appliquées (067, 068, 069, 070, 071)
- [ ] Table `ventes` créée et fonctionnelle
- [ ] Table `ventes_animaux` créée et fonctionnelle
- [ ] Table `revenus` mise à jour avec nouveaux champs
- [ ] Table `marketplace_offers` mise à jour avec `date_recuperation_souhaitee`, `counter_offer_of`, `prix_total_final`
- [ ] Service `SaleAutomationService` fonctionne correctement
- [ ] Endpoint `PATCH /marketplace/offers/:id/accept?role=producer|buyer` fonctionne
- [ ] Endpoint `PUT /marketplace/offers/:id/counter` fonctionne

### Frontend
- [ ] `OfferModal` affiche le date picker
- [ ] `OfferResponseModal` permet à l'acheteur d'accepter une contre-proposition
- [ ] Les offres affichent correctement le statut `countered`
- [ ] Les notifications s'affichent correctement
- [ ] Le revenu apparaît dans Finance > Revenus

### Intégration
- [ ] Cycle complet offre → contre-proposition → acceptation fonctionne
- [ ] Automatisation post-vente se déclenche après double confirmation
- [ ] Mode individuel et mode batch fonctionnent de manière identique
- [ ] Les poids sont toujours des nombres entiers
- [ ] Les IDs utilisés sont les vrais IDs (pas d'IDs virtuels)

---

## 📝 Notes

- **Transaction SQL** : Toute l'automatisation post-vente est dans une transaction SQL (commit ou rollback complet)
- **Poids** : Toujours arrondi à l'entier le plus proche avec `Math.round()`
- **IDs** : Toujours utiliser les vrais `animal_id` ou `pigId`, jamais d'IDs virtuels
- **Contre-propositions** : Illimitées, chaque contre-proposition crée une nouvelle offre liée à l'originale
- **Date de récupération** : Héritée de l'offre initiale lors des contre-propositions

---

## 🚀 Prochaines Étapes Après Validation

Si tous les tests passent :
1. ✅ Déployer les migrations en production
2. ✅ Déployer le backend avec les nouveaux services
3. ✅ Déployer le frontend avec les nouveaux composants
4. ✅ Former les utilisateurs sur le nouveau système
5. ✅ Monitorer les premières ventes pour détecter d'éventuels bugs

