/**
 * CollaborationVetTechScreen - Écran pour afficher le QR code de profil (vétérinaire/technicien)
 * Accessible depuis l'onglet Collaboration pour les profils vétérinaire et technicien
 * Permet aux producteurs de scanner le QR code pour ajouter le profil spécifique à leurs projets
 * IMPORTANT: Le QR code est basé sur profileId (ex: profile_user123_veterinarian) et non userId
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Dimensions,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector } from '../../store/hooks';
import { useRole } from '../../contexts/RoleContext';
import { triggerHaptic } from '../../utils/haptics';
import Toast from 'react-native-toast-message';
import apiClient from '../../services/api/apiClient';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, COLORS } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProfileQRCodeResponse {
  qr_code: string; // data:image/png;base64,...
  expires_in: number; // secondes
  profileId: string; // ex: profile_user123_veterinarian
  profileType: 'veterinarian' | 'technician';
  profileName: string;
}

export default function CollaborationVetTechScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const { activeRole } = useRole();

  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0); // secondes restantes
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileInfo, setProfileInfo] = useState<{
    profileId: string;
    profileType: string;
    profileName: string;
  } | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const infoHeightAnim = useRef(new Animated.Value(0)).current;

  // Timer pour le countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const expirationTimeRef = useRef<number>(0);

  // Vérifier que l'utilisateur a un profil vétérinaire ou technicien actif
  useEffect(() => {
    if (activeRole !== 'veterinarian' && activeRole !== 'technician') {
      Alert.alert(
        'Accès refusé',
        'Cet écran est réservé aux profils vétérinaire et technicien.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [activeRole, navigation]);

  /**
   * Charge le QR code depuis l'API (basé sur profileId)
   */
  const loadQRCode = useCallback(async (showLoading = true) => {
    // Ne pas charger si l'écran n'est pas focus (visible) ou si le profil n'est pas valide
    if (!isFocused || (activeRole !== 'veterinarian' && activeRole !== 'technician')) {
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRegenerating(true);
      }
      setError(null);

      // Utiliser l'endpoint spécifique pour les profils vétérinaire/technicien
      const response = await apiClient.get<ProfileQRCodeResponse>(
        '/collaborations/qr-code/profile?expiry=5'
      );

      if (response.qr_code) {
        setQrCodeData(response.qr_code);
        setExpiresIn(response.expires_in);
        setProfileInfo({
          profileId: response.profileId,
          profileType: response.profileType,
          profileName: response.profileName,
        });
        expirationTimeRef.current = Date.now() + response.expires_in * 1000;

        // Démarrer le countdown
        startCountdown(response.expires_in);
      }
    } catch (err: unknown) {
      console.error('Erreur lors du chargement du QR code:', err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        'Erreur lors du chargement du QR code';
      setError(errorMessage);

      const errorStatus = (err as { response?: { status?: number } })?.response?.status;
      if (isFocused && errorStatus !== 401 && errorStatus !== 403) {
        Alert.alert(
          'Erreur de chargement',
          errorMessage || 'Impossible de charger votre QR code. Veuillez réessayer plus tard.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [isFocused, activeRole]);

  /**
   * Démarre le countdown timer
   */
  const startCountdown = useCallback(
    (initialSeconds: number) => {
      // Nettoyer le timer précédent
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      let remainingSeconds = initialSeconds;

      // Réinitialiser l'animation de progression
      progressAnim.setValue(1);

      // Animation de la barre de progression
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: remainingSeconds * 1000,
        useNativeDriver: false,
      }).start();

      timerRef.current = setInterval(() => {
        remainingSeconds -= 1;

        if (remainingSeconds <= 0) {
          // QR code expiré
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setExpiresIn(0);

          // Proposer la régénération
          Alert.alert(
            'QR Code expiré',
            'Votre QR code a expiré. Souhaitez-vous en générer un nouveau ?',
            [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Régénérer', onPress: () => loadQRCode(false) },
            ]
          );
        } else {
          setExpiresIn(remainingSeconds);
        }
      }, 1000);
    },
    [progressAnim, loadQRCode]
  );

  /**
   * Formate le temps restant en MM:SS
   */
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Partage le QR code
   */
  const handleShare = useCallback(async () => {
    if (!qrCodeData) {
      Alert.alert('Erreur', 'Aucun QR code à partager');
      return;
    }

    try {
      // Convertir le data URL en fichier temporaire
      const base64Data = qrCodeData.split(',')[1];
      const filename = FileSystem.cacheDirectory + `qr-code-${Date.now()}.png`;

      await FileSystem.writeAsStringAsync(filename, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Vérifier si le partage est disponible
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(filename, {
          mimeType: 'image/png',
          dialogTitle: 'Partager mon QR code professionnel',
        });
        triggerHaptic('success');
        Toast.show({
          type: 'success',
          text1: 'QR code partagé ✓',
          text2: 'Votre QR code a été partagé avec succès',
          visibilityTime: 2000,
        });
      } else {
        // Fallback: copier le data URL
        await Clipboard.setStringAsync(qrCodeData || '');
        triggerHaptic('light');
        Toast.show({
          type: 'success',
          text1: 'QR code copié ✓',
          text2: 'Le code a été copié dans le presse-papiers',
          visibilityTime: 2000,
        });
      }
    } catch (err: unknown) {
      console.error('Erreur lors du partage:', err);
      Alert.alert('Erreur', 'Impossible de partager le QR code');
    }
  }, [qrCodeData]);

  /**
   * Régénère le QR code
   */
  const handleRegenerate = useCallback(() => {
    Alert.alert(
      'Régénérer le QR code',
      'Voulez-vous générer un nouveau QR code ? L\'ancien deviendra invalide.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Régénérer', onPress: () => loadQRCode(false) },
      ]
    );
  }, [loadQRCode]);

  /**
   * Toggle la section informative
   */
  const toggleInfo = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowInfo(!showInfo);

    Animated.timing(infoHeightAnim, {
      toValue: showInfo ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showInfo, infoHeightAnim]);

  /**
   * Génère les initiales de l'utilisateur
   */
  const getInitials = useCallback((): string => {
    if (!user) return '?';
    const nom = user.nom || '';
    const prenom = user.prenom || '';
    const first = prenom.charAt(0).toUpperCase();
    const last = nom.charAt(0).toUpperCase();
    return first + last || '?';
  }, [user]);

  /**
   * Obtient le nom du profil
   */
  const getProfileTypeLabel = useCallback((): string => {
    if (activeRole === 'veterinarian') return 'Vétérinaire';
    if (activeRole === 'technician') return 'Technicien';
    return 'Profil';
  }, [activeRole]);

  // Charger le QR code quand l'écran est focus ou que le profil actif change
  useEffect(() => {
    if (!isFocused || (activeRole !== 'veterinarian' && activeRole !== 'technician')) return;

    let isMounted = true;

    const loadData = async () => {
      if (isMounted && isFocused) {
        await loadQRCode(true);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isFocused, activeRole, loadQRCode]);

  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Nettoyage au démontage
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fadeAnim, slideAnim]);

  // Si le profil n'est pas vétérinaire ou technicien, ne rien afficher
  if (activeRole !== 'veterinarian' && activeRole !== 'technician') {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mon QR Code Professionnel</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Gradient Background */}
      <LinearGradient
        colors={['#4A90E2', '#50E3C2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.cardContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Card */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {/* Avatar */}
              <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
                {user?.photo ? (
                  <Image source={{ uri: user.photo }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitials()}</Text>
                )}
              </View>

              {/* Nom */}
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.prenom} {user?.nom}
              </Text>

              {/* Type de profil */}
              <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                {getProfileTypeLabel()}
              </Text>

              {/* QR Code */}
              {loading ? (
                <View style={styles.qrCodePlaceholder}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Génération du QR code...
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.qrCodePlaceholder}>
                  <Ionicons name="alert-circle" size={48} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                    onPress={() => loadQRCode(true)}
                  >
                    <Text style={[styles.retryButtonText, { color: colors.textOnPrimary }]}>
                      Réessayer
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : qrCodeData ? (
                <View style={styles.qrCodeWrapper}>
                  <View
                    style={[
                      styles.qrCodeContainer,
                      { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
                    ]}
                  >
                    <Image source={{ uri: qrCodeData }} style={styles.qrCodeImage} resizeMode="contain" />
                  </View>
                </View>
              ) : null}

              {/* Texte explicatif */}
              <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                Partagez ce code QR avec un producteur pour qu'il puisse vous ajouter à son projet en tant
                que {getProfileTypeLabel().toLowerCase()}
              </Text>

              {/* Timer et barre de progression */}
              {expiresIn > 0 && (
                <View style={styles.timerContainer}>
                  <View style={styles.timerRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.timerText, { color: colors.textSecondary }]}>
                      Expire dans {formatTime(expiresIn)}
                    </Text>
                  </View>

                  {/* Barre de progression */}
                  <View style={[styles.progressBarContainer, { backgroundColor: colors.borderLight }]}>
                    <Animated.View
                      style={[
                        styles.progressBar,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                          backgroundColor: expiresIn < 60 ? colors.error : colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Indicateur de régénération */}
              {regenerating && (
                <View style={styles.regeneratingIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.regeneratingText, { color: colors.textSecondary }]}>
                    Génération en cours...
                  </Text>
                </View>
              )}
            </View>

            {/* Section informative (accordéon) */}
            <TouchableOpacity
              style={[styles.infoSection, { backgroundColor: colors.surface }]}
              onPress={toggleInfo}
              activeOpacity={0.7}
            >
              <View style={styles.infoHeader}>
                <View style={styles.infoHeaderLeft}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.infoTitle, { color: colors.text }]}>Comment ça marche ?</Text>
                </View>
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: infoHeightAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </Animated.View>
              </View>

              {showInfo && (
                <Animated.View
                  style={[
                    styles.infoContent,
                    {
                      opacity: infoHeightAnim,
                      maxHeight: infoHeightAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 200],
                      }),
                    },
                  ]}
                >
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Ce QR code est unique à votre profil {getProfileTypeLabel().toLowerCase()}. Si vous
                    changez de profil actif, un nouveau QR code sera généré. Les producteurs peuvent
                    scanner ce code pour vous ajouter rapidement à leurs projets. Vous recevrez une
                    notification et pourrez accepter ou refuser l'invitation.
                  </Text>
                </Animated.View>
              )}
            </TouchableOpacity>

            {/* Boutons d'action */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary, { backgroundColor: '#4A90E2' }]}
                onPress={handleShare}
                disabled={loading || !qrCodeData}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Partager mon QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: '#4A90E2' }]}
                onPress={handleRegenerate}
                disabled={loading || regenerating}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={20} color="#4A90E2" />
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary, { color: '#4A90E2' }]}>
                  Régénérer
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
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
    paddingVertical: SPACING.sm,
    ...COLORS.shadow.small,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT - 100,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  card: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...COLORS.shadow.large,
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  userRole: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  qrCodePlaceholder: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  qrCodeWrapper: {
    marginVertical: SPACING.lg,
  },
  qrCodeContainer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 3,
    ...COLORS.shadow.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeImage: {
    width: 250,
    height: 250,
  },
  explanationText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    lineHeight: 20,
  },
  timerContainer: {
    width: '100%',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  timerText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  regeneratingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  regeneratingText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
  },
  infoSection: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...COLORS.shadow.small,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  infoContent: {
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    minHeight: 50,
  },
  actionButtonPrimary: {
    ...COLORS.shadow.medium,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  actionButtonTextSecondary: {
    color: '#4A90E2',
  },
});
