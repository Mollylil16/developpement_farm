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
  saveGestation, 
  loadGestations, 
  addSevrage 
} from '../store/slices/reproductionSlice';
import { StatCard, QuickActionButton, AlertItem, Section } from '../components/UIComponents';
import { CustomModal, FormField, TypeSelector } from '../components/UIComponents';
import { ValidationFormulaires } from '../utils/validation';
import { CalculsAgricoles, UtilitairesDate } from '../utils/calculs';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { Gestation, Sevrage, Porc } from '../types';

const ReproductionScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { gestations, sevrages, loading, error } = useSelector((state: RootState) => state.reproduction);
  const { porcs } = useSelector((state: RootState) => state.porcs);

  const [showGestationModal, setShowGestationModal] = useState(false);
  const [showSevrageModal, setShowSevrageModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState<'gestations' | 'sevrages' | 'calendar'>('gestations');

  // État pour le formulaire de gestation
  const [gestationForm, setGestationForm] = useState({
    truieId: '',
    nombrePorceletsPrevu: '',
    notes: '',
  });

  // État pour le formulaire de sevrage
  const [sevrageForm, setSevrageForm] = useState({
    porceletId: '',
    poidsSevrage: '',
    alimentation: '',
    notes: '',
  });

  // États d'erreur
  const [gestationErrors, setGestationErrors] = useState<Record<string, string>>({});
  const [sevrageErrors, setSevrageErrors] = useState<Record<string, string>>({});

  // Charger les données au montage
  useEffect(() => {
    dispatch(loadGestations());
  }, [dispatch]);

  const truies = porcs.filter(porc => porc.sexe === 'femelle' && porc.statut === 'reproduction');
  const porcelets = porcs.filter(porc => porc.statut === 'sevrage');

  // Fonctions de gestion avec validation
  const handleAddGestation = async () => {
    const validation = ValidationFormulaires.validerGestation(gestationForm);
    
    if (!validation.isValid) {
      setGestationErrors(validation.errors);
      return;
    }

    setGestationErrors({});
    
    try {
      const gestationData = ValidationFormulaires.formaterGestation(gestationForm);
      await dispatch(saveGestation(gestationData)).unwrap();
      
      setShowGestationModal(false);
      setGestationForm({
        truieId: '',
        nombrePorceletsPrevu: '',
        notes: '',
      });
      
      Alert.alert('Succès', 'Gestation ajoutée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde de la gestation');
    }
  };

  const handleAddSevrage = async () => {
    if (!sevrageForm.porceletId || !sevrageForm.poidsSevrage) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const sevrageData: Sevrage = {
        id: ValidationFormulaires.genererId(),
        porceletId: sevrageForm.porceletId,
        dateSevrage: new Date(),
        poidsSevrage: parseFloat(sevrageForm.poidsSevrage),
        alimentation: sevrageForm.alimentation,
        notes: sevrageForm.notes,
      };

      dispatch(addSevrage(sevrageData));
      
      setShowSevrageModal(false);
      setSevrageForm({
        porceletId: '',
        poidsSevrage: '',
        alimentation: '',
        notes: '',
      });
      
      Alert.alert('Succès', 'Sevrage ajouté avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de l\'ajout du sevrage');
    }
  };

  // Calculs pour les statistiques
  const gestationsEnCours = gestations.filter(g => g.statut === 'en_cours').length;
  const gestationsTerminees = gestations.filter(g => g.statut === 'terminee').length;
  const totalPorceletsSevres = sevrages.length;
  const moyennePorceletsParGestation = gestations.length > 0 
    ? gestations.reduce((sum, g) => sum + g.nombrePorceletsPrevu, 0) / gestations.length 
    : 0;

  const GestationCard = ({ gestation }: { gestation: Gestation }) => {
    const truie = porcs.find(p => p.id === gestation.truieId);
    const joursRestants = Math.ceil((gestation.dateMiseBasPrevue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {truie?.numeroIdentification || 'Truie inconnue'}
          </Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: joursRestants <= 7 ? '#FF5722' : '#4CAF50' }
          ]}>
            <Text style={styles.statusText}>
              {joursRestants > 0 ? `${joursRestants} jours` : 'En retard'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>
          {gestation.nombrePorceletsPrevu} porcelets prévus
        </Text>
        <Text style={styles.cardDate}>
          Mise bas prévue : {gestation.dateMiseBasPrevue.toLocaleDateString()}
        </Text>
        {gestation.notes && (
          <Text style={styles.cardNotes}>{gestation.notes}</Text>
        )}
      </View>
    );
  };

  const SevrageCard = ({ sevrage }: { sevrage: Sevrage }) => {
    const porcelet = porcs.find(p => p.id === sevrage.porceletId);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {porcelet?.numeroIdentification || 'Porcelet inconnu'}
          </Text>
          <Text style={styles.cardDate}>
            {sevrage.dateSevrage.toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.cardSubtitle}>
          Poids : {sevrage.poidsSevrage} kg
        </Text>
        {sevrage.alimentation && (
          <Text style={styles.cardSubtitle}>
            Alimentation : {sevrage.alimentation}
          </Text>
        )}
        {sevrage.notes && (
          <Text style={styles.cardNotes}>{sevrage.notes}</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header avec statistiques */}
      <View style={styles.header}>
        <Text style={styles.title}>Reproduction</Text>
        <Text style={styles.subtitle}>Gestion des gestations et sevrages</Text>
      </View>

      {/* Statistiques principales */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Gestations en cours"
          value={gestationsEnCours.toString()}
          icon="pregnant-woman"
          color="#FF9800"
          onPress={() => setActiveTab('gestations')}
        />
        <StatCard
          title="Gestations terminées"
          value={gestationsTerminees.toString()}
          icon="check-circle"
          color="#4CAF50"
          onPress={() => setActiveTab('gestations')}
        />
        <StatCard
          title="Porcelets sevrés"
          value={totalPorceletsSevres.toString()}
          icon="child-care"
          color="#2196F3"
          onPress={() => setActiveTab('sevrages')}
        />
        <StatCard
          title="Moyenne porcelets"
          value={moyennePorceletsParGestation.toFixed(1)}
          icon="analytics"
          color="#9C27B0"
          onPress={() => setActiveTab('gestations')}
        />
      </View>

      {/* Actions rapides */}
      <Section title="Actions rapides">
        <View style={styles.quickActions}>
          <QuickActionButton
            title="Nouvelle Gestation"
            icon="add-circle"
            onPress={() => setShowGestationModal(true)}
            color="#FF9800"
          />
          <QuickActionButton
            title="Nouveau Sevrage"
            icon="child-care"
            onPress={() => setShowSevrageModal(true)}
            color="#2196F3"
          />
          <QuickActionButton
            title="Calendrier"
            icon="calendar-today"
            onPress={() => setActiveTab('calendar')}
            color="#4CAF50"
          />
        </View>
      </Section>

      {/* Navigation par onglets */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gestations' && styles.activeTab]}
          onPress={() => setActiveTab('gestations')}
        >
          <Text style={[styles.tabText, activeTab === 'gestations' && styles.activeTabText]}>
            Gestations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sevrages' && styles.activeTab]}
          onPress={() => setActiveTab('sevrages')}
        >
          <Text style={[styles.tabText, activeTab === 'sevrages' && styles.activeTabText]}>
            Sevrages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calendar' && styles.activeTab]}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>
            Calendrier
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu selon l'onglet actif */}
      <View style={styles.content}>
        {activeTab === 'gestations' && (
          <Section title="Gestations en cours">
            {gestations.filter(g => g.statut === 'en_cours').map(gestation => (
              <GestationCard key={gestation.id} gestation={gestation} />
            ))}
            {gestations.filter(g => g.statut === 'en_cours').length === 0 && (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="pregnant-woman" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Aucune gestation en cours</Text>
              </View>
            )}
          </Section>
        )}

        {activeTab === 'sevrages' && (
          <Section title="Sevrages récents">
            {sevrages.slice(-10).map(sevrage => (
              <SevrageCard key={sevrage.id} sevrage={sevrage} />
            ))}
            {sevrages.length === 0 && (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="child-care" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Aucun sevrage enregistré</Text>
              </View>
            )}
          </Section>
        )}

        {activeTab === 'calendar' && (
          <Section title="Calendrier des gestations">
            <Calendar
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: '#FF9800' },
                ...gestations.reduce((acc, g) => {
                  const dateKey = g.dateMiseBasPrevue.toISOString().split('T')[0];
                  acc[dateKey] = { marked: true, dotColor: '#FF9800' };
                  return acc;
                }, {} as any)
              }}
              theme={{
                selectedDayBackgroundColor: '#FF9800',
                todayTextColor: '#FF9800',
                dayTextColor: '#333',
                textDisabledColor: '#ccc',
              }}
            />
          </Section>
        )}
      </View>

      {/* Modales */}
      <CustomModal
        visible={showGestationModal}
        title="Nouvelle Gestation"
        onClose={() => setShowGestationModal(false)}
        onSave={handleAddGestation}
      >
        <TypeSelector
          label="Truie"
          value={gestationForm.truieId}
          options={truies.map(t => ({
            value: t.id,
            label: `${t.numeroIdentification} - ${t.race}`
          }))}
          onSelect={(value) => setGestationForm({...gestationForm, truieId: value})}
          required
        />
        <FormField
          label="Nombre de porcelets prévu"
          value={gestationForm.nombrePorceletsPrevu}
          onChangeText={(text) => setGestationForm({...gestationForm, nombrePorceletsPrevu: text})}
          placeholder="Ex: 12"
          keyboardType="numeric"
          required
          error={gestationErrors.nombrePorceletsPrevu}
        />
        <FormField
          label="Notes"
          value={gestationForm.notes}
          onChangeText={(text) => setGestationForm({...gestationForm, notes: text})}
          placeholder="Notes additionnelles..."
          multiline
        />
      </CustomModal>

      <CustomModal
        visible={showSevrageModal}
        title="Nouveau Sevrage"
        onClose={() => setShowSevrageModal(false)}
        onSave={handleAddSevrage}
      >
        <TypeSelector
          label="Porcelet"
          value={sevrageForm.porceletId}
          options={porcelets.map(p => ({
            value: p.id,
            label: `${p.numeroIdentification} - ${p.poidsActuel}kg`
          }))}
          onSelect={(value) => setSevrageForm({...sevrageForm, porceletId: value})}
          required
        />
        <FormField
          label="Poids au sevrage (kg)"
          value={sevrageForm.poidsSevrage}
          onChangeText={(text) => setSevrageForm({...sevrageForm, poidsSevrage: text})}
          placeholder="Ex: 8.5"
          keyboardType="numeric"
          required
        />
        <FormField
          label="Type d'alimentation"
          value={sevrageForm.alimentation}
          onChangeText={(text) => setSevrageForm({...sevrageForm, alimentation: text})}
          placeholder="Ex: Aliment starter"
        />
        <FormField
          label="Notes"
          value={sevrageForm.notes}
          onChangeText={(text) => setSevrageForm({...sevrageForm, notes: text})}
          placeholder="Notes additionnelles..."
          multiline
        />
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
    backgroundColor: '#FF9800',
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
  cardDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  cardNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
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
  },
});

export default ReproductionScreen;