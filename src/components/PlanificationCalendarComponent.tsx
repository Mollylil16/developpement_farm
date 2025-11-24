/**
 * Composant calendrier des planifications
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadPlanificationsParProjet } from '../store/slices/planificationSlice';
import { Planification, TypeTache } from '../types';
import { SPACING, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { format, addMonths, subMonths, parseISO, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PlanificationCalendarComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { planifications } = useAppSelector((state) => state.planification);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const onMonthChange = (month: any) => {
    const newDate = new Date(month.year, month.month - 1, 1);
    setCurrentMonth(newDate);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Trouver le prochain événement futur (planification à faire)
  const prochainEvenement = useMemo(() => {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    const evenementsFuturs = planifications
      .filter((p) => p.statut === 'a_faire' || p.statut === 'en_cours')
      .map((p) => ({
        date: parseISO(p.date_prevue),
        type: 'planification',
        planification: p,
      }))
      .filter((e) => isAfter(e.date, aujourdhui) || e.date.getTime() === aujourdhui.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return evenementsFuturs[0] || null;
  }, [planifications]);

  const goToProchainEvenement = () => {
    if (prochainEvenement) {
      setCurrentMonth(prochainEvenement.date);
    }
  };

  const currentMonthString = format(currentMonth, 'yyyy-MM-dd');

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
      <View style={[styles.calendarHeader, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={[
            styles.navButton,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.monthContainer}>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={goToToday}
              style={[styles.todayButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.todayButtonText, { color: colors.textOnPrimary }]}>
                Aujourd'hui
              </Text>
            </TouchableOpacity>
            {prochainEvenement && (
              <TouchableOpacity
                onPress={goToProchainEvenement}
                style={[styles.eventButton, { backgroundColor: colors.secondary }]}
              >
                <Text style={[styles.eventButtonText, { color: colors.textOnPrimary }]}>
                  Prochain événement
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={[
            styles.navButton,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>›</Text>
        </TouchableOpacity>
      </View>
      <Calendar
        current={currentMonthString}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={onDayPress}
        onMonthChange={onMonthChange}
        enableSwipeMonths={true}
        hideArrows={true}
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
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  monthContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.md,
  },
  monthText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
    textTransform: 'capitalize',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  todayButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
  },
  todayButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  eventButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
  },
  eventButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  calendar: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
