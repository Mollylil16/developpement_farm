/**
 * Exemple d'utilisation du shake-to-cancel
 * Ce fichier montre comment intégrer la fonctionnalité dans vos composants
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import CustomModal from '../CustomModal';
import { useShakeToCancel } from '../../hooks/useShakeToCancel';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../Button';

/**
 * Exemple 1 : Modal avec shake-to-cancel activé (par défaut)
 */
export function BasicShakeExample() {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Exemple 1 : Modal avec Shake-to-Cancel
      </Text>
      <Button title="Ouvrir le modal" onPress={() => setModalVisible(true)} />

      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Modal avec Shake-to-Cancel"
        onConfirm={() => {
          Alert.alert('Succès', 'Action confirmée !');
          setModalVisible(false);
        }}
        // enableShakeToCancel est true par défaut
      >
        <Text style={[styles.text, { color: colors.text }]}>
          Secouez votre téléphone pour annuler cette action.
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          💡 Conseil : Secouez fermement pour déclencher l'annulation
        </Text>
      </CustomModal>
    </View>
  );
}

/**
 * Exemple 2 : Modal avec shake-to-cancel désactivé
 */
export function DisabledShakeExample() {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Exemple 2 : Shake-to-Cancel Désactivé
      </Text>
      <Button title="Ouvrir le modal" onPress={() => setModalVisible(true)} />

      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Modal sans Shake-to-Cancel"
        enableShakeToCancel={false} // Désactiver explicitement
        onConfirm={() => {
          Alert.alert('Succès', 'Action confirmée !');
          setModalVisible(false);
        }}
      >
        <Text style={[styles.text, { color: colors.text }]}>
          Ce modal ne peut pas être annulé en secouant le téléphone.
        </Text>
      </CustomModal>
    </View>
  );
}

/**
 * Exemple 3 : Shake personnalisé avec sensibilité ajustée
 */
export function CustomSensitivityExample() {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Exemple 3 : Sensibilité Personnalisée
      </Text>
      <Button title="Ouvrir le modal" onPress={() => setModalVisible(true)} />

      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Modal avec Sensibilité Élevée"
        shakeThreshold={10} // Plus sensible (détecte les petits mouvements)
        onConfirm={() => {
          Alert.alert('Succès', 'Action confirmée !');
          setModalVisible(false);
        }}
      >
        <Text style={[styles.text, { color: colors.text }]}>
          Ce modal est très sensible aux mouvements.
        </Text>
        <Text style={[styles.hint, { color: colors.warning }]}>
          ⚠️ Attention : Même un petit mouvement peut déclencher l'annulation
        </Text>
      </CustomModal>
    </View>
  );
}

/**
 * Exemple 4 : Utilisation du hook dans un composant personnalisé
 */
export function CustomHookExample() {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  // Utiliser le hook directement (sans CustomModal)
  useShakeToCancel({
    enabled: isEditing,
    onShake: () => {
      Alert.alert(
        '🔔 Annuler les modifications ?',
        'Les changements non sauvegardés seront perdus',
        [
          { text: "Continuer l'édition", style: 'cancel' },
          {
            text: 'Annuler',
            style: 'destructive',
            onPress: () => {
              setIsEditing(false);
              setFormData({ name: '', email: '' });
            },
          },
        ]
      );
    },
    threshold: 15,
    cooldown: 1000,
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Exemple 4 : Hook Personnalisé</Text>

      {!isEditing ? (
        <Button title="Commencer l'édition" onPress={() => setIsEditing(true)} />
      ) : (
        <View>
          <Text style={[styles.text, { color: colors.text }]}>Mode édition activé</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            💡 Secouez pour annuler l'édition
          </Text>
          <Button
            title="Sauvegarder"
            onPress={() => {
              Alert.alert('Succès', 'Données sauvegardées');
              setIsEditing(false);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  text: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
    lineHeight: 24,
  },
  hint: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
  },
});
