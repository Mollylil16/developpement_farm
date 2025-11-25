/**
 * Composant champ de formulaire moderne avec états de focus
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, TRANSITIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export default function FormField({
  label,
  error,
  required,
  style,
  ...textInputProps
}: FormFieldProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: error ? colors.error : isFocused ? colors.primary : colors.border,
            backgroundColor: colors.surface,
            ...(isFocused && colors.shadow.small),
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }, style]}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...textInputProps}
        />
      </View>
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
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
  input: {
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    minHeight: 44,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
