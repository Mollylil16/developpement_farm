import React, { useState, useEffect } from 'react';
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
import { Porc, Vaccination, Traitement } from '../types';
import { ValidationFormulaires } from '../utils/validation';

interface PorcDetailScreenProps {
  route: {
    params: {
      porcId: string;
    };
  };
  navigation: any;
}

const PorcDetailScreen: React.FC<PorcDetailScreenProps> = ({ route, navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { porcs, loading, error } = useSelector((state: RootState) => state.porcs);
  
  const { porcId } = route.params;
  const porc = porcs.find(p => p.id === porcId);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showVaccinationModal, setShowVaccinationModal] = useState(false);
  const [showTraitementModal, setShowTraitementModal] = useState(false);
  
  const [editForm, setEditForm] = useState({
    numeroIdentification: '',
    poidsActuel: '',
    poidsCible: '',
    statut: '',
    notes: '',
  });

  const [vaccinationForm, setVaccinationForm] = useState({
    nom: '',
    date: new Date().toISOString().split('T')[0],
    prochainRappel: '',
    veterinaire: '',
    notes: '',
  });

  const [traitementForm, setTraitementForm] = useState({
    nom: '',
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: '',
    medicament: '',
    posologie: '',
    veterinaire: '',
    notes: '',
  });

  useEffect(() => {
    if (porc) {
      setEditForm({
        numeroIdentification: porc.numeroIdentification,
        poidsActuel: porc.poidsActuel.toString(),
        poidsCible: porc.poidsCible.toString(),
        statut: porc.statut,
        notes: porc.notes || '',
      });
    }
  }, [porc]);

  if (loading) {
    return <LoadingSpinner message="Chargement des détails du porc..." />;
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

  if (!porc) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Porc non trouvé</Text>
        <Text style={styles.errorMessage}>Ce porc n'existe plus ou a été supprimé</Text>
        <TouchableOpacity style={styles.errorBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSaveEdit = async () => {
    try {
      // Validation et sauvegarde
      const errors = ValidationFormulaires.validerPorc(editForm);
      if (Object.keys(errors).length > 0) {
        Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
        return;
      }

      const porcModifie = {
        ...porc,
        numeroIdentification: editForm.numeroIdentification,
        poidsActuel: parseFloat(editForm.poidsActuel),
        poidsCible: parseFloat(editForm.poidsCible),
        statut: editForm.statut as Porc['statut'],
        notes: editForm.notes,
      };

      // Dispatch de l'action de mise à jour
      // await dispatch(updatePorc(porcModifie)).unwrap();
      
      setShowEditModal(false);
      Alert.alert('Succès', 'Porc mis à jour avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le porc');
    }
  };

  const handleAddVaccination = async () => {
    try {
      const nouvelleVaccination: Vaccination = {
        id: `vacc_${Date.now()}`,
        nom: vaccinationForm.nom,
        date: new Date(vaccinationForm.date),
        prochainRappel: vaccinationForm.prochainRappel ? new Date(vaccinationForm.prochainRappel) : undefined,
        veterinaire: vaccinationForm.veterinaire || undefined,
        notes: vaccinationForm.notes || undefined,
      };

      // Dispatch de l'action d'ajout de vaccination
      // await dispatch(addVaccination({ porcId, vaccination: nouvelleVaccination })).unwrap();
      
      setShowVaccinationModal(false);
      setVaccinationForm({
        nom: '',
        date: new Date().toISOString().split('T')[0],
        prochainRappel: '',
        veterinaire: '',
        notes: '',
      });
      Alert.alert('Succès', 'Vaccination ajoutée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la vaccination');
    }
  };

  const handleAddTraitement = async () => {
    try {
      const nouveauTraitement: Traitement = {
        id: `trait_${Date.now()}`,
        nom: traitementForm.nom,
        dateDebut: new Date(traitementForm.dateDebut),
        dateFin: traitementForm.dateFin ? new Date(traitementForm.dateFin) : undefined,
        medicament: traitementForm.medicament,
        posologie: traitementForm.posologie,
        veterinaire: traitementForm.veterinaire || undefined,
        notes: traitementForm.notes || undefined,
      };

      // Dispatch de l'action d'ajout de traitement
      // await dispatch(addTraitement({ porcId, traitement: nouveauTraitement })).unwrap();
      
      setShowTraitementModal(false);
      setTraitementForm({
        nom: '',
        dateDebut: new Date().toISOString().split('T')[0],
        dateFin: '',
        medicament: '',
        posologie: '',
        veterinaire: '',
        notes: '',
      });
      Alert.alert('Succès', 'Traitement ajouté avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le traitement');
    }
  };

  const getStatutColor = (statut: string) => {
    const colors = {
      'gestation': '#FF9800',
      'sevrage': '#2196F3',
      'croissance': '#4CAF50',
      'vente': '#9C27B0',
      'reproduction': '#E91E63',
      'mort': '#F44336',
    };
    return colors[statut as keyof typeof colors] || '#666';
  };

  const getStatutIcon = (statut: string) => {
    const icons = {
      'gestation': 'pregnant-woman',
      'sevrage': 'child-care',
      'croissance': 'trending-up',
      'vente': 'attach-money',
      'reproduction': 'favorite',
      'mort': 'pets',
    };
    return icons[statut as keyof typeof icons] || 'pets';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{porc.numeroIdentification}</Text>
          <Text style={styles.headerSubtitle}>{porc.race} • {porc.sexe}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
          <Icon name="edit" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Informations générales */}
      <Section title="Informations Générales">
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Icon name="pets" size={20} color="#2E7D32" />
            <Text style={styles.infoLabel}>Identification</Text>
            <Text style={styles.infoValue}>{porc.numeroIdentification}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="cake" size={20} color="#FF9800" />
            <Text style={styles.infoLabel}>Date de naissance</Text>
            <Text style={styles.infoValue}>{porc.dateNaissance.toLocaleDateString('fr-FR')}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="scale" size={20} color="#2196F3" />
            <Text style={styles.infoLabel}>Poids actuel</Text>
            <Text style={styles.infoValue}>{porc.poidsActuel} kg</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="flag" size={20} color="#9C27B0" />
            <Text style={styles.infoLabel}>Poids cible</Text>
            <Text style={styles.infoValue}>{porc.poidsCible} kg</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name={getStatutIcon(porc.statut)} size={20} color={getStatutColor(porc.statut)} />
            <Text style={styles.infoLabel}>Statut</Text>
            <Text style={[styles.infoValue, { color: getStatutColor(porc.statut) }]}>
              {porc.statut.charAt(0).toUpperCase() + porc.statut.slice(1)}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="pets" size={20} color="#4CAF50" />
            <Text style={styles.infoLabel}>Race</Text>
            <Text style={styles.infoValue}>{porc.race}</Text>
          </View>
        </View>
      </Section>

      {/* Notes */}
      {porc.notes && (
        <Section title="Notes">
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{porc.notes}</Text>
          </View>
        </Section>
      )}

      {/* Vaccinations */}
      <Section title="Vaccinations">
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowVaccinationModal(true)}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Ajouter une vaccination</Text>
          </TouchableOpacity>
        </View>
        
        {porc.vaccinations && porc.vaccinations.length > 0 ? (
          porc.vaccinations.map((vaccination) => (
            <View key={vaccination.id} style={styles.vaccinationCard}>
              <View style={styles.vaccinationHeader}>
                <Icon name="vaccines" size={20} color="#4CAF50" />
                <Text style={styles.vaccinationName}>{vaccination.nom}</Text>
                <Text style={styles.vaccinationDate}>
                  {vaccination.date.toLocaleDateString('fr-FR')}
                </Text>
              </View>
              {vaccination.prochainRappel && (
                <Text style={styles.vaccinationRappel}>
                  Prochain rappel: {vaccination.prochainRappel.toLocaleDateString('fr-FR')}
                </Text>
              )}
              {vaccination.veterinaire && (
                <Text style={styles.vaccinationVet}>Vétérinaire: {vaccination.veterinaire}</Text>
              )}
              {vaccination.notes && (
                <Text style={styles.vaccinationNotes}>{vaccination.notes}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune vaccination enregistrée</Text>
        )}
      </Section>

      {/* Traitements */}
      <Section title="Traitements Médicaux">
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowTraitementModal(true)}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Ajouter un traitement</Text>
          </TouchableOpacity>
        </View>
        
        {porc.traitements && porc.traitements.length > 0 ? (
          porc.traitements.map((traitement) => (
            <View key={traitement.id} style={styles.traitementCard}>
              <View style={styles.traitementHeader}>
                <Icon name="medication" size={20} color="#F44336" />
                <Text style={styles.traitementName}>{traitement.nom}</Text>
                <Text style={styles.traitementDate}>
                  {traitement.dateDebut.toLocaleDateString('fr-FR')}
                  {traitement.dateFin && ` - ${traitement.dateFin.toLocaleDateString('fr-FR')}`}
                </Text>
              </View>
              <Text style={styles.traitementMedicament}>Médicament: {traitement.medicament}</Text>
              <Text style={styles.traitementPosologie}>Posologie: {traitement.posologie}</Text>
              {traitement.veterinaire && (
                <Text style={styles.traitementVet}>Vétérinaire: {traitement.veterinaire}</Text>
              )}
              {traitement.notes && (
                <Text style={styles.traitementNotes}>{traitement.notes}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucun traitement enregistré</Text>
        )}
      </Section>

      {/* Modal d'édition */}
      <CustomModal
        visible={showEditModal}
        title="Modifier le porc"
        onClose={() => setShowEditModal(false)}
      >
        <ScrollView style={styles.modalContent}>
          <FormField
            label="Numéro d'identification *"
            value={editForm.numeroIdentification}
            onChangeText={(text) => setEditForm({...editForm, numeroIdentification: text})}
            placeholder="Ex: P001"
          />
          
          <FormField
            label="Poids actuel (kg) *"
            value={editForm.poidsActuel}
            onChangeText={(text) => setEditForm({...editForm, poidsActuel: text})}
            placeholder="Ex: 45.5"
            keyboardType="numeric"
          />
          
          <FormField
            label="Poids cible (kg) *"
            value={editForm.poidsCible}
            onChangeText={(text) => setEditForm({...editForm, poidsCible: text})}
            placeholder="Ex: 100"
            keyboardType="numeric"
          />
          
          <FormField
            label="Notes"
            value={editForm.notes}
            onChangeText={(text) => setEditForm({...editForm, notes: text})}
            placeholder="Observations..."
            multiline
          />
          
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
            <Text style={styles.saveButtonText}>Sauvegarder</Text>
          </TouchableOpacity>
        </ScrollView>
      </CustomModal>

      {/* Modal vaccination */}
      <CustomModal
        visible={showVaccinationModal}
        title="Ajouter une vaccination"
        onClose={() => setShowVaccinationModal(false)}
      >
        <ScrollView style={styles.modalContent}>
          <FormField
            label="Nom de la vaccination *"
            value={vaccinationForm.nom}
            onChangeText={(text) => setVaccinationForm({...vaccinationForm, nom: text})}
            placeholder="Ex: Vaccin contre la grippe"
          />
          
          <FormField
            label="Date de vaccination *"
            value={vaccinationForm.date}
            onChangeText={(text) => setVaccinationForm({...vaccinationForm, date: text})}
            placeholder="YYYY-MM-DD"
          />
          
          <FormField
            label="Prochain rappel"
            value={vaccinationForm.prochainRappel}
            onChangeText={(text) => setVaccinationForm({...vaccinationForm, prochainRappel: text})}
            placeholder="YYYY-MM-DD"
          />
          
          <FormField
            label="Vétérinaire"
            value={vaccinationForm.veterinaire}
            onChangeText={(text) => setVaccinationForm({...vaccinationForm, veterinaire: text})}
            placeholder="Nom du vétérinaire"
          />
          
          <FormField
            label="Notes"
            value={vaccinationForm.notes}
            onChangeText={(text) => setVaccinationForm({...vaccinationForm, notes: text})}
            placeholder="Observations..."
            multiline
          />
          
          <TouchableOpacity style={styles.saveButton} onPress={handleAddVaccination}>
            <Text style={styles.saveButtonText}>Ajouter</Text>
          </TouchableOpacity>
        </ScrollView>
      </CustomModal>

      {/* Modal traitement */}
      <CustomModal
        visible={showTraitementModal}
        title="Ajouter un traitement"
        onClose={() => setShowTraitementModal(false)}
      >
        <ScrollView style={styles.modalContent}>
          <FormField
            label="Nom du traitement *"
            value={traitementForm.nom}
            onChangeText={(text) => setTraitementForm({...traitementForm, nom: text})}
            placeholder="Ex: Traitement antibiotique"
          />
          
          <FormField
            label="Date de début *"
            value={traitementForm.dateDebut}
            onChangeText={(text) => setTraitementForm({...traitementForm, dateDebut: text})}
            placeholder="YYYY-MM-DD"
          />
          
          <FormField
            label="Date de fin"
            value={traitementForm.dateFin}
            onChangeText={(text) => setTraitementForm({...traitementForm, dateFin: text})}
            placeholder="YYYY-MM-DD"
          />
          
          <FormField
            label="Médicament *"
            value={traitementForm.medicament}
            onChangeText={(text) => setTraitementForm({...traitementForm, medicament: text})}
            placeholder="Nom du médicament"
          />
          
          <FormField
            label="Posologie *"
            value={traitementForm.posologie}
            onChangeText={(text) => setTraitementForm({...traitementForm, posologie: text})}
            placeholder="Ex: 2 comprimés par jour"
          />
          
          <FormField
            label="Vétérinaire"
            value={traitementForm.veterinaire}
            onChangeText={(text) => setTraitementForm({...traitementForm, veterinaire: text})}
            placeholder="Nom du vétérinaire"
          />
          
          <FormField
            label="Notes"
            value={traitementForm.notes}
            onChangeText={(text) => setTraitementForm({...traitementForm, notes: text})}
            placeholder="Observations..."
            multiline
          />
          
          <TouchableOpacity style={styles.saveButton} onPress={handleAddTraitement}>
            <Text style={styles.saveButtonText}>Ajouter</Text>
          </TouchableOpacity>
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
    fontSize: 16,
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
  notesContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  actionButtons: {
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  vaccinationCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  vaccinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vaccinationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  vaccinationDate: {
    fontSize: 14,
    color: '#666',
  },
  vaccinationRappel: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 4,
  },
  vaccinationVet: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  vaccinationNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  traitementCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  traitementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  traitementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  traitementDate: {
    fontSize: 14,
    color: '#666',
  },
  traitementMedicament: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  traitementPosologie: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  traitementVet: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  traitementNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  modalContent: {
    padding: 10,
    maxHeight: 500,
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

export default PorcDetailScreen;
