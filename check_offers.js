const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'farmtrack',
  user: 'postgres',
  password: 'admin'
});

async function checkOffers() {
  try {
    await client.connect();

    // Compter le total d'offres
    const totalResult = await client.query('SELECT COUNT(*) as total FROM marketplace_inquiries');
    console.log('📊 Total des offres dans marketplace_inquiries:', totalResult.rows[0].total);

    // Voir les offres par utilisateur
    const userResult = await client.query(
      'SELECT buyer_id, COUNT(*) as count FROM marketplace_inquiries GROUP BY buyer_id ORDER BY count DESC LIMIT 5'
    );
    console.log('👥 Offres par utilisateur:');
    userResult.rows.forEach(row => {
      console.log(`  User ${row.buyer_id}: ${row.count} offres`);
    });

    // Voir quelques offres récentes
    const offersResult = await client.query(
      'SELECT id, buyer_id, seller_id, offered_amount, status, created_at FROM marketplace_inquiries ORDER BY created_at DESC LIMIT 3'
    );
    console.log('📋 Dernières offres:');
    offersResult.rows.forEach(offer => {
      console.log(`  ID: ${offer.id}, Buyer: ${offer.buyer_id}, Amount: ${offer.offered_amount}, Status: ${offer.status}, Date: ${offer.created_at}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

checkOffers();