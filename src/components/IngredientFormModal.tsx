/**
 * Composant formulaire modal pour ingrédient
 * Permet de créer ou modifier un ingrédient avec auto-remplissage des valeurs nutritionnelles
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppDispatch } from '../store/hooks';
import { createIngredient, updateIngredient } from '../store/slices/nutritionSlice';
import type { CreateIngredientInput, Ingredient } from '../types/nutrition';
import { getValeursNutritionnelles } from '../types/nutrition';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';

interface IngredientFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ingredient?: Ingredient | null; // Pour la modification
  isEditing?: boolean;
}

export default function IngredientFormModal({
  visible,
  onClose,
  onSuccess,
  ingredient,
  isEditing = false,
}: IngredientFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateIngredientInput>({
    nom: '',
    unite: 'kg',
    prix_unitaire: 0,
    proteine_pourcent: undefined,
    energie_kcal: undefined,
  });
  const [equivalentsSuggeres, setEquivalentsSuggeres] = useState<string[]>([]);
  const [autoFilled, setAutoFilled] = useState(false);

  // Remplir le formulaire si en mode édition
  useEffect(() => {
    if (ingredient && isEditing) {
      setFormData({
        nom: ingredient.nom,
        unite: ingredient.unite,
        prix_unitaire: ingredient.prix_unitaire,
        proteine_pourcent: ingredient.proteine_pourcent,
        energie_kcal: ingredient.energie_kcal,
      });
      setAutoFilled(true);
    } else {
      // Reset si nouveau
      setFormData({
        nom: '',
        unite: 'kg',
        prix_unitaire: 0,
        proteine_pourcent: undefined,
        energie_kcal: undefined,
      });
      setEquivalentsSuggeres([]);
      setAutoFilled(false);
    }
  }, [ingredient, isEditing, visible]);

  // Auto-remplir les valeurs nutritionnelles quand le nom change
  useEffect(() => {
    if (formData.nom.trim().length > 2 && !autoFilled && !isEditing) {
      const valeurs = getValeursNutritionnelles(formData.nom);
      if (valeurs) {
        setFormData((prev) => ({
          ...prev,
          proteine_pourcent: valeurs.proteine_pourcent,
          energie_kcal: valeurs.energie_kcal,
        }));
        setEquivalentsSuggeres(valeurs.equivalents || []);
        setAutoFilled(true);
      }
    }
  }, [formData.nom, autoFilled, isEditing]);

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('nutrition')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier des ingrédients."
      );
      return;
    }
    if (!isEditing && !canCreate('nutrition')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de créer des ingrédients.");
      return;
    }

    // Validation
    if (!formData.nom.trim()) {
      Alert.alert('Erreur', "Le nom de l'ingrédient est requis");
      return;
    }
    if (formData.prix_unitaire <= 0) {
      Alert.alert('Erreur', 'Le prix unitaire doit être supérieur à 0');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && ingredient) {
        // Mise à jour
        await dispatch(
          updateIngredient({
            id: ingredient.id,
            data: formData,
          })
        ).unwrap();
        Alert.alert('Succès', 'Ingrédient modifié avec succès');
      } else {
        // Création
        await dispatch(createIngredient(formData)).unwrap();
        Alert.alert('Succès', 'Ingrédient créé avec succès');
      }
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Erreur lors de ${isEditing ? 'la modification' : 'la création'} de l'ingrédient`;
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const unites: ('kg' | 'g' | 'l' | 'ml' | 'sac')[] = ['kg', 'sac', 'g', 'l', 'ml'];

  const getUniteLabel = (unite: string) => {
    if (unite === 'sac') return 'Sac (50kg)';
    return unite.toUpperCase();
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? "Modifier l'ingrédient" : 'Nouvel ingrédient'}
      confirmText={isEditing ? 'Modifier' : 'Créer'}
      onConfirm={handleSubmit}
      showButtons={true}
      scrollEnabled={true}
    >
      <>
        <FormField
          label="Nom de l'ingrédient *"
          value={formData.nom}
          onChangeText={(text) => {
            setFormData({ ...formData, nom: text });
            setAutoFilled(false); // Reset pour permettre le re-remplissage
          }}
          placeholder="Ex: Maïs grain"
          required
        />

        {/* Afficher un message si auto-rempli */}
        {autoFilled && !isEditing && (
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.success + '15', borderColor: colors.success + '30' },
            ]}
          >
            <Text style={[styles.infoText, { color: colors.success }]}>
              ✅ Valeurs nutritionnelles remplies automatiquement
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Unité *</Text>
          <View style={styles.optionsContainer}>
            {unites.map((unite) => (
              <TouchableOpacity
                key={unite}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                  formData.unite === unite && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, unite })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.unite === unite && {
                      color: colors.background,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {getUniteLabel(unite)}
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

        {/* Afficher les équivalents suggérés */}
        {equivalentsSuggeres.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              💡 Ingrédients équivalents
            </Text>
            <View
              style={[
                styles.equivalentsContainer,
                { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
              ]}
            >
              <Text style={[styles.equivalentsLabel, { color: colors.textSecondary }]}>
                Vous pouvez remplacer cet ingrédient par :
              </Text>
              <View style={styles.equivalentsList}>
                {equivalentsSuggeres.map((equiv, index) => (
                  <View
                    key={index}
                    style={[styles.equivalentBadge, { backgroundColor: colors.primary + '20' }]}
                  >
                    <Text style={[styles.equivalentText, { color: colors.primary }]}>{equiv}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </>
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
    gap: SPACING.sm,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  infoBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  equivalentsContainer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  equivalentsLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  equivalentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  equivalentBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  equivalentText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
});
