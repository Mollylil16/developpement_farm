# 🔍 Analyse Approfondie du Module Marketplace

## 📋 Vue d'ensemble du Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              FLOW MARKETPLACE COMPLET                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  PRODUCTEUR                           ACHETEUR                                       │
│  ═══════════                          ════════                                       │
│                                                                                      │
│  1. Créer listing ─────────────────────► Voir listings                              │
│     (individual/batch)                    │                                          │
│                                           │                                          │
│                                           ▼                                          │
│                                      2. Créer offre ────────────► Notif producteur  │
│                                           │                                          │
│  3. Recevoir offre ◄─────────────────────┘                                          │
│     │                                                                                │
│     ├─► ACCEPTER ──────► Transaction créée ──► Notif acheteur                       │
│     │                                                                                │
│     ├─► REFUSER ───────► Offre rejetée ──────► Notif acheteur                       │
│     │                                                                                │
│     └─► CONTRE-PROPOSITION ──────────────────► Notif acheteur                       │
│                                                   │                                  │
│                                                   ▼                                  │
│                                              4. Recevoir contre-prop                │
│                                                   │                                  │
│  5. Recevoir réponse ◄───────────────────────────┼─► ACCEPTER ──► Transaction       │
│                                                   │                                  │
│                                                   └─► REFUSER ❌ (NON IMPL)          │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🐛 Problèmes Identifiés et Corrections

### 1. ✅ CORRIGÉ - L'acheteur ne pouvait PAS rejeter une contre-proposition

**Fichier:** `backend/src/marketplace/marketplace.service.ts` - `rejectOffer()`

**Problème:** La méthode `rejectOffer` vérifiait uniquement si l'utilisateur était le producteur.

**Solution appliquée:** 
- Ajout du paramètre `role: 'producer' | 'buyer'`
- Producteur peut rejeter une offre 'pending'
- Acheteur peut rejeter une contre-proposition 'countered'
- Notifications envoyées à l'autre partie

---

### 2. ⚠️ NON CORRIGÉ - L'acheteur ne peut PAS faire de contre-contre-proposition

**Fichier:** `backend/src/marketplace/marketplace.service.ts` - `counterOffer()`

**Problème:** La méthode vérifie uniquement si l'utilisateur est le producteur.

**Impact:** Après une contre-proposition du producteur, l'acheteur ne peut pas négocier davantage.

**Statut:** À implémenter si besoin métier confirmé.

---

### 3. ✅ CORRIGÉ - Rejet automatique des autres offres

**Solution appliquée:** 
- Quand une offre est acceptée (vente totale), les autres offres 'pending' ou 'countered' sur le même listing sont automatiquement rejetées
- Notifications envoyées aux acheteurs concernés

---

### 4. ✅ CORRIGÉ - Notification au producteur pour nouvelle offre

**Solution appliquée:**
- Dans `createOffer()`, une notification est maintenant envoyée au producteur avec le montant et le nombre de sujets

---

### 5. ✅ CORRIGÉ - Vente partielle avec mise à jour du listing

**Statut:** CORRIGÉ (commit précédent)
- Les sujets vendus sont retirés du listing
- Le prix et le poids sont recalculés
- Le listing reste disponible pour les sujets restants

---

### 6. ⚠️ FAIBLE - Manque de validation sur les dates d'expiration

**Problème:** Les offres expirées ne sont pas automatiquement traitées.

**À faire:** Implémenter un job CRON pour marquer les offres expirées.

---

## 📊 Matrice des Actions par Rôle

| Action | Producteur | Acheteur | Status |
|--------|------------|----------|--------|
| Créer listing | ✅ | ❌ | OK |
| Voir listings | ✅ | ✅ | OK |
| Créer offre | ❌ | ✅ | OK |
| Accepter offre | ✅ | ✅* | ✅ OK (*contre-prop) |
| Rejeter offre | ✅ | ✅* | ✅ CORRIGÉ (*contre-prop) |
| Contre-proposition | ✅ | ❌ | ⚠️ À confirmer |
| Retirer offre | ❌ | ✅ | OK |
| Voir transactions | ✅ | ✅ | OK |
| Confirmer livraison | ✅ | ✅ | OK |
| Recevoir notification nouvelle offre | ✅ | ❌ | ✅ CORRIGÉ |
| Recevoir notification rejet | ✅* | ✅ | ✅ CORRIGÉ (*contre-prop) |

