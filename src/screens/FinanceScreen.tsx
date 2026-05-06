import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { 
  addTransaction, 
  saveTransaction,
  loadTransactions,
  calculateRentabilite,
  generateAnalyseFinanciere
} from '../store/slices/financeSlice';
import { StatCard, QuickActionButton, Section } from '../components/UIComponents';
import { CalculsAgricoles } from '../utils/calculs';
import { AnalyseFinanciereComponent, RentabilitePorcsComponent } from '../components/FinanceComponents';
import DocumentManager from '../components/DocumentManager';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/LoadingStates';
import { MaterialIcons } from '@expo/vector-icons';
import { Transaction, DocumentFacture } from '../types';

const { width } = Dimensions.get('window');

const FinanceScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    transactions, 
    rentabilitePorcs, 
    analyseFinanciere, 
    loading, 
    error 
  } = useSelector((state: RootState) => state.finance);
  const { porcs } = useSelector((state: RootState) => state.porcs);
  const { deviseConfig } = useSelector((state: RootState) => state.parametres);

  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'rentabilite' | 'analyse'>('overview');
  const [transactionForm, setTransactionForm] = useState({
    type: 'vente',
    montant: '',
    description: '',
    categorie: '',
    porcId: '',
  });
  const [transactionErrors, setTransactionErrors] = useState<Record<string, string>>({});
  const [transactionDocuments, setTransactionDocuments] = useState<DocumentFacture[]>([]);

  // Charger les données au montage du composant
  useEffect(() => {
    dispatch(loadTransactions());
    dispatch(generateAnalyseFinanciere());
  }, [dispatch]);

  // Recalculer la rentabilité quand les porcs changent
  useEffect(() => {
    if (porcs.length > 0) {
      dispatch(calculateRentabilite(porcs));
    }
  }, [dispatch, porcs]);

  // Calculs financiers
  const recettesMois = transactions
    .filter((t: Transaction) => t.type === 'vente' && 
      new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum: number, t: Transaction) => sum + t.montant, 0);

  const depensesMois = transactions
    .filter((t: Transaction) => t.type === 'depense' && 
      new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum: number, t: Transaction) => sum + t.montant, 0);

  // Fonctions utilitaires
  const formaterMontant = (montant: number) => {
    return CalculsAgricoles.formaterMontant(montant, deviseConfig);
  };

  const beneficeMois = recettesMois - depensesMois;

  // Fonction de retry pour recharger les données
  const handleRetry = () => {
    dispatch(loadTransactions());
    dispatch(generateAnalyseFinanciere());
    if (porcs.length > 0) {
      dispatch(calculateRentabilite(porcs));
    }
  };

  // Affichage des états de chargement et d'erreur
  if (loading && transactions.length === 0) {
    return <LoadingSpinner message="Chargement des données financières..." />;
  }

  if (error && transactions.length === 0) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={handleRetry}
        retryText="Recharger les données"
      />
    );
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon="account-balance-wallet"
        title="Aucune transaction"
        message="Commencez par ajouter vos premières transactions financières"
        actionText="Ajouter une transaction"
        onAction={() => setShowNewTransaction(true)}
      />
    );
  }

  // Données pour les graphiques
  const ventesParMois = [
    { month: 'Jan', ventes: 15000 },
    { month: 'Fév', ventes: 18000 },
    { month: 'Mar', ventes: 12000 },
    { month: 'Avr', ventes: 22000 },
    { month: 'Mai', ventes: 19000 },
    { month: 'Juin', ventes: 25000 },
  ];

  const chartData = {
    labels: ventesParMois.map(item => item.month),
    datasets: [
      {
        data: ventesParMois.map(item => item.ventes),
        color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const barChartData = {
    labels: ['Recettes', 'Dépenses', 'Bénéfice'],
    datasets: [
      {
        data: [recettesMois, depensesMois, beneficeMois],
      },
    ],
  };

  const ajouterTransaction = async () => {
    if (!transactionForm.montant || !transactionForm.description) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const nouvelleTransaction: Transaction = {
      id: Date.now().toString(),
      type: transactionForm.type as any,
      montant: parseFloat(transactionForm.montant),
      date: new Date().toISOString(),
      description: transactionForm.description,
      categorie: transactionForm.categorie,
      porcId: transactionForm.porcId || undefined,
      documents: transactionDocuments.length > 0 ? transactionDocuments : undefined,
    };

    try {
      await dispatch(saveTransaction(nouvelleTransaction)).unwrap();
      setShowNewTransaction(false);
      setTransactionForm({ type: 'vente', montant: '', description: '', categorie: '', porcId: '' });
      setTransactionDocuments([]);
      Alert.alert('Succès', 'Transaction ajoutée avec succès');
      
      // Recalculer l'analyse financière
      dispatch(generateAnalyseFinanciere());
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde de la transaction');
    }
  };

  const TransactionCard = ({ transaction }: { transaction: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionType}>
          <MaterialIcons 
            name={
              transaction.type === 'vente' ? 'euro' :
              transaction.type === 'achat' ? 'shopping-cart' :
              transaction.type === 'depense' ? 'remove' : 'add'
            } 
            size={20} 
            color={
              transaction.type === 'vente' ? '#4CAF50' :
              transaction.type === 'achat' ? '#2196F3' :
              transaction.type === 'depense' ? '#FF5722' : '#FF9800'
            } 
          />
          <Text style={styles.transactionTypeText}>{transaction.type.toUpperCase()}</Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          { color: transaction.type === 'vente' ? '#4CAF50' : '#FF5722' }
        ]}>
          {transaction.type === 'vente' ? '+' : '-'}{formaterMontant(transaction.montant)}
        </Text>
      </View>
      <Text style={styles.transactionDescription}>{transaction.description}</Text>
      <Text style={styles.transactionDate}>{new Date(transaction.date).toLocaleDateString()}</Text>
      {transaction.categorie && (
        <Text style={styles.transactionCategory}>Catégorie: {transaction.categorie}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion Financière</Text>
        <Text style={styles.headerSubtitle}>Suivi des recettes et dépenses</Text>
        
        {/* Onglets */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Vue d'ensemble
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'rentabilite' && styles.activeTab]}
            onPress={() => setActiveTab('rentabilite')}
          >
            <Text style={[styles.tabText, activeTab === 'rentabilite' && styles.activeTabText]}>
              Rentabilité
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'analyse' && styles.activeTab]}
            onPress={() => setActiveTab('analyse')}
          >
            <Text style={[styles.tabText, activeTab === 'analyse' && styles.activeTabText]}>
              Analyse
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {activeTab === 'overview' && (
          <>
            {/* Résumé financier */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
                <Text style={styles.summaryValue}>{formaterMontant(recettesMois)}</Text>
                <Text style={styles.summaryLabel}>Recettes du mois</Text>
              </View>
              <View style={styles.summaryCard}>
                <MaterialIcons name="trending-down" size={24} color="#FF5722" />
                <Text style={styles.summaryValue}>{formaterMontant(depensesMois)}</Text>
                <Text style={styles.summaryLabel}>Dépenses du mois</Text>
              </View>
              <View style={styles.summaryCard}>
                <MaterialIcons name="account-balance-wallet" size={24} color={beneficeMois >= 0 ? "#4CAF50" : "#FF5722"} />
                <Text style={[styles.summaryValue, { color: beneficeMois >= 0 ? "#4CAF50" : "#FF5722" }]}>
                  {formaterMontant(beneficeMois)}
                </Text>
                <Text style={styles.summaryLabel}>Bénéfice du mois</Text>
              </View>
            </View>

            {/* Transactions récentes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transactions Récentes ({transactions.length})</Text>
              {transactions.slice(-10).map((transaction: Transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </View>
          </>
        )}

        {activeTab === 'rentabilite' && analyseFinanciere && (
          <AnalyseFinanciereComponent analyse={analyseFinanciere} />
        )}

        {activeTab === 'analyse' && (
          <RentabilitePorcsComponent 
            rentabilitePorcs={rentabilitePorcs} 
            porcs={porcs} 
          />
        )}
      </ScrollView>

      {/* Bouton flottant pour nouvelle transaction */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setShowNewTransaction(true)}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal Nouvelle Transaction */}
      <View style={[styles.modal, { display: showNewTransaction ? 'flex' : 'none' }]}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle Transaction</Text>
            <TouchableOpacity onPress={() => setShowNewTransaction(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Type de transaction *</Text>
          <View style={styles.pickerContainer}>
            {['vente', 'achat', 'depense', 'recette'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerOption,
                  transactionForm.type === type && styles.pickerOptionSelected
                ]}
                onPress={() => setTransactionForm({...transactionForm, type})}
              >
                <Text style={styles.pickerOptionText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Montant ({deviseConfig.symbole}) *</Text>
          <TextInput
            style={styles.input}
            value={transactionForm.montant}
            onChangeText={(text) => setTransactionForm({...transactionForm, montant: text})}
            placeholder="Ex: 1500"
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={styles.input}
            value={transactionForm.description}
            onChangeText={(text) => setTransactionForm({...transactionForm, description: text})}
            placeholder="Ex: Vente de 10 porcs"
          />

          <Text style={styles.inputLabel}>Catégorie</Text>
          <TextInput
            style={styles.input}
            value={transactionForm.categorie}
            onChangeText={(text) => setTransactionForm({...transactionForm, categorie: text})}
            placeholder="Ex: Vente porcs, Aliments, Vétérinaire"
          />

          {/* Gestionnaire de documents pour les dépenses */}
          {(transactionForm.type === 'depense' || transactionForm.type === 'achat') && (
            <DocumentManager
              documents={transactionDocuments}
              onDocumentsChange={setTransactionDocuments}
              maxDocuments={3}
            />
          )}

          <TouchableOpacity style={styles.saveButton} onPress={ajouterTransaction}>
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
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
  actionButtons: {
    padding: 20,
    paddingTop: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  transactionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 5,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerOption: {
    padding: 10,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pickerOptionSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FinanceScreen;
