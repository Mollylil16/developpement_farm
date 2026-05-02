/**
 * ErrorBoundary spécifique pour les modals
 * Capture les erreurs dans les modals sans faire crasher toute l'application
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, BORDER_RADIUS, FONT_WEIGHTS, LIGHT_COLORS } from '../constants/theme';

interface Props {
  children: ReactNode;
  onClose?: () => void;
  modalName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary pour les modals
 * Affiche une UI d'erreur propre au lieu de faire crasher le modal
 */
export default class ModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { modalName } = this.props;

    // Logger l'erreur avec contexte
    console.error(`❌ [ModalErrorBoundary] Erreur dans ${modalName || 'modal'}:`, {
      error: error.toString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      modalName,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Envoyer à un service de monitoring si disponible (Sentry, etc.)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     contexts: {
    //       modal: {
    //         name: modalName,
    //         componentStack: errorInfo.componentStack,
    //       },
    //     },
    //   });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleClose = () => {
    const { onClose } = this.props;
    this.handleReset();
    if (onClose) {
      onClose();
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const { modalName } = this.props;

      return (
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {/* Icône d'erreur */}
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={64} color={LIGHT_COLORS.error} />
            </View>

            {/* Titre */}
            <Text style={styles.title}>Une erreur s'est produite</Text>

            {/* Message principal */}
            <Text style={styles.message}>
              Le formulaire a rencontré une erreur inattendue. Vos données n'ont pas été
              enregistrées.
            </Text>

            {/* Message d'erreur technique */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  {modalName ? `Erreur dans: ${modalName}` : "Détails de l'erreur"}
                </Text>
                <Text style={styles.errorMessage}>{error.message}</Text>
              </View>
            )}

            {/* Stack trace (développement uniquement) */}
            {__DEV__ && errorInfo && (
              <View style={[styles.errorBox, styles.stackBox]}>
                <Text style={styles.errorTitle}>Component Stack (Dev)</Text>
                <Text style={styles.stackText}>{errorInfo.componentStack}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={this.handleReset}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Réessayer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.closeButton]}
                onPress={this.handleClose}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Fermer</Text>
              </TouchableOpacity>
            </View>

            {/* Conseils */}
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Que faire ?</Text>
              <Text style={styles.tipText}>• Réessayez en cliquant sur "Réessayer"</Text>
              <Text style={styles.tipText}>• Fermez et rouvrez le formulaire</Text>
              <Text style={styles.tipText}>
                • Si le problème persiste, redémarrez l'application
              </Text>
              <Text style={styles.tipText}>• Contactez le support si l'erreur continue</Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as TextStyle['fontWeight'],
    color: LIGHT_COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: LIGHT_COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  errorBox: {
    width: '100%',
    backgroundColor: `${LIGHT_COLORS.error}15`,
    borderWidth: 1,
    borderColor: `${LIGHT_COLORS.error}50`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    color: LIGHT_COLORS.error,
    marginBottom: SPACING.xs,
  },
  errorMessage: {
    fontSize: FONT_SIZES.sm,
    color: LIGHT_COLORS.text,
    lineHeight: 18,
  },
  stackBox: {
    backgroundColor: `${LIGHT_COLORS.textSecondary}10`,
    borderColor: `${LIGHT_COLORS.textSecondary}30`,
  },
  stackText: {
    fontSize: FONT_SIZES.xs,
    color: LIGHT_COLORS.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryButton: {
    backgroundColor: LIGHT_COLORS.primary,
  },
  closeButton: {
    backgroundColor: LIGHT_COLORS.textSecondary,
  },
  buttonIcon: {
    marginRight: SPACING.xs,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  tipsBox: {
    width: '100%',
    backgroundColor: `${LIGHT_COLORS.info}15`,
    borderWidth: 1,
    borderColor: `${LIGHT_COLORS.info}30`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  tipsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    color: LIGHT_COLORS.info,
    marginBottom: SPACING.sm,
  },
  tipText: {
    fontSize: FONT_SIZES.sm,
    color: LIGHT_COLORS.text,
    lineHeight: 20,
    marginBottom: SPACING.xs / 2,
  },
});
