/**
 * Modal pour créer ou modifier un animal en production
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch } from '../store/hooks';
import { createProductionAnimal, updateProductionAnimal } from '../store/slices/productionSlice';
import { ProductionAnimal, CreateProductionAnimalInput, SexeAnimal, StatutAnimal, STATUT_ANIMAL_LABELS } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
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

interface ProductionAnimalFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projetId: string;
  animal?: ProductionAnimal | null;
  isEditing?: boolean;
}

export default function ProductionAnimalFormModal({
  visible,
  onClose,
  onSuccess,
  projetId,
  animal,
  isEditing = false,
}: ProductionAnimalFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProductionAnimalInput>({
    projet_id: projetId,
    code: '',
    nom: '',
    origine: '',
    sexe: 'indetermine',
    date_naissance: '',
    poids_initial: 0,
    date_entree: '',
    statut: 'actif',
    notes: '',
  });
  const [showDateNaissancePicker, setShowDateNaissancePicker] = useState(false);
  const [showDateEntreePicker, setShowDateEntreePicker] = useState(false);

  useEffect(() => {
    if (animal && isEditing) {
      setFormData({
        projet_id: animal.projet_id,
        code: animal.code,
        nom: animal.nom || '',
        origine: animal.origine || '',
        sexe: animal.sexe,
        date_naissance: animal.date_naissance || '',
        poids_initial: animal.poids_initial || 0,
        date_entree: animal.date_entree || '',
        statut: animal.statut || 'actif',
        notes: animal.notes || '',
      });
    } else {
      setFormData({
        projet_id: projetId,
        code: '',
        nom: '',
        origine: '',
        sexe: 'indetermine',
        date_naissance: '',
        poids_initial: 0,
        date_entree: '',
        statut: 'actif',
        notes: '',
      });
    }
  }, [animal, isEditing, visible, projetId]);

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      Alert.alert('Erreur', 'Le code de l\'animal est requis.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && animal) {
        await dispatch(
          updateProductionAnimal({
            id: animal.id,
            updates: formData,
          })
        ).unwrap();
      } else {
        await dispatch(createProductionAnimal(formData)).unwrap();
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  };

  const sexes: SexeAnimal[] = ['male', 'femelle', 'indetermine'];

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier l\'animal' : 'Nouvel animal'}
      confirmText={isEditing ? 'Modifier' : 'Ajouter'}
      onConfirm={handleSubmit}
      showButtons={true}
      loading={loading}
    >
      <ScrollView style={styles.scrollView}>
        <FormField
          label="Code de l'animal *"
          value={formData.code}
          onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
          placeholder="Ex: PORC001"
          required
        />
        <FormField
          label="Nom (optionnel)"
          value={formData.nom || ''}
          onChangeText={(text) => setFormData({ ...formData, nom: text })}
          placeholder="Ex: Gros Cochon"
        />
        <FormField
          label="Origine"
          value={formData.origine || ''}
          onChangeText={(text) => setFormData({ ...formData, origine: text })}
          placeholder="Ex: Élevage X, Achat Y"
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sexe *</Text>
          <View style={styles.optionsContainer}>
            {sexes.map((sexe) => (
              <TouchableOpacity
                key={sexe}
                style={[
                  styles.option,
                  {
                    borderColor: formData.sexe === sexe ? colors.primary : colors.border,
                    backgroundColor: formData.sexe === sexe ? colors.primary : colors.background,
                  },
                ]}
                onPress={() => setFormData({ ...formData, sexe })}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: formData.sexe === sexe ? colors.textOnPrimary : colors.text,
                      fontWeight: formData.sexe === sexe ? '600' : 'normal',
                    },
                  ]}
                >
                  {sexe === 'male' ? 'Mâle' : sexe === 'femelle' ? 'Femelle' : 'Indéterminé'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Date de naissance</Text>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowDateNaissancePicker(true)}
          >
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {formData.date_naissance
                ? parseLocalDate(formData.date_naissance).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDateNaissancePicker && (
            <DateTimePicker
              value={formData.date_naissance ? parseLocalDate(formData.date_naissance) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDateNaissancePicker(false);
                if (selectedDate && event.type !== 'dismissed') {
                  setFormData({
                    ...formData,
                    date_naissance: formatDateToLocal(selectedDate),
                  });
                }
              }}
            />
          )}
        </View>

        <FormField
          label="Poids initial (kg)"
          value={formData.poids_initial?.toString() || '0'}
          onChangeText={(text) => setFormData({ ...formData, poids_initial: parseFloat(text) || 0 })}
          keyboardType="numeric"
          placeholder="0"
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Date d'entrée</Text>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowDateEntreePicker(true)}
          >
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {formData.date_entree
                ? parseLocalDate(formData.date_entree).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDateEntreePicker && (
            <DateTimePicker
              value={formData.date_entree ? parseLocalDate(formData.date_entree) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDateEntreePicker(false);
                if (selectedDate && event.type !== 'dismissed') {
                  setFormData({
                    ...formData,
                    date_entree: formatDateToLocal(selectedDate),
                  });
                }
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Statut *</Text>
          <View style={styles.optionsContainer}>
            {(['actif', 'mort', 'vendu', 'offert', 'autre'] as StatutAnimal[]).map((statut) => (
              <TouchableOpacity
                key={statut}
                style={[
                  styles.option,
                  {
                    borderColor: formData.statut === statut ? colors.primary : colors.border,
                    backgroundColor: formData.statut === statut ? colors.primary : colors.background,
                  },
                ]}
                onPress={() => setFormData({ ...formData, statut })}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: formData.statut === statut ? colors.textOnPrimary : colors.text,
                      fontWeight: formData.statut === statut ? '600' : 'normal',
                    },
                  ]}
                >
                  {STATUT_ANIMAL_LABELS[statut]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormField
          label="Notes (vaccins, dates, etc.)"
          value={formData.notes || ''}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Notes supplémentaires sur cet animal (vaccins, dates, etc.)..."
          multiline
          numberOfLines={3}
        />
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 500,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs / 2,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginHorizontal: SPACING.xs / 2,
    marginBottom: SPACING.xs,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
  },
  datePickerContainer: {
    marginTop: SPACING.sm,
    alignItems: 'center',
    minHeight: 200,
  },
});

