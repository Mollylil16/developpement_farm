/**
 * Composant formulaire modal pour mortalité
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createMortalite, updateMortalite } from '../store/slices/mortalitesSlice';
import { Mortalite, CreateMortaliteInput, CategorieMortalite } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

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

interface MortalitesFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mortalite?: Mortalite | null;
  isEditing?: boolean;
}

export default function MortalitesFormModal({
  visible,
  onClose,
  onSuccess,
  mortalite,
  isEditing = false,
}: MortalitesFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateMortaliteInput>({
    projet_id: projetActif?.id || '',
    nombre_porcs: 1,
    date: formatDateToLocal(new Date()),
    categorie: 'porcelet',
    cause: '',
    notes: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const categories: CategorieMortalite[] = ['porcelet', 'truie', 'verrat', 'autre'];
  const categorieLabels: Record<CategorieMortalite, string> = {
    porcelet: 'Porcelet',
    truie: 'Truie',
    verrat: 'Verrat',
    autre: 'Autre',
  };

  useEffect(() => {
    if (mortalite && isEditing) {
      setFormData({
        projet_id: mortalite.projet_id,
        nombre_porcs: mortalite.nombre_porcs,
        date: mortalite.date.split('T')[0],
        categorie: mortalite.categorie,
        cause: mortalite.cause || '',
        notes: mortalite.notes || '',
      });
    } else {
      setFormData({
        projet_id: projetActif?.id || '',
        nombre_porcs: 1,
        date: formatDateToLocal(new Date()),
        categorie: 'porcelet',
        cause: '',
        notes: '',
      });
      setShowDatePicker(false);
    }
  }, [mortalite, isEditing, visible, projetActif]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.projet_id) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }
    if (formData.nombre_porcs <= 0) {
      Alert.alert('Erreur', 'Le nombre de porcs doit être supérieur à 0');
      return;
    }
    if (!formData.date) {
      Alert.alert('Erreur', 'La date est requise');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && mortalite) {
        await dispatch(
          updateMortalite({
            id: mortalite.id,
            updates: formData,
          })
        ).unwrap();
      } else {
        await dispatch(createMortalite(formData)).unwrap();
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erreur', error || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la mortalité' : 'Nouvelle mortalité'}
      confirmText={isEditing ? 'Modifier' : 'Créer'}
      onConfirm={handleSubmit}
      showButtons={true}
      loading={loading}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>

          <FormField
            label="Nombre de porcs"
            value={formData.nombre_porcs.toString()}
            onChangeText={(text) =>
              setFormData({ ...formData, nombre_porcs: parseInt(text) || 0 })
            }
            keyboardType="numeric"
            placeholder="Ex: 2"
          />

          <View style={styles.dateContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Date</Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateButtonText, { color: colors.text }]}>
                {formData.date
                  ? parseLocalDate(formData.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : 'Sélectionner une date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.date ? parseLocalDate(formData.date) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate && event.type !== 'dismissed') {
                    setFormData({
                      ...formData,
                      date: formatDateToLocal(selectedDate),
                    });
                  }
                }}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Catégorie</Text>
            <View style={styles.optionsContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.option,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    formData.categorie === cat && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, categorie: cat })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      formData.categorie === cat && {
                        color: colors.textOnPrimary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {categorieLabels[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FormField
            label="Cause (optionnel)"
            value={formData.cause}
            onChangeText={(text) => setFormData({ ...formData, cause: text })}
            placeholder="Ex: Maladie, Accident..."
            multiline
          />

          <FormField
            label="Notes (optionnel)"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Ajoutez des notes..."
            multiline
          />
        </View>
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
    marginBottom: SPACING.md,
  },
  dateContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  dateButton: {
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 16,
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

