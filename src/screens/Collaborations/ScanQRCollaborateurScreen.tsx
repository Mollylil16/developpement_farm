/**
 * ScanQRCollaborateurScreen - Écran pour scanner le QR code d'un collaborateur
 * Permet aux producteurs d'ajouter rapidement des collaborateurs via QR code
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CameraView, CameraType, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadProjets } from '../../store/slices/projetSlice';
import { loadCollaborateursParProjet } from '../../store/slices/collaborationSlice';
import { hapticScanSuccess, hapticInvitationAccepted, hapticError } from '../../utils/haptics';
import Toast from 'react-native-toast-message';
import apiClient from '../../services/api/apiClient';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, COLORS } from '../../constants/theme';
import type { RoleCollaborateur } from '../../types/collaboration';
import { ROLE_LABELS, DEFAULT_PERMISSIONS } from '../../types/collaboration';
import { useQRPermissions } from '../../hooks/useQRPermissions';
import PermissionDeniedScreen from '../../components/Collaborations/PermissionDeniedScreen';
import ManualQRInput from '../../components/Collaborations/ManualQRInput';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = 250;

interface ScannedUser {
  userId: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  photo?: string;
  canBeAdded: boolean;
  reason?: string;
}

interface Projet {
  id: string;
  nom: string;
}

export default function ScanQRCollaborateurScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { projets } = useAppSelector((state) => state.projet);
  const { projetActif } = useAppSelector((state) => state.projet);

  const { hasPermission, isLoading: permissionLoading, requestPermission, openSettings } = useQRPermissions();
  const [scanned, setScanned] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selectedProjetId, setSelectedProjetId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<RoleCollaborateur>('observateur');
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS.observateur);
  const [showProjetPicker, setShowProjetPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  // Animations
  const cornerAnim1 = useRef(new Animated.Value(1)).current;
  const cornerAnim2 = useRef(new Animated.Value(1)).current;
  const cornerAnim3 = useRef(new Animated.Value(1)).current;
  const cornerAnim4 = useRef(new Animated.Value(1)).current;
  const successCheckAnim = useRef(new Animated.Value(0)).current;

  // Initialiser le projet sélectionné
  useEffect(() => {
    if (projetActif?.id) {
      setSelectedProjetId(projetActif.id);
    }
  }, [projetActif]);

  // Charger les projets au montage
  useEffect(() => {
    dispatch(loadProjets());
  }, [dispatch]);

  // Animation des coins du scanner
  useEffect(() => {
    const animateCorner = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      animateCorner(cornerAnim1, 0),
      animateCorner(cornerAnim2, 200),
      animateCorner(cornerAnim3, 400),
      animateCorner(cornerAnim4, 600),
    ];

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [cornerAnim1, cornerAnim2, cornerAnim3, cornerAnim4]);

  // Mettre à jour les permissions quand le rôle change
  useEffect(() => {
    setPermissions(DEFAULT_PERMISSIONS[selectedRole]);
  }, [selectedRole]);

  /**
   * Gère le scan d'un QR code
   */
  const handleBarCodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (scanned || validating) return;

      setScanned(true);
      setValidating(true);

      try {
        // Valider le QR code avec le backend
        const response = await apiClient.post<ScannedUser>('/collaborations/validate-qr', {
          qr_data: data,
          projet_id: selectedProjetId || projetActif?.id || '',
        });

        if (response.canBeAdded) {
          setScannedUser(response);
          setShowConfirmModal(true);
          // Animation de succès
          Animated.spring(successCheckAnim, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
          // Feedback haptique
          const { hapticScanSuccess } = await import('../../utils/haptics');
          hapticScanSuccess();
        } else {
          const { hapticError } = await import('../../utils/haptics');
          hapticError();
          Alert.alert('Impossible d\'ajouter', response.reason || 'Ce collaborateur ne peut pas être ajouté');
          setScanned(false);
        }
      } catch (error: unknown) {
        console.error('Erreur lors de la validation du QR code:', error);
        
        // Gestion des erreurs spécifiques
        const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
        
        if (errorMessage.includes('expiré') || errorMessage.includes('expired')) {
          Alert.alert('Code expiré', 'Ce code a expiré. Demandez un nouveau scan.');
        } else if (errorMessage.includes('invalide') || errorMessage.includes('invalid')) {
          Alert.alert('Code invalide', 'Code non reconnu. Vérifiez et réessayez.');
        } else if (errorMessage.includes('déjà') || errorMessage.includes('already')) {
          Alert.alert('Déjà collaborateur', errorMessage);
        } else if (errorMessage.includes('limite') || errorMessage.includes('limit')) {
          Alert.alert('Limite atteinte', 'Limite de 50 collaborateurs atteinte.');
        } else if (errorMessage.includes('vous-même') || errorMessage.includes('yourself')) {
          Alert.alert('Auto-ajout impossible', 'Vous ne pouvez pas vous ajouter vous-même.');
        } else {
          Alert.alert('Erreur', errorMessage);
        }
        
        setScanned(false);
      } finally {
        setValidating(false);
      }
    },
    [scanned, validating, selectedProjetId, projetActif, successCheckAnim]
  );

  /**
   * Valide un code manuel (utilisé par ManualQRInput)
   */
  const handleManualValidate = useCallback(async (qrCode: string) => {
    setValidating(true);
    try {
      const response = await apiClient.post<ScannedUser>('/collaborations/validate-qr', {
        qr_data: qrCode,
        projet_id: selectedProjetId || projetActif?.id || '',
      });

      if (response.canBeAdded) {
        setScannedUser(response);
        setShowManualInput(false);
        setShowConfirmModal(true);
        Animated.spring(successCheckAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      } else {
        throw new Error(response.reason || 'Ce collaborateur ne peut pas être ajouté');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      throw new Error(errorMessage);
    } finally {
      setValidating(false);
    }
  }, [selectedProjetId, projetActif, successCheckAnim]);

  /**
   * Ajoute le collaborateur au projet
   */
  const handleAddCollaborator = useCallback(async () => {
    if (!scannedUser || !selectedProjetId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un projet');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/collaborations/from-qr', {
        scanned_user_id: scannedUser.userId,
        projet_id: selectedProjetId,
        role: selectedRole,
        permissions: permissions,
      });

      // Recharger les collaborateurs du projet
      await dispatch(loadCollaborateursParProjet(selectedProjetId));

      // Animation de succès
      Animated.spring(successCheckAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      // Fermer le modal et rediriger
      setShowConfirmModal(false);
      setScannedUser(null);
      setScanned(false);

      Alert.alert(
        'Succès',
        `${scannedUser.prenom} ${scannedUser.nom} a été ajouté au projet`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du collaborateur:', error);
      hapticError();
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: errorMessage,
        visibilityTime: 4000,
      });
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [scannedUser, selectedProjetId, selectedRole, permissions, dispatch, navigation, successCheckAnim]);

  /**
   * Génère les initiales
   */
  const getInitials = useCallback((nom: string, prenom: string): string => {
    const first = prenom.charAt(0).toUpperCase();
    const last = nom.charAt(0).toUpperCase();
    return first + last;
  }, []);

  // Si pas de permission, afficher l'écran de permission
  if (!hasPermission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Permission caméra requise
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            Pour scanner les QR codes, nous avons besoin d'accéder à votre caméra.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, { color: colors.textOnPrimary }]}>
              Autoriser la caméra
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.permissionButton, styles.permissionButtonSecondary, { borderColor: colors.primary }]}
            onPress={() => setShowManualInput(true)}
          >
            <Text style={[styles.permissionButtonText, { color: colors.primary }]}>
              Saisir le code manuellement
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off-outline" size={64} color={colors.error} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Permission caméra refusée
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            Pour scanner les QR codes, veuillez autoriser l'accès à la caméra dans les paramètres.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={openSettings}
          >
            <Text style={[styles.permissionButtonText, { color: colors.textOnPrimary }]}>
              Ouvrir les paramètres
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.permissionButton, styles.permissionButtonSecondary, { borderColor: colors.primary }]}
            onPress={() => setShowManualInput(true)}
          >
            <Text style={[styles.permissionButtonText, { color: colors.primary }]}>
              Saisir le code manuellement
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top']}>
      {/* Scanner */}
      {/* Composant de saisie manuelle */}
      <ManualQRInput
        visible={showManualInput}
        onClose={() => setShowManualInput(false)}
        onValidate={handleManualValidate}
        isLoading={validating}
      />

      {/* Composant de saisie manuelle */}
      <ManualQRInput
        visible={showManualInput}
        onClose={() => setShowManualInput(false)}
        onValidate={handleManualValidate}
        isLoading={validating}
      />

      <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing={CameraType.back}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />

          {/* Overlay sombre avec trou transparent */}
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlayLeft} />
              <View style={styles.scanArea}>
                {/* Coins animés */}
                <Animated.View
                  style={[
                    styles.corner,
                    styles.cornerTopLeft,
                    { transform: [{ scale: cornerAnim1 }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.corner,
                    styles.cornerTopRight,
                    { transform: [{ scale: cornerAnim2 }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.corner,
                    styles.cornerBottomLeft,
                    { transform: [{ scale: cornerAnim3 }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.corner,
                    styles.cornerBottomRight,
                    { transform: [{ scale: cornerAnim4 }] },
                  ]}
                />
              </View>
              <View style={styles.overlayRight} />
            </View>
            <View style={styles.overlayBottom} />
          </View>

          {/* Texte en haut */}
          <View style={styles.topTextContainer}>
            <Text style={styles.topText}>Scannez le QR code du collaborateur</Text>
          </View>

          {/* Boutons en bas */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={[styles.bottomButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowManualInput(true)}
            >
              <Ionicons name="create-outline" size={20} color={colors.text} />
              <Text style={[styles.bottomButtonText, { color: colors.text }]}>
                Saisir manuellement
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bottomButton, styles.backButton, { backgroundColor: colors.surface }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Indicateur de validation */}
          {validating && (
            <View style={styles.validatingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.validatingText}>Validation en cours...</Text>
            </View>
          )}
        </View>
          )}

      {/* Modal de confirmation */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowConfirmModal(false);
          setScanned(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Animation de succès */}
              <View style={styles.successContainer}>
                <Animated.View
                  style={[
                    styles.successCheck,
                    {
                      transform: [
                        {
                          scale: successCheckAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, 1.2, 1],
                          }),
                        },
                      ],
                      opacity: successCheckAnim,
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                </Animated.View>
              </View>

              {/* Photo/Avatar */}
              <View style={styles.userInfoContainer}>
                {scannedUser?.photo ? (
                  <Image
                    source={{ uri: scannedUser.photo }}
                    style={styles.userPhoto}
                  />
                ) : (
                  <View style={[styles.userAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.userAvatarText, { color: colors.primary }]}>
                      {scannedUser ? getInitials(scannedUser.nom, scannedUser.prenom) : '?'}
                    </Text>
                  </View>
                )}

                {/* Nom */}
                <Text style={[styles.userName, { color: colors.text }]}>
                  {scannedUser?.prenom} {scannedUser?.nom}
                </Text>

                {/* Email et téléphone */}
                {scannedUser?.email && (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.userDetailText, { color: colors.textSecondary }]}>
                      {scannedUser.email}
                    </Text>
                  </View>
                )}
                {scannedUser?.telephone && (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.userDetailText, { color: colors.textSecondary }]}>
                      {scannedUser.telephone}
                    </Text>
                  </View>
                )}
              </View>

              {/* Message */}
              <Text style={[styles.confirmMessage, { color: colors.text }]}>
                Voulez-vous ajouter {scannedUser?.prenom} {scannedUser?.nom} à votre projet ?
              </Text>

              {/* Formulaire de configuration */}
              <View style={styles.configForm}>
                {/* Sélection du projet */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Projet</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    onPress={() => setShowProjetPicker(!showProjetPicker)}
                  >
                    <Text style={[styles.pickerButtonText, { color: colors.text }]}>
                      {projets.find((p) => p.id === selectedProjetId)?.nom || 'Sélectionner un projet'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {showProjetPicker && (
                    <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {projets.map((projet) => (
                        <TouchableOpacity
                          key={projet.id}
                          style={styles.pickerOption}
                          onPress={() => {
                            setSelectedProjetId(projet.id);
                            setShowProjetPicker(false);
                          }}
                        >
                          <Text style={[styles.pickerOptionText, { color: colors.text }]}>{projet.nom}</Text>
                          {selectedProjetId === projet.id && (
                            <Ionicons name="checkmark" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Sélection du rôle */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Rôle</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    onPress={() => setShowRolePicker(!showRolePicker)}
                  >
                    <Text style={[styles.pickerButtonText, { color: colors.text }]}>
                      {ROLE_LABELS[selectedRole]}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {showRolePicker && (
                    <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {(['veterinaire', 'ouvrier', 'observateur'] as RoleCollaborateur[]).map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={styles.pickerOption}
                          onPress={() => {
                            setSelectedRole(role);
                            setShowRolePicker(false);
                          }}
                        >
                          <Text style={[styles.pickerOptionText, { color: colors.text }]}>{ROLE_LABELS[role]}</Text>
                          {selectedRole === role && (
                            <Ionicons name="checkmark" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Permissions */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Permissions</Text>
                  {Object.entries(permissions).map(([key, value]) => (
                    <View key={key} style={styles.permissionRow}>
                      <Text style={[styles.permissionLabel, { color: colors.text }]}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Text>
                      <Switch
                        value={value}
                        onValueChange={(newValue) =>
                          setPermissions((prev) => ({ ...prev, [key]: newValue }))
                        }
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={value ? colors.textOnPrimary : colors.textSecondary}
                      />
                    </View>
                  ))}
                </View>
              </View>

              {/* Boutons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowConfirmModal(false);
                    setScanned(false);
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: colors.primary }]}
                  onPress={handleAddCollaborator}
                  disabled={loading || !selectedProjetId}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textOnPrimary} />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: colors.textOnPrimary }]}>
                      Ajouter au projet
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTop: {
    flex: 1,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlayLeft: {
    flex: 1,
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  overlayRight: {
    flex: 1,
  },
  overlayBottom: {
    flex: 1,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4A90E2',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  topTextContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  backButton: {
    flex: 0,
    width: 50,
  },
  bottomButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  validatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validatingText: {
    color: '#FFFFFF',
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.sm,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  permissionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  permissionButton: {
    width: '100%',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  permissionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  permissionButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  manualContainer: {
    flex: 1,
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  manualTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
  },
  manualContent: {
    flex: 1,
  },
  manualContentContainer: {
    padding: SPACING.lg,
  },
  manualLabel: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.lg,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  manualButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: SCREEN_HEIGHT * 0.9,
    padding: SPACING.lg,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successCheck: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  userPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.md,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  userAvatarText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  userDetailText: {
    fontSize: FONT_SIZES.sm,
  },
  confirmMessage: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  configForm: {
    marginBottom: SPACING.xl,
  },
  formField: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  pickerButtonText: {
    fontSize: FONT_SIZES.md,
  },
  pickerDropdown: {
    marginTop: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  pickerOptionText: {
    fontSize: FONT_SIZES.md,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  permissionLabel: {
    fontSize: FONT_SIZES.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  modalButtonConfirm: {
    ...COLORS.shadow.small,
  },
  modalButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});
