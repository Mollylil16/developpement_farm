/**
 * Écran de chat avec l'agent conversationnel
 * Interface complète avec support texte et voix
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { useChatAgent } from '../../hooks/useChatAgent';
import { ChatMessage, SujetDisponible } from '../../types/chatAgent';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppSelector } from '../../store/hooks';
import { VoiceService } from '../../services/chatAgent';
import ProfilePhoto from '../ProfilePhoto';
import { VoiceInputButton } from '../chat/VoiceInputButton';
import { logger } from '../../utils/logger';
import TypingIndicator from './TypingIndicator';

interface ChatAgentScreenProps {
  onClose?: () => void;
}

export default function ChatAgentScreen({ onClose }: ChatAgentScreenProps) {
  const {
    messages,
    isLoading,
    isThinking,
    isInitialized,
    reminders,
    voiceEnabled,
    sendMessage,
    toggleVoice,
    clearConversation,
  } = useChatAgent();

  const { user } = useAppSelector((state) => state.auth ?? { user: null });
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const lastReadMessageIdRef = useRef<string | null>(null);

  // Initialiser le service vocal
  useEffect(() => {
    voiceServiceRef.current = new VoiceService();
    return () => {
      voiceServiceRef.current?.destroy().catch((error) => logger.error('[ChatAgentScreen] Destroy error:', error));
    };
  }, []);

  // Générer les initiales de l'utilisateur
  const userInitials = user?.prenom?.[0] || user?.nom?.[0] || 'U';


  // Auto-scroll au dernier message et faire parler Kouakou si nécessaire
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Faire parler Kouakou si la voix est activée et qu'on vient de recevoir une nouvelle réponse
      if (voiceEnabled && voiceServiceRef.current) {
        const lastMessage = messages[messages.length - 1];
        
        // Ne lire que si c'est un nouveau message assistant (pas déjà lu)
        if (
          lastMessage.role === 'assistant' && 
          lastMessage.content &&
          lastMessage.id !== lastReadMessageIdRef.current
        ) {
          // Marquer ce message comme lu
          lastReadMessageIdRef.current = lastMessage.id;
          
          // Arrêter toute lecture en cours avant de lire le nouveau message
          voiceServiceRef.current.stopSpeaking().catch((error) => {
            logger.warn('[ChatAgentScreen] Erreur arrêt lecture:', error);
          });
          
          // Attendre un peu pour que l'utilisateur voie le message
          setTimeout(() => {
            if (voiceServiceRef.current && lastReadMessageIdRef.current === lastMessage.id) {
              voiceServiceRef.current.speak(lastMessage.content);
            }
          }, 800);
        }
      }
    }
  }, [messages.length, voiceEnabled]);

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || sending || !isInitialized) return;

    try {
      setSending(true);
      setInputText('');
      await sendMessage(content);
      // La lecture de la réponse sera gérée par le useEffect qui surveille messages.length
      // Pas besoin de lire ici pour éviter les doublons
    } catch (error) {
      logger.error('Erreur envoi message:', error);
      Alert.alert('Erreur', "Impossible d'envoyer le message. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    Alert.alert('Effacer la conversation', 'Voulez-vous vraiment effacer toute la conversation ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: () => {
          // Arrêter toute lecture en cours
          voiceServiceRef.current?.stopSpeaking().catch((error) => {
            logger.warn('[ChatAgentScreen] Erreur arrêt lecture lors effacement:', error);
          });
          // Réinitialiser le ref du dernier message lu
          lastReadMessageIdRef.current = null;
          clearConversation();
          setInputText('');
        },
      },
    ]);
  };

  const handleVoiceInput = async () => {
    if (!voiceServiceRef.current || !isInitialized) {
      Alert.alert('Erreur', "Le service vocal n'est pas disponible");
      return;
    }

    if (isListening) {
      // Arrêter l'écoute
      try {
        setIsListening(false);
        await voiceServiceRef.current.stopListening();
      } catch (error) {
        logger.error('Erreur arrêt écoute:', error);
        setIsListening(false);
      }
    } else {
      // Démarrer l'écoute
      try {
        setIsListening(true);

        await voiceServiceRef.current.startListening({
          onResult: (transcript: string) => {
            if (transcript && transcript.trim()) {
              setInputText(transcript.trim());
            }
          },
          onError: (message: string) => {
            logger.error('Erreur reconnaissance vocale:', message);
            setIsListening(false);
            Alert.alert('Erreur vocale', message);
          },
          onEnd: () => {
            setIsListening(false);
          },
        });
      } catch (error) {
        logger.error('Erreur démarrage écoute:', error);
        setIsListening(false);

        let errorMessage =
          (error instanceof Error ? error.message : String(error)) || 'Impossible de démarrer la reconnaissance vocale.';
        if (errorMessage.includes('Permission')) {
          errorMessage =
            "Permission microphone requise. Activez-la dans les paramètres de l'application.";
        } else if (errorMessage.includes("n'est pas disponible") || errorMessage.includes('indisponible')) {
          errorMessage =
            "La reconnaissance vocale n'est pas disponible sur cette plateforme. Utilisez la saisie texte.";
        }

        Alert.alert('Erreur', errorMessage);
      }
    }
  };

  // État pour la sélection des sujets
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const handleSubjectIdClick = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        // Désélectionner
        return prev.filter((id) => id !== subjectId);
      } else {
        // Sélectionner
        return [...prev, subjectId];
      }
    });
  };

  const handleConfirmSelection = () => {
    if (selectedSubjectIds.length === 0) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner au moins un porc.');
      return;
    }
    // Envoyer les IDs sélectionnés comme message
    sendMessage(`IDs sélectionnés : ${selectedSubjectIds.join(', ')}`);
    setSelectedSubjectIds([]);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';
    const sujetsDisponibles = item.metadata?.sujetsDisponibles as SujetDisponible[] | undefined;

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    // Extraire les IDs du message pour les rendre cliquables
    const renderMessageWithClickableIds = (content: string) => {
      if (!sujetsDisponibles || sujetsDisponibles.length === 0) {
        return <Text style={[styles.messageText, { color: isUser ? COLORS.textOnPrimary : COLORS.text }]}>{content}</Text>;
      }

      // Créer une regex pour trouver les IDs dans le format [ID: 1024]
      const parts: Array<string | { id: string; isButton: true }> = [];
      let lastIndex = 0;
      const idRegex = /\[ID:\s*(\d+)\]/g;
      let match;

      while ((match = idRegex.exec(content)) !== null) {
        // Ajouter le texte avant l'ID
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        // Ajouter l'ID comme bouton
        parts.push({ id: match[1], isButton: true });
        lastIndex = match.index + match[0].length;
      }

      // Ajouter le texte restant
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      return (
        <View>
          {parts.map((part, index) => {
            if (typeof part === 'object' && part.isButton) {
              const isSelected = selectedSubjectIds.includes(part.id);
              return (
                <TouchableOpacity
                  key={`id-${part.id}-${index}`}
                  style={[
                    styles.subjectIdButton,
                    {
                      backgroundColor: isSelected ? COLORS.primary : COLORS.surface,
                      borderColor: COLORS.primary,
                    },
                  ]}
                  onPress={() => handleSubjectIdClick(part.id)}
                >
                  <Text
                    style={[
                      styles.subjectIdButtonText,
                      { color: isSelected ? COLORS.textOnPrimary : COLORS.primary },
                    ]}
                  >
                    ID: {part.id}
                  </Text>
                </TouchableOpacity>
              );
            }
            return (
              <Text
                key={`text-${index}`}
                style={[styles.messageText, { color: isUser ? COLORS.textOnPrimary : COLORS.text }]}
              >
                {typeof part === 'string' ? part : ''}
              </Text>
            );
          })}
        </View>
      );
    };

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {/* Pour Kouakou : Avatar à gauche, Bulle à droite */}
        {!isUser && (
          <>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>👨🏾‍🌾</Text>
              </View>
            </View>
            <View
              style={[
                styles.messageBubble,
                styles.assistantMessageBubble,
                { backgroundColor: COLORS.surface, marginRight: 8 },
              ]}
            >
              {renderMessageWithClickableIds(item.content)}

              {/* Afficher les boutons de confirmation si des sujets sont sélectionnés */}
              {sujetsDisponibles && sujetsDisponibles.length > 0 && selectedSubjectIds.length > 0 && (
                <View style={styles.selectionActions}>
                  <Text style={[styles.selectionText, { color: COLORS.textSecondary }]}>
                    {selectedSubjectIds.length} porc(s) sélectionné(s)
                  </Text>
                  <TouchableOpacity
                    style={[styles.confirmButton, { backgroundColor: COLORS.primary }]}
                    onPress={handleConfirmSelection}
                  >
                    <Text style={[styles.confirmButtonText, { color: COLORS.textOnPrimary }]}>
                      Confirmer
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {item.metadata?.actionExecuted && (
                <View style={styles.actionBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
                  <Text style={[styles.actionBadgeText, { color: COLORS.primary }]}>
                    Action exécutée
                  </Text>
                </View>
              )}

              <Text style={[styles.timestamp, { color: COLORS.textSecondary }]}>
                {format(new Date(item.timestamp), 'HH:mm', { locale: fr })}
              </Text>
            </View>
          </>
        )}

        {/* Pour l'utilisateur : Spacer à gauche, Bulle au centre, Avatar à droite */}
        {isUser && (
          <>
            <View style={styles.spacer} />
            <View
              style={[
                styles.messageBubble,
                styles.userMessageBubble,
                { backgroundColor: COLORS.primary, marginRight: 8 },
              ]}
            >
              <Text style={[styles.messageText, { color: COLORS.textOnPrimary }]}>
                {item.content}
              </Text>

              {item.metadata?.actionExecuted && (
                <View style={styles.actionBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.textOnPrimary} />
                  <Text style={[styles.actionBadgeText, { color: COLORS.textOnPrimary }]}>
                    Action exécutée
                  </Text>
                </View>
              )}

              <Text style={[styles.timestamp, { color: COLORS.textOnPrimary + '80' }]}>
                {format(new Date(item.timestamp), 'HH:mm', { locale: fr })}
              </Text>
            </View>
            <View style={styles.avatarContainer}>
              <ProfilePhoto
                uri={user?.photo || null}
                size={32}
                style={styles.userAvatar}
                placeholder={
                  <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                    <Text style={styles.userAvatarInitials}>{userInitials}</Text>
                  </View>
                }
              />
            </View>
          </>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Kouakou</Text>
          <Text style={styles.headerSubtitle}>
            {isInitialized ? 'En ligne' : 'Initialisation...'}
          </Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity onPress={toggleVoice} style={styles.headerButton}>
          <Ionicons
            name={voiceEnabled ? 'mic' : 'mic-off'}
            size={20}
            color={voiceEnabled ? COLORS.primary : COLORS.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
          <Ionicons name="trash-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderReminders = () => {
    if (reminders.length === 0) return null;

    return (
      <View style={styles.remindersContainer}>
        <Text style={styles.remindersTitle}>📋 Rappels</Text>
        {reminders.slice(0, 3).map((reminder) => (
          <View key={reminder.id} style={styles.reminderItem}>
            <Ionicons name="notifications" size={16} color={COLORS.warning} />
            <Text style={styles.reminderText}>{reminder.title}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initialisation de l'assistant...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {renderHeader()}
        {renderReminders()}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Commencez à discuter avec votre assistant !</Text>
            </View>
          }
        />

        {/* Indicateur animé: Kouakou réfléchit ou écrit */}
        {(isThinking || isLoading) && (
          <TypingIndicator 
            message={isThinking ? 'Kouakou réfléchit' : 'Kouakou écrit'} 
          />
        )}

        <View style={styles.inputContainer}>
          {/* Bouton vocal amélioré */}
          {voiceEnabled && voiceServiceRef.current ? (
            <VoiceInputButton
              onTranscription={(text) => {
                setInputText(text);
                // Optionnel : envoyer automatiquement après transcription
                // handleSend();
              }}
              onError={(message) => {
                Alert.alert('Erreur vocale', message);
              }}
              disabled={sending || !isInitialized}
              voiceService={voiceServiceRef.current}
            />
          ) : (
            <TouchableOpacity
              style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
              onPress={handleVoiceInput}
              disabled={sending || !isInitialized}
            >
              {isListening ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Ionicons name="mic" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.textInput}
            placeholder="Tapez votre message..."
            placeholderTextColor={COLORS.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!sending && isInitialized}
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !sending && !isThinking ? COLORS.primary : COLORS.textSecondary,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending || isThinking || !isInitialized}
          >
            {sending || isThinking ? (
              <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.textOnPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerButton: {
    padding: 6,
  },
  remindersContainer: {
    backgroundColor: COLORS.warning + '10',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  remindersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  reminderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  messagesList: {
    padding: 12,
    paddingBottom: 100, // ✅ Espace pour voir le dernier message
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginRight: -12,
  },
  spacer: {
    flex: 1,
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userAvatarPlaceholder: {
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  assistantMessageBubble: {
    maxWidth: '75%',
  },
  userMessageBubble: {
    maxWidth: '75%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  voiceButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.error + '20',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 20,
    fontSize: 15,
    color: COLORS.text,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectIdButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 4,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  subjectIdButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectionActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionText: {
    fontSize: 12,
    flex: 1,
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
