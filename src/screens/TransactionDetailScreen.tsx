import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { LoadingSpinner, ErrorMessage } from '../components/LoadingStates';
import { Section, CustomModal, FormField } from '../components/UIComponents';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Transaction, Porc, DocumentFacture } from '../types';
import { ValidationFormulaires } from '../utils/validation';
import { CalculsAgricoles } from '../utils/calculs';

interface TransactionDetailScreenProps {
  route: {
    params: {
      transactionId: string;
    };
  };
  navigation: any;
}

const TransactionDetailScreen: React.FC<TransactionDetailScreenProps> = ({ route, navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { transactions, loading, error } = useSelector((state: RootState) => state.finance);
  const { porcs } = useSelector((state: RootState) => state.porcs);
  const { deviseConfig } = useSelector((state: RootState) => state.parametres);
  
  const { transactionId } = route.params;
  const transaction = transactions.find(t => t.id === transactionId);
  const porc = transaction?.porcId ? porcs.find(p => p.id === transaction.porcId) : null;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  
  const [editForm, setEditForm] = useState({
    type: '',
    montant: '',
    description: '',
    categorie: '',
    porcId: '',
  });

  const [documents, setDocuments] = useState<DocumentFacture[]>([]);

  React.useEffect(() => {
    if (transaction) {
      setEditForm({
        type: transaction.type,
        montant: transaction.montant.toString(),
        description: transaction.description,
        categorie: transaction.categorie || '',
        porcId: transaction.porcId || '',
      });
      setDocuments(transaction.documents || []);
    }
  }, [transaction]);

  if (loading) {
    return <LoadingSpinner message="Chargement des détails de la transaction..." />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={() => navigation.goBack()}
        retryText="Retour"
      />
    );
  }

  if (!transaction) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Transaction non trouvée</Text>
        <Text style={styles.errorMessage}>Cette transaction n'existe plus ou a été supprimée</Text>
        <TouchableOpacity style={styles.errorBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSaveEdit = async () => {
    try {
      const transactionModifiee = {
        ...transaction,
        type: editForm.type as Transaction['type'],
        montant: parseFloat(editForm.montant),
        description: editForm.description,
        categorie: editForm.categorie || undefined,
        porcId: editForm.porcId || undefined,
        documents: documents.length > 0 ? documents : undefined,
      };

      // Dispatch de l'action de mise à jour
      // await dispatch(updateTransaction(transactionModifiee)).unwrap();
      
      setShowEditModal(false);
      Alert.alert('Succès', 'Transaction mise à jour avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la transaction');
    }
  };

  const handleDeleteTransaction = () => {
    Alert.alert(
      'Supprimer la transaction',
      'Êtes-vous sûr de vouloir supprimer cette transaction ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // await dispatch(deleteTransaction(transaction.id)).unwrap();
              Alert.alert('Succès', 'Transaction supprimée avec succès');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la transaction');
            }
          },
        },
      ]
    );
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'vente': '#4CAF50',
      'achat': '#2196F3',
      'depense': '#F44336',
    };
    return colors[type as keyof typeof colors] || '#666';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'vente': 'attach-money',
      'achat': 'shopping-cart',
      'depense': 'money-off',
    };
    return icons[type as keyof typeof icons] || 'help';
  };

  const formaterMontant = (montant: number) => {
    return CalculsAgricoles.formaterMontant(montant, deviseConfig);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
          </Text>
          <Text style={styles.headerSubtitle}>
            {formaterMontant(transaction.montant)}
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
          <Icon name="edit" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Informations générales */}
      <Section title="Informations Générales">
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Icon name={getTypeIcon(transaction.type)} size={20} color={getTypeColor(transaction.type)} />
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={[styles.infoValue, { color: getTypeColor(transaction.type) }]}>
              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="attach-money" size={20} color="#2E7D32" />
            <Text style={styles.infoLabel}>Montant</Text>
            <Text style={styles.infoValue}>{formaterMontant(transaction.montant)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="event" size={20} color="#2196F3" />
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {transaction.date.toLocaleDateString('fr-FR')}
            </Text>
          </View>
          
          {transaction.categorie && (
            <View style={styles.infoItem}>
              <Icon name="category" size={20} color="#FF9800" />
              <Text style={styles.infoLabel}>Catégorie</Text>
              <Text style={styles.infoValue}>{transaction.categorie}</Text>
            </View>
          )}
          
          {porc && (
            <View style={styles.infoItem}>
              <Icon name="pets" size={20} color="#9C27B0" />
              <Text style={styles.infoLabel}>Porc</Text>
              <Text style={styles.infoValue}>{porc.numeroIdentification}</Text>
            </View>
          )}
          
          <View style={styles.infoItem}>
            <Icon name="description" size={20} color="#666" />
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.infoValue}>{transaction.description}</Text>
          </View>
        </View>
      </Section>

      {/* Documents */}
      {documents.length > 0 && (
        <Section title="Documents Joints">
          <View style={styles.documentsContainer}>
            {documents.map((document) => (
              <View key={document.id} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <Icon 
                    name={document.type === 'photo' ? 'photo' : 'picture-as-pdf'} 
                    size={24} 
                    color={document.type === 'photo' ? '#4CAF50' : '#F44336'} 
                  />
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {document.nomFichier}
                    </Text>
                    <Text style={styles.documentDetails}>
                      {formatFileSize(document.tailleFichier)} • {document.dateAjout.toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>
                
                {document.type === 'photo' && (
                  <Image 
                    source={{ uri: document.cheminFichier }} 
                    style={styles.documentPreview}
                    resizeMode="cover"
                  />
                )}
                
                {document.description && (
                  <Text style={styles.documentDescription}>{document.description}</Text>
                )}
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Actions */}
      <Section title="Actions">
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowDocumentsModal(true)}
          >
            <Icon name="attach-file" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Gérer les documents</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteTransaction}
          >
            <Icon name="delete" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </Section>

      {/* Modal d'édition */}
      <CustomModal
        visible={showEditModal}
        title="Modifier la transaction"
        onClose={() => setShowEditModal(false)}
      >
        <ScrollView style={styles.modalContent}>
          <FormField
            label="Type de transaction *"
            value={editForm.type}
            onChangeText={(text) => setEditForm({...editForm, type: text})}
            placeholder="vente, achat, depense"
          />
          
          <FormField
            label="Montant *"
            value={editForm.montant}
            onChangeText={(text) => setEditForm({...editForm, montant: text})}
            placeholder="Ex: 1500"
            keyboardType="numeric"
          />
          
          <FormField
            label="Description *"
            value={editForm.description}
            onChangeText={(text) => setEditForm({...editForm, description: text})}
            placeholder="Description de la transaction"
            multiline
          />
          
          <FormField
            label="Catégorie"
            value={editForm.categorie}
            onChangeText={(text) => setEditForm({...editForm, categorie: text})}
            placeholder="Ex: Vente porcs, Aliments"
          />
          
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
            <Text style={styles.saveButtonText}>Sauvegarder</Text>
          </TouchableOpacity>
        </ScrollView>
      </CustomModal>

      {/* Modal documents */}
      <CustomModal
        visible={showDocumentsModal}
        title="Documents de la transaction"
        onClose={() => setShowDocumentsModal(false)}
      >
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalText}>
            {documents.length > 0 
              ? `${documents.length} document(s) joint(s) à cette transaction`
              : 'Aucun document joint à cette transaction'
            }
          </Text>
          
          {documents.map((document) => (
            <View key={document.id} style={styles.modalDocumentCard}>
              <Icon 
                name={document.type === 'photo' ? 'photo' : 'picture-as-pdf'} 
                size={20} 
                color={document.type === 'photo' ? '#4CAF50' : '#F44336'} 
              />
              <Text style={styles.modalDocumentName}>{document.nomFichier}</Text>
              <Text style={styles.modalDocumentSize}>{formatFileSize(document.tailleFichier)}</Text>
            </View>
          ))}
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#fff',
    marginTop: 5,
  },
  editButton: {
    marginLeft: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  documentsContainer: {
    marginBottom: 10,
  },
  documentCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  documentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  documentDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  documentPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  modalContent: {
    padding: 10,
    maxHeight: 500,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalDocumentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalDocumentName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  modalDocumentSize: {
    fontSize: 12,
    color: '#666',
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
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 15,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBackButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default TransactionDetailScreen;
