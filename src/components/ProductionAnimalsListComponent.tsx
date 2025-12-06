/**
 * Composant pour afficher la liste des animaux en production avec leurs pesées
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { store } from '../store/store';
import {
  selectAllAnimaux,
  selectPeseesParAnimal,
  selectPeseesRecents,
  selectProductionLoading,
} from '../store/selectors/productionSelectors';
import {
  loadProductionAnimaux,
  deleteProductionAnimal,
  loadPeseesParAnimal,
  loadPeseesRecents,
  deletePesee,
} from '../store/slices/productionSlice';
import { ProductionAnimal, ProductionPesee } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import Button from './Button';
import ProductionAnimalFormModal from './ProductionAnimalFormModal';
import ProductionPeseeFormModal from './ProductionPeseeFormModal';
import WeightEvolutionChart from './WeightEvolutionChart';
import TotalWeightEvolutionChart from './TotalWeightEvolutionChart';
import { format, startOfDay, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { evaluerGMQIndividuel, calculerGMQMoyen } from '../utils/gmqEvaluation';

export default function ProductionAnimalsListComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const { projetActif } = useAppSelector((state) => state.projet);
  const animaux = useAppSelector(selectAllAnimaux);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const peseesRecents = useAppSelector(selectPeseesRecents);
  const loading = useAppSelector(selectProductionLoading);

  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [showPeseeModal, setShowPeseeModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<ProductionAnimal | null>(null);
  const [selectedPesee, setSelectedPesee] = useState<ProductionPesee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPesee, setIsEditingPesee] = useState(false);
  const [displayedAnimals, setDisplayedAnimals] = useState<typeof animauxAvecStats>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const ITEMS_PER_PAGE = 50;

  // Utiliser useRef pour tracker les chargements et éviter les boucles
  const aChargeRef = useRef<string | null>(null);

  // Charger les données quand l'onglet est visible
  // TOUJOURS recharger pour garantir la synchronisation avec Cheptel
  useFocusEffect(
    React.useCallback(() => {
      if (!projetActif) {
        aChargeRef.current = null;
        return;
      }

      console.log('🔄 [ProductionAnimalsListComponent] Rechargement des animaux et pesées...');
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
      dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
      aChargeRef.current = projetActif.id;
    }, [dispatch, projetActif?.id])
  );

  useEffect(() => {
    if (selectedAnimal) {
      dispatch(loadPeseesParAnimal(selectedAnimal.id));
    }
  }, [dispatch, selectedAnimal]);

  const animauxAvecStats = useMemo(() => {
    // Filtrer uniquement les animaux actifs du cheptel (avec protection contre undefined)
    const animauxActifs = (animaux || []).filter(
      (animal) => animal.statut?.toLowerCase() === 'actif'
    );

    return animauxActifs.map((animal) => {
      const pesees = peseesParAnimal[animal.id] || [];
      
      // Les pesées sont triées par date ASC (croissante), donc la dernière est à la fin
      const dernierePesee = pesees.length > 0 ? pesees[pesees.length - 1] : null;

      // Pour le calcul du GMQ moyen, on a besoin de l'ordre chronologique (ASC)
      // Les pesées sont déjà triées par date ASC depuis le Repository
      const peseesTriees = pesees; // Déjà triées ASC

      const gmqMoyen =
        peseesTriees.length > 1
          ? peseesTriees.reduce((sum, p, idx) => {
              if (idx === 0) return sum;
              const prevPesee = peseesTriees[idx - 1];
              const jours = Math.max(
                1,
                Math.floor(
                  (new Date(p.date).getTime() - new Date(prevPesee.date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
              return sum + (p.gmq || 0);
            }, 0) /
            (peseesTriees.length - 1)
          : dernierePesee?.gmq || null;

      return {
        animal,
        dernierePesee,
        gmqMoyen,
        nombrePesees: pesees.length,
      };
    });
  }, [animaux, peseesParAnimal]);

  // Filtrer les animaux selon la recherche
  const animauxFiltres = useMemo(() => {
    if (!searchQuery.trim()) {
      return animauxAvecStats;
    }

    const query = searchQuery.toLowerCase().trim();
    return animauxAvecStats.filter((item) => {
      const code = item.animal.code?.toLowerCase() || '';
      const nom = item.animal.nom?.toLowerCase() || '';
      return code.includes(query) || nom.includes(query);
    });
  }, [animauxAvecStats, searchQuery]);

  // Pagination: charger les premiers animaux
  useEffect(() => {
    const initial = animauxFiltres.slice(0, ITEMS_PER_PAGE);
    setDisplayedAnimals(initial);
    setPage(1);
  }, [animauxFiltres]); // Reset quand les animaux filtrés changent (nombre ou contenu)

  // Charger plus d'animaux
  const loadMore = useCallback(() => {
    if (displayedAnimals.length >= animauxFiltres.length) {
      return; // Tout est déjà chargé
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = animauxFiltres.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedAnimals((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedAnimals.length, animauxFiltres]);

  const handleDelete = useCallback(
    (animal: ProductionAnimal) => {
      if (!canDelete('reproduction')) {
        Alert.alert(
          'Permission refusée',
          "Vous n'avez pas la permission de supprimer les animaux."
        );
        return;
      }
      Alert.alert(
        "Supprimer l'animal",
        `Voulez-vous supprimer ${animal.code}${animal.nom ? ` (${animal.nom})` : ''} ? Toutes les pesées associées seront également supprimées.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              await dispatch(deleteProductionAnimal(animal.id));
              if (selectedAnimal?.id === animal.id) {
                setSelectedAnimal(null);
              }
            },
          },
        ]
      );
    },
    [dispatch, selectedAnimal, setSelectedAnimal, canDelete]
  );

  const handleEditPesee = useCallback(
    (pesee: ProductionPesee) => {
      if (!canUpdate('reproduction')) {
        Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les pesées.");
        return;
      }
      setSelectedPesee(pesee);
      setIsEditingPesee(true);
      setShowPeseeModal(true);
    },
    [canUpdate]
  );

  const handleDeletePesee = useCallback(
    (pesee: ProductionPesee) => {
      if (!canDelete('reproduction')) {
        Alert.alert('Permission refusée', "Vous n'avez pas la permission de supprimer les pesées.");
        return;
      }
      Alert.alert(
        'Supprimer la pesée',
        `Voulez-vous supprimer cette pesée du ${format(new Date(pesee.date), 'dd/MM/yyyy')} (${pesee.poids_kg.toFixed(1)} kg) ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(deletePesee({ id: pesee.id, animalId: pesee.animal_id })).unwrap();
                if (selectedAnimal) {
                  dispatch(loadPeseesParAnimal(selectedAnimal.id));
                }
              } catch (error: any) {
                Alert.alert('Erreur', error || 'Erreur lors de la suppression de la pesée.');
              }
            },
          },
        ]
      );
    },
    [dispatch, selectedAnimal, canDelete]
  );

  // Composant mémorisé pour chaque carte d'animal - défini AVANT les retours anticipés pour éviter les problèmes de hooks
  const AnimalCard = React.memo(
    ({
      item,
      isSelected,
      pesees,
      onSelect,
      onPesee,
      onEdit,
      onDelete,
    }: {
      item: (typeof animauxAvecStats)[0];
      isSelected: boolean;
      pesees: ProductionPesee[];
      onSelect: (animal: ProductionAnimal) => void;
      onPesee: (animal: ProductionAnimal) => void;
      onEdit: (animal: ProductionAnimal) => void;
      onDelete: (animal: ProductionAnimal) => void;
    }) => {
      const { colors } = useTheme();
      const { animal, dernierePesee, gmqMoyen, nombrePesees } = item;

      return (
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: isSelected ? colors.primary : colors.borderLight,
              borderWidth: isSelected ? 2 : 1,
              ...colors.shadow.small,
            },
          ]}
          onPress={() => onSelect(animal)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            {animal.photo_uri ? (
              <Image
                key={`photo-${animal.id}-${animal.photo_uri}`}
                source={{ uri: animal.photo_uri }}
                style={styles.animalPhoto}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.animalPhoto,
                  styles.animalPhotoPlaceholder,
                  {
                    backgroundColor: colors.primaryLight + '15',
                    borderColor: colors.primary + '30',
                  },
                ]}
              >
                <Text style={{ fontSize: 40 }}>🐷</Text>
              </View>
            )}
            <View style={styles.cardHeaderRight}>
              <View style={styles.titleRow}>
                <Text style={[styles.cardCode, { color: colors.text }]}>{animal.code}</Text>
                {animal.nom && (
                  <Text style={[styles.cardNom, { color: colors.textSecondary }]}>
                    • {animal.nom}
                  </Text>
                )}
              </View>
              {animal.statut?.toLowerCase() !== 'actif' && (
                <View
                  style={[styles.inactiveBadge, { backgroundColor: colors.textSecondary + '20' }]}
                >
                  <Text style={[styles.inactiveBadgeText, { color: colors.textSecondary }]}>
                    Inactif
                  </Text>
                </View>
              )}
              <View style={styles.cardActions}>
                {canCreate('reproduction') && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primaryLight + '15' }]}
                    onPress={() => onPesee(animal)}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.primaryDark }]}>
                      Pesée
                    </Text>
                  </TouchableOpacity>
                )}
                {canUpdate('reproduction') && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primaryLight + '15' }]}
                    onPress={() => onEdit(animal)}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.primaryDark }]}>
                      Modifier
                    </Text>
                  </TouchableOpacity>
                )}
                {canDelete('reproduction') && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                    onPress={() => onDelete(animal)}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {dernierePesee && (
            <View style={[styles.cardStats, { borderTopColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Dernière pesée:
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {format(new Date(dernierePesee.date), 'dd MMM yyyy', { locale: fr })}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids:</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {dernierePesee.poids_kg.toFixed(1)} kg
                </Text>
              </View>
              {dernierePesee.gmq && (
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GMQ:</Text>
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color: dernierePesee.gmq < 0 ? colors.error : colors.success,
                      },
                    ]}
                  >
                    {dernierePesee.gmq.toFixed(0)} g/j
                  </Text>
                </View>
              )}
              {gmqMoyen !== null && (
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    GMQ moyen:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {gmqMoyen.toFixed(0)} g/j
                  </Text>
                </View>
              )}
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Nombre de pesées:
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{nombrePesees}</Text>
              </View>
            </View>
          )}

          {/* Évaluation GMQ */}
          {gmqMoyen !== null && dernierePesee && (() => {
            const evaluation = evaluerGMQIndividuel(gmqMoyen);
            return (
              <View
                style={[
                  styles.gmqEvaluationBox,
                  { 
                    backgroundColor: `${evaluation.couleur}15`,
                    borderColor: `${evaluation.couleur}40`,
                  },
                ]}
              >
                <View style={styles.gmqEvaluationHeader}>
                  <Text style={{ fontSize: 20 }}>{evaluation.icone}</Text>
                  <Text
                    style={[
                      styles.gmqEvaluationTitle,
                      { color: evaluation.couleur },
                    ]}
                  >
                    {evaluation.commentaire}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.gmqEvaluationText,
                    { color: colors.text },
                  ]}
                >
                  {evaluation.recommandation}
                </Text>
              </View>
            );
          })()}

          {isSelected && (
            <View style={[styles.historyContainer, { borderTopColor: colors.border }]}>
              {/* Graphique d'évolution */}
              {pesees.length > 0 && (
                <View style={styles.chartContainer}>
                  <WeightEvolutionChart pesees={pesees} animalName={animal.nom || animal.code} />
                </View>
              )}

              <Text style={[styles.historyTitle, { color: colors.text }]}>
                Historique des pesées
              </Text>
              {pesees.length === 0 ? (
                <Text style={[styles.noHistoryText, { color: colors.textSecondary }]}>
                  Aucune pesée enregistrée pour cet animal.
                </Text>
              ) : (
                <View style={[styles.historyList, { backgroundColor: colors.background }]}>
                  {[...pesees]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((pesee) => (
                      <TouchableOpacity
                        key={pesee.id}
                        style={[styles.historyItem, { borderBottomColor: colors.divider }]}
                        onPress={() => handleEditPesee(pesee)}
                        onLongPress={() => {
                          Alert.alert(
                            'Options',
                            `Pesée du ${format(new Date(pesee.date), 'dd/MM/yyyy')}`,
                            [
                              {
                                text: 'Modifier',
                                onPress: () => handleEditPesee(pesee),
                              },
                              {
                                text: 'Supprimer',
                                style: 'destructive',
                                onPress: () => handleDeletePesee(pesee),
                              },
                              {
                                text: 'Annuler',
                                style: 'cancel',
                              },
                            ]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.historyItemHeader}>
                          <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                            {format(new Date(pesee.date), 'dd MMM yyyy', { locale: fr })}
                          </Text>
                          <Text style={[styles.historyPoids, { color: colors.text }]}>
                            {pesee.poids_kg.toFixed(1)} kg
                          </Text>
                        </View>
                        {pesee.gmq && (
                          <Text style={[styles.historyGmq, { color: colors.primary }]}>
                            GMQ: {pesee.gmq.toFixed(0)} g/j
                          </Text>
                        )}
                        {pesee.commentaire && (
                          <Text style={[styles.historyComment, { color: colors.textTertiary }]}>
                            {pesee.commentaire}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    }
  );

  // Définir renderAnimal, ListHeader et ListFooter AVANT les retours anticipés pour éviter les problèmes de hooks
  const renderAnimal = useCallback(
    ({ item }: { item: (typeof animauxAvecStats)[0] }) => {
      const isSelected = selectedAnimal?.id === item.animal.id;
      const pesees = peseesParAnimal[item.animal.id] || [];

      return (
        <AnimalCard
          item={item}
          isSelected={isSelected}
          pesees={pesees}
          onSelect={(animal) => setSelectedAnimal(isSelected ? null : animal)}
          onPesee={(animal) => {
            if (!canCreate('reproduction')) {
              Alert.alert(
                'Permission refusée',
                "Vous n'avez pas la permission d'ajouter des pesées."
              );
              return;
            }
            setSelectedAnimal(animal);
            setShowPeseeModal(true);
          }}
          onEdit={async (animal) => {
            if (!canUpdate('reproduction')) {
              Alert.alert(
                'Permission refusée',
                "Vous n'avez pas la permission de modifier les animaux."
              );
              return;
            }
            // Recharger les données pour avoir l'animal le plus à jour (avec photo)
            if (projetActif) {
              await dispatch(loadProductionAnimaux({ projetId: projetActif.id })).unwrap();
              // Récupérer l'animal mis à jour depuis Redux (accès direct au store)
              const state = store.getState();
              const animauxMisAJour = selectAllAnimaux(state);
              const animalMisAJour = animauxMisAJour.find(a => a.id === animal.id);
              setSelectedAnimal(animalMisAJour || animal);
            } else {
              setSelectedAnimal(animal);
            }
            setIsEditing(true);
            setShowAnimalModal(true);
          }}
          onDelete={handleDelete}
        />
      );
    },
    [
      selectedAnimal,
      peseesParAnimal,
      handleDelete,
      setSelectedAnimal,
      setShowPeseeModal,
      setIsEditing,
      setShowAnimalModal,
      canCreate,
      canUpdate,
    ]
  );

  // Calculer le poids total du cheptel basé sur les dernières pesées
  const poidsTotalCheptel = useMemo(() => {
    const animauxActifs = animaux.filter((a) => a.statut?.toLowerCase() === 'actif');
    let poidsTotal = 0;
    let animauxAvecPesee = 0;
    let sommeGMQ = 0;
    let animauxAvecGMQ = 0;

    animauxActifs.forEach((animal) => {
      const pesees = peseesParAnimal[animal.id] || [];
      if (pesees.length > 0) {
        // Les pesées sont triées par date ASC, donc la dernière est à la fin
        const dernierePesee = pesees[pesees.length - 1];
        poidsTotal += dernierePesee.poids_kg;
        animauxAvecPesee++;

        // Calculer le GMQ moyen de l'animal
        const gmqMoyen = calculerGMQMoyen(
          pesees.map((p) => ({ date: p.date, gmq: p.gmq ?? null }))
        );
        if (gmqMoyen > 0) {
          sommeGMQ += gmqMoyen;
          animauxAvecGMQ++;
        }
      }
    });

    const gmqMoyenCheptel = animauxAvecGMQ > 0 ? sommeGMQ / animauxAvecGMQ : 0;

    return {
      poidsTotal,
      animauxAvecPesee,
      animauxActifs: animauxActifs.length,
      gmqMoyenCheptel,
    };
  }, [animaux, peseesParAnimal]);

  // Période par défaut pour le graphe de poids total
  const [periodePoidsFerme, setPeriodePoidsFerme] = useState<7 | 30 | 90>(30);

  // Calculer l'évolution du poids total de la ferme dans le temps
  const evolutionPoidsFerme = useMemo(() => {
    const animauxActifs = animaux.filter((a) => a.statut?.toLowerCase() === 'actif');

    // Collecter toutes les pesées des animaux actifs
    const toutesLesPesees: (ProductionPesee & { animalId: string })[] = [];
    animauxActifs.forEach((animal) => {
      const pesees = peseesParAnimal[animal.id] || [];
      pesees.forEach((pesee) => {
        toutesLesPesees.push({ ...pesee, animalId: animal.id });
      });
    });

    if (toutesLesPesees.length === 0) {
      return null;
    }

    // Déterminer la plage de dates
    // Utiliser la date maximale des pesées au lieu d'aujourd'hui pour inclure les pesées futures
    const datesPesees = toutesLesPesees.map((p) => parseISO(p.date).getTime());
    const dateMax = new Date(Math.max(...datesPesees));
    const dateFin = startOfDay(dateMax);
    const dateDebut = subDays(dateFin, periodePoidsFerme);
    const datesFiltrees = eachDayOfInterval({ start: dateDebut, end: dateFin });

    // Grouper les pesées par date et animal (prendre la plus récente par animal par jour)
    const peseesParDateEtAnimal: { [date: string]: { [animalId: string]: number } } = {};

    toutesLesPesees.forEach((pesee) => {
      const dateStr = format(startOfDay(parseISO(pesee.date)), 'yyyy-MM-dd');
      if (!peseesParDateEtAnimal[dateStr]) {
        peseesParDateEtAnimal[dateStr] = {};
      }
      // Si plusieurs pesées le même jour pour le même animal, garder la plus récente
      if (
        !peseesParDateEtAnimal[dateStr][pesee.animalId] ||
        new Date(pesee.date).getTime() >
          new Date(peseesParDateEtAnimal[dateStr][pesee.animalId]).getTime()
      ) {
        peseesParDateEtAnimal[dateStr][pesee.animalId] = pesee.poids_kg;
      }
    });

    // Pour chaque date, calculer le poids total en utilisant le dernier poids connu de chaque animal
    const derniersPoidsConnus: { [animalId: string]: number } = {};
    const donnees: { date: string; poidsTotal: number }[] = [];

    datesFiltrees.forEach((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Mettre à jour les derniers poids connus avec les pesées du jour
      if (peseesParDateEtAnimal[dateStr]) {
        Object.entries(peseesParDateEtAnimal[dateStr]).forEach(([animalId, poids]) => {
          derniersPoidsConnus[animalId] = poids;
        });
      }

      // Calculer le poids total à cette date
      const poidsTotal = Object.values(derniersPoidsConnus).reduce((sum, poids) => sum + poids, 0);

      // Ajouter uniquement si on a au moins un poids connu
      if (Object.keys(derniersPoidsConnus).length > 0) {
        donnees.push({ date: dateStr, poidsTotal });
      }
    });

    if (donnees.length === 0) {
      return null;
    }

    return donnees;
  }, [animaux, peseesParAnimal, periodePoidsFerme]);

  const ListHeader = React.useCallback(
    () => (
      <>
        {/* Carte récapitulative */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryHeader}>
            <TouchableOpacity style={styles.summaryToggle} onPress={() => {}}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>📊 Suivi des pesées</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {poidsTotalCheptel.animauxActifs}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Animaux actifs
              </Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {peseesRecents.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Pesées récentes
              </Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {poidsTotalCheptel.poidsTotal.toFixed(0)} kg
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Poids total
              </Text>
            </View>
          </View>
          {poidsTotalCheptel.animauxAvecPesee < poidsTotalCheptel.animauxActifs && (
            <View
              style={[
                styles.disclaimerContainer,
                { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}30` },
              ]}
            >
              <Text style={[styles.disclaimerText, { color: colors.text }]}>
                ℹ️ Poids approximatif basé sur les dernières pesées de{' '}
                {poidsTotalCheptel.animauxAvecPesee}/{poidsTotalCheptel.animauxActifs} animaux.
                {poidsTotalCheptel.animauxAvecPesee < poidsTotalCheptel.animauxActifs &&
                  " Certains animaux n'ont pas encore été pesés."}
              </Text>
            </View>
          )}
        </View>

        {/* Sélecteur de période */}
        {evolutionPoidsFerme && evolutionPoidsFerme.length > 0 && (
          <View style={[styles.periodSelectorContainer, { marginHorizontal: SPACING.md, marginTop: SPACING.md }]}>
            <View style={styles.periodSelector}>
              {([7, 30, 90] as const).map((jours) => (
                <TouchableOpacity
                  key={jours}
                  style={[
                    styles.periodButton,
                    {
                      backgroundColor:
                        periodePoidsFerme === jours ? colors.primary : colors.background,
                      borderColor: periodePoidsFerme === jours ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPeriodePoidsFerme(jours)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      {
                        color: periodePoidsFerme === jours ? colors.textOnPrimary : colors.text,
                      },
                    ]}
                  >
                    {jours}j
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Graphe d'évolution du poids total de la ferme */}
        {evolutionPoidsFerme && evolutionPoidsFerme.length > 0 && (
          <View style={{ marginHorizontal: SPACING.md }}>
            <TotalWeightEvolutionChart
              evolutionData={evolutionPoidsFerme}
              nombreAnimaux={poidsTotalCheptel.animauxActifs}
              gmqMoyenCheptel={poidsTotalCheptel.gmqMoyenCheptel}
            />
          </View>
        )}

        {/* Barre de recherche */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.surface, ...colors.shadow.small },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher par code ou nom..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Titre de la liste */}
        <View style={styles.listContainer}>
          <Text style={[styles.listTitle, { color: colors.text }]}>
            {searchQuery
              ? `Résultats (${animauxFiltres.length})`
              : `Mes animaux (${animaux.length})`}
          </Text>
        </View>
      </>
    ),
    [
      colors,
      animaux,
      peseesRecents.length,
      poidsTotalCheptel,
      searchQuery,
      animauxFiltres.length,
      evolutionPoidsFerme,
      periodePoidsFerme,
    ]
  );

  const ListFooter = React.useCallback(() => {
    if (displayedAnimals.length >= animauxFiltres.length) {
      return null;
    }
    return (
      <View style={styles.loadingMore}>
        <LoadingSpinner message="Chargement..." />
      </View>
    );
  }, [displayedAnimals.length, animauxFiltres.length]);

  // Retours anticipés APRÈS toutes les définitions de hooks/composants
  if (!projetActif) {
    return (
      <EmptyState
        title="Aucun projet actif"
        message="Créez ou sélectionnez un projet pour gérer vos animaux en production."
      />
    );
  }

  if (loading && animaux.length === 0) {
    return <LoadingSpinner message="Chargement des animaux..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {animaux.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ListHeader />
          <EmptyState
            title="Aucun animal enregistré"
            message="Ajoutez votre premier animal pour commencer le suivi des pesées."
            action={
              canCreate('reproduction') ? (
                <Button
                  title="Ajouter un animal"
                  onPress={() => {
                    setSelectedAnimal(null);
                    setIsEditing(false);
                    setShowAnimalModal(true);
                  }}
                />
              ) : null
            }
          />
        </View>
      ) : (
        <FlatList
          data={displayedAnimals}
          renderItem={renderAnimal}
          keyExtractor={(item) => item.animal.id}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
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
        />
      )}

      {/* Modals */}
      <ProductionAnimalFormModal
        visible={showAnimalModal}
        onClose={() => {
          setShowAnimalModal(false);
          setIsEditing(false);
          setSelectedAnimal(null);
        }}
        onSuccess={async () => {
          // Recharger les animaux pour afficher les modifications (photos, etc.)
          if (projetActif) {
            await dispatch(loadProductionAnimaux({ projetId: projetActif.id })).unwrap();
            // Forcer un re-render en réinitialisant la page d'affichage
            setPage(1);
          }
        }}
        projetId={projetActif?.id || ''}
        animal={isEditing ? selectedAnimal : null}
        isEditing={isEditing}
      />

      {selectedAnimal && projetActif && (
        <ProductionPeseeFormModal
          visible={showPeseeModal}
          onClose={() => {
            setShowPeseeModal(false);
            setIsEditingPesee(false);
            setSelectedPesee(null);
          }}
          onSuccess={() => {
            setShowPeseeModal(false);
            setIsEditingPesee(false);
            setSelectedPesee(null);
            dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
            dispatch(loadPeseesParAnimal(selectedAnimal.id));
          }}
          projetId={projetActif.id}
          animal={selectedAnimal}
          pesee={isEditingPesee ? selectedPesee : null}
          isEditing={isEditingPesee}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
  loadingMore: {
    paddingVertical: SPACING.lg,
  },
  summaryCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
  },
  summaryHeader: {
    marginBottom: SPACING.md,
  },
  summaryToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  disclaimerContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  disclaimerText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: FONT_SIZES.sm * 1.5,
  },
  dividerVertical: {
    width: 1,
    height: '100%',
    marginHorizontal: SPACING.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.xs,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
  },
  listTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  animalPhoto: {
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.lg,
    resizeMode: 'cover',
  },
  animalPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  cardHeaderRight: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: SPACING.xs,
  },
  cardCode: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  cardNom: {
    fontSize: FONT_SIZES.lg,
    marginLeft: SPACING.xs,
  },
  inactiveBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  inactiveBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
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
  cardStats: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  historyContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  chartContainer: {
    marginBottom: SPACING.md,
  },
  historyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  noHistoryText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  historyList: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  historyItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  historyDate: {
    fontSize: FONT_SIZES.sm,
  },
  historyPoids: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
  },
  historyGmq: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  historyComment: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
  },
  graphCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
  },
  graphHeader: {
    marginBottom: SPACING.md,
  },
  graphToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  graphTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  graphToggleIcon: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  periodSelectorContainer: {
    marginBottom: 0,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  infoBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: FONT_SIZES.sm * 1.5,
  },
  gmqEvaluationBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    marginHorizontal: SPACING.sm,
  },
  gmqEvaluationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  gmqEvaluationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  gmqEvaluationText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: FONT_SIZES.sm * 1.6,
  },
});
