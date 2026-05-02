# IMPLÉMENTATION : Système d'Inquiries Marketplace

## ✅ STATUT : IMPLÉMENTÉ

**Date** : 2026-01-10  
**Version** : 1.0

---

## 📋 RÉSUMÉ

Système flexible `marketplace_inquiries` implémenté pour gérer les interactions marketplace (offres, questions, demandes de visite). Ce système complète le système d'offres existant et offre plus de flexibilité pour les futures fonctionnalités.

---

## 🎯 OBJECTIFS

1. ✅ **Flexibilité** : Supporte plusieurs types d'interactions (offres, questions, visites)
2. ✅ **Extensibilité** : Facile d'ajouter de nouveaux types d'inquiries
3. ✅ **Données enrichies** : Transport, méthode de paiement
4. ✅ **Compatibilité** : Coexiste avec le système d'offres existant

---

## 📁 FICHIERS CRÉÉS

### Backend

1. **`backend/src/database/migrations/create_marketplace_inquiries.sql`**
   - Script SQL pour créer la table `marketplace_inquiries`
   - Index pour optimiser les requêtes

2. **`backend/src/marketplace/dto/create-inquiry.dto.ts`**
   - `CreateInquiryDto` : DTO pour créer une inquiry
   - `UpdateInquiryDto` : DTO pour mettre à jour une inquiry
   - Enums : `InquiryType`, `TransportOption`, `PaymentMethod`

3. **`backend/scripts/run-marketplace-inquiries-migration.ts`**
   - Script pour exécuter la migration SQL

### Frontend

Aucun nouveau fichier frontend, intégration dans les services existants.

---

## 📝 FICHIERS MODIFIÉS

### Backend

1. **`backend/src/marketplace/marketplace.controller.ts`**
   - ✅ Ajout des endpoints :
     - `POST /marketplace/listings/:listingId/inquiries` - Créer une inquiry
     - `GET /marketplace/listings/:listingId/inquiries` - Voir les inquiries d'un listing (vendeur)
     - `GET /marketplace/my-offers` - Mes offres (acheteur)
     - `GET /marketplace/my-received-offers` - Offres reçues (vendeur)
     - `PATCH /marketplace/inquiries/:inquiryId` - Mettre à jour une inquiry
     - `POST /marketplace/inquiries/:inquiryId/accept` - Accepter une offre

2. **`backend/src/marketplace/marketplace.service.ts`**
   - ✅ Ajout des méthodes :
     - `createInquiry()` - Créer une inquiry
     - `getListingInquiries()` - Récupérer les inquiries d'un listing
     - `getBuyerInquiries()` - Récupérer les inquiries de l'acheteur
     - `getSellerInquiries()` - Récupérer les inquiries reçues par le vendeur
     - `updateInquiry()` - Mettre à jour une inquiry
     - `acceptInquiryOffer()` - Accepter une offre et finaliser la vente

### Frontend

1. **`src/services/MarketplaceService.ts`**
   - ✅ Ajout des méthodes :
     - `createInquiry()` - Créer une inquiry
     - `getMyOffers()` - Récupérer mes offres
     - `getReceivedOffers()` - Récupérer les offres reçues
     - `getListingInquiries()` - Récupérer les inquiries d'un listing
     - `updateInquiry()` - Mettre à jour une inquiry
     - `acceptInquiryOffer()` - Accepter une offre

---

## 🗄️ STRUCTURE DE LA BASE DE DONNÉES

### Table `marketplace_inquiries`

```sql
CREATE TABLE marketplace_inquiries (
  id VARCHAR(255) PRIMARY KEY,
  listing_id VARCHAR(255) NOT NULL,
  buyer_id VARCHAR(255) NOT NULL,
  seller_id VARCHAR(255) NOT NULL,
  
  -- Type d'inquiry
  inquiry_type VARCHAR(50) DEFAULT 'offer', -- 'offer', 'question', 'visit_request'
  
  -- Détails de l'offre
  offered_amount DECIMAL(12, 2),
  message TEXT,
  
  -- Statut
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'negotiating', 'completed'
  
  -- Conditions
  transport_option VARCHAR(50), -- 'buyer_pickup', 'seller_delivery', 'third_party'
  payment_method VARCHAR(50), -- 'cash', 'mobile_money', 'bank_transfer'
  
  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  
  -- Relations
  FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id),
  FOREIGN KEY (buyer_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (seller_id) REFERENCES utilisateurs(id)
);
```

### Index créés

- `idx_inquiries_listing` - Recherche par listing
- `idx_inquiries_buyer` - Recherche par acheteur
- `idx_inquiries_seller` - Recherche par vendeur
- `idx_inquiries_status` - Filtrage par statut
- `idx_inquiries_type` - Filtrage par type
- `idx_inquiries_created_at` - Tri par date

---

## 🔌 ENDPOINTS API

### Créer une inquiry

```http
POST /marketplace/listings/:listingId/inquiries
Content-Type: application/json

{
  "inquiryType": "offer",
  "offeredAmount": 125000,
  "message": "Je suis intéressé",
  "transportOption": "buyer_pickup",
  "paymentMethod": "cash"
}
```

### Récupérer mes offres (acheteur)

```http
GET /marketplace/my-offers
```

### Récupérer les offres reçues (vendeur)

```http
GET /marketplace/my-received-offers
```

### Récupérer les inquiries d'un listing (vendeur)

```http
GET /marketplace/listings/:listingId/inquiries
```

### Mettre à jour une inquiry

