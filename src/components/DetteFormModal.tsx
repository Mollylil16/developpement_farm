/**
 * Composant formulaire modal pour dette
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { useProjetEffectif } from '../hooks/useProjetEffectif';
import type { Dette, CreateDetteInput, TypeDette, StatutDette, FrequenceRemboursement } from '../types/finance';
import CustomModal from './CustomModal';
import FormField from './FormField';
import DatePickerField from './DatePickerField';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { logger } from '../utils/logger';
import apiClient from '../services/api/apiClient';
import { TYPE_DETTE_LABELS, STATUT_DETTE_LABELS, FREQUENCE_REMBOURSEMENT_LABELS } from '../types/finance';

interface DetteFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dette?: Dette | null;
  isEditing?: boolean;
}

export default function DetteFormModal({
  visible,
  onClose,
  onSuccess,
  dette,
  isEditing = false,
}: DetteFormModalProps) {
  const { colors } = useTheme();
  const { canCreate, canUpdate } = useActionPermissions();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDetteInput>({
    projet_id: projetActif?.id || '',
    libelle: '',
    type_dette: 'pret_bancaire',
    montant_initial: 0,
    montant_restant: 0,
    taux_interet: 0,
    date_debut: new Date().toISOString().split('T')[0],
    date_echeance: undefined,
    frequence_remboursement: 'mensuel',
    montant_remboursement: undefined,
    statut: 'en_cours',
    preteur: '',
    notes: '',
  });

  useEffect(() => {
    if (dette && isEditing) {
      setFormData({
        projet_id: dette.projet_id,
        libelle: dette.libelle,
        type_dette: dette.type_dette,
        montant_initial: dette.montant_initial,
        montant_restant: dette.montant_restant,
        taux_interet: dette.taux_interet,
        date_debut: dette.date_debut.split('T')[0],
        date_echeance: dette.date_echeance ? dette.date_echeance.split('T')[0] : undefined,
        frequence_remboursement: dette.frequence_remboursement,
        montant_remboursement: dette.montant_remboursement,
        statut: dette.statut,
        preteur: dette.preteur || '',
        notes: dette.notes || '',
      });
    } else {
      // Reset form
      setFormData({
        projet_id: projetActif?.id || '',
        libelle: '',
        type_dette: 'pret_bancaire',
        montant_initial: 0,
        montant_restant: 0,
        taux_interet: 0,
        date_debut: new Date().toISOString().split('T')[0],
        date_echeance: undefined,
        frequence_remboursement: 'mensuel',
        montant_remboursement: undefined,
        statut: 'en_cours',
        preteur: '',
        notes: '',
      });
    }
  }, [dette, isEditing, visible, projetActif?.id]);

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('finance')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les dettes.");
      return;
    }
    if (!isEditing && !canCreate('finance')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de créer des dettes.");
      return;
    }

    // Validation
    if (!formData.libelle.trim()) {
      Alert.alert('Erreur', 'Le libellé est requis.');
      return;
    }
    if (formData.montant_initial <= 0) {
      Alert.alert('Erreur', 'Le montant initial doit être supérieur à 0.');
      return;
    }
    if (formData.montant_restant < 0 || formData.montant_restant > formData.montant_initial) {
      Alert.alert('Erreur', 'Le montant restant doit être entre 0 et le montant initial.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && dette) {
        await apiClient.patch(`/finance/dettes/${dette.id}`, formData);
      } else {
        await apiClient.post('/finance/dettes', formData);
      }
      onSuccess();
      onClose();
    } catch (error: unknown) {
      logger.error('Erreur lors de la sauvegarde de la dette:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la dette. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const typesDette: TypeDette[] = ['pret_bancaire', 'pret_personnel', 'fournisseur', 'autre'];
  const statuts: StatutDette[] = ['en_cours', 'rembourse', 'en_defaut', 'annule'];
  const frequences: FrequenceRemboursement[] = ['mensuel', 'trimestriel', 'annuel', 'ponctuel'];

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la dette' : 'Nouvelle dette'}
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
          placeholder="Ex: Prêt bancaire pour équipement"
          required
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Type de dette</Text>
          <View style={styles.optionsContainer}>
            {typesDette.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                  formData.type_dette === type && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, type_dette: type })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.type_dette === type && {
                      color: colors.background,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {TYPE_DETTE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormField
          label="Montant initial (FCFA)"
          value={formData.montant_initial.toString()}
          onChangeText={(text) => {
            const montant = parseFloat(text) || 0;
            setFormData({
              ...formData,
              montant_initial: montant,
              // Si on modifie le montant initial et que le montant restant est supérieur, ajuster
              montant_restant:
                formData.montant_restant > montant ? montant : formData.montant_restant,
            });
          }}
          placeholder="0"
          keyboardType="numeric"
          required
        />

        <FormField
          label="Montant restant (FCFA)"
          value={formData.montant_restant.toString()}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              montant_restant: parseFloat(text) || 0,
            })
          }
          placeholder="0"
          keyboardType="numeric"
          required
        />

        <FormField
          label="Taux d'intérêt annuel (%)"
          value={formData.taux_interet?.toString() || '0'}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              taux_interet: parseFloat(text) || 0,
            })
          }
          placeholder="0"
          keyboardType="numeric"
        />

        <DatePickerField
          label="Date de début"
          value={formData.date_debut}
          onChange={(date) => setFormData({ ...formData, date_debut: date })}
          required
        />

        <DatePickerField
          label="Date d'échéance (optionnel)"
          value={formData.date_echeance || ''}
          onChange={(date) =>
            setFormData({
              ...formData,
              date_echeance: date || undefined,
            })
          }
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Fréquence de remboursement</Text>
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
                  formData.frequence_remboursement === freq && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, frequence_remboursement: freq })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.frequence_remboursement === freq && {
                      color: colors.background,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {FREQUENCE_REMBOURSEMENT_LABELS[freq]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {formData.frequence_remboursement !== 'ponctuel' && (
          <FormField
            label="Montant de remboursement par période (FCFA)"
            value={formData.montant_remboursement?.toString() || ''}
            onChangeText={(text) =>
              setFormData({
                ...formData,
                montant_remboursement: text ? parseFloat(text) : undefined,
              })
            }
            placeholder="0"
            keyboardType="numeric"
          />
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Statut</Text>
          <View style={styles.optionsContainer}>
            {statuts.map((statut) => (
              <TouchableOpacity
                key={statut}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                  formData.statut === statut && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, statut })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.statut === statut && {
                      color: colors.background,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {STATUT_DETTE_LABELS[statut]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormField
          label="Prêteur (optionnel)"
          value={formData.preteur || ''}
          onChangeText={(text) => setFormData({ ...formData, preteur: text || undefined })}
          placeholder="Ex: Banque ABC, Jean Dupont..."
        />

        <FormField
          label="Notes"
          value={formData.notes || ''}
          onChangeText={(text) => setFormData({ ...formData, notes: text || undefined })}
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

