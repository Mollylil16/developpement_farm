/**
 * Composant calendrier des planifications
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadPlanificationsParProjet } from '../store/slices/planificationSlice';
import { Planification, TypeTache } from '../types';
import { SPACING, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function PlanificationCalendarComponent() {
  const { colors } = useTheme();
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
      let dotColor = colors.primary;
      if (planification.statut === 'terminee') {
        dotColor = colors.success;
      } else if (planification.statut === 'annulee') {
        dotColor = colors.textSecondary;
      } else {
        // Couleur selon le type
        switch (planification.type) {
          case 'saillie':
            dotColor = colors.primary;
            break;
          case 'vaccination':
            dotColor = colors.warning;
            break;
          case 'sevrage':
            dotColor = colors.success;
            break;
          case 'veterinaire':
            dotColor = colors.error;
            break;
          default:
            dotColor = colors.textSecondary;
        }
      }
      
      marked[datePrevue].dots.push({
        color: dotColor,
        selectedDotColor: colors.background,
      });
    });
    
    return marked;
  }, [planifications, colors]);

  const getPlanificationsPourDate = (date: string): Planification[] => {
    return planifications.filter((p) => p.date_prevue.split('T')[0] === date);
  };

  const onDayPress = (day: DateData) => {
    // Peut être utilisé pour afficher les détails d'une journée
    const taches = getPlanificationsPourDate(day.dateString);
    console.log(`Tâches pour ${day.dateString}:`, taches.length);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Calendrier des planifications</Text>
      <View style={[styles.legend, { backgroundColor: colors.surface }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Saillie</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Vaccination</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Sevrage / Terminée</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Vétérinaire</Text>
        </View>
      </View>
      <Calendar
        current={new Date().toISOString().split('T')[0]}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={onDayPress}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.text,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: colors.background,
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.textSecondary,
          dotColor: colors.primary,
          selectedDotColor: colors.background,
          arrowColor: colors.primary,
          monthTextColor: colors.text,
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
    padding: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
    padding: SPACING.sm,
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
  },
  calendar: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});

