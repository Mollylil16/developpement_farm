# Analyse du Processus d'Achat Marketplace

## 1. État Actuel du Système de Notifications

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND                                      │
├─────────────────────────────────────────────────────────────────┤
│  useMarketplaceNotifications()                                   │
│  ├── GET /marketplace/notifications                              │
│  ├── Polling toutes les 60 secondes                              │
│  └── ⚠️ CONDITION: currentUserId && projetActifId requis         │
├─────────────────────────────────────────────────────────────────┤
│  DashboardHeader                                                 │
│  └── Cloche avec badge (notificationCount)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND                                       │
├─────────────────────────────────────────────────────────────────┤
│  marketplace/notifications.service.ts                            │
│  ├── createNotification()                                        │
│  ├── notifyOfferAccepted()    → Message simple                   │
│  ├── notifyOfferRejected()    → Message simple                   │
│  ├── notifyOfferCountered()   → Message simple                   │
│  └── notifyOfferReceived()    → Message simple                   │
├─────────────────────────────────────────────────────────────────┤
│  Table: marketplace_notifications                                │
│  ├── id, user_id, type, title, message                           │
│  ├── related_type, related_id, action_url                        │
│  └── read, read_at, created_at                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Problème #1 : Notifications non visibles sur Dashboard (certains profils)

**Cause identifiée :**
```typescript
// src/hooks/useMarketplaceNotifications.ts (ligne 48)
if (!effectiveEnabled || !currentUserId || !projetActifId) {
  // ❌ Si projetActifId est null, les notifications ne sont PAS chargées
  setLoading(false);
  return;
}
```

**Impact :**
- Les **acheteurs purs** (sans projet de production) n'ont pas de `projetActif`
- Les **vétérinaires/techniciens** collaborateurs n'ont pas de `projetActif` propre
- → Ces utilisateurs ne voient JAMAIS les notifications dans la cloche

---

## 2. Processus Actuel après Acceptation d'une Offre

### Flow actuel (`acceptOffer`)
```
Acceptation de l'offre
        │
        ▼
┌─────────────────────────────────────┐
│  1. Mise à jour offre               │
│     status = 'accepted'             │
│     prix_total_final = proposed_price│
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  2. Mise à jour listing             │
│     - Partiel: maj pig_ids, garder  │
│       status = 'available'          │
│     - Total: status = 'reserved'    │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  3. Création transaction            │
│     marketplace_transactions        │
│     status = 'confirmed'            │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  4. Notification (BASIQUE)          │
│     "Votre offre a été acceptée"    │
│     ❌ Pas de détails de contact    │
│     ❌ Pas de localisation          │
│     ❌ Pas de date récupération     │
└─────────────────────────────────────┘
        │
        ▼
     ⛔ FIN
```

### Ce qui MANQUE après l'acceptation

| Information | Pour l'Acheteur | Pour le Producteur |
|-------------|-----------------|-------------------|
| Contact téléphone | ❌ Absent | ❌ Absent |
| Contact email | ❌ Absent | ❌ Absent |
| Nom complet | ❌ Absent | ❌ Absent |
| Localisation ferme | ❌ Absent | N/A |
| Lien Google Maps | ❌ Absent | N/A |
| Date récupération | ❌ Absent | ❌ Absent |
| Prix final | ✅ Dans notification | ✅ Dans notification |
| Sujets concernés | Partiel | Partiel |

---

## 3. Données Disponibles dans la Base

### Table `users`
```sql
-- Champs de contact
nom VARCHAR
prenom VARCHAR
email VARCHAR
telephone VARCHAR  -- ⚠️ À vérifier si présent
```

### Table `projets` (fermes)
```sql
nom VARCHAR
localisation TEXT  -- Adresse textuelle
-- ⚠️ Pas de latitude/longitude
```

### Table `marketplace_listings`
```sql
location_latitude NUMERIC
location_longitude NUMERIC
location_address TEXT
location_city TEXT
location_region TEXT
producer_id VARCHAR
farm_id VARCHAR
```

### Table `marketplace_offers`
```sql
date_recuperation_souhaitee DATE  -- ✅ Disponible
buyer_id VARCHAR
producer_id VARCHAR
subject_ids JSONB
proposed_price NUMERIC
```

### Table `marketplace_transactions`
```sql
buyer_id VARCHAR
producer_id VARCHAR
final_price NUMERIC
status VARCHAR  -- 'confirmed', 'completed', 'cancelled'
```

---

## 4. Flow Attendu après Acceptation

### Pour l'ACHETEUR
```
┌──────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION ENRICHIE - OFFRE ACCEPTÉE                              │
├──────────────────────────────────────────────────────────────────────┤
│  Titre: "🎉 Offre acceptée !"                                        │
│  Message: "Votre offre pour 3 sujet(s) a été acceptée"               │
│                                                                      │
│  📍 LOCALISATION DE LA FERME                                         │
│  Ferme: [Nom du projet]                                              │
│  Adresse: [location_address], [location_city]                        │
│  [Bouton: Ouvrir dans Google Maps]                                   │
│                                                                      │
│  📞 CONTACT DU PRODUCTEUR                                            │
│  Nom: [Prénom] [Nom]                                                 │
│  Téléphone: [telephone]                                              │
│  Email: [email]                                                      │
│                                                                      │
│  💰 DÉTAILS DE LA TRANSACTION                                        │
│  Prix final: [final_price] FCFA                                      │
│  Sujets: [nombre] sujet(s)                                           │
│  Date récupération: [date_recuperation_souhaitee]                    │
└──────────────────────────────────────────────────────────────────────┘
```

