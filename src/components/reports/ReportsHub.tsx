/**
 * Composant ReportsHub - Hub central de téléchargement de rapports
 * Affiche une grille de cartes pour chaque type de rapport disponible
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector } from '../../store/hooks';
import { selectProjetActif } from '../../store/selectors/projetSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import ReportCard from './ReportCard';
import { useModeElevage } from '../../hooks/useModeElevage';
import { logger } from '../../utils/logger';
import {
  generateFinancialReportPDF,
  generateFinancialReportExcel,
} from '../../services/reports/financialReport';
import {
  generateHealthReportPDF,
  generateHealthReportExcel,
} from '../../services/reports/healthReport';
import {
  generateProductionReportPDF,
  generateProductionReportExcel,
} from '../../services/reports/productionReport';
import { generateCompleteReportPDF } from '../../services/reports/completeReport';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import Card from '../Card';

type PeriodeType = 'mois_actuel' | 'mois_precedent' | 'trimestre' | 'annee';

export default function ReportsHub() {
  const { colors } = useTheme();
  const projetActif = useAppSelector(selectProjetActif);
  const modeElevage = useModeElevage();
  const isModeBatch = modeElevage === 'bande';

  const [loadingPDF, setLoadingPDF] = useState<string | null>(null);
  const [loadingExcel, setLoadingExcel] = useState<string | null>(null);
  const [periodeType, setPeriodeType] = useState<PeriodeType>('mois_actuel');

  // Calculer les dates selon le type de période
  const getPeriodeDates = useCallback((type: PeriodeType) => {
    const maintenant = new Date();
    let debut: Date;
    let fin: Date = maintenant;

    switch (type) {
      case 'mois_actuel':
        debut = startOfMonth(maintenant);
        fin = endOfMonth(maintenant);
        break;
      case 'mois_precedent':
        const moisPrecedent = subMonths(maintenant, 1);
        debut = startOfMonth(moisPrecedent);
        fin = endOfMonth(moisPrecedent);
        break;
      case 'trimestre':
        debut = new Date(maintenant.getFullYear(), maintenant.getMonth() - 2, 1);
        fin = endOfMonth(maintenant);
        break;
      case 'annee':
        debut = new Date(maintenant.getFullYear(), 0, 1);
        fin = endOfMonth(maintenant);
        break;
      default:
        debut = startOfMonth(maintenant);
        fin = endOfMonth(maintenant);
    }

    return {
      debut,
      fin,
    };
  }, []);

  const periodeDates = useMemo(() => getPeriodeDates(periodeType), [periodeType, getPeriodeDates]);

  const handleDownload = useCallback(
    async (
      reportType: 'financial' | 'health' | 'production' | 'complete',
      format: 'pdf' | 'excel'
    ) => {
      if (!projetActif?.id) {
        Alert.alert('Erreur', 'Aucun projet actif');
        return;
      }

      const loadingKey = `${reportType}-${format}`;

      try {
        if (format === 'pdf') {
          setLoadingPDF(loadingKey);
        } else {
          setLoadingExcel(loadingKey);
        }

        const { debut, fin } = periodeDates;

        switch (reportType) {
          case 'financial':
            if (format === 'pdf') {
              await generateFinancialReportPDF(projetActif.id, isModeBatch, debut, fin);
            } else {
              await generateFinancialReportExcel(projetActif.id, isModeBatch, debut, fin);
            }
            break;

          case 'health':
            if (format === 'pdf') {
              await generateHealthReportPDF(projetActif.id, isModeBatch, debut, fin);
            } else {
              await generateHealthReportExcel(projetActif.id, isModeBatch, debut, fin);
            }
            break;

          case 'production':
            if (format === 'pdf') {
              await generateProductionReportPDF(projetActif.id, isModeBatch, debut, fin);
            } else {
              await generateProductionReportExcel(projetActif.id, isModeBatch, debut, fin);
            }
            break;

          case 'complete':
            // Rapport complet : PDF uniquement
            await generateCompleteReportPDF(projetActif.id, isModeBatch, debut, fin);
            break;

          default:
            throw new Error(`Type de rapport inconnu: ${reportType}`);
        }

        Alert.alert('Succès', `Rapport ${format.toUpperCase()} généré avec succès`);
      } catch (error: any) {
        logger.error(`Erreur génération rapport ${reportType} (${format}):`, error);
        Alert.alert(
          'Erreur',
          `Impossible de générer le rapport: ${error.message || 'Erreur inconnue'}`
        );
      } finally {
        if (format === 'pdf') {
          setLoadingPDF(null);
        } else {
          setLoadingExcel(null);
        }
      }
    },
    [projetActif?.id, isModeBatch, periodeDates]
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Centre de Rapports
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Téléchargez des rapports détaillés pour analyser votre exploitation
        </Text>
      </View>

      {/* Sélecteur de période */}
      <Card style={styles.periodCard}>
        <Text style={[styles.periodLabel, { color: colors.text }]}>Période du rapport</Text>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              periodeType === 'mois_actuel' && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setPeriodeType('mois_actuel')}
          >
            <Text
              style={[
                styles.periodButtonText,
                periodeType === 'mois_actuel' && { color: '#fff' },
                { color: colors.text },
              ]}
            >
              Mois actuel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              periodeType === 'mois_precedent' && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setPeriodeType('mois_precedent')}
          >
            <Text
              style={[
                styles.periodButtonText,
                periodeType === 'mois_precedent' && { color: '#fff' },
                { color: colors.text },
              ]}
            >
              Mois précédent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              periodeType === 'trimestre' && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setPeriodeType('trimestre')}
          >
            <Text
              style={[
                styles.periodButtonText,
                periodeType === 'trimestre' && { color: '#fff' },
                { color: colors.text },
              ]}
            >
              Trimestre
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              periodeType === 'annee' && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setPeriodeType('annee')}
          >
            <Text
              style={[
                styles.periodButtonText,
                periodeType === 'annee' && { color: '#fff' },
                { color: colors.text },
              ]}
            >
              Année
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      <View style={styles.cardsGrid}>
        {/* Carte Bilan Financier */}
        <ReportCard
          title="Bilan Financier"
          description="Aperçu complet des finances du projet, incluant revenus, dépenses et solde. Idéal pour évaluer la rentabilité globale ou par bande/individuel."
          icon="cash-outline"
          iconColor={colors.success}
          onDownloadPDF={() => handleDownload('financial', 'pdf')}
          onDownloadExcel={() => handleDownload('financial', 'excel')}
          loadingPDF={loadingPDF === 'financial-pdf'}
          loadingExcel={loadingExcel === 'financial-excel'}
          hasPDF={true}
          hasExcel={true}
        />

        {/* Carte Santé */}
        <ReportCard
          title="Santé"
          description="Rapport exhaustif sur la santé du cheptel, couvrant vaccinations, mortalité et interventions. Parfait pour tracker la couverture sanitaire en mode bande ou individuel."
          icon="medical-outline"
          iconColor={colors.error}
          onDownloadPDF={() => handleDownload('health', 'pdf')}
          onDownloadExcel={() => handleDownload('health', 'excel')}
          loadingPDF={loadingPDF === 'health-pdf'}
          loadingExcel={loadingExcel === 'health-excel'}
          hasPDF={true}
          hasExcel={true}
        />

        {/* Carte Production */}
        <ReportCard
          title="Production"
          description="Suivi détaillé de la production, du cheptel aux ventes. Essentiel pour analyser la croissance et les mouvements en élevage bande ou individuel."
          icon="trending-up-outline"
          iconColor={colors.info}
          onDownloadPDF={() => handleDownload('production', 'pdf')}
          onDownloadExcel={() => handleDownload('production', 'excel')}
          loadingPDF={loadingPDF === 'production-pdf'}
          loadingExcel={loadingExcel === 'production-excel'}
          hasPDF={true}
          hasExcel={true}
        />

        {/* Carte Rapport Complet */}
        <ReportCard
          title="Rapport Complet"
          description="Compilation exhaustive regroupant bilan financier, santé et production en un seul document. Idéal pour un audit global du projet."
          icon="document-text-outline"
          iconColor={colors.primary}
          onDownloadPDF={() => handleDownload('complete', 'pdf')}
          loadingPDF={loadingPDF === 'complete-pdf'}
          hasPDF={true}
          hasExcel={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 3, // Espace supplémentaire en bas pour éviter que la dernière carte soit masquée
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  periodCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  periodLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
  },
  periodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  periodButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 100,
  },
  periodButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    textAlign: 'center',
  },
  cardsGrid: {
    gap: SPACING.md,
  },
});
