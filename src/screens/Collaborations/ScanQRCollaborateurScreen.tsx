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
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SCREENS } from '../../navigation/types';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadProjets } from '../../store/slices/projetSlice';
import apiClient from '../../services/api/apiClient';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, COLORS } from '../../constants/theme';
import { useQRPermissions } from '../../hooks/useQRPermissions';
import PermissionDeniedScreen from '../../components/Collaborations/PermissionDeniedScreen';
import ManualQRInput from '../../components/Collaborations/ManualQRInput';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = 250;

interface ScannedUser {
  userId: string;
  profileId?: string; // ID du profil spécifique (pour QR codes de profil)
  profileType?: 'veterinarian' | 'technician'; // Type de profil (pour QR codes de profil)
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
  const { projetActif } = useAppSelector((state) => state.projet);

  const { hasPermission, isLoading: permissionLoading, requestPermission, openSettings } = useQRPermissions();
  const [scanned, setScanned] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selectedProjetId, setSelectedProjetId] = useState<string>('');

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
          // Vérifier que c'est un QR code de profil (vétérinaire ou technicien)
          if (!response.profileId || !response.profileType) {
            Alert.alert(
              'QR code invalide',
              'Ce code QR n\'est pas celui d\'un vétérinaire ou technicien. Seuls les profils vétérinaire et technicien peuvent être ajoutés via QR code.'
            );
            setScanned(false);
            return;
          }

          // Vérifier que le profileType est valide
          if (response.profileType !== 'veterinarian' && response.profileType !== 'technician') {
            Alert.alert(
              'Type de profil invalide',
              'Ce code QR n\'est pas celui d\'un vétérinaire ou technicien.'
            );
            setScanned(false);
            return;
          }

          // Navigation vers l'écran de configuration de l'invitation
          const { hapticScanSuccess } = await import('../../utils/haptics');
          hapticScanSuccess();
          
          (navigation as any).navigate(SCREENS.QR_INVITATION_CONFIG, {
            scannedProfile: {
              userId: response.userId,
              profileId: response.profileId,
              profileType: response.profileType,
              nom: response.nom,
              prenom: response.prenom,
              email: response.email,
              telephone: response.telephone,
              photo: response.photo,
            },
            projetId: selectedProjetId || projetActif?.id || '',
          });
          
          // Réinitialiser pour permettre un nouveau scan
          setScanned(false);
        } else {
          const { hapticError } = await import('../../utils/haptics');
          hapticError();
          Alert.alert('Impossible d\'ajouter', response.reason || 'Ce collaborateur ne peut pas être ajouté');
          setScanned(false);
        }
      } catch (error: unknown) {
        console.error('Erreur lors de la validation du QR code:', error);
        
        // Gestion des erreurs spécifiques
        const err = error as any;
        const errorMessage = err?.response?.data?.message || err?.message || 'Erreur inconnue';
        
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
        // Vérifier que c'est un QR code de profil (vétérinaire ou technicien)
        if (!response.profileId || !response.profileType) {
          throw new Error('Ce code QR n\'est pas celui d\'un vétérinaire ou technicien. Seuls les profils vétérinaire et technicien peuvent être ajoutés via QR code.');
        }

        // Vérifier que le profileType est valide
        if (response.profileType !== 'veterinarian' && response.profileType !== 'technician') {
          throw new Error('Ce code QR n\'est pas celui d\'un vétérinaire ou technicien.');
        }

        // Navigation vers l'écran de configuration de l'invitation
        setShowManualInput(false);
        
        (navigation as any).navigate(SCREENS.QR_INVITATION_CONFIG, {
          scannedProfile: {
            userId: response.userId,
            profileId: response.profileId,
            profileType: response.profileType,
            nom: response.nom,
            prenom: response.prenom,
            email: response.email,
            telephone: response.telephone,
            photo: response.photo,
          },
          projetId: selectedProjetId || projetActif?.id || '',
        });
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
            facing="back"
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
