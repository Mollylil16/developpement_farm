/**
 * Service de génération de rapport santé (PDF et Excel)
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
  generatePieChartHTML,
  type PieChartData,
} from '../pdfService';
import { generateBarChartSVG, generateLineChartSVG, generatePieChartSVG } from '../pdf/chartGenerators';
import apiClient from '../api/apiClient';
import { logger } from '../../utils/logger';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

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
 * Génère le HTML pour le rapport santé
 */
function generateHealthReportHTML(
  projetNom: string,
  data: HealthReportData
): string {
  const dateGeneration = format(new Date(), 'dd MMMM yyyy', { locale: fr });

  const content = `
    ${generatePDFHeader(
      'Rapport Santé',
      `Rapport exhaustif sur la santé du cheptel - ${dateGeneration}`,
      projetNom
    )}

    <!-- Informations générales -->
    <div class="section">
      <h2>📊 Vue d'ensemble</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Vaccinations</div>
          <div class="stat-value" style="color: #42A5F5;">${data.totalVaccinations}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Mortalités</div>
          <div class="stat-value text-danger">${data.totalMorts}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Taux de Mortalité</div>
          <div class="stat-value ${data.tauxMortalite > 5 ? 'text-danger' : data.tauxMortalite > 3 ? 'text-warning' : 'text-success'}">
            ${data.tauxMortalite.toFixed(2)}%
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Maladies</div>
          <div class="stat-value text-warning">${data.maladies.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Visites Vétérinaires</div>
          <div class="stat-value" style="color: #42A5F5;">${data.visites.length}</div>
        </div>
        ${data.tauxMortalite > 5 ? `
        <div class="stat-card" style="background: #FFEBEE; border: 2px solid #EF5350;">
          <div class="stat-label">⚠️ ALERTE</div>
          <div class="stat-value text-danger">Taux de mortalité élevé</div>
          <p style="font-size: 10px; margin-top: 5px;">Recommandation: Consulter un vétérinaire</p>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Vaccinations -->
    <div class="section page-break">
      <h2>💉 Vaccinations</h2>
      <p><strong>Total de vaccinations :</strong> ${data.totalVaccinations}</p>
      
      ${Object.keys(data.vaccinationsParType).length > 0 ? `
      <h3>Répartition par type de vaccin</h3>
      <table>
        <thead>
          <tr>
            <th>Type de vaccin</th>
            <th class="text-right">Nombre</th>
            <th class="text-right">% du total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.vaccinationsParType)
            .map(
              ([type, count]) => `
            <tr>
              <td>${type}</td>
              <td class="text-right">${count}</td>
              <td class="text-right">${data.totalVaccinations > 0 ? ((count / data.totalVaccinations) * 100).toFixed(1) : 0}%</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ` : '<p>Aucune vaccination enregistrée</p>'}
      
      ${Object.keys(data.vaccinationsParType).length > 0 ? (() => {
        const pieData: PieChartData = {
          labels: Object.keys(data.vaccinationsParType),
          values: Object.values(data.vaccinationsParType),
          colors: ['#42A5F5', '#2e7d32', '#1b5e20', '#1976D2', '#1565C0', '#FF8C42', '#7B1FA2'],
        };
        return generatePieChartHTML(
          'vaccinationsPieChart',
          pieData,
          'Répartition des vaccinations par type',
          'Visualisation de la distribution des vaccinations selon les différents types de vaccins'
        );
      })() : ''}
      
      <!-- Graphique temporel des vaccinations par mois -->
      ${data.vaccinations.length > 0 ? (() => {
        // Grouper les vaccinations par mois
        const vaccinationsParMois: Record<string, number> = {};
        data.vaccinations.forEach((v) => {
          const dateKey = format(parseISO(v.date), 'MMM yyyy', { locale: fr });
          vaccinationsParMois[dateKey] = (vaccinationsParMois[dateKey] || 0) + 1;
        });
        
        const labels = Object.keys(vaccinationsParMois).sort((a, b) => {
          const dateA = parseISO(data.vaccinations.find(v => format(parseISO(v.date), 'MMM yyyy', { locale: fr }) === a)?.date || '');
          const dateB = parseISO(data.vaccinations.find(v => format(parseISO(v.date), 'MMM yyyy', { locale: fr }) === b)?.date || '');
          return dateA.getTime() - dateB.getTime();
        });
        const counts = labels.map(label => vaccinationsParMois[label] || 0);
        
        if (labels.length > 1) {
          return `
            <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📈 Évolution des vaccinations par mois</h3>
              <p style="margin: 0 0 15px 0; font-size: 12px; color: #666; font-style: italic;">
                Tendance du nombre de vaccinations au fil du temps
              </p>
              ${generateLineChartSVG(
                labels,
                [{ label: 'Nombre de vaccinations', data: counts, color: '#42A5F5' }],
                700,
                250
              )}
            </div>
          `;
        }
        return '';
      })() : ''}

      ${data.vaccinations.length > 0 ? `
      <h3>Détail des vaccinations</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Vaccin</th>
            <th>Produit</th>
            <th>Dosage</th>
            ${data.isModeBatch ? '<th>Loge</th>' : '<th>Animal</th>'}
          </tr>
        </thead>
        <tbody>
          ${data.vaccinations
            .slice(0, 50) // Limiter à 50 pour éviter des PDFs trop longs
            .map(
              (v) => `
            <tr>
              <td>${format(parseISO(v.date), 'dd/MM/yyyy', { locale: fr })}</td>
              <td>${v.vaccin}</td>
              <td>${v.produit || '-'}</td>
              <td>${v.dosage ? `${v.dosage} ${v.unite || ''}` : '-'}</td>
              <td>${data.isModeBatch ? (v.batch_id ? 'Loge' : '-') : (v.animal_id || '-')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ${data.vaccinations.length > 50 ? `<p><em>... et ${data.vaccinations.length - 50} autres vaccinations</em></p>` : ''}
      ` : ''}
    </div>

    <!-- Mortalités -->
    <div class="section page-break">
      <h2>💀 Mortalités</h2>
      <p><strong>Total de mortalités :</strong> ${data.totalMorts} sujet(s)</p>
      <p><strong>Taux de mortalité :</strong> ${data.tauxMortalite.toFixed(2)}%</p>
      
      ${Object.keys(data.mortalitesParCause).length > 0 ? `
      <h3>Répartition par cause</h3>
      <table>
        <thead>
          <tr>
            <th>Cause</th>
            <th class="text-right">Nombre</th>
            <th class="text-right">% du total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.mortalitesParCause)
            .map(
              ([cause, count]) => `
            <tr>
              <td>${cause || 'Non spécifiée'}</td>
              <td class="text-right">${count}</td>
              <td class="text-right">${data.totalMorts > 0 ? ((count / data.totalMorts) * 100).toFixed(1) : 0}%</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ` : ''}
      
      ${Object.keys(data.mortalitesParCause).length > 0 ? `
        <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📊 Répartition des mortalités par cause</h3>
          <p style="margin: 0 0 15px 0; font-size: 12px; color: #666; font-style: italic;">
            Visualisation du nombre de mortalités selon les différentes causes identifiées
          </p>
          ${generateBarChartSVG(
            Object.keys(data.mortalitesParCause),
            [{
              label: 'Nombre de mortalités',
              data: Object.values(data.mortalitesParCause),
              color: '#ef5350',
            }],
            700,
            250
          )}
        </div>
      ` : ''}

      ${Object.keys(data.mortalitesParCategorie).length > 0 ? `
      <h3>Répartition par catégorie</h3>
      <table>
        <thead>
          <tr>
            <th>Catégorie</th>
            <th class="text-right">Nombre</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.mortalitesParCategorie)
            .map(
              ([categorie, count]) => `
            <tr>
              <td>${categorie}</td>
              <td class="text-right">${count}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      ` : ''}
    </div>

    <!-- Maladies -->
    <div class="section page-break">
      <h2>🦠 Maladies</h2>
      ${data.maladies.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Date début</th>
            <th>Nom</th>
            <th>Gravité</th>
            <th>Animaux affectés</th>
            <th>Décès</th>
            <th>Guéri</th>
            <th>Coût traitement</th>
          </tr>
        </thead>
        <tbody>
          ${data.maladies.map(
            (m) => `
            <tr>
              <td>${format(parseISO(m.date_debut), 'dd/MM/yyyy', { locale: fr })}</td>
              <td>${m.nom || m.type || '-'}</td>
              <td>${m.gravite || '-'}</td>
              <td class="text-right">${m.nombre_animaux_affectes}</td>
              <td class="text-right">${m.nombre_deces}</td>
              <td>${m.gueri ? '✅ Oui' : '❌ Non'}</td>
              <td class="text-right">${m.cout_traitement ? formatCurrency(m.cout_traitement) : '-'}</td>
            </tr>
          `
          ).join('')}
        </tbody>
      </table>
      ` : '<p>Aucune maladie enregistrée</p>'}
    </div>

    <!-- Visites vétérinaires -->
    <div class="section page-break">
      <h2>👨‍⚕️ Visites Vétérinaires</h2>
      ${data.visites.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Vétérinaire</th>
            <th>Motif</th>
            <th>Diagnostic</th>
            <th>Coût</th>
          </tr>
        </thead>
        <tbody>
          ${data.visites.map(
            (v) => `
            <tr>
              <td>${format(parseISO(v.date_visite), 'dd/MM/yyyy', { locale: fr })}</td>
              <td>${v.veterinaire || '-'}</td>
              <td>${v.motif || '-'}</td>
              <td>${v.diagnostic ? (v.diagnostic.length > 50 ? v.diagnostic.substring(0, 50) + '...' : v.diagnostic) : '-'}</td>
              <td class="text-right">${v.cout ? formatCurrency(v.cout) : '-'}</td>
            </tr>
          `
          ).join('')}
        </tbody>
      </table>
      ` : '<p>Aucune visite vétérinaire enregistrée</p>'}
    </div>

    ${generatePDFFooter()}
  `;

  return wrapHTMLContent(content);
}

/**
 * Génère le rapport santé en PDF
 */
export async function generateHealthReportPDF(
  projetId: string,
  isModeBatch: boolean = false,
  dateDebut?: Date,
  dateFin?: Date
): Promise<void> {
  try {
    // Charger les informations du projet
    const projet = await apiClient.get<{ id: string; nom: string }>(`/projets/${projetId}`);

    // Charger les données du rapport santé
    const reportData = await loadHealthReportData(projetId, dateDebut, dateFin);

    // Générer le HTML
    const html = generateHealthReportHTML(projet.nom, reportData);

    // Générer le nom de fichier
    const dateFormatted = format(new Date(), 'yyyy-MM-dd');
    const fileName = `Rapport_Sante_${projet.nom}_${dateFormatted}.pdf`;

    // Générer et partager le PDF
    await generateAndSharePDF(html, fileName);
  } catch (error: any) {
    logger.error('Erreur lors de la génération du rapport santé PDF:', error);
    throw new Error(`Impossible de générer le rapport santé: ${error.message || 'Erreur inconnue'}`);
  }
}

/**
 * Génère le rapport santé en Excel
 */
export async function generateHealthReportExcel(
  projetId: string,
  isModeBatch: boolean = false,
  dateDebut?: Date,
  dateFin?: Date
): Promise<void> {
  try {
    // Charger les informations du projet
    const projet = await apiClient.get<{ id: string; nom: string }>(`/projets/${projetId}`);

    // Charger les données du rapport santé
    const reportData = await loadHealthReportData(projetId, dateDebut, dateFin);

    // Créer le contenu CSV/Excel
    const dateFormatted = format(new Date(), 'yyyy-MM-dd');
    const lines: string[] = [];

    // En-tête
    lines.push(`Rapport Santé - ${projet.nom}`);
    lines.push(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`);
    lines.push('');

    // Vue d'ensemble
    lines.push('Vue d\'ensemble');
    lines.push(`Total Vaccinations,${reportData.totalVaccinations}`);
    lines.push(`Total Mortalités,${reportData.totalMorts}`);
    lines.push(`Taux de Mortalité,${reportData.tauxMortalite.toFixed(2)}%`);
    lines.push(`Nombre de Maladies,${reportData.maladies.length}`);
    lines.push(`Nombre de Visites Vétérinaires,${reportData.visites.length}`);
    lines.push('');

    // Vaccinations
    lines.push('Vaccinations');
    lines.push('Date,Vaccin,Produit,Dosage,Unite');
    reportData.vaccinations.forEach((v) => {
      lines.push(`${format(parseISO(v.date), 'dd/MM/yyyy')},${v.vaccin},${v.produit || ''},${v.dosage || ''},${v.unite || ''}`);
    });
    lines.push('');

    // Mortalités
    lines.push('Mortalités');
    lines.push('Date,Nombre,Cause,Catégorie');
    reportData.mortalites.forEach((m) => {
      lines.push(`${format(parseISO(m.date), 'dd/MM/yyyy')},${m.nombre_porcs},${m.cause || ''},${m.categorie || ''}`);
    });
    lines.push('');

    // Maladies
    lines.push('Maladies');
    lines.push('Date début,Date fin,Nom,Gravité,Animaux affectés,Décès,Guéri,Coût traitement');
    reportData.maladies.forEach((m) => {
      lines.push(`${format(parseISO(m.date_debut), 'dd/MM/yyyy')},${m.date_fin ? format(parseISO(m.date_fin), 'dd/MM/yyyy') : ''},${m.nom || m.type || ''},${m.gravite || ''},${m.nombre_animaux_affectes},${m.nombre_deces},${m.gueri ? 'Oui' : 'Non'},${m.cout_traitement || ''}`);
    });
    lines.push('');

    // Visites vétérinaires
    lines.push('Visites Vétérinaires');
    lines.push('Date,Vétérinaire,Motif,Diagnostic,Coût');
    reportData.visites.forEach((v) => {
      lines.push(`${format(parseISO(v.date_visite), 'dd/MM/yyyy')},${v.veterinaire || ''},${v.motif || ''},${v.diagnostic || ''},${v.cout || ''}`);
    });

    // Convertir en CSV
    const csvContent = lines.join('\n');

    // Sauvegarder et partager
    const fileName = `Rapport_Sante_${projet.nom}_${dateFormatted}.csv`;
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
    logger.error('Erreur lors de la génération du rapport santé Excel:', error);
    throw new Error(`Impossible de générer le rapport santé: ${error.message || 'Erreur inconnue'}`);
  }
}
