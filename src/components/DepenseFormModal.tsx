/**
 * Composant formulaire modal pour dépense ponctuelle avec upload photos
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createDepensePonctuelle, updateDepensePonctuelle } from '../store/slices/financeSlice';
import type { DepensePonctuelle, CreateDepensePonctuelleInput, CategorieDepense } from '../types/finance';
import { getTypeDepense, CATEGORIE_DEPENSE_LABELS } from '../types/finance';
import CustomModal from './CustomModal';
import FormField from './FormField';
import DatePickerField from './DatePickerField';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { useProjetEffectif } from '../hooks/useProjetEffectif';

interface DepenseFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  depense?: DepensePonctuelle | null;
  isEditing?: boolean;
}

export default function DepenseFormModal({
  visible,
  onClose,
  onSuccess,
  depense,
  isEditing = false,
}: DepenseFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const { canCreate, canUpdate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDepensePonctuelleInput & { photos: string[] }>({
    projet_id: projetActif?.id || '',
    montant: 0,
    categorie: 'autre',
    libelle_categorie: '',
    date: new Date().toISOString().split('T')[0],
    commentaire: '',
    photos: [],
  });

  useEffect(() => {
    if (depense && isEditing) {
      setFormData({
        projet_id: depense.projet_id,
        montant: depense.montant,
        categorie: depense.categorie,
        libelle_categorie: depense.libelle_categorie || '',
        date: depense.date.split('T')[0],
        commentaire: depense.commentaire || '',
        photos: depense.photos || [],
      });
    } else {
      // Reset form
      setFormData({
        projet_id: projetActif?.id || '',
        montant: 0,
        categorie: 'autre',
        libelle_categorie: '',
        date: new Date().toISOString().split('T')[0],
        commentaire: '',
        photos: [],
      });
    }
  }, [depense, isEditing, visible, projetActif?.id]);

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "L'application a besoin de l'accès à vos photos pour ajouter des reçus."
      );
      return false;
    }
    return true;
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "L'application a besoin de l'accès à la caméra pour prendre des photos de reçus."
      );
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const currentPhotos = formData.photos || [];
      const remainingSlots = 3 - currentPhotos.length;
      if (remainingSlots > 0) {
        setFormData({
          ...formData,
          photos: [...currentPhotos, result.assets[0].uri],
        });
      } else {
        Alert.alert('Limite atteinte', 'Vous pouvez ajouter maximum 3 photos.');
      }
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const currentPhotos = formData.photos || [];
      const remainingSlots = 3 - currentPhotos.length;
      if (remainingSlots > 0) {
        setFormData({
          ...formData,
          photos: [...currentPhotos, result.assets[0].uri],
        });
      } else {
        Alert.alert('Limite atteinte', 'Vous pouvez ajouter maximum 3 photos.');
      }
    }
  };

  const removePhoto = (index: number) => {
    const currentPhotos = formData.photos || [];
    const newPhotos = currentPhotos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
  };

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('finance')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les dépenses.");
      return;
    }
    if (!isEditing && !canCreate('finance')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de créer des dépenses.");
      return;
    }

    // Validation
    if (formData.montant <= 0) {
      Alert.alert('Erreur', 'Le montant doit être supérieur à 0');
      return;
    }
    if (formData.categorie === 'autre' && !formData.libelle_categorie?.trim()) {
      Alert.alert('Erreur', 'Veuillez préciser le libellé de la catégorie');
      return;
    }

    // Validations AVANT setLoading pour éviter loading bloqué
    if (isEditing && !depense) {
      Alert.alert('Erreur', 'Données de dépense manquantes');
      return;
    }

    if (!isEditing && !projetActif) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && depense) {
        await dispatch(
          updateDepensePonctuelle({
            id: depense.id,
            data: {
              montant: formData.montant,
              categorie: formData.categorie,
              libelle_categorie: formData.libelle_categorie,
              date: formData.date,
              commentaire: formData.commentaire,
              photos: formData.photos || [],
            },
          })
        ).unwrap();
      } else {
        // Mode création : double vérification pour TypeScript
        if (!projetActif) {
          throw new Error('Projet actif requis pour créer une dépense');
        }

        await dispatch(
          createDepensePonctuelle({ ...formData, projet_id: projetActif.id } as any)
        ).unwrap();
      }

      // Succès : fermer le modal puis appeler callback
      onClose();
      setTimeout(() => {
        onSuccess();
      }, 300); // Délai pour animation de fermeture
    } catch (error) {
      // Afficher le message d'erreur correct
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : "Erreur lors de l'enregistrement");
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const categories: CategorieDepense[] = [
    // OPEX
    'vaccins',
    'medicaments',
    'alimentation',
    'veterinaire',
    'entretien',
    'equipements',
    'autre',
    // CAPEX - Limité à 3 catégories
    'amenagement_batiment',
    'equipement_lourd',
    'achat_sujet',
  ];

  const getCategoryLabel = (cat: CategorieDepense): string => {
    return CATEGORIE_DEPENSE_LABELS[cat] || cat;
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la dépense' : 'Nouvelle dépense'}
      confirmText={isEditing ? 'Modifier' : 'Enregistrer'}
      onConfirm={handleSubmit}
      showButtons={true}
      scrollEnabled={true}
    >
      <>
        <FormField
          label="Montant (CFA)"
          value={formData.montant.toString()}
          onChangeText={(text) => setFormData({ ...formData, montant: parseFloat(text) || 0 })}
          placeholder="0"
          keyboardType="numeric"
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

        {formData.categorie && (
          <View
            style={[
              styles.typeIndicator,
              {
                backgroundColor:
                  getTypeDepense(formData.categorie) === 'CAPEX'
                    ? colors.warning + '20'
                    : colors.info + '20',
                borderColor:
                  getTypeDepense(formData.categorie) === 'CAPEX' ? colors.warning : colors.info,
              },
            ]}
          >
            <Text
              style={[
                styles.typeLabel,
                {
                  color:
                    getTypeDepense(formData.categorie) === 'CAPEX' ? colors.warning : colors.info,
                },
              ]}
            >
              {getTypeDepense(formData.categorie) === 'CAPEX'
                ? `💰 CAPEX - Investissement (amorti sur ${
                    projetActif?.duree_amortissement_par_defaut_mois || 36
                  } mois)`
                : '📊 OPEX - Dépense opérationnelle'}
            </Text>
          </View>
        )}

        {formData.categorie === 'autre' && (
          <FormField
            label="Libellé de la catégorie"
            value={formData.libelle_categorie || ''}
            onChangeText={(text) => setFormData({ ...formData, libelle_categorie: text })}
            placeholder="Précisez la catégorie"
            required
          />
        )}

        <DatePickerField
          label="Date"
          value={formData.date}
          onChange={(date) => setFormData({ ...formData, date })}
          maximumDate={new Date()}
        />

        <FormField
          label="Commentaire"
          value={formData.commentaire}
          onChangeText={(text) => setFormData({ ...formData, commentaire: text })}
          placeholder="Commentaire optionnel..."
          multiline
          numberOfLines={4}
        />

        {/* Section Photos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Photos du reçu ({(formData.photos || []).length}/3)
          </Text>
          <View style={styles.photosContainer}>
            {(formData.photos || []).map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={[styles.removePhotoButton, { backgroundColor: colors.error }]}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={[styles.removePhotoText, { color: colors.background }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {(formData.photos || []).length < 3 && (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[
                  styles.photoButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={takePhoto}
              >
                <Text style={[styles.photoButtonText, { color: colors.text }]}>
                  📷 Prendre une photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.photoButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={pickImageFromGallery}
              >
                <Text style={[styles.photoButtonText, { color: colors.text }]}>
                  📂 Choisir depuis la galerie
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  photoItem: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  photoButton: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 14,
  },
  typeIndicator: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
