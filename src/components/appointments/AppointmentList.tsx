/**
 * Liste des rendez-vous
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES } from '../../constants/theme';
import AppointmentCard from './AppointmentCard';
import EmptyState from '../EmptyState';
import type { Appointment } from '../../types/appointment';

interface AppointmentListProps {
  appointments: Appointment[];
  loading?: boolean;
  onAppointmentPress?: (appointment: Appointment) => void;
  onAccept?: (appointment: Appointment) => void;
  onReject?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  showActions?: boolean; // Afficher les boutons accepter/refuser (pour vétérinaire)
  emptyMessage?: string;
}

export default function AppointmentList({
  appointments,
  loading = false,
  onAppointmentPress,
  onAccept,
  onReject,
  onCancel,
  showActions = false,
  emptyMessage = 'Aucun rendez-vous',
}: AppointmentListProps) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement des rendez-vous...
        </Text>
      </View>
    );
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title={emptyMessage}
        message="Vous n'avez aucun rendez-vous pour le moment"
      />
    );
  }

  return (
    <FlatList
      data={appointments}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <AppointmentCard
          appointment={item}
          onPress={() => onAppointmentPress?.(item)}
          showActions={showActions}
          onAccept={() => onAccept?.(item)}
          onReject={() => onReject?.(item)}
          onCancel={() => onCancel?.(item)}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
  },
});
