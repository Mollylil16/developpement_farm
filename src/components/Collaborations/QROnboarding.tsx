/**
 * Onboarding QR Code - Modal explicatif pour la première utilisation
 * Affiche 3 slides expliquant le système QR
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QROnboardingProps {
  visible: boolean;
  onClose: () => void;
}

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  gradientColors: [string, string];
}

const SLIDES: Slide[] = [
  {
    icon: 'qr-code',
    title: 'Partagez votre QR code',
    description: 'Partagez votre QR code professionnel pour être ajouté rapidement aux projets d\'autres producteurs. Votre profil sera accessible en un scan !',
    gradientColors: ['#4A90E2', '#5BA3F0'],
  },
  {
    icon: 'scan',
    title: 'Scanner un collaborateur',
    description: 'Ajoutez rapidement des collaborateurs en scannant leur QR code. Plus besoin de saisir manuellement email ou téléphone !',
    gradientColors: ['#50E3C2', '#6BEDD4'],
  },
  {
    icon: 'notifications',
    title: 'Gérez vos invitations',
    description: 'Recevez des notifications pour chaque invitation. Acceptez ou refusez en quelques clics directement depuis l\'application.',
    gradientColors: ['#FF9800', '#FFB74D'],
  },
];

export default function QROnboarding({ visible, onClose }: QROnboardingProps) {
  const { colors } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
      setCurrentSlide(0);
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      const prevSlide = currentSlide - 1;
      setCurrentSlide(prevSlide);
      scrollViewRef.current?.scrollTo({
        x: prevSlide * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentSlide(slideIndex);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
            transform: [
              {
                scale: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.modalContainer}>
          {/* Bouton fermer */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer l'onboarding"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* ScrollView pour les slides */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {SLIDES.map((slide, index) => (
              <View key={index} style={styles.slide}>
                <LinearGradient
                  colors={slide.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.slideGradient}
                >
                  {/* Icône */}
                  <View style={styles.iconContainer}>
                    <Ionicons name={slide.icon} size={80} color="#FFFFFF" />
                  </View>

                  {/* Titre */}
                  <Text style={styles.slideTitle}>{slide.title}</Text>

                  {/* Description */}
                  <Text style={styles.slideDescription}>{slide.description}</Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>

          {/* Indicateurs de pagination */}
          <View style={styles.pagination}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor:
                      index === currentSlide
                        ? colors.primary
                        : colors.border,
                    width: index === currentSlide ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Boutons de navigation */}
          <View style={styles.actions}>
            {currentSlide > 0 && (
              <TouchableOpacity
                style={[styles.navButton, { borderColor: colors.border }]}
                onPress={handlePrevious}
                accessibilityRole="button"
                accessibilityLabel="Slide précédent"
              >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
                <Text style={[styles.navButtonText, { color: colors.text }]}>
                  Précédent
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleNext}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={
                currentSlide === SLIDES.length - 1
                  ? 'Compris, fermer'
                  : 'Slide suivant'
              }
            >
              <Text style={styles.primaryButtonText}>
                {currentSlide === SLIDES.length - 1 ? 'Compris ✓' : 'Suivant'}
              </Text>
              {currentSlide < SLIDES.length - 1 && (
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: SCREEN_WIDTH * 0.9 * SLIDES.length,
  },
  slide: {
    width: SCREEN_WIDTH * 0.9,
    height: 400,
  },
  slideGradient: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  slideTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  slideDescription: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.lg,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    gap: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  navButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
