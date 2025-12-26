/**
 * Écran d'accueil - Point d'entrée de l'authentification
 * L'utilisateur choisit entre "Créer un compte" ou "Se connecter"
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleCreateAccount = () => {
    navigation.navigate(SCREENS.SIGN_UP_METHOD as never);
  };

  const handleSignIn = () => {
    navigation.navigate(SCREENS.SIGN_IN as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo et illustration */}
        <View style={styles.heroSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primaryLight + '15' }]}>
            <Text style={styles.logoEmoji}>🐷</Text>
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>Fermier Pro</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Gérez votre élevage avec intelligence
          </Text>
        </View>

        {/* Illustration des fonctionnalités */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="analytics"
            title="Suivi en temps réel"
            description="Gérez votre cheptel efficacement"
            colors={colors}
          />
          <FeatureItem
            icon="cart"
            title="Marketplace intégré"
            description="Vendez et achetez facilement"
            colors={colors}
          />
          <FeatureItem
            icon="people"
            title="Collaboration"
            description="Travaillez avec votre équipe"
            colors={colors}
          />
        </View>

        {/* Actions principales */}
        <View style={styles.actionsSection}>
          <Button
            title="Créer un compte"
            onPress={handleCreateAccount}
            variant="primary"
            size="large"
            fullWidth
            style={{ marginBottom: SPACING.md }}
          />

          <Button
            title="Se connecter"
            onPress={handleSignIn}
            variant="outline"
            size="large"
            fullWidth
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            En continuant, vous acceptez nos
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Conditions d'utilisation
              </Text>
            </TouchableOpacity>
            <Text style={[styles.footerSeparator, { color: colors.textSecondary }]}> • </Text>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Politique de confidentialité
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Composant pour afficher une fonctionnalité
 */
interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: any;
}

function FeatureItem({ icon, title, description, colors }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View
        style={[
          styles.featureIconContainer,
          { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' },
        ]}
      >
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    justifyContent: 'space-between',
    minHeight: SCREEN_HEIGHT - 100,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
    marginBottom: SPACING.xxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  logoEmoji: {
    fontSize: 64,
  },
  appName: {
    fontSize: FONT_SIZES.xxxl + 4,
    fontWeight: FONT_WEIGHTS.extraBold,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  featuresSection: {
    marginBottom: SPACING.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  actionsSection: {
    marginBottom: SPACING.xl,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  footerSeparator: {
    fontSize: FONT_SIZES.sm,
  },
});
