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
import { addRation } from '../store/slices/nutritionSlice';
import { StatCard, QuickActionButton, Section } from '../components/UIComponents';
import { CustomModal, FormField, TypeSelector } from '../components/UIComponents';
import { CalculsAgricoles } from '../utils/calculs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Ration, IngredientRation, Porc } from '../types';

const NutritionScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { rations } = useSelector((state: RootState) => state.nutrition);
  const { porcs } = useSelector((state: RootState) => state.porcs);

  const [showCalculator, setShowCalculator] = useState(false);
  const [showNewRation, setShowNewRation] = useState(false);
  const [activeTab, setActiveTab] = useState<'rations' | 'calculator' | 'ingredients'>('rations');
  const [selectedRation, setSelectedRation] = useState<Ration | null>(null);

  // États pour les formulaires
  const [calculForm, setCalculForm] = useState({
    nombrePorcs: '',
    poidsMoyen: '',
    dureeJours: '',
  });

  const [rationForm, setRationForm] = useState({
    nom: '',
    typePorc: 'porcelet',
    poidsMin: '',
    poidsMax: '',
    coutParKg: '',
    notes: '',
  });

  const [ingredients, setIngredients] = useState<IngredientRation[]>([]);
  const [newIngredient, setNewIngredient] = useState({
    nom: '',
    pourcentage: '',
    coutParKg: '',
  });

  // États d'erreur
  const [calculErrors, setCalculErrors] = useState<Record<string, string>>({});
  const [rationErrors, setRationErrors] = useState<Record<string, string>>({});

  // Calculs pour les statistiques
  const totalRations = rations.length;
  const rationsPorcelets = rations.filter(r => r.typePorc === 'porcelet').length;
  const rationsCroissance = rations.filter(r => r.typePorc === 'porc_croissance').length;
  const rationsReproduction = rations.filter(r => r.typePorc === 'truie_gestante' || r.typePorc === 'truie_allaitante').length;
  const coutMoyenParKg = rations.length > 0 
    ? rations.reduce((sum, r) => sum + r.coutParKg, 0) / rations.length 
    : 0;

  // Fonctions de gestion
  const handleCalculerRation = () => {
    const errors: Record<string, string> = {};

    if (!selectedRation) {
      errors.ration = 'Veuillez sélectionner une ration';
    }

    if (!calculForm.nombrePorcs || isNaN(parseInt(calculForm.nombrePorcs))) {
      errors.nombrePorcs = 'Le nombre de porcs doit être un nombre valide';
    } else if (parseInt(calculForm.nombrePorcs) <= 0) {
      errors.nombrePorcs = 'Le nombre de porcs doit être positif';
    }

    if (!calculForm.poidsMoyen || isNaN(parseFloat(calculForm.poidsMoyen))) {
      errors.poidsMoyen = 'Le poids moyen doit être un nombre valide';
    } else if (parseFloat(calculForm.poidsMoyen) <= 0) {
      errors.poidsMoyen = 'Le poids moyen doit être positif';
    }

    if (!calculForm.dureeJours || isNaN(parseInt(calculForm.dureeJours))) {
      errors.dureeJours = 'La durée doit être un nombre valide';
    } else if (parseInt(calculForm.dureeJours) <= 0) {
      errors.dureeJours = 'La durée doit être positive';
    }

    if (Object.keys(errors).length > 0) {
      setCalculErrors(errors);
      return;
    }

    setCalculErrors({});

    try {
      const nombrePorcs = parseInt(calculForm.nombrePorcs);
      const poidsMoyen = parseFloat(calculForm.poidsMoyen);
      const dureeJours = parseInt(calculForm.dureeJours);

      // Calcul de la ration nécessaire
      const rationParPorcParJour = CalculsAgricoles.calculerRationQuotidienne(poidsMoyen, 3); // 3% du poids corporel
      const rationTotale = rationParPorcParJour * nombrePorcs * dureeJours;
      const coutTotal = rationTotale * selectedRation!.coutParKg;

      Alert.alert(
        'Calcul de ration',
        `Pour ${nombrePorcs} porcs de ${poidsMoyen}kg pendant ${dureeJours} jours:\n\n` +
        `• Ration par porc/jour: ${rationParPorcParJour.toFixed(2)} kg\n` +
        `• Ration totale nécessaire: ${rationTotale.toFixed(2)} kg\n` +
        `• Coût total: ${coutTotal.toFixed(2)} €\n` +
        `• Coût par porc: ${(coutTotal / nombrePorcs).toFixed(2)} €`
      );
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors du calcul de la ration');
    }
  };

  const handleAddRation = () => {
    const errors: Record<string, string> = {};

    if (!rationForm.nom.trim()) {
      errors.nom = 'Le nom de la ration est requis';
    }

    if (!rationForm.poidsMin || isNaN(parseFloat(rationForm.poidsMin))) {
      errors.poidsMin = 'Le poids minimum doit être un nombre valide';
    }

    if (!rationForm.poidsMax || isNaN(parseFloat(rationForm.poidsMax))) {
      errors.poidsMax = 'Le poids maximum doit être un nombre valide';
    }

    if (rationForm.poidsMin && rationForm.poidsMax && 
        parseFloat(rationForm.poidsMin) >= parseFloat(rationForm.poidsMax)) {
      errors.poidsMax = 'Le poids maximum doit être supérieur au poids minimum';
    }

    if (!rationForm.coutParKg || isNaN(parseFloat(rationForm.coutParKg))) {
      errors.coutParKg = 'Le coût par kg doit être un nombre valide';
    } else if (parseFloat(rationForm.coutParKg) <= 0) {
      errors.coutParKg = 'Le coût par kg doit être positif';
    }

    if (Object.keys(errors).length > 0) {
      setRationErrors(errors);
      return;
    }

    setRationErrors({});

    try {
      const nouvelleRation: Ration = {
        id: Date.now().toString(),
        nom: rationForm.nom.trim(),
        typePorc: rationForm.typePorc as 'porcelet' | 'truie_gestante' | 'truie_allaitante' | 'verrat' | 'porc_croissance',
        poidsMin: parseFloat(rationForm.poidsMin),
        poidsMax: parseFloat(rationForm.poidsMax),
        coutParKg: parseFloat(rationForm.coutParKg),
        ingredients: ingredients,
        notes: rationForm.notes.trim(),
      };

      dispatch(addRation(nouvelleRation));
      
      setShowNewRation(false);
      setRationForm({
        nom: '',
        typePorc: 'porcelet',
        poidsMin: '',
        poidsMax: '',
        coutParKg: '',
        notes: '',
      });
      setIngredients([]);
      
      Alert.alert('Succès', 'Ration ajoutée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de l\'ajout de la ration');
    }
  };

  const addIngredient = () => {
    if (!newIngredient.nom.trim() || !newIngredient.pourcentage || !newIngredient.coutParKg) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs de l\'ingrédient');
      return;
    }

    const pourcentage = parseFloat(newIngredient.pourcentage);
    if (pourcentage <= 0 || pourcentage > 100) {
      Alert.alert('Erreur', 'Le pourcentage doit être entre 0 et 100');
      return;
    }

    const ingredient: IngredientRation = {
      nom: newIngredient.nom.trim(),
      pourcentage: pourcentage,
      coutParKg: parseFloat(newIngredient.coutParKg),
    };

    setIngredients([...ingredients, ingredient]);
    setNewIngredient({
      nom: '',
      pourcentage: '',
      coutParKg: '',
    });
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const RationCard = ({ ration }: { ration: Ration }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{ration.nom}</Text>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(ration.typePorc) }]}>
          <Text style={styles.typeText}>{ration.typePorc}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>
        Poids: {ration.poidsMin} - {ration.poidsMax} kg
      </Text>
      <Text style={styles.cardSubtitle}>
        Coût: {ration.coutParKg} €/kg
      </Text>
      {ration.ingredients && ration.ingredients.length > 0 && (
        <Text style={styles.cardSubtitle}>
          Ingrédients: {ration.ingredients.length}
        </Text>
      )}
      {ration.notes && (
        <Text style={styles.cardNotes}>{ration.notes}</Text>
      )}
    </View>
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'porcelet': return '#2196F3';
      case 'croissance': return '#4CAF50';
      case 'reproduction': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
        <Text style={styles.subtitle}>Gestion des rations et calculs nutritionnels</Text>
      </View>

      {/* Statistiques principales */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Total rations"
          value={totalRations.toString()}
          icon="restaurant"
          color="#2196F3"
          onPress={() => setActiveTab('rations')}
        />
        <StatCard
          title="Porcelets"
          value={rationsPorcelets.toString()}
          icon="child-care"
          color="#4CAF50"
          onPress={() => setActiveTab('rations')}
        />
        <StatCard
          title="Croissance"
          value={rationsCroissance.toString()}
          icon="trending-up"
          color="#FF9800"
          onPress={() => setActiveTab('rations')}
        />
        <StatCard
          title="Coût moyen"
          value={`${coutMoyenParKg.toFixed(2)}€`}
          icon="euro"
          color="#9C27B0"
          onPress={() => setActiveTab('calculator')}
        />
      </View>

      {/* Actions rapides */}
      <Section title="Actions rapides">
        <View style={styles.quickActions}>
          <QuickActionButton
            title="Nouvelle Ration"
            icon="add-circle"
            onPress={() => setShowNewRation(true)}
            color="#2196F3"
          />
          <QuickActionButton
            title="Calculer Ration"
            icon="calculate"
            onPress={() => setShowCalculator(true)}
            color="#4CAF50"
          />
          <QuickActionButton
            title="Ingrédients"
            icon="eco"
            onPress={() => setActiveTab('ingredients')}
            color="#FF9800"
          />
        </View>
      </Section>

      {/* Navigation par onglets */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rations' && styles.activeTab]}
          onPress={() => setActiveTab('rations')}
        >
          <Text style={[styles.tabText, activeTab === 'rations' && styles.activeTabText]}>
            Rations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calculator' && styles.activeTab]}
          onPress={() => setActiveTab('calculator')}
        >
          <Text style={[styles.tabText, activeTab === 'calculator' && styles.activeTabText]}>
            Calculateur
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ingredients' && styles.activeTab]}
          onPress={() => setActiveTab('ingredients')}
        >
          <Text style={[styles.tabText, activeTab === 'ingredients' && styles.activeTabText]}>
            Ingrédients
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu selon l'onglet actif */}
      <View style={styles.content}>
        {activeTab === 'rations' && (
          <Section title="Rations disponibles">
            {rations.map(ration => (
              <RationCard key={ration.id} ration={ration} />
            ))}
            {rations.length === 0 && (
              <View style={styles.emptyContainer}>
                <Icon name="restaurant" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Aucune ration disponible</Text>
              </View>
            )}
          </Section>
        )}

        {activeTab === 'calculator' && (
          <Section title="Calculateur de ration">
            <View style={styles.calculatorContainer}>
              <Text style={styles.calculatorTitle}>Calculer les besoins nutritionnels</Text>
              <Text style={styles.calculatorSubtitle}>
                Sélectionnez une ration et entrez les paramètres pour calculer les besoins
              </Text>
              
              <View style={styles.calculatorForm}>
                <TypeSelector
                  label="Ration"
                  value={selectedRation?.id || ''}
                  options={rations.map(r => ({
                    value: r.id,
                    label: `${r.nom} (${r.typePorc})`
                  }))}
                  onSelect={(value) => {
                    const ration = rations.find(r => r.id === value);
                    setSelectedRation(ration || null);
                  }}
                  required
                />
                
                <FormField
                  label="Nombre de porcs"
                  value={calculForm.nombrePorcs}
                  onChangeText={(text) => setCalculForm({...calculForm, nombrePorcs: text})}
                  placeholder="Ex: 50"
                  keyboardType="numeric"
                  required
                  error={calculErrors.nombrePorcs}
                />
                
                <FormField
                  label="Poids moyen (kg)"
                  value={calculForm.poidsMoyen}
                  onChangeText={(text) => setCalculForm({...calculForm, poidsMoyen: text})}
                  placeholder="Ex: 25.5"
                  keyboardType="numeric"
                  required
                  error={calculErrors.poidsMoyen}
                />
                
                <FormField
                  label="Durée (jours)"
                  value={calculForm.dureeJours}
                  onChangeText={(text) => setCalculForm({...calculForm, dureeJours: text})}
                  placeholder="Ex: 30"
                  keyboardType="numeric"
                  required
                  error={calculErrors.dureeJours}
                />
                
                <TouchableOpacity
                  style={styles.calculateButton}
                  onPress={handleCalculerRation}
                >
                  <Icon name="calculate" size={20} color="#fff" />
                  <Text style={styles.calculateButtonText}>Calculer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Section>
        )}

        {activeTab === 'ingredients' && (
          <Section title="Gestion des ingrédients">
            <View style={styles.ingredientsContainer}>
              <Text style={styles.ingredientsTitle}>Ingrédients de la ration</Text>
              
              {ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.nom}</Text>
                    <Text style={styles.ingredientDetails}>
                      {ingredient.pourcentage}% - {ingredient.coutParKg}€/kg
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeIngredient(index)}
                  >
                    <Icon name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <View style={styles.addIngredientForm}>
                <FormField
                  label="Nom de l'ingrédient"
                  value={newIngredient.nom}
                  onChangeText={(text) => setNewIngredient({...newIngredient, nom: text})}
                  placeholder="Ex: Maïs"
                />
                
                <View style={styles.ingredientRow}>
                  <View style={styles.ingredientField}>
                    <FormField
                      label="Pourcentage (%)"
                      value={newIngredient.pourcentage}
                      onChangeText={(text) => setNewIngredient({...newIngredient, pourcentage: text})}
                      placeholder="Ex: 60"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.ingredientField}>
                    <FormField
                      label="Coût (€/kg)"
                      value={newIngredient.coutParKg}
                      onChangeText={(text) => setNewIngredient({...newIngredient, coutParKg: text})}
                      placeholder="Ex: 0.25"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.addIngredientButton}
                  onPress={addIngredient}
                >
                  <Icon name="add" size={20} color="#fff" />
                  <Text style={styles.addIngredientButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Section>
        )}
      </View>

      {/* Modales */}
      <CustomModal
        visible={showNewRation}
        title="Nouvelle Ration"
        onClose={() => setShowNewRation(false)}
        onSave={handleAddRation}
      >
        <FormField
          label="Nom de la ration"
          value={rationForm.nom}
          onChangeText={(text) => setRationForm({...rationForm, nom: text})}
          placeholder="Ex: Ration croissance"
          required
          error={rationErrors.nom}
        />
        
        <TypeSelector
          label="Type de porc"
          value={rationForm.typePorc}
          options={[
            { value: 'porcelet', label: 'Porcelet' },
            { value: 'porc_croissance', label: 'Croissance' },
            { value: 'truie_gestante', label: 'Truie Gestante' },
            { value: 'truie_allaitante', label: 'Truie Allaitante' },
            { value: 'verrat', label: 'Verrat' }
          ]}
          onSelect={(value) => setRationForm({...rationForm, typePorc: value})}
          required
        />
        
        <View style={styles.weightRow}>
          <View style={styles.weightField}>
            <FormField
              label="Poids min (kg)"
              value={rationForm.poidsMin}
              onChangeText={(text) => setRationForm({...rationForm, poidsMin: text})}
              placeholder="Ex: 20"
              keyboardType="numeric"
              required
              error={rationErrors.poidsMin}
            />
          </View>
          <View style={styles.weightField}>
            <FormField
              label="Poids max (kg)"
              value={rationForm.poidsMax}
              onChangeText={(text) => setRationForm({...rationForm, poidsMax: text})}
              placeholder="Ex: 100"
              keyboardType="numeric"
              required
              error={rationErrors.poidsMax}
            />
          </View>
        </View>
        
        <FormField
          label="Coût par kg (€)"
          value={rationForm.coutParKg}
          onChangeText={(text) => setRationForm({...rationForm, coutParKg: text})}
          placeholder="Ex: 0.35"
          keyboardType="numeric"
          required
          error={rationErrors.coutParKg}
        />
        
        <FormField
          label="Notes"
          value={rationForm.notes}
          onChangeText={(text) => setRationForm({...rationForm, notes: text})}
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
  cardNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
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
  calculatorContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  calculatorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  calculatorSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  calculatorForm: {
    gap: 15,
  },
  calculateButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  ingredientsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  ingredientsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  ingredientDetails: {
    fontSize: 12,
    color: '#666',
  },
  removeButton: {
    backgroundColor: '#F44336',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIngredientForm: {
    marginTop: 20,
    gap: 15,
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ingredientField: {
    flex: 1,
  },
  addIngredientButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  addIngredientButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  weightRow: {
    flexDirection: 'row',
    gap: 10,
  },
  weightField: {
    flex: 1,
  },
});

export default NutritionScreen;