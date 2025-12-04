/**
 * Onglet "Acheter" du Marketplace
 * Affiche les fermes et sujets disponibles à l'achat
 */

import React, { useCallback } from 'react';
import { View, FlatList, RefreshControl, Alert, StyleSheet } from 'react-native';
import { useAppSelector } from '../../../store/hooks';
import { MarketplaceTheme } from '../../../styles/marketplace.theme';
import FarmCard from '../FarmCard';
import SubjectCard from '../SubjectCard';
import LoadingSpinner from '../../LoadingSpinner';
import EmptyState from '../../EmptyState';
import type { FarmCard as FarmCardType, MarketplaceListing } from '../../../types/marketplace';

interface MarketplaceBuyTabProps {
  farmCards: FarmCardType[];
  listings: MarketplaceListing[];
  listingsLoading: boolean;
  groupingListings: boolean;
  currentPage: number;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onFarmPress: (farm: FarmCardType) => void;
  onListingPress: (listing: MarketplaceListing) => void;
  onFavoriteChange: (farmId: string, isFavorite: boolean) => void;
}

export default function MarketplaceBuyTab({
  farmCards,
  listings,
  listingsLoading,
  groupingListings,
  currentPage,
  hasMore,
  onRefresh,
  onLoadMore,
  onFarmPress,
  onListingPress,
  onFavoriteChange,
}: MarketplaceBuyTabProps) {
  const marketplaceColors = MarketplaceTheme.colors;

  const renderFarmCard = useCallback(
    ({ item }: { item: FarmCardType }) => {
      return (
        <FarmCard
          farm={item}
          distance={item.distance || null}
          onPress={() => onFarmPress(item)}
          onConditionsPress={() => {
            Alert.alert(
              'Conditions de vente',
              `Transport: À votre charge\nAbattage: À votre charge\nPaiement: À la livraison`
            );
          }}
          onFavoriteChange={onFavoriteChange}
        />
      );
    },
    [onFarmPress, onFavoriteChange]
  );

  const renderListing = useCallback(
    ({ item }: { item: MarketplaceListing }) => {
      return (
        <SubjectCard
          subject={{
            id: item.subjectId,
            code: item.code || `#${item.subjectId.slice(0, 8)}`,
            race: item.race || 'Non spécifiée',
            weight: item.weight || 0,
            weightDate: item.weightDate || item.lastWeightDate,
            age: item.age || 0,
            pricePerKg: item.pricePerKg,
            totalPrice: item.calculatedPrice,
            healthStatus: item.healthStatus || 'good',
            vaccinations: item.vaccinations || false,
            available: item.available !== false,
          }}
          selected={false}
          onPress={() => onListingPress(item)}
        />
      );
    },
    [onListingPress]
  );

  const renderEmpty = () => (
    <EmptyState
      title="Aucune annonce disponible"
      message="Il n'y a actuellement aucune annonce correspondant à vos critères de recherche."
      icon="storefront-outline"
    />
  );

  return (
    <FlatList
      data={farmCards.length > 0 ? farmCards : listings}
      renderItem={farmCards.length > 0 ? renderFarmCard : renderListing}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={(listingsLoading || groupingListings) && currentPage === 1}
          onRefresh={onRefresh}
          colors={[marketplaceColors.primary]}
          tintColor={marketplaceColors.primary}
        />
      }
      onEndReached={farmCards.length === 0 ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={
        (listingsLoading || groupingListings) && currentPage > 1 ? (
          <View style={styles.footerLoader}>
            <LoadingSpinner message="Chargement..." />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  footerLoader: {
    paddingVertical: 20,
  },
});

