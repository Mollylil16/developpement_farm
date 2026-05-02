/**
 * Service de génération de rapport complet (PDF uniquement)
 * Regroupe les rapports financier, santé et production
 */

import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  generatePDFHeader,
  generatePDFFooter,
  wrapHTMLContent,
  formatCurrency,
  formatNumber,
  generateAndSharePDF,
} from '../pdfService';
import apiClient from '../api/apiClient';
import { logger } from '../../utils/logger';
// Les fonctions de chargement sont définies localement pour éviter les exports

// Réimporter les types nécessaires
interface HealthReportData {
  isModeBatch: boolean;
  vaccinations: Array<{
    id: string;
    vaccin: string;
    produit?: string;
    dosage?: string;
    unite?: string;
    date: string;
    animal_id?: string;
    animal_ids?: string[];
    batch_id?: string;
  }>;
  vaccinationsParType: Record<string, number>;
  totalVaccinations: number;
  mortalites: Array<{
    id: string;
    nombre_porcs: number;
    date: string;
    cause?: string;
    categorie?: string;
    animal_code?: string;
    batch_id?: string;
  }>;
  mortalitesParCause: Record<string, number>;
  mortalitesParCategorie: Record<string, number>;
  totalMorts: number;
  tauxMortalite: number;
  maladies: Array<{
    id: string;
    type?: string;
    nom?: string;
    gravite?: string;
    date_debut: string;
    date_fin?: string;
    symptomes?: string;
    diagnostic?: string;
    nombre_animaux_affectes: number;
    nombre_deces: number;
    cout_traitement?: number;
    gueri: boolean;
    animal_id?: string;
    batch_id?: string;
  }>;
  visites: Array<{
    id: string;
    date_visite: string;
    veterinaire?: string;
    motif?: string;
    diagnostic?: string;
    cout?: number;
    animaux_examines?: string;
    batch_id?: string;
  }>;
}

interface ProductionReportData {
  isModeBatch: boolean;
  cheptel: {
    total: number;
    par_categorie?: Record<string, number>;
    par_sexe?: Record<string, number>;
    par_statut?: Record<string, number>;
    batches?: Array<{
      id: string;
      nom: string;
      categorie: string;
      nombre: number;
      poids_moyen?: number;
      date_entree?: string;
    }>;
    animaux?: Array<{
      id: string;
      code: string;
      nom?: string;
      sexe: string;
      date_naissance?: string;
      statut: string;
      race?: string;
      reproducteur: boolean;
    }>;
  };
  pesees: Array<{
    id: string;
    animal_id?: string;
    batch_id?: string;
    date: string;
    poids_kg?: number;
    nombre?: number;
  }>;
  ventes: Array<{
    id: string;
    prix?: number;
    quantite_kg?: number;
    prix_kg?: number;
    date: string;
  }>;
}

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
 * Charge les données du rapport santé depuis l'API
 */
async function loadHealthReportData(
  projetId: string,
  dateDebut?: Date,
  dateFin?: Date
): Promise<HealthReportData> {
  try {
    const params: any = { projet_id: projetId };
    if (dateDebut) {
      params.date_debut = dateDebut.toISOString();
    }
    if (dateFin) {
      params.date_fin = dateFin.toISOString();
    }
    const data = await apiClient.get<HealthReportData>(`/reports/sante/data`, { params });
    return data;
  } catch (error) {
    logger.error('Erreur lors du chargement des données du rapport santé:', error);
    throw error;
  }
}

/**
 * Charge les données du rapport production depuis l'API
 */
async function loadProductionReportData(
  projetId: string,
  dateDebut?: Date,
  dateFin?: Date
): Promise<ProductionReportData> {
  try {
    const params: any = { projet_id: projetId };
    if (dateDebut) {
      params.date_debut = dateDebut.toISOString();
    }
    if (dateFin) {
      params.date_fin = dateFin.toISOString();
    }
    const data = await apiClient.get<ProductionReportData>(`/reports/production/data`, {
      params,
    });
    return data;
  } catch (error) {
    logger.error('Erreur lors du chargement des données du rapport production:', error);
    throw error;
  }
}

