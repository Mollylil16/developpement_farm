/**
 * Composant ModalLayout réutilisable
 * Fournit une structure standardisée pour les modals avec header, content et footer
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

interface ModalLayoutProps {
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollEnabled?: boolean;
  headerRight?: React.ReactNode;
  showCloseButton?: boolean;
}

export default function ModalLayout({
  title,
  onClose,
  children,
  footer,
  scrollEnabled = false,
  headerRight,
  showCloseButton = true,
}: ModalLayoutProps) {
  const { colors } = useTheme();

  const content = scrollEnabled ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      {(title || onClose || headerRight) && (
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
          <View style={styles.headerRight}>
            {headerRight}
            {showCloseButton && onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      {content}

      {/* Footer */}
      {footer && <View style={[styles.footer, { borderTopColor: colors.divider }]}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
});

