/**
 * ProfileQRCodeScreen - Écran pour afficher et partager le QR code de l'utilisateur
 * Permet aux autres utilisateurs de scanner le QR code pour ajouter rapidement l'utilisateur à leurs projets
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
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector } from '../../store/hooks';
import apiClient from '../../services/api/apiClient';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, COLORS } from '../../constants/theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QRCodeResponse {
  qr_code: string; // data:image/png;base64,...
  expires_in: number; // secondes
}

export default function ProfileQRCodeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);

  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0); // secondes restantes
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState<string>(''); // Valeur décodée du QR pour affichage

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Timer pour le countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const expirationTimeRef = useRef<number>(0);

  /**
   * Extrait la valeur base64 du QR code depuis le data URL
   */
  const extractQRValue = useCallback((dataUrl: string): string => {
    try {
      // Format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
      const base64Match = dataUrl.match(/base64,(.+)/);
      if (base64Match) {
        const base64Data = base64Match[1];
        // Décoder le base64 pour obtenir le JSON
        const jsonData = Buffer.from(base64Data, 'base64').toString('utf8');
        const qrData = JSON.parse(jsonData);
        // Retourner le base64 original pour le QR code SVG
        return base64Data;
      }
      return '';
    } catch (error) {
      console.error('Erreur lors de l\'extraction de la valeur QR:', error);
      return '';
    }
  }, []);

  /**
   * Charge le QR code depuis l'API
   */
  const loadQRCode = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRegenerating(true);
      }
      setError(null);

      const response = await apiClient.get<QRCodeResponse>('/users/me/qr-code?expiry=5');
      
      if (response.qr_code) {
        setQrCodeData(response.qr_code);
        setExpiresIn(response.expires_in);
        expirationTimeRef.current = Date.now() + response.expires_in * 1000;
        
        // Extraire la valeur pour le QR code SVG
        const qrValue = extractQRValue(response.qr_code);
        setQrCodeValue(qrValue);

        // Démarrer le countdown
        startCountdown(response.expires_in);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement du QR code:', err);
      setError(err.message || 'Erreur lors du chargement du QR code');
      Alert.alert('Erreur', 'Impossible de charger le QR code. Veuillez réessayer.');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [extractQRValue]);

  /**
   * Démarre le countdown timer
   */
  const startCountdown = useCallback((initialSeconds: number) => {
    // Nettoyer le timer précédent
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let remainingSeconds = initialSeconds;

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
  }, [progressAnim, loadQRCode]);

  /**
   * Formate le temps restant en MM:SS
   */
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Calcule le pourcentage de progression
   */
  const progressPercentage = useCallback((seconds: number, total: number): number => {
    if (total === 0) return 0;
    return Math.max(0, Math.min(100, (seconds / total) * 100));
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
          dialogTitle: 'Partager mon QR code',
        });
      } else {
        // Fallback: copier le texte
        await Clipboard.setStringAsync(qrCodeValue || '');
        Alert.alert('Copié', 'Le code QR a été copié dans le presse-papiers');
      }
    } catch (err: any) {
      console.error('Erreur lors du partage:', err);
      Alert.alert('Erreur', 'Impossible de partager le QR code');
    }
  }, [qrCodeData, qrCodeValue]);

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
   * Copie le code texte (fallback)
   */
  const handleCopyCode = useCallback(async () => {
    if (!qrCodeValue) {
      Alert.alert('Erreur', 'Aucun code à copier');
      return;
    }

    try {
      await Clipboard.setStringAsync(qrCodeValue);
      Alert.alert('Copié', 'Le code a été copié dans le presse-papiers');
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      Alert.alert('Erreur', 'Impossible de copier le code');
    }
  }, [qrCodeValue]);

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
   * Obtient le rôle/métier de l'utilisateur
   */
  const getUserRole = useCallback((): string => {
    if (!user) return '';
    if (user.activeRole === 'producer') return 'Producteur';
    if (user.activeRole === 'buyer') return 'Acheteur';
    if (user.activeRole === 'veterinarian') return 'Vétérinaire';
    if (user.activeRole === 'technician') return 'Technicien';
    return 'Utilisateur';
  }, [user]);

  // Charger le QR code au montage
  useEffect(() => {
    loadQRCode(true);

    // Animation d'entrée
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
  }, []);

  // Nettoyer le timer au démontage
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mon QR Code</Text>
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
                  <Image
                    source={{ uri: user.photo }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {getInitials()}
                  </Text>
                )}
              </View>

              {/* Nom */}
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.prenom} {user?.nom}
              </Text>

              {/* Rôle */}
              <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                {getUserRole()}
              </Text>

              {/* QR Code */}
              {loading ? (
                <View style={styles.qrCodePlaceholder}>
                  <ActivityIndicator size="large" color={colors.primary} />
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
              ) : qrCodeValue ? (
                <View style={styles.qrCodeWrapper}>
                  <View style={[styles.qrCodeContainer, { borderColor: colors.border }]}>
                    <QRCode
                      value={qrCodeValue}
                      size={250}
                      color={colors.text}
                      backgroundColor={colors.surface}
                      logo={user?.photo ? { uri: user.photo } : undefined}
                      logoSize={50}
                      logoBackgroundColor={colors.surface}
                      logoMargin={5}
                      logoBorderRadius={25}
                    />
                  </View>
                </View>
              ) : null}

              {/* Texte explicatif */}
              <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                Scannez ce code pour m'ajouter à vos projets
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

            {/* Boutons d'action */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleShare}
                disabled={loading || !qrCodeData}
              >
                <Ionicons name="share-outline" size={20} color={colors.textOnPrimary} />
                <Text style={[styles.actionButtonText, { color: colors.textOnPrimary }]}>
                  Partager
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: colors.primary }]}
                onPress={handleRegenerate}
                disabled={loading || regenerating}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary, { color: colors.primary }]}>
                  Régénérer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: colors.primary }]}
                onPress={handleCopyCode}
                disabled={loading || !qrCodeValue}
              >
                <Ionicons name="copy-outline" size={20} color={colors.primary} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary, { color: colors.primary }]}>
                  Copier
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
    fontSize: FONT_SIZES.xl,
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
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  qrCodePlaceholder: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.lg,
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
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  explanationText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
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
  actionsContainer: {
    marginTop: SPACING.xl,
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
