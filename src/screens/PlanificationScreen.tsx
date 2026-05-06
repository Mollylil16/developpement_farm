import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { 
  creerPlanification, 
  mettreAJourSaillie, 
  setPlanificationActive 
} from '../store/slices/planificationSlice';
import { StatCard, QuickActionButton, Section } from '../components/UIComponents';
import { CustomModal, FormField, TypeSelector } from '../components/UIComponents';
import { CalculsAgricoles } from '../utils/calculs';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { PlanificationAccouplement, SailliePlanifiee, ObjectifReproduction, Porc } from '../types';

const PlanificationScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accouplements: planifications, planificationActive, loading, error } = useSelector((state: RootState) => state.planification);
  const { porcs } = useSelector((state: RootState) => state.porcs);

  const [showPlanificationModal, setShowPlanificationModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'planifications' | 'calendrier' | 'statistiques'>('planifications');
  const [selectedDate, setSelectedDate] = useState('');

  // État pour le formulaire de planification
  const [planificationForm, setPlanificationForm] = useState({
    nom: '',
    nombrePorcsCible: '',
    nombreMisesBasMinimum: '',
    nombreMoyenPorceletsParMiseBas: '12',
    dateDebut: '',
    dateFin: '',
    intervalleEntreSaillies: '21',
    dureeGestation: '114',
  });

  // États d'erreur
  const [planificationErrors, setPlanificationErrors] = useState<Record<string, string>>({});

  const truies = porcs.filter(porc => porc.sexe === 'femelle' && porc.statut === 'reproduction');
  const verrats = porcs.filter(porc => porc.sexe === 'male' && porc.statut === 'reproduction');

  // Calculs pour les statistiques
  const totalPlanifications = planifications.length;
  const planificationsActives = planifications.filter(p => p.statut === 'en_cours').length;
  const planificationsTerminees = planifications.filter(p => p.statut === 'termine').length;
  const sailliesPlanifiees = planifications.reduce((sum, p) => sum + p.saillies.length, 0);

  // Fonctions de gestion
  const handleCreerPlanification = async () => {
    const errors: Record<string, string> = {};

    if (!planificationForm.nom.trim()) {
      errors.nom = 'Le nom de la planification est requis';
    }

    if (!planificationForm.nombrePorcsCible || isNaN(parseInt(planificationForm.nombrePorcsCible))) {
      errors.nombrePorcsCible = 'Le nombre de porcs cible doit être un nombre valide';
    } else if (parseInt(planificationForm.nombrePorcsCible) <= 0) {
      errors.nombrePorcsCible = 'Le nombre de porcs cible doit être positif';
    }

    if (!planificationForm.nombreMisesBasMinimum || isNaN(parseInt(planificationForm.nombreMisesBasMinimum))) {
      errors.nombreMisesBasMinimum = 'Le nombre minimum de mises bas doit être un nombre valide';
    } else if (parseInt(planificationForm.nombreMisesBasMinimum) <= 0) {
      errors.nombreMisesBasMinimum = 'Le nombre minimum de mises bas doit être positif';
    }

    if (!planificationForm.nombreMoyenPorceletsParMiseBas || isNaN(parseInt(planificationForm.nombreMoyenPorceletsParMiseBas))) {
      errors.nombreMoyenPorceletsParMiseBas = 'Le nombre moyen de porcelets doit être un nombre valide';
    } else if (parseInt(planificationForm.nombreMoyenPorceletsParMiseBas) <= 0 || parseInt(planificationForm.nombreMoyenPorceletsParMiseBas) > 20) {
      errors.nombreMoyenPorceletsParMiseBas = 'Le nombre moyen de porcelets doit être entre 1 et 20';
    }

    if (!planificationForm.dateDebut) {
      errors.dateDebut = 'La date de début est requise';
    }

    if (!planificationForm.dateFin) {
      errors.dateFin = 'La date de fin est requise';
    }

    if (planificationForm.dateDebut && planificationForm.dateFin && 
        new Date(planificationForm.dateDebut) >= new Date(planificationForm.dateFin)) {
      errors.dateFin = 'La date de fin doit être postérieure à la date de début';
    }

    if (Object.keys(errors).length > 0) {
      setPlanificationErrors(errors);
      return;
    }

    setPlanificationErrors({});

    try {
      const objectif: ObjectifReproduction = {
        nombrePorcsCible: parseInt(planificationForm.nombrePorcsCible),
        nombreMisesBasMinimum: parseInt(planificationForm.nombreMisesBasMinimum),
        nombreMoyenPorceletsParMiseBas: parseInt(planificationForm.nombreMoyenPorceletsParMiseBas),
        periodePlanification: {
          debut: new Date(planificationForm.dateDebut).toISOString(),
          fin: new Date(planificationForm.dateFin).toISOString(),
        },
        intervalleEntreSaillies: parseInt(planificationForm.intervalleEntreSaillies),
        dureeGestation: parseInt(planificationForm.dureeGestation),
      };

      await dispatch(creerPlanification({ objectif, truies, verrats })).unwrap();
      
      setShowPlanificationModal(false);
      setPlanificationForm({
        nom: '',
        nombrePorcsCible: '',
        nombreMisesBasMinimum: '',
        nombreMoyenPorceletsParMiseBas: '12',
        dateDebut: '',
        dateFin: '',
        intervalleEntreSaillies: '21',
        dureeGestation: '114',
      });
      
      Alert.alert('Succès', 'Planification créée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la création de la planification');
    }
  };

  const handleMettreAJourSaillie = async (planificationId: string, saillieId: string, statut: 'realise' | 'annule') => {
    try {
      await dispatch(mettreAJourSaillie({ planificationId, saillieId, statut })).unwrap();
      Alert.alert('Succès', 'Saillie mise à jour avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la mise à jour de la saillie');
    }
  };

  const PlanificationCard = ({ planification }: { planification: PlanificationAccouplement }) => {
    const stats = CalculsAgricoles.analyserPlanification(planification);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{planification.nom}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: planification.statut === 'en_cours' ? '#4CAF50' : '#FF9800' }
          ]}>
            <Text style={styles.statusText}>{planification.statut}</Text>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>
          Objectif: {planification.objectifPorcs} porcs
        </Text>
        <Text style={styles.cardSubtitle}>
          Saillies: {stats.sailliesPlanifiees} planifiées, {stats.sailliesRealisees} réalisées
        </Text>
        <Text style={styles.cardSubtitle}>
          Période: {new Date(planification.dateDebut).toLocaleDateString()} - {new Date(planification.dateFin).toLocaleDateString()}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => dispatch(setPlanificationActive(planification))}
          >
            <MaterialIcons name="visibility" size={16} color="#2196F3" />
            <Text style={styles.actionButtonText}>Voir détails</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setActiveTab('calendrier')}
          >
            <MaterialIcons name="calendar-today" size={16} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Calendrier</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const SaillieCard = ({ saillie }: { saillie: SailliePlanifiee }) => {
    const truie = porcs.find(p => p.id === saillie.truieId);
    const verrat = porcs.find(p => p.id === saillie.verratId);
    
    return (
      <View style={styles.saillieCard}>
        <View style={styles.saillieHeader}>
          <Text style={styles.saillieTitle}>
            {truie?.numeroIdentification || 'Truie inconnue'} × {verrat?.numeroIdentification || 'Verrat inconnu'}
          </Text>
          <View style={[
            styles.saillieStatusBadge,
            { backgroundColor: saillie.statut === 'realise' ? '#4CAF50' : '#FF9800' }
          ]}>
            <Text style={styles.saillieStatusText}>{saillie.statut}</Text>
          </View>
        </View>
        <Text style={styles.saillieDate}>
          Saillie: {new Date(saillie.dateSaillie).toLocaleDateString()}
        </Text>
        <Text style={styles.saillieDate}>
          Mise bas prévue: {new Date(saillie.dateMiseBasPrevue).toLocaleDateString()}
        </Text>
        {saillie.statut === 'planifie' && (
          <View style={styles.saillieActions}>
            <TouchableOpacity
              style={[styles.saillieActionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleMettreAJourSaillie(planificationActive!.id, saillie.id, 'realise')}
            >
              <MaterialIcons name="check" size={16} color="#fff" />
              <Text style={styles.saillieActionButtonText}>Réalisée</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saillieActionButton, { backgroundColor: '#F44336' }]}
              onPress={() => handleMettreAJourSaillie(planificationActive!.id, saillie.id, 'annule')}
            >
              <MaterialIcons name="close" size={16} color="#fff" />
              <Text style={styles.saillieActionButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const genererCalendrierMarque = () => {
    if (!planificationActive) return {};
    
    return CalculsAgricoles.genererCalendrierSaillies(planificationActive);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Planification des Accouplements</Text>
        <Text style={styles.subtitle}>Calendrier des saillies et objectifs de reproduction</Text>
      </View>

      {/* Statistiques principales */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Planifications"
          value={totalPlanifications.toString()}
          icon="assignment"
          color="#2196F3"
          onPress={() => setActiveTab('planifications')}
        />
        <StatCard
          title="Actives"
          value={planificationsActives.toString()}
          icon="play-circle"
          color="#4CAF50"
          onPress={() => setActiveTab('planifications')}
        />
        <StatCard
          title="Terminées"
          value={planificationsTerminees.toString()}
          icon="check-circle"
          color="#FF9800"
          onPress={() => setActiveTab('statistiques')}
        />
        <StatCard
          title="Saillies"
          value={sailliesPlanifiees.toString()}
          icon="pets"
          color="#9C27B0"
          onPress={() => setActiveTab('calendrier')}
        />
      </View>

      {/* Actions rapides */}
      <Section title="Actions rapides">
        <View style={styles.quickActions}>
          <QuickActionButton
            title="Nouvelle Planification"
            icon="add-circle"
            onPress={() => setShowPlanificationModal(true)}
            color="#2196F3"
          />
          <QuickActionButton
            title="Calendrier"
            icon="calendar-today"
            onPress={() => setActiveTab('calendrier')}
            color="#4CAF50"
          />
          <QuickActionButton
            title="Statistiques"
            icon="analytics"
            onPress={() => setActiveTab('statistiques')}
            color="#FF9800"
          />
        </View>
      </Section>

      {/* Navigation par onglets */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'planifications' && styles.activeTab]}
          onPress={() => setActiveTab('planifications')}
        >
          <Text style={[styles.tabText, activeTab === 'planifications' && styles.activeTabText]}>
            Planifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calendrier' && styles.activeTab]}
          onPress={() => setActiveTab('calendrier')}
        >
          <Text style={[styles.tabText, activeTab === 'calendrier' && styles.activeTabText]}>
            Calendrier
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'statistiques' && styles.activeTab]}
          onPress={() => setActiveTab('statistiques')}
        >
          <Text style={[styles.tabText, activeTab === 'statistiques' && styles.activeTabText]}>
            Statistiques
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu selon l'onglet actif */}
      <View style={styles.content}>
        {activeTab === 'planifications' && (
          <Section title="Planifications disponibles">
            {planifications.map(planification => (
              <PlanificationCard key={planification.id} planification={planification} />
            ))}
            {planifications.length === 0 && (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="assignment" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Aucune planification disponible</Text>
              </View>
            )}
          </Section>
        )}

        {activeTab === 'calendrier' && (
          <Section title="Calendrier des saillies">
            {planificationActive ? (
              <View>
                <Text style={styles.calendarTitle}>{planificationActive.nom}</Text>
                <Calendar
                  onDayPress={(day) => setSelectedDate(day.dateString)}
                  markedDates={{
                    [selectedDate]: { selected: true, selectedColor: '#2196F3' },
                    ...genererCalendrierMarque()
                  }}
                  theme={{
                    selectedDayBackgroundColor: '#2196F3',
                    todayTextColor: '#2196F3',
                    dayTextColor: '#333',
                    textDisabledColor: '#ccc',
                  }}
                />
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.legendText}>Saillies</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.legendText}>Mises bas</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="calendar-today" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Sélectionnez une planification pour voir le calendrier</Text>
              </View>
            )}
          </Section>
        )}

        {activeTab === 'statistiques' && planificationActive && (
          <Section title="Détails de la planification">
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>{planificationActive.nom}</Text>
              <Text style={styles.detailsSubtitle}>
                Objectif: {planificationActive.objectifPorcs} porcs
              </Text>
              
              {planificationActive.saillies.map(saillie => (
                <SaillieCard key={saillie.id} saillie={saillie} />
              ))}
            </View>
          </Section>
        )}
      </View>

      {/* Modal de création de planification */}
      <CustomModal
        visible={showPlanificationModal}
        title="Nouvelle Planification"
        onClose={() => setShowPlanificationModal(false)}
        onSave={handleCreerPlanification}
      >
        <FormField
          label="Nom de la planification"
          value={planificationForm.nom}
          onChangeText={(text) => setPlanificationForm({...planificationForm, nom: text})}
          placeholder="Ex: Planification Q1 2024"
          required
          error={planificationErrors.nom}
        />
        
        <FormField
          label="Nombre de porcs cible"
          value={planificationForm.nombrePorcsCible}
          onChangeText={(text) => setPlanificationForm({...planificationForm, nombrePorcsCible: text})}
          placeholder="Ex: 120"
          keyboardType="numeric"
          required
          error={planificationErrors.nombrePorcsCible}
        />
        
        <FormField
          label="Nombre minimum de mises bas"
          value={planificationForm.nombreMisesBasMinimum}
          onChangeText={(text) => setPlanificationForm({...planificationForm, nombreMisesBasMinimum: text})}
          placeholder="Ex: 10"
          keyboardType="numeric"
          required
          error={planificationErrors.nombreMisesBasMinimum}
        />
        
        <FormField
          label="Nombre moyen de porcelets par mise bas"
          value={planificationForm.nombreMoyenPorceletsParMiseBas}
          onChangeText={(text) => setPlanificationForm({...planificationForm, nombreMoyenPorceletsParMiseBas: text})}
          placeholder="Ex: 12"
          keyboardType="numeric"
          required
          error={planificationErrors.nombreMoyenPorceletsParMiseBas}
        />
        
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <FormField
              label="Date de début"
              value={planificationForm.dateDebut}
              onChangeText={(text) => setPlanificationForm({...planificationForm, dateDebut: text})}
              placeholder="YYYY-MM-DD"
              required
              error={planificationErrors.dateDebut}
            />
          </View>
          <View style={styles.dateField}>
            <FormField
              label="Date de fin"
              value={planificationForm.dateFin}
              onChangeText={(text) => setPlanificationForm({...planificationForm, dateFin: text})}
              placeholder="YYYY-MM-DD"
              required
              error={planificationErrors.dateFin}
            />
          </View>
        </View>
        
        <View style={styles.paramRow}>
          <View style={styles.paramField}>
            <FormField
              label="Intervalle (jours)"
              value={planificationForm.intervalleEntreSaillies}
              onChangeText={(text) => setPlanificationForm({...planificationForm, intervalleEntreSaillies: text})}
              placeholder="21"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.paramField}>
            <FormField
              label="Durée gestation (jours)"
              value={planificationForm.dureeGestation}
              onChangeText={(text) => setPlanificationForm({...planificationForm, dureeGestation: text})}
              placeholder="114"
              keyboardType="numeric"
            />
          </View>
        </View>
      </CustomModal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    padding: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  saillieCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  saillieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  saillieTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  saillieDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  saillieStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saillieStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  saillieActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  saillieActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  saillieActionButtonText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  detailsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  paramRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paramField: {
    flex: 1,
  },
});

export default PlanificationScreen;
