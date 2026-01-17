/**
 * Service de génération de rapport production (PDF et Excel)
 */

import { startOfMonth, endOfMonth, format, parseISO, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  generatePDFHeader,
  generatePDFFooter,
  wrapHTMLContent,
  formatCurrency,
  formatDate,
  generateAndSharePDF,
  formatNumber,
} from '../pdfService';
import { generateLineChartSVG, generateBarChartSVG } from '../pdf/chartGenerators';
import apiClient from '../api/apiClient';
import { logger } from '../../utils/logger';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

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
 * Génère le HTML pour le rapport production
 */
function generateProductionReportHTML(
  projetNom: string,
  data: ProductionReportData
): string {
  const dateGeneration = format(new Date(), 'dd MMMM yyyy', { locale: fr });

  // Calculer les statistiques de pesées
  const peseesValides = data.pesees.filter((p) => p.poids_kg !== undefined && p.poids_kg > 0);
  const poidsTotal = peseesValides.reduce((sum, p) => {
    const poids = p.poids_kg || 0;
    const count = p.nombre || 1;
    return sum + poids * count;
  }, 0);
  const nombreTotalPesees = peseesValides.reduce((sum, p) => sum + (p.nombre || 1), 0);
  const poidsMoyen = nombreTotalPesees > 0 ? poidsTotal / nombreTotalPesees : 0;

  // Calculer les statistiques de ventes
  const ventesValides = data.ventes.filter((v) => v.prix !== undefined && v.prix > 0);
  const totalVentes = ventesValides.reduce((sum, v) => sum + (v.prix || 0), 0);
  const quantiteTotaleVendue = ventesValides.reduce((sum, v) => sum + (v.quantite_kg || 0), 0);
  const prixMoyenKg = quantiteTotaleVendue > 0 ? totalVentes / quantiteTotaleVendue : 0;

  // Calculer l'évolution du poids (première et dernière pesée)
  let poidsInitial = 0;
  let poidsFinal = 0;
  let gainTotal = 0;
  if (peseesValides.length > 0) {
    const peseesTriees = [...peseesValides].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const premierePesee = peseesTriees[0];
    const dernierePesee = peseesTriees[peseesTriees.length - 1];
    
    poidsInitial = (premierePesee.poids_kg || 0) * (premierePesee.nombre || 1);
    poidsFinal = (dernierePesee.poids_kg || 0) * (dernierePesee.nombre || 1);
    gainTotal = poidsFinal - poidsInitial;
  }

  const content = `
    ${generatePDFHeader(
      'Rapport Production',
      `Suivi détaillé de la production - ${dateGeneration}`,
      projetNom
    )}

    <!-- Vue d'ensemble -->
    <div class="section">
      <h2>📊 Vue d'ensemble</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Cheptel</div>
          <div class="stat-value" style="color: #42A5F5;">${data.cheptel.total}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Poids Moyen</div>
          <div class="stat-value text-success">${poidsMoyen.toFixed(1)} kg</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Gain Total</div>
          <div class="stat-value ${gainTotal >= 0 ? 'text-success' : 'text-danger'}">
            ${gainTotal >= 0 ? '+' : ''}${gainTotal.toFixed(1)} kg
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Ventes</div>
          <div class="stat-value text-success">${formatCurrency(totalVentes)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Quantité Vendue</div>
          <div class="stat-value" style="color: #42A5F5;">${quantiteTotaleVendue.toFixed(1)} kg</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Prix Moyen/kg</div>
          <div class="stat-value" style="color: #42A5F5;">${prixMoyenKg > 0 ? formatCurrency(prixMoyenKg) : '-'}</div>
        </div>
      </div>
    </div>

    <!-- Cheptel -->
    <div class="section page-break">
      <h2>🐷 Cheptel</h2>
      <p><strong>Total :</strong> ${data.cheptel.total} sujet(s)</p>
      
      ${data.isModeBatch ? `
      <!-- Mode Batch -->
      ${data.cheptel.par_categorie && Object.keys(data.cheptel.par_categorie).length > 0 ? `
      <h3>Répartition par catégorie</h3>
      <table>
        <thead>
          <tr>
            <th>Catégorie</th>
            <th class="text-right">Nombre</th>
            <th class="text-right">% du total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.cheptel.par_categorie)
            .map(
              ([categorie, count]) => `
            <tr>
              <td>${categorie}</td>
              <td class="text-right">${count}</td>
              <td class="text-right">${data.cheptel.total > 0 ? ((count / data.cheptel.total) * 100).toFixed(1) : 0}%</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ` : ''}

      ${data.cheptel.batches && data.cheptel.batches.length > 0 ? `
      <h3>Détail des loges</h3>
      <table>
        <thead>
          <tr>
            <th>Nom de la loge</th>
            <th>Catégorie</th>
            <th class="text-right">Nombre</th>
            <th class="text-right">Poids moyen</th>
            <th>Date entrée</th>
          </tr>
        </thead>
        <tbody>
          ${data.cheptel.batches
            .slice(0, 50) // Limiter à 50
            .map(
              (b) => `
            <tr>
              <td>${b.nom}</td>
              <td>${b.categorie || '-'}</td>
              <td class="text-right">${b.nombre}</td>
              <td class="text-right">${b.poids_moyen ? `${b.poids_moyen.toFixed(1)} kg` : '-'}</td>
              <td>${b.date_entree ? format(parseISO(b.date_entree), 'dd/MM/yyyy', { locale: fr }) : '-'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ${data.cheptel.batches.length > 50 ? `<p><em>... et ${data.cheptel.batches.length - 50} autres loges</em></p>` : ''}
      ` : ''}
      ` : `
      <!-- Mode Individuel -->
      ${data.cheptel.par_sexe && Object.keys(data.cheptel.par_sexe).length > 0 ? `
      <h3>Répartition par sexe</h3>
      <table>
        <thead>
          <tr>
            <th>Sexe</th>
            <th class="text-right">Nombre</th>
            <th class="text-right">% du total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.cheptel.par_sexe)
            .map(
              ([sexe, count]) => `
            <tr>
              <td>${sexe === 'male' ? 'Mâle' : sexe === 'femelle' ? 'Femelle' : 'Indéterminé'}</td>
              <td class="text-right">${count}</td>
              <td class="text-right">${data.cheptel.total > 0 ? ((count / data.cheptel.total) * 100).toFixed(1) : 0}%</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ` : ''}

      ${data.cheptel.par_statut && Object.keys(data.cheptel.par_statut).length > 0 ? `
      <h3>Répartition par statut</h3>
      <table>
        <thead>
          <tr>
            <th>Statut</th>
            <th class="text-right">Nombre</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.cheptel.par_statut)
            .map(
              ([statut, count]) => `
            <tr>
              <td>${statut}</td>
              <td class="text-right">${count}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ` : ''}

      ${data.cheptel.animaux && data.cheptel.animaux.length > 0 ? `
      <h3>Liste des animaux (échantillon)</h3>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Nom</th>
            <th>Sexe</th>
            <th>Statut</th>
            <th>Race</th>
            <th>Reproducteur</th>
          </tr>
        </thead>
        <tbody>
          ${data.cheptel.animaux
            .slice(0, 50) // Limiter à 50
            .map(
              (a) => `
            <tr>
              <td>${a.code}</td>
              <td>${a.nom || '-'}</td>
              <td>${a.sexe === 'male' ? 'Mâle' : a.sexe === 'femelle' ? 'Femelle' : 'Indéterminé'}</td>
              <td>${a.statut}</td>
              <td>${a.race || '-'}</td>
              <td>${a.reproducteur ? 'Oui' : 'Non'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ${data.cheptel.animaux.length > 50 ? `<p><em>... et ${data.cheptel.animaux.length - 50} autres animaux</em></p>` : ''}
      ` : ''}
      `}
    </div>

    <!-- Pesées -->
    <div class="section page-break">
      <h2>⚖️ Historique des Pesées</h2>
      <p><strong>Nombre total de pesées :</strong> ${peseesValides.length}</p>
      <p><strong>Poids moyen :</strong> ${poidsMoyen.toFixed(1)} kg</p>
      ${poidsInitial > 0 && poidsFinal > 0 ? `
      <p><strong>Poids initial :</strong> ${poidsInitial.toFixed(1)} kg</p>
      <p><strong>Poids final :</strong> ${poidsFinal.toFixed(1)} kg</p>
      <p><strong>Gain total :</strong> ${gainTotal >= 0 ? '+' : ''}${gainTotal.toFixed(1)} kg</p>
      ` : ''}
      
      ${peseesValides.length > 1 ? (() => {
        // Préparer les données pour le graphique de croissance
        const peseesTriees = [...peseesValides].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Grouper par date pour avoir une moyenne par date
        const poidsParDate: Record<string, { total: number; count: number }> = {};
        peseesTriees.forEach((p) => {
          const dateKey = format(parseISO(p.date), 'dd/MM', { locale: fr });
          if (!poidsParDate[dateKey]) {
            poidsParDate[dateKey] = { total: 0, count: 0 };
          }
          const poids = (p.poids_kg || 0) * (p.nombre || 1);
          poidsParDate[dateKey].total += poids;
          poidsParDate[dateKey].count += (p.nombre || 1);
        });
        
        const labels = Object.keys(poidsParDate);
        const poidsMoyens = labels.map(dateKey => {
          const data = poidsParDate[dateKey];
          return data.count > 0 ? data.total / data.count : 0;
        });
        
        return `
          <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📈 Courbe de croissance - Évolution du poids moyen</h3>
            <p style="margin: 0 0 15px 0; font-size: 12px; color: #666; font-style: italic;">
              Tendance de la croissance du cheptel basée sur les pesées enregistrées
            </p>
            ${generateLineChartSVG(
              labels,
              [{ label: 'Poids moyen (kg)', data: poidsMoyens, color: '#2e7d32' }],
              700,
              250
            )}
          </div>
        `;
      })() : ''}

      ${peseesValides.length > 0 ? `
      <h3>Dernières pesées</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            ${data.isModeBatch ? '<th>Loge</th>' : '<th>Animal</th>'}
            <th class="text-right">Poids</th>
            ${data.isModeBatch ? '<th class="text-right">Nombre</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${peseesValides
            .slice(0, 50) // Limiter à 50
            .map(
              (p) => `
            <tr>
              <td>${format(parseISO(p.date), 'dd/MM/yyyy', { locale: fr })}</td>
              <td>${data.isModeBatch ? (p.batch_id ? 'Loge' : '-') : (p.animal_id ? p.animal_id.substring(0, 8) : '-')}</td>
              <td class="text-right">${p.poids_kg ? `${p.poids_kg.toFixed(1)} kg` : '-'}</td>
              ${data.isModeBatch ? `<td class="text-right">${p.nombre || '-'}</td>` : ''}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ${peseesValides.length > 50 ? `<p><em>... et ${peseesValides.length - 50} autres pesées</em></p>` : ''}
      ` : '<p>Aucune pesée enregistrée</p>'}
    </div>

    <!-- Ventes -->
    <div class="section page-break">
      <h2>💰 Ventes</h2>
      <p><strong>Total des ventes :</strong> ${formatCurrency(totalVentes)}</p>
      <p><strong>Quantité totale vendue :</strong> ${quantiteTotaleVendue.toFixed(1)} kg</p>
      <p><strong>Prix moyen au kg :</strong> ${prixMoyenKg > 0 ? formatCurrency(prixMoyenKg) : '-'}</p>
      
      ${ventesValides.length > 0 ? (() => {
        // Grouper les ventes par date
        const ventesParDate: Record<string, number> = {};
        ventesValides.forEach((v) => {
          const dateKey = format(parseISO(v.date), 'dd/MM', { locale: fr });
          ventesParDate[dateKey] = (ventesParDate[dateKey] || 0) + (v.prix || 0);
        });
        
        // Créer un mapping dateKey -> date originale pour le tri
        const dateKeyToDate: Record<string, string> = {};
        ventesValides.forEach((v) => {
          const dateKey = format(parseISO(v.date), 'dd/MM', { locale: fr });
          if (!dateKeyToDate[dateKey]) {
            dateKeyToDate[dateKey] = v.date;
          }
        });
        
        const labels = Object.keys(ventesParDate).sort((a, b) => {
          const dateA = parseISO(dateKeyToDate[a] || '');
          const dateB = parseISO(dateKeyToDate[b] || '');
          return dateA.getTime() - dateB.getTime();
        });
        const montants = labels.map(dateKey => ventesParDate[dateKey] || 0);
        
        return `
          <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📊 Évolution des ventes par date</h3>
            <p style="margin: 0 0 15px 0; font-size: 12px; color: #666; font-style: italic;">
              Visualisation des ventes réalisées sur la période, montrant les montants vendus par date
            </p>
            ${generateBarChartSVG(
              labels,
              [{ label: 'Montant des ventes (FCFA)', data: montants, color: '#2e7d32' }],
              700,
              250
            )}
          </div>
        `;
      })() : ''}

      ${ventesValides.length > 0 ? `
      <h3>Détail des ventes</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th class="text-right">Quantité (kg)</th>
            <th class="text-right">Prix/kg</th>
            <th class="text-right">Montant Total</th>
          </tr>
        </thead>
        <tbody>
          ${ventesValides.map(
            (v) => `
            <tr>
              <td>${format(parseISO(v.date), 'dd/MM/yyyy', { locale: fr })}</td>
              <td class="text-right">${v.quantite_kg ? `${v.quantite_kg.toFixed(1)}` : '-'}</td>
              <td class="text-right">${v.prix_kg ? formatCurrency(v.prix_kg) : '-'}</td>
              <td class="text-right">${v.prix ? formatCurrency(v.prix) : '-'}</td>
            </tr>
          `
          ).join('')}
        </tbody>
      </table>
      ` : '<p>Aucune vente enregistrée</p>'}
    </div>

    ${generatePDFFooter()}
  `;

  return wrapHTMLContent(content);
}

/**
 * Génère le rapport production en PDF
 */
export async function generateProductionReportPDF(
  projetId: string,
  isModeBatch: boolean = false,
  dateDebut?: Date,
  dateFin?: Date
): Promise<void> {
  try {
    // Charger les informations du projet
    const projet = await apiClient.get<{ id: string; nom: string }>(`/projets/${projetId}`);

    // Charger les données du rapport production
    const reportData = await loadProductionReportData(projetId, dateDebut, dateFin);

    // Générer le HTML
    const html = generateProductionReportHTML(projet.nom, reportData);

    // Générer le nom de fichier
    const dateFormatted = format(new Date(), 'yyyy-MM-dd');
    const fileName = `Rapport_Production_${projet.nom}_${dateFormatted}.pdf`;

    // Générer et partager le PDF
    await generateAndSharePDF(html, fileName);
  } catch (error: any) {
    logger.error('Erreur lors de la génération du rapport production PDF:', error);
    throw new Error(`Impossible de générer le rapport production: ${error.message || 'Erreur inconnue'}`);
  }
}

/**
 * Génère le rapport production en Excel
 */
export async function generateProductionReportExcel(
  projetId: string,
  isModeBatch: boolean = false,
  dateDebut?: Date,
  dateFin?: Date
): Promise<void> {
  try {
    // Charger les informations du projet
    const projet = await apiClient.get<{ id: string; nom: string }>(`/projets/${projetId}`);

    // Charger les données du rapport production
    const reportData = await loadProductionReportData(projetId, dateDebut, dateFin);

    // Créer le contenu CSV/Excel
    const dateFormatted = format(new Date(), 'yyyy-MM-dd');
    const lines: string[] = [];

    // En-tête
    lines.push(`Rapport Production - ${projet.nom}`);
    lines.push(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`);
    lines.push('');

    // Vue d'ensemble
    lines.push('Vue d\'ensemble');
    lines.push(`Total Cheptel,${reportData.cheptel.total}`);
    lines.push(`Nombre de pesées,${reportData.pesees.length}`);
    lines.push(`Nombre de ventes,${reportData.ventes.length}`);
    lines.push('');

    // Cheptel
    lines.push('Cheptel');
    if (reportData.isModeBatch) {
      lines.push('Nom,Catégorie,Nombre,Poids moyen,Date entrée');
      if (reportData.cheptel.batches) {
        reportData.cheptel.batches.forEach((b) => {
          lines.push(`${b.nom},${b.categorie || ''},${b.nombre},${b.poids_moyen || ''},${b.date_entree ? format(parseISO(b.date_entree), 'dd/MM/yyyy') : ''}`);
        });
      }
    } else {
      lines.push('Code,Nom,Sexe,Statut,Race,Reproducteur');
      if (reportData.cheptel.animaux) {
        reportData.cheptel.animaux.forEach((a) => {
          lines.push(`${a.code},${a.nom || ''},${a.sexe},${a.statut},${a.race || ''},${a.reproducteur ? 'Oui' : 'Non'}`);
        });
      }
    }
    lines.push('');

    // Pesées
    lines.push('Pesées');
    lines.push('Date,Animal/Loge,Poids (kg),Nombre');
    reportData.pesees.forEach((p) => {
      const identifiant = reportData.isModeBatch ? (p.batch_id || '') : (p.animal_id || '');
      lines.push(`${format(parseISO(p.date), 'dd/MM/yyyy')},${identifiant},${p.poids_kg || ''},${p.nombre || ''}`);
    });
    lines.push('');

    // Ventes
    lines.push('Ventes');
    lines.push('Date,Quantité (kg),Prix/kg,Montant Total');
    reportData.ventes.forEach((v) => {
      lines.push(`${format(parseISO(v.date), 'dd/MM/yyyy')},${v.quantite_kg || ''},${v.prix_kg || ''},${v.prix || ''}`);
    });

    // Convertir en CSV
    const csvContent = lines.join('\n');

    // Sauvegarder et partager
    const fileName = `Rapport_Production_${projet.nom}_${dateFormatted}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Partager ${fileName}`,
      });
    } else {
      Alert.alert('Erreur', "Le partage de fichiers n'est pas disponible sur cet appareil.");
    }
  } catch (error: any) {
    logger.error('Erreur lors de la génération du rapport production Excel:', error);
    throw new Error(`Impossible de générer le rapport production: ${error.message || 'Erreur inconnue'}`);
  }
}
