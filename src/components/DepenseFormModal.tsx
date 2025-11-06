/**
 * Composant formulaire modal pour dépense ponctuelle avec upload photos
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../store/hooks';
import { createDepensePonctuelle, updateDepensePonctuelle } from '../store/slices/financeSlice';
import { DepensePonctuelle, CreateDepensePonctuelleInput, CategorieDepense } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

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
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDepensePonctuelleInput & { photos: string[] }>({
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
        montant: 0,
        categorie: 'autre',
        libelle_categorie: '',
        date: new Date().toISOString().split('T')[0],
        commentaire: '',
        photos: [],
      });
    }
  }, [depense, isEditing, visible]);

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'L\'application a besoin de l\'accès à vos photos pour ajouter des reçus.'
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
        'L\'application a besoin de l\'accès à la caméra pour prendre des photos de reçus.'
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
      if (isEditing && depense) {
        await dispatch(updateDepensePonctuelle({
          id: depense.id,
          updates: {
            montant: formData.montant,
            categorie: formData.categorie,
            libelle_categorie: formData.libelle_categorie,
            date: formData.date,
            commentaire: formData.commentaire,
            photos: formData.photos || [],
          },
        })).unwrap();
      } else {
        await dispatch(createDepensePonctuelle(formData)).unwrap();
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const categories: CategorieDepense[] = [
    'vaccins',
    'alimentation',
    'veterinaire',
    'entretien',
    'equipements',
    'autre',
  ];

  const getCategoryLabel = (cat: CategorieDepense): string => {
    const labels: Record<CategorieDepense, string> = {
      vaccins: 'Vaccins',
      alimentation: 'Alimentation',
      veterinaire: 'Vétérinaire',
      entretien: 'Entretien',
      equipements: 'Équipements',
      autre: 'Autre',
    };
    return labels[cat];
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la dépense' : 'Nouvelle dépense'}
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
          label="Commentaire"
          value={formData.commentaire}
          onChangeText={(text) => setFormData({ ...formData, commentaire: text })}
          placeholder="Commentaire optionnel..."
          multiline
          numberOfLines={4}
        />

        {/* Section Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Photos du reçu ({(formData.photos || []).length}/3)
          </Text>
          <View style={styles.photosContainer}>
            {(formData.photos || []).map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {(formData.photos || []).length < 3 && (
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Text style={styles.photoButtonText}>📷 Prendre une photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickImageFromGallery}>
                <Text style={styles.photoButtonText}>📂 Choisir depuis la galerie</Text>
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
    borderRadius: BORDER_RADIUS.md,
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
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  photoButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
});

