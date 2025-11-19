/**
 * Composant pour les estimations de poids et dates
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadProductionAnimaux,
  loadPeseesParAnimal,
} from '../store/slices/productionSlice';
import { selectAllAnimaux, selectPeseesParAnimal } from '../store/selectors/productionSelectors';
import { ProductionAnimal, ProductionPesee, getStandardGMQ } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import FormField from './FormField';
import { format, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';

type EstimationMode = 'date' | 'animaux';

export default function ProductionEstimationsComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const animaux = useAppSelector(selectAllAnimaux);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const loading = useAppSelector((state) => state.production.loading);

  const [mode, setMode] = useState<EstimationMode>('date');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [poidsCible, setPoidsCible] = useState<string>('');
  const [dateCible, setDateCible] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Charger les animaux uniquement quand l'onglet est visible
  useFocusEffect(
    React.useCallback(() => {
      if (projetActif) {
        dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
      }
    }, [dispatch, projetActif?.id])
  );

  // Charger les pesées pour tous les animaux actifs (mais seulement quand l'onglet est visible)
  // On charge uniquement les pesées manquantes pour éviter les requêtes inutiles
  // Utiliser useRef pour éviter les boucles infinies
  const animauxChargesRef = useRef<Set<string>>(new Set());
  
  useFocusEffect(
    React.useCallback(() => {
      if (projetActif && animaux.length > 0) {
        // Charger les pesées uniquement pour les animaux qui n'ont pas encore leurs pesées chargées
        const animauxSansPesees = animaux.filter(
          (a) => a.statut?.toLowerCase() === 'actif' && !peseesParAnimal[a.id] && !animauxChargesRef.current.has(a.id)
        );
        // Limiter à 10 animaux à la fois pour éviter de surcharger
        animauxSansPesees.slice(0, 10).forEach((animal) => {
          animauxChargesRef.current.add(animal.id);
          dispatch(loadPeseesParAnimal(animal.id));
        });
      }
    }, [dispatch, projetActif?.id, animaux.length])
  );

  // Calculer les stats pour chaque animal
  const animauxAvecStats = useMemo(() => {
    return animaux
      .filter((a) => a.statut?.toLowerCase() === 'actif')
      .map((animal) => {
        const pesees = peseesParAnimal[animal.id] || [];
        const dernierePesee = pesees[0];
        if (!dernierePesee) return null;

        const gmq = dernierePesee.gmq || 0; // g/jour
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
  }, [animaux, peseesParAnimal]);

  // Estimation 1: Quand un animal atteint un poids cible
  const estimationDate = useMemo(() => {
    if (!selectedAnimalId || !poidsCible) return null;

    const animalStats = animauxAvecStats.find(
      (s) => s.animal.id === selectedAnimalId
    );
    if (!animalStats || animalStats.gmq <= 0) return null;

    const poidsCibleNum = parseFloat(poidsCible);
    if (isNaN(poidsCibleNum) || poidsCibleNum <= animalStats.poidsActuel) {
      return null;
    }

    const differencePoids = poidsCibleNum - animalStats.poidsActuel; // kg
    const joursNecessaires = Math.ceil((differencePoids * 1000) / animalStats.gmq); // jours
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
  }, [selectedAnimalId, poidsCible, animauxAvecStats]);

  // Estimation 2: Quels animaux atteignent un poids à une date donnée
  const animauxAtteignantPoids = useMemo(() => {
    if (!poidsCible || !dateCible) return [];

    const poidsCibleNum = parseFloat(poidsCible);
    if (isNaN(poidsCibleNum)) return [];

    const dateCibleObj = new Date(dateCible);
    const aujourdhui = new Date();

    return animauxAvecStats
      .map((stats) => {
        if (stats.gmq <= 0) return null;

        const joursRestants = differenceInDays(dateCibleObj, stats.dateActuelle);
        if (joursRestants <= 0) return null;

        const gainEstime = (stats.gmq * joursRestants) / 1000; // kg
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
          statut:
            Math.abs(ecart) < 2
              ? 'atteint'
              : ecart > 0
              ? 'depasse'
              : 'insuffisant',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => Math.abs(a.ecart) - Math.abs(b.ecart));
  }, [poidsCible, dateCible, animauxAvecStats]);

  if (!projetActif) {
    return (
      <EmptyState
        title="Aucun projet actif"
        message="Créez ou sélectionnez un projet pour utiliser les estimations."
      />
    );
  }

  if (loading && animaux.length === 0) {
    return <LoadingSpinner message="Chargement des animaux..." />;
  }

  // Vérifier si des animaux ont des pesées
  const animauxAvecPesees = animaux.filter((a) => {
    const pesees = peseesParAnimal[a.id] || [];
    return pesees.length > 0;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Message d'information */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>ℹ️ Comment utiliser les estimations</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {mode === 'date' 
              ? 'Sélectionnez un animal et entrez un poids cible. Le système calculera la date à laquelle l\'animal atteindra ce poids.'
              : 'Entrez un poids cible et une date. Le système trouvera tous les animaux qui atteindront ce poids à cette date.'}
          </Text>
          <Text style={[styles.infoNote, { color: colors.textSecondary }]}>
            ⚠️ Les estimations nécessitent au moins une pesée par animal.
          </Text>
        </View>

        {/* Sélecteur de mode */}
        <View style={[styles.modeSelector, { backgroundColor: colors.surface, ...colors.shadow.small }]}>
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

        {/* Mode 1: Estimation de date pour un animal */}
        {mode === 'date' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Quand cet animal atteindra-t-il un poids cible ?
            </Text>

            <View style={[styles.formContainer, { backgroundColor: colors.surface, ...colors.shadow.small }]}>
              {animauxAvecStats.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                    Aucun animal avec pesées disponible
                  </Text>
                  <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>
                    Pour utiliser les estimations, vous devez d'abord enregistrer au moins une pesée pour vos animaux.{'\n\n'}
                    Allez dans l'onglet "Suivi des pesées" pour ajouter des pesées.
                  </Text>
                  {animaux.length > 0 && (
                    <Text style={[styles.emptyStateStats, { color: colors.textSecondary }]}>
                      {animaux.length} animal(s) enregistré(s), {animauxAvecPesees.length} avec pesées
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.selectContainer}>
                    <Text style={[styles.label, { color: colors.text }]}>Animal *</Text>
                    <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                      {animauxAvecStats.length} animal(s) disponible(s) avec pesées
                    </Text>
                    <ScrollView style={[styles.animalSelect, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      {animauxAvecStats.map((stats) => (
                        <TouchableOpacity
                          key={stats.animal.id}
                          style={[
                            styles.animalOption,
                            {
                              backgroundColor: selectedAnimalId === stats.animal.id ? colors.primary + '15' : 'transparent',
                              borderBottomColor: colors.border,
                            },
                          ]}
                          onPress={() => setSelectedAnimalId(stats.animal.id)}
                        >
                          <Text
                            style={[
                              styles.animalOptionText,
                              {
                                color: selectedAnimalId === stats.animal.id ? colors.primary : colors.text,
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

              {animauxAvecStats.length > 0 && (
                <>
                  <FormField
                    label="Poids cible (kg) *"
                    value={poidsCible}
                    onChangeText={setPoidsCible}
                    keyboardType="numeric"
                    placeholder="Ex: 100"
                  />

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

                  {selectedAnimalId && poidsCible && (
                    (() => {
                      const animalStats = animauxAvecStats.find((s) => s.animal.id === selectedAnimalId);
                      const poidsCibleNum = parseFloat(poidsCible);
                      if (animalStats && !isNaN(poidsCibleNum) && poidsCibleNum <= animalStats.poidsActuel) {
                        return (
                          <View style={[styles.warningBox, { backgroundColor: colors.error + '15' }]}>
                            <Text style={[styles.warningText, { color: colors.error }]}>
                              ⚠️ Le poids cible doit être supérieur au poids actuel ({animalStats.poidsActuel.toFixed(1)} kg)
                            </Text>
                          </View>
                        );
                      }
                      return null;
                    })()
                  )}
                </>
              )}

              {estimationDate && (
                <View style={[styles.resultCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.primary + '30' }]}>
                  <Text style={[styles.resultTitle, { color: colors.text }]}>Résultat de l'estimation</Text>
                  <View style={styles.resultContent}>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Date estimée:</Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {format(estimationDate.dateEstimee, 'dd MMMM yyyy', { locale: fr })}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Jours nécessaires:</Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {estimationDate.joursNecessaires} jours
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>GMQ actuel:</Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {estimationDate.gmq.toFixed(0)} g/j
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>GMQ cible (standard):</Text>
                      <Text style={[styles.resultValue, { color: colors.text }]}>
                        {estimationDate.gmqCible.toFixed(0)} g/j
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Écart:</Text>
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

        {/* Mode 2: Animaux qui atteignent un poids à une date */}
        {mode === 'animaux' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Quels animaux atteindront un poids cible à une date donnée ?
            </Text>

            <View style={[styles.formContainer, { backgroundColor: colors.surface, ...colors.shadow.small }]}>
              {animauxAvecStats.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                    Aucun animal avec pesées disponible
                  </Text>
                  <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>
                    Pour utiliser les estimations, vous devez d'abord enregistrer au moins une pesée pour vos animaux.{'\n\n'}
                    Allez dans l'onglet "Suivi des pesées" pour ajouter des pesées.
                  </Text>
                  {animaux.length > 0 && (
                    <Text style={[styles.emptyStateStats, { color: colors.textSecondary }]}>
                      {animaux.length} animal(s) enregistré(s), {animauxAvecPesees.length} avec pesées
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
                  <FormField
                    label="Date cible *"
                    value={dateCible}
                    onChangeText={setDateCible}
                    placeholder="YYYY-MM-DD"
                  />

                  {(!poidsCible || !dateCible) && (
                    <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
                      <Text style={[styles.warningText, { color: colors.warning }]}>
                        ⚠️ Veuillez remplir le poids cible et la date cible
                      </Text>
                    </View>
                  )}

                  {poidsCible && dateCible && animauxAtteignantPoids.length === 0 && (
                    <View style={[styles.warningBox, { backgroundColor: colors.textSecondary + '15' }]}>
                      <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                        ℹ️ Aucun animal n'atteindra ce poids à cette date avec les données actuelles
                      </Text>
                    </View>
                  )}
                </>
              )}

              {animauxAtteignantPoids.length > 0 && (
                <View style={styles.resultsContainer}>
                  <Text style={[styles.resultsTitle, { color: colors.text }]}>
                    {animauxAtteignantPoids.length} animal(s) trouvé(s)
                  </Text>
                  {animauxAtteignantPoids.map((result) => (
                    <View key={result.animal.id} style={[styles.resultCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.primary + '30' }]}>
                      <View style={styles.resultHeader}>
                        <Text style={[styles.resultAnimalCode, { color: colors.text }]}>
                          {result.animal.code}
                          {result.animal.nom && ` - ${result.animal.nom}`}
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
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Poids actuel:</Text>
                          <Text style={[styles.resultValue, { color: colors.text }]}>
                            {result.poidsActuel.toFixed(1)} kg
                          </Text>
                        </View>
                        <View style={styles.resultRow}>
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Poids estimé:</Text>
                          <Text style={[styles.resultValue, { color: colors.text }]}>
                            {result.poidsEstime.toFixed(1)} kg
                          </Text>
                        </View>
                        <View style={styles.resultRow}>
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Écart:</Text>
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
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Jours restants:</Text>
                          <Text style={[styles.resultValue, { color: colors.text }]}>
                            {result.joursRestants} jours
                          </Text>
                        </View>
                        <View style={styles.resultRow}>
                          <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>GMQ:</Text>
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

