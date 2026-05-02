/**
 * Widget des rendez-vous pour le dashboard vétérinaire
 * Affiche les demandes en attente et les rendez-vous à venir
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppointments } from '../../hooks/useAppointments';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';
import AppointmentDetailsModal from '../appointments/AppointmentDetailsModal';
import type { Appointment } from '../../types/appointment';

interface VetAppointmentsCardProps {
  onPress?: () => void;
}

export default function VetAppointmentsCard({ onPress }: VetAppointmentsCardProps) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { upcomingAppointments, appointments, loading, update, refresh } = useAppointments();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filtrer les rendez-vous en attente
  const pendingAppointments = appointments.filter((a) => a.status === 'pending');

  // Compter les rendez-vous par statut
  const stats = {
    pending: pendingAppointments.length,
    upcoming: upcomingAppointments.length,
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleAccept = async (appointment: Appointment) => {
    try {
      await update(appointment.id, { status: 'accepted' });
      await refresh();
      setShowDetailsModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  const handleReject = async (appointment: Appointment) => {
    try {
      await update(appointment.id, { status: 'rejected', vetResponse: 'Rendez-vous refusé' });
      await refresh();
      setShowDetailsModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  if (loading) {
    return (
      <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="medical-outline" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Rendez-vous</Text>
        </View>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement...
        </Text>
      </Card>
    );
  }

  return (
    <>
      <Card
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={onPress}
      >
        {/* En-tête */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="medical-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Rendez-vous</Text>
            {stats.upcoming > 0 && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {stats.upcoming} à venir
              </Text>
            )}
          </View>
          {stats.pending > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.warning }]}>
              <Text style={styles.badgeText}>{stats.pending}</Text>
            </View>
          )}
        </View>

        {/* Demandes en attente */}
        {pendingAppointments.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Demandes en attente ({pendingAppointments.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.appointmentsList}
              contentContainerStyle={styles.appointmentsListContent}
            >
              {pendingAppointments.slice(0, 3).map((appointment) => (
                <PendingAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  colors={colors}
                  onPress={() => handleAppointmentPress(appointment)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Rendez-vous à venir */}
        {upcomingAppointments.length > 0 ? (
          <View style={styles.upcomingSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Prochains rendez-vous
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.appointmentsList}
              contentContainerStyle={styles.appointmentsListContent}
            >
              {upcomingAppointments.slice(0, 3).map((appointment) => (
                <UpcomingAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  colors={colors}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {pendingAppointments.length === 0
                ? 'Aucun rendez-vous'
                : 'Aucun rendez-vous à venir'}
            </Text>
          </View>
        )}
      </Card>

      {/* Modal de détails */}
      {selectedAppointment && (
        <AppointmentDetailsModal
          visible={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onSuccess={refresh}
        />
      )}
    </>
  );
}

/**
 * Mini carte pour une demande en attente
 */
function PendingAppointmentCard({
  appointment,
  colors,
  onPress,
}: {
  appointment: Appointment;
  colors: any;
  onPress: () => void;
}) {
  const appointmentDate = new Date(appointment.appointmentDate);

  return (
    <TouchableOpacity
      style={[
        styles.miniCard,
        styles.pendingCard,
        {
          backgroundColor: colors.warning + '15',
          borderColor: colors.warning,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.miniCardHeader}>
        <Text style={[styles.miniCardDate, { color: colors.text }]}>
          {format(appointmentDate, 'd MMM', { locale: fr })}
        </Text>
        <Ionicons name="time-outline" size={16} color={colors.warning} />
      </View>
      <Text style={[styles.miniCardTime, { color: colors.textSecondary }]}>
        {format(appointmentDate, 'HH:mm', { locale: fr })}
      </Text>
      <Text style={[styles.miniCardProducer, { color: colors.text }]} numberOfLines={1}>
        {appointment.producerName || 'Producteur'}
      </Text>
      <Text style={[styles.miniCardReason, { color: colors.textSecondary }]} numberOfLines={2}>
        {appointment.reason}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Mini carte pour un rendez-vous à venir
 */
function UpcomingAppointmentCard({
  appointment,
  colors,
}: {
  appointment: Appointment;
  colors: any;
}) {
  const appointmentDate = new Date(appointment.appointmentDate);
  const isToday = format(appointmentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <View
      style={[
        styles.miniCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderLeftColor: isToday ? colors.primary : colors.border,
          borderLeftWidth: isToday ? 3 : 1,
        },
      ]}
    >
      <View style={styles.miniCardHeader}>
        <Text style={[styles.miniCardDate, { color: colors.text }]}>
          {format(appointmentDate, 'd MMM', { locale: fr })}
        </Text>
        {isToday && (
          <View style={[styles.todayBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.todayBadgeText}>Aujourd'hui</Text>
          </View>
        )}
      </View>
      <Text style={[styles.miniCardTime, { color: colors.textSecondary }]}>
        {format(appointmentDate, 'HH:mm', { locale: fr })}
      </Text>
      <Text style={[styles.miniCardProducer, { color: colors.text }]} numberOfLines={1}>
        {appointment.producerName || 'Producteur'}
      </Text>
    </View>
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
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  badgeText: {
    color: '#FFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  pendingSection: {
    marginBottom: SPACING.md,
  },
  upcomingSection: {
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
  },
  appointmentsList: {
    marginHorizontal: -SPACING.md,
  },
  appointmentsListContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  miniCard: {
    width: 160,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  pendingCard: {
    borderWidth: 2,
  },
  miniCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  miniCardDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  todayBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  todayBadgeText: {
    color: '#FFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  miniCardTime: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  miniCardProducer: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  miniCardReason: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
