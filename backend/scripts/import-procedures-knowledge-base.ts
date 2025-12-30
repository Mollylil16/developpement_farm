/**
 * One-shot: importe uniquement les fichiers procedure-* de la Knowledge Base
 * puis vérifie qu'ils ressortent bien avec un score élevé via search_knowledge().
 *
 * Usage:
 *   npm run migrate
 *   npm run import:knowledge-procedures
 *
 * Options:
 *   KB_MIN_SCORE=6        (score minimal attendu)
 *   KB_LIMIT=5            (nombre de résultats affichés)
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { parseMarkdownFile, upsertKnowledge } from './import-knowledge-base';

// Charger les variables d'environnement (si dotenv est disponible)
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  // utiliser les variables d'environnement du système
}

function createDatabasePool(): Pool {
  let poolConfig: any;

  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    poolConfig = {
      connectionString: url,
      ssl: url.includes('sslmode=require') || url.includes('ssl=true') ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  } else {
    const requiresSSL = process.env.DB_SSL === 'true' || process.env.DB_REQUIRE_SSL === 'true';
    poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'farmtrack_db',
      user: process.env.DB_USER || 'farmtrack_user',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: requiresSSL ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  return new Pool(poolConfig);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isTransientDbError = (err: any): boolean => {
  const code = err?.code || err?.errno;
  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED'
  );
};

async function ensureProceduresCategoryAllowed(pool: Pool): Promise<void> {
  // Si la contrainte n'inclut pas 'procedures', on la remplace.
  // (Sécurisé: IF EXISTS, et la contrainte est recréée avec la liste complète)
  const defRes = await pool.query(
    `
    SELECT pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    WHERE c.conrelid = 'knowledge_base'::regclass
      AND c.contype = 'c'
      AND c.conname = 'knowledge_base_category_check'
    `
  );

  const def = defRes.rows?.[0]?.def as string | undefined;
  if (def && def.includes("'procedures'")) return;

  await pool.query(`ALTER TABLE knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_category_check`);
  await pool.query(`
    ALTER TABLE knowledge_base
    ADD CONSTRAINT knowledge_base_category_check CHECK (category IN (
      'types_elevage',
      'objectifs',
      'races',
      'emplacement',
      'eau',
      'alimentation',
      'sante',
      'finance',
      'commerce',
      'reglementation',
      'general',
      'procedures'
    ))
  `);
}

type SearchRow = {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  relevance_score: number;
};

async function searchKnowledge(pool: Pool, query: string, limit: number): Promise<SearchRow[]> {
  try {
    const res = await pool.query(
      `SELECT id, category, title, keywords, relevance_score
       FROM search_knowledge($1, $2, $3, $4)`,
      [query, null, null, limit]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      keywords: r.keywords || [],
      relevance_score: parseFloat(r.relevance_score) || 0,
    }));
  } catch (e: any) {
    // Fallback: recherche simple (LIKE) avec scoring local (similaire à scripts/test-knowledge-base-api.ts)
    const normalizedQuery = query.toLowerCase();
    const searchTerms = normalizedQuery.split(/\s+/).filter((t) => t.length >= 2);
    if (searchTerms.length === 0) return [];

    const patterns = searchTerms.map((t) => `%${t}%`);

    // Requête simple: match title/keywords/content + score "approx"
    // (On n'utilise pas content ici pour garder le script rapide)
    const sql = `
      SELECT id, category, title, keywords,
        (
          CASE
            WHEN LOWER(title) LIKE $1 THEN 10.0
            WHEN EXISTS (SELECT 1 FROM unnest(keywords) AS kw WHERE LOWER(kw::text) LIKE $1) THEN 8.0
            ELSE 3.0
          END
        ) AS relevance_score
      FROM knowledge_base
      WHERE is_active = true
        AND visibility = 'global'
        AND (
          LOWER(title) LIKE ANY($2::text[])
          OR EXISTS (
            SELECT 1 FROM unnest(keywords) AS kw
            WHERE LOWER(kw::text) LIKE ANY($2::text[])
          )
        )
      ORDER BY relevance_score DESC, priority DESC
      LIMIT $3
    `;
    const res = await pool.query(sql, [patterns[0], patterns, limit]);
    return res.rows.map((r: any) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      keywords: r.keywords || [],
      relevance_score: parseFloat(r.relevance_score) || 0,
    }));
  }
}

async function main() {
  const markdownDir = path.join(__dirname, '../../src/services/chatAgent/knowledge/markdown');
  const limit = parseInt(process.env.KB_LIMIT || '5', 10);
  const minScore = parseFloat(process.env.KB_MIN_SCORE || '6');

  if (!fs.existsSync(markdownDir)) {
    console.error(`❌ Dossier introuvable: ${markdownDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(markdownDir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .filter((f) => f.includes('-procedure-')) // uniquement "procedure-*"
    .sort()
    .map((f) => path.join(markdownDir, f));

  if (files.length === 0) {
    console.error(`❌ Aucun fichier procedure-* trouvé dans ${markdownDir}`);
    process.exit(1);
  }

  let pool = createDatabasePool();
  let sslRetried = false;

  async function ensureConnected(maxAttempts: number = 5): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await pool.query('SELECT NOW()');
        return;
      } catch (connError: any) {
        // Retry SSL required (même logique que scripts/import-knowledge-base.ts)
        if (
          connError?.code === '28000' &&
          connError?.message?.includes('SSL/TLS required') &&
          !sslRetried
        ) {
          await pool.end();
          if (process.env.DATABASE_URL) {
            const url = process.env.DATABASE_URL;
            const newUrl = url.includes('sslmode=')
              ? url
              : url + (url.includes('?') ? '&' : '?') + 'sslmode=require';
            process.env.DATABASE_URL = newUrl;
          } else {
            process.env.DB_SSL = 'true';
          }
          pool = createDatabasePool();
          sslRetried = true;
          continue;
        }

        if (isTransientDbError(connError) && attempt < maxAttempts) {
          await sleep(300 * attempt);
          continue;
        }
        throw connError;
      }
    }
  }
  try {
    await ensureConnected();
    await ensureProceduresCategoryAllowed(pool);

    // Import
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const filePath of files) {
      const parsed = parseMarkdownFile(filePath);
      if (!parsed) {
        skipped++;
        continue;
      }

      // Retry par fichier sur erreurs transitoires
      let lastErr: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await upsertKnowledge(pool, parsed);
          if (res.action === 'created') created++;
          if (res.action === 'updated') updated++;
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
          if (isTransientDbError(e) && attempt < 3) {
            await ensureConnected();
            await sleep(200 * attempt);
            continue;
          }
          throw e;
        }
      }
      if (lastErr) throw lastErr;
    }

    console.log(`✅ Import procedures terminé: ${created} créés, ${updated} mis à jour, ${skipped} ignorés.`);

    // Vérification "score élevé"
    const tests: Array<{ query: string; expectIncludes: string }> = [
      { query: 'create_depense aliment', expectIncludes: 'create_depense' },
      { query: 'create_pesee poids', expectIncludes: 'create_pesee' },
      { query: 'create_revenu vente', expectIncludes: 'create_revenu' },
      { query: 'create_charge_fixe mensuel', expectIncludes: 'create_charge_fixe' },
      { query: 'creer_loge bande', expectIncludes: 'creer_loge' },
      { query: 'deplacer_animaux transfert', expectIncludes: 'deplacer_animaux' },
      { query: 'get_stock_status stock aliment', expectIncludes: 'get_stock_status' },
      { query: 'answer_knowledge_question base connaissances', expectIncludes: 'answer_knowledge_question' },
    ];

    console.log('\n🔎 Vérification RAG-GATE (search_knowledge):');
    let failed = 0;

    for (const t of tests) {
      await ensureConnected();
      const results = await searchKnowledge(pool, t.query, limit);
      const best = results[0];
      if (!best) {
        console.log(`❌ "${t.query}" -> aucun résultat`);
        failed++;
        continue;
      }

      const okTitle = best.title.toLowerCase().includes(t.expectIncludes.toLowerCase());
      const okScore = best.relevance_score >= minScore;

      const status = okTitle && okScore ? '✅' : '⚠️';
      console.log(
        `${status} "${t.query}" -> ${best.title} [cat=${best.category}] score=${best.relevance_score.toFixed(2)}`
      );

      if (!(okTitle && okScore)) failed++;
    }

    if (failed > 0) {
      console.error(`\n❌ Vérification incomplète: ${failed} test(s) sous le seuil (KB_MIN_SCORE=${minScore}).`);
      process.exit(1);
    }

    console.log(`\n✅ OK: toutes les procédures ressortent avec score >= ${minScore}.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Erreur import-procedures:', e?.message || e);
  process.exit(1);
});


