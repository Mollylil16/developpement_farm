/**
 * Composant DatePickerField standardisé pour toute l'application
 * Utilise @react-native-community/datetimepicker avec un style cohérent
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DatePickerFieldProps {
  label: string;
  value: string; // Format ISO: YYYY-MM-DD
  onChange: (date: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

/**
 * Parse une date string au format YYYY-MM-DD en objet Date
 */
function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Essayer de parser avec parseISO
  const parsed = parseISO(dateStr);
  if (isValid(parsed)) return parsed;
  
  // Fallback: créer une date à partir du string
  const date = new Date(dateStr);
  return isValid(date) ? date : new Date();
}

/**
 * Formate une date pour l'affichage localisé
 */
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseDateString(dateStr);
  try {
    return format(date, 'dd MMMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

export default function DatePickerField({
  label,
  value,
  onChange,
  error,
  required,
  placeholder = 'Sélectionner une date',
  minimumDate,
  maximumDate,
  disabled = false,
}: DatePickerFieldProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Sur Android, fermer le picker après sélection
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      // Format ISO pour stockage
      const isoDate = format(selectedDate, 'yyyy-MM-dd');
      onChange(isoDate);
    }
    
    // Sur iOS, on gère la fermeture autrement
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setShowPicker(false);
    }
    
    setIsFocused(false);
  };

  const handlePress = () => {
    if (disabled) return;
    setIsFocused(true);
    setShowPicker(true);
  };

  const displayValue = value ? formatDisplayDate(value) : '';
  const currentDate = value ? parseDateString(value) : new Date();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={disabled ? 1 : 0.7}
        style={[
          styles.inputContainer,
          {
            borderColor: error 
              ? colors.error 
              : isFocused 
                ? colors.primary 
                : colors.border,
            backgroundColor: disabled ? colors.surface + '80' : colors.surface,
            ...(isFocused && !disabled && colors.shadow.small),
          },
        ]}
      >
        <View style={styles.inputContent}>
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color={disabled ? colors.textTertiary : colors.primary} 
            style={styles.icon}
          />
          <Text
            style={[
              styles.inputText,
              {
                color: displayValue 
                  ? (disabled ? colors.textTertiary : colors.text)
                  : colors.textTertiary,
              },
            ]}
          >
            {displayValue || placeholder}
          </Text>
          <Ionicons 
            name="chevron-down" 
            size={16} 
            color={colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      )}

      {showPicker && (
        <>
          {Platform.OS === 'ios' && (
            <View style={[styles.iosPickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.iosPickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.iosPickerButton, { color: colors.textSecondary }]}>
                    Annuler
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.iosPickerTitle, { color: colors.text }]}>
                  {label}
                </Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.iosPickerButton, { color: colors.primary }]}>
                    OK
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                locale="fr-FR"
                textColor={colors.text}
              />
            </View>
          )}
          
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={currentDate}
              mode="date"
              display="default"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    minHeight: 44,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  inputText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  // iOS specific styles
  iosPickerContainer: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  iosPickerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  iosPickerButton: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
});
