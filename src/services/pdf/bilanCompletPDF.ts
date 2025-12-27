/**
 * Template PDF pour Bilan Financier Complet
 * Format bancable avec toutes les sections
 */

import {
  generatePDFHeader,
  generatePDFFooter,
  wrapHTMLContent,
  formatCurrency,
  formatDate,
  generateAndSharePDF,
  formatNumber,
} from '../pdfService';
import type { Projet } from '../../types/projet';
import { parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BilanCompletData {
  projet: Projet;
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
  };
}

/**
 * Génère le HTML pour le rapport Bilan Complet
 */
export function generateBilanCompletHTML(data: BilanCompletData): string {
  const { projet, periode, revenus, depenses, dettes, actifs, resultats, indicateurs } = data;

  const periodeFormatted = `${format(parseISO(periode.date_debut), 'dd MMM yyyy', { locale: fr })} - ${format(parseISO(periode.date_fin), 'dd MMM yyyy', { locale: fr })}`;

  const content = `
    ${generatePDFHeader(
      'Bilan Financier Complet',
      `Rapport bancable de votre exploitation - Période: ${periodeFormatted}`,
      projet.nom
    )}

    <!-- Informations de la ferme -->
    <div class="section">
      <h2>📋 Informations de l'Exploitation</h2>
      <div class="card">
        <table>
          <tr>
            <td><strong>Nom de l'exploitation</strong></td>
            <td>${projet.nom || 'Non renseigné'}</td>
          </tr>
          <tr>
            <td><strong>Période du bilan</strong></td>
            <td>${periodeFormatted} (${periode.nombre_mois} mois)</td>
          </tr>
          <tr>
            <td><strong>Date de génération</strong></td>
            <td>${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Résultats Financiers -->
    <div class="section">
      <h2>💰 Résultats Financiers</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Solde Net</div>
          <div class="stat-value ${resultats.solde >= 0 ? 'text-success' : 'text-danger'}">
            ${formatCurrency(resultats.solde)}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Marge Brute</div>
          <div class="stat-value text-success">${formatCurrency(resultats.marge_brute)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cash Flow</div>
          <div class="stat-value ${resultats.cash_flow >= 0 ? 'text-success' : 'text-danger'}">
            ${formatCurrency(resultats.cash_flow)}
          </div>
        </div>
      </div>
    </div>

    <!-- Revenus -->
    <div class="section page-break">
      <h2>📈 Revenus</h2>
      <div class="card">
        <p><strong>Total Revenus :</strong> ${formatCurrency(revenus.total)}</p>
        <p><strong>Nombre de transactions :</strong> ${revenus.nombre_transactions}</p>
        
        ${Object.keys(revenus.par_categorie).length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th class="text-right">Montant</th>
              <th class="text-right">% du total</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(revenus.par_categorie)
              .map(
                ([categorie, montant]) => `
              <tr>
                <td>${categorie}</td>
                <td class="text-right">${formatCurrency(montant)}</td>
                <td class="text-right">${revenus.total > 0 ? formatNumber((montant / revenus.total) * 100, 1) : 0}%</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        ` : '<p style="color: #999;">Aucun revenu enregistré</p>'}
      </div>
    </div>

    <!-- Dépenses -->
    <div class="section page-break">
      <h2>📉 Dépenses</h2>
      <div class="card">
        <table>
          <tr>
            <td><strong>Dépenses OPEX</strong></td>
            <td class="text-right text-danger">${formatCurrency(depenses.opex_total)}</td>
          </tr>
          <tr>
            <td><strong>Charges Fixes</strong></td>
            <td class="text-right text-warning">${formatCurrency(depenses.charges_fixes_total)}</td>
          </tr>
          <tr style="border-top: 2px solid #333; font-weight: bold;">
            <td><strong>Total Dépenses</strong></td>
            <td class="text-right text-danger">${formatCurrency(depenses.total)}</td>
          </tr>
        </table>
        
        <p style="margin-top: 15px;"><strong>Nombre de transactions :</strong> ${depenses.nombre_transactions}</p>
        
        ${Object.keys(depenses.par_categorie).length > 0 ? `
        <h3>Répartition par catégorie</h3>
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th class="text-right">Montant</th>
              <th class="text-right">% du total</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(depenses.par_categorie)
              .map(
                ([categorie, montant]) => `
              <tr>
                <td>${categorie}</td>
                <td class="text-right">${formatCurrency(montant)}</td>
                <td class="text-right">${depenses.total > 0 ? formatNumber((montant / depenses.total) * 100, 1) : 0}%</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        ` : ''}
      </div>
    </div>

    <!-- Dettes -->
    <div class="section page-break">
      <h2>💳 Dettes et Prêts</h2>
      <div class="card">
        <table>
          <tr>
            <td><strong>Total Dettes en cours</strong></td>
            <td class="text-right text-warning">${formatCurrency(dettes.total)}</td>
          </tr>
          <tr>
            <td><strong>Intérêts mensuels</strong></td>
            <td class="text-right">${formatCurrency(dettes.interets_mensuels)}</td>
          </tr>
          <tr>
            <td><strong>Nombre de dettes</strong></td>
            <td class="text-right">${dettes.nombre}</td>
          </tr>
        </table>
        
        ${dettes.liste.length > 0 ? `
        <h3>Détail des dettes</h3>
        <table>
          <thead>
            <tr>
              <th>Libellé</th>
              <th class="text-right">Montant restant</th>
              <th>Date échéance</th>
              <th class="text-right">Taux d'intérêt</th>
            </tr>
          </thead>
          <tbody>
            ${dettes.liste
              .map(
                (dette) => `
              <tr>
                <td>${dette.libelle}</td>
                <td class="text-right">${formatCurrency(dette.montant_restant)}</td>
                <td>${dette.date_echeance ? format(parseISO(dette.date_echeance), 'dd MMM yyyy', { locale: fr }) : 'Non définie'}</td>
                <td class="text-right">${dette.taux_interet}% annuel</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        ` : '<p style="color: #999;">Aucune dette enregistrée</p>'}
      </div>
    </div>

    <!-- Actifs -->
    <div class="section page-break">
      <h2>🏢 Actifs</h2>
      <div class="card">
        <table>
          <tr>
            <td><strong>Valeur du Cheptel</strong></td>
            <td class="text-right text-success">${formatCurrency(actifs.valeur_cheptel)}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Nombre d'animaux</td>
            <td class="text-right">${actifs.nombre_animaux}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Poids moyen</td>
            <td class="text-right">${formatNumber(actifs.poids_moyen_cheptel, 1)} kg</td>
          </tr>
          <tr>
            <td><strong>Valeur des Stocks</strong></td>
            <td class="text-right text-info">${formatCurrency(actifs.valeur_stocks)}</td>
          </tr>
          <tr style="border-top: 2px solid #333; font-weight: bold;">
            <td><strong>Total Actifs</strong></td>
            <td class="text-right text-success">${formatCurrency(actifs.total)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Indicateurs Clés -->
    <div class="section">
      <h2>📊 Indicateurs Clés de Performance</h2>
      <div class="card">
        <table>
          <tr>
            <td><strong>Taux d'endettement</strong></td>
            <td class="text-right">${formatNumber(indicateurs.taux_endettement, 2)}%</td>
          </tr>
          <tr>
            <td><strong>Ratio de rentabilité</strong></td>
            <td class="text-right ${indicateurs.ratio_rentabilite >= 0 ? 'text-success' : 'text-danger'}">
              ${formatNumber(indicateurs.ratio_rentabilite, 2)}%
            </td>
          </tr>
          <tr>
            <td><strong>Coût de production (OPEX/kg)</strong></td>
            <td class="text-right">${formatCurrency(indicateurs.cout_kg_opex)}/kg</td>
          </tr>
          <tr>
            <td><strong>Total kg vendus</strong></td>
            <td class="text-right">${formatNumber(indicateurs.total_kg_vendus, 0)} kg</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Synthèse -->
    <div class="section">
      <h2>📋 Synthèse</h2>
      <div class="card">
        <table style="font-size: 13px;">
          <tr>
            <td><strong>Total Revenus</strong></td>
            <td class="text-right text-success"><strong>${formatCurrency(revenus.total)}</strong></td>
          </tr>
          <tr>
            <td><strong>Total Dépenses</strong></td>
            <td class="text-right text-danger"><strong>${formatCurrency(depenses.total)}</strong></td>
          </tr>
          <tr style="border-top: 2px solid #333;">
            <td><strong>Solde Net</strong></td>
            <td class="text-right ${resultats.solde >= 0 ? 'text-success' : 'text-danger'}">
              <strong>${formatCurrency(resultats.solde)}</strong>
            </td>
          </tr>
          <tr>
            <td><strong>Total Actifs</strong></td>
            <td class="text-right text-success"><strong>${formatCurrency(actifs.total)}</strong></td>
          </tr>
          <tr>
            <td><strong>Total Dettes</strong></td>
            <td class="text-right text-warning"><strong>${formatCurrency(dettes.total)}</strong></td>
          </tr>
        </table>
        
        <div style="margin-top: 20px; padding: 15px; background: ${resultats.solde >= 0 ? '#e3f2fd' : '#f8d7da'}; border-radius: 6px; border: 2px solid ${resultats.solde >= 0 ? '#1976D2' : '#dc3545'};">
          <p style="text-align: center; font-size: 14px; font-weight: bold; color: ${resultats.solde >= 0 ? '#0d47a1' : '#721c24'};">
            ${resultats.solde >= 0 ? '✅ Exploitation BÉNÉFICIAIRE' : '⚠️ Exploitation DÉFICITAIRE'}
          </p>
          <p style="text-align: center; font-size: 12px; color: ${resultats.solde >= 0 ? '#0d47a1' : '#721c24'}; margin-top: 5px;">
            ${resultats.solde >= 0 
              ? `Marge brute de ${formatCurrency(resultats.marge_brute)} et cash-flow positif de ${formatCurrency(resultats.cash_flow)}`
              : `Déficit de ${formatCurrency(Math.abs(resultats.solde))}. Actions correctives recommandées.`}
          </p>
        </div>
      </div>
    </div>

    <!-- Note de traçabilité -->
    <div class="section">
      <div class="card" style="background: #f9f9f9; border: 1px solid #e0e0e0;">
        <p style="font-size: 11px; color: #666; text-align: center;">
          <strong>Document bancable généré automatiquement</strong><br/>
          Ce document a été généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br/>
          Toutes les données sont traçables et vérifiables dans l'application Fermier Pro
        </p>
      </div>
    </div>

    ${generatePDFFooter()}
  `;

  return wrapHTMLContent(content);
}

/**
 * Génère et partage le rapport PDF Bilan Complet
 */
export async function exportBilanCompletPDF(data: BilanCompletData): Promise<void> {
  const html = generateBilanCompletHTML(data);
  const periodeFormatted = `${format(parseISO(data.periode.date_debut), 'yyyy-MM-dd')}_${format(parseISO(data.periode.date_fin), 'yyyy-MM-dd')}`;
  const fileName = `Bilan_Complet_${data.projet.nom}_${periodeFormatted}.pdf`;

  await generateAndSharePDF(html, fileName);
}

