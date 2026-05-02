/**
 * Onglet "Acheter" du Marketplace
 * Affiche les fermes et sujets disponibles à l'achat
 */

import React, { useCallback } from 'react';
import { View, FlatList, RefreshControl, Alert, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  listingsError?: string | null;
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
  listingsError,
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

  const renderEmpty = () => {
    // Si erreur, afficher un message d'erreur avec bouton de réessai
    if (listingsError) {
      return (
        <EmptyState
          title="Erreur de chargement"
          message={listingsError || "Impossible de charger les annonces. Vérifiez votre connexion et réessayez."}
          icon={<Ionicons name="alert-circle-outline" size={64} color={marketplaceColors.error} />}
          action={
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: marketplaceColors.primary }]}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={20} color={marketplaceColors.textInverse} />
              <Text style={[styles.retryButtonText, { color: marketplaceColors.textInverse }]}>
                Réessayer
              </Text>
            </TouchableOpacity>
          }
        />
      );
    }
    
    // Sinon, afficher le message d'état vide normal
    return (
      <EmptyState
        title="Aucune annonce disponible"
        message="Il n'y a actuellement aucune annonce correspondant à vos critères de recherche."
        icon={<Ionicons name="storefront-outline" size={64} color={marketplaceColors.textSecondary} />}
      />
    );
  };

  // Afficher les fermes groupées si disponibles, sinon les listings individuels
  if (farmCards.length > 0) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
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
          onEndReached={hasMore && !listingsLoading && !groupingListings ? onLoadMore : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            hasMore && (listingsLoading || groupingListings) && currentPage > 1 ? (
              <View style={styles.footerLoader}>
                <LoadingSpinner message="Chargement de plus d'annonces..." />
              </View>
            ) : null
          }
          // Optimisations FlatList (Phase 4)
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
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
        onEndReached={farmCards.length === 0 && hasMore && !listingsLoading ? onLoadMore : undefined}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          hasMore && (listingsLoading || groupingListings) && currentPage > 1 ? (
            <View style={styles.footerLoader}>
              <LoadingSpinner message="Chargement de plus d'annonces..." />
            </View>
          ) : null
        }
        // Optimisations FlatList (Phase 4)
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 100, // ✅ Espace pour voir la dernière carte
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(MarketplaceBuyTab);