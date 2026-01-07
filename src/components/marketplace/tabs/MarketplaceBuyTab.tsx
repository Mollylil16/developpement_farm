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
import BatchListingCard from '../BatchListingCard';
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
      // Si c'est un listing de bande, utiliser BatchListingCard
      if (item.listingType === 'batch' || item.batchId) {
        return (
          <BatchListingCard
            listing={item}
            selected={false}
            onPress={() => {
              console.log('[MarketplaceBuyTab] Clic sur BatchListingCard', {
                listingId: item.id,
                listingType: item.listingType,
                batchId: item.batchId,
                status: item.status,
                hasOnListingPress: !!onListingPress,
              });
              if (onListingPress) {
                onListingPress(item);
              } else {
                console.warn('[MarketplaceBuyTab] onListingPress n\'est pas défini pour BatchListingCard');
              }
            }}
          />
        );
      }

      // Sinon, utiliser SubjectCard pour les listings individuels
      // S'assurer que available est défini : un listing est disponible si status === 'available'
      const available = item.status === 'available' && (item.available !== false);
      
      return (
        <SubjectCard
          subject={{
            id: item.subjectId || item.id,
            code: item.code || `#${(item.subjectId || item.id).slice(0, 8)}`,
            race: item.race || 'Non spécifiée',
            weight: item.weight || 0,
            weightDate: item.weightDate || item.lastWeightDate,
            age: item.age || 0,
            pricePerKg: item.pricePerKg,
            totalPrice: item.calculatedPrice,
            healthStatus: item.healthStatus || 'good',
            vaccinations: item.vaccinations || false,
            available,
          }}
          selected={false}
          onPress={() => {
            console.log('[MarketplaceBuyTab] Clic sur SubjectCard', {
              listingId: item.id,
              subjectId: item.subjectId,
              available,
              status: item.status,
            });
            if (onListingPress) {
              onListingPress(item);
            } else {
              console.warn('[MarketplaceBuyTab] onListingPress n\'est pas défini');
            }
          }}
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

  // Afficher les fermes groupées si disponibles, sinon les listings individuels
  if (farmCards.length > 0) {
    return (
      <FlatList
        data={farmCards}
        renderItem={renderFarmCard}
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
        ListEmptyComponent={renderEmpty}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        // Optimisations FlatList (Phase 4)
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
      />
    );
  }

  return (
    <FlatList
      data={listings}
      renderItem={renderListing}
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
      // Optimisations FlatList (Phase 4)
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={10}
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

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(MarketplaceBuyTab);