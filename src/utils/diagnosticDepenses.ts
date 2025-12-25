/**
 * Utilitaire de diagnostic pour les dépenses
 * Note: Ce fichier utilise les repositories pour accéder aux données via l'API REST
 */

import { DepensePonctuelleRepository } from '../database/repositories';
import { RevenuRepository } from '../database/repositories';
import apiClient from '../services/api/apiClient';
import { logger } from './logger';

export async function diagnosticDepenses(projetId: string): Promise<void> {
  logger.info('');
  logger.info('========================================');
  logger.info('DIAGNOSTIC DES DÉPENSES');
  logger.info('========================================');

  try {
    const depenseRepo = new DepensePonctuelleRepository();
    const revenuRepo = new RevenuRepository();

    // 1. Note: La vérification de structure de table n'est plus possible via l'API
    logger.info('\nNote: La vérification de structure de table nécessite un accès direct à la base de données');

    // 2. Compter les dépenses par type
    logger.info('\nRépartition des dépenses:');
    try {
      const depenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
        params: { projet_id: projetId },
      });
      
      // Grouper par type_depense
      const countByType = new Map<string, { count: number; total: number }>();
      
      depenses.forEach((depense: any) => {
        const type = depense.typeDepense || 'NULL';
        const current = countByType.get(type) || { count: 0, total: 0 };
        countByType.set(type, {
          count: current.count + 1,
          total: current.total + (depense.montant || 0),
        });
      });

      if (countByType.size > 0) {
        countByType.forEach((stats, type) => {
          logger.info(`  ${type}: ${stats.count} dépenses, Total: ${stats.total.toLocaleString()} FCFA`);
        });
      } else {
        logger.warn('  Aucune dépense trouvée');
      }
    } catch (error) {
      logger.warn("  Impossible d'analyser par type:", error);
    }

    // 3. Total général
    const allDepenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
      params: { projet_id: projetId },
    });
    const totalCount = allDepenses.length;
    const totalMontant = allDepenses.reduce((sum: number, d: any) => sum + (d.montant || 0), 0);
    logger.info(
      `\nTOTAL DÉPENSES PONCTUELLES: ${totalCount} dépenses, ${totalMontant.toLocaleString()} FCFA`
    );

    // 3b. Lister les 10 dernières dépenses
    logger.info('\nDernières dépenses enregistrées:');
    const dernieres = allDepenses
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    dernieres.forEach((d: any, i: number) => {
      const libelle = d.libelle_categorie || d.categorie || 'Sans libellé';
      const date = d.date ? String(d.date).substring(0, 10) : 'Date inconnue';
      const montant = d.montant !== null ? d.montant.toLocaleString() : '0';
      const type = d.type_depense || 'NULL';
      logger.info(`  ${i + 1}. ${date} - ${montant} FCFA - ${type} - ${libelle}`);
    });

    // 4. Vérifier les ventes
    logger.info('\nVentes de porcs:');
    try {
      const revenus = await apiClient.get<any[]>(`/finance/revenus`, {
        params: { projet_id: projetId },
      });
      const ventes = revenus.filter((r: any) => r.categorie === 'vente_porc');
      
      if (ventes.length > 0) {
        const totalKg = ventes.reduce((sum: number, v: any) => sum + (v.poids_kg || 0), 0);
        logger.info(`  ${ventes.length} ventes, Total: ${totalKg} kg`);
      } else {
        logger.warn('  Aucune vente enregistrée');
      }
    } catch (error) {
      logger.warn('  Impossible de récupérer les ventes:', error);
    }

    logger.info('\n========================================\n');
  } catch (error) {
    logger.error('Erreur lors du diagnostic:', error);
  }
}
