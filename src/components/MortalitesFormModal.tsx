/**
 * Composant formulaire modal pour mortalité
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createMortalite, updateMortalite } from '../store/slices/mortalitesSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import type { Mortalite, CreateMortaliteInput, CategorieMortalite } from '../types/mortalites';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { getCategorieAnimal } from '../utils/animalUtils';
import { logger } from '../utils/logger';
import { useModeElevage } from '../hooks/useModeElevage';
import BatchSelector from './sante/BatchSelector';
import { Batch } from '../types/batch';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../services/api/apiClient';
import { useProjetEffectif } from '../hooks/useProjetEffectif';

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

interface MortalitesFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mortalite?: Mortalite | null;
  isEditing?: boolean;
}

export default function MortalitesFormModal({
  visible,
  onClose,
  onSuccess,
  mortalite,
  isEditing = false,
}: MortalitesFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const animaux = useAppSelector(selectAllAnimaux);
  const { canCreate, canUpdate } = useActionPermissions();
  const modeElevage = useModeElevage();
  const isModeBatch = modeElevage === 'bande';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateMortaliteInput>({
    projet_id: projetActif?.id || '',
    nombre_porcs: 1,
    date: formatDateToLocal(new Date()),
    categorie: 'porcelet',
    cause: '',
    animal_code: '',
    notes: '',
  });
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [animalSearchQuery, setAnimalSearchQuery] = useState('');

  const categories: CategorieMortalite[] = ['porcelet', 'truie', 'verrat', 'autre'];
  const categorieLabels: Record<CategorieMortalite, string> = {
    porcelet: 'Porcelet',
    truie: 'Truie',
    verrat: 'Verrat',
    autre: 'Autre',
  };

  // Filtrer les animaux actifs par code ET par catégorie sélectionnée
  const animauxFiltres = useMemo(() => {
    if (!Array.isArray(animaux)) {
      return [];
    }

    // Filtrer par statut actif
    let filteredAnimals = animaux.filter((a) => a.statut?.toLowerCase() === 'actif');

    // Filtrer par catégorie sélectionnée (sauf 'autre')
    if (formData.categorie !== 'autre') {
      filteredAnimals = filteredAnimals.filter((a) => {
        const categorieAnimal = getCategorieAnimal(a);
        return categorieAnimal === formData.categorie;
      });
    }

    // Filtrer par recherche (code ou nom)
    if (animalSearchQuery.trim()) {
      const query = animalSearchQuery.toLowerCase().trim();
      filteredAnimals = filteredAnimals.filter(
        (a) => a.code?.toLowerCase().includes(query) || a.nom?.toLowerCase().includes(query)
      );
    }

    return filteredAnimals;
  }, [animaux, animalSearchQuery, formData.categorie]);

  // Obtenir le label de l'animal sélectionné
  const getAnimalLabel = (code?: string) => {
    if (!code) return 'Non renseigné';
    if (!Array.isArray(animaux)) return code;
    const animal = animaux.find((a) => a.code === code);
    if (animal) {
      return `${animal.code}${animal.nom ? ` (${animal.nom})` : ''}`;
    }
    return code;
  };

  // Charger les animaux actifs quand le modal est visible (mode individuel uniquement)
  useEffect(() => {
    if (visible && projetActif?.id && !isModeBatch) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: false }));
    }
  }, [visible, projetActif?.id, dispatch, isModeBatch]);

  // Charger les bandes en mode batch
  useFocusEffect(
    useCallback(() => {
      if (!visible || !isModeBatch || !projetActif?.id) {
        setBatches([]);
        setSelectedBatch(null);
        return;
      }

      let cancelled = false;

      const loadBatches = async () => {
        try {
          const data = await apiClient.get<Batch[]>(`/batch-pigs/projet/${projetActif.id}`);
          if (!cancelled) {
            setBatches(data || []);
            // Si on est en mode édition et que la mortalité a un batch_id, sélectionner la bande
            if (mortalite?.batch_id) {
              const batch = data.find((b) => b.id === mortalite.batch_id);
              if (batch) {
                setSelectedBatch(batch);
              }
            }
          }
        } catch (error) {
          if (!cancelled) {
            console.error('[MortalitesFormModal] Erreur chargement bandes:', error);
            setBatches([]);
          }
        }
      };

      loadBatches();

      return () => {
        cancelled = true;
      };
    }, [visible, isModeBatch, projetActif?.id, mortalite?.batch_id])
  );

  useEffect(() => {
    if (mortalite && isEditing) {
      setFormData({
        projet_id: mortalite.projet_id,
        nombre_porcs: mortalite.nombre_porcs,
        date: mortalite.date.split('T')[0],
        categorie: mortalite.categorie,
        cause: mortalite.cause || '',
        animal_code: mortalite.animal_code || '',
        batch_id: mortalite.batch_id,
        notes: mortalite.notes || '',
      });
    } else {
      setFormData({
        projet_id: projetActif?.id || '',
        nombre_porcs: 1,
        date: formatDateToLocal(new Date()),
        categorie: 'porcelet',
        cause: '',
        animal_code: '',
        batch_id: undefined,
        notes: '',
      });
      setShowDatePicker(false);
      setAnimalSearchQuery('');
      setSelectedBatch(null);
    }
  }, [mortalite, isEditing, visible, projetActif]);

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('mortalites')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier les mortalités."
      );
      return;
    }
    if (!isEditing && !canCreate('mortalites')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de créer des mortalités.");
      return;
    }

    // Validation
    if (!formData.projet_id) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }
    if (formData.nombre_porcs <= 0) {
      Alert.alert('Erreur', 'Le nombre de porcs doit être supérieur à 0');
      return;
    }
    if (!formData.date) {
      Alert.alert('Erreur', 'La date est requise');
      return;
    }

    // Validation mode batch
    if (isModeBatch && !selectedBatch) {
      Alert.alert('Erreur', 'Veuillez sélectionner une loge');
      return;
    }

    setLoading(true);
    try {
      const finalFormData = {
        ...formData,
        batch_id: isModeBatch && selectedBatch ? selectedBatch.id : undefined,
        // En mode batch, on ne met pas animal_code
        animal_code: isModeBatch ? undefined : formData.animal_code,
      };

      if (isEditing && mortalite) {
        await dispatch(
          updateMortalite({
            id: mortalite.id,
            updates: finalFormData,
          })
        ).unwrap();
      } else {
        await dispatch(createMortalite(finalFormData)).unwrap();
      }
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'enregistrement";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la mortalité' : 'Nouvelle mortalité'}
      confirmText={isEditing ? 'Modifier' : 'Créer'}
      onConfirm={handleSubmit}
      showButtons={true}
      loading={loading}
      scrollEnabled={true}
    >
      <>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations</Text>

          <FormField
            label="Nombre de porcs"
            value={formData.nombre_porcs.toString()}
            onChangeText={(text) => setFormData({ ...formData, nombre_porcs: parseInt(text) || 0 })}
            keyboardType="numeric"
            placeholder="Ex: 2"
          />

          <View style={styles.dateContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Date</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
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

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Catégorie</Text>
            <View style={styles.optionsContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.option,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
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
                        color: colors.textOnPrimary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {categorieLabels[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {isModeBatch ? (
            /* Mode Batch : Sélection de bande */
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Loge concernée *</Text>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Sélectionnez la loge concernée par cette mortalité
              </Text>
              <BatchSelector
                selectedBatchId={selectedBatch?.id || null}
                onBatchSelect={setSelectedBatch}
                label="Sélectionner une loge *"
              />
              {selectedBatch && (
                <View
                  style={[
                    styles.batchSelectedInfo,
                    { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                  ]}
                >
                  <Ionicons name="home" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.batchSelectedName, { color: colors.primary }]}>
                      {selectedBatch.pen_name}
                    </Text>
                    <Text style={[styles.batchSelectedMeta, { color: colors.textSecondary }]}>
                      {selectedBatch.total_count} sujet(s) • {(selectedBatch.average_weight_kg || 0).toFixed(1)} kg moy.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* Mode Individuel : Sélection d'animal */
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Numéro du sujet (optionnel)
              </Text>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Si le sujet mort a un numéro enregistré dans le cheptel, sélectionnez-le. Il sera
                automatiquement retiré du cheptel et mis dans l'historique. Sinon, laissez vide (pour
                les porcelets non enregistrés par exemple).
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                onPress={() => setShowAnimalModal(true)}
              >
                <Text style={[styles.selectButtonLabel, { color: colors.textSecondary }]}>
                  Numéro du sujet
                </Text>
                <Text style={[styles.selectButtonValue, { color: colors.text }]}>
                  {getAnimalLabel(formData.animal_code)}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <FormField
            label="Cause (optionnel)"
            value={formData.cause}
            onChangeText={(text) => setFormData({ ...formData, cause: text })}
            placeholder="Ex: Maladie, Accident..."
            multiline
          />

          <FormField
            label="Notes (optionnel)"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Ajoutez des notes..."
            multiline
          />
        </View>
      </>

      {/* Modal de sélection de l'animal */}
      <CustomModal
        visible={showAnimalModal}
        onClose={() => {
          setShowAnimalModal(false);
          setAnimalSearchQuery('');
        }}
        title="Sélectionner le sujet"
        showButtons={false}
        scrollEnabled={true}
      >
        <>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Rechercher un sujet</Text>
            <TextInput
              style={[
                styles.searchInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              value={animalSearchQuery}
              onChangeText={setAnimalSearchQuery}
              placeholder="Rechercher par code ou nom..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.modalOption,
              { borderColor: colors.border, backgroundColor: colors.surface },
              !formData.animal_code && {
                borderColor: colors.primary,
                backgroundColor: colors.primary + '12',
              },
            ]}
            onPress={() => {
              setFormData({ ...formData, animal_code: '' });
              setShowAnimalModal(false);
              setAnimalSearchQuery('');
            }}
          >
            <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Non renseigné</Text>
            <Text style={[styles.modalOptionSubtitle, { color: colors.textSecondary }]}>
              Aucun numéro de sujet (porcelet non enregistré)
            </Text>
          </TouchableOpacity>
          {animauxFiltres.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                {animalSearchQuery.trim()
                  ? 'Aucun sujet trouvé'
                  : 'Aucun sujet actif enregistré dans le cheptel.'}
              </Text>
            </View>
          ) : (
            animauxFiltres.map((animal) => {
              const selected = formData.animal_code === animal.code;
              return (
                <TouchableOpacity
                  key={animal.id}
                  style={[
                    styles.modalOption,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '12' : colors.surface,
                    },
                  ]}
                  onPress={() => {
                    // Auto-détecter la catégorie de l'animal sélectionné
                    const categorieDetectee = getCategorieAnimal(animal);
                    logger.debug('Animal sélectionné:', {
                      code: animal.code,
                      sexe: animal.sexe,
                      reproducteur: animal.reproducteur,
                      categorieDetectee,
                    });

                    setFormData({
                      ...formData,
                      animal_code: animal.code,
                      categorie: categorieDetectee, // Auto-update de la catégorie
                    });
                    setShowAnimalModal(false);
                    setAnimalSearchQuery('');
                  }}
                >
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>
                    {animal.code}
                    {animal.nom ? ` (${animal.nom})` : ''}
                  </Text>
                  <Text style={[styles.modalOptionSubtitle, { color: colors.textSecondary }]}>
                    {animal.race ? `Race : ${animal.race} • ` : ''}
                    {animal.sexe === 'male'
                      ? 'Mâle'
                      : animal.sexe === 'femelle'
                        ? 'Femelle'
                        : 'Indéterminé'}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </>
      </CustomModal>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 500,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  dateContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  dateButton: {
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionText: {
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  selectButton: {
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  selectButtonLabel: {
    fontSize: 12,
    marginBottom: SPACING.xs,
  },
  selectButtonValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalScroll: {
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  searchInput: {
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  modalOption: {
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  modalOptionSubtitle: {
    fontSize: 14,
  },
  noResults: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  batchSelectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  batchSelectedName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  batchSelectedMeta: {
    fontSize: FONT_SIZES.xs,
  },
});