## 🗄️ Alignement Base de Données

### Table `marketplace_offers`

| Colonne | Type | Usage | Aligné |
|---------|------|-------|--------|
| id | TEXT | PK | ✅ |
| listing_id | TEXT | FK → listings | ✅ |
| subject_ids | TEXT[] | IDs sélectionnés | ✅ |
| buyer_id | TEXT | FK → users | ✅ |
| producer_id | TEXT | FK → users | ✅ |
| proposed_price | NUMERIC | Prix proposé | ✅ |
| original_price | NUMERIC | Prix original | ✅ |
| message | TEXT | Message optionnel | ✅ |
| status | ENUM | pending/accepted/rejected/countered/expired/withdrawn | ✅ |
| counter_offer_of | TEXT | FK → offers (auto-ref) | ✅ |
| prix_total_final | NUMERIC | Prix final négocié | ✅ |
| date_recuperation_souhaitee | DATE | Date souhaitée | ✅ |

### Enum `offer_status`

```sql
'pending'    -- En attente de réponse
'accepted'   -- Acceptée
'rejected'   -- Refusée
'countered'  -- Contre-proposition faite
'expired'    -- Expirée
'withdrawn'  -- Retirée par l'acheteur
```

## 🔧 Corrections Nécessaires

### Correction 1: Permettre à l'acheteur de rejeter une contre-proposition

```typescript
// backend/src/marketplace/marketplace.service.ts
async rejectOffer(offerId: string, userId: string, role: 'producer' | 'buyer' = 'producer') {
  const offer = await this.databaseService.query(
    'SELECT * FROM marketplace_offers WHERE id = $1',
    [offerId]
  );

  if (offer.rows.length === 0) {
    throw new NotFoundException('Offre introuvable');
  }

  const offerData = offer.rows[0];

  // Producteur peut rejeter une offre pending
  if (role === 'producer') {
    if (offerData.producer_id !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à rejeter cette offre");
    }
    if (offerData.status !== 'pending') {
      throw new BadRequestException('Cette offre ne peut plus être rejetée');
    }
  } 
  // Acheteur peut rejeter une contre-proposition
  else if (role === 'buyer') {
    if (offerData.buyer_id !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à rejeter cette offre");
    }
    if (offerData.status !== 'countered') {
      throw new BadRequestException('Vous ne pouvez rejeter que les contre-propositions');
    }
  }

  await this.databaseService.query(
    'UPDATE marketplace_offers SET status = $1, responded_at = $2, derniere_modification = $2 WHERE id = $3',
    ['rejected', new Date().toISOString(), offerId]
  );

  // Notifier l'autre partie
  const notifyUserId = role === 'producer' ? offerData.buyer_id : offerData.producer_id;
  await this.notificationsService.createNotification({...});

  return { id: offerId };
}
```

### Correction 2: Permettre à l'acheteur de faire une contre-contre-proposition

```typescript
// Modifier counterOffer pour accepter un paramètre role
async counterOffer(
  offerId: string,
  userId: string,
  counterOfferDto: { nouveau_prix_total: number; message?: string },
  role: 'producer' | 'buyer' = 'producer'
) {
  // ... validation selon le rôle
}
```

### Correction 3: Rejeter automatiquement les autres offres

```typescript
// Dans acceptOffer, après création de la transaction:
// Rejeter toutes les autres offres pending sur ce listing
await client.query(
  `UPDATE marketplace_offers 
   SET status = 'rejected', responded_at = NOW(), derniere_modification = NOW()
   WHERE listing_id = $1 AND id != $2 AND status = 'pending'`,
  [offerData.listing_id, offerId]
);
```

### Correction 4: Notification au producteur pour nouvelle offre

```typescript
// Dans createOffer:
await this.notificationsService.notifyNewOffer(
  listing.producerId,
  offer.id,
  listing.title || listing.code
);
```

## ✅ Tests à Ajouter

Voir fichier: `backend/src/marketplace/__tests__/marketplace-flow.spec.ts`

