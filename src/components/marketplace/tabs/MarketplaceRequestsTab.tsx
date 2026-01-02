/**
 * Onglet "Demandes" du Marketplace
 * Affiche les demandes d'achat avec deux sections : "Envoyées" et "Reçues"
 * Supporte à la fois les acheteurs et les producteurs
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MarketplaceTheme } from '../../../styles/marketplace.theme';
import type { PurchaseRequest } from '../../../types/marketplace';
import apiClient from '../../../services/api/apiClient';
import { createLoggerWithPrefix } from '../../../utils/logger';
import PurchaseRequestCard from '../PurchaseRequestCard';
import EmptyState from '../../EmptyState';
import LoadingSpinner from '../../LoadingSpinner';

const logger = createLoggerWithPrefix('MarketplaceRequestsTab');

interface MarketplaceRequestsTabProps {
  userId: string;
  onRequestPress?: (request: PurchaseRequest) => void;
  onEditRequest?: (request: PurchaseRequest) => void;
  onDeleteRequest?: (request: PurchaseRequest) => void;
  onRespondToRequest?: (request: PurchaseRequest) => void;
}

type SectionType = 'sent' | 'received';

export default function MarketplaceRequestsTab({
  userId,
  onRequestPress,
  onEditRequest,
  onDeleteRequest,
  onRespondToRequest,
}: MarketplaceRequestsTabProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;
  const [activeSection, setActiveSection] = useState<SectionType>('sent');
  const [sentRequests, setSentRequests] = useState<PurchaseRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [loadingReceived, setLoadingReceived] = useState(false);

  // Charger les demandes envoyées
  const loadSentRequests = useCallback(async () => {
    try {
      setLoadingSent(true);
      const requests = await apiClient.get<PurchaseRequest[]>('/marketplace/purchase-requests/sent');
      setSentRequests(requests || []);
    } catch (error: unknown) {
      logger.error('Erreur chargement demandes envoyées:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossible de charger vos demandes envoyées";
      Alert.alert('Erreur', errorMessage);
      setSentRequests([]);
    } finally {
      setLoadingSent(false);
    }
  }, []);

  // Charger les demandes reçues
  const loadReceivedRequests = useCallback(async () => {
    try {
      setLoadingReceived(true);
      const requests = await apiClient.get<PurchaseRequest[]>('/marketplace/purchase-requests/received');
      setReceivedRequests(requests || []);
    } catch (error: unknown) {
      logger.error('Erreur chargement demandes reçues:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossible de charger les demandes reçues";
      Alert.alert('Erreur', errorMessage);
      setReceivedRequests([]);
    } finally {
      setLoadingReceived(false);
    }
  }, []);

  // Charger toutes les demandes
  const loadAllRequests = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadSentRequests(), loadReceivedRequests()]);
    setLoading(false);
  }, [loadSentRequests, loadReceivedRequests]);

  // Charger au montage et quand l'écran est focus
  useEffect(() => {
    loadAllRequests();
  }, [loadAllRequests]);

  useFocusEffect(
    useCallback(() => {
      // Recharger quand l'écran est focus
      if (activeSection === 'sent') {
        loadSentRequests();
      } else {
        loadReceivedRequests();
      }
    }, [activeSection, loadSentRequests, loadReceivedRequests])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeSection === 'sent') {
      loadSentRequests().finally(() => setRefreshing(false));
    } else {
      loadReceivedRequests().finally(() => setRefreshing(false));
    }
  }, [activeSection, loadSentRequests, loadReceivedRequests]);

  const handleDeleteRequest = useCallback(
    async (request: PurchaseRequest) => {
      Alert.alert(
        'Supprimer la demande',
        'Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                await apiClient.delete(`/marketplace/purchase-requests/${request.id}`);
                if (onDeleteRequest) {
                  onDeleteRequest(request);
                }
                // Recharger les demandes
                if (activeSection === 'sent') {
                  await loadSentRequests();
                }
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : "Impossible de supprimer la demande";
                Alert.alert('Erreur', errorMessage);
              }
            },
          },
        ]
      );
    },
    [activeSection, loadSentRequests, onDeleteRequest]
  );

  const handleEditRequest = useCallback(
    (request: PurchaseRequest) => {
      if (onEditRequest) {
        onEditRequest(request);
      }
    },
    [onEditRequest]
  );

  const handleRespondToRequest = useCallback(
    (request: PurchaseRequest) => {
      if (onRespondToRequest) {
        onRespondToRequest(request);
      }
    },
    [onRespondToRequest]
  );

  const handleRequestPress = useCallback(
    (request: PurchaseRequest) => {
      if (onRequestPress) {
        onRequestPress(request);
      }
    },
    [onRequestPress]
  );

  const currentRequests = activeSection === 'sent' ? sentRequests : receivedRequests;
  const isLoading = activeSection === 'sent' ? loadingSent : loadingReceived;

  const renderRequestCard = useCallback(
    ({ item }: { item: PurchaseRequest }) => (
      <PurchaseRequestCard
        request={item}
        type={activeSection}
        onPress={() => handleRequestPress(item)}
        onRespond={activeSection === 'received' ? () => handleRespondToRequest(item) : undefined}
        onEdit={activeSection === 'sent' ? () => handleEditRequest(item) : undefined}
        onDelete={activeSection === 'sent' ? () => handleDeleteRequest(item) : undefined}
      />
    ),
    [activeSection, handleRequestPress, handleRespondToRequest, handleEditRequest, handleDeleteRequest]
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    return (
      <EmptyState
        icon="search"
        title={activeSection === 'sent' ? 'Aucune demande envoyée' : 'Aucune demande reçue'}
        message={
          activeSection === 'sent'
            ? "Vous n'avez pas encore créé de demande d'achat. Créez-en une pour trouver les sujets qui vous intéressent."
            : "Aucune demande ne correspond actuellement à vos sujets disponibles. Les demandes correspondantes apparaîtront ici."
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Sous-onglets */}
      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeSection === 'sent' && [
              styles.activeTab,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveSection('sent')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeSection === 'sent'
                    ? colors.primary
                    : colors.textSecondary,
              },
            ]}
          >
            Envoyées ({sentRequests?.length ?? 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeSection === 'received' && [
              styles.activeTab,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveSection('received')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeSection === 'received'
                    ? colors.primary
                    : colors.textSecondary,
              },
            ]}
          >
            Reçues ({receivedRequests?.length ?? 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des demandes */}
      {isLoading && currentRequests.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={currentRequests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={currentRequests.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          // Optimisations FlatList (Phase 4)
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

