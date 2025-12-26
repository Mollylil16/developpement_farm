/**
 * Composant liste des gestations avec alertes
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectAllGestations } from '../store/selectors/reproductionSelectors';
import {
  loadGestations,
  loadGestationsEnCours,
  deleteGestation,
  updateGestation,
} from '../store/slices/reproductionSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import type { Gestation } from '../types/reproduction';
import type { ProductionAnimal } from '../types/production';
import { doitGenererAlerte, joursRestantsAvantMiseBas } from '../types/reproduction';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import GestationFormModal from './GestationFormModal';
import StatCard from './StatCard';
import CustomModal from './CustomModal';
import FormField from './FormField';
import Button from './Button';
import { useActionPermissions } from '../hooks/useActionPermissions';

export default function GestationsListComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const gestations = useAppSelector(selectAllGestations);
  const animaux = useAppSelector(selectAllAnimaux);
  const { loading } = useAppSelector((state) => state.reproduction);
  const [selectedGestation, setSelectedGestation] = useState<Gestation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayedGestations, setDisplayedGestations] = useState<Gestation[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const [terminerModalVisible, setTerminerModalVisible] = useState(false);
  const [gestationATerminer, setGestationATerminer] = useState<Gestation | null>(null);
  const [nombrePorceletsReel, setNombrePorceletsReel] = useState<string>('');
  const [dateMiseBasReelle, setDateMiseBasReelle] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [refreshing, setRefreshing] = useState(false);

  const { projetActif } = useAppSelector((state) => state.projet);

  // ✅ MÉMOÏSER la length pour éviter les boucles infinies
  const gestationsLength = Array.isArray(gestations) ? gestations.length : 0;

  // Utiliser useRef pour éviter les chargements multiples
  const gestationsChargeesRef = React.useRef<string | null>(null);

  // ✅ CORRECTION CRITIQUE: Utiliser useRef pour éviter les mises à jour inutiles (pagination)
  const lastGestationsLengthRef = React.useRef<number>(gestationsLength);
  const displayedGestationsLength = displayedGestations.length;

  useEffect(() => {
    if (!projetActif?.id) {
      gestationsChargeesRef.current = null;
      return;
    }

    if (gestationsChargeesRef.current === projetActif.id) {
      return; // Déjà chargé !
    }

    try {
      gestationsChargeesRef.current = projetActif.id;
      dispatch(loadGestations(projetActif.id));
      dispatch(loadGestationsEnCours(projetActif.id));
      // Charger les animaux pour pouvoir afficher les noms des verrats
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
    } catch (error) {
      console.error('Erreur lors du chargement des gestations:', error);
    }
  }, [dispatch, projetActif?.id]);

  // ✅ MÉMOÏSER gestationsEnCours.length pour éviter les re-calculs inutiles
  const gestationsEnCoursLength = React.useMemo(() => {
    if (!projetActif?.id) return 0;
    if (!Array.isArray(gestations)) return 0;
    return gestations.filter((g) => g.projet_id === projetActif.id && g.statut === 'en_cours')
      .length;
  }, [gestationsLength, projetActif?.id]);

  const gestationsEnCours = useMemo(
    () => {
      if (!projetActif?.id) return [];
      if (!Array.isArray(gestations)) return [];
      return gestations.filter((g) => g.projet_id === projetActif.id && g.statut === 'en_cours');
    },
    [gestationsLength, gestations, projetActif?.id] // ✅ GARDER gestations (utilisé dans le corps)
  );

  const alertes = useMemo(() => {
    return gestationsEnCours.filter((g) => {
      if (!g.date_mise_bas_prevue) return false;
      try {
        return doitGenererAlerte(g.date_mise_bas_prevue);
      } catch (error) {
        console.error("Erreur lors de la vérification de l'alerte:", error);
        return false;
      }
    });
  }, [gestationsEnCoursLength, gestationsEnCours]); // ✅ GARDER gestationsEnCours (utilisé dans le corps)

  // ✅ CORRECTION CRITIQUE: Ne mettre à jour que si gestationsLength a vraiment changé
  useEffect(() => {
    if (!projetActif?.id) {
      if (displayedGestations.length > 0) {
        setDisplayedGestations([]);
        lastGestationsLengthRef.current = 0;
      }
      return;
    }

    if (!Array.isArray(gestations)) {
      if (displayedGestations.length > 0) {
        setDisplayedGestations([]);
        lastGestationsLengthRef.current = 0;
      }
      return;
    }

    // ✅ NE METTRE À JOUR QUE SI LA LENGTH A CHANGÉ (évite la boucle infinie)
    if (lastGestationsLengthRef.current !== gestationsLength) {
      lastGestationsLengthRef.current = gestationsLength;

      // Filtrer les gestations du projet actif
      const gestationsProjet = gestations.filter((g) => g.projet_id === projetActif.id);
      const initial = gestationsProjet.slice(0, ITEMS_PER_PAGE);
      setDisplayedGestations(initial);
      setPage(1);
    }
  }, [gestationsLength, gestations, projetActif?.id]); // ✅ Besoin de gestations pour le filtrage

  // ✅ CORRECTION CRITIQUE: Utiliser displayedGestationsLength au lieu de displayedGestations.length
  const loadMore = useCallback(() => {
    if (!projetActif?.id) return;
    if (!Array.isArray(gestations)) return;

    // Filtrer les gestations du projet actif
    const gestationsProjet = gestations.filter((g) => g.projet_id === projetActif.id);

    if (displayedGestationsLength >= gestationsProjet.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = gestationsProjet.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedGestations((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedGestationsLength, gestationsLength, projetActif?.id]); // ✅ Utiliser gestationsLength au lieu de gestations

  const handleEdit = (gestation: Gestation) => {
    if (!canUpdate('reproduction')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier les gestations."
      );
      return;
    }
    setSelectedGestation(gestation);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    if (!canDelete('reproduction')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de supprimer les gestations."
      );
      return;
    }
    Alert.alert('Supprimer la gestation', 'Êtes-vous sûr de vouloir supprimer cette gestation ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => dispatch(deleteGestation(id)),
      },
    ]);
  };

  const handleMarquerTerminee = (gestation: Gestation) => {
    setGestationATerminer(gestation);
    setNombrePorceletsReel(gestation.nombre_porcelets_prevu.toString());
    setDateMiseBasReelle(new Date().toISOString().split('T')[0]);
    setTerminerModalVisible(true);
  };

  const handleConfirmerTerminaison = async () => {
    if (!gestationATerminer) return;

    const nombreReel = parseInt(nombrePorceletsReel, 10);
    if (isNaN(nombreReel) || nombreReel < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un nombre valide de porcelets nés');
      return;
    }

    try {
      await dispatch(
        updateGestation({
          id: gestationATerminer.id,
          updates: {
            statut: 'terminee',
            date_mise_bas_reelle: dateMiseBasReelle,
            nombre_porcelets_reel: nombreReel,
          },
        })
      ).unwrap();

      setTerminerModalVisible(false);
      setGestationATerminer(null);
      setNombrePorceletsReel('');

      if (projetActif) {
        dispatch(loadGestations(projetActif.id));
        dispatch(loadGestationsEnCours(projetActif.id));
        // Recharger les animaux pour afficher les porcelets créés automatiquement
        dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
      }

      // Message de confirmation avec information sur la création automatique des porcelets
      Alert.alert(
        '✅ Gestation terminée',
        `La mise bas a été enregistrée avec succès.\n\n🐷 ${nombreReel} porcelet${nombreReel > 1 ? 's ont' : ' a'} été ${nombreReel > 1 ? 'créés' : 'créé'} automatiquement dans votre cheptel.\n\nVous pouvez les retrouver dans l'onglet "Cheptel" de la section Production.`,
        [{ text: 'OK' }]
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour';
      Alert.alert('Erreur', errorMessage);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedGestation(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    if (projetActif) {
      dispatch(loadGestations(projetActif.id));
      dispatch(loadGestationsEnCours(projetActif.id));
    }
  };

  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(loadGestations(projetActif.id)).unwrap(),
        dispatch(loadGestationsEnCours(projetActif.id)).unwrap(),
      ]);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, projetActif?.id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date invalide';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return 'Date invalide';
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return colors.success;
      case 'terminee':
        return colors.textSecondary;
      case 'annulee':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return 'En cours';
      case 'terminee':
        return 'Terminée';
      case 'annulee':
        return 'Annulée';
      default:
        return statut;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des gestations..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestations</Text>
        {canCreate('reproduction') && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setSelectedGestation(null);
              setIsEditing(false);
              setModalVisible(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Nouvelle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Statistiques */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
        <StatCard value={gestationsEnCours.length} label="En cours" valueColor={colors.primary} />
        <StatCard value={alertes.length} label="Alertes" valueColor={colors.warning} />
        <StatCard
          value={
            projetActif?.id && Array.isArray(gestations)
              ? gestations.filter((g) => g.projet_id === projetActif.id && g.statut === 'terminee')
                  .length
              : 0
          }
          label="Terminées"
          valueColor={colors.textSecondary}
        />
      </View>

      {/* Alertes */}
      {alertes.length > 0 && (
        <View style={[styles.alertesContainer, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.alertesTitle, { color: colors.text }]}>🔔 Alertes</Text>
          {alertes.map((gestation) => {
            if (!gestation.date_mise_bas_prevue) return null;
            try {
              const joursRestants = joursRestantsAvantMiseBas(gestation.date_mise_bas_prevue);
              return (
                <View
                  key={gestation.id}
                  style={[styles.alerteCard, { backgroundColor: colors.background }]}
                >
                  <Text style={[styles.alerteText, { color: colors.warning }]}>
                    ⚠️ Mise bas prévue dans {joursRestants} jour{joursRestants > 1 ? 's' : ''} pour{' '}
                    {gestation.truie_nom || gestation.truie_id}
                  </Text>
                  <Text style={[styles.alerteDate, { color: colors.textSecondary }]}>
                    Date prévue: {formatDate(gestation.date_mise_bas_prevue)}
                  </Text>
                </View>
              );
            } catch (error) {
              console.error("Erreur lors de l'affichage de l'alerte:", error);
              return null;
            }
          })}
        </View>
      )}

      {!projetActif?.id ||
      !Array.isArray(gestations) ||
      gestations.filter((g) => g.projet_id === projetActif.id).length === 0 ? (
        <EmptyState
          title="Aucune gestation enregistrée"
          message="Ajoutez votre première gestation pour commencer"
          action={
            canCreate('reproduction') ? (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setSelectedGestation(null);
                  setIsEditing(false);
                  setModalVisible(true);
                }}
              >
                <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>
                  + Nouvelle gestation
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={displayedGestations}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item: gestation }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...colors.shadow.small,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {gestation.truie_nom || gestation.truie_id}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(gestation.statut), marginLeft: SPACING.sm },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: colors.textOnPrimary }]}>
                      {getStatusLabel(gestation.statut)}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {gestation.statut === 'en_cours' && canUpdate('reproduction') && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleMarquerTerminee(gestation)}
                    >
                      <Text style={styles.actionButtonText}>✓</Text>
                    </TouchableOpacity>
                  )}
                  {canUpdate('reproduction') && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        gestation.statut === 'en_cours' && canUpdate('reproduction')
                          ? { marginLeft: SPACING.xs }
                          : {},
                      ]}
                      onPress={() => handleEdit(gestation)}
                    >
                      <Text style={styles.actionButtonText}>✏️</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete('reproduction') && (
                    <TouchableOpacity
                      style={[styles.actionButton, { marginLeft: SPACING.xs }]}
                      onPress={() => handleDelete(gestation.id)}
                    >
                      <Text style={styles.actionButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.cardContent}>
                {gestation.verrat_id ? (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Verrat utilisé:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {(() => {
                        // Chercher le verrat dans le cheptel pour obtenir son nom réel
                        const verrat = animaux.find(
                          (a: ProductionAnimal) => a.id === gestation.verrat_id
                        );
                        if (verrat) {
                          // Afficher le nom personnalisé, le code, ou un nom par défaut
                          return verrat.nom || verrat.code || `Verrat ${verrat.id}`;
                        }
                        // Si le verrat n'est pas trouvé, utiliser verrat_nom ou verrat_id comme fallback
                        return gestation.verrat_nom || gestation.verrat_id;
                      })()}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Date de sautage:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(gestation.date_sautage)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Mise bas prévue:
                  </Text>
                  <Text style={[styles.infoValue, styles.highlight, { color: colors.primary }]}>
                    {formatDate(gestation.date_mise_bas_prevue)}
                  </Text>
                </View>
                {gestation.date_mise_bas_reelle && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Mise bas réelle:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatDate(gestation.date_mise_bas_reelle)}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Porcelets prévus:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {gestation.nombre_porcelets_prevu}
                  </Text>
                </View>
                {gestation.nombre_porcelets_reel && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Porcelets réels:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {gestation.nombre_porcelets_reel}
                    </Text>
                  </View>
                )}
                {gestation.statut === 'en_cours' &&
                  gestation.date_mise_bas_prevue &&
                  (() => {
                    try {
                      const joursRestants = joursRestantsAvantMiseBas(
                        gestation.date_mise_bas_prevue
                      );
                      return (
                        <View
                          style={[styles.daysRemaining, { backgroundColor: colors.primary + '20' }]}
                        >
                          <Text style={[styles.daysRemainingText, { color: colors.primary }]}>
                            {joursRestants} jour{joursRestants > 1 ? 's' : ''} restant
                            {joursRestants > 1 ? 's' : ''}
                          </Text>
                        </View>
                      );
                    } catch (error) {
                      console.error('Erreur lors du calcul des jours restants:', error);
                      return null;
                    }
                  })()}
                {gestation.notes && (
                  <View style={[styles.notesContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes:</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>
                      {gestation.notes}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          // Optimisations de performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={
            Array.isArray(gestations) && displayedGestations.length < gestations.length ? (
              <LoadingSpinner message="Chargement..." />
            ) : null
          }
        />
      )}

      <GestationFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        gestation={selectedGestation}
        isEditing={isEditing}
      />

      {/* Modal pour terminer la gestation */}
      <CustomModal
        visible={terminerModalVisible}
        onClose={() => {
          setTerminerModalVisible(false);
          setGestationATerminer(null);
          setNombrePorceletsReel('');
        }}
        title="Terminer la gestation"
        showButtons={false}
      >
        <ScrollView style={styles.terminerModalScroll}>
          {gestationATerminer && (
            <>
              <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.infoBoxTitle, { color: colors.primary }]}>
                  Informations de la gestation
                </Text>
                <Text style={[styles.infoBoxText, { color: colors.text }]}>
                  Truie: {gestationATerminer.truie_nom || gestationATerminer.truie_id}
                </Text>
                <Text style={[styles.infoBoxText, { color: colors.text }]}>
                  Porcelets prévus: {gestationATerminer.nombre_porcelets_prevu}
                </Text>
              </View>

              <FormField
                label="Nombre de porcelets nés *"
                value={nombrePorceletsReel}
                onChangeText={setNombrePorceletsReel}
                keyboardType="numeric"
                placeholder="0"
                required
              />

              <FormField
                label="Date de mise bas réelle"
                value={dateMiseBasReelle}
                onChangeText={setDateMiseBasReelle}
                placeholder="YYYY-MM-DD"
              />

              <Button
                title="Confirmer la mise bas"
                onPress={handleConfirmerTerminaison}
                variant="primary"
              />
            </>
          )}
        </ScrollView>
      </CustomModal>
    </View>
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
    paddingTop: SPACING.md + 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  alertesContainer: {
    padding: SPACING.md,
  },
  alertesTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  alerteCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  alerteText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  alerteDate: {
    fontSize: FONT_SIZES.sm,
  },
  scrollView: {
    maxHeight: 500,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
  },
  cardContent: {
    marginTop: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
  },
  highlight: {
    fontWeight: 'bold',
  },
  daysRemaining: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  daysRemainingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  notesContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  terminerModalScroll: {
    maxHeight: 400,
  },
  infoBox: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoBoxTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  infoBoxText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
});
