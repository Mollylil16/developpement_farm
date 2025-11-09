/**
 * Composant pour gérer le cheptel (liste complète des animaux)
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadProductionAnimaux,
  deleteProductionAnimal,
  updateProductionAnimal,
} from '../store/slices/productionSlice';
import { ProductionAnimal, StatutAnimal, STATUT_ANIMAL_LABELS } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import Button from './Button';
import ProductionAnimalFormModal from './ProductionAnimalFormModal';
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Card from './Card';

export default function ProductionCheptelComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { animaux, loading } = useAppSelector((state) => state.production);

  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<ProductionAnimal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<StatutAnimal | 'tous'>('tous');

  useEffect(() => {
    if (projetActif) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
    }
  }, [dispatch, projetActif]);

  const animauxFiltres = useMemo(() => {
    if (filterStatut === 'tous') {
      return animaux;
    }
    return animaux.filter((a) => a.statut === filterStatut);
  }, [animaux, filterStatut]);

  const handleDelete = (animal: ProductionAnimal) => {
    Alert.alert(
      'Supprimer l\'animal',
      `Êtes-vous sûr de vouloir supprimer ${animal.code}${animal.nom ? ` (${animal.nom})` : ''} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteProductionAnimal(animal.id)).unwrap();
            } catch (error: any) {
              Alert.alert('Erreur', error || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  };

  const handleChangeStatut = (animal: ProductionAnimal, nouveauStatut: StatutAnimal) => {
    Alert.alert(
      'Changer le statut',
      `Voulez-vous changer le statut de ${animal.code}${animal.nom ? ` (${animal.nom})` : ''} en "${STATUT_ANIMAL_LABELS[nouveauStatut]}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await dispatch(
                updateProductionAnimal({
                  id: animal.id,
                  updates: { statut: nouveauStatut },
                })
              ).unwrap();
            } catch (error: any) {
              Alert.alert('Erreur', error || 'Erreur lors de la mise à jour du statut');
            }
          },
        },
      ]
    );
  };

  const calculerAge = (dateNaissance?: string): string | null => {
    if (!dateNaissance) return null;
    try {
      const date = parseISO(dateNaissance);
      const jours = differenceInDays(new Date(), date);
      if (jours < 30) return `${jours} jour${jours > 1 ? 's' : ''}`;
      const mois = Math.floor(jours / 30);
      if (mois < 12) return `${mois} mois`;
      const annees = Math.floor(mois / 12);
      return `${annees} an${annees > 1 ? 's' : ''}`;
    } catch {
      return null;
    }
  };

  const getStatutColor = (statut: StatutAnimal): string => {
    switch (statut) {
      case 'actif':
        return colors.success;
      case 'mort':
        return colors.error;
      case 'vendu':
        return colors.warning;
      case 'offert':
        return colors.secondary;
      default:
        return colors.textSecondary;
    }
  };

  const renderAnimal = ({ item }: { item: ProductionAnimal }) => {
    const age = calculerAge(item.date_naissance);
    const statutColor = getStatutColor(item.statut);

    return (
      <Card elevation="small" padding="medium" style={styles.animalCard}>
        <View style={styles.animalHeader}>
          <View style={styles.animalInfo}>
            <Text style={[styles.animalCode, { color: colors.text }]}>
              {item.code}
              {item.nom && ` (${item.nom})`}
            </Text>
            <View style={[styles.statutBadge, { backgroundColor: statutColor + '15' }]}>
              <Text style={[styles.statutText, { color: statutColor }]}>
                {STATUT_ANIMAL_LABELS[item.statut]}
              </Text>
            </View>
          </View>
          <View style={styles.animalActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => {
                setSelectedAnimal(item);
                setIsEditing(true);
                setShowAnimalModal(true);
              }}
            >
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
              onPress={() => handleDelete(item)}
            >
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.animalDetails}>
          {item.origine && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Origine:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{item.origine}</Text>
            </View>
          )}
          {age && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Âge:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{age}</Text>
            </View>
          )}
          {item.date_naissance && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date de naissance:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {format(parseISO(item.date_naissance), 'dd MMM yyyy', { locale: fr })}
              </Text>
            </View>
          )}
          {item.date_entree && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date d'arrivée:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {format(parseISO(item.date_entree), 'dd MMM yyyy', { locale: fr })}
              </Text>
            </View>
          )}
          {item.poids_initial && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Poids initial:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {item.poids_initial.toFixed(1)} kg
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Sexe:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.sexe === 'male' ? 'Mâle' : item.sexe === 'femelle' ? 'Femelle' : 'Indéterminé'}
            </Text>
          </View>
        </View>

        {item.notes && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.notesContainer}>
              <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes (vaccins, etc.):</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{item.notes}</Text>
            </View>
          </>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.statutSelector}>
          <Text style={[styles.statutSelectorLabel, { color: colors.text }]}>Changer le statut:</Text>
          <View style={styles.statutButtons}>
            {(['actif', 'mort', 'vendu', 'offert', 'autre'] as StatutAnimal[]).map((statut) => (
              <TouchableOpacity
                key={statut}
                style={[
                  styles.statutButton,
                  {
                    backgroundColor: item.statut === statut ? getStatutColor(statut) : colors.background,
                    borderColor: getStatutColor(statut),
                  },
                ]}
                onPress={() => handleChangeStatut(item, statut)}
              >
                <Text
                  style={[
                    styles.statutButtonText,
                    {
                      color: item.statut === statut ? colors.textOnPrimary : getStatutColor(statut),
                    },
                  ]}
                >
                  {STATUT_ANIMAL_LABELS[statut]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>
    );
  };

  const ListHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={[styles.title, { color: colors.text }]}>Cheptel</Text>
        <Button
          title="+ Animal"
          onPress={() => {
            setSelectedAnimal(null);
            setIsEditing(false);
            setShowAnimalModal(true);
          }}
          size="small"
        />
      </View>
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          {animaux.length} animal{animaux.length > 1 ? 'aux' : ''} au total
        </Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {animaux.filter((a) => a.statut === 'actif').length} actif{animaux.filter((a) => a.statut === 'actif').length > 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.filters}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Filtrer par statut:</Text>
        <View style={styles.filterButtons}>
          {(['tous', 'actif', 'mort', 'vendu', 'offert', 'autre'] as const).map((statut) => (
            <TouchableOpacity
              key={statut}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterStatut === statut ? colors.primary : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setFilterStatut(statut === 'tous' ? 'tous' : statut)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: filterStatut === statut ? colors.textOnPrimary : colors.text,
                  },
                ]}
              >
                {statut === 'tous' ? 'Tous' : STATUT_ANIMAL_LABELS[statut]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Chargement du cheptel..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={animauxFiltres}
        renderItem={renderAnimal}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            title="Aucun animal dans le cheptel"
            message="Ajoutez des animaux pour commencer à gérer votre cheptel"
            action={
              <Button
                title="Ajouter un animal"
                onPress={() => {
                  setSelectedAnimal(null);
                  setIsEditing(false);
                  setShowAnimalModal(true);
                }}
              />
            }
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {projetActif && (
        <ProductionAnimalFormModal
          visible={showAnimalModal}
          onClose={() => {
            setShowAnimalModal(false);
            setIsEditing(false);
            setSelectedAnimal(null);
          }}
          onSuccess={() => {
            setShowAnimalModal(false);
            setIsEditing(false);
            setSelectedAnimal(null);
            if (projetActif) {
              dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
            }
          }}
          projetId={projetActif.id}
          animal={isEditing ? selectedAnimal : null}
          isEditing={isEditing}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl + 85,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  filters: {
    marginTop: SPACING.md,
  },
  filterLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  animalCard: {
    marginBottom: SPACING.md,
  },
  animalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  animalInfo: {
    flex: 1,
  },
  animalCode: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statutBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statutText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  animalActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  animalDetails: {
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
  },
  notesContainer: {
    marginTop: SPACING.xs,
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  statutSelector: {
    marginTop: SPACING.sm,
  },
  statutSelectorLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  statutButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  statutButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  statutButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
});

