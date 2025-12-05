/**
 * Modal pour créer ou modifier un animal en production
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { createProductionAnimal, updateProductionAnimal } from '../store/slices/productionSlice';
import { savePhotoToAppStorage } from '../utils/photoUtils';
import {
  ProductionAnimal,
  CreateProductionAnimalInput,
  SexeAnimal,
  StatutAnimal,
  STATUT_ANIMAL_LABELS,
} from '../types';
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

interface ProductionAnimalFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projetId: string;
  animal?: ProductionAnimal | null;
  isEditing?: boolean;
}

export default function ProductionAnimalFormModal({
  visible,
  onClose,
  onSuccess,
  projetId,
  animal,
  isEditing = false,
}: ProductionAnimalFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const animaux = useAppSelector(selectAllAnimaux);
  const { loading: productionLoading } = useAppSelector((state) => state.production);
  const { canCreate, canUpdate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProductionAnimalInput>({
    projet_id: projetId,
    code: '',
    nom: '',
    origine: '',
    sexe: 'indetermine',
    date_naissance: '',
    poids_initial: null,
    date_entree: '',
    statut: 'actif',
    race: '',
    reproducteur: false,
    pere_id: null,
    mere_id: null,
    notes: '',
  });
  const [showDateNaissancePicker, setShowDateNaissancePicker] = useState(false);
  const [showDateEntreePicker, setShowDateEntreePicker] = useState(false);
  const [showPereModal, setShowPereModal] = useState(false);
  const [showMereModal, setShowMereModal] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Filtrer les animaux du projet actif
  const animauxProjet = useMemo(() => {
    if (!Array.isArray(animaux)) return [];
    return animaux.filter((a) => a.projet_id === projetId);
  }, [animaux, projetId]);

  // Ne PAS charger automatiquement les animaux - utiliser ceux déjà en cache
  // Cela évite de bloquer l'interface quand on ouvre le modal
  // Les animaux sont déjà chargés par ProductionCheptelComponent
  // Si vraiment nécessaire, on peut charger en arrière-plan sans bloquer

  // Pour les parents, on permet de sélectionner tous les animaux actifs du projet
  // (pas seulement ceux marqués comme reproducteurs, pour plus de flexibilité)
  const animauxParents = useMemo(() => {
    if (!Array.isArray(animauxProjet)) return [];
    return animauxProjet.filter(
      (a) =>
        a.id !== animal?.id && // Exclure l'animal lui-même
        (a.statut?.toLowerCase() === 'actif' ||
          a.id === animal?.pere_id ||
          a.id === animal?.mere_id)
    );
  }, [animauxProjet, animal?.id, animal?.pere_id, animal?.mere_id]);

  const reproducteursMales = useMemo(() => {
    if (!Array.isArray(animauxParents)) return [];
    return animauxParents.filter((a) => a.sexe === 'male');
  }, [animauxParents]);

  const reproducteursFemelles = useMemo(() => {
    if (!Array.isArray(animauxParents)) return [];
    return animauxParents.filter((a) => a.sexe === 'femelle');
  }, [animauxParents]);

  const getAnimalLabel = (id?: string | null) => {
    if (!id) {
      return 'Inconnu';
    }
    const found = animauxProjet.find((a) => a.id === id);
    if (!found) {
      return 'Inconnu';
    }
    return `${found.code}${found.nom ? ` (${found.nom})` : ''}`;
  };

  const handleSelectPere = (id: string | null) => {
    setFormData((prev) => ({
      ...prev,
      pere_id: id,
    }));
    setShowPereModal(false);
  };

  const handleSelectMere = (id: string | null) => {
    setFormData((prev) => ({
      ...prev,
      mere_id: id,
    }));
    setShowMereModal(false);
  };

  const handlePickImage = async () => {
    // Demander la permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Nous avons besoin de votre permission pour accéder aux photos.'
      );
      return;
    }

    // Ouvrir la galerie
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        console.log('📸 URI temporaire reçue:', result.assets[0].uri);
        // Copier vers le stockage permanent
        const permanentUri = await savePhotoToAppStorage(result.assets[0].uri);
        console.log('✅ URI permanente créée:', permanentUri);
        setPhotoUri(permanentUri);
      } catch (error) {
        console.error('❌ Erreur sauvegarde photo:', error);
        Alert.alert('Erreur', 'Impossible de sauvegarder la photo: ' + error);
        // En cas d'erreur, utiliser quand même l'URI temporaire
        setPhotoUri(result.assets[0].uri);
      }
    }
  };

  const handleTakePhoto = async () => {
    // Demander la permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Nous avons besoin de votre permission pour accéder à la caméra.'
      );
      return;
    }

    // Ouvrir la caméra
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        console.log('📸 URI temporaire reçue:', result.assets[0].uri);
        // Copier vers le stockage permanent
        const permanentUri = await savePhotoToAppStorage(result.assets[0].uri);
        console.log('✅ URI permanente créée:', permanentUri);
        setPhotoUri(permanentUri);
      } catch (error) {
        console.error('❌ Erreur sauvegarde photo:', error);
        Alert.alert('Erreur', 'Impossible de sauvegarder la photo: ' + error);
        // En cas d'erreur, utiliser quand même l'URI temporaire
        setPhotoUri(result.assets[0].uri);
      }
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert('Ajouter une photo', 'Choisissez une option', [
      {
        text: 'Prendre une photo',
        onPress: handleTakePhoto,
      },
      {
        text: 'Choisir dans la galerie',
        onPress: handlePickImage,
      },
      {
        text: 'Annuler',
        style: 'cancel',
      },
    ]);
  };

  useEffect(() => {
    if (animal && isEditing) {
      console.log('📋 Chargement animal dans modal:', animal.id);
      console.log('📸 Photo URI de l\'animal:', animal.photo_uri);
      setFormData({
        projet_id: animal.projet_id,
        code: animal.code,
        nom: animal.nom || '',
        origine: animal.origine || '',
        sexe: animal.sexe,
        date_naissance: animal.date_naissance || '',
        poids_initial: animal.poids_initial || null,
        date_entree: animal.date_entree || '',
        statut: animal.statut || 'actif',
        race: animal.race || '',
        reproducteur: animal.reproducteur,
        pere_id: animal.pere_id ?? null,
        mere_id: animal.mere_id ?? null,
        notes: animal.notes || '',
      });
      setPhotoUri(animal.photo_uri || null);
      console.log('✅ Photo URI définie dans le state:', animal.photo_uri || 'null');
    } else {
      setFormData({
        projet_id: projetId,
        code: '',
        nom: '',
        origine: '',
        sexe: 'indetermine',
        date_naissance: '',
        poids_initial: null,
        date_entree: '',
        statut: 'actif',
        race: '',
        reproducteur: false,
        pere_id: null,
        mere_id: null,
        notes: '',
      });
      setPhotoUri(null);
    }
  }, [animal, isEditing, visible, projetId]);

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('reproduction')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les animaux.");
      return;
    }
    if (!isEditing && !canCreate('reproduction')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de créer des animaux.");
      return;
    }

    if (!formData.code.trim()) {
      Alert.alert('Erreur', "Le code de l'animal est requis.");
      return;
    }

    setLoading(true);
    try {
      const race = formData.race?.trim();
      const normalizedData: CreateProductionAnimalInput = {
        ...formData,
        race: race ? race : undefined,
        pere_id: formData.pere_id ?? null,
        mere_id: formData.mere_id ?? null,
        photo_uri: photoUri || undefined, // Photo déjà permanente
      };

      console.log('=== SAUVEGARDE ANIMAL ===');
      console.log('📸 Photo URI à sauvegarder:', photoUri);
      console.log('🔍 Type de photo URI:', typeof photoUri);
      console.log('🔍 photoUri === null?', photoUri === null);
      console.log('🔍 photoUri === undefined?', photoUri === undefined);
      console.log('📦 normalizedData.photo_uri:', normalizedData.photo_uri);
      console.log('📦 Données complètes:', JSON.stringify(normalizedData, null, 2));

      if (isEditing && animal) {
        const { projet_id: _omitProjet, ...updates } = normalizedData;
        await dispatch(
          updateProductionAnimal({
            id: animal.id,
            updates,
          })
        ).unwrap();
      } else {
        await dispatch(createProductionAnimal(normalizedData)).unwrap();
      }
      
      // Fermer le modal immédiatement
      onClose();
      
      // Puis recharger les données en arrière-plan
      setTimeout(() => {
        onSuccess();
      }, 100);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || error || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const sexes: SexeAnimal[] = ['male', 'femelle', 'indetermine'];

  return (
    <>
      <CustomModal
        visible={visible}
        onClose={onClose}
        title={isEditing ? "Modifier l'animal" : 'Nouvel animal'}
        confirmText={isEditing ? 'Modifier' : 'Ajouter'}
        onConfirm={handleSubmit}
        showButtons={true}
        loading={loading}
        scrollEnabled={true}
      >
        <>
          <FormField
            label="Code de l'animal *"
            value={formData.code}
            onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
            placeholder="Ex: PORC001"
            required
          />
          <FormField
            label="Nom (optionnel)"
            value={formData.nom || ''}
            onChangeText={(text) => setFormData({ ...formData, nom: text })}
            placeholder="Ex: Gros Cochon"
          />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Photo (optionnelle)</Text>
            {photoUri ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={[styles.photoButton, { backgroundColor: colors.primary }]}
                    onPress={showImagePickerOptions}
                  >
                    <Ionicons name="camera" size={20} color={colors.textOnPrimary} />
                    <Text style={[styles.photoButtonText, { color: colors.textOnPrimary }]}>
                      Changer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoButton, { backgroundColor: colors.error }]}
                    onPress={() => setPhotoUri(null)}
                  >
                    <Ionicons name="trash" size={20} color={colors.textOnPrimary} />
                    <Text style={[styles.photoButtonText, { color: colors.textOnPrimary }]}>
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.photoPlaceholder,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                onPress={showImagePickerOptions}
              >
                <Ionicons name="camera-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.photoPlaceholderText, { color: colors.textSecondary }]}>
                  Ajouter une photo
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <FormField
            label="Origine"
            value={formData.origine || ''}
            onChangeText={(text) => setFormData({ ...formData, origine: text })}
            placeholder="Ex: Élevage X, Achat Y"
          />
          <FormField
            label="Race"
            value={formData.race || ''}
            onChangeText={(text) => setFormData({ ...formData, race: text })}
            placeholder="Ex: Large White, Landrace..."
          />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sexe *</Text>
            <View style={styles.optionsContainer}>
              {sexes.map((sexe) => (
                <TouchableOpacity
                  key={sexe}
                  style={[
                    styles.option,
                    {
                      borderColor: formData.sexe === sexe ? colors.primary : colors.border,
                      backgroundColor: formData.sexe === sexe ? colors.primary : colors.background,
                    },
                  ]}
                  onPress={() => {
                    // Si le sexe est "femelle" ou "male", définir automatiquement reproducteur à true
                    const nouveauReproducteur = sexe === 'femelle' || sexe === 'male' ? true : formData.reproducteur;
                    setFormData({ ...formData, sexe, reproducteur: nouveauReproducteur });
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: formData.sexe === sexe ? colors.textOnPrimary : colors.text,
                        fontWeight: formData.sexe === sexe ? '600' : 'normal',
                      },
                    ]}
                  >
                    {sexe === 'male' ? 'Mâle' : sexe === 'femelle' ? 'Femelle' : 'Indéterminé'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reproducteur ?</Text>
            <View style={styles.optionsContainer}>
              {['oui', 'non'].map((option) => {
                const value = option === 'oui';
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.option,
                      {
                        borderColor: formData.reproducteur === value ? colors.primary : colors.border,
                        backgroundColor:
                          formData.reproducteur === value ? colors.primary : colors.background,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, reproducteur: value })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: formData.reproducteur === value ? colors.textOnPrimary : colors.text,
                          fontWeight: formData.reproducteur === value ? '600' : 'normal',
                        },
                      ]}
                    >
                      {option === 'oui' ? 'Oui' : 'Non'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Date de naissance</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              onPress={() => setShowDateNaissancePicker(true)}
            >
              <Text style={[styles.dateButtonText, { color: colors.text }]}>
                {formData.date_naissance
                  ? parseLocalDate(formData.date_naissance).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : 'Sélectionner une date'}
              </Text>
            </TouchableOpacity>
            {showDateNaissancePicker && (
              <DateTimePicker
                value={
                  formData.date_naissance ? parseLocalDate(formData.date_naissance) : new Date()
                }
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDateNaissancePicker(false);
                  if (selectedDate && event.type !== 'dismissed') {
                    setFormData({
                      ...formData,
                      date_naissance: formatDateToLocal(selectedDate),
                    });
                  }
                }}
              />
            )}
          </View>

          <FormField
            label="Poids à l'arrivée (kg)"
            value={formData.poids_initial?.toString() || ''}
            onChangeText={(text) =>
              setFormData({ ...formData, poids_initial: text ? parseFloat(text) : null })
            }
            keyboardType="numeric"
            placeholder="Ex: 25.5"
          />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Date d'entrée</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              onPress={() => setShowDateEntreePicker(true)}
            >
              <Text style={[styles.dateButtonText, { color: colors.text }]}>
                {formData.date_entree
                  ? parseLocalDate(formData.date_entree).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : 'Sélectionner une date'}
              </Text>
            </TouchableOpacity>
            {showDateEntreePicker && (
              <DateTimePicker
                value={formData.date_entree ? parseLocalDate(formData.date_entree) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDateEntreePicker(false);
                  if (selectedDate && event.type !== 'dismissed') {
                    setFormData({
                      ...formData,
                      date_entree: formatDateToLocal(selectedDate),
                    });
                  }
                }}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Parents (facultatif)</Text>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Sélectionnez les reproducteurs enregistrés dans le cheptel ou choisissez « Inconnu ».
            </Text>
            <View style={styles.parentButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                onPress={() => setShowPereModal(true)}
              >
                <Text style={[styles.selectButtonLabel, { color: colors.textSecondary }]}>
                  Père
                </Text>
                <Text style={[styles.selectButtonValue, { color: colors.text }]}>
                  {getAnimalLabel(formData.pere_id)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                onPress={() => setShowMereModal(true)}
              >
                <Text style={[styles.selectButtonLabel, { color: colors.textSecondary }]}>
                  Mère
                </Text>
                <Text style={[styles.selectButtonValue, { color: colors.text }]}>
                  {getAnimalLabel(formData.mere_id)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Statut *</Text>
            <View style={styles.optionsContainer}>
              {(['actif', 'mort', 'vendu', 'offert', 'autre'] as StatutAnimal[]).map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.option,
                    {
                      borderColor: formData.statut === statut ? colors.primary : colors.border,
                      backgroundColor:
                        formData.statut === statut ? colors.primary : colors.background,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, statut })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: formData.statut === statut ? colors.textOnPrimary : colors.text,
                        fontWeight: formData.statut === statut ? '600' : 'normal',
                      },
                    ]}
                  >
                    {STATUT_ANIMAL_LABELS[statut]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FormField
            label="Notes (vaccins, dates, etc.)"
            value={formData.notes || ''}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Notes supplémentaires sur cet animal (vaccins, dates, etc.)..."
            multiline
            numberOfLines={3}
          />
        </>
      </CustomModal>

      <CustomModal
        visible={showPereModal}
        onClose={() => setShowPereModal(false)}
        title="Sélectionner le père"
        showButtons={false}
        scrollEnabled={true}
      >
        <>
          <TouchableOpacity
            style={[
              styles.modalOption,
              { borderColor: colors.border, backgroundColor: colors.surface },
              formData.pere_id === null ? {
                borderColor: colors.primary,
                backgroundColor: colors.primary + '12',
              } : null,
            ]}
            onPress={() => handleSelectPere(null)}
          >
            <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Inconnu</Text>
            <Text style={[styles.modalOptionSubtitle, { color: colors.textSecondary }]}>
              Aucune information disponible
            </Text>
          </TouchableOpacity>

          {reproducteursMales.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {animauxProjet.length === 0
                ? "Aucun animal enregistré dans le cheptel. Ajoutez d'abord des animaux pour les sélectionner comme parents."
                : 'Aucun mâle actif disponible. Ajoutez des animaux mâles dans le cheptel pour les sélectionner comme père.'}
            </Text>
          ) : (
            reproducteursMales.map((rep) => {
              const selected = formData.pere_id === rep.id;
              return (
                <TouchableOpacity
                  key={rep.id}
                  style={[
                    styles.modalOption,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '12' : colors.surface,
                    },
                  ]}
                  onPress={() => handleSelectPere(rep.id)}
                >
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>
                    {rep.code}
                    {rep.nom ? ` (${rep.nom})` : ''}
                  </Text>
                  <Text style={[styles.modalOptionSubtitle, { color: colors.textSecondary }]}>
                    {rep.race ? `Race : ${rep.race} • ` : ''}
                    {`Statut : ${STATUT_ANIMAL_LABELS[rep.statut]}`}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </>
      </CustomModal>

      <CustomModal
        visible={showMereModal}
        onClose={() => setShowMereModal(false)}
        title="Sélectionner la mère"
        showButtons={false}
        scrollEnabled={true}
      >
        <>
          <TouchableOpacity
            style={[
              styles.modalOption,
              { borderColor: colors.border, backgroundColor: colors.surface },
              formData.mere_id === null ? {
                borderColor: colors.primary,
                backgroundColor: colors.primary + '12',
              } : null,
            ]}
            onPress={() => handleSelectMere(null)}
          >
            <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Inconnu</Text>
            <Text style={[styles.modalOptionSubtitle, { color: colors.textSecondary }]}>
              Aucune information disponible
            </Text>
          </TouchableOpacity>

          {reproducteursFemelles.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {animauxProjet.length === 0
                ? "Aucun animal enregistré dans le cheptel. Ajoutez d'abord des animaux pour les sélectionner comme parents."
                : 'Aucune femelle active disponible. Ajoutez des animaux femelles dans le cheptel pour les sélectionner comme mère.'}
            </Text>
          ) : (
            reproducteursFemelles.map((rep) => {
              const selected = formData.mere_id === rep.id;
              return (
                <TouchableOpacity
                  key={rep.id}
                  style={[
                    styles.modalOption,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '12' : colors.surface,
                    },
                  ]}
                  onPress={() => handleSelectMere(rep.id)}
                >
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>
                    {rep.code}
                    {rep.nom ? ` (${rep.nom})` : ''}
                  </Text>
                  <Text style={[styles.modalOptionSubtitle, { color: colors.textSecondary }]}>
                    {rep.race ? `Race : ${rep.race} • ` : ''}
                    {`Statut : ${STATUT_ANIMAL_LABELS[rep.statut]}`}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </>
      </CustomModal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs / 2,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginHorizontal: SPACING.xs / 2,
    marginBottom: SPACING.xs,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
  },
  datePickerContainer: {
    marginTop: SPACING.sm,
    alignItems: 'center',
    minHeight: 200,
  },
  parentButtonsContainer: {
    gap: SPACING.sm,
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  selectButtonLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  selectButtonValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  modalOption: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  modalOptionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  modalOptionSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  photoPlaceholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  photoPlaceholderText: {
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.sm,
  },
  photoContainer: {
    gap: SPACING.sm,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  photoButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});
