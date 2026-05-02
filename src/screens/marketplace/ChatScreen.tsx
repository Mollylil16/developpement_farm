/**
 * Écran de chat pour une transaction
 * Conversation en temps réel avec contexte transaction
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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import ChatMessage from '../../components/marketplace/ChatMessage';
import type { ChatMessage as ChatMessageType, Transaction } from '../../types/marketplace';
import { useAppSelector } from '../../store/hooks';
import { useMarketplaceChat } from '../../hooks/useMarketplaceChat';

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAppSelector((state) => state.auth);
  
  // Récupérer les paramètres de route
  const { transactionId } = (route.params as { transactionId?: string }) || {};
  
  // Utiliser le hook pour charger les données du chat
  const {
    messages,
    conversation,
    loading,
    sendMessage,
    sendPriceProposal,
  } = useMarketplaceChat(transactionId || '');
  
  const currentUserId = user?.id || '';
  
  // Récupérer la transaction depuis la conversation ou charger séparément
  // Pour l'instant, on utilise une transaction factice basée sur la conversation
  const transaction: Transaction | null = conversation ? {
    id: transactionId || '',
    offerId: conversation.relatedOfferId || '',
    buyerId: conversation.participants[0] || '',
    producerId: conversation.participants[1] || conversation.participants[0] || '',
    subjectIds: [],
    finalPrice: 0,
    status: 'pending_delivery',
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    documents: {},
  } : null;
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll au dernier message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || sending) return;

    try {
      setSending(true);
      setInputText('');
      await sendMessage(content);
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderHeader = () => {
    if (!transaction) return null;
    
    return (
      <View style={[styles.headerContext, { backgroundColor: colors.surfaceLight }]}>
        <View style={styles.contextRow}>
          <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>Transaction:</Text>
          <Text style={[styles.contextValue, { color: colors.text }]}>
            {transaction.subjectIds?.length || 0} sujet(s)
          </Text>
        </View>

        <View style={styles.contextRow}>
          <Ionicons name="cash-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>Montant:</Text>
          <Text style={[styles.contextValue, { color: colors.primary }]}>
            {transaction.finalPrice?.toLocaleString() || '0'} FCFA
          </Text>
        </View>

        <View style={styles.contextRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>Statut:</Text>
          <Text style={[styles.contextValue, { color: colors.text }]}>
            {transaction.status === 'pending_delivery'
              ? 'En attente de livraison'
              : transaction.status === 'completed'
                ? 'Terminé'
                : 'En cours'}
          </Text>
        </View>
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: ChatMessageType; index: number }) => {
    const isSent = item.senderId === currentUserId;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !previousMessage || previousMessage.senderId !== item.senderId;

    return (
      <ChatMessage
        message={item}
        isSent={isSent}
        showAvatar={showAvatar}
        onImagePress={(url) => console.log('Image pressed:', url)}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Aucun message pour le moment
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
        Commencez la conversation avec votre partenaire
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View
        style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Liste des messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && styles.messagesListEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input message */}
      <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
        {/* Actions rapides (optionnel) */}
        {sendPriceProposal && transaction && transaction.status === 'pending_delivery' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // TODO: Ouvrir modal proposition prix
              console.log('Proposition de prix');
            }}
          >
            <Ionicons name="pricetag-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Bouton pièce jointe */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // TODO: Ouvrir sélecteur de fichier
            console.log('Pièce jointe');
          }}
        >
          <Ionicons name="attach-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Champ texte */}
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.surfaceLight, color: colors.text }]}
          placeholder="Écrivez un message..."
          placeholderTextColor={colors.textLight}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          editable={!sending}
        />

        {/* Bouton envoi */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() ? colors.primary : colors.textLight,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Ionicons name="send" size={20} color={colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: MarketplaceTheme.spacing.md,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
  headerContext: {
    padding: MarketplaceTheme.spacing.md,
    gap: MarketplaceTheme.spacing.xs,
    marginBottom: MarketplaceTheme.spacing.md,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.xs,
  },
  contextLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  contextValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  messagesList: {
    paddingVertical: MarketplaceTheme.spacing.sm,
  },
  messagesListEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.xl,
  },
  emptyText: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    marginTop: MarketplaceTheme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginTop: MarketplaceTheme.spacing.xs,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    gap: MarketplaceTheme.spacing.sm,
    ...MarketplaceTheme.shadows.medium,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.lg,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
