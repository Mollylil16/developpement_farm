/**
 * Composant Skeleton pour les listings du Marketplace
 * Affiche un placeholder animé pendant le chargement
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import { MarketplaceTheme } from '../../../styles/marketplace.theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Composant Skeleton de base avec animation
const SkeletonBox: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: MarketplaceTheme.colors.surfaceLight,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton pour un listing individuel
export const ListingCardSkeleton: React.FC = () => {
  const { colors, spacing, borderRadius } = MarketplaceTheme;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.divider,
        },
      ]}
    >
      {/* Image placeholder */}
      <SkeletonBox height={120} borderRadius={borderRadius.md} />
      
      <View style={styles.content}>
        {/* Title */}
        <SkeletonBox width="70%" height={18} style={{ marginBottom: spacing.xs }} />
        
        {/* Price */}
        <SkeletonBox width="40%" height={24} style={{ marginBottom: spacing.sm }} />
        
        {/* Details row */}
        <View style={styles.row}>
          <SkeletonBox width={60} height={16} />
          <SkeletonBox width={80} height={16} />
        </View>
        
        {/* Location */}
        <SkeletonBox width="60%" height={14} style={{ marginTop: spacing.xs }} />
      </View>
    </View>
  );
};

// Skeleton pour une carte de ferme
export const FarmCardSkeleton: React.FC = () => {
  const { colors, spacing, borderRadius } = MarketplaceTheme;

  return (
    <View
      style={[
        styles.farmCard,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.divider,
        },
      ]}
    >
      {/* Header avec avatar */}
      <View style={styles.farmHeader}>
        <SkeletonBox width={48} height={48} borderRadius={24} />
        <View style={styles.farmInfo}>
          <SkeletonBox width="60%" height={18} style={{ marginBottom: spacing.xs }} />
          <SkeletonBox width="40%" height={14} />
        </View>
      </View>
      
      {/* Stats */}
      <View style={styles.farmStats}>
        <View style={styles.statItem}>
          <SkeletonBox width={40} height={24} />
          <SkeletonBox width={60} height={12} style={{ marginTop: spacing.xs }} />
        </View>
        <View style={styles.statItem}>
          <SkeletonBox width={80} height={24} />
          <SkeletonBox width={50} height={12} style={{ marginTop: spacing.xs }} />
        </View>
        <View style={styles.statItem}>
          <SkeletonBox width={60} height={24} />
          <SkeletonBox width={70} height={12} style={{ marginTop: spacing.xs }} />
        </View>
      </View>
      
      {/* Location */}
      <SkeletonBox width="50%" height={14} style={{ marginTop: spacing.sm }} />
    </View>
  );
};

// Skeleton pour une offre
export const OfferCardSkeleton: React.FC = () => {
  const { colors, spacing, borderRadius } = MarketplaceTheme;

  return (
    <View
      style={[
        styles.offerCard,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.divider,
        },
      ]}
    >
      <View style={styles.offerHeader}>
        <SkeletonBox width={40} height={40} borderRadius={20} />
        <View style={[styles.farmInfo, { flex: 1 }]}>
          <SkeletonBox width="50%" height={16} style={{ marginBottom: spacing.xs }} />
          <SkeletonBox width="30%" height={12} />
        </View>
        <SkeletonBox width={80} height={28} borderRadius={14} />
      </View>
      
      <View style={styles.offerDetails}>
        <SkeletonBox width="100%" height={14} style={{ marginBottom: spacing.xs }} />
        <SkeletonBox width="70%" height={14} />
      </View>
      
      <View style={styles.offerActions}>
        <SkeletonBox width={100} height={36} borderRadius={18} />
        <SkeletonBox width={100} height={36} borderRadius={18} />
      </View>
    </View>
  );
};

// Liste de skeletons
export const ListingSkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <ListingCardSkeleton key={index} />
      ))}
    </View>
  );
};

export const FarmSkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <FarmCardSkeleton key={index} />
      ))}
    </View>
  );
};

export const OfferSkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <OfferCardSkeleton key={index} />
      ))}
    </View>
  );
};

// Skeleton pour le chat Kouakou
export const ChatMessageSkeleton: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => {
  const { colors, spacing, borderRadius } = MarketplaceTheme;

  return (
    <View
      style={[
        styles.chatMessage,
        isUser ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      {!isUser && <SkeletonBox width={36} height={36} borderRadius={18} />}
      <View style={[styles.messageBubble, isUser && styles.userBubble]}>
        <SkeletonBox width={isUser ? 150 : 200} height={14} style={{ marginBottom: spacing.xs }} />
        <SkeletonBox width={isUser ? 100 : 180} height={14} />
        {!isUser && <SkeletonBox width={120} height={14} style={{ marginTop: spacing.xs }} />}
      </View>
    </View>
  );
};

export const ChatSkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <View style={styles.chatList}>
      {Array.from({ length: count }).map((_, index) => (
        <ChatMessageSkeleton key={index} isUser={index % 2 === 1} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: MarketplaceTheme.spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: MarketplaceTheme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  farmCard: {
    marginBottom: MarketplaceTheme.spacing.md,
    padding: MarketplaceTheme.spacing.md,
    borderWidth: 1,
  },
  farmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmInfo: {
    marginLeft: MarketplaceTheme.spacing.sm,
  },
  farmStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: MarketplaceTheme.spacing.md,
    paddingTop: MarketplaceTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: MarketplaceTheme.colors.divider,
  },
  statItem: {
    alignItems: 'center',
  },
  offerCard: {
    marginBottom: MarketplaceTheme.spacing.md,
    padding: MarketplaceTheme.spacing.md,
    borderWidth: 1,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerDetails: {
    marginTop: MarketplaceTheme.spacing.md,
    paddingTop: MarketplaceTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: MarketplaceTheme.colors.divider,
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: MarketplaceTheme.spacing.md,
  },
  list: {
    padding: MarketplaceTheme.spacing.md,
  },
  chatList: {
    padding: MarketplaceTheme.spacing.md,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: MarketplaceTheme.spacing.md,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    padding: MarketplaceTheme.spacing.sm,
    marginLeft: MarketplaceTheme.spacing.xs,
    backgroundColor: MarketplaceTheme.colors.surfaceLight,
    borderRadius: MarketplaceTheme.borderRadius.md,
    maxWidth: '70%',
  },
  userBubble: {
    marginLeft: 0,
    marginRight: MarketplaceTheme.spacing.xs,
  },
});

export default ListingCardSkeleton;