/**
 * Génère le HTML pour le rapport complet
 */
function generateCompleteReportHTML(
  projetNom: string,
  bilanData: BilanCompletData,
  healthData: HealthReportData,
  productionData: ProductionReportData
): string {
  const dateGeneration = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  const periodeFormatted = `${format(parseISO(bilanData.periode.date_debut), 'dd MMM yyyy', { locale: fr })} - ${format(parseISO(bilanData.periode.date_fin), 'dd MMM yyyy', { locale: fr })}`;

  // Calculer les métriques clés pour le résumé exécutif
  const peseesValides = productionData.pesees.filter((p) => p.poids_kg !== undefined && p.poids_kg > 0);
  const poidsMoyen = peseesValides.length > 0
    ? peseesValides.reduce((sum, p) => sum + (p.poids_kg || 0) * (p.nombre || 1), 0) /
      peseesValides.reduce((sum, p) => sum + (p.nombre || 1), 0)
    : 0;

  const totalVentes = productionData.ventes.filter((v) => v.prix !== undefined && v.prix > 0)
    .reduce((sum, v) => sum + (v.prix || 0), 0);

  const content = `
    ${generatePDFHeader(
      'Rapport Complet',
      `Compilation exhaustive - Période: ${periodeFormatted}`,
      projetNom
    )}

    <!-- Table des matières -->
    <div class="section">
      <h2>📑 Table des Matières</h2>
      <div class="card">
        <ol style="line-height: 2;">
          <li><a href="#resume-executif">Résumé Exécutif</a></li>
          <li><a href="#bilan-financier">Bilan Financier</a></li>
          <li><a href="#sante">Santé</a></li>
          <li><a href="#production">Production</a></li>
          <li><a href="#recommandations">Recommandations</a></li>
        </ol>
      </div>
    </div>

    <!-- Résumé Exécutif -->
    <div class="section page-break" id="resume-executif">
      <h2>📊 Résumé Exécutif</h2>
      <div class="card">
        <h3>Métriques Clés</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Solde Net</div>
            <div class="stat-value ${bilanData.resultats.solde >= 0 ? 'text-success' : 'text-danger'}">
              ${formatCurrency(bilanData.resultats.solde)}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Revenus</div>
            <div class="stat-value text-success">${formatCurrency(bilanData.revenus.total)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Dépenses</div>
            <div class="stat-value text-danger">${formatCurrency(bilanData.depenses.total)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Cheptel</div>
            <div class="stat-value" style="color: #42A5F5;">${productionData.cheptel.total}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Poids Moyen</div>
            <div class="stat-value" style="color: #42A5F5;">${poidsMoyen.toFixed(1)} kg</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Taux Mortalité</div>
            <div class="stat-value ${healthData.tauxMortalite > 5 ? 'text-danger' : healthData.tauxMortalite > 3 ? 'text-warning' : 'text-success'}">
              ${healthData.tauxMortalite.toFixed(2)}%
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Vaccinations</div>
            <div class="stat-value" style="color: #42A5F5;">${healthData.totalVaccinations}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Ventes</div>
            <div class="stat-value text-success">${formatCurrency(totalVentes)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bilan Financier -->
    <div class="section page-break" id="bilan-financier">
      <h2>💰 Bilan Financier</h2>
      
      <div class="card">
        <h3>Résultats Financiers</h3>
        <table>
          <tr>
            <td><strong>Solde Net</strong></td>
            <td class="text-right ${bilanData.resultats.solde >= 0 ? 'text-success' : 'text-danger'}">
              ${formatCurrency(bilanData.resultats.solde)}
            </td>
          </tr>
          <tr>
            <td>Marge Brute</td>
            <td class="text-right text-success">${formatCurrency(bilanData.resultats.marge_brute)}</td>
          </tr>
          <tr>
            <td>Cash Flow</td>
            <td class="text-right ${bilanData.resultats.cash_flow >= 0 ? 'text-success' : 'text-danger'}">
              ${formatCurrency(bilanData.resultats.cash_flow)}
            </td>
          </tr>
        </table>
      </div>

      <div class="card">
        <h3>Revenus</h3>
        <p><strong>Total :</strong> ${formatCurrency(bilanData.revenus.total)}</p>
        <p><strong>Nombre de transactions :</strong> ${bilanData.revenus.nombre_transactions}</p>
        ${Object.keys(bilanData.revenus.par_categorie).length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th class="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(bilanData.revenus.par_categorie)
              .map(([cat, montant]) => `
              <tr>
                <td>${cat}</td>
                <td class="text-right">${formatCurrency(montant)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
      </div>

      <div class="card">
        <h3>Dépenses</h3>
        <p><strong>Total :</strong> ${formatCurrency(bilanData.depenses.total)}</p>
        <p><strong>OPEX :</strong> ${formatCurrency(bilanData.depenses.opex_total)}</p>
        <p><strong>Charges fixes :</strong> ${formatCurrency(bilanData.depenses.charges_fixes_total)}</p>
        ${Object.keys(bilanData.depenses.par_categorie).length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th class="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(bilanData.depenses.par_categorie)
              .map(([cat, montant]) => `
              <tr>
                <td>${cat}</td>
                <td class="text-right">${formatCurrency(montant)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
      </div>

      <div class="card">
        <h3>Actifs</h3>
        <table>
          <tr>
            <td>Valeur du Cheptel</td>
            <td class="text-right">${formatCurrency(bilanData.actifs.valeur_cheptel)}</td>
          </tr>
          <tr>
            <td>Valeur des Stocks</td>
            <td class="text-right">${formatCurrency(bilanData.actifs.valeur_stocks)}</td>
          </tr>
          <tr style="border-top: 2px solid #333; font-weight: bold;">
            <td>Total Actifs</td>
            <td class="text-right text-success">${formatCurrency(bilanData.actifs.total)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Santé -->
    <div class="section page-break" id="sante">
      <h2>🏥 Santé</h2>
      
      <div class="card">
        <h3>Vue d'ensemble</h3>
        <table>
          <tr>
            <td>Total Vaccinations</td>
            <td class="text-right">${healthData.totalVaccinations}</td>
          </tr>
          <tr>
            <td>Total Mortalités</td>
            <td class="text-right">${healthData.totalMorts}</td>
          </tr>
          <tr>
            <td>Taux de Mortalité</td>
            <td class="text-right ${healthData.tauxMortalite > 5 ? 'text-danger' : healthData.tauxMortalite > 3 ? 'text-warning' : 'text-success'}">
              ${healthData.tauxMortalite.toFixed(2)}%
            </td>
          </tr>
          <tr>
            <td>Nombre de Maladies</td>
            <td class="text-right">${healthData.maladies.length}</td>
          </tr>
          <tr>
            <td>Visites Vétérinaires</td>
            <td class="text-right">${healthData.visites.length}</td>
          </tr>
        </table>
      </div>

      ${Object.keys(healthData.vaccinationsParType).length > 0 ? `
      <div class="card">
        <h3>Vaccinations par type</h3>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th class="text-right">Nombre</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(healthData.vaccinationsParType)
              .map(([type, count]) => `
              <tr>
                <td>${type}</td>
                <td class="text-right">${count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${Object.keys(healthData.mortalitesParCause).length > 0 ? `
      <div class="card">
        <h3>Mortalités par cause</h3>
        <table>
          <thead>
            <tr>
              <th>Cause</th>
              <th class="text-right">Nombre</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(healthData.mortalitesParCause)
              .map(([cause, count]) => `
              <tr>
                <td>${cause || 'Non spécifiée'}</td>
                <td class="text-right">${count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    </div>

    <!-- Production -->
    <div class="section page-break" id="production">
      <h2>🐷 Production</h2>
      
      <div class="card">
        <h3>Vue d'ensemble</h3>
        <table>
          <tr>
            <td>Total Cheptel</td>
            <td class="text-right">${productionData.cheptel.total}</td>
          </tr>
          <tr>
            <td>Poids Moyen</td>
            <td class="text-right">${poidsMoyen.toFixed(1)} kg</td>
          </tr>
          <tr>
            <td>Nombre de Pesées</td>
            <td class="text-right">${peseesValides.length}</td>
          </tr>
          <tr>
            <td>Total Ventes</td>
            <td class="text-right">${formatCurrency(totalVentes)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Recommandations -->
    <div class="section page-break" id="recommandations">
      <h2>💡 Recommandations</h2>
      <div class="card">
        <ul style="line-height: 2;">
          ${healthData.tauxMortalite > 5 ? `
          <li style="color: #dc3545; font-weight: bold;">
            ⚠️ <strong>URGENT :</strong> Taux de mortalité élevé (${healthData.tauxMortalite.toFixed(2)}%). 
            Consultez un vétérinaire et examinez les causes principales.
          </li>
          ` : healthData.tauxMortalite > 3 ? `
          <li style="color: #ffc107;">
            ⚠️ Taux de mortalité modéré (${healthData.tauxMortalite.toFixed(2)}%). 
            Surveillez de près la santé du cheptel.
          </li>
          ` : ''}
          ${healthData.totalVaccinations === 0 ? `
          <li style="color: #ffc107;">
            ⚠️ Aucune vaccination enregistrée. Assurez-vous que le calendrier de vaccination est à jour.
          </li>
          ` : ''}
          ${bilanData.resultats.solde < 0 ? `
          <li style="color: #dc3545;">
            ⚠️ Solde négatif. Examinez les dépenses et optimisez les coûts de production.
          </li>
          ` : ''}
          ${bilanData.indicateurs.cout_kg_opex > 0 && productionData.ventes.length > 0 ? `
          <li>
            💰 Coût de production : ${formatCurrency(bilanData.indicateurs.cout_kg_opex)}/kg. 
            Comparez avec le prix de vente moyen pour optimiser la rentabilité.
          </li>
          ` : ''}
          ${productionData.cheptel.total === 0 ? `
          <li style="color: #ffc107;">
            ⚠️ Aucun animal dans le cheptel. Enregistrez vos animaux pour commencer le suivi.
          </li>
          ` : ''}
          ${peseesValides.length === 0 ? `
          <li style="color: #ffc107;">
            ⚠️ Aucune pesée enregistrée. Les pesées régulières sont essentielles pour suivre la croissance.
          </li>
          ` : ''}
        </ul>
      </div>
    </div>

    ${generatePDFFooter()}
  `;

  return wrapHTMLContent(content);
}

/**
 * Génère le rapport complet en PDF
 */
export async function generateCompleteReportPDF(
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

    // Charger toutes les données en parallèle
    const [bilanData, healthData, productionData] = await Promise.all([
      loadBilanData(projetId, effectiveDateDebut, effectiveDateFin),
      loadHealthReportData(projetId, effectiveDateDebut, effectiveDateFin),
      loadProductionReportData(projetId, effectiveDateDebut, effectiveDateFin),
    ]);

    // Générer le HTML
    const html = generateCompleteReportHTML(projet.nom, bilanData, healthData, productionData);

    // Générer le nom de fichier
    const dateFormatted = format(new Date(), 'yyyy-MM-dd');
    const fileName = `Rapport_Complet_${projet.nom}_${dateFormatted}.pdf`;

    // Générer et partager le PDF
    await generateAndSharePDF(html, fileName);
  } catch (error: any) {
    logger.error('Erreur lors de la génération du rapport complet PDF:', error);
    throw new Error(`Impossible de générer le rapport complet: ${error.message || 'Erreur inconnue'}`);
  }
}

