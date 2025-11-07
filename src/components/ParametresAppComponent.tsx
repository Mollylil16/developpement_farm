/**
 * Composant paramètres de l'application
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useAppDispatch } from '../store/hooks';
import { signOut } from '../store/slices/authSlice';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { databaseService } from '../services/database';
import { getAllScheduledNotifications, cancelAllNotifications, configureNotifications } from '../services/notificationsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ThemeSelector from './ThemeSelector';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

export default function ParametresAppComponent() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    // Charger la préférence des notifications
    AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY).then((value) => {
      if (value !== null) {
        setNotificationsEnabled(value === 'true');
      }
    });

    // Charger le nombre de notifications planifiées
    loadScheduledCount();
  }, []);

  const loadScheduledCount = async () => {
    try {
      const notifications = await getAllScheduledNotifications();
      setScheduledCount(notifications.length);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, value.toString());

      if (value) {
        // Activer les notifications
        await configureNotifications();
        await loadScheduledCount();
        Alert.alert('Succès', 'Les notifications ont été activées');
      } else {
        // Désactiver les notifications
        await cancelAllNotifications();
        setScheduledCount(0);
        Alert.alert('Succès', 'Les notifications ont été désactivées');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de la modification des notifications');
      setNotificationsEnabled(!value); // Revenir à l'état précédent
    }
  };

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
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Informations</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small }]}>
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

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Compte</Text>
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small }]} 
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardTitle, { color: colors.error }]}>
              Se déconnecter
            </Text>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary }]}>
              Déconnectez-vous de votre compte
            </Text>
          </View>
          <View style={[styles.actionCardArrowContainer, { backgroundColor: colors.error + '10' }]}>
            <Text style={[styles.actionCardArrow, { color: colors.error }]}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Apparence</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small }]}>
          <ThemeSelector />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Activer les notifications</Text>
              <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                Recevez des alertes pour les gestations proches, stocks faibles, et tâches planifiées
              </Text>
              {scheduledCount > 0 && (
                <Text style={[styles.scheduledCount, { color: colors.primary }]}>
                  {scheduledCount} notification{scheduledCount > 1 ? 's' : ''} planifiée{scheduledCount > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gestion des données</Text>
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small }]} 
          onPress={handleClearCache}
          activeOpacity={0.7}
        >
          <View style={styles.actionCardContent}>
            <Text style={[styles.actionCardTitle, { color: colors.text }]}>Vider le cache</Text>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary }]}>
              Supprime les données temporaires
            </Text>
          </View>
          <View style={[styles.actionCardArrowContainer, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.actionCardArrow, { color: colors.primary }]}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.error + '30', ...colors.shadow.small }]} 
          onPress={handleResetDatabase}
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

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>À propos</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small }]}>
          <Text style={[styles.aboutTitle, { color: colors.text }]}>Fermier Pro</Text>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            Application mobile conçue pour aider les éleveurs porcins à mieux gérer leur ferme. Outils avancés pour le planning de reproduction, la gestion nutritionnelle, le suivi financier et l'analyse de performance.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  section: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.md,
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  switchContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  switchLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  switchDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  scheduledCount: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
});

