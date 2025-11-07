/**
 * Composant modal personnalisé avec animations fluides
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
  showButtons?: boolean;
  loading?: boolean;
}

export default function CustomModal({
  visible,
  onClose,
  title,
  children,
  confirmText = 'Confirmer',
  onConfirm,
  cancelText = 'Annuler',
  showButtons = true,
  loading = false,
}: CustomModalProps) {
  const { colors } = useTheme();
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
  }, [visible]);

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
            backgroundColor: colors.overlay,
          },
        ]}
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
              ...colors.shadow.large,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>{children}</View>

          {showButtons && (
            <View style={[styles.footer, { borderTopColor: colors.divider }]}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.surfaceVariant,
                    ...colors.shadow.small,
                  },
                ]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.buttonCancelText, { color: colors.text }]}>{cancelText}</Text>
              </TouchableOpacity>
              {onConfirm && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      backgroundColor: colors.primary,
                      ...colors.shadow.small,
                    },
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                >
                  <Text style={[styles.buttonConfirmText, { color: colors.textOnPrimary }]}>
                    {loading ? 'Chargement...' : confirmText}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
  content: {
    padding: SPACING.lg,
    maxHeight: 500,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  button: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  buttonConfirmText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

