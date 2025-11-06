/**
 * Composant formulaire modal pour charge fixe
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAppDispatch } from '../store/hooks';
import { createChargeFixe, updateChargeFixe } from '../store/slices/financeSlice';
import { ChargeFixe, CreateChargeFixeInput, CategorieChargeFixe, FrequenceCharge } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { COLORS, SPACING } from '../constants/theme';

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
  const dispatch = useAppDispatch();
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
        await dispatch(createChargeFixe(formData)).unwrap();
      }
      onSuccess();
    } catch (error: any) {
      console.error('Erreur:', error);
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
    >
      <ScrollView style={styles.scrollView}>
        <FormField
          label="Libellé"
          value={formData.libelle}
          onChangeText={(text) => setFormData({ ...formData, libelle: text })}
          placeholder="Ex: Salaires du personnel"
          required
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégorie</Text>
          <View style={styles.optionsContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.option,
                  formData.categorie === cat && styles.optionSelected,
                ]}
                onPress={() => setFormData({ ...formData, categorie: cat })}
              >
                <Text
                  style={[
                    styles.optionText,
                    formData.categorie === cat && styles.optionTextSelected,
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
          onChangeText={(text) =>
            setFormData({ ...formData, montant: parseFloat(text) || 0 })
          }
          placeholder="0"
          keyboardType="numeric"
          required
        />

        <FormField
          label="Date de début"
          value={formData.date_debut}
          onChangeText={(text) => setFormData({ ...formData, date_debut: text })}
          placeholder="YYYY-MM-DD"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fréquence</Text>
          <View style={styles.optionsContainer}>
            {frequences.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.option,
                  formData.frequence === freq && styles.optionSelected,
                ]}
                onPress={() => setFormData({ ...formData, frequence: freq })}
              >
                <Text
                  style={[
                    styles.optionText,
                    formData.frequence === freq && styles.optionTextSelected,
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


