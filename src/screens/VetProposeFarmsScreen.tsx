/**
 * Écran pour les vétérinaires : Proposer des services aux fermes
 * Affiche les fermes dans le rayon de service et permet de proposer ses services
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { getFarmService, type Farm as FarmServiceFarm } from '../services/FarmService';
import { LIGHT_COLORS } from '../constants/theme';

interface Farm {
  id: string;
  name: string;
  city: string;
  region: string;
  distance: number;
  herdSize: number;
  producer: {
    name: string;
  };
  farmType?: string;
  capacity?: number;
  specialization?: string;
  veterinarian?: string | null;
}

const VetProposeFarmsScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [filter, setFilter] = useState<'all' | 'no_vet'>('all');

  const vetProfile = currentUser?.roles?.veterinarian;

  useEffect(() => {
    loadNearbyFarms();
  }, [filter]);

  const loadNearbyFarms = async () => {
    try {
      setLoading(true);

      // Récupérer les fermes dans le rayon de service
      const farmService = await getFarmService();
      const nearbyFarmsService = await farmService.getFarmsNearLocation(
        vetProfile?.workLocation?.latitude || 0,
        vetProfile?.workLocation?.longitude || 0,
        vetProfile?.workLocation?.serviceRadius || 50
      );

      // Calculer la distance pour chaque ferme et mapper vers le type Farm local
      const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371; // Rayon de la Terre en km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      const nearbyFarms: Farm[] = nearbyFarmsService.map((farm: FarmServiceFarm) => {
        const distance = calculateDistance(
          vetProfile?.workLocation?.latitude || 0,
          vetProfile?.workLocation?.longitude || 0,
          farm.latitude,
          farm.longitude
        );
        return {
          id: farm.id,
          name: farm.name,
          city: farm.city,
          region: farm.region,
          distance,
          herdSize: farm.herdSize,
          producer: { name: farm.producer.name },
          farmType: farm.farmType,
          capacity: farm.capacity,
          specialization: farm.specialization,
          veterinarian: farm.veterinarian,
        };
      });

      // Pour l'instant, on simule avec des données mock si aucune ferme n'est trouvée
      const mockFarms: Farm[] = [
        {
          id: '1',
          name: 'Ferme de la Paix',
          city: 'Abidjan',
          region: 'Lagunes',
          distance: 12.5,
          herdSize: 150,
          producer: { name: 'Jean Kouassi' },
          farmType: 'Coopérative',
          capacity: 200,
          veterinarian: null,
        },
        {
          id: '2',
          name: 'Élevage Moderne',
          city: 'Yamoussoukro',
          region: 'Yamoussoukro',
          distance: 45.2,
          herdSize: 80,
          producer: { name: 'Marie Diallo' },
          farmType: 'Individuel',
          capacity: 100,
          veterinarian: 'vet-123',
        },
      ];

      // Utiliser les fermes récupérées ou les données mock
      const farmsToUse = nearbyFarms.length > 0 ? nearbyFarms : mockFarms;

      // Filtrer selon le filtre actif
      let filteredFarms = farmsToUse;
      if (filter === 'no_vet') {
        filteredFarms = farmsToUse.filter((farm) => !farm.veterinarian);
      }

      // Exclure les fermes où on a déjà proposé
      const proposedFarmIds =
        vetProfile?.serviceProposals?.filter((p) => p.status === 'pending').map((p) => p.farmId) ||
        [];

      filteredFarms = filteredFarms.filter((farm) => !proposedFarmIds.includes(farm.id));

      setFarms(filteredFarms);
    } catch (error) {
      console.error('Erreur chargement fermes:', error);
      Alert.alert('Erreur', 'Impossible de charger les fermes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNearbyFarms();
    setRefreshing(false);
  }, [filter]);

  const handlePropose = async (farmId: string) => {
    try {
      if (!currentUser?.id) {
        Alert.alert('Erreur', 'Utilisateur non identifié');
        return;
      }

      // Proposer le service
      const farmService = await getFarmService();
      await farmService.proposeServiceToFarm(currentUser.id, farmId);

      Alert.alert(
        'Proposition envoyée !',
        'Le producteur recevra une notification et pourra accepter ou refuser votre proposition.'
      );

      // Recharger la liste
      loadNearbyFarms();
    } catch (error: unknown) {
      Alert.alert('Erreur', (error instanceof Error ? error.message : String(error)) || "Impossible d'envoyer la proposition");
    }
  };

  if (!vetProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="medical-outline"
          title="Profil Vétérinaire requis"
          message="Activez votre profil vétérinaire pour proposer vos services"
        />
      </SafeAreaView>
    );
  }

  if (vetProfile.validationStatus === 'pending') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="time-outline"
          title="Validation en attente"
          message="Votre profil doit être validé avant de pouvoir proposer vos services"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Fermes près de chez vous</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Rayon: {vetProfile.workLocation?.serviceRadius || 50} km autour de{' '}
            {vetProfile.workLocation?.city || 'votre localisation'}
          </Text>
        </View>
      </View>

      {/* Filtres */}
      <View style={[styles.filters, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filter === 'all' && { backgroundColor: colors.primary },
            { borderColor: colors.border },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, { color: filter === 'all' ? '#FFF' : colors.text }]}>
            Toutes ({farms.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filter === 'no_vet' && { backgroundColor: colors.warning },
            { borderColor: colors.border },
          ]}
          onPress={() => setFilter('no_vet')}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color={filter === 'no_vet' ? '#FFF' : colors.warning}
          />
          <Text
            style={[styles.filterChipText, { color: filter === 'no_vet' ? '#FFF' : colors.text }]}
          >
            Sans vétérinaire
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des fermes */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : farms.length === 0 ? (
        <EmptyState
          icon="map-marker-off"
          title="Aucune ferme trouvée"
          message="Aucune ferme trouvée dans votre rayon de service"
        />
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FarmProposalCard
              farm={item}
              onPropose={() => handlePropose(item.id)}
              colors={colors}
            />
          )}
          contentContainerStyle={styles.farmsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

// Composant Card pour une ferme
const FarmProposalCard: React.FC<{
  farm: Farm;
  onPropose: () => void;
  colors: typeof LIGHT_COLORS;
}> = ({ farm, onPropose, colors }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      style={[styles.farmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.farmHeader}>
          <View style={styles.farmInfo}>
            <Text style={[styles.farmName, { color: colors.text }]}>{farm.name}</Text>
            <View style={styles.farmLocation}>
              <Ionicons name="location" size={14} color={colors.textSecondary} />
              <Text style={[styles.farmLocationText, { color: colors.textSecondary }]}>
                {farm.city} • {farm.distance.toFixed(1)} km
              </Text>
            </View>
          </View>

          {!farm.veterinarian && (
            <View style={[styles.noVetBadge, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="alert" size={14} color={colors.warning} />
              <Text style={[styles.noVetBadgeText, { color: colors.warning }]}>
                Sans vétérinaire
              </Text>
            </View>
          )}
        </View>

        <View style={styles.farmStats}>
          <View style={styles.statItem}>
            <Ionicons name="paw" size={18} color={colors.success} />
            <Text style={[styles.statText, { color: colors.text }]}>{farm.herdSize} porcs</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="person" size={18} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>{farm.producer.name}</Text>
          </View>
        </View>

        {expanded && (
          <View style={styles.farmDetails}>
            <Text style={[styles.detailsTitle, { color: colors.text }]}>Détails de la ferme</Text>
            {farm.farmType && (
              <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                Type d'élevage: {farm.farmType}
              </Text>
            )}
            {farm.capacity && (
              <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                Capacité: {farm.capacity} animaux
              </Text>
            )}
            {farm.specialization && (
              <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                Spécialisation: {farm.specialization}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.proposeButton, { backgroundColor: colors.primary }]}
        onPress={onPropose}
        activeOpacity={0.8}
      >
        <Ionicons name="heart" size={20} color="#FFF" />
        <Text style={styles.proposeButtonText}>Proposer mes services</Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.xs,
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  headerContent: {
    marginTop: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmsList: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  farmCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  farmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  farmLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  farmLocationText: {
    fontSize: FONT_SIZES.sm,
  },
  noVetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  noVetBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  farmStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT_SIZES.sm,
  },
  farmDetails: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  detailsText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  proposeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  proposeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFF',
  },
});

export default VetProposeFarmsScreen;
