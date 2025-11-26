/**
 * Types TypeScript pour le Marketplace
 * Filière Porcine - Connexion Producteurs/Acheteurs/Vétérinaires/Techniciens
 */

/**
 * Statut d'un sujet sur le marketplace
 */
export type MarketplaceStatus = 'available' | 'reserved' | 'pending_delivery' | 'sold' | 'removed';

/**
 * Statut étendu d'un sujet incluant le marketplace
 */
export interface SubjectMarketplaceStatus {
  inHerd: boolean;                    // Toujours true jusqu'à vente finalisée
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
 * Localisation géographique
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
  transport: 'buyer_responsibility';  // Toujours à la charge de l'acheteur
  slaughter: 'buyer_responsibility';  // Toujours à la charge de l'acheteur
  paymentTerms?: string;              // 'on_delivery' | 'advance' | 'terms'
  warranty: string;                   // Garantie sanitaire
  cancellationPolicy: string;         // Politique d'annulation
}

/**
 * Conditions de vente par défaut
 */
export const DEFAULT_SALE_TERMS: SaleTerms = {
  transport: 'buyer_responsibility',
  slaughter: 'buyer_responsibility',
  paymentTerms: 'on_delivery',
  warranty: 'Tous les documents sanitaires et certificats seront fournis. Garantie de conformité au poids et à l\'âge annoncés (marge de ±5%)',
  cancellationPolicy: 'Annulation possible jusqu\'à 48h avant la date de livraison. Après ce délai, des frais peuvent s\'appliquer.',
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
  calculatedPrice: number;            // Prix total calculé
  status: MarketplaceStatus;
  listedAt: string;                   // Date de mise en vente (ISO)
  updatedAt: string;                  // Dernière modification (ISO)
  lastWeightDate: string;             // Date dernière pesée (ISO)
  location: Location;
  saleTerms: SaleTerms;
  views: number;                      // Analytics: nombre de vues
  inquiries: number;                  // Analytics: nombre d'offres reçues
}

/**
 * Statut d'une offre
 */
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';

/**
 * Offre d'achat
 */
export interface Offer {
  id: string;
  listingId: string;                  // ID de l'annonce
  subjectIds: string[];               // IDs des sujets sélectionnés
  buyerId: string;                    // ID de l'acheteur
  producerId: string;                 // ID du producteur
  proposedPrice: number;              // Prix proposé
  originalPrice: number;              // Prix initial
  message?: string;                   // Message optionnel
  status: OfferStatus;
  termsAccepted: boolean;             // Acceptation conditions de vente
  termsAcceptedAt?: string;           // Date d'acceptation (ISO)
  createdAt: string;                  // Date de création (ISO)
  respondedAt?: string;               // Date de réponse (ISO)
  expiresAt: string;                  // Date d'expiration (ISO)
}

/**
 * Statut d'une transaction
 */
export type TransactionStatus = 
  | 'confirmed'           // Offre acceptée
  | 'preparing'           // En préparation
  | 'ready_for_delivery'  // Prêt pour livraison
  | 'in_transit'          // En cours de livraison
  | 'delivered'           // Livré
  | 'completed'           // Terminé (double confirmation)
  | 'cancelled';          // Annulé

/**
 * Détails de livraison
 */
export interface DeliveryDetails {
  scheduledDate: string;              // Date prévue (ISO)
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
 * Transaction complète
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
 * Critères de notation
 */
export interface RatingCriteria {
  quality: number;                    // 1-5: Qualité des sujets
  professionalism: number;            // 1-5: Professionnalisme
  timeliness: number;                 // 1-5: Respect des délais
  communication: number;              // 1-5: Communication
}

/**
 * Réponse du producteur à une notation
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
 * Type d'entité liée à la notification
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
 * Métadonnées d'un message
 */
export interface MessageMetadata {
  proposedPrice?: number;
  documentUrl?: string;
  actionType?: MessageActionType;
}

/**
 * Message de chat
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  message: string;
  messageType: MessageType;
  metadata?: MessageMetadata;
  read: boolean;
  readAt?: string;
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
  | 'price_desc'                      // Prix décroissant
  | 'weight_asc'                      // Poids croissant
  | 'weight_desc'                     // Poids décroissant
  | 'rating'                          // Note décroissante
  | 'recent';                         // Plus récent

/**
 * Paramètres de recherche marketplace
 */
export interface MarketplaceSearchParams {
  filters?: MarketplaceFilters;
  sort?: MarketplaceSortOption;
  page?: number;
  limit?: number;
}

/**
 * Résultat de recherche marketplace
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
  vaccinations: boolean;              // À jour ou non
  available: boolean;
}

/**
 * Préférences de notification utilisateur
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

