/**
 * Formulaire modal pour la création / modification d'un aliment stocké
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAppDispatch } from '../store/hooks';
import {
  createStockAliment,
  updateStockAliment,
} from '../store/slices/stocksSlice';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import CustomModal from './CustomModal';
import FormField from './FormField';
import Button from './Button';
import { StockAliment, UniteStock, CreateStockAlimentInput } from '../types';

interface StockAlimentFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projetId: string;
  aliment?: StockAliment | null;
  isEditing?: boolean;
}

const UNITES: UniteStock[] = ['kg', 'g', 'l', 'ml', 'sac', 'unite'];

export default function StockAlimentFormModal({
  visible,
  onClose,
  onSuccess,
  projetId,
  aliment,
  isEditing = false,
}: StockAlimentFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateStockAlimentInput>({
    projet_id: projetId,
    nom: '',
    categorie: '',
    quantite_initiale: 0,
    unite: 'kg',
    seuil_alerte: undefined,
    notes: '',
  });

  useEffect(() => {
    if (visible) {
      if (aliment && isEditing) {
        setFormData({
          projet_id: projetId,
          nom: aliment.nom,
          categorie: aliment.categorie || '',
          quantite_initiale: aliment.quantite_actuelle,
          unite: aliment.unite,
          seuil_alerte: aliment.seuil_alerte,
          notes: aliment.notes || '',
        });
      } else {
        setFormData({
          projet_id: projetId,
          nom: '',
          categorie: '',
          quantite_initiale: 0,
          unite: 'kg',
          seuil_alerte: undefined,
          notes: '',
        });
      }
    }
  }, [visible, aliment, isEditing, projetId]);

  const handleSubmit = async () => {
    if (!projetId) {
      Alert.alert('Erreur', 'Aucun projet actif. Veuillez sélectionner un projet.');
      return;
    }

    if (!formData.nom.trim()) {
      Alert.alert('Champ requis', "Le nom de l'aliment est obligatoire");
      return;
    }

    if (!formData.unite) {
      Alert.alert('Champ requis', "Veuillez sélectionner l'unité");
      return;
    }

    if (!isEditing && (formData.quantite_initiale ?? 0) < 0) {
      Alert.alert('Valeur invalide', 'La quantité initiale doit être positive');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && aliment) {
        await dispatch(
          updateStockAliment({
            id: aliment.id,
            updates: {
              nom: formData.nom,
              categorie: formData.categorie || undefined,
              unite: formData.unite,
              seuil_alerte: formData.seuil_alerte ?? null,
              notes: formData.notes || undefined,
            },
          })
        ).unwrap();
      } else {
        await dispatch(
          createStockAliment({
            projet_id: projetId,
            nom: formData.nom,
            categorie: formData.categorie || undefined,
            quantite_initiale: formData.quantite_initiale ?? 0,
            unite: formData.unite,
            seuil_alerte: formData.seuil_alerte,
            notes: formData.notes || undefined,
          })
        ).unwrap();
      }
      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du stock:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier un aliment' : 'Nouvel aliment'}
      showButtons={false}
    >
      <ScrollView style={styles.scroll}>
        <FormField
          label="Nom de l'aliment"
          value={formData.nom}
          onChangeText={(text) => setFormData({ ...formData, nom: text })}
          placeholder="Ex: Maïs concassé"
          required
        />

        <FormField
          label="Catégorie"
          value={formData.categorie || ''}
          onChangeText={(text) => setFormData({ ...formData, categorie: text })}
          placeholder="Ex: Céréales, Concentrés..."
        />

        {!isEditing && (
          <FormField
            label="Quantité initiale"
            value={(formData.quantite_initiale ?? 0).toString()}
            onChangeText={(text) =>
              setFormData({ ...formData, quantite_initiale: parseFloat(text) || 0 })
            }
            keyboardType="numeric"
            placeholder="0"
          />
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Unité</Text>
          <View style={styles.optionsContainer}>
            {UNITES.map((unite) => (
              <TouchableOpacity
                key={unite}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
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
                      color: colors.textOnPrimary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {unite.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormField
          label="Seuil d'alerte"
          value={formData.seuil_alerte?.toString() ?? ''}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              seuil_alerte: text ? parseFloat(text) : undefined,
            })
          }
          keyboardType="numeric"
          placeholder="Ex: 100"
        />

        <FormField
          label="Notes"
          value={formData.notes || ''}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Informations complémentaires"
          multiline
          numberOfLines={3}
        />

        {!isEditing && (
          <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>💡 Astuce</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              Vous pourrez ajuster le stock à tout moment en enregistrant des mouvements (entrées, sorties ou ajustements).
            </Text>
          </View>
        )}

        <Button
          title={isEditing ? 'Enregistrer les modifications' : 'Créer l’aliment'}
          onPress={handleSubmit}
          loading={loading}
          variant="primary"
        />
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 500,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginHorizontal: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
  },
  infoBox: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});


