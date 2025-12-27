/**
 * Service d'export Excel (CSV) pour Bilan Financier Complet
 * Format compatible Excel avec plusieurs feuilles
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BilanCompletData {
  projet: {
    nom: string;
  };
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Génère le CSV pour le bilan complet
 */
export function generateBilanCompletCSV(data: BilanCompletData): string {
  const { projet, periode, revenus, depenses, dettes, actifs, resultats, indicateurs } = data;

  let csv = '';

  // En-tête du document
  csv += 'BILAN FINANCIER COMPLET\n';
  csv += `Exploitation: ${projet.nom}\n`;
  csv += `Période: ${format(parseISO(periode.date_debut), 'dd MMM yyyy', { locale: fr })} - ${format(parseISO(periode.date_fin), 'dd MMM yyyy', { locale: fr })}\n`;
  csv += `Nombre de mois: ${periode.nombre_mois}\n`;
  csv += `Date de génération: ${new Date().toLocaleDateString('fr-FR')}\n`;
  csv += '\n';

  // Feuille 1: Résultats Financiers
  csv += '=== RÉSULTATS FINANCIERS ===\n';
  csv += 'Indicateur,Valeur (FCFA)\n';
  csv += `Solde Net,${formatCurrency(resultats.solde)}\n`;
  csv += `Marge Brute,${formatCurrency(resultats.marge_brute)}\n`;
  csv += `Cash Flow,${formatCurrency(resultats.cash_flow)}\n`;
  csv += '\n';

  // Feuille 2: Revenus
  csv += '=== REVENUS ===\n';
  csv += `Total Revenus,${formatCurrency(revenus.total)}\n`;
  csv += `Nombre de transactions,${revenus.nombre_transactions}\n`;
  csv += '\n';
  csv += 'Catégorie,Montant (FCFA),% du total\n';
  Object.entries(revenus.par_categorie).forEach(([categorie, montant]) => {
    const pourcentage = revenus.total > 0 ? ((montant / revenus.total) * 100).toFixed(2) : '0.00';
    csv += `${categorie},${formatCurrency(montant)},${pourcentage}%\n`;
  });
  csv += '\n';

  // Feuille 3: Dépenses
  csv += '=== DÉPENSES ===\n';
  csv += `Dépenses OPEX,${formatCurrency(depenses.opex_total)}\n`;
  csv += `Charges Fixes,${formatCurrency(depenses.charges_fixes_total)}\n`;
  csv += `Total Dépenses,${formatCurrency(depenses.total)}\n`;
  csv += `Nombre de transactions,${depenses.nombre_transactions}\n`;
  csv += '\n';
  csv += 'Catégorie,Montant (FCFA),% du total\n';
  Object.entries(depenses.par_categorie).forEach(([categorie, montant]) => {
    const pourcentage = depenses.total > 0 ? ((montant / depenses.total) * 100).toFixed(2) : '0.00';
    csv += `${categorie},${formatCurrency(montant)},${pourcentage}%\n`;
  });
  csv += '\n';

  // Feuille 4: Dettes
  csv += '=== DETTES ET PRÊTS ===\n';
  csv += `Total Dettes,${formatCurrency(dettes.total)}\n`;
  csv += `Nombre de dettes,${dettes.nombre}\n`;
  csv += `Intérêts mensuels,${formatCurrency(dettes.interets_mensuels)}\n`;
  csv += '\n';
  csv += 'Libellé,Montant restant (FCFA),Date échéance,Taux intérêt (%)\n';
  dettes.liste.forEach((dette) => {
    const dateEcheance = dette.date_echeance
      ? format(parseISO(dette.date_echeance), 'dd/MM/yyyy')
      : 'Non définie';
    csv += `${dette.libelle},${formatCurrency(dette.montant_restant)},${dateEcheance},${dette.taux_interet}\n`;
  });
  csv += '\n';

  // Feuille 5: Actifs
  csv += '=== ACTIFS ===\n';
  csv += 'Type,Valeur (FCFA),Détails\n';
  csv += `Valeur Cheptel,${formatCurrency(actifs.valeur_cheptel)},${actifs.nombre_animaux} animaux - Poids moyen: ${formatNumber(actifs.poids_moyen_cheptel, 1)} kg\n`;
  csv += `Valeur Stocks,${formatCurrency(actifs.valeur_stocks)},\n`;
  csv += `Total Actifs,${formatCurrency(actifs.total)},\n`;
  csv += '\n';

  // Feuille 6: Indicateurs
  csv += '=== INDICATEURS CLÉS ===\n';
  csv += 'Indicateur,Valeur\n';
  csv += `Taux d'endettement,${formatNumber(indicateurs.taux_endettement, 2)}%\n`;
  csv += `Ratio de rentabilité,${formatNumber(indicateurs.ratio_rentabilite, 2)}%\n`;
  csv += `Coût de production (OPEX/kg),${formatCurrency(indicateurs.cout_kg_opex)} FCFA/kg\n`;
  csv += `Total kg vendus,${formatNumber(indicateurs.total_kg_vendus, 0)} kg\n`;
  csv += '\n';

  // Synthèse
  csv += '=== SYNTHÈSE ===\n';
  csv += 'Poste,Valeur (FCFA)\n';
  csv += `Total Revenus,${formatCurrency(revenus.total)}\n`;
  csv += `Total Dépenses,${formatCurrency(depenses.total)}\n`;
  csv += `Solde Net,${formatCurrency(resultats.solde)}\n`;
  csv += `Total Actifs,${formatCurrency(actifs.total)}\n`;
  csv += `Total Dettes,${formatCurrency(dettes.total)}\n`;

  return csv;
}

/**
 * Exporte et partage le bilan complet en CSV (Excel)
 */
export async function exportBilanCompletExcel(data: BilanCompletData): Promise<void> {
  try {
    const csv = generateBilanCompletCSV(data);
    const periodeFormatted = `${format(parseISO(data.periode.date_debut), 'yyyy-MM-dd')}_${format(parseISO(data.periode.date_fin), 'yyyy-MM-dd')}`;
    const fileName = `Bilan_Complet_${data.projet.nom}_${periodeFormatted}.csv`;

    if (!FileSystem.documentDirectory) {
      throw new Error('Répertoire de documents non disponible');
    }

    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'Partage non disponible',
        "Le partage de fichiers n'est pas disponible sur cet appareil."
      );
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: `Exporter ${fileName}`,
      UTI: 'public.comma-separated-values-text',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    Alert.alert('Erreur', `Impossible d'exporter le bilan : ${errorMessage}`);
    throw error;
  }
}

