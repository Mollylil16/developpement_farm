/**
 * Script de migration : Convertir les utilisateurs existants vers le système multi-rôles
 *
 * Ce script :
 * 1. Récupère tous les utilisateurs existants
 * 2. Crée un profil Producteur pour chacun avec leurs données existantes
 * 3. Met à jour leur enregistrement avec roles et activeRole
 *
 * Usage: Exécuter ce script une seule fois après le déploiement du système multi-rôles
 */

import { UserRepository } from '../database/repositories/UserRepository';
import { ProjetRepository } from '../database/repositories/ProjetRepository';
import type { ProducerProfile } from '../types/roles';
import type { User } from '../types/auth';
import type { Projet } from '../types/projet';

interface MigrationStats {
  totalUsers: number;
  migrated: number;
  skipped: number;
  errors: number;
  errorsList: Array<{ userId: string; error: string }>;
}

/**
 * Migrer un utilisateur vers le système multi-rôles
 */
async function migrateUserToMultiRole(
  userRepo: UserRepository,
  projetRepo: ProjetRepository,
  user: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier si l'utilisateur a déjà des rôles (déjà migré)
    if (user.roles) {
      try {
        const parsedRoles = typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles;
        if (parsedRoles && Object.keys(parsedRoles).length > 0) {
          return { success: false, error: 'Déjà migré' };
        }
      } catch (_e) {
        // Continuer la migration si le parsing échoue (utiliser _e pour indiquer que l'erreur est intentionnellement ignorée)
      }
    }

    // Récupérer les projets de l'utilisateur pour extraire les données de la ferme
    const userProjects = await projetRepo.findAll();
    const userProject = userProjects.find((p: Projet) => p.proprietaire_id === user.id) || userProjects[0];

    // Créer le profil producteur avec les données existantes
    // Calculer la capacité totale à partir des nombres d'animaux
    const totalAnimals =
      (userProject?.nombre_truies || 0) +
      (userProject?.nombre_verrats || 0) +
      (userProject?.nombre_porcelets || 0) +
      (userProject?.nombre_croissance || 0);
    const totalCapacity = Math.max(totalAnimals, 100); // Au minimum 100, ou le total calculé

    const producerProfile: ProducerProfile = {
      isActive: true,
      activatedAt: user.date_creation || new Date().toISOString(),
      farmName: userProject?.nom || user.nom || 'Ma Ferme',
      farmType: 'individual', // Par défaut, peut être ajusté selon les données
      registrationNumber: undefined,
      capacity: {
        totalCapacity,
        currentOccupancy: totalAnimals,
      },
      stats: {
        totalSales: 0, // TODO: Calculer depuis les transactions marketplace
        totalRevenue: 0, // TODO: Calculer depuis les revenus
        averageRating: 0,
        totalReviews: 0,
      },
      marketplaceSettings: {
        defaultPricePerKg: 450,
        autoAcceptOffers: false,
        minimumOfferPercentage: 80,
        notificationsEnabled: true,
      },
    };

    // Mettre à jour l'utilisateur avec le profil producteur
    await userRepo.update(user.id, {
      roles: { producer: producerProfile },
      activeRole: 'producer',
      isOnboarded: true,
      onboardingCompletedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || 'Erreur inconnue' };
  }
}

/**
 * Fonction principale de migration
 */
export async function migrateUsersToMultiRole(): Promise<MigrationStats> {
  console.log('🚀 Début de la migration vers le système multi-rôles...\n');

  const stats: MigrationStats = {
    totalUsers: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    errorsList: [],
  };

  try {
    const userRepo = new UserRepository();
    const projetRepo = new ProjetRepository();

    // Récupérer tous les utilisateurs actifs
    const allUsers = await userRepo.findAll();
    stats.totalUsers = allUsers.length;

    console.log(`📊 ${stats.totalUsers} utilisateur(s) trouvé(s)\n`);

    // Migrer chaque utilisateur
    for (const user of allUsers) {
      console.log(`⏳ Migration de ${user.prenom} ${user.nom} (${user.id})...`);

      const result = await migrateUserToMultiRole(userRepo, projetRepo, user);

      if (result.success) {
        stats.migrated++;
        console.log(`  ✅ Migré avec succès\n`);
      } else if (result.error === 'Déjà migré') {
        stats.skipped++;
        console.log(`  ⏭️  Déjà migré, ignoré\n`);
      } else {
        stats.errors++;
        stats.errorsList.push({ userId: user.id, error: result.error || 'Erreur inconnue' });
        console.log(`  ❌ Erreur: ${result.error}\n`);
      }
    }

    // Afficher le résumé
    console.log('\n' + '='.repeat(50));
    console.log('📈 RÉSUMÉ DE LA MIGRATION');
    console.log('='.repeat(50));
    console.log(`Total d'utilisateurs: ${stats.totalUsers}`);
    console.log(`✅ Migrés avec succès: ${stats.migrated}`);
    console.log(`⏭️  Déjà migrés (ignorés): ${stats.skipped}`);
    console.log(`❌ Erreurs: ${stats.errors}`);

    if (stats.errorsList.length > 0) {
      console.log('\n📋 Détails des erreurs:');
      stats.errorsList.forEach(({ userId, error }) => {
        console.log(`  - ${userId}: ${error}`);
      });
    }

    console.log('\n✅ Migration terminée!\n');

    return stats;
  } catch (error) {
    console.error('\n❌ Erreur fatale lors de la migration:', error);
    throw error;
  }
}

/**
 * Exécuter la migration (pour usage dans un script séparé ou depuis l'app)
 */
export async function runMigration(): Promise<void> {
  try {
    await migrateUsersToMultiRole();
  } catch (error) {
    console.error('Échec de la migration:', error);
    process.exit(1);
  }
}

// Si exécuté directement (node migrateUsersToMultiRole.ts)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if ((require as any).main === module) {
  runMigration();
}
