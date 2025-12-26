/**
 * Template PDF pour Indicateurs et Tendances (Rapports)
 */

import {
  generatePDFHeader,
  generatePDFFooter,
  wrapHTMLContent,
  formatCurrency,
  formatNumber,
  formatDate,
  generateAndSharePDF,
} from '../pdfService';
import type { Projet } from '../../types/projet';

// Type ProductionAnimal utilisé pour typer les données de production dans les tendances
type ProductionAnimal = {
  id: string;
  code?: string;
  race?: string;
  poids_initial?: number;
  date_naissance?: string;
};

interface RapportsData {
  projet: Projet;
  indicateurs: {
    gmqMoyen: number;
    tauxMortalite: number;
    tauxReproduction: number;
    coutProduction: number;
    efficaciteAlimentaire: number;
    poidsVifTotal: number;
    poidsCarcasseTotal: number;
    valeurEstimee: number;
  };
  production: {
    nombreAnimauxActifs: number;
    peseesEffectuees: number;
    gainPoidsTotal: number;
    joursProduction: number;
  };
  finance: {
    totalDepenses: number;
    totalRevenus: number;
    solde: number;
    rentabilite: number;
  };
  reproduction: {
    gestationsTerminees: number;
    porceletsNes: number;
    porceletsSevres: number;
    tauxSurvie: number;
  };
  tendances: {
    evolutionGMQ: Array<{ periode: string; valeur: number }>;
    evolutionPoids: Array<{ periode: string; valeur: number }>;
    evolutionFinance: Array<{ periode: string; depenses: number; revenus: number }>;
    // Utiliser ProductionAnimal pour typer les données d'animaux si disponibles
    animaux?: ProductionAnimal[];
  };
  recommandations: Array<{
    categorie: string;
    priorite: 'haute' | 'moyenne' | 'basse';
    message: string;
  }>;
}

/**
 * Génère le HTML pour le rapport Indicateurs et Tendances
 */
