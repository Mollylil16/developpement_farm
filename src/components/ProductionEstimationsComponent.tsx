/**
 * Composant pour les estimations de poids et dates
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadProductionAnimaux, loadPeseesParAnimal } from '../store/slices/productionSlice';
import { selectAllAnimaux, selectPeseesParAnimal } from '../store/selectors/productionSelectors';
import type { ProductionAnimal, ProductionPesee } from '../types/production';
import { getStandardGMQ } from '../types/production';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import FormField from './FormField';
import { format, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { useModeElevage } from '../hooks/useModeElevage';
import apiClient from '../services/api/apiClient';
import { Batch } from '../types/batch';
import { useProjetEffectif } from '../hooks/useProjetEffectif';

type EstimationMode = 'date' | 'animaux';

function ProductionEstimationsComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const animaux = useAppSelector(selectAllAnimaux);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const loading = useAppSelector((state) => state.production.loading);
  
  // Détecter le mode d'élevage
  const modeElevage = useModeElevage();
  const isBatchMode = modeElevage === 'bande';

  const [mode, setMode] = useState<EstimationMode>('date');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [poidsCible, setPoidsCible] = useState<string>('');
  const [dateCible, setDateCible] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // État pour le mode bande
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchWeighingsMap, setBatchWeighingsMap] = useState<Map<string, any[]>>(new Map());
  const [batchesLoading, setBatchesLoading] = useState(false);

  // Charger les loges et leurs pesées en mode bande
  const loadBatchesData = useCallback(async () => {
    if (!projetActif?.id || !isBatchMode) return;
    
    setBatchesLoading(true);
    try {
      const batchData = await apiClient.get<Batch[]>(`/batch-pigs/projet/${projetActif.id}`);
      setBatches(batchData || []);
      
      // Charger les pesées pour chaque loge
      const weighingsMap = new Map<string, any[]>();
      await Promise.all(
        (batchData || []).map(async (batch) => {
          try {
            const weighings = await apiClient.get(`/batch-weighings/batch/${batch.id}/history`);
            weighingsMap.set(batch.id, weighings || []);
          } catch {
            weighingsMap.set(batch.id, []);
          }
        })
      );
      setBatchWeighingsMap(weighingsMap);
    } catch (error) {
      console.error('Erreur chargement loges:', error);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }, [projetActif?.id, isBatchMode]);

  // Charger les données selon le mode
  useFocusEffect(
    useCallback(() => {
      if (isBatchMode) {
        loadBatchesData();
      } else if (projetActif) {
        dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
      }
    }, [dispatch, projetActif?.id, isBatchMode, loadBatchesData])
  );

  // Charger les pesées pour tous les animaux actifs (mode individuel uniquement)
  const animauxChargesRef = useRef<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (!isBatchMode && projetActif && animaux.length > 0) {
        const animauxSansPesees = animaux.filter(
          (a) =>
            a.statut?.toLowerCase() === 'actif' &&
            !peseesParAnimal[a.id] &&
            !animauxChargesRef.current.has(a.id)
        );
        animauxSansPesees.slice(0, 10).forEach((animal) => {
          animauxChargesRef.current.add(animal.id);
          dispatch(loadPeseesParAnimal(animal.id));
        });
      }
    }, [dispatch, projetActif?.id, animaux.length, isBatchMode])
  );

  // Calculer les stats pour chaque animal (mode individuel)
  const animauxAvecStats = useMemo(() => {
    if (isBatchMode) return [];
    
    return animaux
      .filter((a) => a.statut?.toLowerCase() === 'actif')
      .map((animal) => {
        const pesees = peseesParAnimal[animal.id] || [];
        if (pesees.length === 0) return null;

        // Les pesées sont triées par date ASC, donc la dernière est à la fin
        const dernierePesee = pesees[pesees.length - 1];

        // Utiliser le GMQ de la dernière pesée (calculé automatiquement)
        // Si pas de GMQ (première pesée), calculer le GMQ moyen de toutes les pesées
        let gmq = dernierePesee.gmq || 0;

        // Si le GMQ est 0 et qu'il y a plus d'une pesée, calculer le GMQ moyen
        if (gmq === 0 && pesees.length >= 2) {
          const premiere = pesees[0];
          const derniere = pesees[pesees.length - 1];
          const gainTotal = derniere.poids_kg - premiere.poids_kg;
          const dateInitiale = new Date(premiere.date);
          const dateFinale = new Date(derniere.date);
          const joursTotal = Math.max(
            1,
            Math.ceil((dateFinale.getTime() - dateInitiale.getTime()) / (1000 * 60 * 60 * 24))
          );
          gmq = Math.round((gainTotal * 1000) / joursTotal);
        }

        const poidsActuel = dernierePesee.poids_kg;
        const dateActuelle = new Date(dernierePesee.date);

        return {
          animal,
          dernierePesee,
          poidsActuel,
          dateActuelle,
          gmq,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [animaux, peseesParAnimal, isBatchMode]);

  // Calculer les stats pour chaque loge (mode bande)
  const logesAvecStats = useMemo(() => {
    if (!isBatchMode) return [];
    
    return batches
      .map((batch) => {
        const pesees = batchWeighingsMap.get(batch.id) || [];
        if (pesees.length === 0) return null;

        // Trier par date
        const sortedPesees = [...pesees].sort((a, b) => 
          new Date(a.weighing_date || a.date).getTime() - new Date(b.weighing_date || b.date).getTime()
        );

        const dernierePesee = sortedPesees[sortedPesees.length - 1];
        const poidsActuel = dernierePesee.average_weight_kg || dernierePesee.poids_kg || 0;
        const dateActuelle = new Date(dernierePesee.weighing_date || dernierePesee.date);

        // Calculer le GMQ
        let gmq = batch.avg_daily_gain || 0;
        
        if (gmq === 0 && sortedPesees.length >= 2) {
          const premiere = sortedPesees[0];
          const derniere = sortedPesees[sortedPesees.length - 1];
          const poidsInitial = premiere.average_weight_kg || premiere.poids_kg || 0;
          const poidsFinal = derniere.average_weight_kg || derniere.poids_kg || 0;
          const gainTotal = poidsFinal - poidsInitial;
          const dateInitiale = new Date(premiere.weighing_date || premiere.date);
          const dateFinale = new Date(derniere.weighing_date || derniere.date);
          const joursTotal = Math.max(
            1,
            Math.ceil((dateFinale.getTime() - dateInitiale.getTime()) / (1000 * 60 * 60 * 24))
          );
          gmq = Math.round((gainTotal * 1000) / joursTotal);
        }

        return {
          batch,
          dernierePesee,
          poidsActuel,
          dateActuelle,
          gmq,
          totalCount: batch.total_count || 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [batches, batchWeighingsMap, isBatchMode]);

  // Estimation 1: Quand un animal/loge atteint un poids cible
  const estimationDate = useMemo(() => {
    if (isBatchMode) {
      // Mode bande : estimation pour une loge
      if (!selectedBatchId || !poidsCible) return null;

      const logeStats = logesAvecStats.find((s) => s.batch.id === selectedBatchId);
      if (!logeStats || logeStats.gmq <= 0) return null;

      const poidsCibleNum = parseFloat(poidsCible);
      if (isNaN(poidsCibleNum) || poidsCibleNum <= logeStats.poidsActuel) {
        return null;
      }

      const differencePoids = poidsCibleNum - logeStats.poidsActuel;
      const joursNecessaires = Math.ceil((differencePoids * 1000) / logeStats.gmq);
      const dateEstimee = addDays(logeStats.dateActuelle, joursNecessaires);

      const standard = getStandardGMQ(poidsCibleNum);
      const gmqCible = standard?.gmq_cible || 0;
      const ecart = logeStats.gmq - gmqCible;

      return {
        batch: logeStats.batch,
        poidsActuel: logeStats.poidsActuel,
        poidsCible: poidsCibleNum,
        dateEstimee,
        joursNecessaires,
        gmq: logeStats.gmq,
        gmqCible,
        ecart,
        totalCount: logeStats.totalCount,
        statut: ecart > 0 ? 'en_avance' : ecart < -50 ? 'en_retard' : 'normal',
      };
    } else {
      // Mode individuel
      if (!selectedAnimalId || !poidsCible) return null;

      const animalStats = animauxAvecStats.find((s) => s.animal.id === selectedAnimalId);
      if (!animalStats || animalStats.gmq <= 0) return null;

      const poidsCibleNum = parseFloat(poidsCible);
      if (isNaN(poidsCibleNum) || poidsCibleNum <= animalStats.poidsActuel) {
        return null;
      }

      const differencePoids = poidsCibleNum - animalStats.poidsActuel;
      const joursNecessaires = Math.ceil((differencePoids * 1000) / animalStats.gmq);
      const dateEstimee = addDays(animalStats.dateActuelle, joursNecessaires);

      const standard = getStandardGMQ(poidsCibleNum);
      const gmqCible = standard?.gmq_cible || 0;
      const ecart = animalStats.gmq - gmqCible;

      return {
        animal: animalStats.animal,
        poidsActuel: animalStats.poidsActuel,
        poidsCible: poidsCibleNum,
        dateEstimee,
        joursNecessaires,
        gmq: animalStats.gmq,
        gmqCible,
        ecart,
        statut: ecart > 0 ? 'en_avance' : ecart < -50 ? 'en_retard' : 'normal',
      };
    }
  }, [selectedAnimalId, selectedBatchId, poidsCible, animauxAvecStats, logesAvecStats, isBatchMode]);

  // Estimation 2: Quels animaux/loges atteignent un poids à une date donnée
  const animauxAtteignantPoids = useMemo(() => {
    if (!poidsCible || !dateCible) return [];

    const poidsCibleNum = parseFloat(poidsCible);
    if (isNaN(poidsCibleNum)) return [];

    const dateCibleObj = new Date(dateCible);

    if (isBatchMode) {
      // Mode bande
      return logesAvecStats
        .map((stats) => {
          if (stats.gmq <= 0) return null;

          const joursRestants = differenceInDays(dateCibleObj, stats.dateActuelle);
          if (joursRestants <= 0) return null;

          const gainEstime = (stats.gmq * joursRestants) / 1000;
          const poidsEstime = stats.poidsActuel + gainEstime;
          const ecart = poidsEstime - poidsCibleNum;

          const standard = getStandardGMQ(poidsEstime);
          const gmqCible = standard?.gmq_cible || 0;
          const ecartGmq = stats.gmq - gmqCible;

          return {
            batch: stats.batch,
            poidsActuel: stats.poidsActuel,
            poidsEstime,
            poidsCible: poidsCibleNum,
            ecart,
            joursRestants,
            gmq: stats.gmq,
            gmqCible,
            ecartGmq,
            totalCount: stats.totalCount,
            statut: Math.abs(ecart) < 2 ? 'atteint' : ecart > 0 ? 'depasse' : 'insuffisant',
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => Math.abs(a.ecart) - Math.abs(b.ecart));
    } else {
      // Mode individuel
      return animauxAvecStats
        .map((stats) => {
          if (stats.gmq <= 0) return null;

          const joursRestants = differenceInDays(dateCibleObj, stats.dateActuelle);
          if (joursRestants <= 0) return null;

          const gainEstime = (stats.gmq * joursRestants) / 1000;
          const poidsEstime = stats.poidsActuel + gainEstime;
          const ecart = poidsEstime - poidsCibleNum;

          const standard = getStandardGMQ(poidsEstime);
          const gmqCible = standard?.gmq_cible || 0;
          const ecartGmq = stats.gmq - gmqCible;

          return {
            animal: stats.animal,
            poidsActuel: stats.poidsActuel,
            poidsEstime,
            poidsCible: poidsCibleNum,
            ecart,
            joursRestants,
            gmq: stats.gmq,
            gmqCible,
            ecartGmq,
            statut: Math.abs(ecart) < 2 ? 'atteint' : ecart > 0 ? 'depasse' : 'insuffisant',
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => Math.abs(a.ecart) - Math.abs(b.ecart));
    }
  }, [poidsCible, dateCible, animauxAvecStats, logesAvecStats, isBatchMode]);

  if (!projetActif) {
    return (
      <EmptyState
        title="Aucun projet actif"
        message="Créez ou sélectionnez un projet pour utiliser les estimations."
      />
    );
  }

  // Loading state
  const isLoading = isBatchMode ? batchesLoading : (loading && animaux.length === 0);
  
  if (isLoading) {
    return <LoadingSpinner message={isBatchMode ? "Chargement des loges..." : "Chargement des animaux..."} />;
  }

  // Vérifier si des animaux/loges ont des pesées
  const animauxAvecPesees = animaux.filter((a) => {
    const pesees = peseesParAnimal[a.id] || [];
    return pesees.length > 0;
  });
  
  const logesAvecPesees = batches.filter((b) => {
    const pesees = batchWeighingsMap.get(b.id) || [];
    return pesees.length > 0;
  });
  
  // Données à utiliser selon le mode
  const hasDataWithWeighings = isBatchMode ? logesAvecStats.length > 0 : animauxAvecStats.length > 0;
  const dataCount = isBatchMode ? batches.length : animaux.length;
  const dataWithWeighingsCount = isBatchMode ? logesAvecPesees.length : animauxAvecPesees.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Message d'information */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            ℹ️ Comment utiliser les estimations
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {mode === 'date'
              ? isBatchMode 
                ? "Sélectionnez une loge et entrez un poids cible. Le système calculera la date à laquelle la loge atteindra ce poids moyen."
                : "Sélectionnez un animal et entrez un poids cible. Le système calculera la date à laquelle l'animal atteindra ce poids."
              : isBatchMode
                ? 'Entrez un poids cible et une date. Le système trouvera toutes les loges qui atteindront ce poids moyen à cette date.'
                : 'Entrez un poids cible et une date. Le système trouvera tous les animaux qui atteindront ce poids à cette date.'}
          </Text>
          <Text style={[styles.infoNote, { color: colors.textSecondary }]}>
            ⚠️ Les estimations nécessitent au moins une pesée par {isBatchMode ? 'loge' : 'animal'}.
          </Text>
        </View>

        {/* Sélecteur de mode */}
        <View
          style={[styles.modeSelector, { backgroundColor: colors.surface, ...colors.shadow.small }]}
        >
          <TouchableOpacity
            style={[
              styles.modeButton,
              {
                backgroundColor: mode === 'date' ? colors.primary : 'transparent',
              },
            ]}
            onPress={() => {
              setMode('date');
              setSelectedAnimalId('');
              setPoidsCible('');
            }}
          >
            <Text
              style={[
                styles.modeButtonText,
                {
                  color: mode === 'date' ? colors.textOnPrimary : colors.textSecondary,
                  fontWeight: mode === 'date' ? '600' : 'normal',
                },
              ]}
            >
              📅 Date cible
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              {
                backgroundColor: mode === 'animaux' ? colors.primary : 'transparent',
              },
            ]}
            onPress={() => {
              setMode('animaux');
              setPoidsCible('');
              setDateCible(format(new Date(), 'yyyy-MM-dd'));
            }}
          >
            <Text
              style={[
                styles.modeButtonText,
                {
                  color: mode === 'animaux' ? colors.textOnPrimary : colors.textSecondary,
                  fontWeight: mode === 'animaux' ? '600' : 'normal',
                },
              ]}
            >
              🐷 Animaux cibles
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mode 1: Estimation de date pour un animal/loge */}
        {mode === 'date' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isBatchMode 
                ? 'Quand cette loge atteindra-t-elle un poids cible ?' 
                : 'Quand cet animal atteindra-t-il un poids cible ?'}
            </Text>

            <View
              style={[
                styles.formContainer,
                { backgroundColor: colors.surface, ...colors.shadow.small },
              ]}
            >
              {!hasDataWithWeighings ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                    {isBatchMode ? 'Aucune loge avec pesées disponible' : 'Aucun animal avec pesées disponible'}
                  </Text>
                  <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>
                    Pour utiliser les estimations, vous devez d'abord enregistrer au moins une pesée
                    pour vos {isBatchMode ? 'loges' : 'animaux'}.{'\n\n'}
                    Allez dans l'onglet "Suivi des pesées" pour ajouter des pesées.
                  </Text>
                  {dataCount > 0 && (
                    <Text style={[styles.emptyStateStats, { color: colors.textSecondary }]}>
                      {dataCount} {isBatchMode ? 'loge(s)' : 'animal(s)'} enregistré(s), {dataWithWeighingsCount} avec pesées
                    </Text>
                  )}
                </View>
              ) : isBatchMode ? (
                /* Mode Bande - Sélection de loge */
                <>
                  <View style={styles.selectContainer}>
                    <Text style={[styles.label, { color: colors.text }]}>Loge *</Text>
                    <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                      {logesAvecStats.length} loge(s) disponible(s) avec pesées
                    </Text>
                    <ScrollView
                      style={[
                        styles.animalSelect,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                    >
                      {logesAvecStats.map((stats) => (
                        <TouchableOpacity
                          key={stats.batch.id}
                          style={[
                            styles.animalOption,
                            {
                              backgroundColor:
                                selectedBatchId === stats.batch.id
                                  ? colors.primary + '15'
                                  : 'transparent',
                              borderBottomColor: colors.border,
                            },
                          ]}
                          onPress={() => setSelectedBatchId(stats.batch.id)}
                        >
                          <Text
                            style={[
                              styles.animalOptionText,
                              {
                                color:
                                  selectedBatchId === stats.batch.id
                                    ? colors.primary
                                    : colors.text,
                                fontWeight: selectedBatchId === stats.batch.id ? '600' : 'normal',
                              },
                            ]}
                          >
                            🏠 {stats.batch.pen_name} - {stats.totalCount} porc(s)
                            {' - '}
                            {stats.poidsActuel.toFixed(1)} kg (GMQ: {stats.gmq.toFixed(0)} g/j)
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              ) : (
                /* Mode Individuel - Sélection d'animal */
                <>
                  <View style={styles.selectContainer}>
                    <Text style={[styles.label, { color: colors.text }]}>Animal *</Text>
                    <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                      {animauxAvecStats.length} animal(s) disponible(s) avec pesées
                    </Text>
                    <ScrollView
                      style={[
                        styles.animalSelect,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                    >
                      {animauxAvecStats.map((stats) => (
                        <TouchableOpacity
                          key={stats.animal.id}
                          style={[
                            styles.animalOption,
                            {
                              backgroundColor:
                                selectedAnimalId === stats.animal.id
                                  ? colors.primary + '15'
                                  : 'transparent',
                              borderBottomColor: colors.border,
                            },
                          ]}
                          onPress={() => setSelectedAnimalId(stats.animal.id)}
                        >
                          <Text
                            style={[
                              styles.animalOptionText,
                              {
                                color:
                                  selectedAnimalId === stats.animal.id
                                    ? colors.primary
                                    : colors.text,
                                fontWeight: selectedAnimalId === stats.animal.id ? '600' : 'normal',
                              },
                            ]}
                          >
                            {stats.animal.code}
                            {stats.animal.nom && ` - ${stats.animal.nom}`}
                            {' - '}
                            {stats.poidsActuel.toFixed(1)} kg (GMQ: {stats.gmq.toFixed(0)} g/j)
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              {hasDataWithWeighings && (
                <>
                  <FormField
                    label="Poids cible (kg) *"
                    value={poidsCible}
                    onChangeText={setPoidsCible}
                    keyboardType="numeric"
                    placeholder="Ex: 100"
                  />

                  {isBatchMode ? (
                    /* Validations mode bande */
                    <>
                      {!selectedBatchId && (
                        <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
                          <Text style={[styles.warningText, { color: colors.warning }]}>
                            ⚠️ Veuillez sélectionner une loge ci-dessus
                          </Text>
                        </View>
                      )}

                      {selectedBatchId && !poidsCible && (
                        <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
                          <Text style={[styles.warningText, { color: colors.warning }]}>
                            ⚠️ Veuillez entrer un poids cible
                          </Text>
                        </View>
                      )}

                      {selectedBatchId &&
                        poidsCible &&
                        (() => {
                          const logeStats = logesAvecStats.find(
                            (s) => s.batch.id === selectedBatchId
                          );
                          const poidsCibleNum = parseFloat(poidsCible);
                          if (
                            logeStats &&
                            !isNaN(poidsCibleNum) &&
                            poidsCibleNum <= logeStats.poidsActuel
                          ) {
                            return (
                              <View
                                style={[styles.warningBox, { backgroundColor: colors.error + '15' }]}
                              >
                                <Text style={[styles.warningText, { color: colors.error }]}>
                                  ⚠️ Le poids cible doit être supérieur au poids actuel (
                                  {logeStats.poidsActuel.toFixed(1)} kg)
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                    </>
                  ) : (
                    /* Validations mode individuel */
                    <>
                      {!selectedAnimalId && (
                        <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
                          <Text style={[styles.warningText, { color: colors.warning }]}>
                            ⚠️ Veuillez sélectionner un animal ci-dessus
                          </Text>
                        </View>
                      )}

                      {selectedAnimalId && !poidsCible && (
                        <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
                          <Text style={[styles.warningText, { color: colors.warning }]}>
                            ⚠️ Veuillez entrer un poids cible
                          </Text>
                        </View>
                      )}

                      {selectedAnimalId &&
                        poidsCible &&
                        (() => {
                          const animalStats = animauxAvecStats.find(
                            (s) => s.animal.id === selectedAnimalId
                          );
                          const poidsCibleNum = parseFloat(poidsCible);
                          if (
                            animalStats &&
                            !isNaN(poidsCibleNum) &&
                            poidsCibleNum <= animalStats.poidsActuel
                          ) {
                            return (
                              <View
                                style={[styles.warningBox, { backgroundColor: colors.error + '15' }]}
                              >
                                <Text style={[styles.warningText, { color: colors.error }]}>
                                  ⚠️ Le poids cible doit être supérieur au poids actuel (
                                  {animalStats.poidsActuel.toFixed(1)} kg)
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                    </>
                  )}
                </>
              )}

              {estimationDate && (
                <View
                  style={[
                    styles.resultCard,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.primary + '30' },
                  ]}
                >
                  <Text style={[styles.resultTitle, { color: colors.text }]}>
                    📊 Résultat de l'estimation
                  </Text>
                  {isBatchMode && 'batch' in estimationDate && (
                    <Text style={[styles.resultSubtitle, { color: colors.primary }]}>
                      🏠 {estimationDate.batch.pen_name} - {estimationDate.totalCount} porc(s)
                    </Text>
                  )}
                  <View style={styles.resultContent}>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                        Date estimée:
                      </Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {format(estimationDate.dateEstimee, 'dd MMMM yyyy', { locale: fr })}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                        Jours nécessaires:
                      </Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {estimationDate.joursNecessaires} jours
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                        Poids actuel:
                      </Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {estimationDate.poidsActuel.toFixed(1)} kg
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                        Poids cible:
                      </Text>
                      <Text style={[styles.resultValue, { color: colors.success }]}>
                        {estimationDate.poidsCible.toFixed(1)} kg
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                        GMQ actuel:
                      </Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {estimationDate.gmq.toFixed(0)} g/j
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                        GMQ cible (standard):
                      </Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {estimationDate.gmqCible.toFixed(0)} g/j
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                        Écart:
                      </Text>
                      <Text
                        style={[
                          styles.resultValue,
                          {
                            color: estimationDate.ecart > 0 ? colors.success : colors.error,
                          },
                        ]}
                      >
                        {estimationDate.ecart > 0 ? '+' : ''}
                        {estimationDate.ecart.toFixed(0)} g/j
                      </Text>
                    </View>
                    <View style={[styles.statutBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.statutText, { color: colors.text }]}>
                        {estimationDate.statut === 'en_avance'
                          ? '✅ En avance sur le standard'
                          : estimationDate.statut === 'en_retard'
                            ? '⚠️ En retard sur le standard'
                            : '✓ Dans les normes'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Mode 2: Animaux/Loges qui atteignent un poids à une date */}
        {mode === 'animaux' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isBatchMode 
                ? 'Quelles loges atteindront un poids cible à une date donnée ?'
                : 'Quels animaux atteindront un poids cible à une date donnée ?'}
            </Text>

            <View
              style={[
                styles.formContainer,
                { backgroundColor: colors.surface, ...colors.shadow.small },
              ]}
            >
              {!hasDataWithWeighings ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                    {isBatchMode ? 'Aucune loge avec pesées disponible' : 'Aucun animal avec pesées disponible'}
                  </Text>
                  <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>
                    Pour utiliser les estimations, vous devez d'abord enregistrer au moins une pesée
                    pour vos {isBatchMode ? 'loges' : 'animaux'}.{'\n\n'}
                    Allez dans l'onglet "Suivi des pesées" pour ajouter des pesées.
                  </Text>
                  {dataCount > 0 && (
                    <Text style={[styles.emptyStateStats, { color: colors.textSecondary }]}>
                      {dataCount} {isBatchMode ? 'loge(s)' : 'animal(s)'} enregistré(s), {dataWithWeighingsCount} avec pesées
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <FormField
                    label="Poids cible (kg) *"
                    value={poidsCible}
                    onChangeText={setPoidsCible}
                    keyboardType="numeric"
                    placeholder="Ex: 100"
                  />
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Date cible *</Text>
                    <TouchableOpacity
                      style={[
                        styles.dateButton,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.dateButtonText, { color: colors.text }]}>
                        {dateCible
                          ? new Date(dateCible).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : 'Sélectionner une date'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={dateCible ? new Date(dateCible) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate && event.type !== 'dismissed') {
                            setDateCible(format(selectedDate, 'yyyy-MM-dd'));
                          }
                        }}
                      />
                    )}
                  </View>

                  {(!poidsCible || !dateCible) && (
                    <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
                      <Text style={[styles.warningText, { color: colors.warning }]}>
                        ⚠️ Veuillez remplir le poids cible et la date cible
                      </Text>
                    </View>
                  )}

                  {poidsCible && dateCible && animauxAtteignantPoids.length === 0 && (
                    <View
                      style={[styles.warningBox, { backgroundColor: colors.textSecondary + '15' }]}
                    >
                      <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                        ℹ️ {isBatchMode 
                          ? "Aucune loge n'atteindra ce poids à cette date avec les données actuelles"
                          : "Aucun animal n'atteindra ce poids à cette date avec les données actuelles"}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {animauxAtteignantPoids.length > 0 && (
                <View style={styles.resultsContainer}>
                  <Text style={[styles.resultsTitle, { color: colors.text }]}>
                    {animauxAtteignantPoids.length} {isBatchMode ? 'loge(s)' : 'animal(s)'} trouvé(s)
                  </Text>
                  {animauxAtteignantPoids.map((result) => (
                    <View
                      key={isBatchMode && 'batch' in result ? result.batch.id : 'animal' in result ? result.animal.id : ''}
                      style={[
                        styles.resultCard,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.primary + '30',
                        },
                      ]}
                    >
                      <View style={styles.resultHeader}>
                        <Text style={[styles.resultAnimalCode, { color: colors.text }]}>
                          {isBatchMode && 'batch' in result 
                            ? `🏠 ${result.batch.pen_name} (${result.totalCount} porcs)`
                            : 'animal' in result 
                              ? `${result.animal.code}${result.animal.nom ? ` - ${result.animal.nom}` : ''}`
                              : ''}
                        </Text>
                        <View
                          style={[
                            styles.statutBadge,
                            {
                              backgroundColor:
                                result.statut === 'atteint'
                                  ? colors.success + '20'
                                  : result.statut === 'depasse'
                                    ? colors.warning + '20'
                                    : colors.error + '20',
                            },
                          ]}
                        >
                          <Text style={[styles.statutText, { color: colors.text }]}>
                            {result.statut === 'atteint'
                              ? '✓ Atteint'
                              : result.statut === 'depasse'
                                ? '↑ Dépasse'
                                : '↓ Insuffisant'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.resultContent}>
                        <View style={styles.resultRow}>
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                            Poids actuel:
                          </Text>
                          <Text style={[styles.resultValue, { color: colors.text }]}>
                            {result.poidsActuel.toFixed(1)} kg
                          </Text>
                        </View>
                        <View style={styles.resultRow}>
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                            Poids estimé:
                          </Text>
                          <Text style={[styles.resultValue, { color: colors.text }]}>
                            {result.poidsEstime.toFixed(1)} kg
                          </Text>
                        </View>
                        <View style={styles.resultRow}>
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                            Écart:
                          </Text>
                          <Text
                            style={[
                              styles.resultValue,
                              {
                                color:
                                  Math.abs(result.ecart) < 2
                                    ? colors.primary
                                    : result.ecart > 0
                                      ? colors.success
                                      : colors.error,
                              },
                            ]}
                          >
                            {result.ecart > 0 ? '+' : ''}
                            {result.ecart.toFixed(1)} kg
                          </Text>
                        </View>
                        <View style={styles.resultRow}>
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                            Jours restants:
                          </Text>
                          <Text style={[styles.resultValue, { color: colors.text }]}>
                            {result.joursRestants} jours
                          </Text>
                        </View>
                        <View style={styles.resultRow}>
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                            GMQ:
                          </Text>
                          <Text style={[styles.resultValue, { color: colors.text }]}>
                            {result.gmq.toFixed(0)} g/j
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  modeSelector: {
    flexDirection: 'row',
    margin: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
  },
  modeButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  section: {
    padding: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  formContainer: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  selectContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  animalSelect: {
    maxHeight: 150,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
  },
  animalOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  animalOptionText: {
    fontSize: FONT_SIZES.sm,
  },
  resultCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  resultSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resultAnimalCode: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    flex: 1,
  },
  resultContent: {
    marginTop: SPACING.sm,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  resultLabel: {
    fontSize: FONT_SIZES.sm,
  },
  resultValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  statutBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
  },
  statutText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: SPACING.lg,
  },
  resultsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  infoBox: {
    margin: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  infoNote: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.sm,
  },
  formSection: {
    marginBottom: SPACING.md,
  },
  formSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  dateButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
  },
  emptyStateContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  emptyStateStats: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  warningBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(ProductionEstimationsComponent);