### Pour le PRODUCTEUR
```
┌──────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION ENRICHIE - VENTE CONFIRMÉE                             │
├──────────────────────────────────────────────────────────────────────┤
│  Titre: "💰 Vente confirmée !"                                        │
│  Message: "Votre vente de 3 sujet(s) est confirmée"                  │
│                                                                      │
│  👤 INFORMATIONS DE L'ACHETEUR                                       │
│  Nom: [Prénom] [Nom]                                                 │
│  Téléphone: [telephone]                                              │
│  Email: [email]                                                      │
│                                                                      │
│  💰 DÉTAILS DE LA TRANSACTION                                        │
│  Prix final: [final_price] FCFA                                      │
│  Sujets vendus: [nombre]                                             │
│  📅 Récupération prévue: [date_recuperation_souhaitee]               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Actions Correctives Nécessaires

### Correction 1 : Autoriser les notifications sans `projetActif`

**Fichier :** `src/hooks/useMarketplaceNotifications.ts`
```typescript
// AVANT
if (!effectiveEnabled || !currentUserId || !projetActifId) {
  return;
}

// APRÈS
if (!effectiveEnabled || !currentUserId) {
  return;
}
// projetActifId n'est plus requis pour charger les notifications
```

### Correction 2 : Enrichir les notifications après acceptation

**Fichier :** `backend/src/marketplace/marketplace.service.ts`

Dans `acceptOffer()`, après la création de la transaction :
1. Récupérer les infos complètes du producteur (nom, prénom, email, téléphone)
2. Récupérer les infos complètes de l'acheteur (nom, prénom, email, téléphone)
3. Récupérer la localisation du listing (latitude, longitude, adresse)
4. Créer des notifications enrichies avec ces données

### Correction 3 : Ajouter un type de notification `SALE_CONFIRMED`

**Fichier :** `backend/src/marketplace/dto/notification.dto.ts`
```typescript
export enum NotificationType {
  // ... existants
  SALE_CONFIRMED = 'sale_confirmed',  // ✅ Nouveau type avec détails enrichis
}
```

### Correction 4 : Ajouter des méthodes de notification enrichies

**Fichier :** `backend/src/marketplace/notifications.service.ts`
```typescript
async notifySaleConfirmedToBuyer(
  buyerId: string,
  transactionId: string,
  data: {
    producerName: string;
    producerPhone: string;
    producerEmail: string;
    farmName: string;
    farmAddress: string;
    farmCity: string;
    latitude: number;
    longitude: number;
    finalPrice: number;
    subjectCount: number;
    pickupDate?: string;
  }
)

async notifySaleConfirmedToProducer(
  producerId: string,
  transactionId: string,
  data: {
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    finalPrice: number;
    subjectCount: number;
    pickupDate?: string;
  }
)
```

---

## 6. Schéma de Données Enrichies pour Notifications

### Structure JSON dans le champ `data` de `marketplace_notifications`

```json
{
  "transactionId": "trans_xxx",
  "type": "sale_confirmed",
  "finalPrice": 150000,
  "subjectCount": 3,
  "pickupDate": "2026-01-25",
  
  // Pour l'acheteur (détails du producteur)
  "producer": {
    "name": "Jean Dupont",
    "phone": "+225 07 xx xx xx",
    "email": "jean@example.com"
  },
  "farm": {
    "name": "Ferme du Soleil",
    "address": "Route de Yamoussoukro",
    "city": "Abidjan",
    "region": "Lagunes",
    "latitude": 5.3484,
    "longitude": -4.0083,
    "googleMapsUrl": "https://www.google.com/maps?q=5.3484,-4.0083"
  },
  
  // Pour le producteur (détails de l'acheteur)
  "buyer": {
    "name": "Marie Martin",
    "phone": "+225 05 xx xx xx",
    "email": "marie@example.com"
  }
}
```

---

## 7. Résumé des Problèmes et Solutions

| # | Problème | Impact | Solution |
|---|----------|--------|----------|
| 1 | Notifications non chargées si pas de `projetActif` | Acheteurs et collaborateurs ne voient pas la cloche | Retirer la condition `projetActifId` |
| 2 | Notifications basiques après acceptation | Utilisateurs n'ont pas les infos pour finaliser | Enrichir avec contact + localisation |
| 3 | Pas de lien Google Maps | Acheteur ne trouve pas la ferme | Générer URL avec lat/long |
| 4 | Pas de date de récupération | Aucune coordination possible | Inclure `date_recuperation_souhaitee` |
| 5 | Pas de suivi après transaction | Processus incomplet | Créer écran "Mes Transactions" |

---

## 8. Prochaines Étapes Recommandées

1. **Corriger le bug des notifications** (priorité HAUTE)
   - Supprimer la dépendance à `projetActifId`
   - Tester que tous les profils voient leurs notifications

2. **Enrichir `acceptOffer`** (priorité HAUTE)
   - Récupérer infos contact producteur et acheteur
   - Récupérer localisation du listing
   - Créer notifications enrichies avec toutes les données

3. **Créer écran "Détails Transaction"** (priorité MOYENNE)
   - Accessible depuis la notification
   - Affiche tous les détails + actions (appeler, email, maps)

4. **Ajouter suivi post-vente** (priorité BASSE)
   - Confirmer récupération
   - Noter l'autre partie
   - Marquer transaction comme "complétée"
