/**
 * Vue détaillée - Sécurité et confidentialité
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { SPACING, FONT_SIZES } from '../../../constants/theme';

interface SettingsSecurityViewProps {
  onBack: () => void;
}

export default function SettingsSecurityView({ onBack }: SettingsSecurityViewProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.localHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Retour aux paramètres</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🛡️ Sécurité et confidentialité</Text>
      </View>

      <View style={styles.list}>
        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => {
            Alert.alert(
              'Historique de connexion',
              'L\'historique de connexion affiche les dernières connexions à votre compte. Cette fonctionnalité sera disponible prochainement.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>Historique de connexion</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => {
            Alert.alert(
              'Appareils connectés',
              'Gérez les appareils connectés à votre compte. Vous pouvez voir tous les appareils actifs et les déconnecter si nécessaire. Cette fonctionnalité sera disponible prochainement.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>Appareils connectés</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            Alert.alert(
              'Authentification 2FA',
              'L\'authentification à deux facteurs (2FA) ajoute une couche de sécurité supplémentaire à votre compte. Cette fonctionnalité sera disponible prochainement.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>Authentification 2FA</Text>
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
});

