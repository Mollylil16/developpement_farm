/**
 * Vue détaillée - Préférences
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import ThemeSelector from '../../ThemeSelector';

interface SettingsPreferencesViewProps {
  onBack: () => void;
}

export default function SettingsPreferencesView({ onBack }: SettingsPreferencesViewProps) {
  const { colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleChangeLanguage = async (lang: 'fr' | 'en') => {
    try {
      await setLanguage(lang);
      Alert.alert(t('settings.language_changed'), t('settings.language_changed_message'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Erreur lors du changement de langue');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.localHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Retour aux paramètres</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🎨 Préférences</Text>
      </View>

      {/* Langue */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Langue</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small },
          ]}
        >
          <View style={styles.languageContainer}>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'fr' && {
                  backgroundColor: colors.primary + '15',
                  borderColor: colors.primary,
                },
                { borderColor: colors.border },
              ]}
              onPress={() => handleChangeLanguage('fr')}
              activeOpacity={0.7}
            >
              <View style={styles.languageContent}>
                <Text style={styles.languageFlag}>🇫🇷</Text>
                <Text
                  style={[
                    styles.languageLabel,
                    { color: language === 'fr' ? colors.primary : colors.text },
                  ]}
                >
                  Français
                </Text>
              </View>
              {language === 'fr' && (
                <View style={[styles.checkMark, { backgroundColor: colors.primary }]}>
                  <Text style={styles.checkMarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'en' && {
                  backgroundColor: colors.primary + '15',
                  borderColor: colors.primary,
                },
                { borderColor: colors.border },
              ]}
              onPress={() => handleChangeLanguage('en')}
              activeOpacity={0.7}
            >
              <View style={styles.languageContent}>
                <Text style={styles.languageFlag}>🇬🇧</Text>
                <Text
                  style={[
                    styles.languageLabel,
                    { color: language === 'en' ? colors.primary : colors.text },
                  ]}
                >
                  English
                </Text>
              </View>
              {language === 'en' && (
                <View style={[styles.checkMark, { backgroundColor: colors.primary }]}>
                  <Text style={styles.checkMarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Apparence */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Apparence</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small },
          ]}
        >
          <ThemeSelector />
        </View>
      </View>

      {/* Autres préférences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Autres</Text>
        <View style={styles.list}>
          <TouchableOpacity
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => Alert.alert('En développement', 'Devise')}
          >
            <Text style={[styles.itemText, { color: colors.text }]}>Devise</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.item}
            onPress={() => Alert.alert('En développement', 'Unités de mesure')}
          >
            <Text style={[styles.itemText, { color: colors.text }]}>Unités de mesure</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: SPACING.md,
  },
  localHeader: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  backText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  list: {
    paddingHorizontal: SPACING.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  itemText: {
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.md,
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  languageContainer: {
    gap: SPACING.md,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  checkMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMarkText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
  },
});

