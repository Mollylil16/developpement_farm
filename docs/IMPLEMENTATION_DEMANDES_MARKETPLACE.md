# Implémentation du Système de Demandes Marketplace

## Vue d'ensemble

Ce document décrit l'implémentation complète du système de demandes d'achat pour le marketplace, supportant à la fois les profils **acheteur** et **producteur**, ainsi que les deux modes de gestion : **bande** et **individuel**.

## État d'avancement

### ✅ Complété

1. **Migration de base de données** (`064_extend_purchase_requests_for_producers.sql`)
   - Extension de la table `purchase_requests` avec :
     - `sender_type` : 'buyer' ou 'producer'
     - `sender_id` : ID de l'émetteur
     - `management_mode` : 'individual', 'batch', ou 'both'
     - `growth_stage` : stade de croissance souhaité
     - `matching_thresholds` : seuils configurables (JSONB)
     - `farm_id` : ID du projet pour les producteurs
   - Création de `purchase_request_responses` pour les réponses
   - Création de `purchase_request_matches` pour le tracking des matches

2. **Types TypeScript** (`src/types/marketplace.ts`)
   - Extension de `PurchaseRequest` avec les nouveaux champs
   - Ajout de `PurchaseRequestSenderType`, `PurchaseRequestManagementMode`, `GrowthStage`
   - Ajout de `MatchingThresholds` pour les seuils configurables
   - Extension de `PurchaseRequestOffer` pour supporter les deux modes

3. **Modal unifié** (`src/components/marketplace/MarketplaceActionModal.tsx`)
   - Modal avec deux options : "Mettre en vente" et "Créer une demande"
   - Adaptation du texte selon le profil (acheteur/producteur)
   - Design cohérent avec le thème marketplace

4. **Intégration dans MarketplaceScreen**
   - Remplacement du bouton "+" pour ouvrir le modal unifié
   - Gestion des deux actions depuis le modal

### 🔄 À compléter

#### 1. Formulaire de demande étendu (`CreatePurchaseRequestModal.tsx`)

**Modifications nécessaires :**

1. **Détection du profil et du mode**
   ```typescript
   const isProducer = /* détecter si producteur */;
   const projetActif = /* projet actif */;
   const managementMethod = projetActif?.management_method || 'individual';
   ```

2. **Champs supplémentaires pour producteurs**
   - Sélection du mode (`individual`, `batch`, `both`)
   - Sélection du stade de croissance
   - Pré-remplissage basé sur le cheptel actuel

3. **Champs supplémentaires pour modes**
   - En mode `batch` : critères sur moyennes de bande
   - En mode `individuel` : critères sur animaux spécifiques
   - Seuils de matching configurables (poids ±%, prix ±%)

4. **Validation adaptée**
   - Validation différente selon le mode
   - Suggestions basées sur le cheptel pour producteurs

**Exemple de structure :**

```typescript
interface ExtendedCreatePurchaseRequestDto {
  // Champs existants
  title: string;
  race: string;
  minWeight: number;
  maxWeight: number;
  quantity: number;
  // ... autres champs existants
  
  // Nouveaux champs
  senderType: 'buyer' | 'producer';
  managementMode?: 'individual' | 'batch' | 'both';
  growthStage?: 'porcelet' | 'croissance' | 'engraissement' | 'fini' | 'tous';
  matchingThresholds?: {
    weightTolerance?: number; // % (défaut: 10)
    priceTolerance?: number; // % (défaut: 20)
    locationRadius?: number; // km (défaut: 50)
  };
  farmId?: string; // Pour producteurs
}
```

#### 2. Logique de matching backend

**Fichier : `backend/src/marketplace/marketplace.service.ts`**

**Méthode à créer : `findMatchingProducersForRequest`**

```typescript
async findMatchingProducersForRequest(
  requestId: string,
  thresholds?: MatchingThresholds
): Promise<PurchaseRequestMatch[]> {
  const request = await this.findOnePurchaseRequest(requestId, /* userId */);
  const effectiveThresholds = {
    weightTolerance: thresholds?.weightTolerance || 10,
    priceTolerance: thresholds?.priceTolerance || 20,
    locationRadius: thresholds?.locationRadius || 50,
  };

  const matches: PurchaseRequestMatch[] = [];

  // 1. Récupérer tous les producteurs avec listings disponibles
  // 2. Filtrer selon le mode (individual/batch)
  // 3. Appliquer les critères de matching avec seuils
  // 4. Calculer le score de correspondance (0-100)
  // 5. Créer les enregistrements dans purchase_request_matches
  // 6. Envoyer les notifications

  return matches;
}
```

