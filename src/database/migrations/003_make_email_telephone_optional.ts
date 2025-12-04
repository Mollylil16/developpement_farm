/**
 * Migration 3 : Rendre email et telephone facultatifs (email OU telephone requis)
 * 
 * Version: 3
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export async function makeEmailTelephoneOptional(db: SQLiteDatabase): Promise<void> {
  const usersTableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );

  if (!usersTableExists) {
    return;
  }

  // Vérifier si la colonne email est encore NOT NULL (anciennes installations)
  const usersColumns = await db.getAllAsync<{
    name: string;
    notnull: number;
  }>("PRAGMA table_info('users')");

  const emailColumn = usersColumns.find((col) => col.name === 'email');

  if (emailColumn && emailColumn.notnull === 1) {
    console.log('📋 [Migration] Mise à jour de la table users pour email/téléphone facultatif');

    // Compter les utilisateurs avant migration
    const countBefore = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
    );
    console.log(`📊 [Migration] ${countBefore?.count || 0} utilisateurs actifs avant migration`);

    // Renommer l'ancienne table
    await db.execAsync(`ALTER TABLE users RENAME TO users_old;`);

    // Recréer la table avec la nouvelle structure (email/telephone facultatifs)
    await db.execAsync(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        telephone TEXT UNIQUE,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        password_hash TEXT,
        provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'telephone')) DEFAULT 'email',
        provider_id TEXT,
        photo TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_connexion TEXT,
        is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
        CHECK (email IS NOT NULL OR telephone IS NOT NULL)
      );
    `);

    // Copier les données existantes
    await db.execAsync(`
      INSERT INTO users (
        id, email, telephone, nom, prenom, password_hash, provider,
        provider_id, photo, date_creation, derniere_connexion, is_active
      )
      SELECT
        id,
        NULLIF(email, ''),
        NULLIF(telephone, ''),
        nom,
        prenom,
        password_hash,
        CASE
          WHEN provider IN ('email', 'google', 'apple', 'telephone') THEN provider
          ELSE 'email'
        END,
        provider_id,
        photo,
        date_creation,
        derniere_connexion,
        COALESCE(is_active, 1)
      FROM users_old;
    `);

    // Vérifier que toutes les données ont été copiées
    const countAfter = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
    );
    console.log(`📊 [Migration] ${countAfter?.count || 0} utilisateurs actifs après migration`);

    if ((countBefore?.count || 0) !== (countAfter?.count || 0)) {
      console.error('❌ [Migration] ERREUR: Nombre d\'utilisateurs différent après migration!');
      console.error(`Avant: ${countBefore?.count}, Après: ${countAfter?.count}`);
      throw new Error('Migration users échouée: données manquantes');
    }

    // Tout est OK, on peut supprimer users_old
    await db.execAsync(`DROP TABLE users_old;`);

    console.log('✅ [Migration] Table users mise à jour avec succès');
  }
}

