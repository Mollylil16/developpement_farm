/**
 * Modal pour modifier l'email
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../../../store/hooks';
import { loadUserFromStorageThunk } from '../../../../store/slices/authSlice';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';
import CustomModal from '../../../CustomModal';
import apiClient from '../../../../services/api/apiClient';
import { getErrorMessage } from '../../../../types/common';

interface ChangeEmailModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChangeEmailModal({ visible, onClose }: ChangeEmailModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth?.user);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un email');
      return;
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
      return;
    }

    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    setLoading(true);
    try {
      // Vérifier si l'email existe déjà via l'API backend
      try {
        const existingUser = await apiClient.get<any>(`/users/email/${newEmail.trim().toLowerCase()}`);
        if (existingUser && existingUser.id !== user.id) {
          Alert.alert('Erreur', 'Cet email est déjà utilisé par un autre compte');
          setLoading(false);
          return;
        }
      } catch (error) {
        // Email n'existe pas, on peut continuer
      }

      // Mettre à jour l'email via l'API backend
      await apiClient.patch(`/users/${user.id}`, {
        email: newEmail.trim().toLowerCase(),
      });

      // Recharger l'utilisateur dans Redux
      await dispatch(loadUserFromStorageThunk());

      Alert.alert('Succès', 'Email modifié avec succès', [
        {
          text: 'OK',
          onPress: () => {
            setNewEmail('');
            onClose();
          },
        },
      ]);
    } catch (error: unknown) {
      Alert.alert('Erreur', getErrorMessage(error) || "Erreur lors de la modification de l'email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="Modifier l'email"
      confirmText="Enregistrer"
      onConfirm={handleConfirm}
      loading={loading}
    >
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Email actuel</Text>
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.currentEmail, { color: colors.text }]}>
            {user?.email || 'Non renseigné'}
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: SPACING.md }]}>
          Nouvel email
        </Text>
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={colors.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="nouvel@email.com"
            placeholderTextColor={colors.textSecondary}
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
  },
  currentEmail: {
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.xs,
  },
});
