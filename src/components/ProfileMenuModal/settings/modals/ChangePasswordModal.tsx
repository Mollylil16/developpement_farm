/**
 * Modal pour changer le mot de passe
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useAppSelector } from '../../../../store/hooks';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';
import CustomModal from '../../../CustomModal';
import { getDatabase } from '../../../../services/database';
import { UserRepository } from '../../../../database/repositories';
import { getErrorMessage } from '../../../../types/common';
import { hashPassword } from '../../../../utils/hashPassword';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const { colors } = useTheme();
  const user = useAppSelector((state) => state.auth.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!currentPassword) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe actuel');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const userRepo = new UserRepository(db);
      
      // Récupérer l'utilisateur avec le hash du mot de passe
      const dbUser = await userRepo.findById(user.id);
      if (!dbUser) {
        Alert.alert('Erreur', 'Utilisateur introuvable');
        setLoading(false);
        return;
      }

      // Vérifier le mot de passe actuel
      if (dbUser.password_hash) {
        const currentPasswordHash = await hashPassword(currentPassword);
        
        if (currentPasswordHash !== dbUser.password_hash) {
          Alert.alert('Erreur', 'Mot de passe actuel incorrect');
          setLoading(false);
          return;
        }
      }

      // Hasher le nouveau mot de passe
      const newPasswordHash = await hashPassword(newPassword);

      // Mettre à jour le mot de passe
      // Note: UserRepository.update ne gère pas password_hash directement
      // Utiliser une requête SQL directe
      await db.runAsync(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, user.id]
      );

      Alert.alert('Succès', 'Mot de passe modifié avec succès', [
        {
          text: 'OK',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onClose();
          },
        },
      ]);
    } catch (error: unknown) {
      Alert.alert('Erreur', getErrorMessage(error) || 'Erreur lors de la modification du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="Changer le mot de passe"
      confirmText="Enregistrer"
      onConfirm={handleConfirm}
      loading={loading}
    >
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Mot de passe actuel</Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Entrez votre mot de passe actuel"
            placeholderTextColor={colors.textSecondary}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrentPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: SPACING.md }]}>
          Nouveau mot de passe
        </Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Au moins 6 caractères"
            placeholderTextColor={colors.textSecondary}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowNewPassword(!showNewPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: SPACING.md }]}>
          Confirmer le nouveau mot de passe
        </Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Confirmez le nouveau mot de passe"
            placeholderTextColor={colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
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
  eyeIcon: {
    padding: SPACING.xs,
  },
});

