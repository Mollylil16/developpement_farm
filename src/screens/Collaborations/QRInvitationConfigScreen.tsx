/**
 * QRInvitationConfigScreen - Écran de configuration de l'invitation après scan QR
 * Permet au producteur de définir les permissions et notes avant d'envoyer l'invitation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadCollaborateursParProjet } from '../../store/slices/collaborationSlice';
import Toast from 'react-native-toast-message';
import apiClient from '../../services/api/apiClient';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, COLORS } from '../../constants/theme';
import type { RoleCollaborateur } from '../../types/collaboration';
import { ROLE_LABELS, DEFAULT_PERMISSIONS } from '../../types/collaboration';
import { hapticSuccess, hapticError } from '../../utils/haptics';

interface ScannedProfile {
  userId: string;
  profileId: string;
  profileType: 'veterinarian' | 'technician';
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  photo?: string;
}

interface RouteParams {
  scannedProfile: ScannedProfile;
  projetId: string;
}

type QRInvitationConfigRouteProp = RouteProp<{ params: RouteParams }, 'params'>;

export default function QRInvitationConfigScreen() {
  const navigation = useNavigation();
  const route = useRoute<QRInvitationConfigRouteProp>();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { user } = useAppSelector((state) => state.auth);

  const { scannedProfile, projetId } = route.params || {};

  // État local
  const [permissions, setPermissions] = useState<{
    reproduction: boolean;
    nutrition: boolean;
    finance: boolean;
    rapports: boolean;
    planification: boolean;
    mortalites: boolean;
    sante: boolean;
  }>(() => {
    // Initialiser avec les permissions par défaut selon le type de profil
    if (scannedProfile?.profileType === 'veterinarian') {
      return DEFAULT_PERMISSIONS.veterinaire;
    } else if (scannedProfile?.profileType === 'technician') {
      return DEFAULT_PERMISSIONS.ouvrier;
    }
    return {
      reproduction: false,
      nutrition: false,
      finance: false,
      rapports: false,
      planification: false,
      mortalites: false,
      sante: false,
    };
  });

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Déterminer le rôle depuis le profileType
  const role: RoleCollaborateur = scannedProfile?.profileType === 'veterinarian' ? 'veterinaire' : 'ouvrier';

  // Vérifier qu'au moins une permission est sélectionnée
  const hasAtLeastOnePermission = Object.values(permissions).some((value) => value === true);

  // Toggle une permission
  const togglePermission = useCallback((key: keyof typeof permissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Sélectionner/désélectionner toutes les permissions
  const toggleAllPermissions = useCallback(() => {
    const allSelected = Object.values(permissions).every((value) => value === true);
    setPermissions({
      reproduction: !allSelected,
      nutrition: !allSelected,
      finance: !allSelected,
      rapports: !allSelected,
      planification: !allSelected,
      mortalites: !allSelected,
      sante: !allSelected,
    });
  }, [permissions]);

  // Envoyer l'invitation
  const handleSendInvitation = useCallback(async () => {
    if (!hasAtLeastOnePermission) {
      Toast.show({
        type: 'error',
        text1: 'Permissions requises',
        text2: 'Veuillez sélectionner au moins une permission',
        visibilityTime: 3000,
      });
      hapticError();
      return;
    }

    if (!scannedProfile || !projetId) {
      Alert.alert('Erreur', 'Données manquantes');
      return;
    }

    // Vérifier qu'on ne s'invite pas soi-même
    if (user?.id === scannedProfile.userId) {
      Alert.alert('Erreur', 'Vous ne pouvez pas vous inviter vous-même');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        scanned_user_id: scannedProfile.userId,
        profile_id: scannedProfile.profileId,
        profile_type: scannedProfile.profileType,
        projet_id: projetId,
        role: role,
        permissions: permissions,
        notes: notes.trim() || null,
      };

      await apiClient.post('/collaborations/from-qr', payload);

      // Recharger les collaborateurs du projet
      await dispatch(loadCollaborateursParProjet(projetId));

      hapticSuccess();
      Toast.show({
        type: 'success',
        text1: 'Invitation envoyée !',
        text2: `${scannedProfile.prenom} ${scannedProfile.nom} recevra une notification et devra accepter l'invitation.`,
        visibilityTime: 4000,
      });

      // Retourner à l'écran précédent
      navigation.goBack();
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'invitation:', error);
      hapticError();

      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      
      // Gestion des erreurs spécifiques
      if (error.response?.status === 400) {
        if (errorMessage.includes('permissions')) {
          Toast.show({
            type: 'error',
            text1: 'Permissions requises',
            text2: 'Veuillez sélectionner au moins une permission',
            visibilityTime: 3000,
          });
        } else {
          Alert.alert('Erreur', errorMessage);
        }
      } else if (error.response?.status === 409) {
        Alert.alert('Déjà collaborateur', 'Cette personne fait déjà partie du projet');
      } else if (error.response?.status === 403) {
        Alert.alert('Limite atteinte', 'Limite de 50 collaborateurs atteinte');
      } else {
        Alert.alert('Erreur', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [scannedProfile, projetId, role, permissions, notes, hasAtLeastOnePermission, dispatch, navigation]);

  // Générer les initiales
  const getInitials = useCallback((nom: string, prenom: string): string => {
    const first = prenom.charAt(0).toUpperCase();
    const last = nom.charAt(0).toUpperCase();
    return first + last;
  }, []);

  if (!scannedProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Données manquantes</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Configurer l'invitation</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1 : Informations du collaborateur scanné (read-only) */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations du collaborateur</Text>
          
          <View style={styles.profileContainer}>
            {scannedProfile.photo ? (
              <Image source={{ uri: scannedProfile.photo }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhotoPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.profileInitials, { color: colors.primary }]}>
                  {getInitials(scannedProfile.nom, scannedProfile.prenom)}
                </Text>
              </View>
            )}
            
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {scannedProfile.prenom} {scannedProfile.nom}
              </Text>
              
              <View style={styles.badgeContainer}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        scannedProfile.profileType === 'veterinarian'
                          ? COLORS.veterinarian + '20'
                          : COLORS.technician + '20',
                    },
                  ]}
                >
                  <Ionicons
                    name={scannedProfile.profileType === 'veterinarian' ? 'medical-outline' : 'construct-outline'}
                    size={14}
                    color={scannedProfile.profileType === 'veterinarian' ? COLORS.veterinarian : COLORS.technician}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          scannedProfile.profileType === 'veterinarian' ? COLORS.veterinarian : COLORS.technician,
                      },
                    ]}
                  >
                    {scannedProfile.profileType === 'veterinarian' ? 'Vétérinaire' : 'Technicien'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.contactInfo}>
                <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.contactText, { color: colors.textSecondary }]}>{scannedProfile.email}</Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.noteBox, { backgroundColor: colors.background }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              Ces informations proviennent du code QR scanné
            </Text>
          </View>
        </View>

        {/* Section 2 : Configuration de l'invitation (éditable) */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Configuration de l'invitation</Text>
          
          {/* Rôle (read-only, pré-rempli) */}
          <View style={styles.roleContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Rôle</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>{ROLE_LABELS[role]}</Text>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            </View>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Déterminé automatiquement depuis le type de profil
            </Text>
          </View>

          {/* Permissions */}
          <View style={styles.permissionsContainer}>
            <View style={styles.permissionsHeader}>
              <Text style={[styles.label, { color: colors.text }]}>Permissions</Text>
              <TouchableOpacity
                style={styles.toggleAllButton}
                onPress={toggleAllPermissions}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text style={[styles.toggleAllText, { color: colors.primary }]}>
                  {Object.values(permissions).every((v) => v) ? 'Tout désélectionner' : 'Tout sélectionner'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.permissionsList}>
              {Object.entries(permissions).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.permissionItem, { borderColor: colors.border }]}
                  onPress={() => togglePermission(key as keyof typeof permissions)}
                  activeOpacity={0.7}
                >
                  <View style={styles.permissionContent}>
                    <Ionicons
                      name={value ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={value ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.permissionLabel, { color: colors.text }]}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.notesContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Notes (optionnel)</Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Ajouter une note pour ce collaborateur..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Section 3 : Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: hasAtLeastOnePermission ? colors.primary : colors.disabled,
              },
              !hasAtLeastOnePermission && styles.buttonDisabled,
            ]}
            onPress={handleSendInvitation}
            disabled={!hasAtLeastOnePermission || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color={colors.textOnPrimary} />
                <Text style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>
                  Envoyer l'invitation
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  section: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.md,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: SPACING.md,
  },
  profilePhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.xs,
  },
  badgeContainer: {
    marginBottom: SPACING.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginLeft: SPACING.xs,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  contactText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  noteText: {
    fontSize: FONT_SIZES.xs,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  roleContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginRight: SPACING.xs,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  permissionsContainer: {
    marginBottom: SPACING.md,
  },
  permissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  toggleAllButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  toggleAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  permissionsList: {
    gap: SPACING.xs,
  },
  permissionItem: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionLabel: {
    fontSize: FONT_SIZES.md,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  notesContainer: {
    marginTop: SPACING.md,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.md,
    minHeight: 100,
    marginTop: SPACING.xs,
  },
  actionsContainer: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
