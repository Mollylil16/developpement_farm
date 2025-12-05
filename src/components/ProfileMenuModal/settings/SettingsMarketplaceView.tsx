/**
 * Vue détaillée - Marketplace
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { SPACING, FONT_SIZES } from '../../../constants/theme';

interface SettingsMarketplaceViewProps {
  onBack: () => void;
}

export default function SettingsMarketplaceView({ onBack }: SettingsMarketplaceViewProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.localHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Retour aux paramètres</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🏪 Marketplace</Text>
      </View>

      <View style={styles.list}>
        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => {
            Alert.alert(
              'Conditions de vente par défaut',
              'Configurez les conditions de vente par défaut pour vos annonces sur le marketplace (prix au kg, mode de paiement, etc.). Cette fonctionnalité sera disponible prochainement.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>
            Conditions de vente par défaut
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => {
            Alert.alert(
              'Notifications marketplace',
              'Configurez les notifications liées au marketplace (nouvelles offres, demandes, messages, etc.). Cette fonctionnalité sera disponible prochainement.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>Notifications marketplace</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            Alert.alert(
              'Préférences d\'affichage',
              'Personnalisez l\'affichage du marketplace (tri par défaut, nombre d\'éléments par page, etc.). Cette fonctionnalité sera disponible prochainement.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>Préférences d'affichage</Text>
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

