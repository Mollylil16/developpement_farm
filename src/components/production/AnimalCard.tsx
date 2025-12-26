/**
 * Composant carte d'animal pour le cheptel
 * Affiche les informations d'un animal avec ses actions
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import Card from '../Card';
import OptimizedImage from '../OptimizedImage';
import type { ProductionAnimal, StatutAnimal } from '../../types/production';
import { STATUT_ANIMAL_LABELS } from '../../types/production';
import { TYPE_PROPHYLAXIE_LABELS, type Vaccination, type Maladie, type Traitement } from '../../types/sante';
import { calculerAge, getStatutColor } from '../../utils/animalUtils';
import type { MarketplaceStatus } from '../../types/marketplace';

type ProductionAnimalWithMarketplace = ProductionAnimal & {
  marketplace_status?: MarketplaceStatus | null;
  marketplace_listing_id?: string | null;
};

interface AnimalCardProps {
  animal: ProductionAnimal;
  vaccinations?: Vaccination[];
  maladies?: Maladie[];
  traitements?: Traitement[];
  expandedHistorique?: string | null;
  onToggleHistorique?: (animalId: string) => void;
  onToggleMarketplace?: (animal: ProductionAnimal) => void;
  onEdit?: (animal: ProductionAnimal) => void;
  onDelete?: (animal: ProductionAnimal) => void;
  onChangeStatut?: (animal: ProductionAnimal, statut: StatutAnimal) => void;
  togglingMarketplace?: string | null;
  canUpdate?: boolean;
  canDelete?: boolean;
  getParentLabel?: (id?: string | null) => string;
}

const AnimalCard = React.memo(
  function AnimalCard({
    animal,
    vaccinations = [],
    maladies = [],
    traitements = [],
    expandedHistorique,
    onToggleHistorique,
    onToggleMarketplace,
    onEdit,
    onDelete,
    onChangeStatut,
    togglingMarketplace,
    canUpdate = false,
    canDelete = false,
    getParentLabel = () => 'Inconnu',
  }: AnimalCardProps) {
    const { colors } = useTheme();
    const age = calculerAge(animal.date_naissance);
    const statutColor = getStatutColor(animal.statut, colors);

    const vaccinationsAnimal = vaccinations
      .filter((v) => {
        try {
          const animalIds =
            typeof v.animal_ids === 'string' ? JSON.parse(v.animal_ids) : v.animal_ids;
          return Array.isArray(animalIds) && animalIds.includes(animal.id);
        } catch {
          return false;
        }
      })
      .sort(
        (a, b) => new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime()
      );

    const maladiesAnimal = maladies
      .filter((m) => m.animal_id === animal.id)
      .sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());

    const traitementsAnimal = traitements
      .filter((t) => t.animal_id === animal.id)
      .sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());

    const totalHistorique =
      vaccinationsAnimal.length + maladiesAnimal.length + traitementsAnimal.length;
    const isExpanded = expandedHistorique === animal.id;

    return (
      <Card elevation="small" padding="medium" style={styles.card}>
        <View style={styles.header}>
          {animal.photo_uri ? (
            <OptimizedImage
              key={`photo-${animal.id}-${animal.photo_uri}`}
              source={{ uri: animal.photo_uri }}
              style={styles.photo}
              resizeMode="cover"
              cachePolicy="memory-disk"
              priority="normal"
              placeholder={
                <View
                  style={[
                    styles.photo,
                    styles.photoPlaceholder,
                    { backgroundColor: colors.primaryLight + '15', borderColor: colors.primary + '30' },
                  ]}
                >
                  <Text style={{ fontSize: 40 }}>🐷</Text>
                </View>
              }
            />
          ) : (
            <View
              style={[
                styles.photo,
                styles.photoPlaceholder,
                { backgroundColor: colors.primaryLight + '15', borderColor: colors.primary + '30' },
              ]}
            >
              <Text style={{ fontSize: 40 }}>🐷</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={[styles.code, { color: colors.text }]} numberOfLines={2}>
              {animal.code}
              {animal.nom ? ` (${animal.nom})` : null}
            </Text>
            <View style={styles.badgesRow}>
              <View style={[styles.statutBadge, { backgroundColor: statutColor + '15' }]}>
                <Text style={[styles.statutText, { color: statutColor }]}>
                  {STATUT_ANIMAL_LABELS[animal.statut]}
                </Text>
              </View>
              {animal.reproducteur && (
                <View
                  style={[styles.reproducteurBadge, { backgroundColor: colors.success + '18' }]}
                >
                  <Text style={[styles.reproducteurText, { color: colors.success }]}>
                    Reproducteur
                  </Text>
                </View>
              )}
              {(animal as ProductionAnimalWithMarketplace).marketplace_status === 'available' && (
                <View
                  style={[
                    styles.marketplaceBadge,
                    { backgroundColor: '#FF8C42' + '20', borderColor: '#FF8C42' },
                  ]}
                >
                  <Ionicons name="storefront-outline" size={12} color="#FF8C42" />
                  <Text style={[styles.marketplaceText, { color: '#FF8C42' }]}>En vente</Text>
                </View>
              )}
              {(animal as ProductionAnimalWithMarketplace).marketplace_status === 'reserved' && (
                <View
                  style={[
                    styles.marketplaceBadge,
                    { backgroundColor: '#F39C12' + '20', borderColor: '#F39C12' },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={12} color="#F39C12" />
                  <Text style={[styles.marketplaceText, { color: '#F39C12' }]}>Réservé</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {canUpdate && animal.statut === 'actif' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    (animal as ProductionAnimalWithMarketplace).marketplace_status ===
                      'available' ||
                    (animal as ProductionAnimalWithMarketplace).marketplace_status === 'reserved'
                      ? '#F39C12' + '15'
                      : colors.primary + '15',
                },
              ]}
              onPress={() => onToggleMarketplace?.(animal)}
              disabled={togglingMarketplace === animal.id}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color:
                      (animal as ProductionAnimalWithMarketplace).marketplace_status ===
                        'available' ||
                      (animal as ProductionAnimalWithMarketplace).marketplace_status === 'reserved'
                        ? '#F39C12'
                        : colors.primary,
                  },
                ]}
              >
                {togglingMarketplace === animal.id
                  ? '...'
                  : (animal as ProductionAnimalWithMarketplace).marketplace_status ===
                        'available' ||
                      (animal as ProductionAnimalWithMarketplace).marketplace_status === 'reserved'
                    ? 'En vente'
                    : 'Vendre'}
              </Text>
            </TouchableOpacity>
          )}
          {canUpdate && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => onEdit?.(animal)}
            >
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Modifier</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
              onPress={() => onDelete?.(animal)}
            >
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Supprimer</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.details}>
          {animal.origine && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Origine:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {animal.origine || 'Non renseigné'}
              </Text>
            </View>
          )}
          {age && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Âge:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{age}</Text>
            </View>
          )}
          {animal.date_naissance && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Date de naissance:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {format(parseISO(animal.date_naissance), 'dd MMM yyyy', { locale: fr })}
              </Text>
            </View>
          )}
          {animal.date_entree && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Date d'arrivée:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {format(parseISO(animal.date_entree), 'dd MMM yyyy', { locale: fr })}
              </Text>
            </View>
          )}
          {animal.race && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Race:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {animal.race || 'Non renseigné'}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Père:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {getParentLabel(animal.pere_id)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Mère:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {getParentLabel(animal.mere_id)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Poids à l'arrivée:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {animal.poids_initial ? `${animal.poids_initial.toFixed(1)} kg` : 'Non renseigné'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Sexe:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {animal.sexe === 'male'
                ? 'Mâle'
                : animal.sexe === 'femelle'
                  ? 'Femelle'
                  : 'Indéterminé'}
            </Text>
          </View>
        </View>

        {/* Historique sanitaire */}
        {totalHistorique > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.historiqueContainer}>
              <TouchableOpacity
                style={styles.historiqueHeader}
                onPress={() => onToggleHistorique?.(animal.id)}
              >
                <View style={styles.historiqueHeaderLeft}>
                  <Ionicons name="medkit" size={18} color={colors.primary} />
                  <Text style={[styles.historiqueTitle, { color: colors.text }]}>
                    Historique sanitaire
                  </Text>
                  <View
                    style={[styles.historiqueBadge, { backgroundColor: colors.primary + '15' }]}
                  >
                    <Text style={[styles.historiqueBadgeText, { color: colors.primary }]}>
                      {totalHistorique}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.historiqueContent}>
                  {vaccinationsAnimal.length > 0 && (
                    <View style={styles.historiqueSection}>
                      <Text style={[styles.historiqueSectionTitle, { color: colors.success }]}>
                        💉 Vaccinations ({vaccinationsAnimal.length})
                      </Text>
                      {vaccinationsAnimal.slice(0, 5).map((v) => {
                        const categorieLabel = v.type_prophylaxie
                          ? (TYPE_PROPHYLAXIE_LABELS[v.type_prophylaxie] || v.type_prophylaxie)
                          : 'Non spécifié';
                        return (
                          <View
                            key={v.id}
                            style={[
                              styles.historiqueItem,
                              {
                                backgroundColor: colors.success + '08',
                                borderLeftColor: colors.success,
                              },
                            ]}
                          >
                            <View style={styles.historiqueItemHeader}>
                              <Text
                                style={[styles.historiqueItemDate, { color: colors.textSecondary }]}
                              >
                                {format(parseISO(v.date_vaccination), 'dd MMM yyyy', {
                                  locale: fr,
                                })}
                              </Text>
                              <View
                                style={[
                                  styles.categorieBadge,
                                  { backgroundColor: colors.success + '20' },
                                ]}
                              >
                                <Text
                                  style={[styles.categorieBadgeText, { color: colors.success }]}
                                >
                                  {categorieLabel}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.historiqueItemTitle, { color: colors.text }]}>
                              {v.produit_administre || 'Produit non spécifié'}
                            </Text>
                            <Text
                              style={[styles.historiqueItemDetail, { color: colors.textSecondary }]}
                            >
                              Dosage: {v.dosage || 'Non spécifié'}
                              {v.unite_dosage ? ` ${v.unite_dosage}` : null}
                            </Text>
                          </View>
                        );
                      })}
                      {vaccinationsAnimal.length > 5 && (
                        <Text style={[styles.historiqueMore, { color: colors.textSecondary }]}>
                          +{vaccinationsAnimal.length - 5} vaccination(s) supplémentaire(s)
                        </Text>
                      )}
                    </View>
                  )}

                  {maladiesAnimal.length > 0 && (
                    <View style={styles.historiqueSection}>
                      <Text style={[styles.historiqueSectionTitle, { color: colors.warning }]}>
                        🏥 Maladies ({maladiesAnimal.length})
                      </Text>
                      {maladiesAnimal.slice(0, 5).map((m) => (
                        <View
                          key={m.id}
                          style={[
                            styles.historiqueItem,
                            {
                              backgroundColor: colors.warning + '08',
                              borderLeftColor: colors.warning,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.historiqueItemDate, { color: colors.textSecondary }]}
                          >
                            {format(parseISO(m.date_debut), 'dd MMM yyyy', { locale: fr })}
                            {m.gueri && m.date_fin
                              ? ` → ${format(parseISO(m.date_fin), 'dd MMM yyyy', { locale: fr })}`
                              : null}
                          </Text>
                          <Text style={[styles.historiqueItemTitle, { color: colors.text }]}>
                            {m.nom_maladie || 'Maladie non spécifiée'}
                          </Text>
                          {m.symptomes && (
                            <Text
                              style={[styles.historiqueItemDetail, { color: colors.textSecondary }]}
                              numberOfLines={2}
                            >
                              {m.symptomes}
                            </Text>
                          )}
                        </View>
                      ))}
                      {maladiesAnimal.length > 5 && (
                        <Text style={[styles.historiqueMore, { color: colors.textSecondary }]}>
                          +{maladiesAnimal.length - 5} maladie(s) supplémentaire(s)
                        </Text>
                      )}
                    </View>
                  )}

                  {traitementsAnimal.length > 0 && (
                    <View style={styles.historiqueSection}>
                      <Text style={[styles.historiqueSectionTitle, { color: colors.info }]}>
                        💊 Traitements ({traitementsAnimal.length})
                      </Text>
                      {traitementsAnimal.slice(0, 5).map((t) => (
                        <View
                          key={t.id}
                          style={[
                            styles.historiqueItem,
                            { backgroundColor: colors.info + '08', borderLeftColor: colors.info },
                          ]}
                        >
                          <Text
                            style={[styles.historiqueItemDate, { color: colors.textSecondary }]}
                          >
                            {format(parseISO(t.date_debut), 'dd MMM yyyy', { locale: fr })}
                            {t.date_fin
                              ? ` → ${format(parseISO(t.date_fin), 'dd MMM yyyy', { locale: fr })}`
                              : null}
                          </Text>
                          <Text style={[styles.historiqueItemTitle, { color: colors.text }]}>
                            {t.nom_medicament || 'Médicament non spécifié'}
                          </Text>
                          <Text
                            style={[styles.historiqueItemDetail, { color: colors.textSecondary }]}
                          >
                            {t.dosage || 'N/A'} • {t.voie_administration || 'N/A'} •{' '}
                            {t.frequence || 'N/A'}
                          </Text>
                        </View>
                      ))}
                      {traitementsAnimal.length > 5 && (
                        <Text style={[styles.historiqueMore, { color: colors.textSecondary }]}>
                          +{traitementsAnimal.length - 5} traitement(s) supplémentaire(s)
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {animal.notes && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.notesContainer}>
              <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
                Notes (vaccins, etc.):
              </Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{animal.notes}</Text>
            </View>
          </>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {canUpdate && (
          <View style={styles.statutSelector}>
            <Text style={[styles.statutSelectorLabel, { color: colors.text }]}>
              Changer le statut:
            </Text>
            <View style={styles.statutButtons}>
              {(['actif', 'mort', 'vendu', 'offert'] as StatutAnimal[]).map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.statutButton,
                    {
                      backgroundColor:
                        animal.statut === statut
                          ? getStatutColor(statut, colors)
                          : colors.background,
                      borderColor: getStatutColor(statut, colors),
                    },
                  ]}
                  onPress={() => onChangeStatut?.(animal, statut)}
                >
                  <Text
                    style={[
                      styles.statutButtonText,
                      {
                        color:
                          animal.statut === statut
                            ? colors.textOnPrimary
                            : getStatutColor(statut, colors),
                      },
                    ]}
                  >
                    {STATUT_ANIMAL_LABELS[statut]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Comparaison personnalisée pour éviter les re-renders inutiles
    return (
      prevProps.animal.id === nextProps.animal.id &&
      prevProps.animal.statut === nextProps.animal.statut &&
      prevProps.expandedHistorique === nextProps.expandedHistorique &&
      prevProps.togglingMarketplace === nextProps.togglingMarketplace &&
      prevProps.canUpdate === nextProps.canUpdate &&
      prevProps.canDelete === nextProps.canDelete &&
      prevProps.vaccinations?.length === nextProps.vaccinations?.length &&
      prevProps.maladies?.length === nextProps.maladies?.length &&
      prevProps.traitements?.length === nextProps.traitements?.length
    );
  }
);

export default AnimalCard;

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  code: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  statutBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  statutText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  reproducteurBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  reproducteurText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  marketplaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
  },
  marketplaceText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  details: {
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  historiqueContainer: {
    marginTop: SPACING.sm,
  },
  historiqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  historiqueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  historiqueTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  historiqueBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  historiqueBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  historiqueContent: {
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  historiqueSection: {
    gap: SPACING.xs,
  },
  historiqueSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  historiqueItem: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    marginBottom: SPACING.xs,
  },
  historiqueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs / 2,
  },
  historiqueItemDate: {
    fontSize: FONT_SIZES.xs,
  },
  categorieBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  categorieBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  historiqueItemTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  historiqueItemDetail: {
    fontSize: FONT_SIZES.xs,
  },
  historiqueMore: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  notesContainer: {
    marginTop: SPACING.sm,
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs / 2,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
  },
  statutSelector: {
    marginTop: SPACING.sm,
  },
  statutSelectorLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  statutButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  statutButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  statutButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});
