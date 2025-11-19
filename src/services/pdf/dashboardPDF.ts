/**
 * Template PDF pour Vue d'ensemble (Dashboard)
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
import { Projet, ProductionAnimal } from '../../types';

interface DashboardData {
  projet: Projet;
  animaux: ProductionAnimal[];
  finances: {
    totalDepenses: number;
    totalRevenus: number;
    solde: number;
    chargesFixes: number;
    depensesPonctuelles: number;
  };
  production: {
    animauxActifs: number;
    peseesRecentes: number;
    poidsTotal: number;
    gmqMoyen: number;
  };
  reproduction: {
    gestationsEnCours: number;
    prochaineMiseBas: string | null;
    sevragesRecents: number;
  };
  alertes: Array<{
    type: string;
    message: string;
  }>;
}

/**
 * Génère le HTML pour le rapport Dashboard
 */
export function generateDashboardHTML(data: DashboardData): string {
  const { projet, finances, production, reproduction, alertes } = data;

  const content = `
    ${generatePDFHeader(
      'Vue d\'ensemble',
      'Rapport complet de votre exploitation',
      projet.nom
    )}

    <!-- Informations du projet -->
    <div class="section">
      <h2>📋 Informations du Projet</h2>
      <div class="card">
        <p><strong>Nom :</strong> ${projet.nom}</p>
        <p><strong>Localisation :</strong> ${projet.localisation}</p>
        <p><strong>Statut :</strong> <span class="badge badge-success">${projet.statut}</span></p>
        <p><strong>Effectifs :</strong></p>
        <ul>
          <li>${projet.nombre_truies} Truies</li>
          <li>${projet.nombre_verrats} Verrats</li>
          <li>${projet.nombre_porcelets} Porcelets</li>
        </ul>
      </div>
    </div>

    <!-- Vue financière -->
    <div class="section">
      <h2>💰 Vue Financière</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value text-danger">-${formatCurrency(finances.totalDepenses)}</div>
          <div class="stat-label">Total Dépenses</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-success">+${formatCurrency(finances.totalRevenus)}</div>
          <div class="stat-label">Total Revenus</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ${finances.solde >= 0 ? 'text-success' : 'text-danger'}">
            ${formatCurrency(finances.solde)}
          </div>
          <div class="stat-label">Solde</div>
        </div>
      </div>
      
      <div class="card">
        <h3>Détails des dépenses</h3>
        <table>
          <tr>
            <td>Charges fixes</td>
            <td class="text-right">${formatCurrency(finances.chargesFixes)}</td>
          </tr>
          <tr>
            <td>Dépenses ponctuelles</td>
            <td class="text-right">${formatCurrency(finances.depensesPonctuelles)}</td>
          </tr>
          <tr style="font-weight: bold; border-top: 2px solid #333;">
            <td>Total</td>
            <td class="text-right">${formatCurrency(finances.totalDepenses)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Production -->
    <div class="section">
      <h2>🐷 Production</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${production.animauxActifs}</div>
          <div class="stat-label">Animaux Actifs</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${production.peseesRecentes}</div>
          <div class="stat-label">Pesées Récentes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatNumber(production.poidsTotal, 0)} kg</div>
          <div class="stat-label">Poids Total</div>
        </div>
      </div>
      
      ${production.gmqMoyen > 0 ? `
      <div class="card">
        <p><strong>GMQ Moyen :</strong> ${formatNumber(production.gmqMoyen, 0)} g/jour</p>
        <p style="font-size: 10px; color: #666;">
          ℹ️ Basé sur les dernières pesées des animaux actifs
        </p>
      </div>
      ` : ''}
    </div>

    <!-- Reproduction -->
    <div class="section">
      <h2>🐖 Reproduction</h2>
      <div class="card">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${reproduction.gestationsEnCours}</div>
            <div class="stat-label">Gestations en cours</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${reproduction.sevragesRecents}</div>
            <div class="stat-label">Sevrages récents</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">
              ${reproduction.prochaineMiseBas ? formatDate(reproduction.prochaineMiseBas) : 'Aucune'}
            </div>
            <div class="stat-label">Prochaine mise bas</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Alertes -->
    ${alertes.length > 0 ? `
    <div class="section">
      <h2>⚠️ Alertes Actives (${alertes.length})</h2>
      <div class="card">
        ${alertes.slice(0, 10).map((alerte, index) => `
          <div style="padding: 8px 0; ${index < alertes.length - 1 ? 'border-bottom: 1px dashed #ddd;' : ''}">
            <span class="badge ${
              alerte.type === 'error' ? 'badge-danger' : 
              alerte.type === 'warning' ? 'badge-warning' : 
              'badge-info'
            }">${alerte.type.toUpperCase()}</span>
            <p style="margin-top: 5px; font-size: 11px;">${alerte.message}</p>
          </div>
        `).join('')}
        ${alertes.length > 10 ? `
          <p style="margin-top: 10px; font-size: 10px; color: #999;">
            ... et ${alertes.length - 10} autre(s) alerte(s)
          </p>
        ` : ''}
      </div>
    </div>
    ` : ''}

    ${generatePDFFooter()}
  `;

  return wrapHTMLContent(content);
}

/**
 * Génère et partage le rapport PDF du Dashboard
 */
export async function exportDashboardPDF(data: DashboardData): Promise<void> {
  const html = generateDashboardHTML(data);
  const fileName = `Dashboard_${data.projet.nom}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  await generateAndSharePDF(html, fileName);
}

