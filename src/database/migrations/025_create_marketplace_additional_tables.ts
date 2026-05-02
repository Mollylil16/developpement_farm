/**
 * Migration 25 : Créer les tables supplémentaires du Marketplace
 * Crée service_proposal_notifications, purchase_requests, purchase_request_offers,
 * purchase_request_matches et weekly_pork_price_trends
 *
 * Version: 25
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function createMarketplaceAdditionalTables(db: SQLiteDatabase): Promise<void> {
  // Table service_proposal_notifications
  const notificationsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='service_proposal_notifications'"
  );

  if (!notificationsTableExists) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS service_proposal_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('service_proposal_received', 'service_proposal_accepted', 'service_proposal_rejected')),
        farm_id TEXT,
        vet_id TEXT,
        proposal_id TEXT,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0 CHECK (read IN (0, 1)),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_service_proposal_notifications_user 
      ON service_proposal_notifications(user_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_service_proposal_notifications_read 
      ON service_proposal_notifications(user_id, read);
    `);

    console.log('✅ Migration: Table service_proposal_notifications créée');
  }

  // Table purchase_requests
  const purchaseRequestsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='purchase_requests'"
  );

  if (!purchaseRequestsTableExists) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS purchase_requests (
        id TEXT PRIMARY KEY,
        buyer_id TEXT NOT NULL,
        title TEXT NOT NULL,
        race TEXT NOT NULL,
        min_weight REAL NOT NULL,
        max_weight REAL NOT NULL,
        age_category TEXT,
        min_age_months INTEGER,
        max_age_months INTEGER,
        quantity INTEGER NOT NULL,
        delivery_location_latitude REAL,
        delivery_location_longitude REAL,
        delivery_location_address TEXT,
        delivery_location_city TEXT,
        delivery_location_region TEXT,
        delivery_location_department TEXT,
        delivery_radius_km REAL,
        max_price_per_kg REAL,
        max_total_price REAL,
        delivery_date TEXT,
        delivery_period_start TEXT,
        delivery_period_end TEXT,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'fulfilled', 'expired', 'archived', 'cancelled')),
        views INTEGER DEFAULT 0,
        matched_producers_count INTEGER DEFAULT 0,
        offers_count INTEGER DEFAULT 0,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_requests_buyer 
      ON purchase_requests(buyer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_requests_status 
      ON purchase_requests(status);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_requests_race 
      ON purchase_requests(race);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_requests_location 
      ON purchase_requests(delivery_location_latitude, delivery_location_longitude);
    `);

    console.log('✅ Migration: Table purchase_requests créée');
  }

  // Table purchase_request_offers
  const purchaseRequestOffersTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='purchase_request_offers'"
  );

  if (!purchaseRequestOffersTableExists) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS purchase_request_offers (
        id TEXT PRIMARY KEY,
        purchase_request_id TEXT NOT NULL,
        producer_id TEXT NOT NULL,
        listing_id TEXT,
        subject_ids TEXT NOT NULL,
        proposed_price_per_kg REAL NOT NULL,
        proposed_total_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        available_date TEXT,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')),
        created_at TEXT NOT NULL,
        responded_at TEXT,
        expires_at TEXT,
        FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (producer_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_request_offers_request 
      ON purchase_request_offers(purchase_request_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_request_offers_producer 
      ON purchase_request_offers(producer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_request_offers_status 
      ON purchase_request_offers(status);
    `);

    console.log('✅ Migration: Table purchase_request_offers créée');
  }

  // Table purchase_request_matches
  const purchaseRequestMatchesTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='purchase_request_matches'"
  );

  if (!purchaseRequestMatchesTableExists) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS purchase_request_matches (
        id TEXT PRIMARY KEY,
        purchase_request_id TEXT NOT NULL,
        producer_id TEXT NOT NULL,
        listing_id TEXT NOT NULL,
        match_score REAL,
        notified INTEGER DEFAULT 0,
        notification_sent_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (producer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_request_matches_request 
      ON purchase_request_matches(purchase_request_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_request_matches_producer 
      ON purchase_request_matches(producer_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_purchase_request_matches_notified 
      ON purchase_request_matches(notified);
    `);

    console.log('✅ Migration: Table purchase_request_matches créée');
  }

  // Table weekly_pork_price_trends
  const weeklyPorkPriceTrendsTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='weekly_pork_price_trends'"
  );

  if (!weeklyPorkPriceTrendsTableExists) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS weekly_pork_price_trends (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        week_number INTEGER NOT NULL,
        avg_price_platform REAL,
        avg_price_regional REAL,
        transactions_count INTEGER DEFAULT 0,
        offers_count INTEGER DEFAULT 0,
        listings_count INTEGER DEFAULT 0,
        source_priority TEXT NOT NULL DEFAULT 'platform' CHECK (source_priority IN ('platform', 'offers', 'listings', 'regional')),
        total_weight_kg REAL,
        total_price_fcfa REAL,
        updated_at TEXT NOT NULL,
        UNIQUE(year, week_number)
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_weekly_pork_price_trends_year_week 
      ON weekly_pork_price_trends(year, week_number);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_weekly_pork_price_trends_updated 
      ON weekly_pork_price_trends(updated_at);
    `);

    console.log('✅ Migration: Table weekly_pork_price_trends créée');
  }
}
