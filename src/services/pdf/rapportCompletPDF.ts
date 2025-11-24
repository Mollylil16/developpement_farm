/**
 * Template PDF pour Rapport Complet
 * Contient TOUTES les informations : Dashboard, Finance, et Rapports dans un seul document
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
import {
  Projet,
  ProductionAnimal,
  ChargeFixe,
  DepensePonctuelle,
  Revenu,
  Gestation,
  Sevrage,
} from '../../types';

interface RapportCompletData {
  projet: Projet;

  // Dashboard
  animaux: ProductionAnimal[];
  finances: {
    totalDepenses: number;
    totalRevenus: number;
    solde: number;
    chargesFixes: number;
    depensesPonctuelles: number;
  };
  productionDashboard: {
    animauxActifs: number;
    peseesRecentes: number;
    poidsTotal: number;
    gmqMoyen: number;
  };
  reproductionDashboard: {
    gestationsEnCours: number;
    prochaineMiseBas: string | null;
    sevragesRecents: number;
  };

  // Finance détaillée
  chargesFixes: ChargeFixe[];
  depensesPonctuelles: DepensePonctuelle[];
  revenus: Revenu[];
  totauxFinance: {
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

  // Indicateurs de performance
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
  financeIndicateurs: {
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
  recommandations: Array<{
    categorie: string;
    priorite: 'haute' | 'moyenne' | 'basse';
    message: string;
  }>;
}

/**
 * Génère le HTML pour le rapport complet
 */
