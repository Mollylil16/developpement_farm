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
 */
export const PDF_COMMON_STYLES = `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 40px;
    }
    
    h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #1a1a1a;
      border-bottom: 3px solid #1565C0;
      padding-bottom: 10px;
    }
    
    h2 {
      font-size: 18px;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
      color: #2c2c2c;
      border-left: 4px solid #1565C0;
      padding-left: 10px;
    }
    
    h3 {
      font-size: 14px;
      font-weight: bold;
      margin-top: 15px;
      margin-bottom: 8px;
      color: #444;
    }
    
    p {
      margin-bottom: 8px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .header-title {
      font-size: 28px;
      font-weight: bold;
      color: #1565C0;
      margin-bottom: 5px;
    }
    
    .header-subtitle {
      font-size: 14px;
      color: #666;
    }
    
    .header-date {
      font-size: 11px;
      color: #999;
      margin-top: 5px;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .card {
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .stat-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1565C0;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 11px;
    }
    
    th {
      background: #1565C0;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: bold;
    }
    
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      font-size: 10px;
      color: #999;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    
    .badge-success {
      background: #e3f2fd;
      color: #0d47a1;
    }
    
    .badge-warning {
      background: #fff3cd;
      color: #856404;
    }
    
    .badge-danger {
      background: #f8d7da;
      color: #721c24;
    }
    
    .badge-info {
      background: #d1ecf1;
      color: #0c5460;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-success {
      color: #1976D2;
    }
    
    .text-danger {
      color: #dc3545;
    }
    
    .text-warning {
      color: #ffc107;
    }
    
    .mb-2 {
      margin-bottom: 10px;
    }
    
    .mt-2 {
      margin-top: 10px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .page-break {
        page-break-before: always;
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
      <h1>${title}</h1>
      <p>${subtitle}</p>
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
