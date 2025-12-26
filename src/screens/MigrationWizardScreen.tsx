/**
 * Écran de migration entre modes batch et individualisé
 * Assistant en plusieurs étapes pour convertir les données
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField from '../components/FormField';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../services/api/apiClient';
import { migrationService } from '../services/migration/migrationService';
import type {
  BatchToIndividualOptions,
  IndividualToBatchOptions,
  MigrationPreview,
  MigrationResult,
} from '../services/migration/migrationService';
import MigrationPreview from '../components/migration/MigrationPreview';
import MigrationProgress from '../components/migration/MigrationProgress';
import MigrationReport from '../components/migration/MigrationReport';
import { getErrorMessage } from '../types/common';

type WizardStep =
  | 'select_type'
  | 'select_data'
  | 'configure_options'
  | 'preview'
  | 'executing'
  | 'completed';

type MigrationType = 'batch_to_individual' | 'individual_to_batch';

export default function MigrationWizardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { projetActif } = useAppSelector((state) => state.projet);

  const [step, setStep] = useState<WizardStep>('select_type');
  const [migrationType, setMigrationType] = useState<MigrationType | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedPigIds, setSelectedPigIds] = useState<string[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [pigs, setPigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');

  // Options de configuration
  const [batchToIndividualOptions, setBatchToIndividualOptions] =
    useState<BatchToIndividualOptions>({
      generateIds: true,
      idPattern: '{batch}-{seq:3}',
      distributionMethod: 'normal',
      sexRatio: { male: 0.5, female: 0.5 },
      preserveBatchReference: true,
      handleHealthRecords: 'duplicate',
      handleFeedRecords: 'divide',
      createWeightRecords: true,
      weightStdDevPercent: 10,
    });

  const [individualToBatchOptions, setIndividualToBatchOptions] =
    useState<IndividualToBatchOptions>({
      groupingCriteria: {
        byStage: true,
        byLocation: false,
        bySex: false,
        byBreed: false,
        ageToleranceDays: 7,
      },
      batchNumberPattern: 'B{year}{seq:3}',
      aggregateHealthRecords: true,
      aggregateFeedRecords: true,
      keepIndividualRecords: false,
      minimumBatchSize: 10,
    });

  useEffect(() => {
    if (projetActif?.id) {
      loadData();
    }
  }, [projetActif?.id]);

  const loadData = async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      // Charger les bandes
      const batchesData = await apiClient.get<any[]>(`/batches`, {
        params: { projet_id: projetActif.id },
      });
      setBatches(batchesData || []);

      // Charger les animaux individuels
      const pigsData = await apiClient.get<any[]>(`/production/animaux`, {
        params: { projet_id: projetActif.id },
      });
      setPigs((pigsData || []).filter((p: any) => p.actif && p.statut === 'actif'));
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectType = (type: MigrationType) => {
    setMigrationType(type);
    setStep('select_data');
  };

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
  };

  const handleSelectPigs = (pigId: string) => {
    setSelectedPigIds((prev) =>
      prev.includes(pigId) ? prev.filter((id) => id !== pigId) : [...prev, pigId],
    );
  };

  const handlePreview = async () => {
    if (!migrationType || !projetActif?.id) return;

    setLoading(true);
    try {
      if (migrationType === 'batch_to_individual' && selectedBatchId) {
        const previewData = await migrationService.previewBatchToIndividual(
          selectedBatchId,
          batchToIndividualOptions,
        );
        setPreview(previewData);
      } else if (migrationType === 'individual_to_batch' && selectedPigIds.length > 0) {
        const previewData = await migrationService.previewIndividualToBatch(
          selectedPigIds,
          individualToBatchOptions,
        );
        setPreview(previewData);
      }
      setStep('preview');
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error) || 'Impossible de générer la prévisualisation');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteMigration = async () => {
    if (!migrationType || !projetActif?.id) return;

    setStep('executing');
    setProgress(0);
    setCurrentStepText('Initialisation...');

    try {
      let result: MigrationResult;

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      if (migrationType === 'batch_to_individual' && selectedBatchId) {
        setCurrentStepText('Conversion des porcs...');
        result = await migrationService.convertBatchToIndividual(
          selectedBatchId,
          batchToIndividualOptions,
        );
      } else if (migrationType === 'individual_to_batch' && selectedPigIds.length > 0) {
        setCurrentStepText('Regroupement en bandes...');
        result = await migrationService.convertIndividualToBatch(
          selectedPigIds,
          individualToBatchOptions,
        );
      } else {
        throw new Error('Données manquantes pour la migration');
      }

      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStepText('Terminé !');
      setMigrationResult(result);
      setStep('completed');

      // Recharger les données
      await loadData();
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error) || 'La migration a échoué');
      setStep('preview');
      setProgress(0);
    }
  };

  const handleCancel = () => {
    Alert.alert('Annuler', 'Êtes-vous sûr de vouloir annuler la migration ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: () => {
          setStep('select_type');
          setProgress(0);
          setMigrationResult(null);
          setPreview(null);
        },
      },
    ]);
  };

  const renderStepContent = () => {
    switch (step) {
      case 'select_type':
        return renderSelectTypeStep();
      case 'select_data':
        return renderSelectDataStep();
      case 'configure_options':
        return renderConfigureOptionsStep();
      case 'preview':
        return renderPreviewStep();
      case 'executing':
        return renderExecutingStep();
      case 'completed':
        return renderCompletedStep();
      default:
        return null;
    }
  };

  const renderSelectTypeStep = () => (
    <View>
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Choisissez le type de conversion
        </Text>
        <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
          Sélectionnez la direction de la migration de vos données
        </Text>

        <View style={styles.typeOptions}>
          <TouchableOpacity
            style={[
              styles.typeOption,
              { borderColor: colors.border, backgroundColor: colors.surface },
              migrationType === 'batch_to_individual' && {
                borderColor: colors.primary,
                backgroundColor: colors.primaryLight + '15',
              },
            ]}
            onPress={() => handleSelectType('batch_to_individual')}
          >
            <Ionicons
              name="layers-outline"
              size={32}
              color={migrationType === 'batch_to_individual' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.typeTitle, { color: colors.text }]}>
              Bande → Individualisé
            </Text>
            <Text style={[styles.typeDescription, { color: colors.textSecondary }]}>
              Créer des animaux individuels à partir d'une bande
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeOption,
              { borderColor: colors.border, backgroundColor: colors.surface },
              migrationType === 'individual_to_batch' && {
                borderColor: colors.primary,
                backgroundColor: colors.primaryLight + '15',
              },
            ]}
            onPress={() => handleSelectType('individual_to_batch')}
          >
            <Ionicons
              name="people-outline"
              size={32}
              color={
                migrationType === 'individual_to_batch' ? colors.primary : colors.textSecondary
              }
            />
            <Text style={[styles.typeTitle, { color: colors.text }]}>
              Individualisé → Bande
            </Text>
            <Text style={[styles.typeDescription, { color: colors.textSecondary }]}>
              Regrouper des animaux individuels en bandes
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );

  const renderSelectDataStep = () => {
    if (migrationType === 'batch_to_individual') {
      return (
        <View>
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Sélectionnez la bande
            </Text>

            {batches.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune bande disponible
              </Text>
            ) : (
              <View style={styles.list}>
                {batches.map((batch) => (
                  <TouchableOpacity
                    key={batch.id}
                    style={[
                      styles.listItem,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      selectedBatchId === batch.id && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primaryLight + '15',
                      },
                    ]}
                    onPress={() => handleSelectBatch(batch.id)}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={[styles.listItemTitle, { color: colors.text }]}>
                        {batch.pen_name}
                      </Text>
                      <Text style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                        {batch.total_count} porcs • {batch.category}
                      </Text>
                    </View>
                    {selectedBatchId === batch.id && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        </View>
      );
    } else {
      return (
        <View>
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Sélectionnez les animaux ({selectedPigIds.length} sélectionné{selectedPigIds.length > 1 ? 's' : ''})
            </Text>

            {pigs.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucun animal disponible
              </Text>
            ) : (
              <View style={styles.list}>
                {pigs.map((pig) => (
                  <TouchableOpacity
                    key={pig.id}
                    style={[
                      styles.listItem,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      selectedPigIds.includes(pig.id) && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primaryLight + '15',
                      },
                    ]}
                    onPress={() => handleSelectPigs(pig.id)}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={[styles.listItemTitle, { color: colors.text }]}>
                        {pig.code || pig.nom || `Porc ${pig.id.slice(-6)}`}
                      </Text>
                      <Text style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                        {pig.poids_initial ? `${pig.poids_initial} kg` : 'Poids non renseigné'}
                      </Text>
                    </View>
                    {selectedPigIds.includes(pig.id) && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        </View>
      );
    }
  };

  const renderConfigureOptionsStep = () => {
    // Configuration simplifiée - pourrait être étendue
    return (
      <View>
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Options de migration
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Les options par défaut sont optimisées pour la plupart des cas
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            ℹ️ Vous pourrez ajuster ces options dans une future version
          </Text>
        </Card>
      </View>
    );
  };

  const renderPreviewStep = () => (
    <View>
      {preview && (
        <MigrationPreview
          preview={preview}
          type={migrationType === 'batch_to_individual' ? 'batch_to_individual' : 'individual_to_batch'}
        />
      )}
    </View>
  );

  const renderExecutingStep = () => (
    <View>
      <MigrationProgress
        progress={progress}
        currentStep={currentStepText}
        steps={['Initialisation', 'Conversion', 'Finalisation']}
        canCancel={true}
        onCancel={handleCancel}
      />
    </View>
  );

  const renderCompletedStep = () => (
    <View>
      {migrationResult && (
        <MigrationReport
          result={migrationResult}
          type={migrationType === 'batch_to_individual' ? 'batch_to_individual' : 'individual_to_batch'}
          onClose={() => {
            navigation.goBack();
          }}
        />
      )}
    </View>
  );

  const canContinue = () => {
    switch (step) {
      case 'select_type':
        return migrationType !== null;
      case 'select_data':
        return migrationType === 'batch_to_individual'
          ? selectedBatchId !== null
          : selectedPigIds.length > 0;
      case 'configure_options':
        return true;
      case 'preview':
        return preview !== null;
      default:
        return false;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StandardHeader
        icon="swap-horizontal-outline"
        title="Migration de données"
        subtitle={
          step === 'select_type'
            ? 'Choisissez le type de conversion'
            : step === 'select_data'
              ? 'Sélectionnez les données'
              : step === 'preview'
                ? 'Vérifiez les détails'
                : step === 'executing'
                  ? 'Migration en cours...'
                  : 'Migration terminée'
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={colors.primary} />
        }
      >
        {renderStepContent()}
      </ScrollView>

      {step !== 'executing' && step !== 'completed' && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {step !== 'select_type' && (
            <Button
              title="Retour"
              onPress={() => {
                if (step === 'preview') {
                  setStep('select_data');
                } else if (step === 'configure_options') {
                  setStep('select_data');
                } else if (step === 'select_data') {
                  setStep('select_type');
                }
              }}
              variant="outline"
              style={styles.footerButton}
            />
          )}

          <Button
            title={
              step === 'preview'
                ? 'Lancer la migration'
                : step === 'configure_options'
                  ? 'Prévisualiser'
                  : 'Continuer'
            }
            onPress={() => {
              if (step === 'select_data') {
                setStep('configure_options');
              } else if (step === 'configure_options') {
                handlePreview();
              } else if (step === 'preview') {
                handleExecuteMigration();
              }
            }}
            disabled={!canContinue() || loading}
            loading={loading}
            style={styles.footerButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  sectionDescription: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
  },
  typeOptions: {
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  typeOption: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  typeTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  typeDescription: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  list: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  listItem: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  listItemSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    padding: SPACING.xl,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    marginTop: SPACING.md,
  },
  footer: {
    borderTopWidth: 1,
    padding: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  footerButton: {
    flex: 1,
  },
});

