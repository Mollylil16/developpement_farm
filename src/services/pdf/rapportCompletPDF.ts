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
  generateLineChartSVG,
  generateBarChartSVG,
  generatePieChartSVG,
  generateChartAnalysis,
} from './chartGenerators';
import type { Projet } from '../../types/projet';
import type { ProductionAnimal } from '../../types/production';
import type { ChargeFixe, DepensePonctuelle, Revenu } from '../../types/finance';

// Types utilisés pour typer les données de reproduction dans le rapport
type Gestation = {
  id: string;
  animal_id: string;
  date_saillie: string;
  date_mise_bas_prevue: string;
  statut: string;
};

type Sevrage = {
  id: string;
  animal_id: string;
  date_sevrage: string;
  nombre_porcelets: number;
};

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
    // Utiliser les types Gestation et Sevrage pour typer les données si disponibles
    gestations?: Gestation[];
    sevrages?: Sevrage[];
  };
  recommandations: Array<{
    categorie: string;
    priorite: 'haute' | 'moyenne' | 'basse';
    message: string;
  }>;
  
  // Données pour les graphiques
  graphiques?: {
    // Graphiques financiers
    depensesPlanifieVsReel?: {
      labels: string[];
      planifie: number[];
      reel: number[];
      revenus: number[];
    };
    depensesParCategorie?: Array<{ name: string; value: number; color: string }>;
    revenusParCategorie?: Array<{ name: string; value: number; color: string }>;
    opexVsCapex?: {
      labels: string[];
      opex: number[];
      capex: number[];
    };
    // Graphiques de production
    evolutionPoids?: {
      labels: string[];
      poidsMoyen: number[];
    };
    mortalites?: {
      labels: string[];
      nombre: number[];
    };
    gmq?: {
      labels: string[];
      gmq: number[];
    };
  };
}

/**
 * Génère une analyse détaillée pour une section
 */
