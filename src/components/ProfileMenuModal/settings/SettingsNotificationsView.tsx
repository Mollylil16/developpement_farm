/**
 * Vue détaillée - Notifications
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../constants/theme';
import {
  getAllScheduledNotifications,
  cancelAllNotifications,
  configureNotifications,
} from '../../../services/notificationsService';
import { NOTIFICATIONS_ENABLED_KEY } from '../../../constants/notifications';
import NotificationTypesModal from './modals/NotificationTypesModal';
import { logger } from '../../../utils/logger';

interface SettingsNotificationsViewProps {
  onBack: () => void;
}

export default function SettingsNotificationsView({ onBack }: SettingsNotificationsViewProps) {
  const { colors } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [showNotificationTypeModal, setShowNotificationTypeModal] = useState<
    'push' | 'email' | 'sms' | null
  >(null);

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
      logger.error('Erreur lors du chargement des notifications:', error);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la modification des notifications';
      Alert.alert('Erreur', errorMessage);
      setNotificationsEnabled(!value); // Revenir à l'état précédent
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.localHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Retour aux paramètres</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🔔 Notifications</Text>
      </View>

      {/* Notifications générales */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small },
          ]}
        >
          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Activer les notifications
              </Text>
              <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                Recevez des alertes pour les gestations proches, stocks faibles, et tâches
                planifiées
              </Text>
              {scheduledCount > 0 && (
                <Text style={[styles.scheduledCount, { color: colors.primary }]}>
                  {scheduledCount} notification{scheduledCount > 1 ? 's' : ''} planifiée
                  {scheduledCount > 1 ? 's' : ''}
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

      {/* Types de notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Types de notifications</Text>
        <View style={styles.list}>
          <TouchableOpacity
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => setShowNotificationTypeModal('push')}
          >
            <Text style={[styles.itemText, { color: colors.text }]}>Notifications push</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => setShowNotificationTypeModal('email')}
          >
            <Text style={[styles.itemText, { color: colors.text }]}>Notifications email</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => setShowNotificationTypeModal('sms')}>
            <Text style={[styles.itemText, { color: colors.text }]}>Notifications SMS</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      {showNotificationTypeModal && (
        <NotificationTypesModal
          visible={showNotificationTypeModal !== null}
          onClose={() => setShowNotificationTypeModal(null)}
          type={showNotificationTypeModal}
        />
      )}
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