export function generateRapportsHTML(data: RapportsData): string {
  const { projet, indicateurs, production, finance, reproduction, tendances, recommandations } =
    data;

  const content = `
    ${generatePDFHeader(
      'Indicateurs et Tendances',
      'Rapport complet des performances de votre exploitation',
      projet.nom
    )}

    <!-- Indicateurs clés de performance -->
    <div class="section">
      <h2>📊 Indicateurs Clés de Performance (KPI)</h2>
      
      <h3>Production</h3>
      <div class="card">
        <table>
          <tr>
            <td><strong>GMQ Moyen</strong></td>
            <td class="text-right">
              <span style="font-size: 16px; font-weight: bold; color: ${
                indicateurs.gmqMoyen >= 600
                  ? '#28a745'
                  : indicateurs.gmqMoyen >= 400
                    ? '#ffc107'
                    : '#dc3545'
              }">
                ${formatNumber(indicateurs.gmqMoyen, 0)} g/jour
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Efficacité alimentaire</strong></td>
            <td class="text-right">${formatNumber(indicateurs.efficaciteAlimentaire, 2)}</td>
          </tr>
          <tr>
            <td><strong>Poids vif total</strong></td>
            <td class="text-right">${formatNumber(indicateurs.poidsVifTotal, 0)} kg</td>
          </tr>
          <tr>
            <td><strong>Poids carcasse estimé</strong></td>
            <td class="text-right">${formatNumber(indicateurs.poidsCarcasseTotal, 0)} kg</td>
          </tr>
        </table>
      </div>

      <h3>Reproduction</h3>
      <div class="card">
        <table>
          <tr>
            <td><strong>Taux de reproduction</strong></td>
            <td class="text-right">
              <span style="font-size: 16px; font-weight: bold; color: ${
                indicateurs.tauxReproduction >= 80
                  ? '#28a745'
                  : indicateurs.tauxReproduction >= 60
                    ? '#ffc107'
                    : '#dc3545'
              }">
                ${formatNumber(indicateurs.tauxReproduction, 1)}%
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Taux de mortalité</strong></td>
            <td class="text-right">
              <span style="font-size: 16px; font-weight: bold; color: ${
                indicateurs.tauxMortalite <= 5
                  ? '#28a745'
                  : indicateurs.tauxMortalite <= 10
                    ? '#ffc107'
                    : '#dc3545'
              }">
                ${formatNumber(indicateurs.tauxMortalite, 1)}%
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Taux de survie</strong></td>
            <td class="text-right">${formatNumber(reproduction.tauxSurvie, 1)}%</td>
          </tr>
        </table>
      </div>

      <h3>Finance</h3>
      <div class="card">
        <table>
          <tr>
            <td><strong>Coût de production</strong></td>
            <td class="text-right">${formatCurrency(indicateurs.coutProduction)}</td>
          </tr>
          <tr>
            <td><strong>Valeur estimée du cheptel</strong></td>
            <td class="text-right">${formatCurrency(indicateurs.valeurEstimee)}</td>
          </tr>
          <tr>
            <td><strong>Rentabilité</strong></td>
            <td class="text-right">
              <span style="font-size: 16px; font-weight: bold; color: ${
                finance.rentabilite >= 0 ? '#28a745' : '#dc3545'
              }">
                ${formatNumber(finance.rentabilite, 1)}%
              </span>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Détails Production -->
    <div class="section">
      <h2>🐷 Détails Production</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${production.nombreAnimauxActifs}</div>
          <div class="stat-label">Animaux Actifs</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${production.peseesEffectuees}</div>
          <div class="stat-label">Pesées Effectuées</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatNumber(production.gainPoidsTotal, 0)} kg</div>
          <div class="stat-label">Gain de Poids Total</div>
        </div>
      </div>
      <div class="card">
        <p><strong>Jours de production :</strong> ${production.joursProduction} jours</p>
        <p><strong>Gain moyen/jour :</strong> ${formatNumber(production.gainPoidsTotal / Math.max(production.joursProduction, 1), 2)} kg/jour</p>
      </div>
    </div>

    <!-- Détails Reproduction -->
    <div class="section">
      <h2>🐖 Détails Reproduction</h2>
      <div class="card">
        <table>
          <tr>
            <td>Gestations terminées</td>
            <td class="text-right"><strong>${reproduction.gestationsTerminees}</strong></td>
          </tr>
          <tr>
            <td>Porcelets nés</td>
            <td class="text-right"><strong>${reproduction.porceletsNes}</strong></td>
          </tr>
          <tr>
            <td>Porcelets sevrés</td>
            <td class="text-right"><strong>${reproduction.porceletsSevres}</strong></td>
          </tr>
          <tr>
            <td>Moyenne porcelets/portée</td>
            <td class="text-right">
              ${
                reproduction.gestationsTerminees > 0
                  ? formatNumber(reproduction.porceletsNes / reproduction.gestationsTerminees, 1)
                  : '0'
              }
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Détails Financiers -->
    <div class="section page-break">
      <h2>💰 Détails Financiers</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value text-danger">-${formatCurrency(finance.totalDepenses)}</div>
          <div class="stat-label">Total Dépenses</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-success">+${formatCurrency(finance.totalRevenus)}</div>
          <div class="stat-label">Total Revenus</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ${finance.solde >= 0 ? 'text-success' : 'text-danger'}">
            ${formatCurrency(finance.solde)}
          </div>
          <div class="stat-label">Solde Net</div>
        </div>
      </div>
      <div class="card">
        <p><strong>Coût moyen/animal :</strong> 
          ${
            production.nombreAnimauxActifs > 0
              ? formatCurrency(finance.totalDepenses / production.nombreAnimauxActifs)
              : 'N/A'
          }
        </p>
        <p><strong>Revenu moyen/animal :</strong> 
          ${
            production.nombreAnimauxActifs > 0
              ? formatCurrency(finance.totalRevenus / production.nombreAnimauxActifs)
              : 'N/A'
          }
        </p>
      </div>
    </div>

    <!-- Tendances -->
    <div class="section">
      <h2>📈 Évolution des Tendances</h2>
      
      ${
        tendances.evolutionGMQ.length > 0
          ? `
      <h3>Évolution du GMQ</h3>
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Période</th>
              <th class="text-right">GMQ (g/jour)</th>
              <th class="text-right">Variation</th>
            </tr>
          </thead>
          <tbody>
            ${tendances.evolutionGMQ
              .map((item, index) => {
                const variation =
                  index > 0
                    ? ((item.valeur - tendances.evolutionGMQ[index - 1].valeur) /
                        tendances.evolutionGMQ[index - 1].valeur) *
                      100
                    : 0;
                // Utiliser formatDate pour formater la période si c'est une date
                const periodeFormatee = /^\d{4}-\d{2}-\d{2}/.test(item.periode)
                  ? formatDate(item.periode)
                  : item.periode;
                return `
                <tr>
                  <td>${periodeFormatee}</td>
                  <td class="text-right"><strong>${formatNumber(item.valeur, 0)}</strong></td>
                  <td class="text-right ${variation >= 0 ? 'text-success' : 'text-danger'}">
                    ${index > 0 ? (variation >= 0 ? '+' : '') + formatNumber(variation, 1) + '%' : '-'}
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      `
          : ''
      }

      ${
        tendances.evolutionFinance.length > 0
          ? `
      <h3>Évolution Financière</h3>
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Période</th>
              <th class="text-right">Dépenses</th>
              <th class="text-right">Revenus</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${tendances.evolutionFinance
              .map((item) => {
                const balance = item.revenus - item.depenses;
                // Utiliser formatDate pour formater la période si c'est une date
                const periodeFormatee = /^\d{4}-\d{2}-\d{2}/.test(item.periode)
                  ? formatDate(item.periode)
                  : item.periode;
                return `
                <tr>
                  <td>${periodeFormatee}</td>
                  <td class="text-right text-danger">${formatCurrency(item.depenses)}</td>
                  <td class="text-right text-success">${formatCurrency(item.revenus)}</td>
                  <td class="text-right ${balance >= 0 ? 'text-success' : 'text-danger'}">
                    <strong>${formatCurrency(balance)}</strong>
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      `
          : ''
      }
    </div>

    <!-- Recommandations -->
    ${
      recommandations.length > 0
        ? `
    <div class="section page-break">
      <h2>💡 Recommandations</h2>
      ${recommandations
        .map(
          (rec) => `
        <div class="card" style="margin-bottom: 10px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span class="badge ${
              rec.priorite === 'haute'
                ? 'badge-danger'
                : rec.priorite === 'moyenne'
                  ? 'badge-warning'
                  : 'badge-info'
            }" style="margin-right: 10px;">
              ${rec.priorite.toUpperCase()}
            </span>
            <strong>${rec.categorie}</strong>
          </div>
          <p style="font-size: 11px; line-height: 1.5;">${rec.message}</p>
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${generatePDFFooter()}
  `;

  return wrapHTMLContent(content);
}

/**
 * Génère et partage le rapport PDF Indicateurs et Tendances
 */
export async function exportRapportsPDF(data: RapportsData): Promise<void> {
  const html = generateRapportsHTML(data);
  const fileName = `Rapports_${data.projet.nom}_${new Date().toISOString().split('T')[0]}.pdf`;

  await generateAndSharePDF(html, fileName);
}
