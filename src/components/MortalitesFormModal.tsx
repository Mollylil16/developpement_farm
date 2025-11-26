/**
 * Composant formulaire modal pour mortalité
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createMortalite, updateMortalite } from '../store/slices/mortalitesSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { Mortalite, CreateMortaliteInput, CategorieMortalite } from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { getCategorieAnimal } from '../utils/animalUtils';

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
  const { projetActif } = useAppSelector((state) => state.projet);
  const animaux = useAppSelector(selectAllAnimaux);
  const { canCreate, canUpdate } = useActionPermissions();
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
        (a) =>
          a.code?.toLowerCase().includes(query) || a.nom?.toLowerCase().includes(query)
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

  // Charger les animaux actifs quand le modal est visible
  useEffect(() => {
    if (visible && projetActif?.id) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: false }));
    }
  }, [visible, projetActif?.id, dispatch]);

  useEffect(() => {
    if (mortalite && isEditing) {
      setFormData({
        projet_id: mortalite.projet_id,
        nombre_porcs: mortalite.nombre_porcs,
        date: mortalite.date.split('T')[0],
        categorie: mortalite.categorie,
        cause: mortalite.cause || '',
        animal_code: mortalite.animal_code || '',
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
        notes: '',
      });
      setShowDatePicker(false);
      setAnimalSearchQuery('');
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

    setLoading(true);
    try {
      if (isEditing && mortalite) {
        await dispatch(
          updateMortalite({
            id: mortalite.id,
            updates: formData,
          })
        ).unwrap();
      } else {
        await dispatch(createMortalite(formData)).unwrap();
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erreur', error || "Erreur lors de l'enregistrement");
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
                    console.log('🐷 Animal sélectionné:', {
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
});
