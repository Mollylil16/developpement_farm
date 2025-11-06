/**
 * Composant formulaire modal pour planification
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createPlanification, updatePlanification } from '../store/slices/planificationSlice';
import { Planification, CreatePlanificationInput, TypeTache, TYPE_TACHE_LABELS, StatutTache, STATUT_TACHE_LABELS } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { COLORS, SPACING } from '../constants/theme';

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
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { gestations } = useAppSelector((state) => state.reproduction);
  const { sevrages } = useAppSelector((state) => state.reproduction);
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
  const [datePickerField, setDatePickerField] = useState<'date_prevue' | 'date_echeance' | 'rappel'>('date_prevue');

  const types: TypeTache[] = ['saillie', 'vaccination', 'sevrage', 'nettoyage', 'alimentation', 'veterinaire', 'autre'];
  const statuts: StatutTache[] = ['a_faire', 'en_cours', 'terminee', 'annulee'];
  const recurrences: Array<'aucune' | 'quotidienne' | 'hebdomadaire' | 'mensuelle'> = ['aucune', 'quotidienne', 'hebdomadaire', 'mensuelle'];

  const gestationsEnCours = useMemo(() => {
    return gestations.filter((g) => g.statut === 'en_cours');
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
    } catch (error: any) {
      Alert.alert('Erreur', error || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
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
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type de tâche</Text>
          <View style={styles.optionsContainer}>
            {types.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  formData.type === type && styles.optionSelected,
                ]}
                onPress={() => setFormData({ ...formData, type })}
              >
                <Text
                  style={[
                    styles.optionText,
                    formData.type === type && styles.optionTextSelected,
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
          <Text style={styles.sectionTitle}>Date prévue *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setDatePickerField('date_prevue');
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonText}>
              {formData.date_prevue
                ? new Date(formData.date_prevue).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date d'échéance (optionnel)</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setDatePickerField('date_echeance');
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonText}>
              {formData.date_echeance
                ? new Date(formData.date_echeance).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rappel (optionnel)</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setDatePickerField('rappel');
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonText}>
              {formData.rappel
                ? new Date(formData.rappel).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
        </View>

        {isEditing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut</Text>
            <View style={styles.optionsContainer}>
              {statuts.map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.option,
                    planification?.statut === statut && styles.optionSelected,
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
                      planification?.statut === statut && styles.optionTextSelected,
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
          <Text style={styles.sectionTitle}>Récurrence</Text>
          <View style={styles.optionsContainer}>
            {recurrences.map((rec) => (
              <TouchableOpacity
                key={rec}
                style={[
                  styles.option,
                  formData.recurrence === rec && styles.optionSelected,
                ]}
                onPress={() => setFormData({ ...formData, recurrence: rec })}
              >
                <Text
                  style={[
                    styles.optionText,
                    formData.recurrence === rec && styles.optionTextSelected,
                  ]}
                >
                  {rec === 'aucune' ? 'Aucune' : rec.charAt(0).toUpperCase() + rec.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {gestationsEnCours.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lier à une gestation (optionnel)</Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.option,
                  !formData.lien_gestation_id && styles.optionSelected,
                ]}
                onPress={() => setFormData({ ...formData, lien_gestation_id: '' })}
              >
                <Text
                  style={[
                    styles.optionText,
                    !formData.lien_gestation_id && styles.optionTextSelected,
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
                    formData.lien_gestation_id === gestation.id && styles.optionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, lien_gestation_id: gestation.id })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.lien_gestation_id === gestation.id && styles.optionTextSelected,
                    ]}
                  >
                    {gestation.truie_nom || `Truie ${gestation.truie_id}`} - {new Date(gestation.date_mise_bas_prevue).toLocaleDateString('fr-FR')}
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

        {showDatePicker && (
          <DateTimePicker
            value={
              datePickerField === 'date_prevue'
                ? new Date(formData.date_prevue)
                : datePickerField === 'date_echeance' && formData.date_echeance
                ? new Date(formData.date_echeance)
                : datePickerField === 'rappel' && formData.rappel
                ? new Date(formData.rappel)
                : new Date()
            }
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDatePickerChange}
          />
        )}
      </ScrollView>
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
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  dateButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
});

