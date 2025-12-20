/**
 * Modal de formulaire pour créer/modifier une vaccination
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createVaccination, updateVaccination } from '../store/slices/santeSlice';
import CustomModal from './CustomModal';
import {
  Vaccination,
  CreateVaccinationInput,
  TypeVaccin,
  StatutVaccination,
  TYPE_VACCIN_LABELS,
  STATUT_VACCINATION_LABELS,
} from '../types/sante';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  vaccination?: Vaccination; // Si fourni, on est en mode édition
  animalId?: string; // Pré-sélection d'un animal
}

export default function VaccinationFormModal({ visible, onClose, vaccination, animalId }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  // Note: calendriers n'est pas utilisé dans ce composant
  // const calendriers = useAppSelector(selectAllCalendrierVaccinations);

  const isEditing = !!vaccination;

  const [formData, setFormData] = useState<{
    calendrier_id: string;
    animal_id: string;
    lot_id: string;
    vaccin: TypeVaccin;
    nom_vaccin: string;
    date_vaccination: string;
    date_rappel: string;
    numero_lot_vaccin: string;
    veterinaire: string;
    cout: string;
    statut: StatutVaccination;
    effets_secondaires: string;
    notes: string;
  }>(() => ({
    calendrier_id: '',
    animal_id: animalId || '',
    lot_id: '',
    vaccin: 'autre',
    nom_vaccin: '',
    date_vaccination:
      formatLocalDate(new Date().toISOString()) || new Date().toISOString().split('T')[0],
    date_rappel: '',
    numero_lot_vaccin: '',
    veterinaire: '',
    cout: '',
    statut: 'effectue',
    effets_secondaires: '',
    notes: '',
  }));

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'vaccination' | 'rappel'>('vaccination');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialiser le formulaire en mode édition
  useEffect(() => {
    if (vaccination) {
      setFormData({
        calendrier_id: vaccination.calendrier_id || '',
        animal_id: vaccination.animal_ids?.[0] || '',
        lot_id: vaccination.lot_id || '',
        vaccin: vaccination.vaccin || 'autre',
        nom_vaccin: vaccination.nom_vaccin || '',
        date_vaccination: vaccination.date_vaccination,
        date_rappel: vaccination.date_rappel || '',
        numero_lot_vaccin: vaccination.numero_lot_vaccin || '',
        veterinaire: vaccination.veterinaire || '',
        cout: vaccination.cout?.toString() || '',
        statut: vaccination.statut,
        effets_secondaires: vaccination.effets_secondaires || '',
        notes: vaccination.notes || '',
      });
    }
  }, [vaccination]);

  const handleDatePickerChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = formatLocalDate(selectedDate.toISOString());
      if (datePickerField === 'vaccination') {
        setFormData({ ...formData, date_vaccination: dateString });
      } else {
        setFormData({ ...formData, date_rappel: dateString });
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.vaccin) {
      setError('Veuillez sélectionner un vaccin');
      return;
    }

    if (!formData.date_vaccination) {
      setError('Veuillez sélectionner une date de vaccination');
      return;
    }

    if (!formData.animal_id && !formData.lot_id) {
      setError('Veuillez sélectionner un animal ou un lot');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && vaccination) {
        // Mode édition
        await dispatch(
          updateVaccination({
            id: vaccination.id,
            updates: {
              calendrier_id: formData.calendrier_id || undefined,
              animal_ids: formData.animal_id ? [formData.animal_id] : undefined,
              lot_id: formData.lot_id || undefined,
              vaccin: formData.vaccin,
              nom_vaccin: formData.nom_vaccin || undefined,
              date_vaccination: formData.date_vaccination,
              date_rappel: formData.date_rappel || undefined,
              numero_lot_vaccin: formData.numero_lot_vaccin || undefined,
              veterinaire: formData.veterinaire || undefined,
              cout: formData.cout ? parseFloat(formData.cout) : undefined,
              statut: formData.statut,
              effets_secondaires: formData.effets_secondaires || undefined,
              notes: formData.notes || undefined,
            },
          })
        ).unwrap();
      } else {
        // Mode création
        if (!projetActif?.id) {
          setError('Aucun projet actif');
          setLoading(false);
          return;
        }

        const input: CreateVaccinationInput = {
          projet_id: projetActif.id,
          calendrier_id: formData.calendrier_id || undefined,
          animal_ids: formData.animal_id ? [formData.animal_id] : undefined,
          lot_id: formData.lot_id || undefined,
          type_prophylaxie: 'vaccin_obligatoire', // Valeur par défaut
          vaccin: formData.vaccin,
          nom_vaccin: formData.nom_vaccin || undefined,
          produit_administre: formData.nom_vaccin || TYPE_VACCIN_LABELS[formData.vaccin] || 'Vaccin non spécifié',
          date_vaccination: formData.date_vaccination,
          date_rappel: formData.date_rappel || undefined,
          numero_lot_vaccin: formData.numero_lot_vaccin || undefined,
          dosage: 'Non spécifié', // Valeur par défaut
          raison_traitement: 'prevention', // Valeur par défaut
          veterinaire: formData.veterinaire || undefined,
          cout: formData.cout ? parseFloat(formData.cout) : undefined,
          statut: formData.statut,
          effets_secondaires: formData.effets_secondaires || undefined,
          notes: formData.notes || undefined,
        };

        await dispatch(createVaccination(input)).unwrap();
      }

      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err) || "Erreur lors de l'enregistrement";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const vaccins: TypeVaccin[] = [
    'rouget',
    'parvovirose',
    'mal_rouge',
    'circovirus',
    'mycoplasme',
    'grippe',
    'autre',
  ];

  const statuts: StatutVaccination[] = ['planifie', 'effectue', 'en_retard', 'annule'];

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la vaccination' : 'Nouvelle vaccination'}
      enableShakeToCancel={true}
      showButtons={false}
      scrollEnabled={true}
    >
      <>
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Type de vaccin */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Type de vaccin *</Text>
          <View style={styles.optionsContainer}>
            {vaccins.map((vaccin) => (
              <TouchableOpacity
                key={vaccin}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  formData.vaccin === vaccin && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, vaccin })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.vaccin === vaccin && {
                      color: colors.textOnPrimary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {TYPE_VACCIN_LABELS[vaccin]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nom personnalisé (si "Autre") */}
        {formData.vaccin === 'autre' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Nom du vaccin</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.nom_vaccin}
              onChangeText={(text) => setFormData({ ...formData, nom_vaccin: text })}
              placeholder="Nom du vaccin"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}

        {/* Date de vaccination */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Date de vaccination *</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setDatePickerField('vaccination');
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formData.date_vaccination
                ? new Date(formData.date_vaccination).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && datePickerField === 'vaccination' && (
            <DateTimePicker
              value={
                formData.date_vaccination ? parseLocalDate(formData.date_vaccination) : new Date()
              }
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
        </View>

        {/* Date de rappel */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Date de rappel (optionnel)</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setDatePickerField('rappel');
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="alarm-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formData.date_rappel
                ? new Date(formData.date_rappel).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && datePickerField === 'rappel' && (
            <DateTimePicker
              value={formData.date_rappel ? parseLocalDate(formData.date_rappel) : new Date()}
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
        </View>

        {/* Statut */}
        {isEditing && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Statut</Text>
            <View style={styles.optionsContainer}>
              {statuts.map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.option,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    formData.statut === statut && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, statut })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      formData.statut === statut && {
                        color: colors.textOnPrimary,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {STATUT_VACCINATION_LABELS[statut]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Numéro de lot */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Numéro de lot vaccin</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.numero_lot_vaccin}
            onChangeText={(text) => setFormData({ ...formData, numero_lot_vaccin: text })}
            placeholder="Ex: LOT-2024-001"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Vétérinaire */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Vétérinaire</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.veterinaire}
            onChangeText={(text) => setFormData({ ...formData, veterinaire: text })}
            placeholder="Nom du vétérinaire"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Coût */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Coût (F CFA)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.cout}
            onChangeText={(text) => setFormData({ ...formData, cout: text })}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Effets secondaires */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Effets secondaires observés</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.effets_secondaires}
            onChangeText={(text) => setFormData({ ...formData, effets_secondaires: text })}
            placeholder="Décrire les effets secondaires éventuels..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Notes supplémentaires..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>
                Enregistrement...
              </Text>
            ) : (
              <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>
                {isEditing ? 'Modifier' : 'Créer'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 15,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
