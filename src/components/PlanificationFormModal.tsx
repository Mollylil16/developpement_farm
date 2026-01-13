/**
 * Composant formulaire modal pour planification
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createPlanification, updatePlanification } from '../store/slices/planificationSlice';
import type {
  Planification,
  CreatePlanificationInput,
  TypeTache,
  StatutTache,
} from '../types/planification';
import { TYPE_TACHE_LABELS, STATUT_TACHE_LABELS } from '../types/planification';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { selectAllGestations, selectAllSevrages } from '../store/selectors/reproductionSelectors';

// Fonction helper pour convertir une date en format local YYYY-MM-DD
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Fonction helper pour parser une date au format YYYY-MM-DD en Date locale
const parseLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface PlanificationFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  planification?: Planification | null;
  isEditing?: boolean;
}

export default function PlanificationFormModal({
  visible,
  onClose,
  onSuccess,
  planification,
  isEditing = false,
}: PlanificationFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });
  const gestations = useAppSelector(selectAllGestations);
  const sevrages = useAppSelector(selectAllSevrages);
  const { canCreate, canUpdate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePlanificationInput>({
    projet_id: projetActif?.id || '',
    type: 'autre',
    titre: '',
    description: '',
    date_prevue: new Date().toISOString().split('T')[0],
    date_echeance: '',
    rappel: '',
    recurrence: 'aucune',
    lien_gestation_id: '',
    lien_sevrage_id: '',
    notes: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<
    'date_prevue' | 'date_echeance' | 'rappel'
  >('date_prevue');

  const types: TypeTache[] = [
    'saillie',
    'vaccination',
    'sevrage',
    'nettoyage',
    'alimentation',
    'veterinaire',
    'autre',
  ];
  const statuts: StatutTache[] = ['a_faire', 'en_cours', 'terminee', 'annulee'];
  const recurrences: Array<'aucune' | 'quotidienne' | 'hebdomadaire' | 'mensuelle'> = [
    'aucune',
    'quotidienne',
    'hebdomadaire',
    'mensuelle',
  ];

  const gestationsEnCours = useMemo(() => {
    if (!gestations || !Array.isArray(gestations)) return [];
    return gestations.filter((g) => g?.statut === 'en_cours');
  }, [gestations]);

  useEffect(() => {
    if (planification && isEditing) {
      setFormData({
        projet_id: planification.projet_id,
        type: planification.type,
        titre: planification.titre,
        description: planification.description || '',
        date_prevue: planification.date_prevue.split('T')[0],
        date_echeance: planification.date_echeance?.split('T')[0] || '',
        rappel: planification.rappel?.split('T')[0] || '',
        recurrence: planification.recurrence || 'aucune',
        lien_gestation_id: planification.lien_gestation_id || '',
        lien_sevrage_id: planification.lien_sevrage_id || '',
        notes: planification.notes || '',
      });
    } else {
      setFormData({
        projet_id: projetActif?.id || '',
        type: 'autre',
        titre: '',
        description: '',
        date_prevue: new Date().toISOString().split('T')[0],
        date_echeance: '',
        rappel: '',
        recurrence: 'aucune',
        lien_gestation_id: '',
        lien_sevrage_id: '',
        notes: '',
      });
    }
  }, [planification, isEditing, visible, projetActif]);

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('planification')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier les planifications."
      );
      return;
    }
    if (!isEditing && !canCreate('planification')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de créer des planifications."
      );
      return;
    }

    // Validation
    if (!formData.projet_id) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }
    if (!formData.titre.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }
    if (!formData.date_prevue) {
      Alert.alert('Erreur', 'La date prévue est requise');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && planification) {
        await dispatch(
          updatePlanification({
            id: planification.id,
            updates: formData,
          })
        ).unwrap();
      } else {
        await dispatch(createPlanification(formData)).unwrap();
      }
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'enregistrement";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    // Sur iOS avec 'default', le picker se ferme automatiquement
    // Sur Android, il se ferme aussi automatiquement
    setShowDatePicker(false);
    if (selectedDate && event?.type !== 'dismissed') {
      const dateStr = formatDateToLocal(selectedDate);
      setFormData({ ...formData, [datePickerField]: dateStr });
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la planification' : 'Nouvelle planification'}
      confirmText={isEditing ? 'Modifier' : 'Créer'}
      onConfirm={handleSubmit}
      showButtons={true}
      loading={loading}
      scrollEnabled={true}
    >
      <>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Type de tâche</Text>
          <View style={styles.optionsContainer}>
            {types.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  formData.type === type && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, type })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.type === type && {
                      color: colors.textOnPrimary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {TYPE_TACHE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormField
          label="Titre *"
          value={formData.titre}
          onChangeText={(text) => setFormData({ ...formData, titre: text })}
          placeholder="Ex: Vaccination des porcelets"
        />

        <FormField
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Détails de la tâche..."
          multiline
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Date prévue *</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setDatePickerField('date_prevue');
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {formData.date_prevue
                ? parseLocalDate(formData.date_prevue).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && datePickerField === 'date_prevue' && (
            <DateTimePicker
              value={parseLocalDate(formData.date_prevue)}
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Date d'échéance (optionnel)
          </Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setDatePickerField('date_echeance');
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {formData.date_echeance
                ? parseLocalDate(formData.date_echeance).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && datePickerField === 'date_echeance' && (
            <DateTimePicker
              value={formData.date_echeance ? parseLocalDate(formData.date_echeance) : new Date()}
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rappel (optionnel)</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setDatePickerField('rappel');
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {formData.rappel
                ? parseLocalDate(formData.rappel).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && datePickerField === 'rappel' && (
            <DateTimePicker
              value={formData.rappel ? parseLocalDate(formData.rappel) : new Date()}
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
        </View>

        {isEditing && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Statut</Text>
            <View style={styles.optionsContainer}>
              {statuts.map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.option,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    planification?.statut === statut && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    if (planification) {
                      dispatch(
                        updatePlanification({
                          id: planification.id,
                          updates: { statut },
                        })
                      );
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      planification?.statut === statut && {
                        color: colors.textOnPrimary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {STATUT_TACHE_LABELS[statut]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Récurrence</Text>
          <View style={styles.optionsContainer}>
            {recurrences.map((rec) => (
              <TouchableOpacity
                key={rec}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  formData.recurrence === rec && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, recurrence: rec })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.recurrence === rec && {
                      color: colors.textOnPrimary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {rec === 'aucune' ? 'Aucune' : rec.charAt(0).toUpperCase() + rec.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {Array.isArray(gestationsEnCours) && gestationsEnCours.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Lier à une gestation (optionnel)
            </Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  !formData.lien_gestation_id && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, lien_gestation_id: '' })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    !formData.lien_gestation_id && {
                      color: colors.textOnPrimary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  Aucune
                </Text>
              </TouchableOpacity>
              {gestationsEnCours.map((gestation) => (
                <TouchableOpacity
                  key={gestation.id}
                  style={[
                    styles.option,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    formData.lien_gestation_id === gestation.id && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, lien_gestation_id: gestation.id })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      formData.lien_gestation_id === gestation.id && {
                        color: colors.textOnPrimary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {gestation.truie_nom || `Truie ${gestation.truie_id}`} -{' '}
                    {new Date(gestation.date_mise_bas_prevue).toLocaleDateString('fr-FR')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <FormField
          label="Notes"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Ajoutez des notes..."
          multiline
        />
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 500,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  dateButton: {
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 16,
  },
  datePickerContainer: {
    marginTop: SPACING.sm,
    alignItems: 'center',
    minHeight: 200,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionText: {
    fontSize: 14,
  },
});
