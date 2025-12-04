/**
 * Header du modal profil
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';

interface HeaderProps {
  viewMode: 'home' | 'profile' | 'settings' | 'mon-projet';
  onBack: () => void;
}

export default function Header({ viewMode, onBack }: HeaderProps) {
  const { colors } = useTheme();

  const getTitle = () => {
    switch (viewMode) {
      case 'profile':
        return 'Profil';
      case 'settings':
        return 'Paramètres';
      case 'mon-projet':
        return 'Mon projet';
      default:
        return 'Menu';
    }
  };

  const getIconName = () => {
    return viewMode === 'home' ? 'close' : 'arrow-back';
  };

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name={getIconName()} size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{getTitle()}</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
});

