/**
 * VisiteVeterinaireFormModalNew - Modal pour ajouter/modifier une visite vétérinaire
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import CustomModal from './CustomModal';
import { createVisiteVeterinaire, updateVisiteVeterinaire } from '../store/slices/santeSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { getCurrentLocalDate, formatDisplayDate } from '../utils/dateUtils';
import { VisiteVeterinaire, CreateVisiteVeterinaireInput } from '../types/sante';
import { getCategorieAnimal } from '../utils/animalUtils';

interface VisiteVeterinaireFormModalNewProps {
  visible: boolean;
  onClose: () => void;
  visite?: VisiteVeterinaire; // Si fourni, mode édition
}

type TypeIntervention =
  | 'traitement_vaccinal'
  | 'soin_malade'
  | 'consultation_generale'
  | 'prophylaxie_masse'
  | 'autre';

const TYPE_INTERVENTION_LABELS: Record<TypeIntervention, string> = {
  traitement_vaccinal: 'Traitement vaccinal',
  soin_malade: 'Soin sujet malade',
  consultation_generale: 'Consultation générale',
  prophylaxie_masse: 'Prophylaxie de masse',
  autre: 'Autre',
};

export default function VisiteVeterinaireFormModalNew({
  visible,
  onClose,
  visite,
}: VisiteVeterinaireFormModalNewProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const animaux = useAppSelector(selectAllAnimaux);

  const [dateVisite, setDateVisite] = useState(visite?.date_visite || getCurrentLocalDate());
  const [motif, setMotif] = useState<TypeIntervention>(
    (visite?.motif as TypeIntervention) || 'consultation_generale'
  );
  const [animauxSelectionnes, setAnimauxSelectionnes] = useState<string[]>(() => {
    if (visite?.animaux_examines) {
      // animaux_examines est une string avec des IDs séparés par virgules
      return Array.isArray(visite.animaux_examines)
        ? visite.animaux_examines
        : visite.animaux_examines.split(',').map((id) => id.trim()).filter(Boolean);
    }
    return [];
  });
  const [rechercheAnimal, setRechercheAnimal] = useState('');
  const [diagnostic, setDiagnostic] = useState(visite?.diagnostic || '');
  const [traitement, setTraitement] = useState(visite?.prescriptions || visite?.recommandations || '');
  const [cout, setCout] = useState(visite?.cout?.toString() || '');
  const [notes, setNotes] = useState(visite?.notes || '');
  const [photos, setPhotos] = useState<string[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Charger les animaux
  useEffect(() => {
    if (projetActif?.id) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: false }));
    }
  }, [projetActif?.id, dispatch]);

  // Demander permission photos
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission refusée', 'Permission nécessaire pour accéder aux photos');
        }
      }
    })();
  }, []);

  // Filtrer les animaux selon la recherche
  const animauxFiltres = animaux.filter((animal) => {
    if (!rechercheAnimal) return true;
    const searchLower = rechercheAnimal.toLowerCase();
    const nom = animal.nom?.toLowerCase() || '';
    const code = animal.code?.toLowerCase() || '';
    const categorie = getCategorieAnimal(animal).toLowerCase();
    return (
      nom.includes(searchLower) || code.includes(searchLower) || categorie.includes(searchLower)
    );
  });

  // Toggle sélection d'un animal
  const toggleAnimalSelection = (animalId: string) => {
    setAnimauxSelectionnes((prev) => {
      if (prev.includes(animalId)) {
        return prev.filter((id) => id !== animalId);
      } else {
        return [...prev, animalId];
      }
    });
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((asset) => asset.uri);
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('Erreur sélection photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner les photos');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Permission nécessaire pour utiliser la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erreur prise photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!projetActif?.id) return;

    // Validation
    if (!diagnostic.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un diagnostic ou des observations');
      return;
    }

    setLoading(true);

    try {
      // Créer la liste des noms d'animaux sélectionnés
      const nomsAnimaux = animauxSelectionnes
        .map((id) => {
          const animal = animaux.find((a) => a.id === id);
          return animal ? animal.nom || animal.code || `Porc #${id.slice(0, 8)}` : null;
        })
        .filter(Boolean)
        .join(', ');

      const input: CreateVisiteVeterinaireInput = {
        projet_id: projetActif.id,
        date_visite: dateVisite,
        veterinaire: visite?.veterinaire || 'Non spécifié',
        motif: TYPE_INTERVENTION_LABELS[motif],
        animaux_examines: animauxSelectionnes.length > 0 ? nomsAnimaux : undefined,
        diagnostic: diagnostic.trim(),
        prescriptions: traitement.trim() || undefined,
        cout: cout ? parseFloat(cout) : 0,
        notes: notes.trim() || undefined,
      };

      if (visite) {
        // Mode édition
        await dispatch(
          updateVisiteVeterinaire({
            id: visite.id,
            updates: input,
          })
        ).unwrap();
        Alert.alert('Succès', 'Visite vétérinaire mise à jour');
      } else {
        // Mode création
        await dispatch(createVisiteVeterinaire(input)).unwrap();
        Alert.alert('Succès', 'Visite vétérinaire enregistrée');
      }

      onClose();
    } catch (error: unknown) {
      console.error('Erreur enregistrement visite:', error);
      const errorMessage = error instanceof Error ? error.message : String(error) || 'Impossible d\'enregistrer la visite';
      Alert.alert('Erreur', `Impossible d'enregistrer la visite: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={visite ? 'Modifier la visite' : 'Enregistrer une visite'}
      scrollEnabled={true}
    >
      <>
        {/* Date de la visite */}
        <Text style={[styles.label, { color: colors.text }]}>Date de la visite *</Text>
        <TouchableOpacity
          style={[
            styles.dateInput,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.dateInputText, { color: colors.text }]}>
            {formatDisplayDate(dateVisite)}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(dateVisite)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) {
                setDateVisite(date.toISOString().split('T')[0]);
              }
            }}
          />
        )}

        {/* Type d'intervention */}
        <Text style={[styles.label, { color: colors.text }]}>Type d'intervention *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          {(Object.keys(TYPE_INTERVENTION_LABELS) as TypeIntervention[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.typeChip,
                { borderColor: colors.border },
                motif === key
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : null,
              ]}
              onPress={() => setMotif(key)}
            >
              <Text style={[styles.typeChipText, { color: motif === key ? '#FFF' : colors.text }]}>
                {TYPE_INTERVENTION_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sélection des animaux */}
        <Text style={[styles.label, { color: colors.text }]}>Sujet(s) examiné(s)</Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Sélectionnez un ou plusieurs animaux concernés par cette visite
        </Text>

        {/* Barre de recherche */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher un animal..."
            placeholderTextColor={colors.textSecondary}
            value={rechercheAnimal}
            onChangeText={setRechercheAnimal}
          />
          {rechercheAnimal.length > 0 && (
            <TouchableOpacity onPress={() => setRechercheAnimal('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Badge des animaux sélectionnés */}
        {animauxSelectionnes.length > 0 && (
          <View
            style={[
              styles.selectedBadge,
              { backgroundColor: colors.primary + '15', borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.selectedBadgeText, { color: colors.primary }]}>
              {animauxSelectionnes.length} sujet{animauxSelectionnes.length > 1 ? 's' : ''}{' '}
              sélectionné{animauxSelectionnes.length > 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={() => setAnimauxSelectionnes([])}>
              <Text style={[styles.clearSelectionText, { color: colors.primary }]}>
                Tout désélectionner
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Liste des animaux */}
        <ScrollView
          style={[
            styles.animauxListe,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          nestedScrollEnabled
        >
          {animauxFiltres.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucun animal trouvé
              </Text>
            </View>
          ) : (
            animauxFiltres.map((animal) => {
              const isSelected = animauxSelectionnes.includes(animal.id);
              const nom = animal.nom || animal.code || `Porc #${animal.id.slice(0, 8)}`;
              const categorie = getCategorieAnimal(animal);

              return (
                <TouchableOpacity
                  key={animal.id}
                  style={[
                    styles.animalItem,
                    {
                      backgroundColor: isSelected ? `${colors.primary}15` : 'transparent',
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleAnimalSelection(animal.id)}
                >
                  <View style={styles.animalItemLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.animalNom, { color: colors.text }]} numberOfLines={1}>
                        {nom}
                      </Text>
                      <Text style={[styles.animalDetails, { color: colors.textSecondary }]}>
                        {categorie}
                        {animal.code && ` • ${animal.code}`}
                        {animal.sexe && ` • ${animal.sexe}`}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Diagnostic / Observations */}
        <Text style={[styles.label, { color: colors.text }]}>Diagnostic / Observations *</Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Décrivez les observations, le diagnostic..."
          placeholderTextColor={colors.textSecondary}
          value={diagnostic}
          onChangeText={setDiagnostic}
          multiline
          numberOfLines={4}
        />

        {/* Traitement administré */}
        <Text style={[styles.label, { color: colors.text }]}>Traitement administré</Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Médicaments, soins effectués..."
          placeholderTextColor={colors.textSecondary}
          value={traitement}
          onChangeText={setTraitement}
          multiline
          numberOfLines={3}
        />

        {/* Coût */}
        <Text style={[styles.label, { color: colors.text }]}>Coût de l'intervention (FCFA)</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Ex: 25000"
          placeholderTextColor={colors.textSecondary}
          value={cout}
          onChangeText={setCout}
          keyboardType="numeric"
        />

        {/* Photos */}
        <Text style={[styles.label, { color: colors.text }]}>Photos (optionnel)</Text>
        <View style={styles.photosContainer}>
          <TouchableOpacity
            style={[
              styles.photoButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handlePickImage}
          >
            <Ionicons name="images-outline" size={24} color={colors.primary} />
            <Text style={[styles.photoButtonText, { color: colors.text }]}>Galerie</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.photoButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handleTakePhoto}
          >
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
            <Text style={[styles.photoButtonText, { color: colors.text }]}>Appareil photo</Text>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <ScrollView horizontal style={styles.photosPreview}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoPreviewContainer}>
                <TouchableOpacity
                  style={[styles.removePhotoButton, { backgroundColor: colors.error }]}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Notes complémentaires */}
        <Text style={[styles.label, { color: colors.text }]}>Notes complémentaires</Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Remarques, recommandations..."
          placeholderTextColor={colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Boutons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, styles.buttonSecondaryText, { color: colors.text }]}>
              Annuler
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.buttonPrimaryText]}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    fontSize: FONT_SIZES.md,
  },
  textArea: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    fontSize: FONT_SIZES.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  dateInputText: {
    fontSize: FONT_SIZES.md,
  },
  typeScroll: {
    marginBottom: SPACING.xs,
  },
  typeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginRight: SPACING.xs,
  },
  typeChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    padding: 0,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  selectedBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  clearSelectionText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  animauxListe: {
    maxHeight: 200,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.xs,
    marginBottom: SPACING.md,
  },
  animalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  animalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animalNom: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  animalDetails: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  photoButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  photosPreview: {
    marginTop: SPACING.sm,
  },
  photoPreviewContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonPrimary: {},
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  buttonSecondaryText: {},
  buttonPrimaryText: {
    color: '#FFF',
  },
});
