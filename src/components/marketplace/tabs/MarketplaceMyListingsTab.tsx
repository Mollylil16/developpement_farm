/**
 * Onglet "Mes annonces" du Marketplace
 * Affiche les annonces actives de l'utilisateur
 */

import React from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppSelector } from '../../../store/hooks';
import { selectAllAnimaux } from '../../../store/selectors/productionSelectors';
import { getDatabase } from '../../../services/database';
import { getMarketplaceService } from '../../../services/MarketplaceService';
import { MarketplaceTheme } from '../../../styles/marketplace.theme';
import EmptyState from '../../EmptyState';
import type { MarketplaceListing } from '../../../types/marketplace';
import type { ProductionAnimal } from '../../../types/production';
import { getErrorMessage } from '../../../types/errors';

interface MarketplaceMyListingsTabProps {
  listings: MarketplaceListing[];
  loading: boolean;
  onRefresh: () => void;
  onViewDetails: (listing: MarketplaceListing) => void;
}

export default function MarketplaceMyListingsTab({
  listings,
  loading,
  onRefresh,
  onViewDetails,
}: MarketplaceMyListingsTabProps) {
  const marketplaceColors = MarketplaceTheme.colors;
  const { user } = useAppSelector((state) => state.auth);
  const allAnimaux = useAppSelector(selectAllAnimaux);

  const handleRemove = async (listing: MarketplaceListing) => {
    Alert.alert(
      'Retirer de la vente',
      'Voulez-vous retirer cette annonce du marketplace ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const service = getMarketplaceService(db);
              if (!user?.id) {
                Alert.alert('Erreur', 'Utilisateur non connecté');
                return;
              }
              await service.removeListing(listing.id, user.id);
              onRefresh();
              Alert.alert('Succès', 'Annonce retirée du marketplace');
            } catch (error) {
              console.error('Erreur retrait du marketplace:', error);
              Alert.alert('Erreur', getErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: MarketplaceListing }) => {
    const animal = allAnimaux.find((a: ProductionAnimal) => a.id === item.subjectId);

    return (
      <View style={[styles.card, { backgroundColor: marketplaceColors.surface, borderColor: marketplaceColors.border }]}>
        <View style={styles.header}>
          <Text style={[styles.code, { color: marketplaceColors.text }]}>
            {animal?.code || item.code || `#${item.subjectId.slice(0, 8)}`}
            {animal?.nom ? ` (${animal.nom})` : null}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.primary + '15' }]}
              onPress={() => onViewDetails(item)}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.primary }]}>Voir détails</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.error + '15' }]}
              onPress={() => handleRemove(item)}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.error }]}>Retirer</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="scale-outline" size={16} color={marketplaceColors.textSecondary} />
            <Text style={[styles.statText, { color: marketplaceColors.text }]}>
              {item.weight || 0} kg
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="cash-outline" size={16} color={marketplaceColors.textSecondary} />
            <Text style={[styles.statText, { color: marketplaceColors.text }]}>
              {item.pricePerKg} FCFA/kg
            </Text>
          </View>
        </View>
        <Text style={[styles.price, { color: marketplaceColors.primary }]}>
          Prix total: {item.calculatedPrice.toLocaleString()} FCFA
        </Text>
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Ionicons name="eye-outline" size={14} color={marketplaceColors.textSecondary} />
            <Text style={[styles.footerText, { color: marketplaceColors.textSecondary }]}>
              {item.views || 0} vues
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="mail-outline" size={14} color={marketplaceColors.textSecondary} />
            <Text style={[styles.footerText, { color: marketplaceColors.textSecondary }]}>
              {item.inquiries || 0} offres
            </Text>
          </View>
          <Text style={[styles.date, { color: marketplaceColors.textSecondary }]}>
            Publié {format(new Date(item.listedAt), 'd MMM yyyy', { locale: fr })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={listings}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          colors={[marketplaceColors.primary]}
          tintColor={marketplaceColors.primary}
        />
      }
      ListEmptyComponent={
        <EmptyState
          title="Aucune annonce"
          message="Vous n'avez pas encore publié d'annonce. Cliquez sur le bouton + pour en créer une."
          icon="storefront-outline"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  code: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
    marginLeft: 'auto',
  },
});

