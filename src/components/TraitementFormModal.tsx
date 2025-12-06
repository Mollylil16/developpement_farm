/**
 * Modal de formulaire pour créer/modifier un traitement médical
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
import { createTraitement, updateTraitement } from '../store/slices/santeSlice';
import { selectAllMaladies } from '../store/selectors/santeSelectors';
import CustomModal from './CustomModal';
import {
  Traitement,
  CreateTraitementInput,
  TypeTraitement,
  VoieAdministration,
  TYPE_TRAITEMENT_LABELS,
  VOIE_ADMINISTRATION_LABELS,
} from '../types/sante';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  traitement?: Traitement;
  animalId?: string;
  maladieId?: string;
}

export default function TraitementFormModal({
  visible,
  onClose,
  traitement,
  animalId,
  maladieId,
}: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const maladies = useAppSelector(selectAllMaladies);

  const isEditing = !!traitement;

  const [formData, setFormData] = useState<{
    maladie_id: string;
    animal_id: string;
    lot_id: string;
    type: TypeTraitement;
    nom_medicament: string;
    voie_administration: VoieAdministration;
    dosage: string;
    frequence: string;
    date_debut: string;
    date_fin: string;
    duree_jours: string;
    temps_attente_jours: string;
    veterinaire: string;
    cout: string;
    termine: boolean;
    efficace: string;
    effets_secondaires: string;
    notes: string;
  }>({
    maladie_id: maladieId || '',
    animal_id: animalId || '',
    lot_id: '',
    type: 'autre',
    nom_medicament: '',
    voie_administration: 'orale',
    dosage: '',
    frequence: '',
    date_debut: formatLocalDate(new Date().toISOString()),
    date_fin: '',
    duree_jours: '',
    temps_attente_jours: '',
    veterinaire: '',
    cout: '',
    termine: false,
    efficace: '',
    effets_secondaires: '',
    notes: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'debut' | 'fin'>('debut');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (traitement) {
      setFormData({
        maladie_id: traitement.maladie_id || '',
        animal_id: traitement.animal_id || '',
        lot_id: traitement.lot_id || '',
        type: traitement.type,
        nom_medicament: traitement.nom_medicament,
        voie_administration: traitement.voie_administration,
        dosage: traitement.dosage || '',
        frequence: traitement.frequence || '',
        date_debut: traitement.date_debut,
        date_fin: traitement.date_fin || '',
        duree_jours: traitement.duree_jours?.toString() || '',
        temps_attente_jours: traitement.temps_attente_jours?.toString() || '',
        veterinaire: traitement.veterinaire || '',
        cout: traitement.cout?.toString() || '',
        termine: traitement.termine,
        efficace: traitement.efficace?.toString() || '',
        effets_secondaires: traitement.effets_secondaires || '',
        notes: traitement.notes || '',
      });
    }
  }, [traitement]);

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
    if (!formData.nom_medicament) {
      setError('Veuillez entrer le nom du médicament');
      return;
    }

    if (!formData.dosage) {
      setError('Veuillez entrer le dosage');
      return;
    }

    if (!formData.frequence) {
      setError('Veuillez entrer la fréquence');
      return;
    }

    if (!formData.animal_id && !formData.lot_id) {
      setError('Veuillez sélectionner un animal ou un lot');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && traitement) {
        await dispatch(
          updateTraitement({
            id: traitement.id,
            updates: {
              maladie_id: formData.maladie_id || undefined,
              animal_id: formData.animal_id || undefined,
              lot_id: formData.lot_id || undefined,
              type: formData.type,
              nom_medicament: formData.nom_medicament,
              voie_administration: formData.voie_administration,
              dosage: formData.dosage,
              frequence: formData.frequence,
              date_debut: formData.date_debut,
              date_fin: formData.date_fin || undefined,
              duree_jours: formData.duree_jours ? parseInt(formData.duree_jours) : undefined,
              temps_attente_jours: formData.temps_attente_jours
                ? parseInt(formData.temps_attente_jours)
                : undefined,
              veterinaire: formData.veterinaire || undefined,
              cout: formData.cout ? parseFloat(formData.cout) : undefined,
              termine: formData.termine,
              efficace: formData.efficace ? (parseInt(formData.efficace) >= 4) : undefined,
              effets_secondaires: formData.effets_secondaires || undefined,
              notes: formData.notes || undefined,
            },
          })
        ).unwrap();
      } else {
        const input: CreateTraitementInput = {
          projet_id: projetActif!.id,
          maladie_id: formData.maladie_id || undefined,
          animal_id: formData.animal_id || undefined,
          lot_id: formData.lot_id || undefined,
          type: formData.type,
          nom_medicament: formData.nom_medicament,
          voie_administration: formData.voie_administration,
          dosage: formData.dosage,
          frequence: formData.frequence,
          date_debut: formData.date_debut,
          date_fin: formData.date_fin || undefined,
          duree_jours: formData.duree_jours ? parseInt(formData.duree_jours) : undefined,
          temps_attente_jours: formData.temps_attente_jours
            ? parseInt(formData.temps_attente_jours)
            : undefined,
          veterinaire: formData.veterinaire || undefined,
          cout: formData.cout ? parseFloat(formData.cout) : undefined,
          termine: formData.termine,
          efficace: formData.efficace ? (parseInt(formData.efficace) >= 4) : undefined,
          effets_secondaires: formData.effets_secondaires || undefined,
          notes: formData.notes || undefined,
        };

        await dispatch(createTraitement(input)).unwrap();
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const types: TypeTraitement[] = [
    'antibiotique',
    'antiparasitaire',
    'anti_inflammatoire',
    'vitamine',
    'vaccin',
    'autre',
  ];

  const voies: VoieAdministration[] = ['orale', 'injectable', 'topique', 'alimentaire'];

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier le traitement' : 'Nouveau traitement'}
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

        {/* Nom du médicament */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Nom du médicament *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.nom_medicament}
            onChangeText={(text) => setFormData({ ...formData, nom_medicament: text })}
            placeholder="Ex: Amoxicilline, Ivermectine, etc."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Type de traitement *</Text>
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
                  {TYPE_TRAITEMENT_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Voie d'administration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Voie d'administration *</Text>
          <View style={styles.optionsContainer}>
            {voies.map((voie) => (
              <TouchableOpacity
                key={voie}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  formData.voie_administration === voie && {
                    backgroundColor: colors.info,
                    borderColor: colors.info,
                  },
                ]}
                onPress={() => setFormData({ ...formData, voie_administration: voie })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.voie_administration === voie && {
                      color: '#fff',
                      fontWeight: '600',
                    },
                  ]}
                >
                  {VOIE_ADMINISTRATION_LABELS[voie]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dosage */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Dosage *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.dosage}
            onChangeText={(text) => setFormData({ ...formData, dosage: text })}
            placeholder="Ex: 10mg/kg, 2ml, etc."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Fréquence */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Fréquence *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.frequence}
            onChangeText={(text) => setFormData({ ...formData, frequence: text })}
            placeholder="Ex: 2 fois/jour, 1 fois/semaine"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Date de début */}
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

        {/* Durée */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Durée du traitement (jours)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.duree_jours}
            onChangeText={(text) => setFormData({ ...formData, duree_jours: text })}
            placeholder="Ex: 7, 14, 30"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />
        </View>

        {/* Temps d'attente avant abattage */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Temps d'attente avant abattage (jours)
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={formData.temps_attente_jours}
            onChangeText={(text) => setFormData({ ...formData, temps_attente_jours: text })}
            placeholder="Ex: 15, 30, 60"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
          />
          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            ⚠️ Important pour la sécurité alimentaire
          </Text>
        </View>

        {/* Vétérinaire */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Vétérinaire prescripteur</Text>
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

        {/* Terminé */}
        <View style={[styles.section, styles.switchRow]}>
          <View style={styles.switchLabel}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
              Traitement terminé
            </Text>
          </View>
          <Switch
            value={formData.termine}
            onValueChange={(value) => setFormData({ ...formData, termine: value })}
            trackColor={{ false: colors.border, true: colors.success + '80' }}
            thumbColor={formData.termine ? colors.success : colors.surface}
          />
        </View>

        {/* Efficacité (si terminé) */}
        {formData.termine && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Efficacité du traitement (1-5)
            </Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    {
                      backgroundColor:
                        formData.efficace === rating.toString() ? colors.success : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, efficace: rating.toString() })}
                >
                  <Text
                    style={[
                      styles.ratingText,
                      {
                        color: formData.efficace === rating.toString() ? '#fff' : colors.text,
                      },
                    ]}
                  >
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              1 = Inefficace | 5 = Très efficace
            </Text>
          </View>
        )}

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
  helpText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
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
  ratingContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
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
