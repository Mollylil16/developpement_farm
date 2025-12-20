/**
 * Bouton flottant pour accéder rapidement à l'agent conversationnel
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SCREENS } from '../../navigation/types';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

export default function ChatAgentFAB() {
  const navigation = useNavigation();

  const handlePress = () => {
    // @ts-ignore - navigation typée
    navigation.navigate(SCREENS.CHAT_AGENT as never);
  };

  return (
    <TouchableOpacity style={styles.fab} onPress={handlePress} activeOpacity={0.8}>
      <Text style={styles.emoji}>👨🏾‍🌾</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emoji: {
    fontSize: 32,
    lineHeight: 36,
  },
});
