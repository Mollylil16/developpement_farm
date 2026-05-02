/**
 * Widget des rendez-vous pour le dashboard producteur
 * Affiche les rendez-vous à venir et permet d'accéder à la liste complète
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppointments } from '../../hooks/useAppointments';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';
import { SCREENS } from '../../navigation/types';
import type { Appointment } from '../../types/appointment';

interface ProducerAppointmentsCardProps {
  onPress?: () => void;
}

export default function ProducerAppointmentsCard({ onPress }: ProducerAppointmentsCardProps) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { upcomingAppointments, appointments, loading } = useAppointments();

  // Compter les rendez-vous par statut
  const stats = {
    pending: appointments.filter((a) => a.status === 'pending').length,
    accepted: appointments.filter((a) => a.status === 'accepted').length,
    upcoming: upcomingAppointments.length,
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigation vers un écran de liste des RDV (à créer si nécessaire)
      // navigation.navigate(SCREENS.APPOINTMENTS);
    }
  };

  if (loading) {
    return (
      <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Mes rendez-vous</Text>
        </View>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement...
        </Text>
      </Card>
    );
  }

  return (
    <Card
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Mes rendez-vous</Text>
          {stats.upcoming > 0 && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {stats.upcoming} à venir
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handlePress}>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      {(stats.pending > 0 || stats.accepted > 0) && (
        <View style={styles.statsContainer}>
          {stats.pending > 0 && (
            <View style={[styles.statBadge, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time-outline" size={14} color={colors.warning} />
              <Text style={[styles.statText, { color: colors.warning }]}>
                {stats.pending} en attente
              </Text>
            </View>
          )}
          {stats.accepted > 0 && (
            <View style={[styles.statBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={[styles.statText, { color: colors.success }]}>
                {stats.accepted} accepté{stats.accepted > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Liste des prochains rendez-vous */}
      {upcomingAppointments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.appointmentsList}
          contentContainerStyle={styles.appointmentsListContent}
        >
          {upcomingAppointments.slice(0, 3).map((appointment) => (
            <AppointmentMiniCard
              key={appointment.id}
              appointment={appointment}
              colors={colors}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun rendez-vous à venir
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Demandez un rendez-vous à un vétérinaire
          </Text>
        </View>
      )}
    </Card>
  );
}

/**
 * Mini carte pour afficher un rendez-vous dans la liste horizontale
 */
function AppointmentMiniCard({
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
      <Text style={[styles.miniCardVet, { color: colors.text }]} numberOfLines={1}>
        {appointment.vetName || 'Vétérinaire'}
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
  loadingText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  appointmentsList: {
    marginHorizontal: -SPACING.md,
  },
  appointmentsListContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  miniCard: {
    width: 140,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
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
  miniCardVet: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
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
  emptySubtext: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
});
