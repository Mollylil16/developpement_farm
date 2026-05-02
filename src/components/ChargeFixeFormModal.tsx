/**
 * Composant formulaire modal pour charge fixe
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createChargeFixe, updateChargeFixe } from '../store/slices/financeSlice';
import type { ChargeFixe, CreateChargeFixeInput, CategorieChargeFixe, FrequenceCharge } from '../types/finance';
import CustomModal from './CustomModal';
import FormField from './FormField';
import DatePickerField from './DatePickerField';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';
import { useProjetEffectif } from '../hooks/useProjetEffectif';

interface ChargeFixeFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chargeFixe?: ChargeFixe | null;
  isEditing?: boolean;
}

export default function ChargeFixeFormModal({
  visible,
  onClose,
  onSuccess,
  chargeFixe,
  isEditing = false,
}: ChargeFixeFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate } = useActionPermissions();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateChargeFixeInput>({
    categorie: 'autre',
    libelle: '',
    montant: 0,
    date_debut: new Date().toISOString().split('T')[0],
    frequence: 'mensuel',
    jour_paiement: undefined,
    notes: '',
  });

  useEffect(() => {
    if (chargeFixe && isEditing) {
      setFormData({
        categorie: chargeFixe.categorie,
        libelle: chargeFixe.libelle,
        montant: chargeFixe.montant,
        date_debut: chargeFixe.date_debut.split('T')[0],
        frequence: chargeFixe.frequence,
        jour_paiement: chargeFixe.jour_paiement,
        notes: chargeFixe.notes || '',
      });
    } else {
      // Reset form
      setFormData({
        categorie: 'autre',
        libelle: '',
        montant: 0,
        date_debut: new Date().toISOString().split('T')[0],
        frequence: 'mensuel',
        jour_paiement: undefined,
        notes: '',
      });
    }
  }, [chargeFixe, isEditing, visible]);

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('finance')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier les charges fixes."
      );
      return;
    }
    if (!isEditing && !canCreate('finance')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de créer des charges fixes."
      );
      return;
    }

    // Validation
    if (!formData.libelle.trim()) {
      return;
    }
    if (formData.montant <= 0) {
      return;
    }
    if (formData.frequence === 'mensuel' && !formData.jour_paiement) {
      return;
    }

    setLoading(true);
    try {
      if (isEditing && chargeFixe) {
        await dispatch(
          updateChargeFixe({
            id: chargeFixe.id,
            updates: formData,
          })
        ).unwrap();
      } else {
        await dispatch(
          createChargeFixe({
            ...formData,
            projet_id: projetActif?.id,
          })
        ).unwrap();
      }
      onSuccess();
    } catch (error: unknown) {
      logger.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories: CategorieChargeFixe[] = [
    'salaires',
    'alimentation',
    'entretien',
    'vaccins',
    'eau_electricite',
    'autre',
  ];

  const frequences: FrequenceCharge[] = ['mensuel', 'trimestriel', 'annuel'];

  const getCategoryLabel = (cat: CategorieChargeFixe): string => {
    const labels: Record<CategorieChargeFixe, string> = {
      salaires: 'Salaires',
      alimentation: 'Alimentation',
      entretien: 'Entretien',
      vaccins: 'Vaccins',
      eau_electricite: 'Eau/Électricité',
      autre: 'Autre',
    };
    return labels[cat];
  };

  const getFrequenceLabel = (freq: FrequenceCharge): string => {
    const labels: Record<FrequenceCharge, string> = {
      mensuel: 'Mensuel',
      trimestriel: 'Trimestriel',
      annuel: 'Annuel',
    };
    return labels[freq];
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la charge fixe' : 'Nouvelle charge fixe'}
      confirmText={isEditing ? 'Modifier' : 'Créer'}
      onConfirm={handleSubmit}
      showButtons={true}
      scrollEnabled={true}
    >
      <>
        <FormField
          label="Libellé"
          value={formData.libelle}
          onChangeText={(text) => setFormData({ ...formData, libelle: text })}
          placeholder="Ex: Salaires du personnel"
          required
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Catégorie</Text>
          <View style={styles.optionsContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
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
                      color: colors.background,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {getCategoryLabel(cat)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormField
          label="Montant (CFA)"
          value={formData.montant.toString()}
          onChangeText={(text) => setFormData({ ...formData, montant: parseFloat(text) || 0 })}
          placeholder="0"
          keyboardType="numeric"
          required
        />

        <DatePickerField
          label="Date de début"
          value={formData.date_debut}
          onChange={(date) => setFormData({ ...formData, date_debut: date })}
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Fréquence</Text>
          <View style={styles.optionsContainer}>
            {frequences.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                  formData.frequence === freq && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, frequence: freq })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.frequence === freq && {
                      color: colors.background,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {getFrequenceLabel(freq)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {formData.frequence === 'mensuel' && (
          <FormField
            label="Jour de paiement (1-31)"
            value={formData.jour_paiement?.toString() || ''}
            onChangeText={(text) =>
              setFormData({
                ...formData,
                jour_paiement: text ? parseInt(text) : undefined,
              })
            }
            placeholder="Ex: 5"
            keyboardType="numeric"
            required
          />
        )}

        <FormField
          label="Notes"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Notes supplémentaires..."
          multiline
          numberOfLines={4}
        />
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
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
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
});
