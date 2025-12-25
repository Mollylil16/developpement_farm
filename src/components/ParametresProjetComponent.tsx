/**
 * Composant gestion du projet dans les paramètres
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadProjets,
  switchProjetActif,
  updateProjet,
  loadProjetActif,
  deleteProjet,
} from '../store/slices/projetSlice';
import { loadMortalitesParProjet } from '../store/slices/mortalitesSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { selectAllMortalites } from '../store/selectors/mortalitesSelectors';
import { Projet } from '../types';
import { differenceInMonths, parseISO } from 'date-fns';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import FormField from './FormField';
import Button from './Button';
import { countAnimalsByCategory } from '../utils/animalUtils';
import { SCREENS } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

export default function ParametresProjetComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp<any>>();
  const { projetActif, projets, loading } = useAppSelector((state) => state.projet);
  const mortalites = useAppSelector(selectAllMortalites);
  const animaux = useAppSelector(selectAllAnimaux);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Projet>>({});

  // Utiliser useRef pour tracker les chargements et éviter les boucles
  const aChargeRef = useRef<string | null>(null);

  // Charger les données uniquement quand l'écran est en focus
  useFocusEffect(
    React.useCallback(() => {
      dispatch(loadProjets());
      dispatch(loadProjetActif());
    }, [dispatch])
  );

  // Charger les animaux et mortalités quand le projet actif change (une seule fois par projet)
  useFocusEffect(
    React.useCallback(() => {
      if (!projetActif) {
        aChargeRef.current = null;
        return;
      }

      // Charger uniquement si le projet a changé
      if (aChargeRef.current !== projetActif.id) {
        aChargeRef.current = projetActif.id;
        dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
        dispatch(loadMortalitesParProjet(projetActif.id));
      }
    }, [dispatch, projetActif?.id])
  );

  useEffect(() => {
    if (projetActif && isEditing) {
      setEditData({
        nom: projetActif.nom,
        localisation: projetActif.localisation,
        nombre_truies: projetActif.nombre_truies,
        nombre_verrats: projetActif.nombre_verrats,
        nombre_porcelets: projetActif.nombre_porcelets,
        nombre_croissance: projetActif.nombre_croissance || 0,
        poids_moyen_actuel: projetActif.poids_moyen_actuel,
        age_moyen_actuel: projetActif.age_moyen_actuel,
        prix_kg_vif: projetActif.prix_kg_vif,
        prix_kg_carcasse: projetActif.prix_kg_carcasse,
        duree_amortissement_par_defaut_mois: projetActif.duree_amortissement_par_defaut_mois || 36,
        notes: projetActif.notes || '',
      });
    }
  }, [projetActif?.id, isEditing]);

  const handleSwitchProjet = React.useCallback((projetId: string) => {
    Alert.alert(
      'Changer de projet',
      'Voulez-vous activer ce projet ? Les données affichées seront celles de ce projet.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Changer',
          onPress: async () => {
            await dispatch(switchProjetActif(projetId));
            dispatch(loadProjetActif());
          },
        },
      ]
    );
  }, [dispatch]);

  // Mémoriser les animaux et mortalités filtrés par projet
  const animauxActifsProjet = useMemo(() => {
    if (!projetActif) return [];
    return animaux.filter(
      (animal) => animal.projet_id === projetActif.id && animal.statut?.toLowerCase() === 'actif'
    );
  }, [projetActif?.id, animaux]);

  const mortalitesProjet = useMemo(() => {
    if (!projetActif) return [];
    return mortalites.filter((m) => m.projet_id === projetActif.id);
  }, [projetActif?.id, mortalites]);

  // Calculer les effectifs réels à partir du cheptel (animaux réellement enregistrés)
  const effectifsReels = useMemo(() => {
    if (!projetActif) return { truies: 0, verrats: 0, porcelets: 0 };

    const baseCounts = {
      truies: projetActif.nombre_truies ?? 0,
      verrats: projetActif.nombre_verrats ?? 0,
      porcelets: projetActif.nombre_porcelets ?? 0,
    };

    // Utiliser la fonction utilitaire pour compter les animaux par catégorie
    const { truies, verrats, porcelets } = countAnimalsByCategory(animauxActifsProjet);

    if (animauxActifsProjet.length === 0) {
      const mortalitesTruies = mortalitesProjet
        .filter((m) => m.categorie === 'truie')
        .reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);
      const mortalitesVerrats = mortalitesProjet
        .filter((m) => m.categorie === 'verrat')
        .reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);
      const mortalitesPorcelets = mortalitesProjet
        .filter((m) => m.categorie === 'porcelet')
        .reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);

      return {
        truies: Math.max(0, baseCounts.truies - mortalitesTruies),
        verrats: Math.max(0, baseCounts.verrats - mortalitesVerrats),
        porcelets: Math.max(0, baseCounts.porcelets - mortalitesPorcelets),
      };
    }

    return {
      truies,
      verrats,
      porcelets,
    };
  }, [projetActif, animauxActifsProjet, mortalitesProjet]);

  // Mémoriser la liste des projets filtrés pour éviter double filtrage
  const autresProjets = useMemo(
    () => projets.filter((p) => p.id !== projetActif?.id),
    [projets, projetActif?.id]
  );

  const handleSaveEdit = async () => {
    if (!projetActif) return;

    // Validation
    if (!editData.nom?.trim()) {
      Alert.alert('Erreur', 'Le nom de la ferme est requis');
      return;
    }
    if (!editData.localisation?.trim()) {
      Alert.alert('Erreur', 'La localisation est requise');
      return;
    }

    try {
      await dispatch(
        updateProjet({
          id: projetActif.id,
          updates: editData,
        })
      ).unwrap();
      setIsEditing(false);
      Alert.alert('Succès', 'Projet modifié avec succès');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la modification';
      Alert.alert('Erreur', errorMessage);
    }
  };

  const handleDeleteProjet = React.useCallback(async (projetId: string) => {
    const projet = projets.find((p) => p.id === projetId);
    const isActive = projetActif?.id === projetId;

    Alert.alert(
      'Supprimer ce projet ?',
      'Toutes les données de ce projet (animaux, finances, pesées, vaccinations, etc.) seront définitivement supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteProjet(projetId)).unwrap();
              
              // Recharger les projets après suppression
              await dispatch(loadProjets());
              
              // Si le projet supprimé était actif, charger un autre projet actif ou rediriger
              if (isActive) {
                await dispatch(loadProjets());
                const result = await dispatch(loadProjetActif());
                const updatedProjetActif = result.payload;
                
                if (!updatedProjetActif) {
                  // Plus de projets → rediriger vers création
                  navigation.navigate(SCREENS.CREATE_PROJECT);
                }
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression';
              Alert.alert('Erreur', errorMessage);
            }
          },
        },
      ]
    );
  }, [dispatch, projets, projetActif?.id, navigation]);

  if (loading) {
    return <LoadingSpinner message="Chargement..." />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Projet actif */}
      {projetActif && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Projet Actif</Text>
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
              <View style={styles.cardHeaderContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{projetActif.nom}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {projetActif.localisation}
                </Text>
              </View>
            </View>
            {!isEditing ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statsRow}>
                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {effectifsReels.truies}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Truies</Text>
                    {projetActif.nombre_truies !== effectifsReels.truies && (
                      <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
                        (Initial: {projetActif.nombre_truies})
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {effectifsReels.verrats}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verrats</Text>
                    {projetActif.nombre_verrats !== effectifsReels.verrats && (
                      <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
                        (Initial: {projetActif.nombre_verrats})
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {effectifsReels.porcelets}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Porcelets
                    </Text>
                    {projetActif.nombre_porcelets !== effectifsReels.porcelets && (
                      <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
                        (Initial: {projetActif.nombre_porcelets})
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[
                      styles.editButton,
                      {
                        backgroundColor: colors.primary,
                        flex: 1,
                        marginRight: SPACING.xs,
                      },
                    ]}
                    onPress={() => setIsEditing(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.editButtonText, { color: colors.textOnPrimary }]}>
                      Modifier
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.editButton,
                      {
                        backgroundColor: '#FF3B30',
                        flex: 1,
                        marginLeft: SPACING.xs,
                      },
                    ]}
                    onPress={() => handleDeleteProjet(projetActif.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.editButtonText, { color: '#FFFFFF' }]}>
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <FormField
                  label="Nom de la ferme"
                  value={editData.nom || ''}
                  onChangeText={(text) => setEditData({ ...editData, nom: text })}
                />
                <FormField
                  label="Localisation"
                  value={editData.localisation || ''}
                  onChangeText={(text) => setEditData({ ...editData, localisation: text })}
                />
                <FormField
                  label="Nombre de truies reproductrices"
                  value={editData.nombre_truies?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, nombre_truies: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Nombre de verrats reproducteurs"
                  value={editData.nombre_verrats?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, nombre_verrats: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Nombre de porcelets"
                  value={editData.nombre_porcelets?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, nombre_porcelets: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Nombre de porcs en croissance"
                  value={(editData.nombre_croissance || 0).toString()}
                  onChangeText={(text) =>
                    setEditData({ ...editData, nombre_croissance: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Poids moyen actuel (kg)"
                  value={editData.poids_moyen_actuel?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, poids_moyen_actuel: parseFloat(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Âge moyen actuel (semaines)"
                  value={editData.age_moyen_actuel?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, age_moyen_actuel: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Prix/kg vif (XOF)"
                  value={editData.prix_kg_vif?.toString() || ''}
                  onChangeText={(text) =>
                    setEditData({ ...editData, prix_kg_vif: text ? parseFloat(text) : undefined })
                  }
                  keyboardType="numeric"
                  placeholder="Ex: 1000"
                />
                <FormField
                  label="Prix/kg carcasse (XOF)"
                  value={editData.prix_kg_carcasse?.toString() || ''}
                  onChangeText={(text) =>
                    setEditData({
                      ...editData,
                      prix_kg_carcasse: text ? parseFloat(text) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="Ex: 1300"
                />

                <View style={{ marginTop: 16, marginBottom: 8 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    💰 Gestion OPEX / CAPEX
                  </Text>
                </View>

                <FormField
                  label="Durée d'amortissement (mois)"
                  value={editData.duree_amortissement_par_defaut_mois?.toString() || '36'}
                  onChangeText={(text) =>
                    setEditData({
                      ...editData,
                      duree_amortissement_par_defaut_mois: text ? parseInt(text) : 36,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="36"
                />

                <Text
                  style={[
                    styles.helperText,
                    { color: colors.textSecondary, marginTop: 8, marginBottom: 16 },
                  ]}
                >
                  Les investissements (équipements lourds, aménagements, etc.) seront
                  automatiquement amortis sur cette durée dans le calcul des coûts de production.
                </Text>

                <FormField
                  label="Notes"
                  value={editData.notes || ''}
                  onChangeText={(text) => setEditData({ ...editData, notes: text })}
                  multiline
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.textSecondary }]}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textOnPrimary }]}>
                      Annuler
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={handleSaveEdit}
                  >
                    <Text style={[styles.saveButtonText, { color: colors.textOnPrimary }]}>
                      Enregistrer
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* Actions du projet */}
      {projetActif && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...colors.shadow.small,
              },
            ]}
            onPress={() => navigation.navigate(SCREENS.MIGRATION_WIZARD)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: colors.primaryLight + '15' }]}>
              <Ionicons name="swap-horizontal-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Migration de données</Text>
              <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                Convertir entre modes batch et individualisé
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...colors.shadow.small,
              },
            ]}
            onPress={() => navigation.navigate(SCREENS.MIGRATION_HISTORY)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: colors.successLight + '15' }]}>
              <Ionicons name="time-outline" size={24} color={colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Historique des migrations</Text>
              <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                Consulter l'historique des conversions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Liste des projets */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Autres Projets</Text>
          <Button
            title="+ Nouveau projet"
            onPress={() => navigation.navigate('CreateProject')}
            size="small"
          />
        </View>
        {autresProjets.length === 0 ? (
          <EmptyState
            title="Aucun autre projet"
            message="Créez d'autres projets pour gérer plusieurs fermes"
            action={
              <Button
                title="Créer un nouveau projet"
                onPress={() => navigation.navigate('CreateProject')}
              />
            }
          />
        ) : (
          autresProjets.map((projet) => {
            // Fonction render pour les actions de swipe
            const renderRightActions = () => {
              return (
                <RectButton
                  style={[
                    styles.deleteButtonContainer,
                    { backgroundColor: colors.error },
                  ]}
                  onPress={() => handleDeleteProjet(projet.id)}
                >
                  <Text style={styles.deleteButtonText}>Supprimer</Text>
                </RectButton>
              );
            };

              return (
                <Swipeable
                  key={projet.id}
                  renderRightActions={renderRightActions}
                  overshootRight={false}
                >
                  <TouchableOpacity
                    style={[
                      styles.projetCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        ...colors.shadow.small,
                      },
                    ]}
                    onPress={() => handleSwitchProjet(projet.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.projetCardContent}>
                      <View style={styles.projetCardHeader}>
                        <Text style={[styles.projetCardTitle, { color: colors.text }]}>
                          {projet.nom}
                        </Text>
                        <View
                          style={[
                            styles.badge,
                            projet.statut === 'actif'
                              ? { backgroundColor: colors.success + '15' }
                              : { backgroundColor: colors.textSecondary + '15' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color:
                                  projet.statut === 'actif' ? colors.success : colors.textSecondary,
                              },
                            ]}
                          >
                            {projet.statut === 'actif' ? 'Actif' : 'Archivé'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.projetCardLocation, { color: colors.textSecondary }]}>
                        {projet.localisation}
                      </Text>
                    </View>
                    <View
                      style={[styles.switchIconContainer, { backgroundColor: colors.primary + '10' }]}
                    >
                      <Text style={[styles.switchIcon, { color: colors.primary }]}>›</Text>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              );
            })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  section: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    letterSpacing: 0.2,
    flex: 1,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: SPACING.sm,
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs / 2,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.xs,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  value: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  statCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statSubtext: {
    fontSize: FONT_SIZES.xs - 2,
    marginTop: SPACING.xs / 2,
    fontStyle: 'italic',
  },
  editButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  projetCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  projetCardContent: {
    flex: 1,
  },
  projetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  projetCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    flex: 1,
  },
  projetCardLocation: {
    fontSize: FONT_SIZES.sm,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  switchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  switchIcon: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '300',
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  actionDescription: {
    fontSize: FONT_SIZES.sm,
  },
  deleteButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.sm,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
