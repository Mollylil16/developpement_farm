/**
 * Composant Maladies - Liste et gestion des maladies
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControlProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import {
  selectAllMaladies,
  selectMaladiesEnCours,
  selectMaladiesCritiques,
  selectSanteStatistics,
} from '../store/selectors/santeSelectors';
import { TYPE_MALADIE_LABELS, GRAVITE_MALADIE_LABELS } from '../types/sante';
import MaladieFormModal from './MaladieFormModal';

interface Props {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export default function MaladiesComponent({ refreshControl }: Props) {
  const { colors } = useTheme();

  const maladies = useAppSelector(selectAllMaladies);
  const maladiesEnCours = useAppSelector(selectMaladiesEnCours);
  const maladiesCritiques = useAppSelector(selectMaladiesCritiques);
  const statistics = useAppSelector(selectSanteStatistics);

  const [filtre, setFiltre] = useState<'toutes' | 'en_cours' | 'critiques'>('toutes');
  const [modalVisible, setModalVisible] = useState(false);

  const maladiesFiltrees = useMemo(() => {
    switch (filtre) {
      case 'en_cours':
        return maladiesEnCours;
      case 'critiques':
        return maladiesCritiques;
      default:
        return maladies;
    }
  }, [filtre, maladies, maladiesEnCours, maladiesCritiques]);

  const renderStatistiques = () => {
    if (!statistics.maladies) return null;

    const stats = statistics.maladies;

    return (
      <View style={styles.statistiquesContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.info + '20' }]}>
          <Ionicons name="list" size={24} color={colors.info} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="time" size={24} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.enCours}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En cours</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.gueries}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Guéries</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="trending-up" size={24} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.tauxGuerison.toFixed(0)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Guérison</Text>
        </View>
      </View>
    );
  };

  const renderMaladieCard = (maladie: any) => {
    const dateDebut = new Date(maladie.date_debut);

    const graviteColor =
      maladie.gravite === 'critique'
        ? colors.error
        : maladie.gravite === 'grave'
          ? colors.warning
          : maladie.gravite === 'moderee'
            ? colors.info
            : colors.textSecondary;

    return (
      <View
        key={maladie.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="bug" size={20} color={graviteColor} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{maladie.nom_maladie}</Text>
          </View>
          <View style={[styles.statutBadge, { backgroundColor: graviteColor + '20' }]}>
            <Text style={[styles.statutText, { color: graviteColor }]}>
              {GRAVITE_MALADIE_LABELS[maladie.gravite as keyof typeof GRAVITE_MALADIE_LABELS] ||
                maladie.gravite}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Ionicons name="medkit-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {TYPE_MALADIE_LABELS[maladie.type as keyof typeof TYPE_MALADIE_LABELS] ||
                maladie.type}
            </Text>
          </View>

          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              Début: {dateDebut.toLocaleDateString('fr-FR')}
            </Text>
          </View>

          {maladie.date_fin && (
            <View style={styles.cardRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={[styles.cardText, { color: colors.success }]}>
                Fin: {new Date(maladie.date_fin).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}

          {maladie.nombre_animaux_affectes && (
            <View style={styles.cardRow}>
              <Ionicons name="paw-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                {maladie.nombre_animaux_affectes} animaux affectés
              </Text>
            </View>
          )}

          {maladie.contagieux && (
            <View style={[styles.warningBadge, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="warning" size={14} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>Contagieux</Text>
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
      {renderStatistiques()}

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
            Toutes ({maladies.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtreButton,
            {
              backgroundColor: filtre === 'en_cours' ? colors.warning : colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFiltre('en_cours')}
        >
          <Text
            style={[styles.filtreText, { color: filtre === 'en_cours' ? '#fff' : colors.text }]}
          >
            En cours ({maladiesEnCours.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtreButton,
            {
              backgroundColor: filtre === 'critiques' ? colors.error : colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFiltre('critiques')}
        >
          <Text
            style={[styles.filtreText, { color: filtre === 'critiques' ? '#fff' : colors.text }]}
          >
            Critiques ({maladiesCritiques.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listeContainer}>
        {maladiesFiltrees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bug-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune maladie trouvée
            </Text>
          </View>
        ) : (
          maladiesFiltrees.map(renderMaladieCard)
        )}
      </View>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal de formulaire */}
      <MaladieFormModal visible={modalVisible} onClose={() => setModalVisible(false)} />
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
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
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
