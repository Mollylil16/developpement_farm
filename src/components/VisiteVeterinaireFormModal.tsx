/**
 * Modal de formulaire pour créer/modifier une visite vétérinaire
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createVisiteVeterinaire, updateVisiteVeterinaire } from '../store/slices/santeSlice';
import CustomModal from './CustomModal';
import { VisiteVeterinaire, CreateVisiteVeterinaireInput } from '../types/sante';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  visite?: VisiteVeterinaire;
}

export default function VisiteVeterinaireFormModal({ visible, onClose, visite }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });

  const isEditing = !!visite;

  const [formData, setFormData] = useState<{
    date_visite: string;
    veterinaire: string;
    motif: string;
    animaux_examines: string;
    diagnostic: string;
    prescriptions: string;
    recommandations: string;
    cout: string;
    prochaine_visite_prevue: string;
    notes: string;
  }>({
    date_visite: formatLocalDate(new Date().toISOString()),
    veterinaire: '',
    motif: '',
    animaux_examines: '',
    diagnostic: '',
    prescriptions: '',
    recommandations: '',
    cout: '',
    prochaine_visite_prevue: '',
    notes: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'visite' | 'prochaine'>('visite');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visite) {
      setFormData({
        date_visite: visite.date_visite,
        veterinaire: visite.veterinaire || '',
        motif: visite.motif,
        animaux_examines: visite.animaux_examines || '',
        diagnostic: visite.diagnostic || '',
        prescriptions: visite.prescriptions || '',
        recommandations: visite.recommandations || '',
        cout: visite.cout?.toString() || '',
        prochaine_visite_prevue: visite.prochaine_visite || '',
        notes: visite.notes || '',
      });
    }
  }, [visite]);

  const handleDatePickerChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = formatLocalDate(selectedDate.toISOString());
      if (datePickerField === 'visite') {
        setFormData({ ...formData, date_visite: dateString });
      } else {
        setFormData({ ...formData, prochaine_visite_prevue: dateString });
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.veterinaire) {
      setError('Veuillez entrer le nom du vétérinaire');
      return;
    }

    if (!formData.motif) {
      setError('Veuillez entrer le motif de la visite');
      return;
    }

    if (!formData.cout) {
      setError('Veuillez entrer le coût de la visite');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // animaux_examines est déjà une string (IDs séparés par virgules)
      const animauxExaminesString = formData.animaux_examines?.trim() || undefined;

      if (isEditing && visite) {
        await dispatch(
          updateVisiteVeterinaire({
            id: visite.id,
            updates: {
              date_visite: formData.date_visite,
              veterinaire: formData.veterinaire,
              motif: formData.motif,
              animaux_examines: animauxExaminesString,
              diagnostic: formData.diagnostic || undefined,
              prescriptions: formData.prescriptions || undefined,
              recommandations: formData.recommandations || undefined,
              cout: parseFloat(formData.cout),
              prochaine_visite: formData.prochaine_visite_prevue || undefined,
              notes: formData.notes || undefined,
            },
          })
        ).unwrap();
      } else {
        const input: CreateVisiteVeterinaireInput = {
          projet_id: projetActif!.id,
          date_visite: formData.date_visite,
          veterinaire: formData.veterinaire,
          motif: formData.motif,
          animaux_examines: animauxExaminesString,
          diagnostic: formData.diagnostic || undefined,
          prescriptions: formData.prescriptions || undefined,
          recommandations: formData.recommandations || undefined,
          cout: parseFloat(formData.cout),
          prochaine_visite: formData.prochaine_visite_prevue || undefined,
          notes: formData.notes || undefined,
        };

        await dispatch(createVisiteVeterinaire(input)).unwrap();
      }

      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err) || "Erreur lors de l'enregistrement";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la visite' : 'Nouvelle visite vétérinaire'}
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

        {/* Date de visite */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Date de la visite *</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setDatePickerField('visite');
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {new Date(formData.date_visite).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && datePickerField === 'visite' && (
            <DateTimePicker
              value={parseLocalDate(formData.date_visite)}
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
        </View>

        {/* Vétérinaire */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Vétérinaire *</Text>
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

        {/* Motif de la visite */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Motif de la visite *</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.motif}
            onChangeText={(text) => setFormData({ ...formData, motif: text })}
            placeholder="Ex: Consultation de routine, urgence, vaccination de masse, etc."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Animaux examinés */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Animaux examinés (IDs séparés par virgule)
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.animaux_examines}
            onChangeText={(text) => setFormData({ ...formData, animaux_examines: text })}
            placeholder="Ex: A001, A002, A003"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            Séparer les IDs par des virgules
          </Text>
        </View>

        {/* Diagnostic */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Diagnostic</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.diagnostic}
            onChangeText={(text) => setFormData({ ...formData, diagnostic: text })}
            placeholder="Diagnostic du vétérinaire..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Prescriptions */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Prescriptions</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.prescriptions}
            onChangeText={(text) => setFormData({ ...formData, prescriptions: text })}
            placeholder="Médicaments et traitements prescrits..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Recommandations */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Recommandations</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.recommandations}
            onChangeText={(text) => setFormData({ ...formData, recommandations: text })}
            placeholder="Recommandations du vétérinaire..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Coût */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Coût de la visite (F CFA) *</Text>
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

        {/* Prochaine visite */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Prochaine visite prévue (optionnel)
          </Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setDatePickerField('prochaine');
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formData.prochaine_visite_prevue
                ? new Date(formData.prochaine_visite_prevue).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && datePickerField === 'prochaine' && (
            <DateTimePicker
              value={
                formData.prochaine_visite_prevue
                  ? parseLocalDate(formData.prochaine_visite_prevue)
                  : new Date()
              }
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
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

        {/* Boutons */}
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
            <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>
              {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 500,
  },
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
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
