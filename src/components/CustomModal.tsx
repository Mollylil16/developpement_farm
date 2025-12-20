/**
 * Composant modal personnalisé avec animations fluides et shake-to-cancel
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useShakeToCancel } from '../hooks/useShakeToCancel';

export interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
  showButtons?: boolean;
  loading?: boolean;
  enableShakeToCancel?: boolean; // Activer le shake-to-cancel (par défaut: false pour éviter permissions intrusives)
  shakeThreshold?: number; // Sensibilité de la détection (par défaut: 15)
  scrollEnabled?: boolean; // Activer le scroll intégré (par défaut: true)
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
  enableShakeToCancel = false, // Désactivé par défaut pour éviter les permissions intrusive
  shakeThreshold = 15,
  scrollEnabled = false, // Désactivé par défaut car beaucoup de modales ont leur propre ScrollView
}: CustomModalProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const keyboardOffsetAnim = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Activer le shake-to-cancel si autorisé et modal visible
  useShakeToCancel({
    enabled: visible && enableShakeToCancel && !loading,
    threshold: shakeThreshold,
    onShake: () => {
      Alert.alert('🔔 Secousse détectée', 'Voulez-vous annuler cette action ?', [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: onClose,
        },
      ]);
    },
  });

  // Gérer l'apparition/disparition du clavier
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      keyboardOffsetAnim.setValue(0);
      return;
    }

    let keyboardShowListener: { remove: () => void } | null = null;
    let keyboardHideListener: { remove: () => void } | null = null;

    try {
      keyboardShowListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (e) => {
          if (e?.endCoordinates?.height) {
            const height = e.endCoordinates.height;
            setKeyboardHeight(height);
            // Animer le déplacement du modal vers le haut
            Animated.timing(keyboardOffsetAnim, {
              toValue: -height / 2, // Déplace le modal vers le haut de la moitié de la hauteur du clavier
              duration: Platform.OS === 'ios' ? 250 : 200,
              useNativeDriver: true,
            }).start();
          }
        }
      );

      keyboardHideListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          setKeyboardHeight(0);
          // Animer le retour à la position normale
          Animated.timing(keyboardOffsetAnim, {
            toValue: 0,
            duration: Platform.OS === 'ios' ? 250 : 200,
            useNativeDriver: true,
          }).start();
        }
      );
    } catch (error) {
      console.warn('Erreur lors de la configuration des listeners clavier:', error);
    }

    return () => {
      try {
        if (keyboardShowListener) {
          keyboardShowListener.remove();
        }
        if (keyboardHideListener) {
          keyboardHideListener.remove();
        }
      } catch (error) {
        console.warn('Erreur lors du nettoyage des listeners clavier:', error);
      }
    };
  }, [visible, keyboardOffsetAnim]);

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
      setKeyboardHeight(0);
    }
  }, [visible, fadeAnim, slideAnim]);

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
        pointerEvents="box-none"
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [
                { translateY: slideAnim },
                { translateY: keyboardOffsetAnim }, // Déplace le modal vers le haut quand le clavier apparaît
              ],
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

          {scrollEnabled ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              nestedScrollEnabled={true}
              bounces={true}
              scrollEventThrottle={16}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}

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
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 4, // Extra padding pour le clavier (augmenté)
  },
  content: {
    flexShrink: 1,
    padding: SPACING.lg,
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
