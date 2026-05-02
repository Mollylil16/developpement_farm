/**
 * Composant pour saisir manuellement un code QR
 * Alternative au scan lorsque la caméra n'est pas disponible
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../constants/theme';

export interface ManualQRInputProps {
  visible: boolean;
  onClose: () => void;
  onValidate: (qrCode: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Valide le format du code QR
 * Format attendu : XXXXXXXX-XXXXXXXX-XXXXXXXX ou similaire
 */
const validateQRFormat = (code: string): boolean => {
  // Format flexible : accepte des codes avec ou sans tirets
  // Minimum 8 caractères, maximum 128 caractères
  const cleaned = code.replace(/[-\s]/g, '');
  return cleaned.length >= 8 && cleaned.length <= 128;
};

export default function ManualQRInput({
  visible,
  onClose,
  onValidate,
  isLoading = false,
}: ManualQRInputProps) {
  const { colors } = useTheme();
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    // Nettoyer le code (supprimer les espaces en début/fin)
    const cleaned = qrCode.trim();

    // Valider le format
    if (!cleaned) {
      setError('Veuillez saisir un code QR');
      return;
    }

    if (!validateQRFormat(cleaned)) {
      setError('Le format du code QR est invalide. Il doit contenir au moins 8 caractères.');
      return;
    }

    setError(null);
    try {
      await onValidate(cleaned);
      // Réinitialiser le champ après validation réussie
      setQrCode('');
    } catch (err: unknown) {
      setError(err.message || 'Une erreur est survenue lors de la validation du code');
    }
  };

  const handleClose = () => {
    setQrCode('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                Saisir le code manuellement
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {/* Icône */}
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="qr-code-outline" size={48} color={colors.primary} />
              </View>

              {/* Instructions */}
              <Text style={[styles.instructions, { color: colors.textSecondary }]}>
                Saisissez le code QR affiché sur l'écran du collaborateur.
                {'\n\n'}
                Vous pouvez saisir le code avec ou sans tirets ou espaces.
              </Text>

              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: error ? colors.error : colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={qrCode}
                  onChangeText={(text) => {
                    setQrCode(text);
                    setError(null); // Effacer l'erreur quand l'utilisateur tape
                  }}
                  placeholder="Entrez le code QR ici..."
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline={false}
                  editable={!isLoading}
                  accessibilityLabel="Champ de saisie du code QR"
                  accessibilityHint="Saisissez le code QR du collaborateur"
                />
                {qrCode.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setQrCode('');
                      setError(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Effacer le code"
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Message d'erreur */}
              {error && (
                <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              {/* Exemple de format */}
              <View style={[styles.exampleContainer, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.info} />
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  Exemple : XXXX-XXXX-XXXX ou XXXXXXXXXXXX
                </Text>
              </View>

              {/* Boutons d'action */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                  onPress={handleClose}
                  disabled={isLoading}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Annuler"
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                    Annuler
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.validateButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: isLoading || !qrCode.trim() ? 0.5 : 1,
                    },
                  ]}
                  onPress={handleValidate}
                  disabled={isLoading || !qrCode.trim()}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Valider le code QR"
                  accessibilityHint="Valide et traite le code QR saisi"
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.validateButtonText}>Validation...</Text>
                    </View>
                  ) : (
                    <Text style={styles.validateButtonText}>Valider</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 10,
    },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  instructions: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  input: {
    fontSize: FONT_SIZES.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    paddingRight: 40,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  clearButton: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md,
    padding: SPACING.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  exampleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  exampleText: {
    fontSize: FONT_SIZES.xs,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  validateButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});
