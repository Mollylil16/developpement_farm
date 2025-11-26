/**
 * Composant message de chat
 * Affichage différencié sent/received avec timestamps
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { formatDate } from '../../utils/formatters';
import type { ChatMessage as ChatMessageType } from '../../types/marketplace';

interface ChatMessageProps {
  message: ChatMessageType;
  isSent: boolean;
  showAvatar?: boolean;
  onImagePress?: (imageUrl: string) => void;
}

export default function ChatMessage({
  message,
  isSent,
  showAvatar = true,
  onImagePress,
}: ChatMessageProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const renderAttachment = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <View style={styles.attachmentsContainer}>
        {message.attachments.map((attachment, index) => {
          if (attachment.type === 'image') {
            return (
              <TouchableOpacity
                key={index}
                onPress={() => onImagePress?.(attachment.url)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: attachment.url }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            );
          }

          if (attachment.type === 'document') {
            return (
              <TouchableOpacity
                key={index}
                style={[styles.documentAttachment, { backgroundColor: colors.surfaceLight }]}
                onPress={() => Alert.alert('Document', 'Téléchargement : ' + attachment.fileName)}
              >
                <Ionicons name="document-outline" size={24} color={colors.primary} />
                <Text
                  style={[styles.documentName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {attachment.fileName}
                </Text>
              </TouchableOpacity>
            );
          }

          return null;
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, isSent ? styles.sentContainer : styles.receivedContainer]}>
      {/* Avatar (pour messages reçus uniquement) */}
      {!isSent && showAvatar && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="person" size={20} color={colors.textInverse} />
        </View>
      )}

      {/* Message bubble */}
      <View
        style={[
          styles.bubble,
          isSent
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.surface },
          !isSent && showAvatar && styles.bubbleWithAvatar,
        ]}
      >
        {/* Contenu texte */}
        {message.content && (
          <Text
            style={[
              styles.messageText,
              { color: isSent ? colors.textInverse : colors.text },
            ]}
          >
            {message.content}
          </Text>
        )}

        {/* Pièces jointes */}
        {renderAttachment()}

        {/* Proposition de prix (type spécial) */}
        {message.type === 'price_proposal' && message.priceProposal && (
          <View
            style={[
              styles.priceProposal,
              {
                backgroundColor: isSent
                  ? colors.textInverse + '20'
                  : colors.primary + '10',
                borderColor: isSent ? colors.textInverse : colors.primary,
              },
            ]}
          >
            <Ionicons
              name="pricetag"
              size={16}
              color={isSent ? colors.textInverse : colors.primary}
            />
            <Text
              style={[
                styles.priceProposalText,
                { color: isSent ? colors.textInverse : colors.primary },
              ]}
            >
              Nouvelle proposition : {message.priceProposal.toLocaleString()} FCFA
            </Text>
          </View>
        )}

        {/* Timestamp et statut */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.timestamp,
              { color: isSent ? colors.textInverse + 'AA' : colors.textSecondary },
            ]}
          >
            {formatDate(message.createdAt, 'HH:mm')}
          </Text>

          {/* Statut (pour messages envoyés uniquement) */}
          {isSent && (
            <Ionicons
              name={
                message.read
                  ? 'checkmark-done'
                  : message.sentAt
                  ? 'checkmark'
                  : 'time-outline'
              }
              size={14}
              color={
                message.read
                  ? colors.success
                  : colors.textInverse + 'AA'
              }
            />
          )}
        </View>
      </View>

      {/* Placeholder pour alignement */}
      {isSent && <View style={styles.placeholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: MarketplaceTheme.spacing.xs,
    paddingHorizontal: MarketplaceTheme.spacing.md,
  },
  sentContainer: {
    justifyContent: 'flex-end',
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MarketplaceTheme.spacing.xs,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.lg,
    ...MarketplaceTheme.shadows.small,
  },
  bubbleWithAvatar: {
    borderTopLeftRadius: MarketplaceTheme.borderRadius.xs,
  },
  messageText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    lineHeight: 20,
  },
  attachmentsContainer: {
    marginTop: MarketplaceTheme.spacing.sm,
    gap: MarketplaceTheme.spacing.xs,
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginTop: MarketplaceTheme.spacing.xs,
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
    padding: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    marginTop: MarketplaceTheme.spacing.xs,
  },
  documentName: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  priceProposal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.xs,
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.xs,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    borderWidth: 1,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  priceProposalText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  placeholder: {
    width: 32,
  },
});
