/**
 * Carte d'affichage d'un rendez-vous
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';
import type { Appointment } from '../../types/appointment';

interface AppointmentCardProps {
  appointment: Appointment;
  onPress?: () => void;
  showActions?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}

/**
 * Obtenir la couleur selon le statut
 */
const getStatusColor = (status: Appointment['status'], colors: any): string => {
  switch (status) {
    case 'pending':
      return colors.warning;
    case 'accepted':
      return colors.success;
    case 'rejected':
      return colors.error;
    case 'cancelled':
      return colors.textSecondary;
    case 'completed':
      return colors.primary;
    default:
      return colors.textSecondary;
  }
};

/**
 * Obtenir le label du statut
 */
const getStatusLabel = (status: Appointment['status']): string => {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'accepted':
      return 'Accepté';
    case 'rejected':
      return 'Refusé';
    case 'cancelled':
      return 'Annulé';
    case 'completed':
      return 'Terminé';
    default:
      return status;
  }
};

/**
 * Obtenir l'icône selon le statut
 */
const getStatusIcon = (status: Appointment['status']): keyof typeof Ionicons.glyphMap => {
  switch (status) {
    case 'pending':
      return 'time-outline';
    case 'accepted':
      return 'checkmark-circle-outline';
    case 'rejected':
      return 'close-circle-outline';
    case 'cancelled':
      return 'ban-outline';
    case 'completed':
      return 'checkmark-done-outline';
    default:
      return 'calendar-outline';
  }
};

export default function AppointmentCard({
  appointment,
  onPress,
  showActions = false,
  onAccept,
  onReject,
  onCancel,
}: AppointmentCardProps) {
  const { colors } = useTheme();
  const statusColor = getStatusColor(appointment.status, colors);
  const appointmentDate = new Date(appointment.appointmentDate);

  return (
    <Card
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
    >
      {/* En-tête avec statut */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="medical-outline" size={20} color={colors.primary} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              {appointment.vetName || 'Vétérinaire'} - {appointment.producerName || 'Producteur'}
            </Text>
            <View style={styles.statusContainer}>
              <Ionicons name={getStatusIcon(appointment.status)} size={14} color={statusColor} />
              <Text style={[styles.status, { color: statusColor }]}>
                {getStatusLabel(appointment.status)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Date et heure */}
      <View style={styles.dateContainer}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.dateText, { color: colors.text }]}>
          {format(appointmentDate, 'EEEE d MMMM yyyy', { locale: fr })}
        </Text>
      </View>
      <View style={styles.timeContainer}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.timeText, { color: colors.text }]}>
          {format(appointmentDate, 'HH:mm', { locale: fr })}
        </Text>
      </View>

      {/* Raison */}
      <View style={styles.reasonContainer}>
        <Text style={[styles.reasonLabel, { color: colors.textSecondary }]}>Raison :</Text>
        <Text style={[styles.reasonText, { color: colors.text }]}>{appointment.reason}</Text>
      </View>

      {/* Lieu */}
      {appointment.location && (
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            {appointment.location}
          </Text>
        </View>
      )}

      {/* Réponse du vétérinaire */}
      {appointment.vetResponse && (
        <View style={[styles.responseContainer, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.responseLabel, { color: colors.textSecondary }]}>
            Réponse du vétérinaire :
          </Text>
          <Text style={[styles.responseText, { color: colors.text }]}>
            {appointment.vetResponse}
          </Text>
        </View>
      )}

      {/* Actions (pour vétérinaire avec RDV en attente) */}
      {showActions && appointment.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: colors.success }]}
            onPress={onAccept}
          >
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Accepter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectButton, { backgroundColor: colors.error }]}
            onPress={onReject}
          >
            <Ionicons name="close" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Refuser</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bouton annuler (pour producteur ou vétérinaire) */}
      {onCancel && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={onCancel}
        >
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={[styles.cancelButtonText, { color: colors.error }]}>Annuler</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  status: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
  },
  reasonContainer: {
    marginBottom: SPACING.sm,
  },
  reasonLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  reasonText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  responseContainer: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  responseLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  responseText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
