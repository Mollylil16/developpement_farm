/**
 * 📅 PLANIFICATEUR DE SAILLIES
 * Calendrier intelligent des saillies pour atteindre l'objectif
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  genererPlanSaillies,
  supprimerSailliePlanifiee,
  validerPlanningSaillies,
} from '../store/slices/planningProductionSlice';
import { SailliePlanifiee, STATUT_SAILLIE_LABELS } from '../types/planningProduction';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { getCategorieAnimal } from '../utils/animalUtils';

interface Props {
  refreshControl: React.ReactElement;
}

export default function PlanificateurSailliesComponent({ refreshControl }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const { simulationResultat, sailliesPlanifiees, loading, error } = useAppSelector(
    (state) => state.planningProduction
  );
  const animaux = useAppSelector(selectAllAnimaux);
  const projetActif = useAppSelector((state) => state.projet.projetActif);

  const [vueListe, setVueListe] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Afficher les erreurs du state
  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', error);
    }
  }, [error]);

  // Truies et verrats disponibles (avec vérification de sécurité)
  const truiesDisponibles = (animaux || []).filter(
    (a) => getCategorieAnimal(a) === 'truie' && a.statut === 'actif'
  );
  const verratsDisponibles = (animaux || []).filter(
    (a) => getCategorieAnimal(a) === 'verrat' && a.statut === 'actif'
  );

  const handleGenererPlan = () => {
    if (!simulationResultat) {
      Alert.alert(
        'Simulation requise',
        'Veuillez d\'abord lancer une simulation de production dans l\'onglet "Simulation".'
      );
      return;
    }

    if (truiesDisponibles.length === 0) {
      Alert.alert('Erreur', 'Aucune truie disponible dans le cheptel.');
      return;
    }

    const nombrePortees = Math.ceil(simulationResultat.nombre_portees_necessaires || 0);
    const cyclesParTruie = Math.ceil(nombrePortees / truiesDisponibles.length);

    let verratMessage = '';
    if (verratsDisponibles.length === 0) {
      verratMessage = '⚠️ Aucun verrat disponible (à ajouter manuellement)';
    } else if (verratsDisponibles.length === 1) {
      verratMessage = `🐗 1 verrat disponible (assigné à toutes les saillies)`;
    } else {
      verratMessage = `🐗 ${verratsDisponibles.length} verrats disponibles (alternance automatique)`;
    }

    Alert.alert(
      'Générer le plan de saillies',
      `📊 Plan de reproduction :\n\n` +
        `• ${nombrePortees} portées nécessaires\n` +
        `• ${truiesDisponibles.length} truie(s) disponible(s)\n` +
        `• ${verratMessage}\n` +
        `• ~${cyclesParTruie} cycle(s) par truie\n` +
        `• Période : ${simulationResultat.periode_mois} mois\n\n` +
        `Les truies et verrats seront assignés automatiquement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Générer',
          onPress: async () => {
            try {
              await dispatch(genererPlanSaillies()).unwrap();
              // Succès : les saillies sont automatiquement mises à jour dans le state
            } catch (error: any) {
              Alert.alert(
                'Erreur lors de la génération',
                error || 'Une erreur est survenue lors de la génération du plan de saillies.'
              );
            }
          },
        },
      ]
    );
  };

  const handleSupprimerSaillie = (id: string) => {
    Alert.alert('Supprimer la saillie', 'Êtes-vous sûr de vouloir supprimer cette saillie ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          dispatch(supprimerSailliePlanifiee(id));
        },
      },
    ]);
  };

  const handleValiderPlanning = () => {
    if (!projetActif) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }

    if (!sailliesPlanifiees || sailliesPlanifiees.length === 0) {
      Alert.alert('Erreur', 'Aucune saillie à valider');
      return;
    }

    // Vérifier combien de saillies sont déjà validées
    const sailliesNonValidees = sailliesPlanifiees.filter((s) => !s.validee);

    if (sailliesNonValidees.length === 0) {
      Alert.alert(
        'Info',
        'Toutes les saillies ont déjà été validées et leurs tâches créées dans le planning.'
      );
      return;
    }

    const nombreTaches = sailliesNonValidees.length * 10; // 10 tâches par saillie

    Alert.alert(
      '📋 Valider le planning de saillies',
      `Cette action va créer ${nombreTaches} tâche(s) dans le planning pour ${sailliesNonValidees.length} saillie(s) :\n\n` +
        `✅ Tâches créées pour chaque saillie :\n` +
        `• Saillie (J-0)\n` +
        `• Contrôle post-saillie (J+7)\n` +
        `• Contrôle gestation (J+30)\n` +
        `• Vaccination pré-mise bas (J+100)\n` +
        `• Préparation loge (J+110)\n` +
        `• Mise bas (J+114)\n` +
        `• Contrôle post-mise bas (J+116)\n` +
        `• Sevrage (J+135)\n` +
        `• Vaccination porcelets (J+145)\n` +
        `• Vente prévue\n\n` +
        `📅 Vous pourrez suivre et modifier ces tâches dans le widget Planning.\n\n` +
        `Continuer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          style: 'default',
          onPress: async () => {
            try {
              const result = await dispatch(
                validerPlanningSaillies({
                  projetId: projetActif.id,
                  saillies: sailliesNonValidees,
                  animaux: animaux || [],
                })
              ).unwrap();

              Alert.alert(
                '✅ Planning validé',
                `${result.nombreTachesCreees} tâche(s) créée(s) avec succès dans le planning !\n\n` +
                  `Rendez-vous dans le widget Planning pour voir les tâches.`,
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Erreur lors de la validation du planning');
            }
          },
        },
      ]
    );
  };

  const getMarkedDates = () => {
    const marked: any = {};

    (sailliesPlanifiees || []).forEach((saillie) => {
      const dateSaillie = format(parseISO(saillie.date_saillie_prevue), 'yyyy-MM-dd');
      const dateMiseBas = format(parseISO(saillie.date_mise_bas_prevue), 'yyyy-MM-dd');

      marked[dateSaillie] = {
        marked: true,
        dotColor: colors.primary,
        selected: dateSaillie === selectedDate,
        selectedColor: colors.primary,
      };

      marked[dateMiseBas] = {
        marked: true,
        dotColor: colors.success,
        selected: dateMiseBas === selectedDate,
        selectedColor: colors.success,
      };
    });

    return marked;
  };

  const getSailliesForDate = (date: string) => {
    return (sailliesPlanifiees || []).filter(
      (s) =>
        format(parseISO(s.date_saillie_prevue), 'yyyy-MM-dd') === date ||
        format(parseISO(s.date_mise_bas_prevue), 'yyyy-MM-dd') === date
    );
  };

  const renderHeader = () => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="calendar" size={24} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Planning des saillies</Text>
      </View>

      {simulationResultat && (
        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            📊 Portées nécessaires : {Math.ceil(simulationResultat.nombre_portees_necessaires || 0)}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            ✅ Saillies planifiées : {(sailliesPlanifiees || []).length}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            🐷 Truies disponibles : {truiesDisponibles.length}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            🐗 Verrats disponibles : {verratsDisponibles.length}
          </Text>

          {/* Message d'avertissement si saillies insuffisantes */}
          {(sailliesPlanifiees || []).length <
            Math.ceil(simulationResultat.nombre_portees_necessaires || 0) && (
            <View
              style={[
                styles.warningBox,
                { backgroundColor: colors.warning + '15', borderColor: colors.warning },
              ]}
            >
              <Ionicons name="warning" size={20} color={colors.warning} />
              <View style={styles.warningContent}>
                <Text style={[styles.warningTitle, { color: colors.warning }]}>
                  Saillies insuffisantes
                </Text>
                <Text style={[styles.warningText, { color: colors.text }]}>
                  Il manque{' '}
                  {Math.ceil(simulationResultat.nombre_portees_necessaires || 0) -
                    (sailliesPlanifiees || []).length}{' '}
                  saillie(s) pour atteindre l'objectif de production.
                  {'\n\n'}
                  💡 <Text style={{ fontWeight: '600' }}>Que faire ?</Text>
                  {'\n'}• Cliquez sur "Générer automatiquement" pour créer un plan complet
                  {'\n'}• Ou ajoutez manuellement les saillies manquantes
                  {'\n'}• Vérifiez que vous avez assez de truies reproductrices dans votre cheptel
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary, flex: 1 }]}
          onPress={handleGenererPlan}
          disabled={loading}
        >
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={styles.buttonText}>Générer le plan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonOutline, { borderColor: colors.primary, flex: 0.5 }]}
          onPress={() => setVueListe(!vueListe)}
        >
          <Ionicons
            name={vueListe ? 'calendar-outline' : 'list-outline'}
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Bouton de validation du planning */}
      {(sailliesPlanifiees || []).length > 0 && (
        <TouchableOpacity
          style={[styles.buttonValidation, { backgroundColor: colors.success, marginTop: 12 }]}
          onPress={handleValiderPlanning}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.buttonText}>✅ Valider le planning - Créer les tâches</Text>
          <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <Text style={styles.badgeText}>
              {(sailliesPlanifiees || []).filter((s) => !s.validee).length}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCalendrier = () => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Calendar
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markedDates={getMarkedDates()}
        theme={{
          backgroundColor: colors.surface,
          calendarBackground: colors.surface,
          textSectionTitleColor: colors.text,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#fff',
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.textSecondary,
          monthTextColor: colors.text,
          textMonthFontWeight: '600',
          arrowColor: colors.primary,
        }}
        style={{ borderRadius: 8 }}
      />

      {selectedDate && (
        <View style={styles.selectedDateContainer}>
          <Text style={[styles.selectedDateTitle, { color: colors.text }]}>
            Événements le {format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: fr })} :
          </Text>
          {getSailliesForDate(selectedDate).map((saillie) => (
            <View key={saillie.id} style={styles.miniSaillieCard}>
              <Text style={[styles.miniSaillieText, { color: colors.text }]}>
                {format(parseISO(saillie.date_saillie_prevue), 'yyyy-MM-dd') === selectedDate
                  ? '🐷 Saillie prévue'
                  : '🤰 Mise bas prévue'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderSaillieCard = ({ item }: { item: SailliePlanifiee }) => {
    const truie = truiesDisponibles.find((t) => t.id === item.truie_id);
    const verrat = verratsDisponibles.find((v) => v.id === item.verrat_id);

    return (
      <View style={[styles.saillieCard, { backgroundColor: colors.surface }]}>
        {/* Badge de validation */}
        {item.validee && (
          <View style={[styles.validationBadge, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark-circle" size={14} color="#fff" />
            <Text style={styles.validationBadgeText}>
              Validée - {item.taches_creees?.length || 0} tâches créées
            </Text>
          </View>
        )}

        <View style={styles.saillieHeader}>
          <View style={styles.saillieHeaderLeft}>
            <Ionicons name="heart-circle" size={24} color={colors.primary} />
            <View>
              <Text style={[styles.saillieDate, { color: colors.text }]}>
                {format(parseISO(item.date_saillie_prevue), 'dd MMM yyyy', { locale: fr })}
              </Text>
              <Text style={[styles.saillieStatut, { color: colors.textSecondary }]}>
                {STATUT_SAILLIE_LABELS[item.statut]}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleSupprimerSaillie(item.id)}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.saillieBody}>
          <View style={styles.saillieRow}>
            <Text style={[styles.saillieLabel, { color: colors.textSecondary }]}>Truie :</Text>
            <Text style={[styles.saillieValue, { color: truie ? colors.text : colors.warning }]}>
              {truie ? truie.nom || truie.code || `Truie ${truie.id}` : 'Non assignée'}
            </Text>
          </View>
          <View style={styles.saillieRow}>
            <Text style={[styles.saillieLabel, { color: colors.textSecondary }]}>Verrat :</Text>
            <Text
              style={[styles.saillieValue, { color: verrat ? colors.text : colors.textSecondary }]}
            >
              {verrat ? verrat.nom || verrat.code || `Verrat ${verrat.id}` : 'À assigner'}
            </Text>
          </View>
          <View style={styles.saillieRow}>
            <Text style={[styles.saillieLabel, { color: colors.textSecondary }]}>
              Mise bas prévue :
            </Text>
            <Text style={[styles.saillieValue, { color: colors.success }]}>
              {format(parseISO(item.date_mise_bas_prevue), 'dd MMM yyyy', { locale: fr })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderListe = () => (
    <FlatList
      data={sailliesPlanifiees || []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader()}
      renderItem={renderSaillieCard}
      contentContainerStyle={styles.listeContent}
      refreshControl={refreshControl}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucune saillie planifiée
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Générez un plan de saillies pour commencer
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
  infoBox: {
    marginBottom: 16,
    gap: 4,
  },
  infoText: {
    fontSize: 14,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
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
  buttonValidation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  validationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  validationBadgeText: {
    color: '#fff',
    fontSize: 12,
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
  miniSaillieCard: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
    marginBottom: 4,
  },
  miniSaillieText: {
    fontSize: 13,
  },
  listeContent: {
    paddingBottom: 16,
  },
  saillieCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  saillieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saillieHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saillieDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  saillieStatut: {
    fontSize: 12,
  },
  saillieBody: {
    gap: 8,
  },
  saillieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saillieLabel: {
    fontSize: 14,
  },
  saillieValue: {
    fontSize: 14,
    fontWeight: '500',
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
  },
});
