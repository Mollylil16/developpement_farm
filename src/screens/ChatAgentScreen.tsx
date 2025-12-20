/**
 * Écran wrapper pour l'agent conversationnel
 */

import React from 'react';
import ChatAgentScreen from '../components/chatAgent/ChatAgentScreen';
import { useNavigation } from '@react-navigation/native';

export default function ChatAgentScreenWrapper() {
  const navigation = useNavigation();

  return <ChatAgentScreen onClose={() => navigation.goBack()} />;
}
