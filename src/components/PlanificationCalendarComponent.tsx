/**
 * Composant calendrier des planifications
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadPlanificationsParProjet } from '../store/slices/planificationSlice';
import { Planification, TypeTache } from '../types';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

export default function PlanificationCalendarComponent() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { planifications } = useAppSelector((state) => state.planification);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadPlanificationsParProjet(projetActif.id));
    }
  }, [dispatch, projetActif]);

  // Préparer les dates marquées pour le calendrier
  const markedDates = useMemo(() => {
    const marked: any = {};
    
    planifications.forEach((planification) => {
      const datePrevue = planification.date_prevue.split('T')[0];
      
      if (!marked[datePrevue]) {
        marked[datePrevue] = {
          dots: [],
          selected: false,
        };
      }
      
      // Couleur selon le type et le statut
      let dotColor = COLORS.primary;
      if (planification.statut === 'terminee') {
        dotColor = COLORS.success;
      } else if (planification.statut === 'annulee') {
        dotColor = COLORS.textSecondary;
      } else {
        // Couleur selon le type
        switch (planification.type) {
          case 'saillie':
            dotColor = COLORS.primary;
            break;
          case 'vaccination':
            dotColor = COLORS.warning;
            break;
          case 'sevrage':
            dotColor = COLORS.success;
            break;
          case 'veterinaire':
            dotColor = COLORS.error;
            break;
          default:
            dotColor = COLORS.textSecondary;
        }
      }
      
      marked[datePrevue].dots.push({
        color: dotColor,
        selectedDotColor: COLORS.background,
      });
    });
    
    return marked;
  }, [planifications]);

  const getPlanificationsPourDate = (date: string): Planification[] => {
    return planifications.filter((p) => p.date_prevue.split('T')[0] === date);
  };

  const onDayPress = (day: DateData) => {
    // Peut être utilisé pour afficher les détails d'une journée
    const taches = getPlanificationsPourDate(day.dateString);
    console.log(`Tâches pour ${day.dateString}:`, taches.length);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Calendrier des planifications</Text>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Saillie</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>Vaccination</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendText}>Sevrage / Terminée</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
          <Text style={styles.legendText}>Vétérinaire</Text>
        </View>
      </View>
      <Calendar
        current={new Date().toISOString().split('T')[0]}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={onDayPress}
        theme={{
          backgroundColor: COLORS.background,
          calendarBackground: COLORS.background,
          textSectionTitleColor: COLORS.text,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: COLORS.background,
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.text,
          textDisabledColor: COLORS.textSecondary,
          dotColor: COLORS.primary,
          selectedDotColor: COLORS.background,
          arrowColor: COLORS.primary,
          monthTextColor: COLORS.text,
          textDayFontWeight: '600',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: FONT_SIZES.md,
          textMonthFontSize: FONT_SIZES.lg,
          textDayHeaderFontSize: FONT_SIZES.sm,
        }}
        style={styles.calendar}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.xs,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
  },
  calendar: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});

