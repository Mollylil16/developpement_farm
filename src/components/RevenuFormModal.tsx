/**
 * Composant formulaire modal pour revenu avec upload photos
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createRevenu, updateRevenu } from '../store/slices/financeSlice';
import { Revenu, CreateRevenuInput, CategorieRevenu } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface RevenuFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  revenu?: Revenu | null;
  isEditing?: boolean;
}

export default function RevenuFormModal({
  visible,
  onClose,
  onSuccess,
  revenu,
  isEditing = false,
}: RevenuFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<CreateRevenuInput, 'projet_id'> & { photos: string[] }>({
    montant: 0,
    categorie: 'vente_porc',
    libelle_categorie: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    commentaire: '',
    photos: [],
  });

  useEffect(() => {
    if (revenu && isEditing) {
      setFormData({
        montant: revenu.montant,
        categorie: revenu.categorie,
        libelle_categorie: revenu.libelle_categorie || '',
        date: revenu.date.split('T')[0],
        description: revenu.description || '',
        commentaire: revenu.commentaire || '',
        photos: revenu.photos || [],
      });
    } else {
      // Reset form
      setFormData({
        montant: 0,
        categorie: 'vente_porc',
        libelle_categorie: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        commentaire: '',
        photos: [],
      });
    }
  }, [revenu, isEditing, visible]);

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'L\'application a besoin de l\'accès à vos photos pour ajouter des factures.'
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
        'L\'application a besoin de l\'accès à la caméra pour prendre des photos de factures.'
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
    // Validation
    if (formData.montant <= 0) {
      Alert.alert('Erreur', 'Le montant doit être supérieur à 0');
      return;
    }
    if (formData.categorie === 'autre' && !formData.libelle_categorie?.trim()) {
      Alert.alert('Erreur', 'Veuillez préciser le libellé de la catégorie');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && revenu) {
        await dispatch(updateRevenu({
          id: revenu.id,
          updates: {
            montant: formData.montant,
            categorie: formData.categorie,
            libelle_categorie: formData.libelle_categorie,
            date: formData.date,
            description: formData.description,
            commentaire: formData.commentaire,
            photos: formData.photos || [],
          },
        })).unwrap();
      } else {
        if (!projetActif) {
          Alert.alert('Erreur', 'Aucun projet actif');
          return;
        }
        await dispatch(createRevenu({ ...formData, projet_id: projetActif.id })).unwrap();
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const categories: CategorieRevenu[] = [
    'vente_porc',
    'vente_autre',
    'subvention',
    'autre',
  ];

  const getCategoryLabel = (cat: CategorieRevenu): string => {
    const labels: Record<CategorieRevenu, string> = {
      vente_porc: 'Vente de porc',
      vente_autre: 'Vente autre',
      subvention: 'Subvention',
      autre: 'Autre',
    };
    return labels[cat];
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier le revenu' : 'Nouveau revenu'}
      confirmText={isEditing ? 'Modifier' : 'Enregistrer'}
      onConfirm={handleSubmit}
      showButtons={true}
    >
      <ScrollView style={styles.scrollView}>
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

        {formData.categorie === 'autre' && (
          <FormField
            label="Libellé de la catégorie"
            value={formData.libelle_categorie || ''}
            onChangeText={(text) => setFormData({ ...formData, libelle_categorie: text })}
            placeholder="Précisez la catégorie"
            required
          />
        )}

        <FormField
          label="Date"
          value={formData.date}
          onChangeText={(text) => setFormData({ ...formData, date: text })}
          placeholder="YYYY-MM-DD"
        />

        <FormField
          label="Description (ex: nombre de porcs vendus)"
          value={formData.description || ''}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Description optionnelle..."
          multiline
          numberOfLines={2}
        />

        <FormField
          label="Commentaire"
          value={formData.commentaire || ''}
          onChangeText={(text) => setFormData({ ...formData, commentaire: text })}
          placeholder="Commentaire optionnel..."
          multiline
          numberOfLines={4}
        />

        {/* Section Photos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Photos de la facture ({(formData.photos || []).length}/3)
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
              <TouchableOpacity style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={takePhoto}>
                <Text style={[styles.photoButtonText, { color: colors.text }]}>📷 Prendre une photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickImageFromGallery}>
                <Text style={[styles.photoButtonText, { color: colors.text }]}>📂 Choisir depuis la galerie</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
});

