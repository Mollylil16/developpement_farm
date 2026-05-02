/**
 * Service de génération de rapport financier (PDF et Excel)
 * Réutilise les services existants de bilan complet
 */

import { startOfMonth, endOfMonth } from 'date-fns';
import { exportBilanCompletPDF } from '../pdf/bilanCompletPDF';
import { exportBilanCompletExcel } from '../excel/bilanCompletExcel';
import apiClient from '../api/apiClient';
import { logger } from '../../utils/logger';

interface BilanCompletData {
  projet: {
    id: string;
    nom: string;
  };
  periode: {
    date_debut: string;
    date_fin: string;
    nombre_mois: number;
  };
  revenus: {
    total: number;
    par_categorie: Record<string, number>;
    nombre_transactions: number;
  };
  depenses: {
    opex_total: number;
    charges_fixes_total: number;
    total: number;
    par_categorie: Record<string, number>;
    nombre_transactions: number;
  };
  dettes: {
    total: number;
    nombre: number;
    interets_mensuels: number;
    liste: Array<{
      id: string;
      libelle: string;
      montant_restant: number;
      date_echeance: string | null;
      taux_interet: number;
    }>;
  };
  actifs: {
    valeur_cheptel: number;
    valeur_stocks: number;
    total: number;
    nombre_animaux: number;
    poids_moyen_cheptel: number;
  };
  resultats: {
    solde: number;
    marge_brute: number;
    cash_flow: number;
  };
  indicateurs: {
    taux_endettement: number;
    ratio_rentabilite: number;
    cout_kg_opex: number;
    total_kg_vendus: number;
    total_kg_vendus_estime?: boolean;
  };
}

/**
 * Charge les données du bilan financier depuis l'API
 */
async function loadBilanData(
  projetId: string,
  dateDebut: Date,
  dateFin: Date
): Promise<BilanCompletData> {
  try {
    const data = await apiClient.get<BilanCompletData>('/finance/bilan-complet', {
      params: {
        projet_id: projetId,
        date_debut: dateDebut.toISOString(),
        date_fin: dateFin.toISOString(),
      },
    });
    return data;
  } catch (error) {
    logger.error('Erreur lors du chargement du bilan:', error);
    throw error;
  }
}

/**
 * Génère le rapport financier en PDF
 */
export async function generateFinancialReportPDF(
  projetId: string,
  isModeBatch: boolean = false,
  dateDebut?: Date,
  dateFin?: Date
): Promise<void> {
  try {
    // Charger les informations du projet
    const projet = await apiClient.get<{ id: string; nom: string }>(`/projets/${projetId}`);

    // Utiliser les dates fournies ou par défaut le mois actuel
    const maintenant = new Date();
    const effectiveDateFin = dateFin || endOfMonth(maintenant);
    const effectiveDateDebut = dateDebut || startOfMonth(maintenant);

    // Charger les données du bilan
    const bilanData = await loadBilanData(projetId, effectiveDateDebut, effectiveDateFin);

    // Générer le PDF en utilisant le service existant
    await exportBilanCompletPDF({
      projet: {
        id: projet.id,
        nom: projet.nom,
      },
      ...bilanData,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la génération du rapport financier PDF:', error);
    throw new Error(`Impossible de générer le rapport financier: ${error.message || 'Erreur inconnue'}`);
  }
}

/**
 * Génère le rapport financier en Excel
 */
export async function generateFinancialReportExcel(
  projetId: string,
  isModeBatch: boolean = false,
  dateDebut?: Date,
  dateFin?: Date
): Promise<void> {
  try {
    // Charger les informations du projet
    const projet = await apiClient.get<{ id: string; nom: string }>(`/projets/${projetId}`);

    // Utiliser les dates fournies ou par défaut le mois actuel
    const maintenant = new Date();
    const effectiveDateFin = dateFin || endOfMonth(maintenant);
    const effectiveDateDebut = dateDebut || startOfMonth(maintenant);

    // Charger les données du bilan
    const bilanData = await loadBilanData(projetId, effectiveDateDebut, effectiveDateFin);

    // Générer l'Excel en utilisant le service existant
    await exportBilanCompletExcel({
      projet: {
        nom: projet.nom,
      },
      ...bilanData,
    });
  } catch (error: any) {
    logger.error('Erreur lors de la génération du rapport financier Excel:', error);
    throw new Error(`Impossible de générer le rapport financier: ${error.message || 'Erreur inconnue'}`);
  }
}

