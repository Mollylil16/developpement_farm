/**
 * Modal pour créer ou modifier une pesée
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, TextInput } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createPesee, updatePesee } from '../store/slices/productionSlice';
import type { ProductionAnimal, ProductionPesee, CreatePeseeInput } from '../types/production';
import { useModeElevage } from '../hooks/useModeElevage';
import apiClient from '../services/api/apiClient';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';
import aiWeightService from '../services/aiWeightService';
import { logger } from '../utils/logger';

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

interface ProductionPeseeFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projetId: string;
  animal: ProductionAnimal | null; // Null en mode batch
  pesee?: ProductionPesee | null;
  isEditing?: boolean;
  batchId?: string; // ID de la bande (mode batch)
  batchTotalCount?: number; // Nombre total de porcs dans la bande
}

export default function ProductionPeseeFormModal({
  visible,
  onClose,
  onSuccess,
  projetId,
  animal,
  pesee,
  isEditing = false,
  batchId,
  batchTotalCount,
}: ProductionPeseeFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate } = useActionPermissions();
  const { projetActif } = useAppSelector((state) => state.projet);
  const currentUser = useAppSelector((state) => state.auth.user);
  const mode = useModeElevage();
  const isBatchMode = mode === 'bande' || !!batchId;
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiEstimated, setIsAiEstimated] = useState(false); // Indique si le poids vient de l'IA
  const [aiConfidence, setAiConfidence] = useState<number | null>(null); // Confiance de l'estimation IA
  const [formData, setFormData] = useState<CreatePeseeInput>({
    projet_id: projetId,
    animal_id: animal?.id || '',
    date: formatDateToLocal(new Date()),
    poids_kg: 0,
    commentaire: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  // État pour le mode batch
  const [batchCount, setBatchCount] = useState('1');
  const [batchAverageWeight, setBatchAverageWeight] = useState('');
  const [batchMinWeight, setBatchMinWeight] = useState('');
  const [batchMaxWeight, setBatchMaxWeight] = useState('');

  useEffect(() => {
    if (visible) {
      if (isEditing && pesee) {
        // Mode édition : charger les données de la pesée
        setFormData({
          projet_id: pesee.projet_id,
          animal_id: pesee.animal_id,
          date: pesee.date,
          poids_kg: pesee.poids_kg,
          commentaire: pesee.commentaire || '',
        });
      } else {
        // Mode création : données vides
        setFormData({
          projet_id: projetId,
          animal_id: animal?.id || '',
          date: formatDateToLocal(new Date()),
          poids_kg: 0,
          commentaire: '',
        });
      }
      // Réinitialiser les champs batch
      if (isBatchMode) {
        setBatchCount('1');
        setBatchAverageWeight('');
        setBatchMinWeight('');
        setBatchMaxWeight('');
      }
      setShowDatePicker(false);
      setIsAiEstimated(false); // Réinitialiser l'indicateur IA
      setAiConfidence(null);
    }
  }, [visible, projetId, animal, pesee, isEditing, isBatchMode]);

  // Demander les permissions caméra
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  const handleCapturePhoto = async () => {
    if (!hasCameraPermission) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra dans les paramètres.');
      return;
    }

    setAiLoading(true);
    try {
      // Permettre à l'utilisateur de choisir entre photo et vidéo
      Alert.alert(
        'Pesée IA',
        'Choisissez le mode de capture',
        [
          {
            text: 'Photo',
            onPress: async () => {
              try {
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: false,
                  quality: 0.8,
                  base64: true,
                });

                if (!result.canceled && result.assets[0]) {
                  await processImageForWeight(result.assets[0].base64 || '');
                }
              } catch (error: any) {
                Alert.alert('Erreur', error.message || 'Erreur lors de la capture photo');
              }
            },
          },
          {
            text: 'Vidéo',
            onPress: async () => {
              try {
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                  allowsEditing: false,
                  quality: 0.8,
                });

                if (!result.canceled && result.assets[0]) {
                  await processVideoForWeight(result.assets[0].uri);
                }
              } catch (error: any) {
                Alert.alert('Erreur', error.message || 'Erreur lors de la capture vidéo');
              }
            },
          },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de la capture');
    } finally {
      setAiLoading(false);
    }
  };

  const processImageForWeight = async (base64Image: string) => {
    if (!base64Image) {
      Alert.alert('Erreur', 'Impossible de traiter l\'image');
      return;
    }

    setAiLoading(true);
    try {
      const imageData = base64Image.startsWith('data:') 
        ? base64Image 
        : `data:image/jpeg;base64,${base64Image}`;

      const result = await aiWeightService.predictWeight({
        image: imageData,
        pig_id: animal?.id || '',
        projet_id: projetId,
        user_id: currentUser?.id || '',
        auto_register: true,
      });

      if (result.success && result.weight_estimation) {
        const weight = result.weight_estimation.weight_kg;
        const confidence = result.weight_estimation.confidence;
        setFormData({ ...formData, poids_kg: Math.round(weight * 10) / 10 });
        setIsAiEstimated(true);
        setAiConfidence(confidence);
        Alert.alert(
          'Poids estimé par IA',
          `Poids détecté : ${weight.toFixed(1)} kg\nConfiance : ${(confidence * 100).toFixed(0)}%\n\nVous pouvez modifier cette valeur manuellement si nécessaire.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Avertissement', 'Aucun porc détecté dans l\'image. Veuillez saisir le poids manuellement ou réessayer.');
      }
    } catch (error: any) {
      logger.error('Erreur IA:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || error.message || 'Erreur lors de l\'estimation du poids'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const processVideoForWeight = async (videoUri: string) => {
    if (!videoUri) {
      Alert.alert('Erreur', 'Impossible de traiter la vidéo');
      return;
    }

    setAiLoading(true);
    try {
      const result = await aiWeightService.predictWeightFromVideo({
        videoUri,
        projet_id: projetId,
        user_id: currentUser?.id || '',
        frame_skip: 5,
      });

      if (result.success && result.pigs && result.pigs.length > 0) {
        // Trouver le porc correspondant à l'animal actuel
        const pigResult = animal
          ? result.pigs.find((p) => p.pig_id === animal.id) || result.pigs[0]
          : result.pigs[0];
        
        if (pigResult) {
          const weight = pigResult.weight_kg;
          setFormData({ ...formData, poids_kg: Math.round(weight * 10) / 10 });
          setIsAiEstimated(true);
          setAiConfidence(0.85); // Confiance par défaut pour vidéo (moyenne de plusieurs détections)
          Alert.alert(
            'Poids estimé par IA',
            `Poids détecté : ${weight.toFixed(1)} kg\n(${pigResult.detections_count} détections)\nCode: ${pigResult.code}\n\nVous pouvez modifier cette valeur manuellement si nécessaire.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Information',
            `${result.total_tracks} porc(s) détecté(s) dans la vidéo, mais ${animal?.code || 'l\'animal'} n'a pas été identifié.\n\nVeuillez saisir le poids manuellement.`
          );
        }
      } else {
        Alert.alert('Avertissement', 'Aucun porc détecté dans la vidéo.');
      }
    } catch (error: any) {
      logger.error('Erreur IA vidéo:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || error.message || 'Erreur lors de l\'estimation du poids'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('reproduction')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les pesées.");
      return;
    }
    if (!isEditing && !canCreate('reproduction')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission d'ajouter des pesées.");
      return;
    }

    // Validation selon le mode
    if (isBatchMode && batchId) {
      // Mode batch : validation spécifique
      const countNum = parseInt(batchCount);
      if (isNaN(countNum) || countNum < 1 || (batchTotalCount && countNum > batchTotalCount)) {
        Alert.alert(
          'Erreur',
          `Le nombre doit être entre 1 et ${batchTotalCount || 'la taille de la bande'}`,
        );
        return;
      }

      const avgWeight = parseFloat(batchAverageWeight);
      if (isNaN(avgWeight) || avgWeight <= 0) {
        Alert.alert('Erreur', 'Le poids moyen doit être supérieur à 0.');
        return;
      }

      setLoading(true);
      try {
        await apiClient.post('/batch-weighings', {
          batch_id: batchId,
          count: countNum,
          average_weight_kg: avgWeight,
          weighing_date: new Date(formData.date).toISOString(),
          min_weight_kg: batchMinWeight ? parseFloat(batchMinWeight) : undefined,
          max_weight_kg: batchMaxWeight ? parseFloat(batchMaxWeight) : undefined,
          notes: formData.commentaire || undefined,
        });

        Alert.alert('Succès', `${countNum} pesée(s) enregistrée(s) avec succès`);
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Erreur création pesée batch:', error);
        Alert.alert(
          'Erreur',
          error.response?.data?.message || "Impossible d'enregistrer la pesée",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mode individuel : validation classique
    if (!animal?.id) {
      Alert.alert('Erreur', 'Aucun animal sélectionné.');
      return;
    }

    if (formData.poids_kg <= 0) {
      Alert.alert('Erreur', 'Le poids doit être supérieur à 0.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && pesee) {
        await dispatch(updatePesee({ id: pesee.id, updates: formData })).unwrap();
      } else {
        await dispatch(createPesee(formData)).unwrap();
      }
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error) || `Erreur lors de ${isEditing ? 'la modification' : "l'enregistrement"} de la pesée.`;
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={
        isBatchMode
          ? `${isEditing ? 'Modifier' : 'Nouvelle'} pesée - Bande`
          : `${isEditing ? 'Modifier' : 'Nouvelle'} pesée - ${animal?.code || ''}${animal?.nom ? ` (${animal.nom})` : ''}`
      }
      confirmText={isEditing ? 'Modifier' : 'Enregistrer'}
      onConfirm={handleSubmit}
      showButtons={true}
      loading={loading}
      scrollEnabled={true}
    >
      <>
        {/* Info box selon le mode */}
        {!isBatchMode && animal && (
          <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Animal:</Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>
              {animal.code}
              {animal.nom && ` - ${animal.nom}`}
            </Text>
          </View>
        )}

        {isBatchMode && batchId && (
          <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Mode Bande:
            </Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>
              Le système sélectionnera automatiquement les porcs à peser
            </Text>
          </View>
        )}

        {/* Champs spécifiques au mode batch */}
        {isBatchMode && batchId && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Nombre de porcs à peser *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                ]}
                value={batchCount}
                onChangeText={setBatchCount}
                keyboardType="number-pad"
                placeholder={`Max: ${batchTotalCount || ''}`}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Poids moyen (kg) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                ]}
                value={batchAverageWeight}
                onChangeText={setBatchAverageWeight}
                keyboardType="decimal-pad"
                placeholder="Ex: 45.5"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Poids minimum (kg) - Optionnel
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                ]}
                value={batchMinWeight}
                onChangeText={setBatchMinWeight}
                keyboardType="decimal-pad"
                placeholder="Ex: 40"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Poids maximum (kg) - Optionnel
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                ]}
                value={batchMaxWeight}
                onChangeText={setBatchMaxWeight}
                keyboardType="decimal-pad"
                placeholder="Ex: 50"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Date de la pesée *</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {formData.date
                ? parseLocalDate(formData.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formData.date ? parseLocalDate(formData.date) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                // Sur iOS et Android avec 'default', le picker se ferme automatiquement
                setShowDatePicker(false);
                if (selectedDate && event.type !== 'dismissed') {
                  setFormData({
                    ...formData,
                    date: formatDateToLocal(selectedDate),
                  });
                }
              }}
            />
          )}
        </View>

        {/* Champs poids pour mode individuel */}
        {!isBatchMode && (
          <View style={styles.section}>
            <View style={styles.weightHeader}>
              <View style={styles.weightTitleContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Poids (kg) *</Text>
                {isAiEstimated && (
                  <View style={[styles.aiBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="sparkles" size={12} color={colors.primary} />
                    <Text style={[styles.aiBadgeText, { color: colors.primary }]}>
                      Estimé par IA
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.aiButton, { backgroundColor: colors.primary }]}
                onPress={handleCapturePhoto}
                disabled={aiLoading || loading || !animal}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="camera" size={18} color="#FFFFFF" />
                    <Text style={styles.aiButtonText}>IA</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <FormField
              label=""
              value={formData.poids_kg.toString()}
              onChangeText={(text) => {
                setFormData({ ...formData, poids_kg: parseFloat(text) || 0 });
                // Si l'utilisateur modifie manuellement, on retire l'indicateur IA
                if (isAiEstimated && parseFloat(text) !== formData.poids_kg) {
                  setIsAiEstimated(false);
                  setAiConfidence(null);
                }
              }}
              keyboardType="numeric"
              placeholder="Saisir ou utiliser l'IA"
              required
            />
            {aiLoading && (
              <Text style={[styles.aiStatus, { color: colors.textSecondary }]}>
                Analyse en cours...
              </Text>
            )}
            {isAiEstimated && aiConfidence !== null && !aiLoading && (
              <View style={styles.aiInfoContainer}>
                <Text style={[styles.aiInfoText, { color: colors.textSecondary }]}>
                  <Ionicons name="information-circle" size={14} color={colors.textSecondary} />{' '}
                  Estimation IA (confiance: {(aiConfidence * 100).toFixed(0)}%) - Modifiable manuellement
                </Text>
              </View>
            )}
            {!isAiEstimated && formData.poids_kg === 0 && (
              <Text style={[styles.aiHint, { color: colors.textSecondary }]}>
                💡 Astuce: Utilisez le bouton "IA" pour estimer automatiquement le poids, ou saisissez-le manuellement
              </Text>
            )}
          </View>
        )}

        <FormField
          label={isBatchMode ? 'Notes' : 'Commentaire'}
          value={formData.commentaire || ''}
          onChangeText={(text) => setFormData({ ...formData, commentaire: text })}
          placeholder={isBatchMode ? 'Notes optionnelles' : 'Notes sur cette pesée...'}
          multiline
          numberOfLines={3}
        />
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  aiStatus: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  weightTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  aiBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  aiInfoContainer: {
    marginTop: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiInfoText: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
  },
  aiHint: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
});
