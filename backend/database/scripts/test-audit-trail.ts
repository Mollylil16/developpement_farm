/**
 * Script de test pour l'audit trail et les métadonnées enrichies
 * Usage: npx ts-node backend/database/scripts/test-audit-trail.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { CollaborationsService } from '../../src/collaborations/collaborations.service';
import { DatabaseService } from '../../src/database/database.service';

async function testAuditTrail() {
  console.log('========================================');
  console.log('Test de l\'audit trail et métadonnées QR');
  console.log('========================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dbService = app.get(DatabaseService);
  const collabService = app.get(CollaborationsService);

  try {
    // 1. Vérifier que la migration a été appliquée
    console.log('1. Vérification de la migration...');
    const migrationCheck = await dbService.query(
      `SELECT migration_name, applied_at 
       FROM schema_migrations 
       WHERE migration_name = '086_enrich_collaboration_history_audit.sql'`
    );

    if (migrationCheck.rows.length === 0) {
      console.log('❌ Migration 086 non appliquée');
      console.log('   La migration sera appliquée au prochain démarrage du backend');
      return;
    }

    console.log('✅ Migration appliquée le:', migrationCheck.rows[0].applied_at);

    // 2. Vérifier les colonnes
    console.log('\n2. Vérification des colonnes...');
    const columnsCheck = await dbService.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'collaboration_history' 
         AND column_name IN ('device_info', 'action_metadata', 'profile_id')
       ORDER BY column_name`
    );

    const expectedColumns = ['device_info', 'action_metadata', 'profile_id'];
    const foundColumns = columnsCheck.rows.map((r) => r.column_name);

    for (const col of expectedColumns) {
      if (foundColumns.includes(col)) {
        console.log(`✅ Colonne ${col} existe`);
      } else {
        console.log(`❌ Colonne ${col} manquante`);
      }
    }

    // 3. Vérifier l'index
    console.log('\n3. Vérification de l\'index...');
    const indexCheck = await dbService.query(
      `SELECT indexname 
       FROM pg_indexes 
       WHERE tablename = 'collaboration_history' 
         AND indexname = 'idx_collab_history_profile_id'`
    );

    if (indexCheck.rows.length > 0) {
      console.log('✅ Index idx_collab_history_profile_id existe');
    } else {
      console.log('❌ Index idx_collab_history_profile_id manquant');
    }

    // 4. Vérifier les métadonnées enrichies dans les collaborations QR
    console.log('\n4. Vérification des métadonnées QR...');
    const qrCollabs = await dbService.query(
      `SELECT 
        id,
        invitation_type,
        qr_scan_data,
        profile_id,
        statut,
        expiration_date
       FROM collaborations
       WHERE invitation_type = 'qr_scan'
       ORDER BY date_creation DESC
       LIMIT 5`
    );

    console.log(`   Trouvé ${qrCollabs.rows.length} collaboration(s) QR`);

    for (const collab of qrCollabs.rows) {
      if (collab.qr_scan_data) {
        const qrData = typeof collab.qr_scan_data === 'string'
          ? JSON.parse(collab.qr_scan_data)
          : collab.qr_scan_data;

        const requiredFields = [
          'scanned_at',
          'scanner_user_id',
          'qr_code_version',
          'permissions_defined_at',
          'invitation_sent_at',
        ];

        let hasAllFields = true;
        for (const field of requiredFields) {
          if (!qrData[field]) {
            hasAllFields = false;
            console.log(`   ❌ ${collab.id}: champ ${field} manquant`);
          }
        }

        if (hasAllFields) {
          console.log(`   ✅ ${collab.id}: métadonnées complètes`);
        }
      }
    }

    // 5. Vérifier les actions loggées avec métadonnées enrichies
    console.log('\n5. Vérification du logging enrichi...');
    const historyCheck = await dbService.query(
      `SELECT 
        ch.action,
        COUNT(*) as total,
        COUNT(device_info) as with_device_info,
        COUNT(action_metadata) as with_action_metadata,
        COUNT(profile_id) as with_profile_id
       FROM collaboration_history ch
       WHERE ch.created_at > NOW() - INTERVAL '7 days'
       GROUP BY ch.action
       ORDER BY ch.action`
    );

    console.log('   Actions loggées (7 derniers jours):');
    for (const row of historyCheck.rows) {
      const enrichi =
        row.with_device_info > 0 ||
        row.with_action_metadata > 0 ||
        row.with_profile_id > 0;

      if (enrichi) {
        console.log(
          `   ✅ ${row.action}: ${row.total} actions (device_info: ${row.with_device_info}, metadata: ${row.with_action_metadata}, profile_id: ${row.with_profile_id})`
        );
      } else {
        console.log(`   ⚠️  ${row.action}: ${row.total} actions (pas de métadonnées enrichies)`);
      }
    }

    // 6. Vérifier l'action invitation_viewed
    console.log('\n6. Vérification du tracking invitation_viewed...');
    const viewedCheck = await dbService.query(
      `SELECT COUNT(*) as count 
       FROM collaboration_history 
       WHERE action = 'invitation_viewed' 
         AND created_at > NOW() - INTERVAL '7 days'`
    );

    if (viewedCheck.rows[0].count > 0) {
      console.log(
        `✅ ${viewedCheck.rows[0].count} action(s) invitation_viewed loggée(s)`
      );
    } else {
      console.log('⚠️  Aucune action invitation_viewed loggée (normal si aucune invitation consultée)');
    }

    // 7. Statistiques globales
    console.log('\n7. Statistiques globales (7 derniers jours)...');
    const stats = await dbService.query(
      `SELECT 
        COUNT(*) as total_actions,
        COUNT(device_info) as actions_with_device_info,
        COUNT(action_metadata) as actions_with_metadata,
        COUNT(profile_id) as actions_with_profile_id,
        COUNT(*) FILTER (
          WHERE device_info IS NOT NULL 
            AND action_metadata IS NOT NULL 
            AND profile_id IS NOT NULL
        ) as fully_enriched_actions
       FROM collaboration_history
       WHERE created_at > NOW() - INTERVAL '7 days'`
    );

    const stat = stats.rows[0];
    console.log(`   Total actions: ${stat.total_actions}`);
    console.log(`   Avec device_info: ${stat.actions_with_device_info}`);
    console.log(`   Avec action_metadata: ${stat.actions_with_metadata}`);
    console.log(`   Avec profile_id: ${stat.actions_with_profile_id}`);
    console.log(`   Complètement enrichies: ${stat.fully_enriched_actions}`);

    console.log('\n========================================');
    console.log('✅ Tests terminés');
    console.log('========================================');
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  } finally {
    await app.close();
  }
}

testAuditTrail().catch(console.error);
