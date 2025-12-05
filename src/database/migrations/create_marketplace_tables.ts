/**
 * Migration : Création des tables Marketplace
 * Filière Porcine - Plateforme de vente
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function createMarketplaceTables(db: SQLiteDatabase): Promise<void> {
  console.log('🛍️ [Migration] Création des tables Marketplace...');

  // Note: Les transactions sont gérées par MigrationRunner, ne pas démarrer de transaction ici
  try {

    // ========================================
    // 1. TABLE: marketplace_listings
    // Annonces de sujets en vente
    // ========================================
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        producer_id TEXT NOT NULL,
        farm_id TEXT NOT NULL,
        price_per_kg REAL NOT NULL,
        calculated_price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'available',
        listed_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_weight_date TEXT NOT NULL,
        location_latitude REAL,
        location_longitude REAL,
        location_address TEXT,
        location_city TEXT,
        location_region TEXT,
        sale_terms_transport TEXT DEFAULT 'buyer_responsibility',
        sale_terms_slaughter TEXT DEFAULT 'buyer_responsibility',
        sale_terms_payment TEXT DEFAULT 'on_delivery',
        sale_terms_warranty TEXT,
        sale_terms_cancellation TEXT,
        views INTEGER DEFAULT 0,
        inquiries INTEGER DEFAULT 0,
        FOREIGN KEY (subject_id) REFERENCES production_animaux(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_listings_producer 
      ON marketplace_listings(producer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status 
      ON marketplace_listings(status);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_listings_farm 
      ON marketplace_listings(farm_id);
    `);

    console.log('  ✅ Table marketplace_listings créée');

    // ========================================
    // 2. TABLE: marketplace_offers
    // Offres d'achat
    // ========================================
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketplace_offers (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL,
        subject_ids TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        producer_id TEXT NOT NULL,
        proposed_price REAL NOT NULL,
        original_price REAL NOT NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        terms_accepted INTEGER NOT NULL DEFAULT 0,
        terms_accepted_at TEXT,
        created_at TEXT NOT NULL,
        responded_at TEXT,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_offers_buyer 
      ON marketplace_offers(buyer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_offers_producer 
      ON marketplace_offers(producer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_offers_status 
      ON marketplace_offers(status);
    `);

    console.log('  ✅ Table marketplace_offers créée');

    // ========================================
    // 3. TABLE: marketplace_transactions
    // Transactions complètes
    // ========================================
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketplace_transactions (
        id TEXT PRIMARY KEY,
        offer_id TEXT NOT NULL,
        listing_id TEXT NOT NULL,
        subject_ids TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        producer_id TEXT NOT NULL,
        final_price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed',
        delivery_scheduled_date TEXT,
        delivery_location TEXT,
        delivery_transport_info TEXT,
        delivery_producer_confirmed INTEGER DEFAULT 0,
        delivery_producer_confirmed_at TEXT,
        delivery_buyer_confirmed INTEGER DEFAULT 0,
        delivery_buyer_confirmed_at TEXT,
        delivery_proof_photos TEXT,
        doc_health_certificate TEXT,
        doc_delivery_note TEXT,
        doc_invoice TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        cancelled_at TEXT,
        cancellation_reason TEXT,
        FOREIGN KEY (offer_id) REFERENCES marketplace_offers(id) ON DELETE CASCADE,
        FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer 
      ON marketplace_transactions(buyer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_producer 
      ON marketplace_transactions(producer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status 
      ON marketplace_transactions(status);
    `);

    console.log('  ✅ Table marketplace_transactions créée');

    // ========================================
    // 4. TABLE: marketplace_ratings
    // Notations des producteurs
    // ========================================
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketplace_ratings (
        id TEXT PRIMARY KEY,
        producer_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        transaction_id TEXT NOT NULL,
        rating_quality INTEGER NOT NULL,
        rating_professionalism INTEGER NOT NULL,
        rating_timeliness INTEGER NOT NULL,
        rating_communication INTEGER NOT NULL,
        overall REAL NOT NULL,
        comment TEXT,
        photos TEXT,
        verified_purchase INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'published',
        producer_response_text TEXT,
        producer_response_at TEXT,
        created_at TEXT NOT NULL,
        helpful_count INTEGER DEFAULT 0,
        FOREIGN KEY (transaction_id) REFERENCES marketplace_transactions(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_producer 
      ON marketplace_ratings(producer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_buyer 
      ON marketplace_ratings(buyer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_status 
      ON marketplace_ratings(status);
    `);

    console.log('  ✅ Table marketplace_ratings créée');

    // ========================================
    // 5. TABLE: marketplace_notifications
    // Notifications marketplace
    // ========================================
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketplace_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        related_id TEXT NOT NULL,
        related_type TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        action_url TEXT,
        created_at TEXT NOT NULL,
        read_at TEXT
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_user 
      ON marketplace_notifications(user_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_read 
      ON marketplace_notifications(read);
    `);

    console.log('  ✅ Table marketplace_notifications créée');

    // ========================================
    // 6. TABLE: marketplace_conversations
    // Conversations de chat
    // ========================================
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketplace_conversations (
        id TEXT PRIMARY KEY,
        participants TEXT NOT NULL,
        related_listing_id TEXT NOT NULL,
        related_offer_id TEXT,
        last_message TEXT,
        last_message_at TEXT NOT NULL,
        unread_count_json TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        FOREIGN KEY (related_listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_conversations_listing 
      ON marketplace_conversations(related_listing_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_conversations_status 
      ON marketplace_conversations(status);
    `);

    console.log('  ✅ Table marketplace_conversations créée');

    // ========================================
    // 7. TABLE: marketplace_messages
    // Messages de chat
    // ========================================
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketplace_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        metadata_json TEXT,
        read INTEGER DEFAULT 0,
        read_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES marketplace_conversations(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_messages_conversation 
      ON marketplace_messages(conversation_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_messages_sender 
      ON marketplace_messages(sender_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_messages_read 
      ON marketplace_messages(read);
    `);

    console.log('  ✅ Table marketplace_messages créée');

    // ========================================
    // 8. TABLE: marketplace_notification_preferences
    // Préférences de notification
    // ========================================
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketplace_notification_preferences (
        user_id TEXT PRIMARY KEY,
        email_notifications INTEGER DEFAULT 1,
        push_notifications INTEGER DEFAULT 1,
        offer_notifications INTEGER DEFAULT 1,
        message_notifications INTEGER DEFAULT 1,
        delivery_notifications INTEGER DEFAULT 1,
        rating_notifications INTEGER DEFAULT 1
      );
    `);

    console.log('  ✅ Table marketplace_notification_preferences créée');

    // ========================================
    // 9. TABLE: marketplace_analytics
    // Analytics des listings
    // ========================================
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketplace_analytics (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        inquiries INTEGER DEFAULT 0,
        offers INTEGER DEFAULT 0,
        conversion_rate REAL DEFAULT 0,
        average_view_duration INTEGER DEFAULT 0,
        views_by_day_json TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_listing 
      ON marketplace_analytics(listing_id);
    `);

    console.log('  ✅ Table marketplace_analytics créée');

    // ========================================
    // 10. COLONNE ADDITIONNELLE: production_animaux
    // Ajouter colonne marketplace_status
    // ========================================
    try {
      await db.execAsync(`
        ALTER TABLE production_animaux 
        ADD COLUMN marketplace_status TEXT DEFAULT NULL;
      `);
      console.log('  ✅ Colonne marketplace_status ajoutée à production_animaux');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('duplicate column name')) {
        console.log('  ℹ️  Colonne marketplace_status déjà présente');
      } else {
        throw error;
      }
    }

    try {
      await db.execAsync(`
        ALTER TABLE production_animaux 
        ADD COLUMN marketplace_listing_id TEXT DEFAULT NULL;
      `);
      console.log('  ✅ Colonne marketplace_listing_id ajoutée à production_animaux');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('duplicate column name')) {
        console.log('  ℹ️  Colonne marketplace_listing_id déjà présente');
      } else {
        throw error;
      }
    }

    // Note: COMMIT est géré par MigrationRunner
    console.log('✅ [Migration] Tables Marketplace créées avec succès');
  } catch (error) {
    // Note: ROLLBACK est géré par MigrationRunner
    console.error('❌ [Migration] Erreur création tables Marketplace:', error);
    throw error;
  }
}

/**
 * Suppression des tables marketplace (rollback)
 */
export async function dropMarketplaceTables(db: SQLiteDatabase): Promise<void> {
  console.log('🗑️ [Migration] Suppression des tables Marketplace...');

  const tables = [
    'marketplace_analytics',
    'marketplace_notification_preferences',
    'marketplace_messages',
    'marketplace_conversations',
    'marketplace_notifications',
    'marketplace_ratings',
    'marketplace_transactions',
    'marketplace_offers',
    'marketplace_listings',
  ];

  for (const table of tables) {
    await db.execAsync(`DROP TABLE IF EXISTS ${table}`);
    console.log(`  ✅ Table ${table} supprimée`);
  }

  console.log('✅ [Migration] Tables Marketplace supprimées');
}

