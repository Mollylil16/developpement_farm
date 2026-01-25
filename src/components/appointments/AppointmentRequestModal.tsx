/**
 * Modal de demande de rendez-vous avec un vétérinaire
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomModal from '../CustomModal';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { Veterinarian } from '../../types/veterinarian';
import { useAppointments } from '../../hooks/useAppointments';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '../../utils/logger';

interface AppointmentRequestModalProps {
  visible: boolean;
  onClose: () => void;
  vet: Veterinarian;
  onSuccess?: () => void;
}

export default function AppointmentRequestModal({
  visible,
  onClose,
  vet,
  onSuccess,
}: AppointmentRequestModalProps) {
  const { colors } = useTheme();
  const { create, loading } = useAppointments();

  // États du formulaire
  const [appointmentDate, setAppointmentDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Demain par défaut
  const [appointmentTime, setAppointmentTime] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000)); // 9h par défaut
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');

  /**
   * Combiner date et heure en un seul objet Date
   */
  const getCombinedDateTime = (): Date => {
    const combined = new Date(appointmentDate);
    combined.setHours(appointmentTime.getHours());
    combined.setMinutes(appointmentTime.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    return combined;
  };

  /**
   * Valider le formulaire
   */
  const validateForm = (): boolean => {
    if (!reason.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer la raison du rendez-vous');
      return false;
    }

    if (reason.trim().length < 10) {
      Alert.alert('Erreur', 'Veuillez donner plus de détails sur la raison du rendez-vous (minimum 10 caractères)');
      return false;
    }

    const combinedDateTime = getCombinedDateTime();
    const now = new Date();
    if (combinedDateTime <= now) {
      Alert.alert('Erreur', 'La date et l\'heure du rendez-vous doivent être dans le futur');
      return false;
    }

    return true;
  };

  /**
   * Soumettre la demande de rendez-vous
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const combinedDateTime = getCombinedDateTime();
      await create({
        vetId: vet.id,
        appointmentDate: combinedDateTime.toISOString(),
        reason: reason.trim(),
        location: location.trim() || undefined,
      });

      Alert.alert(
        'Demande envoyée',
        `Votre demande de rendez-vous avec Dr. ${vet.firstName} ${vet.lastName} a été envoyée. Vous recevrez une notification lorsqu'il répondra.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Réinitialiser le formulaire
              setReason('');
              setLocation('');
              setAppointmentDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
              setAppointmentTime(new Date(Date.now() + 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000));
              onClose();
              onSuccess?.();
            },
          },
        ],
      );
    } catch (error: any) {
      logger.error('Erreur lors de la création du rendez-vous:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Impossible d\'envoyer la demande de rendez-vous. Veuillez réessayer.',
      );
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={`Demander un rendez-vous`}
      showButtons={false}
      scrollEnabled={true}
    >
      <View style={styles.contentWrapper}>
            {/* Informations vétérinaire */}
            <View style={[styles.vetInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.vetInfoHeader}>
                <Ionicons name="medical" size={24} color={colors.primary} />
                <View style={styles.vetInfoText}>
                  <Text style={[styles.vetName, { color: colors.text }]}>
                    Dr. {vet.firstName} {vet.lastName}
                  </Text>
                  {vet.city && (
                    <Text style={[styles.vetLocation, { color: colors.textSecondary }]}>
                      📍 {vet.city}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Date du rendez-vous */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>
                Date du rendez-vous <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {format(appointmentDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={appointmentDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setAppointmentDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>

            {/* Heure du rendez-vous */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>
                Heure du rendez-vous <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {format(appointmentTime, 'HH:mm', { locale: fr })}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={appointmentTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour={true}
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (selectedTime) {
                      setAppointmentTime(selectedTime);
                    }
                  }}
                />
              )}
            </View>

            {/* Raison du rendez-vous */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>
                Raison du rendez-vous <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Ex: Vaccination des porcelets - 50 sujets à vacciner"
                placeholderTextColor={colors.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                {reason.length}/500 caractères
              </Text>
            </View>

            {/* Lieu d'intervention */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>Lieu d'intervention (optionnel)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Ex: Ferme de Yopougon, Abidjan"
                placeholderTextColor={colors.textSecondary}
                value={location}
                onChangeText={setLocation}
                maxLength={200}
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                {location.length}/200 caractères
              </Text>
            </View>

            {/* Boutons d'action - À la fin du contenu scrollable */}
            <View style={[styles.actionsContainer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  { 
                    backgroundColor: loading || !reason.trim() ? colors.textSecondary : colors.primary,
                    opacity: loading || !reason.trim() ? 0.6 : 1,
                  }
                ]}
                onPress={handleSubmit}
                disabled={loading || !reason.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFF" />
                    <Text style={styles.submitButtonText}>Envoyer la demande</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    paddingBottom: SPACING.xl,
  },
  vetInfoCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  vetInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  vetInfoText: {
    flex: 1,
  },
  vetName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  vetLocation: {
    fontSize: FONT_SIZES.sm,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  dateTimeText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
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
    minHeight: 100,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
    borderTopWidth: 1,
    paddingTop: SPACING.md,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  submitButton: {
    flex: 2,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});
