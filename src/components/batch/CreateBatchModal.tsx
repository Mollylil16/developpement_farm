/**
 * Modal pour créer une nouvelle loge/bande avec ou sans population initiale
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { BatchCategory, BATCH_CATEGORY_LABELS } from '../../types/batch';
import Button from '../Button';
import { useAppSelector } from '../../store/hooks';
import { selectProjetActif } from '../../store/selectors/projetSelectors';
import apiClient from '../../services/api/apiClient';

interface CreateBatchModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateBatchModal({
  visible,
  onClose,
  onSuccess,
}: CreateBatchModalProps) {
  const { colors } = useTheme();
  const projetActif = useAppSelector(selectProjetActif);

  // États de base
  const [penName, setPenName] = useState('');
  const [category, setCategory] = useState<BatchCategory>('porcelets');
  const [notes, setNotes] = useState('');

  // Loge vide ou avec population
  const [isEmpty, setIsEmpty] = useState(false);

  // Population
  const [maleCount, setMaleCount] = useState('0');
  const [femaleCount, setFemaleCount] = useState('0');
  const [castratedCount, setCastratedCount] = useState('0');

  // Caractéristiques moyennes
  const [averageAge, setAverageAge] = useState('');
  const [averageWeight, setAverageWeight] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingNextName, setLoadingNextName] = useState(false);

  // Charger le prochain nom de loge disponible quand le modal s'ouvre
  useEffect(() => {
    if (visible && projetActif?.id) {
      loadNextPenName();
    }
  }, [visible, projetActif?.id]);

  async function loadNextPenName() {
    if (!projetActif?.id) return;
    setLoadingNextName(true);
    try {
      const response = await apiClient.get<{ pen_name: string }>(
        `/batch-pigs/projet/${projetActif.id}/next-pen-name`
      );
      setPenName(response.pen_name);
    } catch (error: any) {
      // En cas d'erreur, laisser l'utilisateur saisir manuellement
      console.warn('Impossible de charger le prochain nom de loge:', error);
    } finally {
      setLoadingNextName(false);
    }
  }

  function getTotalCount(): number {
    return (
      parseInt(maleCount || '0') +
      parseInt(femaleCount || '0') +
      parseInt(castratedCount || '0')
    );
  }

  function resetForm() {
    setPenName('');
    setCategory('porcelets');
    setIsEmpty(false);
    setMaleCount('0');
    setFemaleCount('0');
    setCastratedCount('0');
    setAverageAge('');
    setAverageWeight('');
    setNotes('');
  }

  async function handleSubmit() {
    if (!projetActif) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }

    // Validation
    if (!penName || penName.trim().length === 0) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de loge');
      return;
    }

    if (!isEmpty) {
      // Si loge avec population, valider les champs
      const totalCount = getTotalCount();

      if (totalCount === 0) {
        Alert.alert('Erreur', 'Veuillez renseigner au moins un sujet');
        return;
      }

      if (!averageAge || parseFloat(averageAge) <= 0) {
        Alert.alert(
          'Erreur',
          "L'âge moyen est requis pour une loge avec population",
        );
        return;
      }

      if (!averageWeight || parseFloat(averageWeight) <= 0) {
        Alert.alert(
          'Erreur',
          'Le poids moyen est requis pour une loge avec population',
        );
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        projet_id: projetActif.id,
        pen_name: penName.trim(),
        category,
        notes: notes || null,
      };

      // Ajouter population uniquement si loge non vide
      if (!isEmpty) {
        payload.population = {
          male_count: parseInt(maleCount || '0'),
          female_count: parseInt(femaleCount || '0'),
          castrated_count: parseInt(castratedCount || '0'),
        };
        payload.average_age_months = parseFloat(averageAge);
        payload.average_weight_kg = parseFloat(averageWeight);
      }

      await apiClient.post('/batch-pigs/create-batch', payload);

      Alert.alert(
        'Succès',
        isEmpty
          ? 'Loge vide créée avec succès'
          : `Loge créée avec ${getTotalCount()} sujets`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onSuccess();
              onClose();
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de créer la loge');
    } finally {
      setLoading(false);
    }
  }

  const categoryOptions: { value: BatchCategory; label: string }[] = [
    { value: 'porcelets', label: '🐷 Porcelets' },
    { value: 'porcs_croissance', label: '🐽 Porcs en croissance' },
    { value: 'porcs_engraissement', label: '🐖 Porcs en engraissement' },
    { value: 'truie_reproductrice', label: '🐖 Truies reproductrices' },
    { value: 'verrat_reproducteur', label: '🐗 Verrats reproducteurs' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            onPress={() => {
              resetForm();
              onClose();
            }}
          >
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Créer une loge
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Nom de la loge */}
          <Text style={[styles.label, { color: colors.text }]}>
            Nom de la loge *
          </Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
                loadingNextName && { opacity: 0.6 },
              ]}
              value={penName}
              onChangeText={setPenName}
              placeholder="Ex: A1, B1, A2..."
              placeholderTextColor={colors.textSecondary}
              editable={!loadingNextName}
            />
            {loadingNextName && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ position: 'absolute', right: 12, top: 12 }}
              />
            )}
          </View>
          {penName && !loadingNextName && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              💡 Nom généré automatiquement. Vous pouvez le modifier si besoin.
            </Text>
          )}

          {/* Catégorie */}
          <Text style={[styles.label, { color: colors.text }]}>Catégorie *</Text>
          <View style={styles.categoryGrid}>
            {categoryOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.categoryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  category === opt.value && {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}20`,
                  },
                ]}
                onPress={() => setCategory(opt.value)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    { color: colors.text },
                    category === opt.value && { color: colors.primary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Toggle loge vide */}
          <View
            style={[
              styles.toggleContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Loge vide
              </Text>
              <Text style={[styles.toggleSubtext, { color: colors.textSecondary }]}>
                Créer sans population (pour transferts futurs)
              </Text>
            </View>
            <Switch
              value={isEmpty}
              onValueChange={setIsEmpty}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Section population (si non vide) */}
          {!isEmpty && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Population initiale
              </Text>

              <View style={styles.populationGrid}>
                <View style={styles.populationItem}>
                  <Text style={[styles.populationLabel, { color: colors.text }]}>
                    ♂ Mâles
                  </Text>
                  <TextInput
                    style={[
                      styles.populationInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={maleCount}
                    onChangeText={setMaleCount}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    textAlign="center"
                  />
                </View>

                <View style={styles.populationItem}>
                  <Text style={[styles.populationLabel, { color: colors.text }]}>
                    ♀ Femelles
                  </Text>
                  <TextInput
                    style={[
                      styles.populationInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={femaleCount}
                    onChangeText={setFemaleCount}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    textAlign="center"
                  />
                </View>

                <View style={styles.populationItem}>
                  <Text style={[styles.populationLabel, { color: colors.text }]}>
                    ⚥ Castrés
                  </Text>
                  <TextInput
                    style={[
                      styles.populationInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={castratedCount}
                    onChangeText={setCastratedCount}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    textAlign="center"
                  />
                </View>
              </View>

              {/* Total */}
              <View
                style={[
                  styles.totalContainer,
                  { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <Text style={[styles.totalLabel, { color: colors.primary }]}>
                  Total :
                </Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>
                  {getTotalCount()} sujets
                </Text>
              </View>

              {/* Caractéristiques moyennes */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Caractéristiques moyennes
              </Text>

              <Text style={[styles.label, { color: colors.text }]}>
                Âge moyen (mois) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={averageAge}
                onChangeText={setAverageAge}
                keyboardType="decimal-pad"
                placeholder="Ex: 3.5"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>
                Poids moyen (kg) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={averageWeight}
                onChangeText={setAverageWeight}
                keyboardType="decimal-pad"
                placeholder="Ex: 35.5"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Info box */}
              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: `${colors.info}20` },
                ]}
              >
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  Les sujets individuels seront créés automatiquement avec des
                  variations autour de ces moyennes (±10%).
                </Text>
              </View>
            </>
          )}

          {/* Notes */}
          <Text style={[styles.label, { color: colors.text }]}>
            Notes (optionnel)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Informations complémentaires..."
            placeholderTextColor={colors.textSecondary}
          />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.divider, backgroundColor: colors.background },
          ]}
        >
          <Button
            title="Annuler"
            variant="outline"
            onPress={() => {
              resetForm();
              onClose();
            }}
            style={styles.cancelButton}
          />
          <Button
            title={
              isEmpty
                ? 'Créer loge vide'
                : `Créer avec ${getTotalCount()} sujets`
            }
            onPress={handleSubmit}
            loading={loading}
            disabled={
              !penName ||
              (!isEmpty &&
                (getTotalCount() === 0 || !averageAge || !averageWeight))
            }
            style={styles.submitButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginVertical: SPACING.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  toggleLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  toggleSubtext: {
    fontSize: FONT_SIZES.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  populationGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  populationItem: {
    flex: 1,
  },
  populationLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  populationInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  totalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  infoBox: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
  },
  infoIcon: {
    fontSize: FONT_SIZES.lg,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
});

