/**
 * Composant formulaire modal pour collaborateur
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createCollaborateur, updateCollaborateur } from '../store/slices/collaborationSlice';
import {
  Collaborateur,
  CreateCollaborateurInput,
  RoleCollaborateur,
  StatutCollaborateur,
  ROLE_LABELS,
  STATUT_LABELS,
  DEFAULT_PERMISSIONS,
} from '../types';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

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
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
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

  const roles: RoleCollaborateur[] = ['proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur'];
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
    // Validation
    if (!formData.projet_id) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }
    if (!formData.nom.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }
    if (!formData.prenom.trim()) {
      Alert.alert('Erreur', 'Le prénom est requis');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Erreur', 'L\'email est requis');
      return;
    }
    if (!formData.email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
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
    } catch (error: any) {
      Alert.alert('Erreur', error || "Erreur lors de l'enregistrement");
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
    >
      <ScrollView style={styles.scrollView}>
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

        <FormField
          label="Email *"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          placeholder="Ex: amadou@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <FormField
          label="Téléphone"
          value={formData.telephone}
          onChangeText={(text) => setFormData({ ...formData, telephone: text })}
          placeholder="Ex: +221 77 123 45 67"
          keyboardType="phone-pad"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rôle</Text>
          <View style={styles.optionsContainer}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.option,
                  formData.role === role && styles.optionSelected,
                ]}
                onPress={() => handleRoleChange(role)}
              >
                <Text
                  style={[
                    styles.optionText,
                    formData.role === role && styles.optionTextSelected,
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
            <Text style={styles.sectionTitle}>Statut</Text>
            <View style={styles.optionsContainer}>
              {statuts.map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.option,
                    formData.statut === statut && styles.optionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, statut })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.statut === statut && styles.optionTextSelected,
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
          <Text style={styles.sectionTitle}>Permissions</Text>
          <View style={styles.permissionsContainer}>
            {Object.entries(formData.permissions || {}).map(([key, value]) => (
              <View key={key} style={styles.permissionRow}>
                <Text style={styles.permissionLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
                <Switch
                  value={value}
                  onValueChange={() => togglePermission(key as keyof Collaborateur['permissions'])}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={value ? COLORS.textOnPrimary : COLORS.textSecondary}
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
      </ScrollView>
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
    color: COLORS.text,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  permissionsContainer: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  permissionLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

