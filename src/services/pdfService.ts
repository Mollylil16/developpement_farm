/**
 * Service de génération et partage de rapports PDF
 * Utilise expo-print pour générer des PDF à partir de HTML
 * Utilise expo-sharing pour partager les fichiers générés
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';

/**
 * Options pour la génération de PDF
 */
interface PDFOptions {
  html: string;
  fileName?: string;
  base64?: boolean;
}

/**
 * Résultat de la génération de PDF
 */
interface PDFResult {
  uri: string;
  base64?: string;
}

/**
 * Génère un PDF à partir d'un template HTML
 */
export async function generatePDF(options: PDFOptions): Promise<PDFResult> {
  try {
    const { html, fileName = 'rapport.pdf' } = options;

    // Générer le PDF
    const { uri, base64 } = await Print.printToFileAsync({
      html,
      base64: options.base64 || false,
    });

    // Utiliser fileName pour logger et pour nommer le fichier si possible
    logger.debug(`[pdfService] PDF généré: ${fileName} (${uri})`);

    return { uri, base64 };
  } catch (error) {
    logger.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Impossible de générer le PDF');
  }
}

/**
 * Partage un PDF généré
 */
export async function sharePDF(uri: string, fileName: string = 'rapport.pdf'): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      Alert.alert(
        'Partage non disponible',
        "Le partage de fichiers n'est pas disponible sur cet appareil."
      );
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Partager ${fileName}`,
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    logger.error('Erreur lors du partage du PDF:', error);
    throw new Error('Impossible de partager le PDF');
  }
}

/**
 * Génère et partage un PDF en une seule opération
 */
export async function generateAndSharePDF(
  html: string,
  fileName: string = 'rapport.pdf'
): Promise<void> {
  try {
    const { uri } = await generatePDF({ html, fileName });
    await sharePDF(uri, fileName);
  } catch (error) {
    logger.error('Erreur lors de la génération et du partage:', error);
    throw error;
  }
}

/**
 * Style CSS commun pour tous les PDFs
 * Palette harmonieuse vert/bleu pour évoquer la nature et l'élevage
 */
export const PDF_COMMON_STYLES = `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica Neue', 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.7;
      color: #2c3e50;
      padding: 40px;
      background: #f8f9fa;
    }
    
    h1 {
      font-size: 26px;
      font-weight: bold;
      margin-bottom: 12px;
      color: #1a5f2e;
      border-bottom: 3px solid #2e7d32;
      padding-bottom: 12px;
    }
    
    h2 {
      font-size: 20px;
      font-weight: bold;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #1a5f2e;
      border-left: 5px solid #2e7d32;
      padding-left: 15px;
      background: linear-gradient(to right, #f5f5f5 0%, transparent 100%);
      padding-top: 8px;
      padding-bottom: 8px;
    }
    
    h3 {
      font-size: 16px;
      font-weight: 600;
      margin-top: 20px;
      margin-bottom: 12px;
      color: #2e7d32;
    }
    
    p {
      margin-bottom: 10px;
      color: #34495e;
    }
    
    .header {
      text-align: center;
      margin-bottom: 35px;
      padding: 25px;
      background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
      border-radius: 12px;
      color: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .header-title {
      font-size: 32px;
      font-weight: bold;
      color: white;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .header-subtitle {
      font-size: 16px;
      color: rgba(255,255,255,0.95);
      margin-bottom: 5px;
    }
    
    .header-date {
      font-size: 12px;
      color: rgba(255,255,255,0.85);
      margin-top: 10px;
    }
    
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .card {
      background: white;
      border: 1px solid #bdbdbd;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
      border: 2px solid #2e7d32;
      border-radius: 10px;
      padding: 18px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(46,125,50,0.15);
      transition: transform 0.2s;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #2e7d32;
      margin-bottom: 8px;
    }
    
    .stat-label {
      font-size: 11px;
      color: #2e7d32;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    
    th {
      background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
      color: white;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    
    td {
      padding: 10px 15px;
      border-bottom: 1px solid #e0e0e0;
      color: #2c3e50;
    }
    
    tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    tr:hover {
      background: #f5f5f5;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 25px;
      border-top: 3px solid #2e7d32;
      text-align: center;
      font-size: 10px;
      color: #7f8c8d;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }
    
    .badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
    }
    
    .badge-success {
      background: #f1f8f4;
      color: #1b5e20;
      border: 1px solid #2e7d32;
    }
    
    .badge-warning {
      background: #fff9c4;
      color: #f57f17;
    }
    
    .badge-danger {
      background: #ffcdd2;
      color: #c62828;
    }
    
    .badge-info {
      background: #b3e5fc;
      color: #01579b;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-success {
      color: #2e7d32;
      font-weight: 600;
    }
    
    .text-danger {
      color: #c62828;
      font-weight: 600;
    }
    
    .text-warning {
      color: #f57f17;
      font-weight: 600;
    }
    
    .text-info {
      color: #0277bd;
      font-weight: 600;
    }
    
    .mb-2 {
      margin-bottom: 15px;
    }
    
    .mt-2 {
      margin-top: 15px;
    }
    
    .chart-container {
      background: white;
      border: 1px solid #bdbdbd;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      page-break-inside: avoid;
    }
    
    .chart-title {
      font-size: 16px;
      font-weight: 600;
      color: #2e7d32;
      margin-bottom: 15px;
      text-align: center;
    }
    
    .chart-description {
      font-size: 11px;
      color: #7f8c8d;
      margin-top: 12px;
      text-align: center;
      font-style: italic;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    
    canvas {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    
    @media print {
      body {
        padding: 20px;
        background: white;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      .chart-container {
        page-break-inside: avoid;
      }
    }
  </style>
`;

/**
 * Génère l'en-tête HTML pour un rapport
 */
export function generatePDFHeader(title: string, subtitle: string, projetNom?: string): string {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <div class="header">
      <div class="header-title">🐷 Fermier Pro</div>
      <div class="header-subtitle">${projetNom || 'Rapport'}</div>
      <h1 style="color: white; border: none; padding: 0; margin-top: 10px;">${title}</h1>
      <p style="color: rgba(255,255,255,0.95); margin-top: 8px;">${subtitle}</p>
      <div class="header-date">Généré le ${dateFormatted}</div>
    </div>
  `;
}

/**
 * Génère le pied de page HTML pour un rapport
 */
export function generatePDFFooter(): string {
  return `
    <div class="footer">
      <p>Ce rapport a été généré automatiquement par Fermier Pro.</p>
      <p>© ${new Date().getFullYear()} Fermier Pro - Tous droits réservés</p>
    </div>
  `;
}

/**
 * Enveloppe le contenu HTML dans une structure complète
 */
export function wrapHTMLContent(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rapport PDF</title>
      ${PDF_COMMON_STYLES}
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}

/**
 * Formate un nombre en devise (FCFA)
 */
export function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA'
  );
}

/**
 * Formate un nombre avec séparateurs de milliers
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Formate une date au format français
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Interface pour les données d'un graphique en ligne
 */
export interface LineChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
    lineWidth?: number;
  }>;
}

/**
 * Interface pour les données d'un graphique en barres
 */
export interface BarChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
  }>;
}

/**
 * Interface pour les données d'un graphique camembert
 */
export interface PieChartData {
  labels: string[];
  values: number[];
  colors: string[];
}

/**
 * Génère un graphique en ligne avec Canvas HTML
 */
export function generateLineChartHTML(
  chartId: string,
  data: LineChartData,
  title: string,
  description?: string,
  width: number = 800,
  height: number = 300
): string {
  const datasetsJson = JSON.stringify(data.datasets);
  const labelsJson = JSON.stringify(data.labels);

  return `
    <div class="chart-container">
      <div class="chart-title">${title}</div>
      <canvas id="${chartId}" width="${width}" height="${height}"></canvas>
      ${description ? `<div class="chart-description">${description}</div>` : ''}
      <script>
        (function() {
          const canvas = document.getElementById('${chartId}');
          if (!canvas) return;
          
          const ctx = canvas.getContext('2d');
          const width = canvas.width;
          const height = canvas.height;
          const padding = { top: 30, right: 40, bottom: 40, left: 60 };
          const chartWidth = width - padding.left - padding.right;
          const chartHeight = height - padding.top - padding.bottom;
          
          const labels = ${labelsJson};
          const datasets = ${datasetsJson};
          
          // Trouver les valeurs min/max pour l'échelle
          let minValue = Infinity;
          let maxValue = -Infinity;
          datasets.forEach(dataset => {
            dataset.data.forEach(val => {
              if (val < minValue) minValue = val;
              if (val > maxValue) maxValue = val;
            });
          });
          
          // Ajouter une marge
          const range = maxValue - minValue;
          minValue = minValue - range * 0.1;
          maxValue = maxValue + range * 0.1;
          
          // Dessiner la grille
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = 1;
          const gridLines = 5;
          for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
            
            // Labels Y
            const value = maxValue - ((maxValue - minValue) / gridLines) * i;
            ctx.fillStyle = '#7f8c8d';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(value.toFixed(0), padding.left - 10, y + 4);
          }
          
          // Dessiner les axes
          ctx.strokeStyle = '#2c3e50';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(padding.left, padding.top);
          ctx.lineTo(padding.left, padding.top + chartHeight);
          ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
          ctx.stroke();
          
          // Dessiner les lignes de données
          datasets.forEach((dataset, datasetIndex) => {
            ctx.strokeStyle = dataset.color;
            ctx.lineWidth = dataset.lineWidth || 3;
            ctx.beginPath();
            
            dataset.data.forEach((value, index) => {
              const x = padding.left + (chartWidth / (labels.length - 1)) * index;
              const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
              
              if (index === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            });
            
            ctx.stroke();
            
            // Dessiner les points
            dataset.data.forEach((value, index) => {
              const x = padding.left + (chartWidth / (labels.length - 1)) * index;
              const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
              
              ctx.fillStyle = dataset.color;
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, 2 * Math.PI);
              ctx.fill();
            });
          });
          
          // Labels X
          ctx.fillStyle = '#7f8c8d';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          labels.forEach((label, index) => {
            const x = padding.left + (chartWidth / (labels.length - 1)) * index;
            ctx.fillText(label, x, padding.top + chartHeight + 20);
          });
          
          // Légende
          ctx.textAlign = 'left';
          ctx.font = '11px Arial';
          datasets.forEach((dataset, index) => {
            const x = padding.left + chartWidth - 150;
            const y = padding.top + 20 + index * 20;
            
            ctx.fillStyle = dataset.color;
            ctx.fillRect(x, y - 8, 15, 3);
            
            ctx.fillStyle = '#2c3e50';
            ctx.fillText(dataset.label, x + 20, y);
          });
        })();
      </script>
    </div>
  `;
}

/**
 * Génère un graphique en barres avec Canvas HTML
 */
export function generateBarChartHTML(
  chartId: string,
  data: BarChartData,
  title: string,
  description?: string,
  width: number = 800,
  height: number = 300
): string {
  const datasetsJson = JSON.stringify(data.datasets);
  const labelsJson = JSON.stringify(data.labels);

  return `
    <div class="chart-container">
      <div class="chart-title">${title}</div>
      <canvas id="${chartId}" width="${width}" height="${height}"></canvas>
      ${description ? `<div class="chart-description">${description}</div>` : ''}
      <script>
        (function() {
          const canvas = document.getElementById('${chartId}');
          if (!canvas) return;
          
          const ctx = canvas.getContext('2d');
          const width = canvas.width;
          const height = canvas.height;
          const padding = { top: 30, right: 40, bottom: 40, left: 60 };
          const chartWidth = width - padding.left - padding.right;
          const chartHeight = height - padding.top - padding.bottom;
          
          const labels = ${labelsJson};
          const datasets = ${datasetsJson};
          
          // Trouver les valeurs min/max
          let maxValue = 0;
          datasets.forEach(dataset => {
            dataset.data.forEach(val => {
              if (val > maxValue) maxValue = val;
            });
          });
          maxValue = maxValue * 1.1; // Marge de 10%
          
          // Dessiner la grille
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = 1;
          const gridLines = 5;
          for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
            
            const value = maxValue - ((maxValue) / gridLines) * i;
            ctx.fillStyle = '#7f8c8d';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(value.toFixed(0), padding.left - 10, y + 4);
          }
          
          // Dessiner les axes
          ctx.strokeStyle = '#2c3e50';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(padding.left, padding.top);
          ctx.lineTo(padding.left, padding.top + chartHeight);
          ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
          ctx.stroke();
          
          // Dessiner les barres
          const barWidth = chartWidth / labels.length * 0.6;
          const barSpacing = chartWidth / labels.length;
          
          datasets.forEach((dataset, datasetIndex) => {
            ctx.fillStyle = dataset.color;
            
            dataset.data.forEach((value, index) => {
              const x = padding.left + barSpacing * index + (barSpacing - barWidth) / 2;
              const barHeight = (value / maxValue) * chartHeight;
              const y = padding.top + chartHeight - barHeight;
              
              ctx.fillRect(x, y, barWidth, barHeight);
            });
          });
          
          // Labels X
          ctx.fillStyle = '#7f8c8d';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          labels.forEach((label, index) => {
            const x = padding.left + barSpacing * index + barSpacing / 2;
            ctx.fillText(label, x, padding.top + chartHeight + 20);
          });
          
          // Légende
          ctx.textAlign = 'left';
          ctx.font = '11px Arial';
          datasets.forEach((dataset, index) => {
            const x = padding.left + chartWidth - 150;
            const y = padding.top + 20 + index * 20;
            
            ctx.fillStyle = dataset.color;
            ctx.fillRect(x, y - 8, 15, 12);
            
            ctx.fillStyle = '#2c3e50';
            ctx.fillText(dataset.label, x + 20, y);
          });
        })();
      </script>
    </div>
  `;
}

/**
 * Génère un graphique camembert avec Canvas HTML
 */
export function generatePieChartHTML(
  chartId: string,
  data: PieChartData,
  title: string,
  description?: string,
  width: number = 500,
  height: number = 400
): string {
  const labelsJson = JSON.stringify(data.labels);
  const valuesJson = JSON.stringify(data.values);
  const colorsJson = JSON.stringify(data.colors);

  return `
    <div class="chart-container">
      <div class="chart-title">${title}</div>
      <canvas id="${chartId}" width="${width}" height="${height}"></canvas>
      ${description ? `<div class="chart-description">${description}</div>` : ''}
      <script>
        (function() {
          const canvas = document.getElementById('${chartId}');
          if (!canvas) return;
          
          const ctx = canvas.getContext('2d');
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const radius = Math.min(centerX, centerY) - 50;
          
          const labels = ${labelsJson};
          const values = ${valuesJson};
          const colors = ${colorsJson};
          
          const total = values.reduce((sum, val) => sum + val, 0);
          
          let currentAngle = -Math.PI / 2;
          
          // Dessiner le camembert
          values.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index] || '#2e7d32';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const percentage = ((value / total) * 100).toFixed(1);
            ctx.fillText(percentage + '%', labelX, labelY);
            
            currentAngle += sliceAngle;
          });
          
          // Légende
          ctx.textAlign = 'left';
          ctx.font = '11px Arial';
          const legendX = centerX + radius + 30;
          let legendY = centerY - (labels.length * 20) / 2;
          
          labels.forEach((label, index) => {
            ctx.fillStyle = colors[index] || '#2e7d32';
            ctx.fillRect(legendX, legendY - 8, 15, 12);
            
            ctx.fillStyle = '#2c3e50';
            ctx.fillText(label, legendX + 20, legendY);
            
            const valueText = values[index] + ' (' + ((values[index] / total) * 100).toFixed(1) + '%)';
            ctx.fillStyle = '#7f8c8d';
            ctx.font = '10px Arial';
            ctx.fillText(valueText, legendX + 20, legendY + 12);
            ctx.font = '11px Arial';
            
            legendY += 35;
          });
        })();
      </script>
    </div>
  `;
}
