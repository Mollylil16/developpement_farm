/**
 * Modal unifié pour les actions du Marketplace
 * Permet de choisir entre "Mettre en vente" et "Créer une demande"
 * Style aligné avec les modales existantes de l'application
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, ANIMATIONS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface MarketplaceActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSellPress: () => void; // Mettre en vente
  onRequestPress: () => void; // Créer une demande
  isProducer?: boolean; // Si true, l'utilisateur est un producteur
}

export default function MarketplaceActionModal({
  visible,
  onClose,
  onSellPress,
  onRequestPress,
  isProducer = false,
}: MarketplaceActionModalProps) {
  const { colors } = useTheme();
  const marketplaceColors = MarketplaceTheme.colors;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATIONS.duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleSellPress = () => {
    onClose();
    onSellPress();
  };

  const handleRequestPress = () => {
    onClose();
    onRequestPress();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
            backgroundColor: colors.overlay || 'rgba(0, 0, 0, 0.6)',
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ translateY: slideAnim }],
              backgroundColor: colors.surface,
              ...colors.shadow?.large || {},
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.title, { color: colors.text }]}>Action Marketplace</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Option 1: Mettre en vente */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                {
                  backgroundColor: marketplaceColors.success + '15',
                  borderColor: marketplaceColors.success,
                  ...(colors.shadow?.small || {}),
                },
              ]}
              onPress={handleSellPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: marketplaceColors.success }]}>
                <Ionicons name="cash" size={32} color={marketplaceColors.textInverse || '#FFFFFF'} />
              </View>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Mettre en vente</Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {isProducer
                  ? 'Publiez vos sujets disponibles à la vente'
                  : 'Créez une annonce pour vendre vos produits'}
              </Text>
            </TouchableOpacity>

            {/* Option 2: Créer une demande */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                {
                  backgroundColor: marketplaceColors.info + '15',
                  borderColor: marketplaceColors.info,
                  ...(colors.shadow?.small || {}),
                },
              ]}
              onPress={handleRequestPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: marketplaceColors.info }]}>
                <Ionicons name="search" size={32} color={marketplaceColors.textInverse || '#FFFFFF'} />
              </View>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Créer une demande</Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {isProducer
                  ? 'Recherchez des sujets pour élargir votre cheptel'
                  : 'Définissez vos critères de recherche pour trouver des porcs'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modal: {
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  closeButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  optionsContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  optionCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  optionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.sm,
  },
});

