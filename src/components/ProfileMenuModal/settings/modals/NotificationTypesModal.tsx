/**
 * Modal pour configurer les types de notifications (push, email, SMS)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';
import CustomModal from '../../../CustomModal';

const NOTIFICATION_TYPES_KEY = '@fermier_pro:notification_types';

interface NotificationTypesModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'push' | 'email' | 'sms';
}

export default function NotificationTypesModal({
  visible,
  onClose,
  type,
}: NotificationTypesModalProps) {
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible, type]);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_TYPES_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setEnabled(settings[type] !== false);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  const handleSave = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_TYPES_KEY);
      const settings = saved ? JSON.parse(saved) : {};
      settings[type] = enabled;
      await AsyncStorage.setItem(NOTIFICATION_TYPES_KEY, JSON.stringify(settings));
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde notifications:', error);
    }
  };

  const typeLabels = {
    push: 'Notifications push',
    email: 'Notifications email',
    sms: 'Notifications SMS',
  };

  const typeDescriptions = {
    push: 'Recevez des notifications directement sur votre appareil',
    email: 'Recevez des notifications par email',
    sms: 'Recevez des notifications par SMS (nécessite un numéro de téléphone)',
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={typeLabels[type]}
      confirmText="Enregistrer"
      onConfirm={handleSave}
    >
      <ScrollView style={styles.content}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={[styles.label, { color: colors.text }]}>
                {typeLabels[type]}
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {typeDescriptions[type]}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={enabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
});

