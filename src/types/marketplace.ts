/**
 * Types TypeScript pour le Marketplace
 * Fili├¿re Porcine - Connexion Producteurs/Acheteurs/V├®t├®rinaires/Techniciens
 */

/**
 * Statut d'un sujet sur le marketplace
 */
export type MarketplaceStatus = 'available' | 'reserved' | 'pending_delivery' | 'sold' | 'removed';

/**
 * Statut ├®tendu d'un sujet incluant le marketplace
 */
export interface SubjectMarketplaceStatus {
  inHerd: boolean;                    // Toujours true jusqu'├á vente finalis├®e
  inMarketplace: boolean;             // true si mis en vente
  marketplaceStatus?: MarketplaceStatus;
  listingId?: string;                 // ID du listing actif
  soldDate?: string;                  // Date de vente (ISO)
  soldTo?: string;                    // ID de l'acheteur
  deliveryConfirmedBy?: {
    producer: boolean;
    buyer: boolean;
    producerDate?: string;
    buyerDate?: string;
  };
}

/**
 * Localisation g├®ographique
 */
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  region: string;
}

/**
 * Conditions de vente
 */
export interface SaleTerms {
  transport: 'buyer_responsibility';  // Toujours ├á la charge de l'acheteur
  slaughter: 'buyer_responsibility';  // Toujours ├á la charge de l'acheteur
  paymentTerms?: string;              // 'on_delivery' | 'advance' | 'terms'
  warranty: string;                   // Garantie sanitaire
  cancellationPolicy: string;         // Politique d'annulation
}

/**
 * Conditions de vente par d├®faut
 */
export const DEFAULT_SALE_TERMS: SaleTerms = {
  transport: 'buyer_responsibility',
  slaughter: 'buyer_responsibility',
  paymentTerms: 'on_delivery',
  warranty: 'Tous les documents sanitaires et certificats seront fournis. Garantie de conformit├® au poids et ├á l\'├óge annonc├®s (marge de ┬▒5%)',
  cancellationPolicy: 'Annulation possible jusqu\'├á 48h avant la date de livraison. Apr├¿s ce d├®lai, des frais peuvent s\'appliquer.',
};

/**
 * Annonce (Listing) sur le marketplace
 */
export interface MarketplaceListing {
  id: string;
  subjectId: string;                  // ID du sujet (animal)
  producerId: string;                 // ID du producteur
  farmId: string;                     // ID de la ferme (projet)
  pricePerKg: number;                 // Prix au kg
  calculatedPrice: number;            // Prix total calcul├®
  status: MarketplaceStatus;
  listedAt: string;                   // Date de mise en vente (ISO)
  updatedAt: string;                  // Derni├¿re modification (ISO)
  lastWeightDate: string;             // Date derni├¿re pes├®e (ISO)
  location: Location;
  saleTerms: SaleTerms;
  views: number;                      // Analytics: nombre de vues
  inquiries: number;                  // Analytics: nombre d'offres re├ºues
  type?: 'subject' | 'farm';          // Type de listing pour l'affichage
  // Propriétés enrichies pour SubjectCard (optionnelles)
  code?: string;
  race?: string;
  weight?: number;
  weightDate?: string;
  age?: number;
  totalPrice?: number;
  healthStatus?: 'good' | 'attention' | 'critical';
  vaccinations?: boolean;
  available?: boolean;
}

/**
 * Statut d'une offre
 */
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'withdrawn';

/**
 * Offre d'achat
 */
export interface Offer {
  id: string;
  listingId: string;                  // ID de l'annonce
  subjectIds: string[];               // IDs des sujets s├®lectionn├®s
  buyerId: string;                    // ID de l'acheteur
  producerId: string;                 // ID du producteur
  proposedPrice: number;              // Prix propos├®
  originalPrice: number;              // Prix initial
  message?: string;                   // Message optionnel
  status: OfferStatus;
  termsAccepted: boolean;             // Acceptation conditions de vente
  termsAcceptedAt?: string;           // Date d'acceptation (ISO)
  createdAt: string;                  // Date de cr├®ation (ISO)
  respondedAt?: string;               // Date de r├®ponse (ISO)
  expiresAt: string;                  // Date d'expiration (ISO)
}

/**
 * Statut d'une transaction
 */
export type TransactionStatus = 
  | 'confirmed'           // Offre accept├®e
  | 'preparing'           // En pr├®paration
  | 'ready_for_delivery'  // Pr├¬t pour livraison
  | 'pending_delivery'    // Alias pour ready_for_delivery (compatibilit├® UI)
  | 'in_transit'          // En cours de livraison
  | 'delivered'           // Livr├®
  | 'completed'           // Termin├® (double confirmation)
  | 'cancelled';          // Annul├®

/**
 * D├®tails de livraison
 */
export interface DeliveryDetails {
  scheduledDate: string;              // Date pr├®vue (ISO)
  location: string;                   // Lieu de livraison
  transportInfo?: string;             // Info transport
  producerConfirmed: boolean;
  producerConfirmedAt?: string;
  buyerConfirmed: boolean;
  buyerConfirmedAt?: string;
  deliveryProof?: string[];           // URLs des photos
}

