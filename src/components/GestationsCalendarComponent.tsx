/**
 * Composant calendrier des gestations
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useAppSelector } from '../store/hooks';
import { Gestation } from '../types';
import { doitGenererAlerte } from '../types/reproduction';
import { SPACING, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { format, addMonths, subMonths, parseISO, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GestationsCalendarComponent() {
  const { colors } = useTheme();
  const { gestations } = useAppSelector((state) => state.reproduction);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Préparer les dates marquées pour le calendrier
  const markedDates = useMemo(() => {
    const marked: any = {};
    
    gestations.forEach((gestation) => {
      const dateMiseBas = gestation.date_mise_bas_prevue.split('T')[0];
      const dateSautage = gestation.date_sautage.split('T')[0];
      
      // Marquer la date de mise bas prévue
      if (!marked[dateMiseBas]) {
        marked[dateMiseBas] = {
          dots: [],
          selected: false,
        };
      }
      
      const isAlerte = doitGenererAlerte(gestation.date_mise_bas_prevue);
      marked[dateMiseBas].dots.push({
        color: isAlerte ? colors.error : colors.primary,
        selectedDotColor: colors.background,
      });
      
      // Marquer la date de sautage
      if (!marked[dateSautage]) {
        marked[dateSautage] = {
          dots: [],
          selected: false,
        };
      }
      marked[dateSautage].dots.push({
        color: colors.secondary,
        selectedDotColor: colors.background,
      });
    });
    
    return marked;
  }, [gestations, colors]);

  const onDayPress = (day: DateData) => {
    // Peut être utilisé pour afficher les détails d'une journée
    console.log('Jour sélectionné:', day);
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

  // Trouver le prochain événement futur (mise bas prévue)
  const prochainEvenement = useMemo(() => {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const evenementsFuturs = gestations
      .filter((g) => g.statut === 'en_cours')
      .map((g) => ({
        date: parseISO(g.date_mise_bas_prevue),
        type: 'mise_bas',
        gestation: g,
      }))
      .filter((e) => isAfter(e.date, aujourdhui) || e.date.getTime() === aujourdhui.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return evenementsFuturs[0] || null;
  }, [gestations]);

  const goToProchainEvenement = () => {
    if (prochainEvenement) {
      setCurrentMonth(prochainEvenement.date);
    }
  };

  const currentMonthString = format(currentMonth, 'yyyy-MM-dd');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Calendrier des gestations</Text>
      <View style={[styles.legend, { backgroundColor: colors.surface }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Mise bas prévue</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Alerte (≤ 7 jours)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.secondary }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Date de sautage</Text>
        </View>
      </View>
      <View style={[styles.calendarHeader, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={[styles.navButton, { backgroundColor: colors.background, borderColor: colors.border }]}
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
              <Text style={[styles.todayButtonText, { color: colors.textOnPrimary }]}>Aujourd'hui</Text>
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
          style={[styles.navButton, { backgroundColor: colors.background, borderColor: colors.border }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
  },
  calendar: {
    borderRadius: 8,
    overflow: 'hidden',
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
});

