/**
 * Composant formulaire modal pour gestation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, FlatList } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createGestation, updateGestation } from '../store/slices/reproductionSlice';
import { Gestation, CreateGestationInput } from '../types';
import { calculerDateMiseBasPrevue } from '../types/reproduction';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { COLORS, SPACING } from '../constants/theme';

interface GestationFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  gestation?: Gestation | null;
  isEditing?: boolean;
}

export default function GestationFormModal({
  visible,
  onClose,
  onSuccess,
  gestation,
  isEditing = false,
}: GestationFormModalProps) {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateGestationInput>({
    truie_id: '',
    truie_nom: '',
    date_sautage: new Date().toISOString().split('T')[0],
    nombre_porcelets_prevu: 0,
    notes: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [directInput, setDirectInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullList, setShowFullList] = useState(false);

  // Générer une liste de truies basée sur le projet actif
  const truies = useMemo(() => {
    if (!projetActif) return [];
    const truiesList = [];
    for (let i = 1; i <= projetActif.nombre_truies; i++) {
      truiesList.push({
        id: `truie_${i}`,
        nom: `Truie ${i}`,
        numero: i,
      });
    }
    return truiesList;
  }, [projetActif]);

  // Filtrer les truies selon la recherche ou la saisie directe
  const truiesFiltrees = useMemo(() => {
    // Si un numéro direct est saisi et valide, retourner uniquement cette truie
    if (directInput.trim()) {
      const numero = parseInt(directInput.trim());
      if (!isNaN(numero) && numero > 0 && numero <= truies.length) {
        const truieTrouvee = truies.find((t) => t.numero === numero);
        if (truieTrouvee) {
          return [truieTrouvee];
        }
      }
    }

    // Sinon, filtrer par recherche textuelle
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return truies.slice(0, 50); // Limiter à 50 résultats par défaut
    }

    const filtrees = truies.filter((truie) => {
      const nomLower = truie.nom.toLowerCase();
      const numeroStr = truie.numero.toString();
      return nomLower.includes(query) || numeroStr.includes(query);
    });

    return filtrees.slice(0, 50); // Limiter à 50 résultats
  }, [truies, searchQuery, directInput]);

  // Gérer la sélection directe par numéro
  useEffect(() => {
    if (directInput.trim()) {
      const numero = parseInt(directInput.trim());
      if (!isNaN(numero) && numero > 0 && numero <= truies.length) {
        const truieTrouvee = truies.find((t) => t.numero === numero);
        if (truieTrouvee) {
          setFormData((prev) => ({
            ...prev,
            truie_id: truieTrouvee.id,
            truie_nom: truieTrouvee.nom,
          }));
          setSearchQuery(''); // Réinitialiser la recherche
        }
      }
    }
  }, [directInput, truies]);

  useEffect(() => {
    if (gestation && isEditing) {
      const truieNumero = parseInt(gestation.truie_id.replace('truie_', ''));
      setFormData({
        truie_id: gestation.truie_id,
        truie_nom: gestation.truie_nom || '',
        date_sautage: gestation.date_sautage.split('T')[0],
        nombre_porcelets_prevu: gestation.nombre_porcelets_prevu,
        notes: gestation.notes || '',
      });
      if (!isNaN(truieNumero)) {
        setDirectInput(truieNumero.toString());
      }
    } else {
      setFormData({
        truie_id: '',
        truie_nom: '',
        date_sautage: new Date().toISOString().split('T')[0],
        nombre_porcelets_prevu: 0,
        notes: '',
      });
      setDirectInput('');
      setSearchQuery('');
      setShowFullList(false);
    }
  }, [gestation, isEditing, visible]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.truie_id && !formData.truie_nom?.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner ou saisir le nom de la truie');
      return;
    }
    if (!formData.date_sautage) {
      Alert.alert('Erreur', 'La date de sautage est requise');
      return;
    }
    if (formData.nombre_porcelets_prevu <= 0) {
      Alert.alert('Erreur', 'Le nombre de porcelets prévu doit être supérieur à 0');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && gestation) {
        await dispatch(
          updateGestation({
            id: gestation.id,
            updates: {
              ...formData,
              truie_nom: formData.truie_nom || formData.truie_id,
            },
          })
        ).unwrap();
      } else {
        await dispatch(
          createGestation({
            ...formData,
            truie_nom: formData.truie_nom || formData.truie_id,
          })
        ).unwrap();
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const dateMiseBasPrevue = calculerDateMiseBasPrevue(formData.date_sautage);
  const dateMiseBas = new Date(dateMiseBasPrevue);
  const formattedDate = dateMiseBas.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la gestation' : 'Nouvelle gestation'}
      confirmText={isEditing ? 'Modifier' : 'Créer'}
      onConfirm={handleSubmit}
      showButtons={true}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Truie *</Text>
          
          {/* Champ de saisie directe du numéro */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Numéro de la truie (saisie rapide)</Text>
            <TextInput
              style={styles.directInput}
              value={directInput}
              onChangeText={(text) => {
                setDirectInput(text);
                setSearchQuery(''); // Réinitialiser la recherche
              }}
              placeholder="Ex: 856"
              keyboardType="numeric"
              placeholderTextColor={COLORS.textSecondary}
            />
            {directInput.trim() && (
              <Text style={styles.inputHint}>
                {(() => {
                  const numero = parseInt(directInput.trim());
                  if (!isNaN(numero) && numero > 0 && numero <= truies.length) {
                    return `✓ Truie ${numero} trouvée`;
                  } else if (!isNaN(numero) && numero > truies.length) {
                    return `✗ Numéro invalide (max: ${truies.length})`;
                  } else {
                    return '';
                  }
                })()}
              </Text>
            )}
          </View>

          {/* Barre de recherche (si pas de saisie directe valide) */}
          {(!directInput.trim() || parseInt(directInput.trim()) > truies.length || isNaN(parseInt(directInput.trim()))) && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Rechercher une truie</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher par nom ou numéro..."
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          )}

          {/* Affichage de la truie sélectionnée */}
          {formData.truie_id && (
            <View style={styles.selectedTruieCard}>
              <Text style={styles.selectedTruieLabel}>Truie sélectionnée:</Text>
              <Text style={styles.selectedTruieValue}>{formData.truie_nom}</Text>
            </View>
          )}

          {/* Liste des résultats filtrés */}
          {truies.length > 0 && (
            <View style={styles.resultsContainer}>
              {truiesFiltrees.length > 0 ? (
                <>
                  <View style={styles.resultsHeader}>
                    <Text style={styles.resultsCount}>
                      {truiesFiltrees.length} résultat{truiesFiltrees.length > 1 ? 's' : ''}
                      {!showFullList && truiesFiltrees.length === 50 && ` (sur ${truies.length})`}
                    </Text>
                    {!showFullList && truies.length > 50 && (
                      <TouchableOpacity
                        style={styles.showAllButton}
                        onPress={() => setShowFullList(true)}
                      >
                        <Text style={styles.showAllButtonText}>Voir toutes ({truies.length})</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    data={showFullList ? truies : truiesFiltrees}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.option,
                          formData.truie_id === item.id && styles.optionSelected,
                        ]}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            truie_id: item.id,
                            truie_nom: item.nom,
                          });
                          setDirectInput(item.numero.toString());
                          setSearchQuery('');
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            formData.truie_id === item.id && styles.optionTextSelected,
                          ]}
                        >
                          {item.nom}
                        </Text>
                      </TouchableOpacity>
                    )}
                    numColumns={3}
                    contentContainerStyle={styles.optionsContainer}
                  />
                </>
              ) : (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>
                    {searchQuery.trim() ? 'Aucun résultat trouvé' : 'Commencez à rechercher ou saisissez un numéro'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Option de saisie manuelle si aucune truie */}
          {truies.length === 0 && (
            <FormField
              label="Nom de la truie"
              value={formData.truie_nom || ''}
              onChangeText={(text) => setFormData({ ...formData, truie_nom: text })}
              placeholder="Ex: TRU015"
              required
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date de sautage *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setDatePickerMode('date');
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonText}>
              {new Date(formData.date_sautage).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(formData.date_sautage)}
              mode={datePickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setFormData({
                    ...formData,
                    date_sautage: selectedDate.toISOString().split('T')[0],
                  });
                }
              }}
            />
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Date de mise bas prévue:</Text>
          <Text style={styles.infoValue}>{formattedDate}</Text>
          <Text style={styles.infoNote}>
            (Calculée automatiquement: {formData.date_sautage} + 114 jours)
          </Text>
        </View>

        <FormField
          label="Nombre de porcelets prévu *"
          value={formData.nombre_porcelets_prevu.toString()}
          onChangeText={(text) =>
            setFormData({ ...formData, nombre_porcelets_prevu: parseInt(text) || 0 })
          }
          placeholder="Ex: 12"
          keyboardType="numeric"
          required
        />

        <FormField
          label="Notes"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Notes supplémentaires..."
          multiline
          numberOfLines={4}
        />
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
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  directInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    fontSize: 16,
    color: COLORS.text,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    fontSize: 14,
    color: COLORS.text,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  selectedTruieCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  selectedTruieLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  selectedTruieValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  resultsContainer: {
    marginTop: SPACING.md,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  resultsCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  showAllButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  showAllButtonText: {
    fontSize: 12,
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  noResults: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs / 2,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.xs / 2,
    marginBottom: SPACING.sm,
    minWidth: '30%',
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
  dateButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  infoBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  infoNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});

