/**
 * Composant formulaire modal pour collaborateur
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createCollaborateur, updateCollaborateur } from '../store/slices/collaborationSlice';
import type {
  Collaborateur,
  CreateCollaborateurInput,
  RoleCollaborateur,
  StatutCollaborateur,
} from '../types/collaboration';
import { ROLE_LABELS, STATUT_LABELS, DEFAULT_PERMISSIONS } from '../types/collaboration';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useRole } from '../contexts/RoleContext';
import { validateCollaborateur } from '../validation/collaborationSchemas';

interface CollaborationFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  collaborateur?: Collaborateur | null;
  isEditing?: boolean;
}

export default function CollaborationFormModal({
  visible,
  onClose,
  onSuccess,
  collaborateur,
  isEditing = false,
}: CollaborationFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });
  const { activeRole } = useRole();
  const currentUser = useAppSelector((state) => state.auth?.user);

  // Vérifier si l'utilisateur est propriétaire du projet actif
  const isProprietaire =
    activeRole === 'producer' &&
    projetActif &&
    currentUser &&
    projetActif.proprietaire_id === currentUser.id;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCollaborateurInput>({
    projet_id: projetActif?.id || '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'observateur',
    statut: 'en_attente',
    permissions: DEFAULT_PERMISSIONS.observateur,
    notes: '',
  });

  const roles: RoleCollaborateur[] = [
    'proprietaire',
    'gestionnaire',
    'veterinaire',
    'ouvrier',
    'observateur',
  ];
  const statuts: StatutCollaborateur[] = ['actif', 'inactif', 'en_attente'];

  useEffect(() => {
    if (collaborateur && isEditing) {
      setFormData({
        projet_id: collaborateur.projet_id,
        nom: collaborateur.nom,
        prenom: collaborateur.prenom,
        email: collaborateur.email,
        telephone: collaborateur.telephone || '',
        role: collaborateur.role,
        statut: collaborateur.statut,
        permissions: collaborateur.permissions,
        notes: collaborateur.notes || '',
      });
    } else {
      setFormData({
        projet_id: projetActif?.id || '',
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        role: 'observateur',
        statut: 'en_attente',
        permissions: DEFAULT_PERMISSIONS.observateur,
        notes: '',
      });
    }
  }, [collaborateur, isEditing, visible, projetActif]);

  // Mettre à jour les permissions quand le rôle change (seulement lors de la création)
  const handleRoleChange = (role: RoleCollaborateur) => {
    setFormData((prev) => ({
      ...prev,
      role,
      permissions: isEditing && collaborateur ? prev.permissions : DEFAULT_PERMISSIONS[role],
    }));
  };

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (!isProprietaire) {
      Alert.alert(
        'Permission refusée',
        'Seul le propriétaire peut créer ou modifier des collaborateurs.'
      );
      return;
    }

    // Validation avec Yup
    const { isValid, errors: validationErrors } = await validateCollaborateur(formData);
    if (!isValid) {
      const firstError = Object.values(validationErrors)[0];
      Alert.alert(
        'Erreur de validation',
        firstError || 'Veuillez corriger les erreurs du formulaire'
      );
      return;
    }

    setLoading(true);
    try {
      if (isEditing && collaborateur) {
        await dispatch(
          updateCollaborateur({
            id: collaborateur.id,
            updates: formData,
          })
        ).unwrap();
      } else {
        await dispatch(createCollaborateur(formData)).unwrap();
      }
      onSuccess();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error) || "Erreur lors de l'enregistrement";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (key: keyof Collaborateur['permissions']) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions!,
        [key]: !prev.permissions![key],
      },
    }));
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier le collaborateur' : 'Inviter un collaborateur'}
      confirmText={isEditing ? 'Modifier' : 'Inviter'}
      onConfirm={handleSubmit}
      showButtons={true}
      loading={loading}
      scrollEnabled={true}
    >
      <>
        <FormField
          label="Nom *"
          value={formData.nom}
          onChangeText={(text) => setFormData({ ...formData, nom: text })}
          placeholder="Ex: DIALLO"
        />

        <FormField
          label="Prénom *"
          value={formData.prenom}
          onChangeText={(text) => setFormData({ ...formData, prenom: text })}
          placeholder="Ex: Amadou"
        />

        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: SPACING.xs }]}>
          Contact (Email ou Téléphone requis) *
        </Text>
        
        <FormField
          label="Email"
          value={formData.email || ''}
          onChangeText={(text) => setFormData({ ...formData, email: text || undefined })}
          placeholder="Ex: amadou@example.com (optionnel si téléphone fourni)"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.infoText, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          OU
        </Text>

        <FormField
          label="Téléphone"
          value={formData.telephone || ''}
          onChangeText={(text) => setFormData({ ...formData, telephone: text || undefined })}
          placeholder="Ex: +225 07 12 34 56 78 (optionnel si email fourni)"
          keyboardType="phone-pad"
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rôle</Text>
          <View style={styles.optionsContainer}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  formData.role === role && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleRoleChange(role)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.role === role && {
                      color: colors.textOnPrimary,
                      fontWeight: FONT_WEIGHTS.semiBold,
                    },
                  ]}
                >
                  {ROLE_LABELS[role]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isEditing && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Statut</Text>
            <View style={styles.optionsContainer}>
              {statuts.map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.option,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    formData.statut === statut && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, statut })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      formData.statut === statut && {
                        color: colors.textOnPrimary,
                        fontWeight: FONT_WEIGHTS.semiBold,
                      },
                    ]}
                  >
                    {STATUT_LABELS[statut]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Permissions</Text>
          <View style={[styles.permissionsContainer, { backgroundColor: colors.surfaceVariant }]}>
            {Object.entries(formData.permissions || {}).map(([key, value]) => (
              <View key={key} style={[styles.permissionRow, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.permissionLabel, { color: colors.text }]}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
                <Switch
                  value={value}
                  onValueChange={() => togglePermission(key as keyof Collaborateur['permissions'])}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={value ? colors.textOnPrimary : colors.textSecondary}
                />
              </View>
            ))}
          </View>
        </View>

        <FormField
          label="Notes"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Ajoutez des notes..."
          multiline
        />
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 500,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
  },
  permissionsContainer: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  permissionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
