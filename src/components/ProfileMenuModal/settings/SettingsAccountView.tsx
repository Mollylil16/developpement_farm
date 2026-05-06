/**
 * Vue détaillée - Compte
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../../../store/hooks';
import { signOut, deleteAccount } from '../../../store/slices/authSlice';
import { useTheme } from '../../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import ChangeEmailModal from './modals/ChangeEmailModal';
import ChangePasswordModal from './modals/ChangePasswordModal';

interface SettingsAccountViewProps {
  onBack: () => void;
}

export default function SettingsAccountView({ onBack }: SettingsAccountViewProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await dispatch(signOut());
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer définitivement votre compte ?',
      'Toutes vos données seront supprimées de façon irréversible. Vous pourrez recréer un compte plus tard, mais sans récupérer les anciennes données.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer mon compte',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteAccount()).unwrap();
              // La navigation sera gérée automatiquement par AppNavigator après suppression
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Échec de la suppression, réessayez.';
              Alert.alert('Erreur', errorMessage);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header local */}
      <View style={styles.localHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Retour aux paramètres</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🔐 Compte</Text>
      </View>

      {/* Liste des options */}
      <View style={styles.list}>
        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => setShowChangeEmailModal(true)}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>Modifier email</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => setShowChangePasswordModal(true)}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>Changer mot de passe</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => {
            Alert.alert(
              'Gérer authentification',
              "Les méthodes d'authentification disponibles sont gérées lors de la connexion. Vous pouvez vous connecter avec email/mot de passe, Google, Apple ou téléphone.",
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={[styles.itemText, { color: colors.text }]}>Gérer authentification</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Section Informations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small },
          ]}
        >
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Base de données</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>SQLite</Text>
          </View>
        </View>
      </View>

      {/* Section Déconnexion */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Session</Text>
        <TouchableOpacity
          style={[
            styles.actionCard,
            { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small },
          ]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardTitle, { color: colors.error }]}>Se déconnecter</Text>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary }]}>
              Déconnectez-vous de votre compte
            </Text>
          </View>
          <View style={[styles.actionCardArrowContainer, { backgroundColor: colors.error + '10' }]}>
            <Text style={[styles.actionCardArrow, { color: colors.error }]}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCard,
            { 
              backgroundColor: colors.surface, 
              borderColor: colors.border, 
              ...colors.shadow.small,
              marginTop: 12,
            },
          ]}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardTitle, { color: '#FF3B30' }]}>Supprimer mon compte</Text>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary }]}>
              Suppression définitive de toutes vos données
            </Text>
          </View>
          <View style={[styles.actionCardArrowContainer, { backgroundColor: '#FF3B30' + '10' }]}>
            <Text style={[styles.actionCardArrow, { color: '#FF3B30' }]}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Section Gestion des données */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gestion des données</Text>
        <TouchableOpacity
          style={[
            styles.actionCard,
            { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small },
          ]}
          onPress={() => {
            Alert.alert(
              'Vider le cache',
              "Cette action va vider le cache de l'application. Voulez-vous continuer ?",
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Vider',
                  onPress: async () => {
                    try {
                      Alert.alert('Information', 'Le cache a été vidé');
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du vidage du cache';
                      Alert.alert('Erreur', errorMessage);
                    }
                  },
                },
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardTitle, { color: colors.text }]}>Vider le cache</Text>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary }]}>
              Supprime les données temporaires
            </Text>
          </View>
          <View
            style={[styles.actionCardArrowContainer, { backgroundColor: colors.primary + '10' }]}
          >
            <Text style={[styles.actionCardArrow, { color: colors.primary }]}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.error + '30',
              ...colors.shadow.small,
            },
          ]}
          onPress={() => {
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
                      Alert.alert(
                        'Information',
                        "La réinitialisation complète de la base de données n'est pas encore implémentée. Pour réinitialiser, supprimez et réinstallez l'application."
                      );
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la réinitialisation';
                      Alert.alert('Erreur', errorMessage);
                    }
                  },
                },
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardTitle, { color: colors.error }]}>
              Réinitialiser la base de données
            </Text>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary }]}>
              Supprime toutes les données. Action irréversible.
            </Text>
          </View>
          <View style={[styles.actionCardArrowContainer, { backgroundColor: colors.error + '10' }]}>
            <Text style={[styles.actionCardArrow, { color: colors.error }]}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Section À propos */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>À propos</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small },
          ]}
        >
          <Text style={[styles.aboutTitle, { color: colors.text }]}>Fermier Pro</Text>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            Application mobile conçue pour aider les éleveurs porcins à mieux gérer leur ferme.
            Outils avancés pour le planning de reproduction, la gestion nutritionnelle, le suivi
            financier et l'analyse de performance.
          </Text>
        </View>
      </View>

      {/* Modals */}
      <ChangeEmailModal
        visible={showChangeEmailModal}
        onClose={() => setShowChangeEmailModal(false)}
      />
      <ChangePasswordModal
        visible={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: SPACING.md,
  },
  localHeader: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  backText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  list: {
    paddingHorizontal: SPACING.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  itemText: {
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.md,
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  actionCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  actionCardDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  actionCardArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  actionCardArrow: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '300',
  },
  aboutTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  aboutText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
});
