/**
 * Modal de contact support
 * Permet à l'utilisateur de contacter le support via différentes méthodes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';

interface SupportContactModalProps {
  visible: boolean;
  onClose: () => void;
}

const SUPPORT_EMAIL = 'support@fermier-pro.com';
const SUPPORT_PHONE = '+225 07 XX XX XX XX';

export default function SupportContactModal({ visible, onClose }: SupportContactModalProps) {
  const { colors } = useTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleEmailContact = async () => {
    try {
      const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject || 'Demande de support')}&body=${encodeURIComponent(message || '')}`;
      const canOpen = await Linking.canOpenURL(emailUrl);

      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert(
          'Erreur',
          "Impossible d'ouvrir l'application email. Veuillez envoyer un email à " + SUPPORT_EMAIL
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture de l'email:", error);
      Alert.alert('Erreur', "Impossible d'ouvrir l'application email.");
    }
  };

  const handlePhoneContact = async () => {
    try {
      const phoneUrl = `tel:${SUPPORT_PHONE.replace(/\s/g, '')}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);

      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(
          'Erreur',
          "Impossible d'ouvrir l'application téléphone. Veuillez appeler " + SUPPORT_PHONE
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture du téléphone:", error);
      Alert.alert('Erreur', "Impossible d'ouvrir l'application téléphone.");
    }
  };

  const handleSendMessage = async () => {
    if (!subject.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un sujet.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un message.');
      return;
    }

    setSending(true);

    try {
      // Simuler l'envoi du message
      // Dans une vraie application, cela enverrait le message à un serveur
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Ouvrir l'email avec le message pré-rempli
      await handleEmailContact();

      Alert.alert(
        'Succès',
        "Votre message a été préparé. Veuillez l'envoyer depuis votre application email."
      );

      // Réinitialiser le formulaire
      setSubject('');
      setMessage('');
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      Alert.alert('Erreur', "Impossible d'envoyer le message. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSubject('');
    setMessage('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Contacter le support</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Options de contact rapide */}
          <View style={styles.quickContactSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact rapide</Text>

            <TouchableOpacity
              style={[
                styles.contactOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handleEmailContact}
            >
              <View
                style={[styles.contactIconContainer, { backgroundColor: colors.primary + '15' }]}
              >
                <Ionicons name="mail" size={24} color={colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactOptionTitle, { color: colors.text }]}>
                  Envoyer un email
                </Text>
                <Text style={[styles.contactOptionSubtitle, { color: colors.textSecondary }]}>
                  {SUPPORT_EMAIL}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.contactOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handlePhoneContact}
            >
              <View
                style={[styles.contactIconContainer, { backgroundColor: colors.success + '15' }]}
              >
                <Ionicons name="call" size={24} color={colors.success} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactOptionTitle, { color: colors.text }]}>Appeler</Text>
                <Text style={[styles.contactOptionSubtitle, { color: colors.textSecondary }]}>
                  {SUPPORT_PHONE}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Formulaire de contact */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Envoyer un message</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Sujet *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={subject}
                onChangeText={setSubject}
                placeholder="Ex: Problème de connexion"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Message *</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={message}
                onChangeText={setMessage}
                placeholder="Décrivez votre problème ou votre question..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.primary }]}
              onPress={handleSendMessage}
              disabled={sending || !subject.trim() || !message.trim()}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>
                {sending ? 'Envoi...' : 'Envoyer le message'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Informations supplémentaires */}
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Notre équipe répond généralement dans les 24-48 heures. Pour les urgences, veuillez
              nous appeler directement.
            </Text>
          </View>
        </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  quickContactSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  contactOptionSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  formSection: {
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    minHeight: 120,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginLeft: SPACING.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});
