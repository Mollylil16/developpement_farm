/**
 * Script de test pour vérifier le système de migrations
 * Usage: npx ts-node src/database/scripts/test-migrations.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { MigrationService } from '../migration.service';

async function testMigrations() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(MigrationService);
  
  console.log('🧪 Test du système de migrations...\n');
  
  try {
    await migrationService.forceRunMigrations();
    console.log('\n✅ Test réussi');
  } catch (error) {
    console.error('\n❌ Test échoué:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

testMigrations();
