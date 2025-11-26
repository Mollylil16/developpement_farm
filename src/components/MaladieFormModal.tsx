/**
 * Modal de formulaire pour créer/modifier une maladie
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createMaladie, updateMaladie } from '../store/slices/santeSlice';
import CustomModal from './CustomModal';
import {
  Maladie,
  CreateMaladieInput,
  TypeMaladie,
  GraviteMaladie,
  TYPE_MALADIE_LABELS,
  GRAVITE_MALADIE_LABELS,
} from '../types/sante';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  maladie?: Maladie;
  animalId?: string;
}

export default function MaladieFormModal({ visible, onClose, maladie, animalId }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);

  const isEditing = !!maladie;

  const [formData, setFormData] = useState<{
    animal_id: string;
    lot_id: string;
    type: TypeMaladie;
    nom_maladie: string;
    gravite: GraviteMaladie;
    date_debut: string;
    date_fin: string;
    symptomes: string;
    diagnostic: string;
    contagieux: boolean;
    nombre_animaux_affectes: string;
    nombre_deces: string;
    veterinaire: string;
    cout_traitement: string;
    gueri: boolean;
    notes: string;
  }>({
    animal_id: animalId || '',
    lot_id: '',
    type: 'autre',
    nom_maladie: '',
    gravite: 'moderee',
    date_debut: formatLocalDate(new Date().toISOString()),
    date_fin: '',
    symptomes: '',
    diagnostic: '',
    contagieux: false,
    nombre_animaux_affectes: '',
    nombre_deces: '',
    veterinaire: '',
    cout_traitement: '',
    gueri: false,
    notes: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'debut' | 'fin'>('debut');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (maladie) {
      setFormData({
        animal_id: maladie.animal_id || '',
        lot_id: maladie.lot_id || '',
        type: maladie.type,
        nom_maladie: maladie.nom_maladie,
        gravite: maladie.gravite,
        date_debut: maladie.date_debut,
        date_fin: maladie.date_fin || '',
        symptomes: maladie.symptomes,
        diagnostic: maladie.diagnostic || '',
        contagieux: maladie.contagieux,
        nombre_animaux_affectes: maladie.nombre_animaux_affectes?.toString() || '',
        nombre_deces: maladie.nombre_deces?.toString() || '',
        veterinaire: maladie.veterinaire || '',
        cout_traitement: maladie.cout_traitement?.toString() || '',
        gueri: maladie.gueri,
        notes: maladie.notes || '',
      });
    }
  }, [maladie]);

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = formatLocalDate(selectedDate.toISOString());
      if (datePickerField === 'debut') {
        setFormData({ ...formData, date_debut: dateString });
      } else {
        setFormData({ ...formData, date_fin: dateString });
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.nom_maladie) {
      setError('Veuillez entrer le nom de la maladie');
      return;
    }

    if (!formData.symptomes) {
      setError('Veuillez décrire les symptômes');
      return;
    }

    if (!formData.animal_id && !formData.lot_id) {
      setError('Veuillez sélectionner un animal ou un lot');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && maladie) {
        await dispatch(
          updateMaladie({
            id: maladie.id,
            updates: {
              animal_id: formData.animal_id || undefined,
              lot_id: formData.lot_id || undefined,
              type: formData.type,
              nom_maladie: formData.nom_maladie,
              gravite: formData.gravite,
              date_debut: formData.date_debut,
              date_fin: formData.date_fin || undefined,
              symptomes: formData.symptomes,
              diagnostic: formData.diagnostic || undefined,
              contagieux: formData.contagieux,
              nombre_animaux_affectes: formData.nombre_animaux_affectes
                ? parseInt(formData.nombre_animaux_affectes)
                : undefined,
              nombre_deces: formData.nombre_deces ? parseInt(formData.nombre_deces) : undefined,
              veterinaire: formData.veterinaire || undefined,
              cout_traitement: formData.cout_traitement
                ? parseFloat(formData.cout_traitement)
                : undefined,
              gueri: formData.gueri,
              notes: formData.notes || undefined,
            },
          })
        ).unwrap();
      } else {
        const input: CreateMaladieInput = {
          projet_id: projetActif!.id,
          animal_id: formData.animal_id || undefined,
          lot_id: formData.lot_id || undefined,
          type: formData.type,
          nom_maladie: formData.nom_maladie,
          gravite: formData.gravite,
          date_debut: formData.date_debut,
          date_fin: formData.date_fin || undefined,
          symptomes: formData.symptomes,
          diagnostic: formData.diagnostic || undefined,
          contagieux: formData.contagieux,
          nombre_animaux_affectes: formData.nombre_animaux_affectes
            ? parseInt(formData.nombre_animaux_affectes)
            : undefined,
          nombre_deces: formData.nombre_deces ? parseInt(formData.nombre_deces) : undefined,
          veterinaire: formData.veterinaire || undefined,
          cout_traitement: formData.cout_traitement
            ? parseFloat(formData.cout_traitement)
            : undefined,
          gueri: formData.gueri,
          notes: formData.notes || undefined,
        };

        await dispatch(createMaladie(input)).unwrap();
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const types: TypeMaladie[] = [
    'respiratoire',
    'digestive',
    'cutanee',
    'reproduction',
    'neurologique',
    'autre',
  ];

  const gravites: GraviteMaladie[] = ['faible', 'moderee', 'grave', 'critique'];

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la maladie' : 'Nouvelle maladie'}
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

        {/* Nom de la maladie */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Nom de la maladie *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.nom_maladie}
            onChangeText={(text) => setFormData({ ...formData, nom_maladie: text })}
            placeholder="Ex: Pneumonie, Diarrhée, etc."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Type *</Text>
          <View style={styles.optionsContainer}>
            {types.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  formData.type === type && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, type })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.type === type && {
                      color: colors.textOnPrimary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {TYPE_MALADIE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gravité */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gravité *</Text>
          <View style={styles.optionsContainer}>
            {gravites.map((gravite) => (
              <TouchableOpacity
                key={gravite}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  formData.gravite === gravite && {
                    backgroundColor:
                      gravite === 'critique'
                        ? colors.error
                        : gravite === 'grave'
                          ? colors.warning
                          : colors.primary,
                    borderColor:
                      gravite === 'critique'
                        ? colors.error
                        : gravite === 'grave'
                          ? colors.warning
                          : colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, gravite })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.gravite === gravite && {
                      color: '#fff',
                      fontWeight: '600',
                    },
                  ]}
                >
                  {GRAVITE_MALADIE_LABELS[gravite]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Symptômes */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Symptômes observés *</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.symptomes}
            onChangeText={(text) => setFormData({ ...formData, symptomes: text })}
            placeholder="Décrire les symptômes observés..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Date de début *</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              setDatePickerField('debut');
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {new Date(formData.date_debut).toLocaleDateString('fr-FR')}
            </Text>
          </TouchableOpacity>
          {showDatePicker && datePickerField === 'debut' && (
            <DateTimePicker
              value={parseLocalDate(formData.date_debut)}
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
        </View>

        {/* Contagieux */}
        <View style={[styles.section, styles.switchRow]}>
          <View style={styles.switchLabel}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
              Maladie contagieuse
            </Text>
          </View>
          <Switch
            value={formData.contagieux}
            onValueChange={(value) => setFormData({ ...formData, contagieux: value })}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={formData.contagieux ? colors.primary : colors.surface}
          />
        </View>

        {/* Guéri */}
        <View style={[styles.section, styles.switchRow]}>
          <View style={styles.switchLabel}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
              Animal guéri
            </Text>
          </View>
          <Switch
            value={formData.gueri}
            onValueChange={(value) => setFormData({ ...formData, gueri: value })}
            trackColor={{ false: colors.border, true: colors.success + '80' }}
            thumbColor={formData.gueri ? colors.success : colors.surface}
          />
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
