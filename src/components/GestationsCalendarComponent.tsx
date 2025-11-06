/**
 * Composant calendrier des gestations
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useAppSelector } from '../store/hooks';
import { Gestation } from '../types';
import { doitGenererAlerte } from '../types/reproduction';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

export default function GestationsCalendarComponent() {
  const { gestations } = useAppSelector((state) => state.reproduction);

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
        color: isAlerte ? COLORS.error : COLORS.primary,
        selectedDotColor: COLORS.background,
      });
      
      // Marquer la date de sautage
      if (!marked[dateSautage]) {
        marked[dateSautage] = {
          dots: [],
          selected: false,
        };
      }
      marked[dateSautage].dots.push({
        color: COLORS.secondary,
        selectedDotColor: COLORS.background,
      });
    });
    
    return marked;
  }, [gestations]);

  const onDayPress = (day: DateData) => {
    // Peut être utilisé pour afficher les détails d'une journée
    console.log('Jour sélectionné:', day);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendrier des gestations</Text>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Mise bas prévue</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
          <Text style={styles.legendText}>Alerte (≤ 7 jours)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
          <Text style={styles.legendText}>Date de sautage</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
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
    color: COLORS.text,
  },
  calendar: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});

