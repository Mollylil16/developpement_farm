/**
 * Modal de recherche globale
 */

import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useRole } from '../contexts/RoleContext';
import { SPACING, FONT_SIZES } from '../constants/theme';
import GlobalSearchComponent, { SearchResult } from './GlobalSearchComponent';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SCREENS } from '../navigation/types';

interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ visible, onClose }: GlobalSearchModalProps) {
  const { colors } = useTheme();
  const { activeRole } = useRole();
  const navigation = useNavigation<NavigationProp<any>>();

  const handleResultPress = (result: SearchResult) => {
    onClose();

    // Naviguer vers l'écran approprié selon le type de résultat
    switch (result.screen) {
      case 'Production':
        navigation.navigate(SCREENS.PRODUCTION);
        break;
      case 'Reproduction':
        // Pour les vétérinaires, rediriger vers le Dashboard au lieu de Reproduction
        if (activeRole === 'veterinarian') {
          navigation.navigate('Main', { screen: SCREENS.DASHBOARD_VET });
        } else {
          navigation.navigate(SCREENS.REPRODUCTION);
        }
        break;
      case 'Nutrition':
        navigation.navigate(SCREENS.NUTRITION);
        break;
      case 'Finance':
        navigation.navigate(SCREENS.FINANCE);
        break;
      case 'Planification':
        navigation.navigate(SCREENS.PLANIFICATION);
        break;
      case 'Collaboration':
        navigation.navigate(SCREENS.COLLABORATION);
        break;
      case 'Mortalites':
        navigation.navigate(SCREENS.MORTALITES);
        break;
      default:
        break;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Recherche globale</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <GlobalSearchComponent onResultPress={handleResultPress} onClose={onClose} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
});
