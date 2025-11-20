/**
 * Composant Vaccinations - Liste et gestion des vaccinations
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  RefreshControlProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import {
  selectAllVaccinations,
  selectVaccinationsEnRetard,
  selectVaccinationsAVenir,
  selectSanteStatistics,
} from '../store/selectors/santeSelectors';
import { TYPE_VACCIN_LABELS, STATUT_VACCINATION_LABELS } from '../types/sante';
import VaccinationFormModal from './VaccinationFormModal';

interface Props {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export default function VaccinationsComponent({ refreshControl }: Props) {
  const { colors } = useTheme();
  
  const vaccinations = useAppSelector(selectAllVaccinations);
  const vaccinationsEnRetard = useAppSelector(selectVaccinationsEnRetard);
  const vaccinationsAVenir = useAppSelector(selectVaccinationsAVenir);
  const statistics = useAppSelector(selectSanteStatistics);
  
  const [filtre, setFiltre] = useState<'toutes' | 'en_retard' | 'a_venir'>('toutes');
  const [modalVisible, setModalVisible] = useState(false);
  
  const vaccinationsFiltrees = useMemo(() => {
    switch (filtre) {
      case 'en_retard':
        return vaccinationsEnRetard;
      case 'a_venir':
        return vaccinationsAVenir;
      default:
        return vaccinations;
    }
  }, [filtre, vaccinations, vaccinationsEnRetard, vaccinationsAVenir]);

  const renderStatistiques = () => {
    if (!statistics.vaccinations) return null;

    const stats = statistics.vaccinations;

    return (
      <View style={styles.statistiquesContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.effectuees}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Effectuées</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="time" size={24} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.enAttente}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En attente</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.error + '20' }]}>
          <Ionicons name="alert-circle" size={24} color={colors.error} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.enRetard}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En retard</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.tauxCouverture.toFixed(0)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Couverture</Text>
        </View>
      </View>
    );
  };

  const renderFiltres = () => (
    <View style={styles.filtresContainer}>
      <TouchableOpacity
        style={[
          styles.filtreButton,
          {
            backgroundColor: filtre === 'toutes' ? colors.primary : colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setFiltre('toutes')}
      >
        <Text
          style={[
            styles.filtreText,
            { color: filtre === 'toutes' ? colors.textOnPrimary : colors.text },
          ]}
        >
          Toutes ({vaccinations.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filtreButton,
          {
            backgroundColor: filtre === 'en_retard' ? colors.error : colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setFiltre('en_retard')}
      >
        <Text
          style={[
            styles.filtreText,
            { color: filtre === 'en_retard' ? '#fff' : colors.text },
          ]}
        >
          En retard ({vaccinationsEnRetard.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filtreButton,
          {
            backgroundColor: filtre === 'a_venir' ? colors.warning : colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setFiltre('a_venir')}
      >
        <Text
          style={[
            styles.filtreText,
            { color: filtre === 'a_venir' ? '#fff' : colors.text },
          ]}
        >
          À venir ({vaccinationsAVenir.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderVaccinationCard = (vaccination: any) => {
    const date = new Date(vaccination.date_vaccination);
    const isEnRetard = vaccination.statut === 'planifie' && date < new Date();
    
    return (
      <View
        key={vaccination.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons
              name="medical"
              size={20}
              color={
                vaccination.statut === 'effectue'
                  ? colors.success
                  : isEnRetard
                  ? colors.error
                  : colors.warning
              }
            />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {TYPE_VACCIN_LABELS[vaccination.vaccin as keyof typeof TYPE_VACCIN_LABELS] ||
                vaccination.nom_vaccin ||
                vaccination.vaccin}
            </Text>
          </View>
          <View
            style={[
              styles.statutBadge,
              {
                backgroundColor:
                  vaccination.statut === 'effectue'
                    ? colors.success + '20'
                    : isEnRetard
                    ? colors.error + '20'
                    : colors.warning + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.statutText,
                {
                  color:
                    vaccination.statut === 'effectue'
                      ? colors.success
                      : isEnRetard
                      ? colors.error
                      : colors.warning,
                },
              ]}
            >
              {isEnRetard
                ? 'EN RETARD'
                : STATUT_VACCINATION_LABELS[
                    vaccination.statut as keyof typeof STATUT_VACCINATION_LABELS
                  ] || vaccination.statut}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {date.toLocaleDateString('fr-FR')}
            </Text>
          </View>

          {vaccination.animal_id && (
            <View style={styles.cardRow}>
              <Ionicons name="paw-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                Animal: {vaccination.animal_id}
              </Text>
            </View>
          )}

          {vaccination.veterinaire && (
            <View style={styles.cardRow}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                {vaccination.veterinaire}
              </Text>
            </View>
          )}

          {vaccination.cout && (
            <View style={styles.cardRow}>
              <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                {vaccination.cout.toFixed(2)} F CFA
              </Text>
            </View>
          )}

          {vaccination.date_rappel && (
            <View style={styles.cardRow}>
              <Ionicons name="alarm-outline" size={16} color={colors.info} />
              <Text style={[styles.cardText, { color: colors.info }]}>
                Rappel: {new Date(vaccination.date_rappel).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {/* Statistiques */}
      {renderStatistiques()}

      {/* Filtres */}
      {renderFiltres()}

      {/* Liste des vaccinations */}
      <View style={styles.listeContainer}>
        {vaccinationsFiltrees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune vaccination trouvée
            </Text>
          </View>
        ) : (
          vaccinationsFiltrees.map(renderVaccinationCard)
        )}
      </View>

      {/* Bouton d'ajout */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal de formulaire */}
      <VaccinationFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statistiquesContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  filtresContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filtreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filtreText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listeContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 80,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statutText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