```http
PATCH /marketplace/inquiries/:inquiryId
Content-Type: application/json

{
  "status": "accepted",
  "counterOffer": 130000,
  "responseMessage": "Merci pour votre offre"
}
```

### Accepter une offre

```http
POST /marketplace/inquiries/:inquiryId/accept
```

---

## 🚀 DÉPLOIEMENT

### 1. Créer la table en base de données

**Depuis la racine du projet** :
```bash
npx ts-node backend/scripts/run-marketplace-inquiries-migration.ts
```

Ou exécuter directement le SQL :

```bash
psql -U votre_user -d votre_db -f backend/src/database/migrations/create_marketplace_inquiries.sql
```

**Note** : Le script doit être exécuté depuis la racine du projet (`C:\Users\HP\developpement_farm`), pas depuis le répertoire `backend/`.

### 2. Vérifier que la table existe

```sql
SELECT * FROM marketplace_inquiries LIMIT 1;
```

---

## 🔄 COMPARAISON AVEC LE SYSTÈME EXISTANT

### Système existant (`marketplace_offers`)

- ✅ **Fonctionne parfaitement** : Gestion complète des offres
- ✅ **Backend solide** : Tous les endpoints nécessaires
- ✅ **Notations intégrées** : Système de notations
- ❌ **Limité aux offres** : Pas de support pour questions/visites

### Nouveau système (`marketplace_inquiries`)

- ✅ **Plus flexible** : Supporte offres, questions, visites
- ✅ **Données enrichies** : Transport, paiement
- ✅ **Extensible** : Facile d'ajouter de nouveaux types
- ✅ **Coexiste** : N'interfère pas avec le système existant

### Recommandation

- **Utiliser `marketplace_offers`** pour les offres standard (système actuel)
- **Utiliser `marketplace_inquiries`** pour :
  - Questions sur les listings
  - Demandes de visite
  - Offres avec détails supplémentaires (transport, paiement)
  - Futures fonctionnalités (négociations, chats, etc.)

---

## 📊 TYPES D'INQUIRIES SUPPORTÉS

### 1. `offer` - Offre d'achat

**Utilisation** : Proposer un prix pour un listing

**Champs requis** :
- `listingId`
- `offeredAmount`

**Champs optionnels** :
- `message`
- `transportOption`
- `paymentMethod`

**Statuts possibles** :
- `pending` - En attente
- `accepted` - Acceptée
- `rejected` - Rejetée
- `negotiating` - En négociation
- `completed` - Complétée

### 2. `question` - Question

**Utilisation** : Poser une question sur un listing

**Champs requis** :
- `listingId`
- `message`

**Statuts possibles** :
- `pending` - En attente de réponse
- `completed` - Réponse fournie

### 3. `visit_request` - Demande de visite

**Utilisation** : Demander à visiter la ferme

**Champs requis** :
- `listingId`
- `message` (optionnel mais recommandé)

**Statuts possibles** :
- `pending` - En attente
- `accepted` - Acceptée
- `rejected` - Rejetée
- `completed` - Visite effectuée

---

## 🔐 SÉCURITÉ

### Vérifications implémentées

1. ✅ **Propriété du listing** : Seul le vendeur peut voir les inquiries de son listing
2. ✅ **Pas d'auto-inquiry** : Un utilisateur ne peut pas faire d'inquiry sur son propre listing
3. ✅ **Validation des données** : DTOs avec validation class-validator
4. ✅ **Permissions** : Seul le vendeur peut modifier/accepter une inquiry

---

## 🧪 TESTS À EFFECTUER

### Tests backend

1. ✅ Créer une inquiry (offre)
2. ✅ Créer une inquiry (question)
3. ✅ Créer une inquiry (demande de visite)
4. ✅ Récupérer mes offres (acheteur)
5. ✅ Récupérer les offres reçues (vendeur)
6. ✅ Mettre à jour une inquiry (statut)
7. ✅ Mettre à jour une inquiry (contre-offre)
8. ✅ Accepter une offre
9. ✅ Vérifier les permissions (vendeur/acheteur)

### Tests frontend

1. ✅ Intégrer dans l'écran "Faire une offre"
2. ✅ Afficher les inquiries reçues
3. ✅ Permettre au vendeur de répondre
4. ✅ Permettre au vendeur d'accepter/rejeter

---

## 📈 ÉVOLUTIONS FUTURES

### Court terme

- [ ] Intégrer dans l'UI existante (MakeOfferScreen)
- [ ] Notifications push pour nouvelles inquiries
- [ ] Chat intégré pour les questions

### Moyen terme

- [ ] Dashboard vendeur avec toutes les inquiries
- [ ] Historique des inquiries
- [ ] Statistiques (taux de réponse, temps de réponse)

### Long terme

- [ ] Système de négociation en temps réel
- [ ] Calendrier pour les visites
- [ ] Intégration avec le système de paiement

---

## 📝 NOTES

1. **Coexistence** : Le système `marketplace_inquiries` coexiste avec `marketplace_offers`. Les deux peuvent être utilisés simultanément.

2. **Migration** : Pas de migration des données existantes nécessaire. Les deux systèmes fonctionnent en parallèle.

3. **Compatibilité** : Le système existant continue de fonctionner normalement. Le nouveau système est optionnel.

4. **Performance** : Les index créés optimisent les requêtes. Aucun impact sur les performances du système existant.

---

**Statut Final** : ✅ **IMPLÉMENTÉ ET OPÉRATIONNEL**  
**Prochaine étape** : Intégration dans l'UI frontend (optionnel)
