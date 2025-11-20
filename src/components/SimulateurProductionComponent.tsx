/**
 * 🎯 SIMULATEUR DE PRODUCTION
 * Calcul des truies nécessaires + Recommandations stratégiques
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setObjectifProduction,
  simulerProduction,
  clearSimulation,
} from '../store/slices/planningProductionSlice';
import {
  ObjectifProduction,
  ParametresProduction,
  PARAMETRES_PRODUCTION_DEFAUT,
} from '../types/planningProduction';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { getCategorieAnimal } from '../utils/animalUtils';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { RACES_PERFORMANCES, calculerMoyennePorceletsSelonRaces } from '../constants/races';

interface Props {
  refreshControl: React.ReactElement;
}

export default function SimulateurProductionComponent({ refreshControl }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const { projetActif } = useAppSelector((state) => state.projet);
  const { objectifProduction, simulationResultat, recommendations, loading } = useAppSelector(
    (state) => state.planningProduction
  );
  const animaux = useAppSelector(selectAllAnimaux);
  
  // Utiliser useRef pour éviter de recharger à chaque render
  const animauxChargesRef = useRef<string | null>(null);
  
  // Charger les animaux du cheptel au montage
  useEffect(() => {
    if (projetActif && animauxChargesRef.current !== projetActif.id) {
      animauxChargesRef.current = projetActif.id;
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
    }
  }, [dispatch, projetActif?.id]);

  // États locaux pour le formulaire
  const [objectifTonnes, setObjectifTonnes] = useState(
    objectifProduction?.objectif_tonnes?.toString() || '5'
  );
  const [periodeMois, setPeriodeMois] = useState(
    objectifProduction?.periode_mois?.toString() || '12'
  );
  const [poidsMoyenVente, setPoidsMoyenVente] = useState(
    PARAMETRES_PRODUCTION_DEFAUT.poids_moyen_vente_kg.toString()
  );
  const [porceletsParPortee, setPorceletsParPortee] = useState(
    PARAMETRES_PRODUCTION_DEFAUT.porcelets_par_portee_moyen.toString()
  );

  // Compter les truies et verrats actuels (en utilisant la fonction getCategorieAnimal)
  const truiesDisponibles = (animaux || []).filter(
    (a) => getCategorieAnimal(a) === 'truie' && a.statut === 'actif'
  );
  const truiesActuelles = truiesDisponibles.length;
  
  const verratsActuels = (animaux || []).filter(
    (a) => getCategorieAnimal(a) === 'verrat' && a.statut === 'actif'
  ).length;

  // Calculer la moyenne des porcelets par portée basée sur les races des truies
  const moyennePorceletsSelonRaces = calculerMoyennePorceletsSelonRaces(truiesDisponibles);
  
  // Construire le texte de suggestion basé sur les races présentes
  const racesSuggestion = React.useMemo(() => {
    const racesComptees: Record<string, number> = {};
    truiesDisponibles.forEach((truie) => {
      if (truie.race && RACES_PERFORMANCES[truie.race]) {
        racesComptees[truie.race] = (racesComptees[truie.race] || 0) + 1;
      }
    });

    const racesTextes = Object.entries(racesComptees)
      .sort(([, a], [, b]) => b - a) // Trier par nombre décroissant
      .map(([race, count]) => {
        const perf = RACES_PERFORMANCES[race];
        return `${race} (${count}): ${perf.porceletsParPorteeMoyen} porcelets`;
      });

    if (racesTextes.length > 0) {
      return `🐷 Suggestion basée sur vos truies:\n${racesTextes.join('\n')}\n\n💡 Moyenne recommandée: ${moyennePorceletsSelonRaces} porcelets/portée`;
    } else {
      return '💡 Suggestions par race:\n' + 
        Object.entries(RACES_PERFORMANCES)
          .slice(0, 5) // Top 5 races
          .map(([race, perf]) => `${race}: ${perf.porceletsParPorteeMoyen}`)
          .join(' • ');
    }
  }, [truiesDisponibles, moyennePorceletsSelonRaces]);

  const handleSimuler = () => {
    const objectif = parseFloat(objectifTonnes);
    const periode = parseInt(periodeMois);
    const poidsMoyen = parseFloat(poidsMoyenVente);
    const porcelets = parseFloat(porceletsParPortee);

    if (isNaN(objectif) || objectif <= 0) {
      Alert.alert('Erreur', 'Objectif de production invalide');
      return;
    }
    if (isNaN(periode) || periode <= 0) {
      Alert.alert('Erreur', 'Période invalide');
      return;
    }
    if (isNaN(poidsMoyen) || poidsMoyen <= 0) {
      Alert.alert('Erreur', 'Poids moyen invalide');
      return;
    }
    if (isNaN(porcelets) || porcelets <= 0) {
      Alert.alert('Erreur', 'Nombre de porcelets par portée invalide');
      return;
    }

    const nouvelObjectif: ObjectifProduction = {
      objectif_tonnes: objectif,
      periode_mois: periode,
      date_debut: new Date().toISOString(),
      date_fin: new Date(
        new Date().setMonth(new Date().getMonth() + periode)
      ).toISOString(),
    };

    dispatch(setObjectifProduction(nouvelObjectif));

    const parametres: ParametresProduction = {
      ...PARAMETRES_PRODUCTION_DEFAUT,
      poids_moyen_vente_kg: poidsMoyen,
      porcelets_par_portee_moyen: porcelets,
    };

    dispatch(
      simulerProduction({
        objectif: nouvelObjectif,
        parametres,
        cheptelActuel: { 
          truies: truiesActuelles,
          verrats: verratsActuels,
        },
      })
    );
  };

  const renderFormulaire = () => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="calculator" size={24} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Paramètres de simulation
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Objectif de production (tonnes) 🎯
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
          ]}
          value={objectifTonnes}
          onChangeText={setObjectifTonnes}
          keyboardType="decimal-pad"
          placeholder="Ex: 5"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Période (mois) 📅</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
          ]}
          value={periodeMois}
          onChangeText={setPeriodeMois}
          keyboardType="number-pad"
          placeholder="Ex: 12"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Poids moyen de vente (kg) ⚖️
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
          ]}
          value={poidsMoyenVente}
          onChangeText={setPoidsMoyenVente}
          keyboardType="decimal-pad"
          placeholder="Ex: 110"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Porcelets par portée (moyenne) 🐷
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
          ]}
          value={porceletsParPortee}
          onChangeText={setPorceletsParPortee}
          keyboardType="decimal-pad"
          placeholder="Ex: 12"
          placeholderTextColor={colors.textSecondary}
        />
        <View style={[styles.suggestionBox, { backgroundColor: colors.info + '15', borderColor: colors.info + '40' }]}>
          <Text style={[styles.suggestionText, { color: colors.textSecondary, fontSize: 12 }]}>
            {racesSuggestion}
          </Text>
          {truiesDisponibles.length > 0 && moyennePorceletsSelonRaces !== parseFloat(porceletsParPortee) && (
            <TouchableOpacity
              style={[styles.applySuggestionButton, { backgroundColor: colors.info }]}
              onPress={() => setPorceletsParPortee(moyennePorceletsSelonRaces.toString())}
            >
              <Ionicons name="flash" size={14} color="#fff" />
              <Text style={styles.applySuggestionText}>
                Appliquer ({moyennePorceletsSelonRaces})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
        onPress={handleSimuler}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Ionicons name="play-circle" size={20} color="#fff" />
        <Text style={styles.buttonText}>
          {loading ? 'Simulation en cours...' : 'Lancer la simulation'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCheptelActuel = () => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="stats-chart" size={24} color={colors.info} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Cheptel actuel</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Truies reproductrices :
        </Text>
        <Text style={[styles.statValue, { color: colors.text }]}>{truiesActuelles}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Verrats :
        </Text>
        <Text style={[styles.statValue, { color: colors.text }]}>{verratsActuels}</Text>
      </View>
    </View>
  );

  const renderResultats = () => {
    if (!simulationResultat) return null;

    const { 
      nombre_truies_necessaires, 
      objectif_tonnes, 
      est_faisable,
      nombre_portees_necessaires,
      nombre_porcs_necessaires 
    } = simulationResultat;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons
            name={est_faisable ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color={est_faisable ? colors.success : colors.error}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Résultats de simulation</Text>
        </View>

        <View
          style={[
            styles.resultBox,
            { backgroundColor: est_faisable ? colors.success + '15' : colors.error + '15' },
          ]}
        >
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {est_faisable ? '✅ Objectif atteignable' : '⚠️ Objectif difficile'}
          </Text>
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              Truies nécessaires :
            </Text>
            <Text style={[styles.resultValue, { color: colors.text, fontWeight: '700' }]}>
              {Math.ceil(nombre_truies_necessaires || 0)}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              Objectif de production :
            </Text>
            <Text style={[styles.resultValue, { color: colors.text, fontWeight: '700' }]}>
              {(objectif_tonnes || 0).toFixed(2)} tonnes
            </Text>
          </View>
        </View>

        <View style={styles.kpisContainer}>
          <Text style={[styles.kpisTitle, { color: colors.text }]}>📊 Indicateurs clés</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                Portées nécessaires
              </Text>
              <Text style={[styles.kpiValue, { color: colors.primary }]}>
                {Math.ceil(nombre_portees_necessaires || 0)}
              </Text>
            </View>
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                Porcs nécessaires
              </Text>
              <Text style={[styles.kpiValue, { color: colors.info }]}>
                {Math.ceil(nombre_porcs_necessaires || 0)}
              </Text>
            </View>
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                Saillies/mois
              </Text>
              <Text style={[styles.kpiValue, { color: colors.success }]}>
                {Math.ceil(simulationResultat.nombre_saillies_par_mois || 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderRecommendations = () => {
    if (recommendations.length === 0) return null;

    const getIconePriorite = (priorite: string) => {
      switch (priorite) {
        case 'critique':
          return 'alert-circle';
        case 'elevee':
          return 'warning';
        case 'moyenne':
          return 'information-circle';
        case 'faible':
          return 'checkmark-circle';
        default:
          return 'bulb';
      }
    };

    const getCouleurPriorite = (priorite: string) => {
      switch (priorite) {
        case 'critique':
          return colors.error;
        case 'elevee':
          return colors.warning;
        case 'moyenne':
          return colors.info;
        case 'faible':
          return colors.success;
        default:
          return colors.primary;
      }
    };

    const formatMontant = (montant?: number) => {
      if (!montant) return null;
      const isNegatif = montant < 0;
      const montantAbs = Math.abs(montant);
      const formatted = new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        maximumFractionDigits: 0,
      }).format(montantAbs);
      return `${isNegatif ? '-' : ''}${formatted} F`;
    };

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="bulb" size={24} color={colors.warning} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>💡 Recommandations stratégiques</Text>
        </View>

        {recommendations.map((rec, index) => (
          <View
            key={index}
            style={[
              styles.recommendationCard,
              {
                backgroundColor: getCouleurPriorite(rec.priorite) + '10',
                borderLeftColor: getCouleurPriorite(rec.priorite),
              },
            ]}
          >
            {/* Titre de la recommandation */}
            <View style={styles.recommendationHeader}>
              <Ionicons
                name={getIconePriorite(rec.priorite) as any}
                size={20}
                color={getCouleurPriorite(rec.priorite)}
              />
              <Text style={[styles.recommendationTitre, { color: colors.text }]}>
                {rec.titre}
              </Text>
            </View>

            {/* Message principal */}
            <Text style={[styles.recommendationMessage, { color: colors.text }]}>
              {rec.message}
            </Text>

            {/* Actions recommandées */}
            {rec.actions && rec.actions.length > 0 && (
              <View style={styles.actionsContainer}>
                {rec.actions.map((action, idx) => (
                  <View key={idx} style={styles.actionCard}>
                    <View style={styles.actionHeader}>
                      <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                      <Text style={[styles.actionTitre, { color: colors.primary }]}>
                        {action.action}
                      </Text>
                    </View>
                    <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                      {action.description}
                    </Text>
                    {(action.cout_estime || action.delai) && (
                      <View style={styles.actionInfo}>
                        {action.cout_estime !== undefined && (
                          <View style={[styles.infoChip, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="cash-outline" size={14} color={colors.primary} />
                            <Text style={[styles.infoChipText, { color: colors.primary }]}>
                              {formatMontant(action.cout_estime)}
                            </Text>
                          </View>
                        )}
                        {action.delai && (
                          <View style={[styles.infoChip, { backgroundColor: colors.info + '15' }]}>
                            <Ionicons name="time-outline" size={14} color={colors.info} />
                            <Text style={[styles.infoChipText, { color: colors.info }]}>
                              {action.delai}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Impact estimé */}
            {rec.impact_estime && (
              <View style={[styles.impactContainer, { backgroundColor: colors.background + '80', borderColor: colors.borderLight }]}>
                <Text style={[styles.impactTitre, { color: colors.textSecondary }]}>
                  📊 Impact estimé
                </Text>
                <View style={styles.impactDetails}>
                  {rec.impact_estime.cout_estime !== undefined && (
                    <Text style={[styles.impactText, { color: colors.text }]}>
                      • Investissement : {formatMontant(rec.impact_estime.cout_estime)}
                    </Text>
                  )}
                  {rec.impact_estime.delai_mois && (
                    <Text style={[styles.impactText, { color: colors.text }]}>
                      • Délai de mise en œuvre : {rec.impact_estime.delai_mois} mois
                    </Text>
                  )}
                  {rec.impact_estime.production_additionnelle && (
                    <Text style={[styles.impactText, { color: colors.text }]}>
                      • Production additionnelle : +{rec.impact_estime.production_additionnelle.toFixed(1)} tonnes
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={true}
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={true}
    >
      {renderCheptelActuel()}
      {renderFormulaire()}
      {renderResultats()}
      {renderRecommendations()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  suggestionBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    lineHeight: 18,
  },
  applySuggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  applySuggestionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultBox: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
  },
  resultValue: {
    fontSize: 16,
  },
  kpisContainer: {
    marginTop: 8,
  },
  kpisTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  kpiItem: {
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  recommendationCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  recommendationTitre: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },
  recommendationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionsContainer: {
    marginTop: 8,
    gap: 12,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
    padding: 12,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  actionTitre: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 22,
  },
  actionInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginLeft: 22,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  impactContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  impactTitre: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  impactDetails: {
    gap: 4,
  },
  impactText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

