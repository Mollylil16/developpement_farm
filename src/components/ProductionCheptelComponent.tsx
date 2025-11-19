/**
 * Composant pour gérer le cheptel (liste complète des animaux)
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadProductionAnimaux,
  deleteProductionAnimal,
  updateProductionAnimal,
  loadPeseesRecents,
} from '../store/slices/productionSlice';
import { selectAllAnimaux, selectProductionLoading } from '../store/selectors/productionSelectors';
import { selectAllVaccinations, selectAllMaladies, selectAllTraitements } from '../store/selectors/santeSelectors';
import { loadVaccinations, loadMaladies, loadTraitements } from '../store/slices/santeSlice';
import { useAnimauxActifs } from '../hooks/useAnimauxActifs';
import { ProductionAnimal, StatutAnimal, STATUT_ANIMAL_LABELS } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import Button from './Button';
import ProductionAnimalFormModal from './ProductionAnimalFormModal';
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import Card from './Card';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { getCategorieAnimal, calculerAge, getStatutColor } from '../utils/animalUtils';
import { Ionicons } from '@expo/vector-icons';

export default function ProductionCheptelComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const navigation = useNavigation<any>();
  const { projetActif } = useAppSelector((state) => state.projet);
  const loading = useAppSelector(selectProductionLoading);
  const allAnimaux = useAppSelector(selectAllAnimaux);
  const vaccinations = useAppSelector(selectAllVaccinations);
  const maladies = useAppSelector(selectAllMaladies);
  const traitements = useAppSelector(selectAllTraitements);
  
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<ProductionAnimal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterCategorie, setFilterCategorie] = useState<'tous' | 'truie' | 'verrat' | 'porcelet'>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedHistorique, setExpandedHistorique] = useState<string | null>(null);

  // Statuts qui doivent être dans le cheptel (pas dans l'historique)
  const STATUTS_CHEPTEL: StatutAnimal[] = ['actif', 'autre'];

  // Charger les données uniquement quand l'onglet est visible (éviter les boucles infinies)
  const aChargeRef = useRef<string | null>(null);
  
  useFocusEffect(
    React.useCallback(() => {
      if (!projetActif) {
        aChargeRef.current = null;
        return;
      }
      
      // Charger uniquement une fois par projet (quand le projet change ou au premier focus)
      if (aChargeRef.current !== projetActif.id) {
        aChargeRef.current = projetActif.id;
        dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
        dispatch(loadVaccinations(projetActif.id));
        dispatch(loadMaladies(projetActif.id));
        dispatch(loadTraitements(projetActif.id));
      }
    }, [dispatch, projetActif?.id])
  );
  
  // Fonction pour rafraîchir les données (pull-to-refresh)
  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;
    
    setRefreshing(true);
    try {
      await dispatch(loadProductionAnimaux({ projetId: projetActif.id })).unwrap();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [projetActif?.id, dispatch]);

  // Filtrer les animaux du cheptel (actif et autre) avec les filtres appliqués
  const animauxFiltres = useMemo(() => {
    if (!Array.isArray(allAnimaux)) return [];
    
    // D'abord filtrer par statut (cheptel uniquement)
    let result = allAnimaux.filter((a) => 
      a.projet_id === projetActif?.id && 
      STATUTS_CHEPTEL.includes(a.statut)
    );

    // Filtrer par catégorie si spécifié
    if (filterCategorie !== 'tous') {
      result = result.filter((a) => getCategorieAnimal(a) === filterCategorie);
    }

    // Filtrer par recherche (code ou nom) si spécifié
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((a) => {
        const codeMatch = a.code?.toLowerCase().includes(query) || false;
        const nomMatch = a.nom?.toLowerCase().includes(query) || false;
        return codeMatch || nomMatch;
      });
    }

    return result;
  }, [allAnimaux, projetActif?.id, filterCategorie, searchQuery]);

  // Compter par catégorie pour les animaux du cheptel
  const countByCategory = useMemo(() => {
    if (!Array.isArray(allAnimaux)) return { truies: 0, verrats: 0, porcelets: 0 };
    
    const animauxCheptel = allAnimaux.filter((a) => 
      a.projet_id === projetActif?.id && 
      STATUTS_CHEPTEL.includes(a.statut)
    );
    
    return {
      truies: animauxCheptel.filter((a) => getCategorieAnimal(a) === 'truie').length,
      verrats: animauxCheptel.filter((a) => getCategorieAnimal(a) === 'verrat').length,
      porcelets: animauxCheptel.filter((a) => getCategorieAnimal(a) === 'porcelet').length,
    };
  }, [allAnimaux, projetActif?.id]);

  const handleDelete = (animal: ProductionAnimal) => {
    if (!canDelete('reproduction')) {
      Alert.alert('Permission refusée', 'Vous n\'avez pas la permission de supprimer les animaux.');
      return;
    }
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

  const handleChangeStatut = useCallback((animal: ProductionAnimal, nouveauStatut: StatutAnimal) => {
    if (!canUpdate('reproduction')) {
      Alert.alert('Permission refusée', 'Vous n\'avez pas la permission de modifier les animaux.');
      return;
    }
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
              // Recharger les animaux pour mettre à jour les listes
              if (projetActif) {
                dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
                // Recharger les pesées récentes pour exclure celles des animaux retirés
                dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
              }
            } catch (error: any) {
              Alert.alert('Erreur', error || 'Erreur lors de la mise à jour du statut');
            }
          },
        },
      ]
    );
  }, [dispatch, projetActif?.id, canUpdate]);


  const getParentLabel = useCallback((id?: string | null) => {
    if (!id) {
      return 'Inconnu';
    }
    if (!Array.isArray(allAnimaux)) {
      return 'Inconnu';
    }
    const parent = allAnimaux.find((a) => a.id === id);
    if (!parent) {
      return 'Inconnu';
    }
    return `${parent.code}${parent.nom ? ` (${parent.nom})` : ''}`;
  }, [allAnimaux]);

  const renderAnimal = useCallback(({ item }: { item: ProductionAnimal }) => {
    const age = calculerAge(item.date_naissance);
    const statutColor = getStatutColor(item.statut, colors);

    return (
      <Card elevation="small" padding="medium" style={styles.animalCard}>
        <View style={styles.animalHeader}>
          {item.photo_uri ? (
            <Image 
              source={{ uri: item.photo_uri }} 
              style={styles.animalPhoto}
            />
          ) : (
            <View style={[styles.animalPhoto, styles.animalPhotoPlaceholder, { backgroundColor: colors.primaryLight + '15', borderColor: colors.primary + '30' }]}>
              <Text style={{ fontSize: 40 }}>🐷</Text>
            </View>
          )}
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
            {item.reproducteur && (
              <View style={[styles.reproducteurBadge, { backgroundColor: colors.success + '18' }]}>
                <Text style={[styles.reproducteurText, { color: colors.success }]}>Reproducteur</Text>
              </View>
            )}
          </View>
          <View style={styles.animalActions}>
            {canUpdate('reproduction') && (
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
            )}
            {canDelete('reproduction') && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                onPress={() => handleDelete(item)}
              >
                <Text style={[styles.actionButtonText, { color: colors.error }]}>Supprimer</Text>
              </TouchableOpacity>
            )}
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
          {age ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Âge:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{age}</Text>
            </View>
          ) : null}
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
          {item.race && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Race:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{item.race}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Père:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{getParentLabel(item.pere_id)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Mère:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{getParentLabel(item.mere_id)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Poids à l'arrivée:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.poids_initial ? `${item.poids_initial.toFixed(1)} kg` : 'Non renseigné'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Sexe:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.sexe === 'male' ? 'Mâle' : item.sexe === 'femelle' ? 'Femelle' : 'Indéterminé'}
            </Text>
          </View>
        </View>

        {/* Historique sanitaire */}
        {(() => {
          const vaccinationsAnimal = (vaccinations || []).filter(
            v => v.animal_ids?.includes(item.id)
          ).sort((a, b) => new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime());
          
          const maladiesAnimal = (maladies || []).filter(
            m => m.animal_id === item.id
          ).sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());
          
          const traitementsAnimal = (traitements || []).filter(
            t => t.animal_id === item.id
          ).sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());
          
          const totalHistorique = vaccinationsAnimal.length + maladiesAnimal.length + traitementsAnimal.length;
          
          if (totalHistorique === 0) return null;
          
          const isExpanded = expandedHistorique === item.id;
          
          return (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.historiqueContainer}>
                <TouchableOpacity
                  style={styles.historiqueHeader}
                  onPress={() => setExpandedHistorique(isExpanded ? null : item.id)}
                >
                  <View style={styles.historiqueHeaderLeft}>
                    <Ionicons name="medkit" size={18} color={colors.primary} />
                    <Text style={[styles.historiqueTitle, { color: colors.text }]}>
                      Historique sanitaire
                    </Text>
                    <View style={[styles.historiqueBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.historiqueBadgeText, { color: colors.primary }]}>
                        {totalHistorique}
                      </Text>
                    </View>
                  </View>
                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.historiqueContent}>
                    {/* Vaccinations */}
                    {vaccinationsAnimal.length > 0 && (
                      <View style={styles.historiqueSection}>
                        <Text style={[styles.historiqueSectionTitle, { color: colors.success }]}>
                          💉 Vaccinations ({vaccinationsAnimal.length})
                        </Text>
                        {vaccinationsAnimal.slice(0, 5).map((v, index) => (
                          <View key={v.id} style={[styles.historiqueItem, { backgroundColor: colors.success + '08', borderLeftColor: colors.success }]}>
                            <Text style={[styles.historiqueItemDate, { color: colors.textSecondary }]}>
                              {format(parseISO(v.date_vaccination), 'dd MMM yyyy', { locale: fr })}
                            </Text>
                            <Text style={[styles.historiqueItemTitle, { color: colors.text }]}>
                              {v.produit_administre}
                            </Text>
                            <Text style={[styles.historiqueItemDetail, { color: colors.textSecondary }]}>
                              Dosage: {v.dosage} {v.unite_dosage || ''}
                            </Text>
                          </View>
                        ))}
                        {vaccinationsAnimal.length > 5 && (
                          <Text style={[styles.historiqueMore, { color: colors.textSecondary }]}>
                            +{vaccinationsAnimal.length - 5} vaccination(s) supplémentaire(s)
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Maladies */}
                    {maladiesAnimal.length > 0 && (
                      <View style={styles.historiqueSection}>
                        <Text style={[styles.historiqueSectionTitle, { color: colors.warning }]}>
                          🏥 Maladies ({maladiesAnimal.length})
                        </Text>
                        {maladiesAnimal.slice(0, 5).map((m, index) => (
                          <View key={m.id} style={[styles.historiqueItem, { backgroundColor: colors.warning + '08', borderLeftColor: colors.warning }]}>
                            <Text style={[styles.historiqueItemDate, { color: colors.textSecondary }]}>
                              {format(parseISO(m.date_debut), 'dd MMM yyyy', { locale: fr })}
                              {m.gueri && m.date_fin && ` → ${format(parseISO(m.date_fin), 'dd MMM yyyy', { locale: fr })}`}
                            </Text>
                            <Text style={[styles.historiqueItemTitle, { color: colors.text }]}>
                              {m.nom_maladie}
                            </Text>
                            {m.symptomes && (
                              <Text style={[styles.historiqueItemDetail, { color: colors.textSecondary }]} numberOfLines={2}>
                                {m.symptomes}
                              </Text>
                            )}
                            <View style={[styles.graviteBadge, { 
                              backgroundColor: m.gravite === 'critique' ? colors.error + '15' :
                                              m.gravite === 'grave' ? colors.warning + '15' :
                                              colors.info + '15' 
                            }]}>
                              <Text style={[styles.graviteBadgeText, { 
                                color: m.gravite === 'critique' ? colors.error :
                                       m.gravite === 'grave' ? colors.warning :
                                       colors.info
                              }]}>
                                {m.gravite === 'critique' ? 'Critique' : m.gravite === 'grave' ? 'Grave' : m.gravite === 'moderee' ? 'Modérée' : 'Faible'}
                              </Text>
                            </View>
                          </View>
                        ))}
                        {maladiesAnimal.length > 5 && (
                          <Text style={[styles.historiqueMore, { color: colors.textSecondary }]}>
                            +{maladiesAnimal.length - 5} maladie(s) supplémentaire(s)
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Traitements */}
                    {traitementsAnimal.length > 0 && (
                      <View style={styles.historiqueSection}>
                        <Text style={[styles.historiqueSectionTitle, { color: colors.info }]}>
                          💊 Traitements ({traitementsAnimal.length})
                        </Text>
                        {traitementsAnimal.slice(0, 5).map((t, index) => (
                          <View key={t.id} style={[styles.historiqueItem, { backgroundColor: colors.info + '08', borderLeftColor: colors.info }]}>
                            <Text style={[styles.historiqueItemDate, { color: colors.textSecondary }]}>
                              {format(parseISO(t.date_debut), 'dd MMM yyyy', { locale: fr })}
                              {t.date_fin && ` → ${format(parseISO(t.date_fin), 'dd MMM yyyy', { locale: fr })}`}
                            </Text>
                            <Text style={[styles.historiqueItemTitle, { color: colors.text }]}>
                              {t.nom_medicament}
                            </Text>
                            <Text style={[styles.historiqueItemDetail, { color: colors.textSecondary }]}>
                              {t.dosage} • {t.voie_administration} • {t.frequence}
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
          );
        })()}

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
        {canUpdate('reproduction') && (
          <View style={styles.statutSelector}>
            <Text style={[styles.statutSelectorLabel, { color: colors.text }]}>Changer le statut:</Text>
            <View style={styles.statutButtons}>
              {/* Permettre de changer vers actif, autre, ou vers l'historique (mort, vendu, offert) */}
              {(['actif', 'autre', 'mort', 'vendu', 'offert'] as StatutAnimal[]).map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[
                    styles.statutButton,
                    {
                      backgroundColor: item.statut === statut ? getStatutColor(statut, colors) : colors.background,
                      borderColor: getStatutColor(statut, colors),
                    },
                  ]}
                  onPress={() => handleChangeStatut(item, statut)}
                >
                  <Text
                    style={[
                      styles.statutButtonText,
                      {
                        color: item.statut === statut ? colors.textOnPrimary : getStatutColor(statut, colors),
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
  }, [colors, canUpdate, canDelete, handleDelete, handleChangeStatut, getParentLabel]);

  const ListHeader = () => {
    // Compter les animaux dans l'historique
    const animauxHistorique = allAnimaux.filter((a) => ['vendu', 'offert', 'mort'].includes(a.statut));
    
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Cheptel</Text>
          <View style={styles.headerButtons}>
            {animauxHistorique.length > 0 && (
              <TouchableOpacity
                style={[styles.historiqueButton, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]}
                onPress={() => navigation.navigate('Historique')}
              >
                <Text style={[styles.historiqueButtonText, { color: colors.secondary }]}>
                  Historique ({animauxHistorique.length})
                </Text>
              </TouchableOpacity>
            )}
            {canCreate('reproduction') && (
              <Button
                title="+ Animal"
                onPress={() => {
                  setSelectedAnimal(null);
                  setIsEditing(false);
                  setShowAnimalModal(true);
                }}
                size="small"
              />
            )}
          </View>
        </View>
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          {animauxFiltres.length} animal{animauxFiltres.length > 1 ? 'aux' : ''} actif{animauxFiltres.length > 1 ? 's' : ''}
        </Text>
        {filterCategorie === 'tous' && (
          <View style={styles.summaryDetails}>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {countByCategory.truies} truie{countByCategory.truies > 1 ? 's' : ''} • {' '}
              {countByCategory.verrats} verrat{countByCategory.verrats > 1 ? 's' : ''} • {' '}
              {countByCategory.porcelets} porcelet{countByCategory.porcelets > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
      
      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher par numéro ou nom..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres par catégorie */}
      <View style={styles.filters}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Filtrer par catégorie:</Text>
        <View style={styles.filterButtons}>
          {(['tous', 'truie', 'verrat', 'porcelet'] as const).map((categorie) => (
            <TouchableOpacity
              key={categorie}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterCategorie === categorie ? colors.primary : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setFilterCategorie(categorie)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: filterCategorie === categorie ? colors.textOnPrimary : colors.text,
                  },
                ]}
              >
                {categorie === 'tous' ? 'Tous' : categorie === 'truie' ? 'Truies' : categorie === 'verrat' ? 'Verrats' : 'Porcelets'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </View>
    );
  };

  // Afficher le spinner uniquement lors du premier chargement (pas à chaque re-render)
  if (loading && (!Array.isArray(allAnimaux) || allAnimaux.length === 0)) {
    return <LoadingSpinner message="Chargement du cheptel..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={animauxFiltres}
        renderItem={renderAnimal}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          searchQuery.trim() ? (
            <EmptyState
              title="Aucun animal trouvé"
              message={`Aucun animal ne correspond à "${searchQuery}"`}
              action={
                <Button
                  title="Effacer la recherche"
                  onPress={() => setSearchQuery('')}
                  variant="secondary"
                />
              }
            />
          ) : (
            <EmptyState
              title="Aucun animal dans le cheptel"
              message="Ajoutez des animaux pour commencer à gérer votre cheptel"
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
          )
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
          onSuccess={async () => {
            setShowAnimalModal(false);
            setIsEditing(false);
            setSelectedAnimal(null);
            // Recharger en arrière-plan sans bloquer l'interface
            if (projetActif) {
              // Utiliser setTimeout pour différer le chargement et ne pas bloquer
              setTimeout(() => {
                dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
              }, 100);
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
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  historiqueButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  historiqueButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  summary: {
    flexDirection: 'column',
    marginBottom: SPACING.md,
  },
  summaryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  summaryDetails: {
    marginTop: SPACING.xs,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: FONT_SIZES.lg,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
  },
  clearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  animalCard: {
    marginBottom: SPACING.md,
  },
  animalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  animalPhoto: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    resizeMode: 'cover',
  },
  animalPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
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
  reproducteurBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  reproducteurText: {
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
  historiqueContainer: {
    marginTop: SPACING.sm,
  },
  historiqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
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
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  historiqueBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
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
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  historiqueItem: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    gap: 4,
  },
  historiqueItemDate: {
    fontSize: FONT_SIZES.xs,
  },
  historiqueItemTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  historiqueItemDetail: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
  graviteBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    marginTop: 4,
  },
  graviteBadgeText: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
  },
  historiqueMore: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});

