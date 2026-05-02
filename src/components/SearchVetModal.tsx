/**
 * Modal de recherche de vétérinaires
 * Affiche les vétérinaires dans un rayon de 50km basé sur la géolocalisation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { Veterinarian } from '../types/veterinarian';
import { searchVeterinariansWithLocation, searchAllVeterinarians } from '../services/veterinarianService';
import Button from './Button';
import Card from './Card';
import AppointmentRequestModal from './appointments/AppointmentRequestModal';

interface SearchVetModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite?: (vet: Veterinarian) => void; // Optionnel maintenant, on utilise le modal de RDV
}

interface VetCardProps {
  vet: Veterinarian;
  onInvite?: () => void; // Optionnel maintenant
  onRequestAppointment: () => void; // Nouvelle prop pour demander un RDV
}

function VetCard({ vet, onInvite, onRequestAppointment }: VetCardProps) {
  const { colors } = useTheme();

  return (
    <Card elevation="small" padding="large" style={styles.vetCard}>
      <View style={styles.vetCardHeader}>
        <View style={styles.vetNameContainer}>
          <Text style={[styles.vetName, { color: colors.text }]}>
            🩺 Dr. {vet.firstName} {vet.lastName}
          </Text>
          {vet.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.verifiedText, { color: colors.success }]}>Vérifié</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.distance, { color: colors.textSecondary }]}>
        📍 {vet.distance ? `${vet.distance} km - ` : ''}{vet.city}
      </Text>

      <View style={styles.rating}>
        <Ionicons name="star" size={16} color="#FFD700" />
        <Text style={[styles.ratingText, { color: colors.text }]}>
          {vet.rating.toFixed(1)}/5 ({vet.reviewsCount} avis)
        </Text>
      </View>

      {vet.phone && (
        <Text style={[styles.phone, { color: colors.textSecondary }]}>📞 {vet.phone}</Text>
      )}

      {vet.specialties && vet.specialties.length > 0 && (
        <View style={styles.specialties}>
          {vet.specialties.slice(0, 3).map((spec, index) => (
            <View
              key={index}
              style={[styles.specialtyBadge, { backgroundColor: colors.primaryLight + '20' }]}
            >
              <Text style={[styles.specialtyText, { color: colors.primary }]}>{spec}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title="Demander RDV"
          onPress={onRequestAppointment}
          variant="primary"
          size="small"
          style={styles.inviteButton}
        />
        <Button
          title="Voir profil"
          onPress={() => {
            Alert.alert('Profil', `Dr. ${vet.firstName} ${vet.lastName}\n${vet.phone || ''}`);
          }}
          variant="outline"
          size="small"
        />
      </View>
    </Card>
  );
}

export default function SearchVetModal({ visible, onClose, onInvite }: SearchVetModalProps) {
  const { colors } = useTheme();
  const [vets, setVets] = useState<Veterinarian[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [searchMode, setSearchMode] = useState<'nearby' | 'all'>('all'); // Par défaut: tous les vétérinaires
  const [selectedVet, setSelectedVet] = useState<Veterinarian | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  useEffect(() => {
    console.log('🔍 [SearchVetModal] visible changed:', visible);
    if (visible) {
      console.log('🔍 [SearchVetModal] Modal visible, chargement des vétérinaires...');
      loadVeterinarians();
    } else {
      // Réinitialiser l'état quand le modal se ferme
      setVets([]);
      setUserLocation(null);
      setSearchMode('all'); // Réinitialiser à 'all'
    }
  }, [visible]);

  async function loadVeterinarians() {
    setLoading(true);
    try {
      if (searchMode === 'all') {
        // ✅ Rechercher tous les vétérinaires validés (sans filtre de distance)
        const allVets = await searchAllVeterinarians();
        setVets(allVets);
        setUserLocation(null);
      } else {
        // Rechercher dans un rayon de 50km
        const result = await searchVeterinariansWithLocation(50, true); // allowAllIfNoLocation = true
        setVets(result.veterinarians);
        setUserLocation(result.userLocation);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de vétérinaires:', error);
      Alert.alert('Erreur', 'Impossible de rechercher des vétérinaires');
    } finally {
      setLoading(false);
    }
  }

  console.log('🔍 [SearchVetModal] Render - visible:', visible);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>🔍 Rechercher un vétérinaire</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Toggle de recherche */}
        <View style={[styles.searchModeContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.searchModeButton,
              searchMode === 'all' && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              setSearchMode('all');
              loadVeterinarians();
            }}
          >
            <Text
              style={[
                styles.searchModeText,
                { color: searchMode === 'all' ? '#FFF' : colors.textSecondary },
              ]}
            >
              Tous les vétérinaires
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.searchModeButton,
              searchMode === 'nearby' && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              setSearchMode('nearby');
              loadVeterinarians();
            }}
          >
            <Text
              style={[
                styles.searchModeText,
                { color: searchMode === 'nearby' ? '#FFF' : colors.textSecondary },
              ]}
            >
              À proximité (50 km)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Localisation info */}
        {userLocation && searchMode === 'nearby' && (
          <View style={[styles.locationInfo, { backgroundColor: colors.surface }]}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              Rayon : 50 km
            </Text>
          </View>
        )}

        {/* Info nombre de résultats */}
        {!loading && vets.length > 0 && (
          <View style={[styles.resultsInfo, { backgroundColor: colors.surface }]}>
            <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
              {vets.length} vétérinaire{vets.length > 1 ? 's' : ''} trouvé{vets.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Liste vétérinaires */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Recherche de vétérinaires...
            </Text>
          </View>
        ) : vets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchMode === 'nearby' 
                ? 'Aucun vétérinaire trouvé dans un rayon de 50 km'
                : 'Aucun vétérinaire validé trouvé'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {searchMode === 'nearby'
                ? 'Essayez de rechercher tous les vétérinaires ou invitez un vétérinaire directement'
                : 'Aucun vétérinaire n\'a encore été validé sur la plateforme'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={vets}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <VetCard
                vet={item}
                onInvite={onInvite ? () => {
                  onInvite(item);
                  onClose();
                } : undefined}
                onRequestAppointment={() => {
                  setSelectedVet(item);
                  setShowAppointmentModal(true);
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Modal de demande de rendez-vous */}
        {selectedVet && (
          <AppointmentRequestModal
            visible={showAppointmentModal}
            onClose={() => {
              setShowAppointmentModal(false);
              setSelectedVet(null);
            }}
            vet={selectedVet}
            onSuccess={() => {
              // Recharger la liste des vétérinaires après succès
              loadVeterinarians();
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  searchModeContainer: {
    flexDirection: 'row',
    padding: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
  },
  searchModeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  searchModeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  resultsInfo: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  resultsText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  vetCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  vetCardHeader: {
    marginBottom: SPACING.md,
  },
  vetNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  vetName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  verifiedText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  distance: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  ratingText: {
    fontSize: FONT_SIZES.sm,
  },
  phone: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  specialtyBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  specialtyText: {
    fontSize: FONT_SIZES.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  inviteButton: {
    flex: 1,
  },
});
