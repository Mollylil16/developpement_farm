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
import type { Projet } from '../../types/projet';
import type { ChargeFixe, DepensePonctuelle, Revenu } from '../../types/finance';
import type { PerformanceGlobale } from '../../services/PerformanceGlobaleService';

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
  performanceGlobale?: PerformanceGlobale | null;
  dateDebut?: Date;
  dateFin?: Date;
}

/**
 * Génère le HTML pour le rapport Finance
 */
export function generateFinanceHTML(data: FinanceData): string {
  const { projet, chargesFixes, depensesPonctuelles, revenus, totaux, moyennes, performanceGlobale, dateDebut, dateFin } = data;

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
                <td>${depense.libelle_categorie || depense.commentaire || ''}</td>
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

    <!-- Performance Globale -->
    ${
      performanceGlobale
        ? `
    <div class="section page-break">
      <h2>📊 Performance Globale de Production</h2>
      ${
        dateDebut && dateFin
          ? `
      <p style="color: #666; font-size: 12px; margin-bottom: 15px;">
        Période analysée : ${formatDate(dateDebut)} au ${formatDate(dateFin)}
      </p>
      `
          : ''
      }
      
      <!-- Indicateurs de coût -->
      <div class="card" style="margin-bottom: 20px;">
        <h3 style="font-size: 16px; margin-bottom: 15px; color: #2c3e50;">💰 Coûts de Production</h3>
        <table style="font-size: 13px;">
          <tr>
            <td><strong>Coût moyen par kg (OPEX uniquement)</strong></td>
            <td class="text-right"><strong>${formatCurrency(performanceGlobale.cout_kg_opex_global)} FCFA/kg</strong></td>
          </tr>
          <tr>
            <td><strong>Coût moyen par kg (OPEX + CAPEX amorti)</strong></td>
            <td class="text-right"><strong>${formatCurrency(performanceGlobale.cout_kg_complet_global)} FCFA/kg</strong></td>
          </tr>
          <tr style="border-top: 1px solid #999;">
            <td><strong>Prix du marché (référence)</strong></td>
            <td class="text-right"><strong style="color: #2196F3;">${formatCurrency(performanceGlobale.prix_kg_marche)} FCFA/kg</strong></td>
          </tr>
          <tr style="border-top: 2px solid #333;">
            <td><strong>Écart (Prix marché - Coût complet)</strong></td>
            <td class="text-right">
              <strong style="color: ${performanceGlobale.ecart_absolu >= 0 ? '#2E7D32' : '#C62828'};">
                ${performanceGlobale.ecart_absolu >= 0 ? '+' : ''}${formatCurrency(performanceGlobale.ecart_absolu)} FCFA/kg
                (${performanceGlobale.ecart_pourcentage >= 0 ? '+' : ''}${performanceGlobale.ecart_pourcentage.toFixed(1)}%)
              </strong>
            </td>
          </tr>
          ${
            performanceGlobale.marge_realisee !== undefined
              ? `
          <tr style="border-top: 2px solid #333;">
            <td><strong>Marge réalisée sur la période</strong></td>
            <td class="text-right">
              <strong style="color: ${performanceGlobale.marge_realisee >= 0 ? '#2E7D32' : '#C62828'};">
                ${performanceGlobale.marge_realisee >= 0 ? '+' : ''}${formatCurrency(performanceGlobale.marge_realisee)} FCFA
              </strong>
            </td>
          </tr>
          `
              : ''
          }
        </table>
      </div>

      <!-- Détails des coûts -->
      <div class="card" style="margin-bottom: 20px;">
        <h3 style="font-size: 16px; margin-bottom: 15px; color: #2c3e50;">📋 Détails des Coûts</h3>
        <table style="font-size: 13px;">
          <tr>
            <td>Total OPEX (dépenses + charges fixes)</td>
            <td class="text-right">${formatCurrency(performanceGlobale.total_opex_global)} FCFA</td>
          </tr>
          <tr>
            <td>Total CAPEX amorti</td>
            <td class="text-right">${formatCurrency(performanceGlobale.total_amortissement_capex_global)} FCFA</td>
          </tr>
          <tr style="border-top: 1px solid #999;">
            <td><strong>Total coûts (OPEX + CAPEX)</strong></td>
            <td class="text-right"><strong>${formatCurrency(performanceGlobale.total_opex_global + performanceGlobale.total_amortissement_capex_global)} FCFA</strong></td>
          </tr>
          <tr style="border-top: 1px solid #999;">
            <td>Total kg vendus</td>
            <td class="text-right">${formatCurrency(performanceGlobale.total_kg_vendus_global, 0)} kg</td>
          </tr>
        </table>
      </div>

      <!-- Diagnostic -->
      <div class="card" style="margin-bottom: 20px; background: ${
        performanceGlobale.statut === 'rentable'
          ? '#e8f5e9'
          : performanceGlobale.statut === 'fragile'
          ? '#fff3e0'
          : '#ffebee'
      }; border-left: 4px solid ${
        performanceGlobale.statut === 'rentable'
          ? '#2E7D32'
          : performanceGlobale.statut === 'fragile'
          ? '#FF9800'
          : '#C62828'
      };">
        <h3 style="font-size: 16px; margin-bottom: 10px; color: #2c3e50;">
          ${performanceGlobale.statut === 'rentable' ? '✅' : performanceGlobale.statut === 'fragile' ? '⚠️' : '🚨'} 
          Diagnostic
        </h3>
        <p style="font-size: 13px; line-height: 1.6; color: #2c3e50;">
          ${performanceGlobale.message_diagnostic}
        </p>
      </div>

      <!-- Suggestions -->
      ${
        performanceGlobale.suggestions && performanceGlobale.suggestions.length > 0
          ? `
      <div class="card">
        <h3 style="font-size: 16px; margin-bottom: 15px; color: #2c3e50;">💡 Suggestions d'Amélioration</h3>
        <ul style="font-size: 13px; line-height: 1.8; color: #2c3e50; padding-left: 20px;">
          ${performanceGlobale.suggestions.map((suggestion) => `<li>${suggestion}</li>`).join('')}
        </ul>
      </div>
      `
          : ''
      }
    </div>
    `
        : ''
    }

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
        
        <div style="margin-top: 15px; padding: 10px; background: ${totaux.solde >= 0 ? '#e3f2fd' : '#f8d7da'}; border-radius: 6px;">
          <p style="text-align: center; font-size: 12px; color: ${totaux.solde >= 0 ? '#0d47a1' : '#721c24'};">
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
