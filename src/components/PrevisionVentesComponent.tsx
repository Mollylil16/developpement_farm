/**
 * 💰 PRÉVISION DES VENTES
 * Calendrier intelligent basé sur l'évolution du poids
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  genererPrevisionsVentes,
  genererPrevisionsFuturesVentes,
  supprimerPrevisionVente,
} from '../store/slices/planningProductionSlice';
import { PrevisionVenteAnimal } from '../types/planningProduction';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { getCategorieAnimal } from '../utils/animalUtils';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { useFocusEffect } from '@react-navigation/native';
import { createLoggerWithPrefix } from '../utils/logger';

const logger = createLoggerWithPrefix('PrevisionVentes');

interface Props {
  refreshControl: React.ReactElement<React.ComponentProps<typeof import('react-native').RefreshControl>>;
}

export default function PrevisionVentesComponent({ refreshControl }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const {
    previsionsVentes,
    loading,
    parametresProduction,
    simulationResultat,
    sailliesPlanifiees,
  } = useAppSelector((state) => state.planningProduction);
  const animaux = useAppSelector(selectAllAnimaux);
  const projetActif = useAppSelector((state) => state.projet.projetActif);

  const [vueListe, setVueListe] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Sélection du mode de prévision
  const [modePrevu, setModePrevu] = useState<'cheptel' | 'projection'>('cheptel');

  // Paramètres pour la génération des prévisions (Mode 1 : Cheptel actuel)
  const [poidsCible, setPoidsCible] = useState(
    parametresProduction.poids_moyen_vente_kg.toString()
  );

  // Charger les animaux au montage et quand le projet change
  const hasLoadedAnimaux = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (projetActif && !hasLoadedAnimaux.current) {
        logger.info('Chargement des animaux...');
        dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
        hasLoadedAnimaux.current = true;
      }
    }, [dispatch, projetActif])
  );

  useEffect(() => {
    if (projetActif) {
      hasLoadedAnimaux.current = false;
    }
  }, [projetActif]);

  // Animaux à vendre (non reproducteurs uniquement)
  // Exclure les verrats (male + reproducteur) et truies (femelle + reproducteur)
  const animauxAVendre = (animaux || []).filter((a) => {
    // Exclure les reproducteurs
    if (a.reproducteur === true) {
      return false;
    }
    // Inclure uniquement les animaux actifs
    return a.statut === 'actif';
  });

  // Debug log
  useEffect(() => {
    logger.debug('Debug:', {
      totalAnimaux: animaux?.length || 0,
      animauxAVendre: animauxAVendre.length,
      animaux: animaux?.map((a) => ({
        id: a.id,
        code: a.code,
        sexe: a.sexe,
        reproducteur: a.reproducteur,
        statut: a.statut,
      })),
    });
  }, [animaux, animauxAVendre]);

  const handleGenererPrevisions = () => {
    const poids = parseFloat(poidsCible);

    if (isNaN(poids) || poids <= 0) {
      Alert.alert('Erreur', 'Poids cible invalide');
      return;
    }

    if (modePrevu === 'cheptel') {
      // MODE 1 : Cheptel actuel
      if (animauxAVendre.length === 0) {
        Alert.alert(
          'Aucun animal à vendre',
          'Le cheptel ne contient aucun animal non reproducteur actif.\n\n' +
            'Les reproducteurs (verrats et truies) sont exclus des prévisions de ventes.'
        );
        return;
      }

      Alert.alert(
        'Générer les prévisions - Mode Cheptel',
        `📊 Basé sur les animaux actuels\n\n` +
          `• ${animauxAVendre.length} animal(aux) à vendre\n` +
          `• Poids cible : ${poids} kg\n` +
          `• GMQ : Calculé depuis les pesées\n\n` +
          `Le système calculera la date de vente pour chaque animal.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Générer',
            onPress: () => {
              dispatch(genererPrevisionsVentes({ poids_cible_kg: poids }));
            },
          },
        ]
      );
    } else {
      // MODE 2 : Projection future
      if (!sailliesPlanifiees || sailliesPlanifiees.length === 0) {
        Alert.alert(
          'Aucune saillie planifiée',
          'Vous devez d\'abord générer un plan de saillies dans l\'onglet "Saillies" pour utiliser la projection future.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Générer les prévisions - Mode Projection',
        `📈 Basé sur les saillies planifiées\n\n` +
          `• ${sailliesPlanifiees.length} saillie(s) planifiée(s)\n` +
          `• Poids cible : ${poids} kg\n` +
          `• Projection sur 12-24 mois\n\n` +
          `Le système calculera les ventes futures de toutes les portées.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Générer',
            onPress: () => {
              dispatch(genererPrevisionsFuturesVentes({ poids_cible_kg: poids }));
            },
          },
        ]
      );
    }
  };

  const handleSupprimerPrevision = (id: string) => {
    Alert.alert('Supprimer la prévision', 'Êtes-vous sûr de vouloir supprimer cette prévision ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          dispatch(supprimerPrevisionVente(id));
        },
      },
    ]);
  };

  const getMarkedDates = (): { [key: string]: any } => {
    const marked: { [key: string]: any } = {};

    (previsionsVentes || []).forEach((prevision) => {
      if (!prevision.date_vente_prevue) return;

      const dateVente = format(parseISO(prevision.date_vente_prevue), 'yyyy-MM-dd');

      // Couleur selon l'urgence
      const joursRestants = prevision.jours_restants;
      let dotColor = colors.success;
      if (joursRestants <= 7) {
        dotColor = colors.error;
      } else if (joursRestants <= 30) {
        dotColor = colors.warning;
      }

      marked[dateVente] = {
        marked: true,
        dotColor,
        selected: dateVente === selectedDate,
        selectedColor: dotColor,
      };
    });

    return marked;
  };

  const getPrevisionsForDate = (date: string) => {
    return (previsionsVentes || []).filter(
      (p) => p.date_vente_prevue && format(parseISO(p.date_vente_prevue), 'yyyy-MM-dd') === date
    );
  };

  const renderHeader = () => {
    const previsionsSemaineProchaine = (previsionsVentes || []).filter(
      (p) => p.jours_restants > 0 && p.jours_restants <= 7
    );
    const previsionsMoisProchain = (previsionsVentes || []).filter(
      (p) => p.jours_restants > 7 && p.jours_restants <= 30
    );

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="cash" size={24} color={colors.success} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Prévisions de ventes</Text>
        </View>

        {/* Sélecteur de mode */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              modePrevu === 'cheptel' && styles.modeButtonActive,
              {
                backgroundColor: modePrevu === 'cheptel' ? colors.primary : colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setModePrevu('cheptel')}
          >
            <Ionicons name="paw" size={18} color={modePrevu === 'cheptel' ? '#fff' : colors.text} />
            <Text
              style={[
                styles.modeButtonText,
                { color: modePrevu === 'cheptel' ? '#fff' : colors.text },
              ]}
            >
              Cheptel actuel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              modePrevu === 'projection' && styles.modeButtonActive,
              {
                backgroundColor: modePrevu === 'projection' ? colors.primary : colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setModePrevu('projection')}
          >
            <Ionicons
              name="trending-up"
              size={18}
              color={modePrevu === 'projection' ? '#fff' : colors.text}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: modePrevu === 'projection' ? '#fff' : colors.text },
              ]}
            >
              Projection future
            </Text>
          </TouchableOpacity>
        </View>

        {/* Formulaire de paramétrage */}
        <View
          style={[
            styles.paramBox,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.paramTitle, { color: colors.text }]}>
            {modePrevu === 'cheptel'
              ? `📊 Mode : Cheptel actuel (${animauxAVendre.length} animaux à vendre)`
              : `📈 Mode : Projection future (${sailliesPlanifiees?.length || 0} saillies planifiées)`}
          </Text>
          <Text style={[styles.paramSubtitle, { color: colors.textSecondary }]}>
            {modePrevu === 'cheptel'
              ? "GMQ calculé automatiquement depuis l'historique des pesées"
              : 'Prévisions basées sur les saillies planifiées et la simulation'}
          </Text>

          <View style={styles.paramRow}>
            <View style={styles.paramField}>
              <Text style={[styles.paramLabel, { color: colors.text }]}>Poids cible (kg)</Text>
              <TextInput
                style={[
                  styles.paramInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={poidsCible}
                onChangeText={setPoidsCible}
                keyboardType="decimal-pad"
                placeholder="110"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {animaux && animaux.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={14} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {animaux.length} animal(aux) total · {animaux.filter((a) => a.reproducteur).length}{' '}
                reproducteur(s) exclu(s)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.statValue, { color: colors.error }]}>
              {previsionsSemaineProchaine.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Semaine prochaine
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={20} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {previsionsMoisProchain.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mois prochain</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.success }]}>
              {(previsionsVentes || []).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.success, flex: 1 }]}
            onPress={handleGenererPrevisions}
            disabled={loading}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.buttonText}>Actualiser les prévisions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonOutline, { borderColor: colors.success, flex: 0.5 }]}
            onPress={() => setVueListe(!vueListe)}
          >
            <Ionicons
              name={vueListe ? 'calendar-outline' : 'list-outline'}
              size={18}
              color={colors.success}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCalendrier = () => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Calendar
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markedDates={getMarkedDates()}
        theme={{
          backgroundColor: colors.surface,
          calendarBackground: colors.surface,
          textSectionTitleColor: colors.text,
          selectedDayBackgroundColor: colors.success,
          selectedDayTextColor: '#fff',
          todayTextColor: colors.success,
          dayTextColor: colors.text,
          textDisabledColor: colors.textSecondary,
          monthTextColor: colors.text,
          textMonthFontWeight: '600',
          arrowColor: colors.success,
        }}
        style={{ borderRadius: 8 }}
      />

      {selectedDate && getPrevisionsForDate(selectedDate).length > 0 && (
        <View style={styles.selectedDateContainer}>
          <Text style={[styles.selectedDateTitle, { color: colors.text }]}>
            Ventes prévues le {format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: fr })} :
          </Text>
          {getPrevisionsForDate(selectedDate).map((prevision) => {
            const animal = animaux.find((a) => a.id === prevision.animal_id);
            return (
              <View key={prevision.animal_id} style={styles.miniPrevisionCard}>
                <Text style={[styles.miniPrevisionText, { color: colors.text }]}>
                  🐷 {animal?.nom || 'Animal inconnu'} - {prevision.poids_actuel.toFixed(1)} kg →{' '}
                  {prevision.poids_cible} kg
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Légende */}
      <View style={styles.legendeContainer}>
        <Text style={[styles.legendeTitle, { color: colors.text }]}>Légende :</Text>
        <View style={styles.legendeRow}>
          <View style={styles.legendeItem}>
            <View style={[styles.legendeDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.legendeText, { color: colors.textSecondary }]}>≤ 7 jours</Text>
          </View>
          <View style={styles.legendeItem}>
            <View style={[styles.legendeDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendeText, { color: colors.textSecondary }]}>≤ 30 jours</Text>
          </View>
          <View style={styles.legendeItem}>
            <View style={[styles.legendeDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendeText, { color: colors.textSecondary }]}>+ de 30 jours</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPrevisionCard = ({ item }: { item: PrevisionVenteAnimal }) => {
    const animal = animaux.find((a) => a.id === item.animal_id);

    const progressionPoids = ((item.poids_actuel - 0) / (item.poids_cible - 0)) * 100;

    let urgenceColor = colors.success;
    let urgenceIcon = 'checkmark-circle';
    let urgenceLabel = 'Dans les temps';

    if (item.jours_restants <= 7) {
      urgenceColor = colors.error;
      urgenceIcon = 'alert-circle';
      urgenceLabel = 'Urgent';
    } else if (item.jours_restants <= 30) {
      urgenceColor = colors.warning;
      urgenceIcon = 'time';
      urgenceLabel = 'Bientôt';
    }

    return (
      <View style={[styles.previsionCard, { backgroundColor: colors.surface }]}>
        <View style={styles.previsionHeader}>
          <View style={styles.previsionHeaderLeft}>
            <Ionicons name="pricetag" size={24} color={colors.success} />
            <View>
              <Text style={[styles.previsionAnimal, { color: colors.text }]}>
                {animal?.nom || 'Animal inconnu'}
              </Text>
              <Text style={[styles.previsionDate, { color: colors.textSecondary }]}>
                {item.date_vente_prevue
                  ? format(parseISO(item.date_vente_prevue), 'dd MMM yyyy', { locale: fr })
                  : 'Date non définie'}
              </Text>
            </View>
          </View>
          <View style={[styles.urgenceBadge, { backgroundColor: urgenceColor + '20' }]}>
            <Ionicons name={urgenceIcon as keyof typeof Ionicons.glyphMap} size={16} color={urgenceColor} />
            <Text style={[styles.urgenceText, { color: urgenceColor }]}>{urgenceLabel}</Text>
          </View>
        </View>

        <View style={styles.previsionBody}>
          <View style={styles.previsionRow}>
            <Text style={[styles.previsionLabel, { color: colors.textSecondary }]}>
              Poids actuel :
            </Text>
            <Text style={[styles.previsionValue, { color: colors.text }]}>
              {item.poids_actuel.toFixed(1)} kg
            </Text>
          </View>
          <View style={styles.previsionRow}>
            <Text style={[styles.previsionLabel, { color: colors.textSecondary }]}>
              Poids cible :
            </Text>
            <Text style={[styles.previsionValue, { color: colors.success }]}>
              {item.poids_cible} kg
            </Text>
          </View>
          <View style={styles.previsionRow}>
            <Text style={[styles.previsionLabel, { color: colors.textSecondary }]}>GMQ :</Text>
            <Text style={[styles.previsionValue, { color: colors.info }]}>
              {item.gmq_utilise} g/j
            </Text>
          </View>
          <View style={styles.previsionRow}>
            <Text style={[styles.previsionLabel, { color: colors.textSecondary }]}>
              Jours restants :
            </Text>
            <Text style={[styles.previsionValue, { color: urgenceColor }]}>
              {item.jours_restants} jours
            </Text>
          </View>

          {/* Barre de progression */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.success,
                    width: `${Math.min(progressionPoids, 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {progressionPoids.toFixed(0)}%
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleSupprimerPrevision(item.animal_id)}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderListe = () => (
    <FlatList
      data={(previsionsVentes || []).sort((a, b) => a.jours_restants - b.jours_restants)}
      keyExtractor={(item) => item.animal_id}
      ListHeaderComponent={renderHeader()}
      renderItem={renderPrevisionCard}
      contentContainerStyle={styles.listeContent}
      refreshControl={refreshControl}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="cash-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucune prévision de vente
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Générez des prévisions pour voir le calendrier de ventes
          </Text>
        </View>
      }
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {vueListe ? (
        renderListe()
      ) : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
          {renderHeader()}
          {renderCalendrier()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeButtonActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paramBox: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  paramTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  paramSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  paramRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paramField: {
    flex: 1,
  },
  paramLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  paramInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  infoText: {
    fontSize: 11,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonOutline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDateContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  selectedDateTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  miniPrevisionCard: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
    marginBottom: 4,
  },
  miniPrevisionText: {
    fontSize: 13,
  },
  legendeContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  legendeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendeText: {
    fontSize: 12,
  },
  listeContent: {
    paddingBottom: 16,
  },
  previsionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  previsionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previsionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  previsionAnimal: {
    fontSize: 16,
    fontWeight: '600',
  },
  previsionDate: {
    fontSize: 12,
  },
  urgenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  previsionBody: {
    gap: 8,
  },
  previsionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previsionLabel: {
    fontSize: 14,
  },
  previsionValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
