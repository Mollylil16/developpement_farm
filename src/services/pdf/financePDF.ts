/**
 * Template PDF pour Vue d'ensemble Finance
 */

import {
  generatePDFHeader,
  generatePDFFooter,
  wrapHTMLContent,
  formatCurrency,
  formatDate,
  generateAndSharePDF,
} from '../pdfService';
import { Projet, ChargeFixe, DepensePonctuelle, Revenu } from '../../types';

interface FinanceData {
  projet: Projet;
  chargesFixes: ChargeFixe[];
  depensesPonctuelles: DepensePonctuelle[];
  revenus: Revenu[];
  totaux: {
    chargesFixes: number;
    depensesPonctuelles: number;
    totalDepenses: number;
    totalRevenus: number;
    solde: number;
  };
  moyennes: {
    depensesMensuelle: number;
    revenusMensuel: number;
  };
}

/**
 * Génère le HTML pour le rapport Finance
 */
export function generateFinanceHTML(data: FinanceData): string {
  const { projet, chargesFixes, depensesPonctuelles, revenus, totaux, moyennes } = data;

  const content = `
    ${generatePDFHeader(
      "Vue d'ensemble Financière",
      'Rapport détaillé des finances de votre exploitation',
      projet.nom
    )}

    <!-- Vue d'ensemble -->
    <div class="section">
      <h2>💰 Vue d'ensemble</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value text-danger">-${formatCurrency(totaux.totalDepenses)}</div>
          <div class="stat-label">Total Dépenses</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-success">+${formatCurrency(totaux.totalRevenus)}</div>
          <div class="stat-label">Total Revenus</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ${totaux.solde >= 0 ? 'text-success' : 'text-danger'}">
            ${formatCurrency(totaux.solde)}
          </div>
          <div class="stat-label">Solde Net</div>
        </div>
      </div>
    </div>

    <!-- Moyennes -->
    <div class="section">
      <h2>📊 Moyennes Mensuelles</h2>
      <div class="card">
        <table>
          <tr>
            <td>Dépenses moyennes/mois</td>
            <td class="text-right text-danger">${formatCurrency(moyennes.depensesMensuelle)}</td>
          </tr>
          <tr>
            <td>Revenus moyens/mois</td>
            <td class="text-right text-success">${formatCurrency(moyennes.revenusMensuel)}</td>
          </tr>
          <tr style="font-weight: bold; border-top: 2px solid #333;">
            <td>Balance mensuelle moyenne</td>
            <td class="text-right ${moyennes.revenusMensuel - moyennes.depensesMensuelle >= 0 ? 'text-success' : 'text-danger'}">
              ${formatCurrency(moyennes.revenusMensuel - moyennes.depensesMensuelle)}
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Charges fixes -->
    <div class="section">
      <h2>📌 Charges Fixes (${chargesFixes.length})</h2>
      <div class="card">
        <p><strong>Total :</strong> ${formatCurrency(totaux.chargesFixes)}</p>
        
        ${
          chargesFixes.length > 0
            ? `
        <table>
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Catégorie</th>
              <th>Fréquence</th>
              <th class="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${chargesFixes
              .slice(0, 20)
              .map(
                (charge) => `
              <tr>
                <td>${charge.libelle}</td>
                <td><span class="badge badge-info">${charge.categorie}</span></td>
                <td>${charge.frequence}</td>
                <td class="text-right">${formatCurrency(charge.montant)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        ${
          chargesFixes.length > 20
            ? `
          <p style="margin-top: 10px; font-size: 10px; color: #999;">
            ... et ${chargesFixes.length - 20} autre(s) charge(s) fixe(s)
          </p>
        `
            : ''
        }
        `
            : '<p style="color: #999;">Aucune charge fixe enregistrée</p>'
        }
      </div>
    </div>

    <!-- Dépenses ponctuelles -->
    <div class="section page-break">
      <h2>💸 Dépenses Ponctuelles (${depensesPonctuelles.length})</h2>
      <div class="card">
        <p><strong>Total :</strong> ${formatCurrency(totaux.depensesPonctuelles)}</p>
        
        ${
          depensesPonctuelles.length > 0
            ? `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Catégorie</th>
              <th class="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${depensesPonctuelles
              .slice(0, 30)
              .map(
                (depense) => `
              <tr>
                <td>${formatDate(depense.date)}</td>
                <td>${depense.libelle}</td>
                <td><span class="badge badge-warning">${depense.categorie}</span></td>
                <td class="text-right">${formatCurrency(depense.montant)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        ${
          depensesPonctuelles.length > 30
            ? `
          <p style="margin-top: 10px; font-size: 10px; color: #999;">
            ... et ${depensesPonctuelles.length - 30} autre(s) dépense(s)
          </p>
        `
            : ''
        }
        `
            : '<p style="color: #999;">Aucune dépense ponctuelle enregistrée</p>'
        }
      </div>
    </div>

    <!-- Revenus -->
    <div class="section page-break">
      <h2>💵 Revenus (${revenus.length})</h2>
      <div class="card">
        <p><strong>Total :</strong> ${formatCurrency(totaux.totalRevenus)}</p>
        
        ${
          revenus.length > 0
            ? `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Catégorie</th>
              <th>Description</th>
              <th class="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${revenus
              .slice(0, 30)
              .map(
                (revenu) => `
              <tr>
                <td>${formatDate(revenu.date)}</td>
                <td><span class="badge badge-success">${revenu.categorie}</span></td>
                <td>${revenu.description || '-'}</td>
                <td class="text-right"><strong>${formatCurrency(revenu.montant)}</strong></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        ${
          revenus.length > 30
            ? `
          <p style="margin-top: 10px; font-size: 10px; color: #999;">
            ... et ${revenus.length - 30} autre(s) revenu(s)
          </p>
        `
            : ''
        }
        `
            : '<p style="color: #999;">Aucun revenu enregistré</p>'
        }
      </div>
    </div>

    <!-- Résumé final -->
    <div class="section">
      <h2>📈 Résumé Final</h2>
      <div class="card">
        <table style="font-size: 13px;">
          <tr>
            <td><strong>Total des charges fixes</strong></td>
            <td class="text-right">${formatCurrency(totaux.chargesFixes)}</td>
          </tr>
          <tr>
            <td><strong>Total des dépenses ponctuelles</strong></td>
            <td class="text-right">${formatCurrency(totaux.depensesPonctuelles)}</td>
          </tr>
          <tr style="border-top: 1px solid #999;">
            <td><strong>Total des dépenses</strong></td>
            <td class="text-right text-danger"><strong>${formatCurrency(totaux.totalDepenses)}</strong></td>
          </tr>
          <tr style="border-top: 2px solid #333;">
            <td><strong>Total des revenus</strong></td>
            <td class="text-right text-success"><strong>${formatCurrency(totaux.totalRevenus)}</strong></td>
          </tr>
          <tr style="border-top: 3px double #333; font-size: 16px;">
            <td><strong>Solde net</strong></td>
            <td class="text-right ${totaux.solde >= 0 ? 'text-success' : 'text-danger'}">
              <strong>${formatCurrency(totaux.solde)}</strong>
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 15px; padding: 10px; background: ${totaux.solde >= 0 ? '#d4edda' : '#f8d7da'}; border-radius: 6px;">
          <p style="text-align: center; font-size: 12px; color: ${totaux.solde >= 0 ? '#155724' : '#721c24'};">
            ${
              totaux.solde >= 0
                ? '✅ Votre exploitation est bénéficiaire'
                : '⚠️ Votre exploitation est déficitaire'
            }
          </p>
        </div>
      </div>
    </div>

    ${generatePDFFooter()}
  `;

  return wrapHTMLContent(content);
}

/**
 * Génère et partage le rapport PDF Finance
 */
export async function exportFinancePDF(data: FinanceData): Promise<void> {
  const html = generateFinanceHTML(data);
  const fileName = `Finance_${data.projet.nom}_${new Date().toISOString().split('T')[0]}.pdf`;

  await generateAndSharePDF(html, fileName);
}
