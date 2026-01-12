const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'farmtrack',
  user: 'postgres',
  password: 'password'
});

async function checkTables() {
  try {
    await client.connect();

    console.log('=== STRUCTURE marketplace_listings ===');
    const listingsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'marketplace_listings'
      ORDER BY ordinal_position
    `);

    console.log('Colonnes marketplace_listings:');
    listingsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable}) default: ${row.column_default || 'null'}`);
    });

    console.log('\n=== STRUCTURE marketplace_inquiries ===');
    const inquiriesResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'marketplace_inquiries'
      ORDER BY ordinal_position
    `);

    console.log('Colonnes marketplace_inquiries:');
    inquiriesResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable}) default: ${row.column_default || 'null'}`);
    });

    console.log('\n=== DONNÉES marketplace_listings ===');
    const listingsData = await client.query('SELECT id, listing_type, calculated_price, price_per_kg FROM marketplace_listings LIMIT 3');
    console.log('Listings:', listingsData.rows);

    console.log('\n=== DONNÉES marketplace_inquiries ===');
    const inquiriesData = await client.query('SELECT id, buyer_id, seller_id, offered_amount, status FROM marketplace_inquiries LIMIT 3');
    console.log('Inquiries:', inquiriesData.rows);

  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();