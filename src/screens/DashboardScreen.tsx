import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { calculateAlertes } from '../store/slices/alertesSlice';
import { savePorc, loadPorcs } from '../store/slices/porcsSlice';
import { saveGestation, loadGestations } from '../store/slices/reproductionSlice';
import { saveTransaction } from '../store/slices/financeSlice';
import { StatCard, QuickActionButton, AlertItem, Section } from '../components/UIComponents';
import { CustomModal, FormField, TypeSelector } from '../components/UIComponents';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/LoadingStates';
import { ValidationFormulaires } from '../utils/validation';
import { useEnregistrerActivite } from '../hooks/useCollaboration';
import { useAsync } from '../hooks/useAsyncStates';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart } from 'react-native-chart-kit';
import { Porc, Gestation, Transaction } from '../types';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  
  const { porcs } = useSelector((state: RootState) => state.porcs);
  const { gestations } = useSelector((state: RootState) => state.reproduction);
  const { transactions } = useSelector((state: RootState) => state.finance);
  const { alertes } = useSelector((state: RootState) => state.alertes);
  const { deviseConfig } = useSelector((state: RootState) => state.parametres);
  const { activites } = useSelector((state: RootState) => state.collaboration);

  // Hook pour enregistrer les activités
  const enregistrerActivitePorc = useEnregistrerActivite('ajout', 'porc', 'Nouveau porc ajouté');
  const enregistrerActiviteGestation = useEnregistrerActivite('ajout', 'gestation', 'Nouvelle gestation enregistrée');
  const enregistrerActiviteTransaction = useEnregistrerActivite('ajout', 'finance', 'Nouvelle transaction enregistrée');

  const [showNewPorcModal, setShowNewPorcModal] = useState(false);
  const [showNewGestationModal, setShowNewGestationModal] = useState(false);
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  
  const [porcForm, setPorcForm] = useState({
    numeroIdentification: '',
    sexe: 'male',
    race: '',
    poidsActuel: '',
    poidsCible: '',
    statut: 'croissance',
  });

  const [gestationForm, setGestationForm] = useState({
    truieId: '',
    nombrePorceletsPrevu: '',
    notes: '',
  });

  const [transactionForm, setTransactionForm] = useState({
    type: 'vente',
    montant: '',
    description: '',
    categorie: '',
  });

  // États d'erreur pour les formulaires
  const [porcErrors, setPorcErrors] = useState<Record<string, string>>({});
  const [gestationErrors, setGestationErrors] = useState<Record<string, string>>({});
  const [transactionErrors, setTransactionErrors] = useState<Record<string, string>>({});

  // Charger les données au montage
  useEffect(() => {
    dispatch(loadPorcs());
    dispatch(loadGestations());
  }, [dispatch]);

  // Calculer les alertes au chargement
  useEffect(() => {
    dispatch(calculateAlertes({ porcs, gestations, transactions }));
  }, [dispatch, porcs, gestations, transactions]);

  // Fonctions pour les actions rapides
  const handleNouveauPorc = () => {
    setShowNewPorcModal(true);
  };

  const handleNouvelleGestation = () => {
    setShowNewGestationModal(true);
  };

  const handleCalculerRation = () => {
    navigation.navigate('Nutrition' as never);
  };

  const handleNouvelleVente = () => {
    setShowNewTransactionModal(true);
  };

  const handleVoirReproduction = () => {
    navigation.navigate('Reproduction' as never);
  };

  const handleVoirFinance = () => {
    navigation.navigate('Finance' as never);
  };

  const handleVoirRapports = () => {
    navigation.navigate('Reports' as never);
  };

  // Fonctions de sauvegarde avec validation
  const saveNouveauPorc = async () => {
    const validation = ValidationFormulaires.validerPorc(porcForm);
    
    if (!validation.isValid) {
      setPorcErrors(validation.errors);
      return;
    }

    setPorcErrors({});
    
    try {
      const porcData = ValidationFormulaires.formaterPorc(porcForm);
      await dispatch(savePorc(porcData)).unwrap();
      
      // Enregistrer l'activité
      enregistrerActivitePorc();
      
      setShowNewPorcModal(false);
      setPorcForm({
        numeroIdentification: '',
        sexe: 'male',
        race: '',
        poidsActuel: '',
        poidsCible: '',
        statut: 'croissance',
      });
      
      Alert.alert('Succès', 'Porc ajouté avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde du porc');
    }
  };

  const saveNouvelleGestation = async () => {
    const validation = ValidationFormulaires.validerGestation(gestationForm);
    
    if (!validation.isValid) {
      setGestationErrors(validation.errors);
      return;
    }

    setGestationErrors({});
    
    try {
      const gestationData = ValidationFormulaires.formaterGestation(gestationForm);
      await dispatch(saveGestation(gestationData)).unwrap();
      
      // Enregistrer l'activité
      enregistrerActiviteGestation();
      
      setShowNewGestationModal(false);
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

  const saveNouvelleTransaction = async () => {
    const validation = ValidationFormulaires.validerTransaction(transactionForm);
    
    if (!validation.isValid) {
      setTransactionErrors(validation.errors);
      return;
    }

    setTransactionErrors({});
    
    try {
      const transactionData = ValidationFormulaires.formaterTransaction(transactionForm);
      await dispatch(saveTransaction(transactionData)).unwrap();
      
      // Enregistrer l'activité
      enregistrerActiviteTransaction();
      
      setShowNewTransactionModal(false);
      setTransactionForm({
        type: 'vente',
        montant: '',
        description: '',
        categorie: '',
      });
      
      Alert.alert('Succès', 'Transaction ajoutée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde de la transaction');
    }
  };

  // Calculs pour le dashboard
  const totalPorcs = porcs.length;
  const truiesGestantes = gestations.filter((g: Gestation) => g.statut === 'en_cours').length;
  const porcsEnCroissance = porcs.filter((p: Porc) => p.statut === 'croissance').length;
  const chiffreAffairesMois = transactions
    .filter((t: Transaction) => t.type === 'vente' && 
      new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum: number, t: Transaction) => sum + t.montant, 0);

  // Données pour le graphique de poids moyen
  const poidsMoyenParMois = [
    { month: 'Jan', poids: 45 },
    { month: 'Fév', poids: 52 },
    { month: 'Mar', poids: 48 },
    { month: 'Avr', poids: 55 },
    { month: 'Mai', poids: 58 },
    { month: 'Juin', poids: 62 },
  ];

  const chartData = {
    labels: poidsMoyenParMois.map(item => item.month),
    datasets: [
      {
        data: poidsMoyenParMois.map(item => item.poids),
        color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Fonctions utilitaires
  const getAvatarColor = (nom: string) => {
    const colors = ['#FF5722', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'];
    const index = nom.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // États de chargement et d'erreur
  const { loading: loadingPorcs, error: errorPorcs } = useSelector((state: RootState) => state.porcs);
  const { loading: loadingGestations, error: errorGestations } = useSelector((state: RootState) => state.reproduction);
  const { loading: loadingTransactions, error: errorTransactions } = useSelector((state: RootState) => state.finance);
  const { loading: loadingAlertes, error: errorAlertes } = useSelector((state: RootState) => state.alertes);

  const isLoading = loadingPorcs || loadingGestations || loadingTransactions || loadingAlertes;
  const hasError = errorPorcs || errorGestations || errorTransactions || errorAlertes;

  // Fonction de retry pour recharger les données
  const handleRetry = () => {
    dispatch(loadPorcs());
    dispatch(loadGestations());
    dispatch(calculateAlertes({ porcs, gestations, transactions }));
  };

  // Affichage des états de chargement et d'erreur
  if (isLoading && porcs.length === 0) {
    return <LoadingSpinner message="Chargement des données..." />;
  }

  if (hasError && porcs.length === 0) {
    return (
      <ErrorMessage 
        message={hasError} 
        onRetry={handleRetry}
        retryText="Recharger les données"
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bienvenue dans Fermier Pro</Text>
        <Text style={styles.subtitle}>Tableau de bord de votre élevage</Text>
      </View>

      {/* Statistiques principales */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Total Porcs"
          value={totalPorcs}
          icon="pets"
          color="#2E7D32"
          onPress={handleVoirReproduction}
        />
        <StatCard
          title="Gestations"
          value={truiesGestantes}
          icon="pregnant-woman"
          color="#FF9800"
          onPress={handleVoirReproduction}
        />
        <StatCard
          title="En Croissance"
          value={porcsEnCroissance}
          icon="trending-up"
          color="#2196F3"
          onPress={handleVoirReproduction}
        />
        <StatCard
          title="CA du Mois"
          value={`${chiffreAffairesMois.toLocaleString()} €`}
          icon="euro"
          color="#4CAF50"
          onPress={handleVoirFinance}
        />
      </View>

      {/* Graphique de poids moyen */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Poids Moyen Mensuel (kg)</Text>
        <LineChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#2E7D32',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Actions rapides */}
      <Section title="Actions Rapides">
        <View style={styles.quickActions}>
          <QuickActionButton
            title="Nouveau Porc"
            icon="add"
            color="#2E7D32"
            onPress={handleNouveauPorc}
          />
          <QuickActionButton
            title="Nouvelle Gestation"
            icon="pregnant-woman"
            color="#FF9800"
            onPress={handleNouvelleGestation}
          />
          <QuickActionButton
            title="Calculer Ration"
            icon="restaurant"
            color="#2196F3"
            onPress={handleCalculerRation}
          />
          <QuickActionButton
            title="Nouvelle Vente"
            icon="euro"
            color="#4CAF50"
            onPress={handleNouvelleVente}
          />
        </View>
      </Section>

      {/* Alertes dynamiques */}
      {/* Activités récentes */}
      {activites.length > 0 && (
        <Section title="Activités Récentes" action={{ text: 'Voir tout', onPress: () => navigation.navigate('Collaboration' as never) }}>
          {activites.slice(0, 3).map((activite) => (
            <View key={activite.id} style={styles.activiteItem}>
              <View style={styles.activiteHeader}>
                <View style={[styles.activiteAvatar, { backgroundColor: getAvatarColor(activite.utilisateurNom) }]}>
                  <Text style={styles.activiteAvatarText}>
                    {activite.utilisateurNom.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.activiteInfo}>
                  <Text style={styles.activiteUtilisateur}>{activite.utilisateurNom}</Text>
                  <Text style={styles.activiteDescription}>{activite.description}</Text>
                </View>
                <Text style={styles.activiteDate}>
                  {activite.date.toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ))}
        </Section>
      )}

      <Section title="Alertes" action={{ text: 'Voir tout', onPress: () => {} }}>
        {alertes.slice(0, 3).map((alerte) => (
          <AlertItem
            key={alerte.id}
            type={alerte.type}
            message={alerte.message}
          />
        ))}
        {alertes.length === 0 && (
          <View style={styles.noAlertsContainer}>
            <Icon name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.noAlertsText}>Aucune alerte pour le moment</Text>
          </View>
        )}
      </Section>

      {/* Modales */}
      <CustomModal
        visible={showNewPorcModal}
        title="Nouveau Porc"
        onClose={() => setShowNewPorcModal(false)}
        onSave={saveNouveauPorc}
      >
        <FormField
          label="Numéro d'identification"
          value={porcForm.numeroIdentification}
          onChangeText={(text) => setPorcForm({...porcForm, numeroIdentification: text})}
          placeholder="Ex: PORC001"
          required
          error={porcErrors.numeroIdentification}
        />
        <TypeSelector
          label="Sexe"
          value={porcForm.sexe}
          options={[
            { value: 'male', label: 'Mâle' },
            { value: 'femelle', label: 'Femelle' }
          ]}
          onSelect={(value) => setPorcForm({...porcForm, sexe: value})}
          required
        />
        <FormField
          label="Race"
          value={porcForm.race}
          onChangeText={(text) => setPorcForm({...porcForm, race: text})}
          placeholder="Ex: Pietrain, Landrace"
          required
          error={porcErrors.race}
        />
        <FormField
          label="Poids actuel (kg)"
          value={porcForm.poidsActuel}
          onChangeText={(text) => setPorcForm({...porcForm, poidsActuel: text})}
          placeholder="Ex: 25.5"
          keyboardType="numeric"
          required
          error={porcErrors.poidsActuel}
        />
        <FormField
          label="Poids cible (kg)"
          value={porcForm.poidsCible}
          onChangeText={(text) => setPorcForm({...porcForm, poidsCible: text})}
          placeholder="Ex: 120"
          keyboardType="numeric"
          required
          error={porcErrors.poidsCible}
        />
      </CustomModal>

      <CustomModal
        visible={showNewGestationModal}
        title="Nouvelle Gestation"
        onClose={() => setShowNewGestationModal(false)}
        onSave={saveNouvelleGestation}
      >
        <TypeSelector
          label="Truie"
          value={gestationForm.truieId}
          options={porcs.filter(p => p.sexe === 'femelle').map(p => ({
            value: p.id,
            label: `${p.numeroIdentification} - ${p.race}`
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
        visible={showNewTransactionModal}
        title="Nouvelle Transaction"
        onClose={() => setShowNewTransactionModal(false)}
        onSave={saveNouvelleTransaction}
      >
        <TypeSelector
          label="Type de transaction"
          value={transactionForm.type}
          options={[
            { value: 'vente', label: 'Vente' },
            { value: 'achat', label: 'Achat' },
            { value: 'depense', label: 'Dépense' },
            { value: 'recette', label: 'Recette' }
          ]}
          onSelect={(value) => setTransactionForm({...transactionForm, type: value})}
          required
        />
        <FormField
          label="Montant (€)"
          value={transactionForm.montant}
          onChangeText={(text) => setTransactionForm({...transactionForm, montant: text})}
          placeholder="Ex: 1500"
          keyboardType="numeric"
          required
          error={transactionErrors.montant}
        />
        <FormField
          label="Description"
          value={transactionForm.description}
          onChangeText={(text) => setTransactionForm({...transactionForm, description: text})}
          placeholder="Ex: Vente de 10 porcs"
          required
          error={transactionErrors.description}
        />
        <FormField
          label="Catégorie"
          value={transactionForm.categorie}
          onChangeText={(text) => setTransactionForm({...transactionForm, categorie: text})}
          placeholder="Ex: Vente porcs, Aliments"
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
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  chart: {
    borderRadius: 16,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  noAlertsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noAlertsText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 10,
  },
  activiteItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  activiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activiteAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activiteAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  activiteInfo: {
    flex: 1,
  },
  activiteUtilisateur: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  activiteDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activiteDate: {
    fontSize: 10,
    color: '#999',
  },
});

export default DashboardScreen;
