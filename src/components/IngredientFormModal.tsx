/**
 * Composant formulaire modal pour ingrédient
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppDispatch } from '../store/hooks';
import { createIngredient } from '../store/slices/nutritionSlice';
import { CreateIngredientInput } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { COLORS, SPACING } from '../constants/theme';

interface IngredientFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IngredientFormModal({
  visible,
  onClose,
  onSuccess,
}: IngredientFormModalProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateIngredientInput>({
    nom: '',
    unite: 'kg',
    prix_unitaire: 0,
    proteine_pourcent: undefined,
    energie_kcal: undefined,
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.nom.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'ingrédient est requis');
      return;
    }
    if (formData.prix_unitaire <= 0) {
      Alert.alert('Erreur', 'Le prix unitaire doit être supérieur à 0');
      return;
    }

    setLoading(true);
    try {
      await dispatch(createIngredient(formData)).unwrap();
      onSuccess();
      // Reset form
      setFormData({
        nom: '',
        unite: 'kg',
        prix_unitaire: 0,
        proteine_pourcent: undefined,
        energie_kcal: undefined,
      });
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de la création de l\'ingrédient');
    } finally {
      setLoading(false);
    }
  };

  const unites: ('kg' | 'g' | 'l' | 'ml')[] = ['kg', 'g', 'l', 'ml'];

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="Nouvel ingrédient"
      confirmText="Créer"
      onConfirm={handleSubmit}
      showButtons={true}
    >
      <ScrollView style={styles.scrollView}>
        <FormField
          label="Nom de l'ingrédient *"
          value={formData.nom}
          onChangeText={(text) => setFormData({ ...formData, nom: text })}
          placeholder="Ex: Maïs"
          required
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unité *</Text>
          <View style={styles.optionsContainer}>
            {unites.map((unite) => (
              <TouchableOpacity
                key={unite}
                style={[
                  styles.option,
                  formData.unite === unite && styles.optionSelected,
                ]}
                onPress={() => setFormData({ ...formData, unite })}
              >
                <Text
                  style={[
                    styles.optionText,
                    formData.unite === unite && styles.optionTextSelected,
                  ]}
                >
                  {unite.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormField
          label="Prix unitaire (CFA) *"
          value={formData.prix_unitaire.toString()}
          onChangeText={(text) =>
            setFormData({ ...formData, prix_unitaire: parseFloat(text) || 0 })
          }
          placeholder="0"
          keyboardType="numeric"
          required
        />

        <FormField
          label="Protéines (%)"
          value={formData.proteine_pourcent?.toString() || ''}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              proteine_pourcent: text ? parseFloat(text) : undefined,
            })
          }
          placeholder="Ex: 15"
          keyboardType="decimal-pad"
        />

        <FormField
          label="Énergie (kcal/kg)"
          value={formData.energie_kcal?.toString() || ''}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              energie_kcal: text ? parseFloat(text) : undefined,
            })
          }
          placeholder="Ex: 3500"
          keyboardType="numeric"
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
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
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
    color: COLORS.background,
    fontWeight: '600',
  },
});