**Logique de matching :**

```typescript
// Pour mode individuel
if (request.managementMode === 'individual' || request.managementMode === 'both') {
  // Query sur production_animaux
  // WHERE race = request.race
  // AND poids BETWEEN (minWeight * (1 - weightTolerance/100)) AND (maxWeight * (1 + weightTolerance/100))
  // AND prix <= (maxPricePerKg * (1 + priceTolerance/100))
}

// Pour mode batch
if (request.managementMode === 'batch' || request.managementMode === 'both') {
  // Query sur batches
  // WHERE category = request.growthStage
  // AND average_weight_kg BETWEEN (minWeight * (1 - weightTolerance/100)) AND (maxWeight * (1 + weightTolerance/100))
  // AND price_per_kg <= (maxPricePerKg * (1 + priceTolerance/100))
}

// Calcul du score
const matchScore = calculateMatchScore(request, listing, effectiveThresholds);
```

#### 3. Endpoints backend

**Fichier : `backend/src/marketplace/marketplace.controller.ts`**

**Endpoints à ajouter/modifier :**

```typescript
// POST /marketplace/purchase-requests
// Modifier pour supporter senderType et nouveaux champs

// GET /marketplace/purchase-requests/sent
// Récupère les demandes envoyées par l'utilisateur (acheteur ou producteur)
@Get('purchase-requests/sent')
async getSentPurchaseRequests(@CurrentUser('id') userId: string) {
  return this.marketplaceService.findSentRequests(userId);
}

// GET /marketplace/purchase-requests/received
// Récupère les demandes reçues + réponses associées
@Get('purchase-requests/received')
async getReceivedPurchaseRequests(@CurrentUser('id') userId: string) {
  return this.marketplaceService.findReceivedRequests(userId);
}

// POST /marketplace/purchase-requests/:id/respond
// Ajoute une réponse (offre) à une demande
@Post('purchase-requests/:id/respond')
async respondToPurchaseRequest(
  @Param('id') id: string,
  @Body() responseDto: CreatePurchaseRequestResponseDto,
  @CurrentUser('id') userId: string
) {
  return this.marketplaceService.createPurchaseRequestResponse(id, responseDto, userId);
}

// POST /marketplace/purchase-requests/:id/match
// Déclenche le matching automatique pour une demande
@Post('purchase-requests/:id/match')
async triggerMatching(@Param('id') id: string, @CurrentUser('id') userId: string) {
  return this.marketplaceService.findMatchingProducersForRequest(id);
}
```

#### 4. Sections "Envoyées" et "Reçues"

**Fichier : `src/components/marketplace/tabs/MarketplaceRequestsTab.tsx` (nouveau)**

```typescript
export default function MarketplaceRequestsTab() {
  const [activeSection, setActiveSection] = useState<'sent' | 'received'>('sent');
  const [sentRequests, setSentRequests] = useState<PurchaseRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<PurchaseRequest[]>([]);

  // Charger les demandes envoyées
  const loadSentRequests = async () => {
    const requests = await apiClient.get('/marketplace/purchase-requests/sent');
    setSentRequests(requests);
  };

  // Charger les demandes reçues
  const loadReceivedRequests = async () => {
    const requests = await apiClient.get('/marketplace/purchase-requests/received');
    setReceivedRequests(requests);
  };

  return (
    <View>
      {/* Tabs pour basculer entre Envoyées et Reçues */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setActiveSection('sent')}
          style={[styles.tab, activeSection === 'sent' && styles.activeTab]}
        >
          <Text>Envoyées</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSection('received')}
          style={[styles.tab, activeSection === 'received' && styles.activeTab]}
        >
          <Text>Reçues</Text>
        </TouchableOpacity>
      </View>

      {/* Liste des demandes */}
      {activeSection === 'sent' ? (
        <PurchaseRequestList requests={sentRequests} type="sent" />
      ) : (
        <PurchaseRequestList requests={receivedRequests} type="received" />
      )}
    </View>
  );
}
```

#### 5. Cartes visuellement différenciées

**Fichier : `src/components/marketplace/PurchaseRequestCard.tsx` (nouveau)**

