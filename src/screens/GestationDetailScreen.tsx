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
import { LoadingSpinner, ErrorMessage } from '../components/LoadingStates';
import { Section, CustomModal, FormField } from '../components/UIComponents';
import { MaterialIcons } from '@expo/vector-icons';
import type { Gestation } from '../types/reproduction';
import type { Porc } from '../types';
import { ValidationFormulaires } from '../utils/validation';

interface GestationDetailScreenProps {
  route: {
    params: {
      gestationId: string;
    };
  };
  navigation: any;
}

const GestationDetailScreen: React.FC<GestationDetailScreenProps> = ({ route, navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { gestations, loading, error } = useSelector((state: RootState) => state.reproduction);
  const { porcs } = useSelector((state: RootState) => state.porcs);
  
  const { gestationId } = route.params;
  const gestation = gestations.find(g => g.id === gestationId);
  const truie = porcs.find(p => p.id === gestation?.truie_id);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showMiseBasModal, setShowMiseBasModal] = useState(false);
  
  const [editForm, setEditForm] = useState({
    dateSautage: '',
    dateMiseBasPrevue: '',
    nombrePorceletsPrevu: '',
    notes: '',
  });

  const [miseBasForm, setMiseBasForm] = useState({
    dateMiseBasReelle: '',
    nombrePorceletsReel: '',
    notes: '',
  });

  useEffect(() => {
    if (gestation) {
      setEditForm({
        dateSautage: (gestation.date_sautage as string).split('T')[0],
        dateMiseBasPrevue: (gestation.date_mise_bas_prevue as string).split('T')[0],
        nombrePorceletsPrevu: gestation.nombre_porcelets_prevu.toString(),
        notes: gestation.notes || '',
      });
    }
  }, [gestation]);

  if (loading) {
    return <LoadingSpinner message="Chargement des détails de la gestation..." />;
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

  if (!gestation) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Gestation non trouvée</Text>
        <Text style={styles.errorMessage}>Cette gestation n'existe plus ou a été supprimée</Text>
        <TouchableOpacity style={styles.errorBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSaveEdit = async () => {
    try {
      const gestationModifiee = {
        ...gestation,
        date_sautage: editForm.dateSautage,
        date_mise_bas_prevue: editForm.dateMiseBasPrevue,
        nombre_porcelets_prevu: parseInt(editForm.nombrePorceletsPrevu),
        notes: editForm.notes,
      };

      // Dispatch de l'action de mise à jour
      // await dispatch(updateGestation(gestationModifiee)).unwrap();
      
      setShowEditModal(false);
      Alert.alert('Succès', 'Gestation mise à jour avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la gestation');
    }
  };

  const handleMiseBas = async () => {
    try {
      const gestationAvecMiseBas = {
        ...gestation,
        date_mise_bas_reelle: miseBasForm.dateMiseBasReelle,
        nombre_porcelets_reel: parseInt(miseBasForm.nombrePorceletsReel),
        statut: 'terminee' as const,
        notes: miseBasForm.notes || gestation.notes,
      };

      // Dispatch de l'action de mise à jour
      // await dispatch(updateGestation(gestationAvecMiseBas)).unwrap();
      
      setShowMiseBasModal(false);
      setMiseBasForm({
        dateMiseBasReelle: '',
        nombrePorceletsReel: '',
        notes: '',
      });
      Alert.alert('Succès', 'Mise bas enregistrée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la mise bas');
    }
  };

  const getStatutColor = (statut: string) => {
    const colors = {
      'en_cours': '#FF9800',
      'terminee': '#4CAF50',
      'avortement': '#F44336',
    };
    return colors[statut as keyof typeof colors] || '#666';
  };

  const getStatutIcon = (statut: string) => {
    const icons = {
      'en_cours': 'schedule',
      'terminee': 'check-circle',
      'avortement': 'cancel',
    };
    return icons[statut as keyof typeof icons] || 'help';
  };

  const calculerJoursRestants = () => {
    const aujourdhui = new Date();
    const miseBasPrevue = new Date(gestation.date_mise_bas_prevue as string);
    const diffTime = miseBasPrevue.getTime() - aujourdhui.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const joursRestants = calculerJoursRestants();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Gestation #{gestation.id.slice(-6)}</Text>
          <Text style={styles.headerSubtitle}>
            {truie ? truie.numeroIdentification : 'Truie inconnue'}
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
          <MaterialIcons name="edit" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Statut et progression */}
      <Section title="Statut de la Gestation">
        <View style={styles.statutContainer}>
          <View style={styles.statutCard}>
            <MaterialIcons
              name={getStatutIcon(gestation.statut) as any}
              size={32} 
              color={getStatutColor(gestation.statut)} 
            />
            <Text style={styles.statutTitle}>
              {gestation.statut.charAt(0).toUpperCase() + gestation.statut.slice(1)}
            </Text>
            <Text style={[styles.statutValue, { color: getStatutColor(gestation.statut) }]}>
              {gestation.statut === 'en_cours' && joursRestants > 0 
                ? `${joursRestants} jours restants`
                : gestation.statut === 'en_cours' && joursRestants <= 0
                ? 'Mise bas attendue'
                : gestation.statut === 'terminee'
                ? 'Terminée'
                : 'Avortement'
              }
            </Text>
          </View>
        </View>
      </Section>

      {/* Informations générales */}
      <Section title="Informations Générales">
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <MaterialIcons name="pregnant-woman" size={20} color="#FF9800" />
            <Text style={styles.infoLabel}>Truie</Text>
            <Text style={styles.infoValue}>
              {truie ? truie.numeroIdentification : 'Inconnue'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <MaterialIcons name="schedule" size={20} color="#2196F3" />
            <Text style={styles.infoLabel}>Date de sautage</Text>
            <Text style={styles.infoValue}>
              {new Date(gestation.date_sautage as string).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <MaterialIcons name="event" size={20} color="#4CAF50" />
            <Text style={styles.infoLabel}>Mise bas prévue</Text>
            <Text style={styles.infoValue}>
              {new Date(gestation.date_mise_bas_prevue as string).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          
          {gestation.date_mise_bas_reelle && (
            <View style={styles.infoItem}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.infoLabel}>Mise bas réelle</Text>
              <Text style={styles.infoValue}>
                {new Date(gestation.date_mise_bas_reelle as string).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
          
          <View style={styles.infoItem}>
            <MaterialIcons name="child-care" size={20} color="#9C27B0" />
            <Text style={styles.infoLabel}>Porcelets prévus</Text>
            <Text style={styles.infoValue}>{gestation.nombre_porcelets_prevu}</Text>
          </View>
          
          {gestation.nombre_porcelets_reel && (
            <View style={styles.infoItem}>
              <MaterialIcons name="pets" size={20} color="#E91E63" />
              <Text style={styles.infoLabel}>Porcelets réels</Text>
              <Text style={styles.infoValue}>{gestation.nombre_porcelets_reel}</Text>
            </View>
          )}
        </View>
      </Section>

      {/* Progression */}
      {gestation.statut === 'en_cours' && (
        <Section title="Progression">
          <View style={styles.progressionContainer}>
            <View style={styles.progressionBar}>
              <View 
                style={[
                  styles.progressionFill, 
                  { 
                    width: `${Math.max(0, Math.min(100, ((114 - joursRestants) / 114) * 100))}%` 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressionText}>
              {Math.max(0, 114 - joursRestants)} / 114 jours de gestation
            </Text>
            {joursRestants > 0 && (
              <Text style={styles.progressionSubtext}>
                Mise bas prévue dans {joursRestants} jours
              </Text>
            )}
          </View>
        </Section>
      )}

      {/* Actions */}
      {gestation.statut === 'en_cours' && (
        <Section title="Actions">
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowMiseBasModal(true)}
            >
              <MaterialIcons name="child-care" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Enregistrer la mise bas</Text>
            </TouchableOpacity>
          </View>
        </Section>
      )}

      {/* Notes */}
      {gestation.notes && (
        <Section title="Notes">
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{gestation.notes}</Text>
          </View>
        </Section>
      )}

      {/* Modal d'édition */}
      <CustomModal
        visible={showEditModal}
        title="Modifier la gestation"
        onClose={() => setShowEditModal(false)}
      >
        <ScrollView style={styles.modalContent}>
          <FormField
            label="Date de sautage *"
            value={editForm.dateSautage}
            onChangeText={(text) => setEditForm({...editForm, dateSautage: text})}
            placeholder="YYYY-MM-DD"
          />

          <FormField
            label="Date de mise bas prévue *"
            value={editForm.dateMiseBasPrevue}
            onChangeText={(text) => setEditForm({...editForm, dateMiseBasPrevue: text})}
            placeholder="YYYY-MM-DD"
          />

          <FormField
            label="Nombre de porcelets prévu *"
            value={editForm.nombrePorceletsPrevu}
            onChangeText={(text) => setEditForm({...editForm, nombrePorceletsPrevu: text})}
            placeholder="Ex: 12"
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

      {/* Modal mise bas */}
      <CustomModal
        visible={showMiseBasModal}
        title="Enregistrer la mise bas"
        onClose={() => setShowMiseBasModal(false)}
      >
        <ScrollView style={styles.modalContent}>
          <FormField
            label="Date de mise bas réelle *"
            value={miseBasForm.dateMiseBasReelle}
            onChangeText={(text) => setMiseBasForm({...miseBasForm, dateMiseBasReelle: text})}
            placeholder="YYYY-MM-DD"
          />

          <FormField
            label="Nombre de porcelets réels *"
            value={miseBasForm.nombrePorceletsReel}
            onChangeText={(text) => setMiseBasForm({...miseBasForm, nombrePorceletsReel: text})}
            placeholder="Ex: 10"
            keyboardType="numeric"
          />
          
          <FormField
            label="Notes sur la mise bas"
            value={miseBasForm.notes}
            onChangeText={(text) => setMiseBasForm({...miseBasForm, notes: text})}
            placeholder="Observations sur la mise bas..."
            multiline
          />
          
          <TouchableOpacity style={styles.saveButton} onPress={handleMiseBas}>
            <Text style={styles.saveButtonText}>Enregistrer la mise bas</Text>
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
    backgroundColor: '#FF9800',
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
  statutContainer: {
    alignItems: 'center',
  },
  statutCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 200,
  },
  statutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  statutValue: {
    fontSize: 16,
    fontWeight: 'bold',
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
  progressionContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  progressionBar: {
    width: '100%',
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressionFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  progressionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  progressionSubtext: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
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
    fontSize: 16,
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
  modalContent: {
    padding: 10,
    maxHeight: 500,
  },
  saveButton: {
    backgroundColor: '#FF9800',
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

export default GestationDetailScreen;
