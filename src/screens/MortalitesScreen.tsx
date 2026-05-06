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
import { 
  enregistrerMortalite, 
  chargerMortalites, 
  supprimerMortalite,
  mettreAJourStatutPorc 
} from '../store/slices/mortalitesSlice';
import { Section, CustomModal, FormField } from '../components/UIComponents';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/LoadingStates';
import { MaterialIcons } from '@expo/vector-icons';
import { Mortalite, Porc } from '../types';
import { ValidationFormulaires } from '../utils/validation';

const MortalitesScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { mortalites, loading, error } = useSelector((state: RootState) => state.mortalites);
  const { porcs } = useSelector((state: RootState) => state.porcs);

  const [showNouvelleMortalite, setShowNouvelleMortalite] = useState(false);
  const [mortaliteForm, setMortaliteForm] = useState({
    porcId: '',
    dateDeces: new Date().toISOString().split('T')[0],
    causeDeces: 'maladie' as 'maladie' | 'accident' | 'vieillesse' | 'autre',
    causeDetaillee: '',
    poidsAuDeces: '',
    traitementPrecedent: '',
    notes: '',
  });
  const [mortaliteErrors, setMortaliteErrors] = useState<Record<string, string>>({});

  // Charger les mortalités au montage
  useEffect(() => {
    dispatch(chargerMortalites());
  }, [dispatch]);

  // Fonctions de gestion
  const handleEnregistrerMortalite = async () => {
    const errors = ValidationFormulaires.validerMortalite(mortaliteForm);
    if (Object.keys(errors).length > 0) {
      setMortaliteErrors(errors);
      return;
    }

    setMortaliteErrors({});

    try {
      const porc = porcs.find(p => p.id === mortaliteForm.porcId);
      if (!porc) {
        Alert.alert('Erreur', 'Porc non trouvé');
        return;
      }

      // Calculer l'âge au décès
      const ageAuDeces = Math.floor(
        (new Date().getTime() - new Date(porc.dateNaissance).getTime()) / (1000 * 60 * 60 * 24)
      );

      const donneesMortalite = {
        porcId: mortaliteForm.porcId,
        porcNumeroIdentification: porc.numeroIdentification,
        dateDeces: new Date(mortaliteForm.dateDeces),
        causeDeces: mortaliteForm.causeDeces,
        causeDetaillee: mortaliteForm.causeDetaillee || undefined,
        poidsAuDeces: parseFloat(mortaliteForm.poidsAuDeces),
        ageAuDeces,
        traitementPrecedent: mortaliteForm.traitementPrecedent || undefined,
        notes: mortaliteForm.notes || undefined,
      };

      await dispatch(enregistrerMortalite(donneesMortalite as any)).unwrap();
      
      // Mettre à jour le statut du porc à 'mort'
      await dispatch(mettreAJourStatutPorc({ 
        porcId: mortaliteForm.porcId, 
        nouveauStatut: 'mort' 
      })).unwrap();

      setShowNouvelleMortalite(false);
      setMortaliteForm({
        porcId: '',
        dateDeces: new Date().toISOString().split('T')[0],
        causeDeces: 'maladie',
        causeDetaillee: '',
        poidsAuDeces: '',
        traitementPrecedent: '',
        notes: '',
      });

      Alert.alert('Succès', 'Mortalité enregistrée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la mortalité');
    }
  };

  const handleSupprimerMortalite = (mortaliteId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cette mortalité ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => dispatch(supprimerMortalite(mortaliteId)),
        },
      ]
    );
  };

  const MortaliteCard = ({ mortalite: _mortalite }: { mortalite: Mortalite }) => {
    const mortalite = _mortalite as any;
    const porc = porcs.find((p: any) => p.id === mortalite.porcId);
    
    return (
      <View style={styles.mortaliteCard}>
        <View style={styles.mortaliteHeader}>
          <MaterialIcons name="pets" size={24} color="#F44336" />
          <View style={styles.mortaliteInfo}>
            <Text style={styles.mortalitePorc}>
              {mortalite.porcNumeroIdentification}
            </Text>
            <Text style={styles.mortaliteCause}>
              {mortalite.causeDeces} - {new Date(mortalite.dateDeces).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleSupprimerMortalite(mortalite.id)}>
            <MaterialIcons name="delete" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.mortaliteDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Poids au décès:</Text>
            <Text style={styles.detailValue}>{mortalite.poidsAuDeces} kg</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Âge au décès:</Text>
            <Text style={styles.detailValue}>{mortalite.ageAuDeces} jours</Text>
          </View>
          {mortalite.causeDetaillee && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cause détaillée:</Text>
              <Text style={styles.detailValue}>{mortalite.causeDetaillee}</Text>
            </View>
          )}
          {mortalite.traitementPrecedent && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Traitement précédent:</Text>
              <Text style={styles.detailValue}>{mortalite.traitementPrecedent}</Text>
            </View>
          )}
          {mortalite.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes:</Text>
              <Text style={styles.detailValue}>{mortalite.notes}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const StatistiquesMortalite = () => {
    const mortalitesMois = mortalites.filter((m: any) =>
      new Date(m.dateDeces ?? m.date).getMonth() === new Date().getMonth()
    ).length;

    const causesRepartition = mortalites.reduce((acc, m: any) => {
      const cause = m.causeDeces ?? m.categorie ?? 'autre';
      acc[cause] = (acc[cause] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <Section title="Statistiques des Mortalités">
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{mortalites.length}</Text>
            <Text style={styles.statLabel}>Total décès</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{mortalitesMois}</Text>
            <Text style={styles.statLabel}>Ce mois</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {porcs.length > 0 ? ((mortalites.length / porcs.length) * 100).toFixed(1) : 0}%
            </Text>
            <Text style={styles.statLabel}>Taux mortalité</Text>
          </View>
        </View>
        
        <View style={styles.causesContainer}>
          <Text style={styles.causesTitle}>Répartition par cause:</Text>
          {Object.entries(causesRepartition).map(([cause, count]) => (
            <View key={cause} style={styles.causeRow}>
              <Text style={styles.causeLabel}>{cause}:</Text>
              <Text style={styles.causeValue}>{count}</Text>
            </View>
          ))}
        </View>
      </Section>
    );
  };

  // Fonction de retry pour recharger les données
  const handleRetry = () => {
    dispatch(chargerMortalites());
  };

  // Affichage des états de chargement et d'erreur
  if (loading && mortalites.length === 0) {
    return <LoadingSpinner message="Chargement des mortalités..." />;
  }

  if (error && mortalites.length === 0) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={handleRetry}
        retryText="Recharger les données"
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestion des Mortalités</Text>
        <Text style={styles.subtitle}>Suivi des décès et causes</Text>
      </View>

      {/* Statistiques */}
      <StatistiquesMortalite />

      {/* Liste des mortalités */}
      <Section title="Mortalités Enregistrées">
        {mortalites.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="pets" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucune mortalité enregistrée</Text>
            <Text style={styles.emptySubtext}>Les décès apparaîtront ici une fois enregistrés</Text>
          </View>
        ) : (
          mortalites.map((mortalite: any) => (
            <MortaliteCard key={mortalite.id} mortalite={mortalite as any} />
          ))
        )}
      </Section>

      {/* Bouton d'ajout */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowNouvelleMortalite(true)}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Enregistrer une mortalité</Text>
      </TouchableOpacity>

      {/* Modal nouvelle mortalité */}
      <CustomModal
        visible={showNouvelleMortalite}
        title="Enregistrer une mortalité"
        onClose={() => setShowNouvelleMortalite(false)}
      >
        <ScrollView style={styles.modalContent}>
          <FormField
            label="Porc *"
            value={mortaliteForm.porcId}
            onChangeText={(text) => setMortaliteForm({...mortaliteForm, porcId: text})}
            placeholder="Sélectionner un porc"
            error={mortaliteErrors.porcId}
          />
          
          <FormField
            label="Date de décès *"
            value={mortaliteForm.dateDeces}
            onChangeText={(text) => setMortaliteForm({...mortaliteForm, dateDeces: text})}
            placeholder="YYYY-MM-DD"
            error={mortaliteErrors.dateDeces}
          />
          
          <Text style={styles.inputLabel}>Cause de décès *</Text>
          <View style={styles.causeOptions}>
            {['maladie', 'accident', 'vieillesse', 'autre'].map((cause) => (
              <TouchableOpacity
                key={cause}
                style={[
                  styles.causeOption,
                  mortaliteForm.causeDeces === cause && styles.causeOptionSelected
                ]}
                onPress={() => setMortaliteForm({...mortaliteForm, causeDeces: cause as any})}
              >
                <Text style={styles.causeOptionText}>{cause}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <FormField
            label="Cause détaillée"
            value={mortaliteForm.causeDetaillee}
            onChangeText={(text) => setMortaliteForm({...mortaliteForm, causeDetaillee: text})}
            placeholder="Description détaillée de la cause"
            multiline
          />
          
          <FormField
            label="Poids au décès (kg) *"
            value={mortaliteForm.poidsAuDeces}
            onChangeText={(text) => setMortaliteForm({...mortaliteForm, poidsAuDeces: text})}
            placeholder="Ex: 45.5"
            keyboardType="numeric"
            error={mortaliteErrors.poidsAuDeces}
          />
          
          <FormField
            label="Traitement précédent"
            value={mortaliteForm.traitementPrecedent}
            onChangeText={(text) => setMortaliteForm({...mortaliteForm, traitementPrecedent: text})}
            placeholder="Médicaments ou traitements administrés"
            multiline
          />
          
          <FormField
            label="Notes"
            value={mortaliteForm.notes}
            onChangeText={(text) => setMortaliteForm({...mortaliteForm, notes: text})}
            placeholder="Observations supplémentaires"
            multiline
          />
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleEnregistrerMortalite}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Enregistrement...' : 'Enregistrer la mortalité'}
            </Text>
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
    backgroundColor: '#F44336',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  causesContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  causesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  causeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  causeLabel: {
    fontSize: 14,
    color: '#666',
  },
  causeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
  },
  mortaliteCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mortaliteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mortaliteInfo: {
    flex: 1,
    marginLeft: 10,
  },
  mortalitePorc: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  mortaliteCause: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  mortaliteDetails: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 20,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  modalContent: {
    padding: 10,
    maxHeight: 500,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  causeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  causeOption: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  causeOptionSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  causeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#F44336',
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
});

export default MortalitesScreen;
