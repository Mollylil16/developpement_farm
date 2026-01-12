const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'farmtrack',
  user: 'postgres',
  password: 'password'
});

async function checkTable() {
  try {
    await client.connect();
    console.log('=== STRUCTURE DE LA TABLE marketplace_listings ===');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'marketplace_listings'
      ORDER BY ordinal_position
    `);

    console.log('Colonnes trouvées:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable}) default: ${row.column_default || 'null'}`);
    });

    // Vérifier aussi les données existantes
    console.log('\n=== DONNÉES EXISTANTES ===');
    const dataResult = await client.query('SELECT id, listing_type FROM marketplace_listings LIMIT 5');
    console.log('Premiers listings:', dataResult.rows.length);

  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();