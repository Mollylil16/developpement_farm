/**
 * Serveur web d'administration pour Fermier Pro
 * Interface web complète pour gérer toutes les données de l'application
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Trouver le fichier de base de données
function findDatabasePath() {
  // Expo SQLite stocke les bases de données dans différents emplacements selon la plateforme
  const platform = os.platform();
  let possiblePaths = [];

  if (platform === 'win32') {
    // Windows: %USERPROFILE%\.expo\databases\SQLite\fermier_pro.db
    possiblePaths = [
      path.join(os.homedir(), '.expo', 'databases', 'SQLite', 'fermier_pro.db'),
      path.join(os.homedir(), 'AppData', 'Local', 'expo', 'databases', 'SQLite', 'fermier_pro.db'),
      path.join(os.homedir(), '.expo', 'fermier_pro.db'),
    ];
  } else if (platform === 'darwin') {
    // macOS: ~/Library/Application Support/expo/databases/SQLite/fermier_pro.db
    possiblePaths = [
      path.join(
        os.homedir(),
        'Library',
        'Application Support',
        'expo',
        'databases',
        'SQLite',
        'fermier_pro.db'
      ),
      path.join(os.homedir(), '.expo', 'databases', 'SQLite', 'fermier_pro.db'),
    ];
  } else {
    // Linux: ~/.expo/databases/SQLite/fermier_pro.db
    possiblePaths = [
      path.join(os.homedir(), '.expo', 'databases', 'SQLite', 'fermier_pro.db'),
      path.join(os.homedir(), '.expo', 'fermier_pro.db'),
    ];
  }

  // Ajouter des chemins de fallback
  possiblePaths.push(
    path.join(__dirname, '..', 'fermier_pro.db'),
    path.join(process.cwd(), 'fermier_pro.db')
  );

  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      console.log(`✅ Base de données trouvée: ${dbPath}`);
      return dbPath;
    }
  }

  // Si aucun fichier trouvé, retourner le chemin le plus probable
  const defaultPath =
    platform === 'win32'
      ? path.join(os.homedir(), '.expo', 'databases', 'SQLite', 'fermier_pro.db')
      : platform === 'darwin'
        ? path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'expo',
            'databases',
            'SQLite',
            'fermier_pro.db'
          )
        : path.join(os.homedir(), '.expo', 'databases', 'SQLite', 'fermier_pro.db');

  console.log(`⚠️  Base de données non trouvée. Chemin attendu: ${defaultPath}`);
  return null;
}

let db = null;
let dbPath = null;

// Initialiser la connexion à la base de données
function initDatabase() {
  try {
    dbPath = findDatabasePath();

    if (!dbPath || !fs.existsSync(dbPath)) {
      console.warn(`⚠️  Base de données non trouvée`);
      console.log('💡 Pour trouver votre base de données:');
      console.log("   1. Lancez l'application Expo");
      console.log("   2. Créez un projet dans l'app");
      console.log('   3. La base de données sera créée automatiquement');
      console.log(`   4. Cherchez le fichier "fermier_pro.db" dans votre dossier utilisateur`);
      return false;
    }

    db = new Database(dbPath, { readonly: false });
    console.log(`✅ Connecté à la base de données: ${dbPath}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la connexion à la base de données:', error);
    console.error('💡 Assurez-vous que:');
    console.error('   - La base de données existe');
    console.error('   - Vous avez les permissions de lecture/écriture');
    console.error("   - L'application n'utilise pas actuellement la base de données");
    return false;
  }
}

// Routes API

// Obtenir toutes les tables
app.get('/api/tables', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Base de données non connectée' });
    }

    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `
      )
      .all();

    res.json(tables.map((t) => t.name));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir le schéma d'une table
app.get('/api/tables/:tableName/schema', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Base de données non connectée' });
    }

    const { tableName } = req.params;
    const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
    res.json(schema);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir toutes les données d'une table
app.get('/api/tables/:tableName/data', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Base de données non connectée' });
    }

    const { tableName } = req.params;
    const { page = 1, limit = 100, search = '', sortBy = '', sortOrder = 'ASC' } = req.query;

    let query = `SELECT * FROM ${tableName}`;
    const params = [];

    // Recherche
    if (search) {
      const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const textColumns = schema
        .filter((col) => ['TEXT', 'VARCHAR'].includes(col.type))
        .map((col) => col.name);

      if (textColumns.length > 0) {
        const conditions = textColumns.map((col) => `${col} LIKE ?`).join(' OR ');
        query += ` WHERE ${conditions}`;
        params.push(...textColumns.map(() => `%${search}%`));
      }
    }

    // Tri
    if (sortBy) {
      query += ` ORDER BY ${sortBy} ${sortOrder}`;
    }

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);

    // Compter le total
    let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
    if (search) {
      const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const textColumns = schema
        .filter((col) => ['TEXT', 'VARCHAR'].includes(col.type))
        .map((col) => col.name);
      if (textColumns.length > 0) {
        const conditions = textColumns.map((col) => `${col} LIKE ?`).join(' OR ');
        countQuery += ` WHERE ${conditions}`;
      }
    }
    const total = db.prepare(countQuery).get(...(search ? params.slice(0, -2) : [])).total;

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir une ligne spécifique
app.get('/api/tables/:tableName/data/:id', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Base de données non connectée' });
    }

    const { tableName, id } = req.params;
    const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const primaryKey = schema.find((col) => col.pk === 1)?.name || 'id';

    const row = db.prepare(`SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`).get(id);

    if (!row) {
      return res.status(404).json({ error: 'Ligne non trouvée' });
    }

    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Créer une nouvelle ligne
app.post('/api/tables/:tableName/data', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Base de données non connectée' });
    }

    const { tableName } = req.params;
    const data = req.body;

    const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const columns = schema.map((col) => col.name).filter((col) => col !== 'id' || data.id);
    const values = columns.map((col) => (data[col] !== undefined ? data[col] : null));

    const placeholders = columns.map(() => '?').join(', ');
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    const result = db.prepare(query).run(...values);
    res.json({ id: result.lastInsertRowid, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour une ligne
app.put('/api/tables/:tableName/data/:id', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Base de données non connectée' });
    }

    const { tableName, id } = req.params;
    const data = req.body;

    const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const primaryKey = schema.find((col) => col.pk === 1)?.name || 'id';
    const columns = schema.map((col) => col.name).filter((col) => col !== primaryKey);

    const updates = columns.filter((col) => data[col] !== undefined).map((col) => `${col} = ?`);
    const values = updates.map((_, i) => {
      const col = columns.find((c) => data[c] !== undefined);
      return data[col];
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const query = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE ${primaryKey} = ?`;
    db.prepare(query).run(...values, id);

    const updated = db.prepare(`SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`).get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une ligne
app.delete('/api/tables/:tableName/data/:id', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Base de données non connectée' });
    }

    const { tableName, id } = req.params;
    const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const primaryKey = schema.find((col) => col.pk === 1)?.name || 'id';

    const query = `DELETE FROM ${tableName} WHERE ${primaryKey} = ?`;
    db.prepare(query).run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exécuter une requête SQL personnalisée
app.post('/api/query', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Base de données non connectée' });
    }

    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Requête SQL invalide' });
    }

    // Sécurité: seulement SELECT pour les requêtes personnalisées
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      return res.status(403).json({ error: 'Seules les requêtes SELECT sont autorisées' });
    }

    const result = db.prepare(query).all();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les statistiques de la base de données
app.get('/api/stats', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Base de données non connectée' });
    }

    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `
      )
      .all();

    const stats = {};
    for (const table of tables) {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      stats[table.name] = count.count;
    }

    res.json({
      dbPath,
      tablesCount: tables.length,
      tables: stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour servir l'interface web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
if (initDatabase()) {
  app.listen(PORT, () => {
    console.log('\n🚀 Serveur Admin Fermier Pro démarré !');
    console.log(`📊 Interface web: http://localhost:${PORT}`);
    console.log(`📁 Base de données: ${dbPath}`);
    console.log('\n💡 Ouvrez votre navigateur et allez sur http://localhost:3001\n');
  });
} else {
  console.log('\n⚠️  Serveur démarré mais base de données non connectée');
  console.log(`📊 Interface web: http://localhost:${PORT}`);
  console.log(
    "💡 Créez d'abord un projet dans l'application pour initialiser la base de données\n"
  );

  app.listen(PORT, () => {
    console.log('Serveur en attente de la base de données...\n');
  });
}
