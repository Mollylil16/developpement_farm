/**
 * Composant pour l'export et l'import de données
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
// Note: expo-document-picker n'est pas installé par défaut
// Pour l'import, on utilisera une approche alternative avec expo-file-system
// L'utilisateur devra copier le fichier JSON dans le répertoire de l'app
import { useAppSelector } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import {
  exportAndShareJSON,
  exportAndShareCSV,
  importDataFromJSON,
  readJSONFile,
} from '../services/exportService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from './Button';
import Card from './Card';
import { useProjetEffectif } from '../hooks/useProjetEffectif';

export default function ExportImportComponent() {
  const { colors } = useTheme();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExportJSON = async () => {
    if (!projetActif) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }

    setExporting(true);
    try {
      await exportAndShareJSON(projetActif.id);
      Alert.alert('Succès', 'Données exportées avec succès !');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'export";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async (module?: string) => {
    if (!projetActif) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }

    setExporting(true);
    try {
      await exportAndShareCSV(projetActif.id, module);
      Alert.alert('Succès', 'Données exportées en CSV avec succès !');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'export CSV";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const handleImportJSON = async () => {
    if (!projetActif) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }

    Alert.alert(
      'Import de données',
      "Pour importer des données, vous devez partager un fichier JSON avec l'application Fermier Pro. Cette fonctionnalité nécessite l'installation de expo-document-picker. Pour l'instant, utilisez l'export JSON pour sauvegarder vos données.",
      [{ text: 'OK', style: 'default' }]
    );
  };

  if (!projetActif) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Créez ou sélectionnez un projet pour exporter/importer des données
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📤</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Export de données</Text>
        </View>

        <Card elevation="medium" padding="large" style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Export complet (JSON)</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Exporte toutes les données de votre projet au format JSON. Idéal pour la sauvegarde
            complète.
          </Text>
          <Button
            title={exporting ? 'Export en cours...' : 'Exporter en JSON'}
            onPress={handleExportJSON}
            disabled={exporting}
            loading={exporting}
            style={styles.button}
          />
        </Card>

        <Card elevation="medium" padding="large" style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Export CSV par module</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Exporte les données d'un module spécifique au format CSV. Compatible avec Excel.
          </Text>
          <View style={styles.csvButtons}>
            <Button
              title="Gestations"
              onPress={() => handleExportCSV('gestations')}
              disabled={exporting}
              variant="outline"
              size="small"
              style={styles.csvButton}
            />
            <Button
              title="Mortalités"
              onPress={() => handleExportCSV('mortalites')}
              disabled={exporting}
              variant="outline"
              size="small"
              style={styles.csvButton}
            />
            <Button
              title="Finances"
              onPress={() => handleExportCSV('finances')}
              disabled={exporting}
              variant="outline"
              size="small"
              style={styles.csvButton}
            />
            <Button
              title="Production"
              onPress={() => handleExportCSV('production')}
              disabled={exporting}
              variant="outline"
              size="small"
              style={styles.csvButton}
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📥</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Import de données</Text>
        </View>

        <Card elevation="medium" padding="large" style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Import depuis JSON</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Importe les données depuis un fichier JSON exporté précédemment. Les données seront
            ajoutées à votre base actuelle.
          </Text>
          <Text
            style={[
              styles.warningText,
              { color: colors.warning, backgroundColor: colors.warning + '10' },
            ]}
          >
            ⚠️ Attention : Les doublons seront ignorés. Assurez-vous que le fichier provient bien
            d'une exportation Fermier Pro.
          </Text>
          <Button
            title={importing ? 'Import en cours...' : 'Importer depuis JSON'}
            onPress={handleImportJSON}
            disabled={importing}
            loading={importing}
            style={styles.button}
          />
        </Card>
      </View>

      <View style={[styles.infoSection, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>ℹ️ Informations</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          • Les exports JSON contiennent toutes les données de votre projet
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          • Les exports CSV sont limités à un module à la fois
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          • Les fichiers peuvent être partagés par email, WhatsApp, ou sauvegardés dans le cloud
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          • L'import ajoute les données sans supprimer les données existantes
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionIcon: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.3,
  },
  card: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  cardDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  warningText: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  button: {
    marginTop: SPACING.sm,
  },
  csvButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    marginHorizontal: -SPACING.xs / 2,
  },
  csvButton: {
    marginHorizontal: SPACING.xs / 2,
    marginBottom: SPACING.xs,
    minWidth: 100,
  },
  infoSection: {
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    padding: SPACING.xl,
  },
});
