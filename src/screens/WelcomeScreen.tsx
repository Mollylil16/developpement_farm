/**
 * Page de bienvenue avec thème élevage - Design convivial et accueillant amélioré
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, Dimensions, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';

const logoImage = require('../../assets/logo.jpeg');

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.5)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const featureAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.9)).current;

  // Animations pour le porc principal
  const pigScaleAnim = useRef(new Animated.Value(0.8)).current;
  const pigBounceAnim = useRef(new Animated.Value(0)).current;
  const pigWinkAnim = useRef(new Animated.Value(1)).current; // 1 = œil ouvert, 0 = œil fermé
  const pigMouthAnim = useRef(new Animated.Value(0)).current; // 0 = fermé, 1 = ouvert
  const pigSmileAnim = useRef(new Animated.Value(0)).current; // Rotation pour sourire

  // Animations pour les petits porcs décoratifs
  const smallPigsAnimations = useRef([
    { scale: new Animated.Value(0), rotate: new Animated.Value(0), opacity: new Animated.Value(0) },
    { scale: new Animated.Value(0), rotate: new Animated.Value(0), opacity: new Animated.Value(0) },
    { scale: new Animated.Value(0), rotate: new Animated.Value(0), opacity: new Animated.Value(0) },
  ]).current;

  useEffect(() => {
    // Animation d'entrée fluide avec délai progressif pour le contenu
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATIONS.duration.slow,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation du logo : entrée avec bounce et scale
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de rotation douce continue pour le logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotateAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotateAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation de pulsation pour l'effet glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animations en cascade pour les features
    featureAnimations.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(400 + index * 100),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Animation du bouton
    Animated.sequence([
      Animated.delay(800),
      Animated.spring(buttonScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation du porc principal - Entrée avec bounce
    Animated.sequence([
      Animated.delay(300),
      Animated.spring(pigScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de bounce continue pour le porc
    Animated.loop(
      Animated.sequence([
        Animated.timing(pigBounceAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pigBounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation de clin d'œil répétée (toutes les 3 secondes)
    const winkAnimation = () => {
      Animated.sequence([
        Animated.timing(pigWinkAnim, {
          toValue: 0, // Fermer l'œil
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pigWinkAnim, {
          toValue: 1, // Ouvrir l'œil
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.delay(3000), // Attendre 3 secondes avant le prochain clin d'œil
      ]).start(() => winkAnimation());
    };
    Animated.delay(2000).start(() => winkAnimation());

    // Animation de bouche qui s'ouvre (sourire)
    Animated.loop(
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(pigMouthAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(pigMouthAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
      ])
    ).start();

    // Animation de sourire (rotation subtile)
    Animated.loop(
      Animated.sequence([
        Animated.delay(4500),
        Animated.timing(pigSmileAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(400),
        Animated.timing(pigSmileAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
      ])
    ).start();

    // Animations des petits porcs décoratifs
    smallPigsAnimations.forEach((pigAnim, index) => {
      Animated.sequence([
        Animated.delay(600 + index * 200),
        Animated.parallel([
          Animated.spring(pigAnim.scale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(pigAnim.opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Rotation continue pour les petits porcs
      Animated.loop(
        Animated.sequence([
          Animated.timing(pigAnim.rotate, {
            toValue: 1,
            duration: 3000 + index * 500,
            useNativeDriver: true,
          }),
          Animated.timing(pigAnim.rotate, {
            toValue: 0,
            duration: 3000 + index * 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const logoRotation = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  // Interpolations pour les animations du porc
  const pigBounceY = pigBounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const pigSmileRotation = pigSmileAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  const pigMouthScale = pigMouthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  // Interpolations pour les petits porcs
  const smallPigsRotations = smallPigsAnimations.map((pigAnim) =>
    pigAnim.rotate.interpolate({
      inputRange: [0, 1],
      outputRange: ['-15deg', '15deg'],
    })
  );

  const handleGetStarted = () => {
    // Naviguer vers l'écran de création de compte (première connexion)
    navigation.navigate(SCREENS.ONBOARDING_AUTH as never);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Gradient de fond */}
      <View style={styles.gradientBackground}>
        <View style={[styles.gradientTop, { backgroundColor: colors.primaryLight + '08' }]} />
        <View style={[styles.gradientBottom, { backgroundColor: colors.primary + '05' }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.animatedContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Porc principal animé avec clin d'œil et sourire */}
          <View style={styles.pigMainWrapper}>
            {/* Petits porcs décoratifs autour */}
            {smallPigsAnimations.map((pigAnim, index) => {
              const positions = [
                { top: -20, right: -30 },
                { bottom: -20, left: -30 },
                { top: 50, right: -50 },
              ];
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.smallPig,
                    positions[index],
                    {
                      opacity: pigAnim.opacity,
                      transform: [{ scale: pigAnim.scale }, { rotate: smallPigsRotations[index] }],
                    },
                  ]}
                >
                  <Text style={styles.smallPigEmoji}>🐷</Text>
                </Animated.View>
              );
            })}

            {/* Porc principal avec animations */}
            <Animated.View
              style={[
                styles.pigMainContainer,
                {
                  transform: [
                    { scale: pigScaleAnim },
                    { translateY: pigBounceY },
                    { rotate: pigSmileRotation },
                  ],
                },
              ]}
            >
              {/* Corps du porc */}
              <View style={styles.pigBody}>
                {/* Porc principal */}
                <Text style={styles.pigEmoji}>🐷</Text>

                {/* Overlay de clin d'œil (simule l'œil fermé) */}
                <Animated.View
                  style={[
                    styles.pigWinkOverlay,
                    {
                      opacity: pigWinkAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                    },
                  ]}
                >
                  {/* Simule l'œil fermé avec un trait */}
                  <View style={[styles.winkLine, { backgroundColor: colors.text }]} />
                </Animated.View>

                {/* Bouche animée (sourire qui apparaît) */}
                <Animated.View
                  style={[
                    styles.pigMouth,
                    {
                      opacity: pigMouthAnim,
                      transform: [{ scale: pigMouthScale }],
                    },
                  ]}
                >
                  <Text style={styles.pigMouthEmoji}>😊</Text>
                </Animated.View>
              </View>
            </Animated.View>
          </View>

          {/* Logo avec animations multiples */}
          <View style={styles.logoWrapper}>
            {/* Effet glow animé */}
            <Animated.View
              style={[
                styles.logoGlow,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                  backgroundColor: colors.primaryLight,
                },
              ]}
            />

            {/* Container du logo avec rotation douce */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  transform: [{ scale: logoScaleAnim }, { rotate: logoRotation }],
                  backgroundColor: colors.surface,
                  borderColor: colors.primaryLight + '50',
                  ...colors.shadow.large,
                },
              ]}
            >
              <Image source={logoImage} style={styles.logo} resizeMode="contain" />
            </Animated.View>
          </View>

          {/* Titre principal avec gradient */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Bienvenue sur</Text>
            <Text style={[styles.titleAccent, { color: colors.primary }]}>Fermier Pro</Text>
          </View>

          {/* Sous-titre amélioré */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Votre assistant intelligent pour la gestion de votre élevage porcin
          </Text>

          {/* Fonctionnalités principales avec animations en cascade */}
          <View style={styles.featuresContainer}>
            {[
              {
                icon: '🐷',
                title: 'Suivi Reproduction',
                desc: 'Gestion complète des gestations et sevrages',
                pigIcon: '🐽',
              },
              {
                icon: '💰',
                title: 'Finances',
                desc: 'Suivi des dépenses et revenus en temps réel',
                pigIcon: '🐷',
              },
              {
                icon: '📊',
                title: 'Analyses',
                desc: 'Rapports détaillés et indicateurs de performance',
                pigIcon: '🐖',
              },
              {
                icon: '📅',
                title: 'Planification',
                desc: 'Organisation optimale de vos tâches quotidiennes',
                pigIcon: '🐽',
              },
            ].map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureWrapper,
                  {
                    opacity: featureAnimations[index],
                    transform: [
                      {
                        translateX: featureAnimations[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-50, 0],
                        }),
                      },
                      {
                        scale: featureAnimations[index],
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.feature,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                      ...colors.shadow.medium,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.featureIconContainer,
                      {
                        backgroundColor: colors.primaryLight + '15',
                        borderColor: colors.primaryLight + '30',
                      },
                    ]}
                  >
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                    <Text style={styles.featurePigIcon}>{feature.pigIcon}</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={[styles.featureTitle, { color: colors.text }]}>
                      {feature.title}
                    </Text>
                    <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                      {feature.desc}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Bouton d'action avec animation */}
          <Animated.View
            style={[
              styles.actions,
              {
                transform: [{ scale: buttonScaleAnim }],
                opacity: buttonScaleAnim,
              },
            ]}
          >
            <Button
              title="Commencer l'aventure 🚀"
              onPress={handleGetStarted}
              variant="primary"
              size="large"
              fullWidth
            />
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    paddingTop: SPACING.xxl + 20,
    paddingBottom: SPACING.xxl + 40,
    minHeight: height,
  },
  animatedContent: {
    alignItems: 'center',
    width: '100%',
  },
  logoWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl + 10,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    zIndex: 0,
  },
  logoContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
    borderWidth: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  titleAccent: {
    fontSize: FONT_SIZES.xxxl + 8,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    marginTop: -SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    lineHeight: 26,
    paddingHorizontal: SPACING.lg,
    fontWeight: FONT_WEIGHTS.medium,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: SPACING.xxl,
    maxWidth: width - SPACING.xl * 2,
  },
  featureWrapper: {
    marginBottom: SPACING.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg + 4,
    borderRadius: BORDER_RADIUS.lg + 4,
    borderWidth: 1.5,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 2,
  },
  featureIcon: {
    fontSize: 30,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    marginTop: SPACING.xl,
    maxWidth: width - SPACING.xl * 2,
  },
  // Styles pour le porc principal
  pigMainWrapper: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    position: 'relative',
  },
  pigMainContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pigBody: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pigEmoji: {
    fontSize: 100,
    position: 'absolute',
  },
  pigWinkOverlay: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'flex-start',
    top: 0,
    left: 0,
    paddingTop: 35,
    paddingRight: 35,
  },
  winkLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '15deg' }],
  },
  pigMouth: {
    position: 'absolute',
    bottom: 15,
    width: 50,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    transformOrigin: 'center',
  },
  pigMouthEmoji: {
    fontSize: 35,
  },
  // Styles pour les petits porcs décoratifs
  smallPig: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  smallPigEmoji: {
    fontSize: 40,
  },
  // Styles pour les icônes de porc dans les features
  featurePigIcon: {
    fontSize: 16,
    position: 'absolute',
    bottom: -5,
    right: -5,
  },
});