function generateSectionAnalysis(
  section: string,
  data: any,
  context: RapportCompletData
): string {
  let analysis = '';

  if (section === 'finances') {
    const { totauxFinance, moyennes } = data;
    const solde = totauxFinance.solde;
    const ratioDepensesRevenus = totauxFinance.totalRevenus > 0 
      ? (totauxFinance.totalDepenses / totauxFinance.totalRevenus) * 100 
      : 0;

    analysis = `
      <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; margin-top: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #1976D2;">📊 Analyse Financière Détaillée</h4>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Situation globale :</strong> 
          ${solde >= 0 
            ? `Votre exploitation est <strong style="color: #2e7d32;">bénéficiaire</strong> avec un solde net de ${formatCurrency(solde)}. 
               Cette situation positive indique une bonne gestion financière.` 
            : `Votre exploitation présente un <strong style="color: #c62828;">déficit</strong> de ${formatCurrency(Math.abs(solde))}. 
               Il est recommandé d'analyser les dépenses et d'optimiser les coûts.`}
        </p>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Ratio dépenses/revenus :</strong> ${formatNumber(ratioDepensesRevenus, 1)}%
          ${ratioDepensesRevenus > 100 
            ? '- Les dépenses dépassent les revenus, situation critique nécessitant une action immédiate.'
            : ratioDepensesRevenus > 80 
              ? '- Les dépenses représentent une part importante des revenus, vigilance recommandée.'
              : '- Les dépenses sont bien maîtrisées par rapport aux revenus.'}
        </p>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Moyennes mensuelles :</strong> 
          Dépenses moyennes de ${formatCurrency(moyennes.depensesMensuelle)}/mois, 
          revenus moyens de ${formatCurrency(moyennes.revenusMensuel)}/mois. 
          ${moyennes.revenusMensuel > moyennes.depensesMensuelle 
            ? 'La balance mensuelle est positive, ce qui est un bon signe pour la pérennité de l\'exploitation.'
            : 'La balance mensuelle est négative, il faut augmenter les revenus ou réduire les dépenses.'}
        </p>
      </div>
    `;
  } else if (section === 'production') {
    const { production, indicateurs } = data;
    const gmq = indicateurs.gmqMoyen;
    const efficacite = indicateurs.efficaciteAlimentaire;

    analysis = `
      <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; margin-top: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #1976D2;">📊 Analyse de Production</h4>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Performance de croissance :</strong> 
          Le GMQ moyen de ${formatNumber(gmq, 0)} g/jour 
          ${gmq >= 600 
            ? 'est <strong style="color: #2e7d32;">excellent</strong> et indique une croissance optimale des animaux.'
            : gmq >= 400 
              ? 'est <strong style="color: #ff9800;">acceptable</strong> mais peut être amélioré avec une meilleure alimentation et gestion.'
              : 'est <strong style="color: #c62828;">faible</strong> et nécessite une attention particulière sur l\'alimentation, la santé et les conditions d\'élevage.'}
        </p>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Efficacité alimentaire :</strong> 
          ${formatNumber(efficacite, 2)} 
          ${efficacite <= 3.5 
            ? '- Excellente conversion alimentaire, les animaux utilisent efficacement la nourriture.'
            : efficacite <= 4.5 
              ? '- Conversion alimentaire correcte, mais il y a une marge d\'amélioration possible.'
              : '- La conversion alimentaire est élevée, il faut optimiser l\'alimentation pour réduire les coûts.'}
        </p>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Cheptel actif :</strong> 
          ${production.nombreAnimauxActifs} animaux actifs avec ${production.peseesEffectuees} pesées effectuées. 
          ${production.peseesEffectuees / production.nombreAnimauxActifs >= 2 
            ? 'Le suivi du poids est régulier, ce qui permet un bon contrôle de la croissance.'
            : 'Il serait bénéfique d\'augmenter la fréquence des pesées pour un meilleur suivi.'}
        </p>
      </div>
    `;
  } else if (section === 'reproduction') {
    const { reproduction } = data;
    const tauxSurvie = reproduction.tauxSurvie;

    analysis = `
      <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; margin-top: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #1976D2;">📊 Analyse de Reproduction</h4>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Performance de reproduction :</strong> 
          ${reproduction.porceletsNes} porcelets nés, ${reproduction.porceletsSevres} sevrés, 
          avec un taux de survie de ${formatNumber(tauxSurvie, 1)}%.
          ${tauxSurvie >= 85 
            ? 'Le taux de survie est <strong style="color: #2e7d32;">excellent</strong>, indiquant une bonne gestion de la maternité et du sevrage.'
            : tauxSurvie >= 70 
              ? 'Le taux de survie est <strong style="color: #ff9800;">acceptable</strong> mais peut être amélioré par une meilleure surveillance sanitaire et nutritionnelle.'
              : 'Le taux de survie est <strong style="color: #c62828;">préoccupant</strong>, une analyse approfondie des causes de mortalité est nécessaire.'}
        </p>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Gestations :</strong> 
          ${reproduction.gestationsTerminees} gestations terminées. 
          ${reproduction.gestationsTerminees > 0 
            ? 'La reproduction est active, ce qui est positif pour le renouvellement du cheptel.'
            : 'Aucune gestation terminée enregistrée, il faut vérifier le suivi de la reproduction.'}
        </p>
      </div>
    `;
  } else if (section === 'sante') {
    const { indicateurs } = data;
    const tauxMortalite = indicateurs.tauxMortalite;

    analysis = `
      <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; margin-top: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #1976D2;">📊 Analyse Sanitaire</h4>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Taux de mortalité :</strong> 
          ${formatNumber(tauxMortalite, 2)}%
          ${tauxMortalite <= 5 
            ? '- Le taux de mortalité est <strong style="color: #2e7d32;">excellent</strong>, indiquant une bonne santé du cheptel et une gestion sanitaire efficace.'
            : tauxMortalite <= 10 
              ? '- Le taux de mortalité est <strong style="color: #ff9800;">acceptable</strong> mais nécessite une surveillance accrue et des mesures préventives.'
              : '- Le taux de mortalité est <strong style="color: #c62828;">élevé</strong>, une intervention urgente est nécessaire pour identifier et corriger les causes.'}
        </p>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.7; color: #333;">
          <strong>Recommandations sanitaires :</strong> 
          ${tauxMortalite > 10 
            ? 'Renforcer les protocoles sanitaires, améliorer les conditions d\'élevage, et consulter un vétérinaire pour un diagnostic approfondi.'
            : tauxMortalite > 5 
              ? 'Maintenir les bonnes pratiques sanitaires et surveiller régulièrement l\'état de santé des animaux.'
              : 'Continuer les bonnes pratiques sanitaires actuelles qui donnent d\'excellents résultats.'}
        </p>
      </div>
    `;
  }

  return analysis;
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
    graphiques,
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
      
      ${generateSectionAnalysis('finances', { totauxFinance, moyennes }, data)}
    </div>
    
    <!-- Graphique Dépenses Planifiées vs Réelles -->
    ${
      graphiques?.depensesPlanifieVsReel && graphiques.depensesPlanifieVsReel.labels.length > 0
        ? `
    <div class="section">
      <h2>📈 Évolution des Dépenses (6 derniers mois)</h2>
      <div class="card">
        ${generateLineChartSVG(
          graphiques.depensesPlanifieVsReel.labels,
          [
            {
              label: 'Planifié',
              data: graphiques.depensesPlanifieVsReel.planifie,
              color: '#2E7D32',
            },
            {
              label: 'Réel',
              data: graphiques.depensesPlanifieVsReel.reel,
              color: '#FF9800',
            },
            {
              label: 'Revenus',
              data: graphiques.depensesPlanifieVsReel.revenus,
              color: '#2196F3',
            },
          ],
          700,
          250
        )}
        ${generateChartAnalysis('line', {
          labels: graphiques.depensesPlanifieVsReel.labels,
          datasets: [
            { label: 'Planifié', data: graphiques.depensesPlanifieVsReel.planifie, color: '#2E7D32' },
            { label: 'Réel', data: graphiques.depensesPlanifieVsReel.reel, color: '#FF9800' },
            { label: 'Revenus', data: graphiques.depensesPlanifieVsReel.revenus, color: '#2196F3' },
          ],
        }, 'finances')}
        <div style="margin-top: 15px; padding: 12px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #856404;">
            <strong>💡 Interprétation :</strong> 
            Ce graphique compare les dépenses planifiées (charges fixes), les dépenses réelles (dépenses ponctuelles) 
            et les revenus sur les 6 derniers mois. 
            ${graphiques.depensesPlanifieVsReel.reel.reduce((a, b) => a + b, 0) > graphiques.depensesPlanifieVsReel.planifie.reduce((a, b) => a + b, 0)
              ? 'Les dépenses réelles dépassent les dépenses planifiées, indiquant des coûts imprévus. Il est recommandé de revoir le budget et d\'identifier les postes de dépenses non prévus.'
              : 'Les dépenses réelles sont conformes ou inférieures aux dépenses planifiées, ce qui indique une bonne maîtrise budgétaire.'}
            ${graphiques.depensesPlanifieVsReel.revenus.reduce((a, b) => a + b, 0) > graphiques.depensesPlanifieVsReel.reel.reduce((a, b) => a + b, 0)
              ? ' Les revenus couvrent les dépenses, ce qui est positif pour la rentabilité.'
              : ' Les revenus ne couvrent pas entièrement les dépenses, il faut augmenter les ventes ou réduire les coûts.'}
          </p>
        </div>
      </div>
    </div>
    `
        : ''
    }

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
                <td>${depense.libelle_categorie || depense.commentaire || ''}</td>
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
    
    <!-- Graphique Répartition des Dépenses par Catégorie -->
    ${
      graphiques?.depensesParCategorie && graphiques.depensesParCategorie.length > 0
        ? `
    <div class="section">
      <h2>📊 Répartition des Dépenses par Catégorie</h2>
      <div class="card">
        ${generatePieChartSVG(graphiques.depensesParCategorie, 500, 350)}
        ${generateChartAnalysis('pie', graphiques.depensesParCategorie, 'finances')}
        <div style="margin-top: 15px; padding: 12px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #856404;">
            <strong>💡 Interprétation :</strong> 
            Ce graphique montre la répartition des dépenses par catégorie. 
            Identifier les catégories les plus importantes permet d'optimiser les coûts en se concentrant sur les postes de dépenses les plus significatifs.
            ${graphiques.depensesParCategorie.length > 0 
              ? `La catégorie "${graphiques.depensesParCategorie[0].name}" représente la plus grande part des dépenses.`
              : ''}
          </p>
        </div>
      </div>
    </div>
    `
        : ''
    }
    
    <!-- Graphique Répartition des Revenus par Catégorie -->
    ${
      graphiques?.revenusParCategorie && graphiques.revenusParCategorie.length > 0
        ? `
    <div class="section">
      <h2>📊 Répartition des Revenus par Catégorie</h2>
      <div class="card">
        ${generatePieChartSVG(graphiques.revenusParCategorie, 500, 350)}
        ${generateChartAnalysis('pie', graphiques.revenusParCategorie, 'finances')}
        <div style="margin-top: 15px; padding: 12px; background: #d1ecf1; border-radius: 6px; border-left: 4px solid #0c5460;">
          <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #0c5460;">
            <strong>💡 Interprétation :</strong> 
            Ce graphique montre la répartition des revenus par source. 
            ${graphiques.revenusParCategorie.length > 0 
              ? `La source "${graphiques.revenusParCategorie[0].name}" génère la majorité des revenus.`
              : ''}
            Une diversification des sources de revenus peut améliorer la stabilité financière de l'exploitation.
          </p>
        </div>
      </div>
    </div>
    `
        : ''
    }

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
                  ? '#1976D2'
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
                  ? '#1976D2'
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
                  ? '#1976D2'
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
                financeIndicateurs.rentabilite >= 0 ? '#1976D2' : '#dc3545'
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
      
      ${generateSectionAnalysis('production', { production, indicateurs }, data)}
      ${generateSectionAnalysis('reproduction', { reproduction }, data)}
      ${generateSectionAnalysis('sante', { indicateurs }, data)}
    </div>
    
    <!-- Graphique Évolution du Poids -->
    ${
      graphiques?.evolutionPoids && graphiques.evolutionPoids.labels.length > 0
        ? `
    <div class="section">
      <h2>📈 Évolution du Poids Moyen</h2>
      <div class="card">
        ${generateLineChartSVG(
          graphiques.evolutionPoids.labels,
          [
            {
              label: 'Poids moyen (kg)',
              data: graphiques.evolutionPoids.poidsMoyen,
              color: '#2E7D32',
            },
          ],
          700,
          250
        )}
        ${generateChartAnalysis('line', {
          labels: graphiques.evolutionPoids.labels,
          datasets: [{ label: 'Poids moyen', data: graphiques.evolutionPoids.poidsMoyen, color: '#2E7D32' }],
        }, 'production')}
        <div style="margin-top: 15px; padding: 12px; background: #d1ecf1; border-radius: 6px; border-left: 4px solid #0c5460;">
          <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #0c5460;">
            <strong>💡 Interprétation :</strong> 
            Ce graphique montre l'évolution du poids moyen du cheptel au fil du temps. 
            ${graphiques.evolutionPoids.poidsMoyen.length > 1 
              ? graphiques.evolutionPoids.poidsMoyen[graphiques.evolutionPoids.poidsMoyen.length - 1] > graphiques.evolutionPoids.poidsMoyen[0]
                ? 'Une tendance à la hausse indique une bonne croissance des animaux.'
                : 'Une tendance à la baisse nécessite une analyse des causes (alimentation, santé, conditions d\'élevage).'
              : ''}
            Une croissance régulière et constante est le signe d'une bonne gestion de l'alimentation et des conditions d'élevage.
          </p>
        </div>
      </div>
    </div>
    `
        : ''
    }
    
    <!-- Graphique Évolution du GMQ -->
    ${
      graphiques?.gmq && graphiques.gmq.labels.length > 0
        ? `
    <div class="section">
      <h2>📈 Évolution du GMQ (Gain Moyen Quotidien)</h2>
      <div class="card">
        ${generateLineChartSVG(
          graphiques.gmq.labels,
          [
            {
              label: 'GMQ (g/jour)',
              data: graphiques.gmq.gmq,
              color: '#2196F3',
            },
          ],
          700,
          250
        )}
        ${generateChartAnalysis('line', {
          labels: graphiques.gmq.labels,
          datasets: [{ label: 'GMQ', data: graphiques.gmq.gmq, color: '#2196F3' }],
        }, 'production')}
        <div style="margin-top: 15px; padding: 12px; background: #d1ecf1; border-radius: 6px; border-left: 4px solid #0c5460;">
          <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #0c5460;">
            <strong>💡 Interprétation :</strong> 
            Le GMQ mesure la croissance quotidienne moyenne des animaux. 
            ${graphiques.gmq.gmq.length > 0 
              ? `Un GMQ de ${formatNumber(graphiques.gmq.gmq[graphiques.gmq.gmq.length - 1] || 0, 0)} g/jour 
                 ${(graphiques.gmq.gmq[graphiques.gmq.gmq.length - 1] || 0) >= 600 
                   ? 'est excellent et indique une croissance optimale.'
                   : (graphiques.gmq.gmq[graphiques.gmq.gmq.length - 1] || 0) >= 400 
                     ? 'est acceptable mais peut être amélioré.'
                     : 'est faible et nécessite une optimisation de l\'alimentation et des conditions d\'élevage.'}`
              : ''}
            Un GMQ stable et élevé est essentiel pour une production rentable.
          </p>
        </div>
      </div>
    </div>
    `
        : ''
    }
    
    <!-- Graphique Mortalités -->
    ${
      graphiques?.mortalites && graphiques.mortalites.labels.length > 0
        ? `
    <div class="section">
      <h2>📊 Évolution des Mortalités</h2>
      <div class="card">
        ${generateBarChartSVG(
          graphiques.mortalites.labels,
          [
            {
              label: 'Nombre de mortalités',
              data: graphiques.mortalites.nombre,
              color: '#F44336',
            },
          ],
          700,
          250
        )}
        ${generateChartAnalysis('bar', {
          labels: graphiques.mortalites.labels,
          datasets: [{ label: 'Mortalités', data: graphiques.mortalites.nombre, color: '#F44336' }],
        }, 'sante')}
        <div style="margin-top: 15px; padding: 12px; background: #f8d7da; border-radius: 6px; border-left: 4px solid #c62828;">
          <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #721c24;">
            <strong>💡 Interprétation :</strong> 
            Ce graphique montre l'évolution du nombre de mortalités au fil du temps. 
            ${graphiques.mortalites.nombre.reduce((a, b) => a + b, 0) === 0
              ? 'Aucune mortalité enregistrée sur la période, ce qui est excellent.'
              : graphiques.mortalites.nombre.some((n, i, arr) => i > 0 && n > arr[i - 1])
                ? 'Une tendance à la hausse des mortalités nécessite une intervention urgente pour identifier et corriger les causes.'
                : 'Les mortalités sont stables ou en baisse, ce qui indique une bonne gestion sanitaire.'}
            Il est important de surveiller régulièrement ce indicateur et d'agir rapidement en cas d'augmentation.
          </p>
        </div>
      </div>
    </div>
    `
        : ''
    }

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
        
        <div style="margin-top: 15px; padding: 10px; background: ${totauxFinance.solde >= 0 ? '#e3f2fd' : '#f8d7da'}; border-radius: 6px;">
          <p style="text-align: center; font-size: 12px; color: ${totauxFinance.solde >= 0 ? '#0d47a1' : '#721c24'};">
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
