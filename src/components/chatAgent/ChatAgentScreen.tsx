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
import { ChatMessage } from '../../types/chatAgent';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppSelector } from '../../store/hooks';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { DiagnosticService, DiagnosticResult } from '../../services/chatAgent/DiagnosticService';
import DiagnosticModal from './DiagnosticModal';

interface ChatAgentScreenProps {
  onClose?: () => void;
}

export default function ChatAgentScreen({ onClose }: ChatAgentScreenProps) {
  const {
    messages,
    isLoading,
    isInitialized,
    reminders,
    voiceEnabled,
    sendMessage,
    toggleVoice,
    clearConversation,
    voiceService,
  } = useChatAgent();

  const { user } = useAppSelector((state) => (state as any).auth);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const voiceServiceRef = useRef<any>(null);
  
  // État pour le diagnostic
  const [diagnosticService] = useState(() => new DiagnosticService());
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Générer les initiales de l'utilisateur
  const userInitials = user?.prenom?.[0] || user?.nom?.[0] || 'U';

  // Initialiser le service de diagnostic
  useEffect(() => {
    diagnosticService.initialize();
  }, []);

  // Stocker la référence du service vocal
  useEffect(() => {
    if (voiceService) {
      voiceServiceRef.current = voiceService;
    }
  }, [voiceService]);

  // Auto-scroll au dernier message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  /**
   * Analyse les symptômes dans un message et détecte les maladies possibles
   */
  const analyzeSymptomsInMessage = (message: string): DiagnosticResult | null => {
    // Mots-clés qui indiquent une description de symptômes
    const symptomKeywords = [
      'symptome', 'symptomes', 'malade', 'maladie', 'probleme',
      'fièvre', 'fievre', 'diarrhée', 'diarrhee', 'vomir', 'tousse',
      'plaques', 'rouge', 'lésion', 'lesion', 'grattait', 'boite',
      'avorte', 'mort', 'meurt', 'saigne', 'hémorragie', 'hemorragie'
    ];

    const lowerMessage = message.toLowerCase();
    const hasSymptomKeywords = symptomKeywords.some(keyword => lowerMessage.includes(keyword));

    if (hasSymptomKeywords) {
      const diagnostic = diagnosticService.analyzeSymptoms(message);
      if (diagnostic.disease && diagnostic.confidence > 0.3) {
        return diagnostic;
      }
    }

    return null;
  };

  /**
   * Gère la sélection d'une photo pour analyse
   */
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de l\'accès à vos photos pour analyser les images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        
        // Analyser l'image (pour l'instant, on demande à l'utilisateur de décrire)
        Alert.alert(
          'Analyse d\'image',
          'Pour une analyse précise, peux-tu décrire ce que tu vois sur la photo ? (plaques rouges, lésions, diarrhée visible, etc.)',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Décrire',
              onPress: () => {
                // L'utilisateur pourra décrire dans le message
                setInputText(prev => prev + ' [Photo jointe] ');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner une image.');
    }
  };

  /**
   * Gère la confirmation du diagnostic et l'enregistrement
   */
  const handleConfirmDiagnostic = async (diagnostic: DiagnosticResult) => {
    if (!diagnostic.disease) return;

    try {
      // Envoyer un message pour enregistrer la maladie
      const message = `Enregistre une maladie : ${diagnostic.disease.name}. Symptômes : ${diagnostic.matchedSymptoms.join(', ')}. Gravité : ${diagnostic.disease.gravity}.`;
      await sendMessage(message);

      // Si urgence critique, alerter
      if (diagnostic.urgency === 'critique' || diagnostic.requiresVetAlert) {
        Alert.alert(
          '⚠️ URGENCE VÉTÉRINAIRE',
          `Maladie grave détectée : ${diagnostic.disease.name}\n\nContacte un vétérinaire en urgence !`,
          [{ text: 'Compris' }]
        );
      }
    } catch (error) {
      console.error('Erreur enregistrement diagnostic:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le diagnostic.');
    }
  };

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || sending || !isInitialized) return;

    try {
      setSending(true);
      
      // Analyser les symptômes avant d'envoyer
      const diagnostic = analyzeSymptomsInMessage(content);
      
      if (diagnostic && diagnostic.disease) {
        // Afficher le modal de diagnostic
        setDiagnosticResult(diagnostic);
        setShowDiagnosticModal(true);
        setInputText(''); // Vider l'input mais ne pas envoyer encore
        setSending(false);
        return;
      }

      // Si pas de diagnostic, envoyer normalement
      setInputText('');
      await sendMessage(content);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message. Réessayez.');
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Effacer la conversation',
      'Voulez-vous vraiment effacer toute la conversation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            clearConversation();
            setInputText('');
          },
        },
      ]
    );
  };

  const handleVoiceInput = async () => {
    if (!voiceServiceRef.current || !isInitialized) {
      Alert.alert('Erreur', 'Le service vocal n\'est pas disponible');
      return;
    }

    if (isListening) {
      // Arrêter l'écoute
      try {
        setIsListening(false); // Mettre à jour l'état immédiatement pour éviter les doubles clics
        const transcript = await voiceServiceRef.current.stopListening();
        if (transcript && transcript.trim()) {
          setInputText(transcript.trim());
        }
      } catch (error: any) {
        console.error('Erreur arrêt écoute:', error);
        setIsListening(false);
      }
    } else {
      // Démarrer l'écoute
      try {
        // S'assurer que la reconnaissance vocale est activée
        if (voiceServiceRef.current) {
          voiceServiceRef.current.setSpeechToTextEnabled(true);
        }
        
        // Mettre à jour l'état avant l'appel asynchrone pour un feedback immédiat
        setIsListening(true);
        
        // Utiliser un timeout pour éviter que l'opération bloque trop longtemps
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout: La reconnaissance vocale prend trop de temps à démarrer')), 5000);
        });
        
        await Promise.race([
          voiceServiceRef.current.startListening((transcript: string) => {
            // Mise à jour en temps réel du texte transcrit (déjà optimisé dans VoiceService)
            if (transcript && transcript.trim()) {
              setInputText(transcript);
            }
          }),
          timeoutPromise,
        ]);
      } catch (error: any) {
        console.error('Erreur démarrage écoute:', error);
        setIsListening(false);
        
        // Message d'erreur plus informatif
        let errorMessage = error.message || 'Impossible de démarrer la reconnaissance vocale.';
        if (errorMessage.includes('Timeout')) {
          errorMessage = 'La reconnaissance vocale prend trop de temps. Essayez de nouveau ou utilisez la saisie texte.';
        } else if (errorMessage.includes('Permission')) {
          errorMessage = 'Permission microphone requise. Activez-la dans les paramètres de l\'application.';
        } else if (errorMessage.includes('n\'est pas disponible')) {
          errorMessage = 'La reconnaissance vocale n\'est pas disponible sur cette plateforme. Utilisez la saisie texte.';
        }
        
        Alert.alert('Erreur', errorMessage);
      }
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

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
              <Text style={[styles.messageText, { color: COLORS.text }]}>
                {item.content}
              </Text>

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
                  <Ionicons
                    name="checkmark-circle"
                    size={12}
                    color={COLORS.textOnPrimary}
                  />
                  <Text
                    style={[styles.actionBadgeText, { color: COLORS.textOnPrimary }]}
                  >
                    Action exécutée
                  </Text>
                </View>
              )}

              <Text
                style={[styles.timestamp, { color: COLORS.textOnPrimary + '80' }]}
              >
                {format(new Date(item.timestamp), 'HH:mm', { locale: fr })}
              </Text>
            </View>
            <View style={styles.avatarContainer}>
              {user?.photo ? (
                <Image source={{ uri: user.photo }} style={styles.userAvatar} />
              ) : (
                <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                  <Text style={styles.userAvatarInitials}>{userInitials}</Text>
                </View>
              )}
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
            <Text style={styles.emptyText}>
              Commencez à discuter avec votre assistant !
            </Text>
          </View>
        }
      />

      {isLoading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.typingText}>L'assistant écrit...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[
            styles.voiceButton,
            isListening && styles.voiceButtonActive,
          ]}
          onPress={handleVoiceInput}
          disabled={sending || !isInitialized}
        >
          {isListening ? (
            <ActivityIndicator size="small" color={COLORS.error} />
          ) : (
            <Ionicons
              name="mic"
              size={24}
              color={COLORS.primary}
            />
          )}
        </TouchableOpacity>

        {/* Bouton photo pour diagnostic */}
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickImage}
          disabled={sending || !isInitialized}
        >
          <Ionicons
            name="camera"
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>

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
              backgroundColor: inputText.trim() && !sending ? COLORS.primary : COLORS.textSecondary,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending || !isInitialized}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
          ) : (
            <Ionicons name="send" size={20} color={COLORS.textOnPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de diagnostic */}
      <DiagnosticModal
        visible={showDiagnosticModal}
        diagnostic={diagnosticResult}
        onClose={() => {
          setShowDiagnosticModal(false);
          setDiagnosticResult(null);
        }}
        onConfirm={handleConfirmDiagnostic}
      />
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
    paddingBottom: 8,
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
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  voiceButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.error + '20',
  },
  photoButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
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
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

