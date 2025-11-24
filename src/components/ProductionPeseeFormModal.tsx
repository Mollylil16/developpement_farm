/**
 * Modal pour créer ou modifier une pesée
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch } from '../store/hooks';
import { createPesee, updatePesee } from '../store/slices/productionSlice';
import { ProductionAnimal, ProductionPesee, CreatePeseeInput } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';

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

interface ProductionPeseeFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projetId: string;
  animal: ProductionAnimal;
  pesee?: ProductionPesee | null;
  isEditing?: boolean;
}

export default function ProductionPeseeFormModal({
  visible,
  onClose,
  onSuccess,
  projetId,
  animal,
  pesee,
  isEditing = false,
}: ProductionPeseeFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePeseeInput>({
    projet_id: projetId,
    animal_id: animal.id,
    date: formatDateToLocal(new Date()),
    poids_kg: 0,
    commentaire: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (isEditing && pesee) {
        // Mode édition : charger les données de la pesée
        setFormData({
          projet_id: pesee.projet_id,
          animal_id: pesee.animal_id,
          date: pesee.date,
          poids_kg: pesee.poids_kg,
          commentaire: pesee.commentaire || '',
        });
      } else {
        // Mode création : données vides
        setFormData({
          projet_id: projetId,
          animal_id: animal.id,
          date: formatDateToLocal(new Date()),
          poids_kg: 0,
          commentaire: '',
        });
      }
      setShowDatePicker(false);
    }
  }, [visible, projetId, animal, pesee, isEditing]);

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('reproduction')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les pesées.");
      return;
    }
    if (!isEditing && !canCreate('reproduction')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission d'ajouter des pesées.");
      return;
    }

    if (formData.poids_kg <= 0) {
      Alert.alert('Erreur', 'Le poids doit être supérieur à 0.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && pesee) {
        await dispatch(updatePesee({ id: pesee.id, updates: formData })).unwrap();
      } else {
        await dispatch(createPesee(formData)).unwrap();
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error || `Erreur lors de ${isEditing ? 'la modification' : "l'enregistrement"} de la pesée.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={`${isEditing ? 'Modifier' : 'Nouvelle'} pesée - ${animal.code}${animal.nom ? ` (${animal.nom})` : ''}`}
      confirmText={isEditing ? 'Modifier' : 'Enregistrer'}
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
            style={[
              styles.dateButton,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
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
                // Sur iOS et Android avec 'default', le picker se ferme automatiquement
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
