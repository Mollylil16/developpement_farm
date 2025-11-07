/**
 * Modal pour créer une nouvelle pesée
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch } from '../store/hooks';
import { createPesee } from '../store/slices/productionSlice';
import { ProductionAnimal, CreatePeseeInput } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface ProductionPeseeFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projetId: string;
  animal: ProductionAnimal;
}

export default function ProductionPeseeFormModal({
  visible,
  onClose,
  onSuccess,
  projetId,
  animal,
}: ProductionPeseeFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePeseeInput>({
    projet_id: projetId,
    animal_id: animal.id,
    date: new Date().toISOString().split('T')[0],
    poids_kg: 0,
    commentaire: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setFormData({
        projet_id: projetId,
        animal_id: animal.id,
        date: new Date().toISOString().split('T')[0],
        poids_kg: 0,
        commentaire: '',
      });
    }
  }, [visible, projetId, animal]);

  const handleSubmit = async () => {
    if (formData.poids_kg <= 0) {
      Alert.alert('Erreur', 'Le poids doit être supérieur à 0.');
      return;
    }

    setLoading(true);
    try {
      await dispatch(createPesee(formData)).unwrap();
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de l\'enregistrement de la pesée.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={`Nouvelle pesée - ${animal.code}${animal.nom ? ` (${animal.nom})` : ''}`}
      confirmText="Enregistrer"
      onConfirm={handleSubmit}
      showButtons={true}
      loading={loading}
    >
      <ScrollView style={styles.scrollView}>
        <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Animal:</Text>
          <Text style={[styles.infoValue, { color: colors.primary }]}>
            {animal.code}
            {animal.nom && ` - ${animal.nom}`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Date de la pesée *</Text>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {new Date(formData.date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(formData.date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setFormData({
                    ...formData,
                    date: selectedDate.toISOString().split('T')[0],
                  });
                }
              }}
            />
          )}
        </View>

        <FormField
          label="Poids (kg) *"
          value={formData.poids_kg.toString()}
          onChangeText={(text) => setFormData({ ...formData, poids_kg: parseFloat(text) || 0 })}
          keyboardType="numeric"
          placeholder="0"
          required
        />

        <FormField
          label="Commentaire"
          value={formData.commentaire || ''}
          onChangeText={(text) => setFormData({ ...formData, commentaire: text })}
          placeholder="Notes sur cette pesée..."
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
  infoBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
  },
});