export function generateRapportCompletHTML(data: RapportCompletData): string {
  const {
    projet,
    finances,
    productionDashboard,
    reproductionDashboard,
    chargesFixes,
    depensesPonctuelles,
    revenus,
    totauxFinance,
    moyennes,
    indicateurs,
    production,
    financeIndicateurs,
    reproduction,
    recommandations,
  } = data;

  const content = `
    ${generatePDFHeader(
      'Rapport Complet',
      "Vue d'ensemble complète de votre exploitation",
      projet.nom
    )}

    <!-- TABLE DES MATIÈRES -->
    <div class="section">
      <h2>📑 Table des Matières</h2>
      <div class="card">
        <ol style="line-height: 1.8; font-size: 12px;">
          <li><strong>Vue d'ensemble</strong> - État général de l'exploitation</li>
          <li><strong>Finances Détaillées</strong> - Charges, Dépenses, Revenus</li>
          <li><strong>Indicateurs de Performance</strong> - KPIs et Analyse</li>
          <li><strong>Recommandations</strong> - Actions à entreprendre</li>
        </ol>
      </div>
    </div>

    <!-- ========================================= -->
    <!-- PARTIE 1 : VUE D'ENSEMBLE (DASHBOARD) -->
    <!-- ========================================= -->
    <div class="page-break"></div>
    <h1 style="margin-top: 30px;">1. Vue d'ensemble</h1>

    <!-- Informations du projet -->
    <div class="section">
      <h2>📋 Informations du Projet</h2>
      <div class="card">
        <p><strong>Nom :</strong> ${projet.nom}</p>
        <p><strong>Localisation :</strong> ${projet.localisation}</p>
        <p><strong>Statut :</strong> <span class="badge badge-success">${projet.statut}</span></p>
        <p><strong>Effectifs :</strong></p>
        <ul style="margin-left: 20px;">
          <li>${projet.nombre_truies} Truies</li>
          <li>${projet.nombre_verrats} Verrats</li>
          <li>${projet.nombre_porcelets} Porcelets</li>
        </ul>
      </div>
    </div>

    <!-- Vue financière -->
    <div class="section">
      <h2>💰 Situation Financière</h2>
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
          <div class="stat-label">Solde Net</div>
        </div>
      </div>
    </div>

    <!-- Production -->
    <div class="section">
      <h2>🐷 Production</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${productionDashboard.animauxActifs}</div>
          <div class="stat-label">Animaux Actifs</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${productionDashboard.peseesRecentes}</div>
          <div class="stat-label">Pesées Récentes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatNumber(productionDashboard.poidsTotal, 0)} kg</div>
          <div class="stat-label">Poids Total</div>
        </div>
      </div>
      ${
        productionDashboard.gmqMoyen > 0
          ? `
      <div class="card">
        <p><strong>GMQ Moyen :</strong> ${formatNumber(productionDashboard.gmqMoyen, 0)} g/jour</p>
      </div>
      `
          : ''
      }
    </div>

    <!-- Reproduction -->
    <div class="section">
      <h2>🐖 Reproduction</h2>
      <div class="card">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${reproductionDashboard.gestationsEnCours}</div>
            <div class="stat-label">Gestations en cours</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${reproductionDashboard.sevragesRecents}</div>
            <div class="stat-label">Sevrages récents</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">
              ${reproductionDashboard.prochaineMiseBas ? formatDate(reproductionDashboard.prochaineMiseBas) : 'Aucune'}
            </div>
            <div class="stat-label">Prochaine mise bas</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================= -->
    <!-- PARTIE 2 : FINANCES DÉTAILLÉES -->
    <!-- ========================================= -->
    <div class="page-break"></div>
    <h1 style="margin-top: 30px;">2. Finances Détaillées</h1>

    <!-- Vue d'ensemble financière -->
    <div class="section">
      <h2>💰 Vue d'ensemble</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value text-danger">-${formatCurrency(totauxFinance.totalDepenses)}</div>
          <div class="stat-label">Total Dépenses</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-success">+${formatCurrency(totauxFinance.totalRevenus)}</div>
          <div class="stat-label">Total Revenus</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ${totauxFinance.solde >= 0 ? 'text-success' : 'text-danger'}">
            ${formatCurrency(totauxFinance.solde)}
          </div>
          <div class="stat-label">Solde Net</div>
        </div>
      </div>
    </div>

    <!-- Moyennes mensuelles -->
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
        <p><strong>Total :</strong> ${formatCurrency(totauxFinance.chargesFixes)}</p>
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
              .slice(0, 15)
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
        ${chargesFixes.length > 15 ? `<p style="margin-top: 10px; font-size: 10px; color: #999;">... et ${chargesFixes.length - 15} autre(s) charge(s)</p>` : ''}
        `
            : '<p style="color: #999;">Aucune charge fixe</p>'
        }
      </div>
    </div>

    <!-- Dépenses ponctuelles -->
    <div class="section">
      <h2>💸 Dépenses Ponctuelles (${depensesPonctuelles.length})</h2>
      <div class="card">
        <p><strong>Total :</strong> ${formatCurrency(totauxFinance.depensesPonctuelles)}</p>
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
              .slice(0, 15)
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
        ${depensesPonctuelles.length > 15 ? `<p style="margin-top: 10px; font-size: 10px; color: #999;">... et ${depensesPonctuelles.length - 15} autre(s) dépense(s)</p>` : ''}
        `
            : '<p style="color: #999;">Aucune dépense ponctuelle</p>'
        }
      </div>
    </div>

    <!-- Revenus -->
    <div class="section">
      <h2>💵 Revenus (${revenus.length})</h2>
      <div class="card">
        <p><strong>Total :</strong> ${formatCurrency(totauxFinance.totalRevenus)}</p>
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
              .slice(0, 15)
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
        ${revenus.length > 15 ? `<p style="margin-top: 10px; font-size: 10px; color: #999;">... et ${revenus.length - 15} autre(s) revenu(s)</p>` : ''}
        `
            : '<p style="color: #999;">Aucun revenu</p>'
        }
      </div>
    </div>

    <!-- ========================================= -->
    <!-- PARTIE 3 : INDICATEURS DE PERFORMANCE -->
    <!-- ========================================= -->
    <div class="page-break"></div>
    <h1 style="margin-top: 30px;">3. Indicateurs de Performance</h1>

    <!-- KPIs principaux -->
    <div class="section">
      <h2>📊 Indicateurs Clés (KPI)</h2>
      
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
            <td><strong>Valeur estimée</strong></td>
            <td class="text-right">${formatCurrency(indicateurs.valeurEstimee)}</td>
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
            <td><strong>Rentabilité</strong></td>
            <td class="text-right">
              <span style="font-size: 16px; font-weight: bold; color: ${
                financeIndicateurs.rentabilite >= 0 ? '#28a745' : '#dc3545'
              }">
                ${formatNumber(financeIndicateurs.rentabilite, 1)}%
              </span>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Détails -->
    <div class="section">
      <h2>📈 Détails Production & Reproduction</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${production.nombreAnimauxActifs}</div>
          <div class="stat-label">Animaux Actifs</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reproduction.porceletsNes}</div>
          <div class="stat-label">Porcelets nés</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reproduction.porceletsSevres}</div>
          <div class="stat-label">Porcelets sevrés</div>
        </div>
      </div>
    </div>

    <!-- ========================================= -->
    <!-- PARTIE 4 : RECOMMANDATIONS -->
    <!-- ========================================= -->
    ${
      recommandations.length > 0
        ? `
    <div class="page-break"></div>
    <h1 style="margin-top: 30px;">4. Recommandations</h1>
    <div class="section">
      <h2>💡 Actions Recommandées</h2>
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

    <!-- Résumé final -->
    <div class="section">
      <h2>📌 Résumé Final</h2>
      <div class="card">
        <table style="font-size: 13px;">
          <tr style="border-bottom: 2px solid #333;">
            <td><strong>Total des dépenses</strong></td>
            <td class="text-right text-danger"><strong>${formatCurrency(totauxFinance.totalDepenses)}</strong></td>
          </tr>
          <tr style="border-bottom: 2px solid #333;">
            <td><strong>Total des revenus</strong></td>
            <td class="text-right text-success"><strong>${formatCurrency(totauxFinance.totalRevenus)}</strong></td>
          </tr>
          <tr style="border-top: 3px double #333; font-size: 16px;">
            <td><strong>Solde net</strong></td>
            <td class="text-right ${totauxFinance.solde >= 0 ? 'text-success' : 'text-danger'}">
              <strong>${formatCurrency(totauxFinance.solde)}</strong>
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 15px; padding: 10px; background: ${totauxFinance.solde >= 0 ? '#d4edda' : '#f8d7da'}; border-radius: 6px;">
          <p style="text-align: center; font-size: 12px; color: ${totauxFinance.solde >= 0 ? '#155724' : '#721c24'};">
            ${
              totauxFinance.solde >= 0
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
 * Génère et partage le rapport PDF complet
 */
export async function exportRapportCompletPDF(data: RapportCompletData): Promise<void> {
  const html = generateRapportCompletHTML(data);
  const fileName = `Rapport_Complet_${data.projet.nom}_${new Date().toISOString().split('T')[0]}.pdf`;

  await generateAndSharePDF(html, fileName);
}
