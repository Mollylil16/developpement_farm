/**
 * Modal de détails d'un rendez-vous pour le vétérinaire
 * Permet d'accepter ou refuser une demande
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CustomModal from '../CustomModal';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { useAppointments } from '../../hooks/useAppointments';
import type { Appointment } from '../../types/appointment';
import { logger } from '../../utils/logger';

interface AppointmentDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess?: () => void;
}

export default function AppointmentDetailsModal({
  visible,
  onClose,
  appointment,
  onSuccess,
}: AppointmentDetailsModalProps) {
  const { colors } = useTheme();
  const { update, loading } = useAppointments();
  const [vetResponse, setVetResponse] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  if (!appointment) {
    return null;
  }

  const appointmentDate = new Date(appointment.appointmentDate);

  /**
   * Accepter le rendez-vous
   */
  const handleAccept = async () => {
    if (appointment.status !== 'pending') {
      Alert.alert('Erreur', 'Ce rendez-vous a déjà été traité');
      return;
    }

    setActionLoading(true);
    try {
      await update(appointment.id, {
        status: 'accepted',
        vetResponse: vetResponse.trim() || undefined,
      });

      Alert.alert('Rendez-vous accepté', 'Le producteur a été notifié de votre acceptation.', [
        {
          text: 'OK',
          onPress: () => {
            setVetResponse('');
            onClose();
            onSuccess?.();
          },
        },
      ]);
    } catch (error: any) {
      logger.error('Erreur lors de l\'acceptation du rendez-vous:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'accepter le rendez-vous');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Refuser le rendez-vous
   */
  const handleReject = async () => {
    if (appointment.status !== 'pending') {
      Alert.alert('Erreur', 'Ce rendez-vous a déjà été traité');
      return;
    }

    if (!vetResponse.trim()) {
      Alert.alert(
        'Message requis',
        'Veuillez indiquer la raison de votre refus pour informer le producteur.',
      );
      return;
    }

    setActionLoading(true);
    try {
      await update(appointment.id, {
        status: 'rejected',
        vetResponse: vetResponse.trim(),
      });

      Alert.alert('Rendez-vous refusé', 'Le producteur a été notifié de votre refus.', [
        {
          text: 'OK',
          onPress: () => {
            setVetResponse('');
            onClose();
            onSuccess?.();
          },
        },
      ]);
    } catch (error: any) {
      logger.error('Erreur lors du refus du rendez-vous:', error);
      Alert.alert('Erreur', error.message || 'Impossible de refuser le rendez-vous');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="Détails du rendez-vous"
      showButtons={false}
      scrollEnabled={true}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Informations producteur */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="person-outline" size={24} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Producteur</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {appointment.producerName || 'Producteur'}
              </Text>
            </View>
          </View>
        </View>

        {/* Date et heure */}
        <View style={styles.section}>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <View style={styles.dateTimeText}>
                <Text style={[styles.dateTimeLabel, { color: colors.textSecondary }]}>Date</Text>
                <Text style={[styles.dateTimeValue, { color: colors.text }]}>
                  {format(appointmentDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </Text>
              </View>
            </View>
            <View style={styles.dateTimeItem}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <View style={styles.dateTimeText}>
                <Text style={[styles.dateTimeLabel, { color: colors.textSecondary }]}>Heure</Text>
                <Text style={[styles.dateTimeValue, { color: colors.text }]}>
                  {format(appointmentDate, 'HH:mm', { locale: fr })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Raison */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Raison du rendez-vous</Text>
          <View style={[styles.reasonBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reasonText, { color: colors.text }]}>{appointment.reason}</Text>
          </View>
        </View>

        {/* Lieu */}
        {appointment.location && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Lieu d'intervention</Text>
            <View style={[styles.locationBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.locationText, { color: colors.text }]}>
                {appointment.location}
              </Text>
            </View>
          </View>
        )}

        {/* Réponse du vétérinaire (si déjà répondu) */}
        {appointment.status !== 'pending' && appointment.vetResponse && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Votre réponse</Text>
            <View style={[styles.responseBox, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.responseText, { color: colors.text }]}>
                {appointment.vetResponse}
              </Text>
            </View>
          </View>
        )}

        {/* Formulaire de réponse (si en attente) */}
        {appointment.status === 'pending' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Votre réponse (optionnel)
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
              placeholder="Ex: Je serai disponible à cette date. Merci de confirmer."
              placeholderTextColor={colors.textSecondary}
              value={vetResponse}
              onChangeText={setVetResponse}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              {vetResponse.length}/500 caractères
            </Text>
          </View>
        )}

        {/* Actions (si en attente) */}
        {appointment.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.rejectButton, { backgroundColor: colors.error }]}
              onPress={handleReject}
              disabled={actionLoading || loading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="close" size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>Refuser</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.success }]}
              onPress={handleAccept}
              disabled={actionLoading || loading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>Accepter</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bouton fermer (si déjà traité) */}
        {appointment.status !== 'pending' && (
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: colors.text }]}>Fermer</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 600,
  },
  infoCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  dateTimeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'transparent',
  },
  dateTimeText: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  dateTimeValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  reasonBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  reasonText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  locationText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
  },
  responseBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  responseText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  textArea: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    fontSize: FONT_SIZES.md,
    minHeight: 80,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  closeButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  closeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
