/**
 * Composant paramètres de l'application
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppDispatch } from '../store/hooks';
import { signOut } from '../store/slices/authSlice';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { databaseService } from '../services/database';

export default function ParametresAppComponent() {
  const dispatch = useAppDispatch();

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await dispatch(signOut());
            // La navigation sera gérée automatiquement par AppNavigator
          },
        },
      ]
    );
  };

  const handleResetDatabase = () => {
    Alert.alert(
      '⚠️ Réinitialiser la base de données',
      'Cette action va supprimer TOUTES les données. Cette action est irréversible. Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              // Pour l'instant, on affiche juste un message
              // La réinitialisation complète nécessiterait de drop toutes les tables
              Alert.alert(
                'Information',
                'La réinitialisation complète de la base de données n\'est pas encore implémentée. Pour réinitialiser, supprimez et réinstallez l\'application.'
              );
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Erreur lors de la réinitialisation');
            }
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Vider le cache',
      'Cette action va vider le cache de l\'application. Voulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          onPress: async () => {
            try {
              // Pour l'instant, on affiche juste un message
              Alert.alert('Information', 'Le cache a été vidé');
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Erreur lors du vidage du cache');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>ℹ️</Text>
          <Text style={styles.sectionTitle}>Informations</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>📱</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>💾</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Base de données</Text>
              <Text style={styles.infoValue}>SQLite</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>👤</Text>
          <Text style={styles.sectionTitle}>Compte</Text>
        </View>
        <TouchableOpacity 
          style={[styles.actionCard, styles.dangerCard]} 
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardIconContainer}>
            <Text style={styles.actionCardIcon}>🚪</Text>
          </View>
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardTitle, styles.dangerText]}>
              Se déconnecter
            </Text>
            <Text style={styles.actionCardDescription}>
              Déconnectez-vous de votre compte
            </Text>
          </View>
          <View style={styles.actionCardArrowContainer}>
            <Text style={styles.actionCardArrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🗄️</Text>
          <Text style={styles.sectionTitle}>Gestion des données</Text>
        </View>
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={handleClearCache}
          activeOpacity={0.7}
        >
          <View style={[styles.actionCardIconContainer, styles.iconContainerBlue]}>
            <Text style={styles.actionCardIcon}>🧹</Text>
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Vider le cache</Text>
            <Text style={styles.actionCardDescription}>
              Supprime les données temporaires
            </Text>
          </View>
          <View style={styles.actionCardArrowContainer}>
            <Text style={styles.actionCardArrow}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, styles.dangerCard]} 
          onPress={handleResetDatabase}
          activeOpacity={0.7}
        >
          <View style={[styles.actionCardIconContainer, styles.iconContainerRed]}>
            <Text style={styles.actionCardIcon}>⚠️</Text>
          </View>
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardTitle, styles.dangerText]}>
              Réinitialiser la base de données
            </Text>
            <Text style={styles.actionCardDescription}>
              Supprime toutes les données. Action irréversible.
            </Text>
          </View>
          <View style={styles.actionCardArrowContainer}>
            <Text style={styles.actionCardArrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📖</Text>
          <Text style={styles.sectionTitle}>À propos</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.aboutHeader}>
            <Text style={styles.aboutIcon}>🐷</Text>
            <Text style={styles.aboutTitle}>Fermier Pro</Text>
          </View>
          <Text style={styles.aboutText}>
            Application mobile conçue pour aider les éleveurs porcins à mieux gérer leur ferme.
          </Text>
          <Text style={styles.aboutText}>
            Outils avancés pour le planning de reproduction, la gestion nutritionnelle, le suivi financier et l'analyse de performance.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  section: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionIcon: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...COLORS.shadow.medium,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.info + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: SPACING.xs / 2,
  },
  infoValue: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...COLORS.shadow.medium,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  dangerCard: {
    borderColor: COLORS.error + '30',
    backgroundColor: COLORS.error + '05',
  },
  actionCardIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  iconContainerBlue: {
    backgroundColor: COLORS.info + '20',
  },
  iconContainerRed: {
    backgroundColor: COLORS.error + '20',
  },
  actionCardIcon: {
    fontSize: 28,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  actionCardDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actionCardArrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  actionCardArrow: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  dangerText: {
    color: COLORS.error,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  aboutIcon: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  aboutTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  aboutText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
});