/**
 * Documents de transaction
 */
export interface TransactionDocuments {
  healthCertificate?: string;         // URL certificat sanitaire
  deliveryNote?: string;              // URL bon de livraison
  invoice?: string;                   // URL facture
}

/**
 * Transaction compl├¿te
 */
export interface Transaction {
  id: string;
  offerId: string;
  listingId: string;
  subjectIds: string[];
  buyerId: string;
  producerId: string;
  finalPrice: number;
  status: TransactionStatus;
  deliveryDetails?: DeliveryDetails;
  documents: TransactionDocuments;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

/**
 * Crit├¿res de notation
 */
export interface RatingCriteria {
  quality: number;                    // 1-5: Qualit├® des sujets
  professionalism: number;            // 1-5: Professionnalisme
  timeliness: number;                 // 1-5: Respect des d├®lais
  communication: number;              // 1-5: Communication
}

/**
 * R├®ponse du producteur ├á une notation
 */
export interface ProducerResponse {
  text: string;
  respondedAt: string;
}

/**
 * Statut d'une notation
 */
export type RatingStatus = 'published' | 'pending_moderation' | 'flagged';

/**
 * Notation d'un producteur
 */
export interface ProducerRating {
  id: string;
  producerId: string;
  buyerId: string;
  transactionId: string;
  ratings: RatingCriteria;
  overall: number;                    // Moyenne automatique
  comment?: string;
  photos?: string[];                  // URLs photos
  verifiedPurchase: boolean;
  status: RatingStatus;
  producerResponse?: ProducerResponse;
  createdAt: string;
  helpfulCount: number;               // Nombre de "utile"
}

/**
 * Type de notification marketplace
 */
export type NotificationType =
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'message_received'
  | 'delivery_confirmed'
  | 'rating_received'
  | 'delivery_reminder'
  | 'payment_reminder';

/**
 * Type d'entit├® li├®e ├á la notification
 */
export type NotificationRelatedType = 'offer' | 'transaction' | 'message' | 'rating';

/**
 * Notification marketplace
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  body?: string;                       // Alias pour message (d├®tails suppl├®mentaires)
  relatedId: string;                  // ID de l'offre, transaction, etc.
  relatedType: NotificationRelatedType;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
}

/**
 * Statut d'une conversation
 */
export type ConversationStatus = 'active' | 'archived';

/**
 * Conversation de chat
 */
export interface ChatConversation {
  id: string;
  participants: string[];             // [buyerId, producerId]
  relatedListingId: string;
  relatedOfferId?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: {
    [userId: string]: number;
  };
  status: ConversationStatus;
  createdAt: string;
}

/**
 * Type de message
 */
export type MessageType = 'text' | 'price_proposal' | 'document' | 'action';

/**
 * Type d'action dans un message
 */
export type MessageActionType = 'confirm_delivery' | 'schedule_delivery';

/**
 * Pi├¿ce jointe
 */
export interface MessageAttachment {
  type: 'image' | 'document';
  url: string;
  fileName?: string;
}

/**
 * Message de chat
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  priceProposal?: number;
  read: boolean;
  readAt?: string;
  sentAt?: string;
  createdAt: string;
}

/**
 * Filtres de recherche marketplace
 */
export interface MarketplaceFilters {
  location?: {
    latitude: number;
    longitude: number;
    radius: number;                   // en km
  };
  minPrice?: number;
  maxPrice?: number;
  race?: string;
  minWeight?: number;
  maxWeight?: number;
  minAge?: number;
  maxAge?: number;
  status?: MarketplaceStatus;
  producerRating?: number;            // Note minimale
}

/**
 * Options de tri marketplace
 */
export type MarketplaceSortOption = 
  | 'distance'                        // Distance croissante
  | 'price_asc'                       // Prix croissant
  | 'price_desc'                      // Prix d├®croissant
  | 'weight_asc'                      // Poids croissant
  | 'weight_desc'                     // Poids d├®croissant
  | 'rating'                          // Note d├®croissante
  | 'recent';                         // Plus r├®cent

/**
 * Param├¿tres de recherche marketplace
 */
export interface MarketplaceSearchParams {
  filters?: MarketplaceFilters;
  sort?: MarketplaceSortOption;
  page?: number;
  limit?: number;
}

/**
 * R├®sultat de recherche marketplace
 */
export interface MarketplaceSearchResult {
  listings: MarketplaceListing[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Statistiques d'un producteur
 */
export interface ProducerStats {
  totalSales: number;
  averageRating: number;
  totalRatings: number;
  responseTime: number;               // en heures
  completionRate: number;             // pourcentage
}

/**
 * Carte de ferme pour affichage
 */
export interface FarmCard {
  id: string;
  name: string;
  location: Location;
  distance?: number;                  // en km depuis l'acheteur
  totalSubjects: number;
  totalWeight: number;
  averageRating: number;
  photoUrl?: string;
  isNew: boolean;                     // Nouveau sur marketplace
  stats: ProducerStats;
  // Nouvelles propriétés agrégées
  farmId: string;
  producerId: string;
  producerName: string;
  producerAvatar?: string;
  aggregatedData: {
    totalSubjectsForSale: number;
    totalWeight: number;
    priceRange: {
      min: number;
      max: number;
    };
    averagePricePerKg: number;
  };
  producerRating: {
    overall: number;
    totalReviews: number;
  };
  badges: {
    isNewProducer: boolean;
    isCertified: boolean;
    fastResponder: boolean;
  };
  preview: {
    subjectPhotos: string[];
    availableRaces: string[];
  };
  lastUpdated: Date;
}

/**
 * Carte de sujet pour affichage
 */
export interface SubjectCard {
  id: string;
  code: string;
  race: string;
  weight: number;
  weightDate: string;
  age: number;
  pricePerKg: number;
  totalPrice: number;
  healthStatus: 'good' | 'attention' | 'critical';
  vaccinations: boolean;              // ├Ç jour ou non
  available: boolean;
}

/**
 * Pr├®f├®rences de notification utilisateur
 */
export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  offerNotifications: boolean;
  messageNotifications: boolean;
  deliveryNotifications: boolean;
  ratingNotifications: boolean;
}

/**
 * Analytics d'un listing
 */
export interface ListingAnalytics {
  listingId: string;
  views: number;
  inquiries: number;
  offers: number;
  conversionRate: number;             // pourcentage
  averageViewDuration: number;        // en secondes
  viewsByDay: { [date: string]: number };
}

/**
 * Sujet sélectionné pour une offre (enrichi avec les détails du listing)
 */
export interface SelectedSubjectForOffer {
  listingId: string;
  subjectId: string;
  code?: string;
  race?: string;
  weight?: number;
  weightDate?: string;
  pricePerKg: number;
  calculatedPrice: number;
}

/**
 * Offre avec détails enrichis (listing et subject)
 */
export interface OfferWithDetails extends Offer {
  listing?: MarketplaceListing;
  subject?: SubjectCard;
}

/**
 * Statut d'une demande d'achat
 */
export type PurchaseRequestStatus = 'published' | 'fulfilled' | 'expired' | 'archived' | 'cancelled';

/**
 * Catégorie d'âge pour les demandes d'achat
 */
export type AgeCategory = 'jeunes' | 'engraissement' | 'finis' | 'tous';

/**
 * Localisation de livraison pour une demande d'achat
 */
export interface DeliveryLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  region?: string;
  department?: string;
  radiusKm?: number; // Rayon en km
}

/**
 * Demande d'achat (Purchase Request)
 */
export interface PurchaseRequest {
  id: string;
  buyerId: string;
  title: string;
  race: string;
  minWeight: number;
  maxWeight: number;
  ageCategory?: AgeCategory;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  quantity: number;
  deliveryLocation?: DeliveryLocation;
  maxPricePerKg?: number;
  maxTotalPrice?: number;
  deliveryDate?: string; // Date précise souhaitée
  deliveryPeriodStart?: string; // Début de période
  deliveryPeriodEnd?: string; // Fin de période
  message?: string;
  status: PurchaseRequestStatus;
  views: number;
  matchedProducersCount: number;
  offersCount: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Statut d'une offre de producteur sur une demande d'achat
 */
export type PurchaseRequestOfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'withdrawn';

/**
 * Offre d'un producteur sur une demande d'achat
 */
export interface PurchaseRequestOffer {
  id: string;
  purchaseRequestId: string;
  producerId: string;
  listingId?: string; // Listing associé si disponible
  subjectIds: string[]; // IDs des sujets proposés
  proposedPricePerKg: number;
  proposedTotalPrice: number;
  quantity: number;
  availableDate?: string;
  message?: string;
  status: PurchaseRequestOfferStatus;
  createdAt: string;
  respondedAt?: string;
  expiresAt?: string;
}

/**
 * Match entre une demande d'achat et un listing de producteur
 */
export interface PurchaseRequestMatch {
  id: string;
  purchaseRequestId: string;
  producerId: string;
  listingId: string;
  matchScore?: number; // Score de correspondance (0-100)
  notified: boolean;
  notificationSentAt?: string;
  createdAt: string;
}

/**
 * Détails enrichis d'une demande d'achat
 */
export interface PurchaseRequestWithDetails extends PurchaseRequest {
  buyer?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string;
  };
  offers?: PurchaseRequestOffer[];
  matches?: PurchaseRequestMatch[];
}

/**
 * Détails enrichis d'une offre sur demande d'achat
 */
export interface PurchaseRequestOfferWithDetails extends PurchaseRequestOffer {
  purchaseRequest?: PurchaseRequest;
  producer?: {
    id: string;
    firstName: string;
    lastName: string;
    farmName?: string;
  };
  listing?: MarketplaceListing;
  subjects?: SubjectCard[];
}

