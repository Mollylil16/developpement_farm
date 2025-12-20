/**
 * Vue principale des paramètres (liste des sous-sections)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES } from '../../constants/theme';

interface SettingsRootViewProps {
  onNavigateToTab: (
    tab: 'account' | 'security' | 'notifications' | 'preferences' | 'marketplace'
  ) => void;
}

export default function SettingsRootView({ onNavigateToTab }: SettingsRootViewProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Cartes des sous-sections */}
      <View style={styles.sectionContent}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => onNavigateToTab('account')}
        >
          <Ionicons name="lock-closed-outline" size={24} color={colors.primary} />
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.text }]}>🔐 Compte</Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
              Email, mot de passe, authentification
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => onNavigateToTab('security')}
        >
          <Ionicons name="shield-outline" size={24} color={colors.primary} />
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.text }]}>
              🛡️ Sécurité et confidentialité
            </Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
              Historique, appareils, 2FA
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => onNavigateToTab('notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.text }]}>🔔 Notifications</Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
              Push, email, SMS
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => onNavigateToTab('preferences')}
        >
          <Ionicons name="color-palette-outline" size={24} color={colors.primary} />
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.text }]}>🎨 Préférences</Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
              Langue, devise, unités
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => onNavigateToTab('marketplace')}
        >
          <Ionicons name="storefront-outline" size={24} color={colors.primary} />
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemTitle, { color: colors.text }]}>🏪 Marketplace</Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
              Conditions, notifications, affichage
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: SPACING.md,
  },
  sectionContent: {
    paddingHorizontal: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  menuItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  menuItemSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
});