```typescript
interface PurchaseRequestCardProps {
  request: PurchaseRequest;
  type: 'sent' | 'received';
  onPress: () => void;
  onRespond?: () => void; // Pour les demandes reçues
}

export default function PurchaseRequestCard({
  request,
  type,
  onPress,
  onRespond,
}: PurchaseRequestCardProps) {
  const { colors } = MarketplaceTheme;
  
  // Fond bleu clair pour les demandes
  const cardStyle = {
    backgroundColor: colors.info + '15',
    borderColor: colors.info,
    borderWidth: 2,
  };

  return (
    <TouchableOpacity style={[styles.card, cardStyle]} onPress={onPress}>
      <View style={styles.header}>
        <Ionicons name="search" size={24} color={colors.info} />
        <Text style={styles.title}>{request.title}</Text>
        <Badge status={request.status} />
      </View>
      
      <View style={styles.criteria}>
        <Text>Race: {request.race}</Text>
        <Text>Poids: {request.minWeight}-{request.maxWeight} kg</Text>
        <Text>Quantité: {request.quantity}</Text>
        {request.managementMode && (
          <Text>Mode: {request.managementMode}</Text>
        )}
      </View>

      {type === 'received' && onRespond && (
        <Button title="Répondre" onPress={onRespond} />
      )}
    </TouchableOpacity>
  );
}
```

**Comparaison avec les cartes d'offres (vert) :**

```typescript
// Pour les offres/listings (fond vert)
const listingCardStyle = {
  backgroundColor: colors.success + '15',
  borderColor: colors.success,
  borderWidth: 2,
};
```

#### 6. Système de notifications

**Fichier : `backend/src/marketplace/marketplace.service.ts`**

```typescript
async notifyProducersAboutRequest(requestId: string, matches: PurchaseRequestMatch[]) {
  for (const match of matches) {
    await this.databaseService.query(
      `INSERT INTO marketplace_notifications (
        id, user_id, type, title, message, related_id, related_type, read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        this.generateId('notif'),
        match.producerId,
        'purchase_request_match',
        'Nouvelle demande correspondant à vos sujets',
        `Une demande correspond à vos critères avec un score de ${match.matchScore}%`,
        requestId,
        'purchase_request',
        false,
        new Date().toISOString(),
      ]
    );
  }
}
```

## Structure des fichiers

```
backend/
  database/migrations/
    064_extend_purchase_requests_for_producers.sql ✅
  src/marketplace/
    marketplace.service.ts (à étendre)
    marketplace.controller.ts (à étendre)
    dto/
      create-purchase-request.dto.ts (à étendre)
      create-purchase-request-response.dto.ts (nouveau)

src/
  components/marketplace/
    MarketplaceActionModal.tsx ✅
    PurchaseRequestCard.tsx (nouveau)
    CreatePurchaseRequestModal.tsx (à étendre)
    tabs/
      MarketplaceRequestsTab.tsx (nouveau)
  types/
    marketplace.ts ✅ (étendu)
  screens/marketplace/
    MarketplaceScreen.tsx ✅ (modifié)
```

## Prochaines étapes

1. **Étendre CreatePurchaseRequestModal** pour supporter les nouveaux champs
2. **Implémenter la logique de matching** dans le service backend
3. **Créer les endpoints** pour sent/received/respond
4. **Créer MarketplaceRequestsTab** avec sections Envoyées/Reçues
5. **Créer PurchaseRequestCard** avec design bleu
6. **Implémenter les notifications** pour les matches
7. **Tester** avec les deux profils et modes

## Notes importantes

- **Sécurité** : Vérifier que les producteurs ne peuvent répondre qu'aux demandes qui leur sont destinées
- **Performance** : Indexer les colonnes utilisées dans les queries de matching
- **UX** : Pré-remplir les formulaires pour producteurs basés sur leur cheptel
- **Validation** : Valider les seuils de matching (éviter valeurs extrêmes)
- **Spam** : Limiter le nombre de demandes par utilisateur par période

## Tests à effectuer

- [ ] Création de demande par acheteur
- [ ] Création de demande par producteur
- [ ] Matching automatique avec seuils configurables
- [ ] Affichage des demandes envoyées/reçues
- [ ] Réponse à une demande
- [ ] Notifications pour nouveaux matches
- [ ] Support des deux modes (bande/individuel)
- [ ] Responsivité mobile
- [ ] Validation des formulaires
- [ ] Performance avec grand volume de données

