/**
 * Modal de confirmation de suppression de profil
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import type { RoleType } from '../../types/roles';

interface DeleteProfileModalProps {
  visible: boolean;
  profile: RoleType | null;
  profileData: {
    projects?: number;
    animals?: number;
    collaborations?: number;
    purchases?: number;
  };
  onClose: () => void;
  onConfirm: () => void;
}

const getProfileName = (profile: RoleType | null): string => {
  const names: Record<RoleType, string> = {
    producer: 'Producteur',
    buyer: 'Acheteur',
    veterinarian: 'Vétérinaire',
    technician: 'Technicien',
  };
  return profile ? names[profile] : '';
};

export default function DeleteProfileModal({
  visible,
  profile,
  profileData,
  onClose,
  onConfirm,
}: DeleteProfileModalProps) {
  const { colors } = useTheme();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!profile) return null;

  const profileName = getProfileName(profile);

  const getDataToDelete = (): string[] => {
    switch (profile) {
      case 'producer':
        return [
          `• Tous vos projets (${profileData.projects || 0} projet${(profileData.projects || 0) > 1 ? 's' : ''})`,
          `• Tout votre cheptel (${profileData.animals || 0} animal${(profileData.animals || 0) > 1 ? 'x' : ''})`,
          '• Toutes vos données financières (revenus, dépenses)',
          '• Vos annonces sur le marketplace',
          '• Vos collaborations',
          '• Toutes vos données de santé (vaccinations, maladies, etc.)',
        ];
      case 'buyer':
        return [
          `• Votre historique d'achats (${profileData.purchases || 0} achat${(profileData.purchases || 0) > 1 ? 's' : ''})`,
          '• Vos offres en cours',
          '• Vos notifications d\'achat',
        ];
      case 'veterinarian':
        return [
          `• Vos suivis (${profileData.collaborations || 0} élevage${(profileData.collaborations || 0) > 1 ? 's' : ''})`,
          '• Vos notes vétérinaires',
          '• Vos recommandations',
        ];
      case 'technician':
        return [
          `• Vos suivis (${profileData.collaborations || 0} élevage${(profileData.collaborations || 0) > 1 ? 's' : ''})`,
          '• Vos conseils et rapports',
        ];
    }
  };

  const handleConfirm = async () => {
    if (confirmText !== 'SUPPRIMER') {
      Alert.alert('Erreur', 'Veuillez taper "SUPPRIMER" en majuscules pour confirmer');
      return;
    }

    setLoading(true);
    try {
      await onConfirm();
      setConfirmText('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setConfirmText('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            ⚠️ Supprimer le profil {profileName}
          </Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={64} color={colors.error} />
          </View>

          <Text style={[styles.warning, { color: colors.text }]}>
            Cette action est IRRÉVERSIBLE et supprimera :
          </Text>

          <View style={styles.listContainer}>
            {getDataToDelete().map((item, index) => (
              <Text key={index} style={[styles.listItem, { color: colors.textSecondary }]}>
                {item}
              </Text>
            ))}
          </View>

          <View style={[styles.noteContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              Vos autres profils ne seront PAS affectés.
            </Text>
          </View>

          <View style={styles.confirmSection}>
            <Text style={[styles.confirmLabel, { color: colors.text }]}>
              Pour confirmer, tapez : <Text style={styles.confirmKeyword}>SUPPRIMER</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="SUPPRIMER"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>
        </ScrollView>

        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              {
                backgroundColor: colors.error,
                opacity: confirmText === 'SUPPRIMER' && !loading ? 1 : 0.5,
              },
            ]}
            onPress={handleConfirm}
            disabled={confirmText !== 'SUPPRIMER' || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirmer la suppression</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  warningContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  warning: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  listContainer: {
    marginBottom: SPACING.lg,
    paddingLeft: SPACING.md,
  },
  listItem: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
    lineHeight: 24,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  note: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  confirmSection: {
    marginBottom: SPACING.lg,
  },
  confirmLabel: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
  },
  confirmKeyword: {
    fontWeight: FONT_WEIGHTS.bold,
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderTopWidth: 1,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

