/**
 * Carte de demande d'achat
 * Design bleu pour différencier des cartes d'offres (vert)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import type { PurchaseRequest, PurchaseRequestStatus } from '../../types/marketplace';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from '../Button';

interface PurchaseRequestCardProps {
  request: PurchaseRequest;
  type: 'sent' | 'received'; // 'sent' = envoyée par l'utilisateur, 'received' = reçue
  onPress: () => void;
  onRespond?: () => void; // Pour répondre à une demande reçue
  onEdit?: () => void; // Pour modifier une demande envoyée
  onDelete?: () => void; // Pour supprimer une demande envoyée
}

const STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  published: 'Publiée',
  pending: 'En attente',
  fulfilled: 'Satisfaite',
  expired: 'Expirée',
  archived: 'Archivée',
  cancelled: 'Annulée',
};

const STATUS_COLORS: Record<PurchaseRequestStatus, string> = {
  published: '#4CAF50',
  pending: '#FF9800',
  fulfilled: '#2196F3',
  expired: '#9E9E9E',
  archived: '#757575',
  cancelled: '#F44336',
};

export default function PurchaseRequestCard({
  request,
  type,
  onPress,
  onRespond,
  onEdit,
  onDelete,
}: PurchaseRequestCardProps) {
  const { colors, spacing, typography, borderRadius, shadows } = MarketplaceTheme;

  // Style bleu pour les demandes (différent du vert des offres)
  const cardStyle = {
    backgroundColor: colors.info + '15', // Bleu clair
    borderColor: colors.info, // Bordure bleue
    borderWidth: 2,
    ...shadows.small,
  };

  const statusColor = STATUS_COLORS[request.status] || colors.textSecondary;
  const isExpired = request.expiresAt && new Date(request.expiresAt) < new Date();

  return (
    <TouchableOpacity
      style={[styles.card, cardStyle, { borderRadius }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header avec icône de recherche */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.info }]}>
          <Ionicons name="search" size={20} color={colors.textInverse} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {request.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {STATUS_LABELS[request.status]}
              </Text>
            </View>
            {request.senderType === 'producer' && (
              <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.warning }]}>Producteur</Text>
              </View>
            )}
            {request.managementMode && (
              <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {request.managementMode === 'both' ? 'Bande/Individuel' : 
                   request.managementMode === 'batch' ? 'Bande' : 'Individuel'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Critères clés */}
      <View style={styles.criteria}>
        <View style={styles.criteriaRow}>
          <Ionicons name="paw" size={16} color={colors.textSecondary} />
          <Text style={[styles.criteriaText, { color: colors.text }]}>
            Race: <Text style={styles.criteriaValue}>{request.race}</Text>
          </Text>
        </View>

        <View style={styles.criteriaRow}>
          <Ionicons name="scale" size={16} color={colors.textSecondary} />
          <Text style={[styles.criteriaText, { color: colors.text }]}>
            Poids: <Text style={styles.criteriaValue}>
              {request.minWeight}-{request.maxWeight} kg
            </Text>
          </Text>
        </View>

        <View style={styles.criteriaRow}>
          <Ionicons name="people" size={16} color={colors.textSecondary} />
          <Text style={[styles.criteriaText, { color: colors.text }]}>
            Quantité: <Text style={styles.criteriaValue}>{request.quantity}</Text>
          </Text>
        </View>

        {request.maxPricePerKg && (
          <View style={styles.criteriaRow}>
            <Ionicons name="cash" size={16} color={colors.textSecondary} />
            <Text style={[styles.criteriaText, { color: colors.text }]}>
              Prix max: <Text style={styles.criteriaValue}>
                {request.maxPricePerKg.toLocaleString('fr-FR')} FCFA/kg
              </Text>
            </Text>
          </View>
        )}

        {request.growthStage && (
          <View style={styles.criteriaRow}>
            <Ionicons name="trending-up" size={16} color={colors.textSecondary} />
            <Text style={[styles.criteriaText, { color: colors.text }]}>
              Stade: <Text style={styles.criteriaValue}>{request.growthStage}</Text>
            </Text>
          </View>
        )}

        {request.deliveryLocation?.city && (
          <View style={styles.criteriaRow}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
            <Text style={[styles.criteriaText, { color: colors.text }]}>
              {request.deliveryLocation.city}
              {request.deliveryLocation.region && `, ${request.deliveryLocation.region}`}
            </Text>
          </View>
        )}
      </View>

      {/* Statistiques */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Ionicons name="eye" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {request.views ?? 0} vues
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {request.matchedProducersCount ?? 0} correspondances
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="mail" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {request.offersCount ?? 0} réponses
          </Text>
        </View>
      </View>

      {/* Date et expiration */}
      <View style={styles.footer}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          Créée le {format(new Date(request.createdAt), 'dd MMM yyyy', { locale: fr })}
        </Text>
        {request.expiresAt && (
          <Text
            style={[
              styles.dateText,
              { color: isExpired ? colors.error : colors.textSecondary },
            ]}
          >
            {isExpired ? 'Expirée' : `Expire le ${format(new Date(request.expiresAt), 'dd MMM yyyy', { locale: fr })}`}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {type === 'received' && onRespond && request.status === 'published' && (
          <Button
            title="Répondre"
            onPress={onRespond}
            variant="primary"
            style={styles.actionButton}
          />
        )}
        {type === 'sent' && (
          <>
            {onEdit && request.status === 'published' && (
              <Button
                title="Modifier"
                onPress={onEdit}
                variant="secondary"
                style={styles.actionButton}
              />
            )}
            {onDelete && (request.status === 'published' || request.status === 'pending') && (
              <Button
                title="Supprimer"
                onPress={onDelete}
                variant="destructive"
                style={styles.actionButton}
              />
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  criteria: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  criteriaText: {
    fontSize: FONT_SIZES.sm,
  },
  criteriaValue: {
    fontWeight: FONT_WEIGHTS.semibold,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: SPACING.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  statText: {
    fontSize: FONT_SIZES.xs,
  },
  footer: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
  },
});

