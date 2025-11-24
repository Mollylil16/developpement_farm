/**
 * Modale pour modifier les ingrédients d'une ration
 * Permet d'ajouter/retirer des ingrédients et voir les alternatives
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getAlternativesText, hasAlternatives } from '../constants/alternativesIngredients';

interface IngredientRation {
  nom: string;
  pourcentage: number;
  quantite_kg: number;
  prix_unitaire: number;
  cout_total: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  rationNom: string;
  ingredients: IngredientRation[];
  ingredientsDisponibles: Array<{ id: string; nom: string; prix_unitaire: number }>;
  onSave: (ingredientsModifies: IngredientRation[]) => void;
}

export default function ModifierIngredientsRationModal({
  visible,
  onClose,
  rationNom,
  ingredients,
  ingredientsDisponibles,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const [ingredientsModifies, setIngredientsModifies] = useState<IngredientRation[]>(ingredients);
  const [showSelectIngredientModal, setShowSelectIngredientModal] = useState(false);
  const [selectedNewIngredient, setSelectedNewIngredient] = useState<string>('');
  const [newIngredientQuantite, setNewIngredientQuantite] = useState<string>('1');

  // Calculer le total des quantités en kg
  const totalQuantiteKg = useMemo(() => {
    return ingredientsModifies.reduce((sum, ing) => sum + ing.quantite_kg, 0);
  }, [ingredientsModifies]);

  // Calculer les pourcentages automatiquement à partir des quantités
  const ingredientsAvecPourcentages = useMemo(() => {
    if (totalQuantiteKg === 0) return ingredientsModifies;
    
    return ingredientsModifies.map((ing) => ({
      ...ing,
      pourcentage: (ing.quantite_kg / totalQuantiteKg) * 100,
    }));
  }, [ingredientsModifies, totalQuantiteKg]);

  const handleChangeQuantite = (index: number, value: string) => {
    const quantite = parseFloat(value) || 0;
    const nouveauxIngredients = [...ingredientsModifies];
    nouveauxIngredients[index] = {
      ...nouveauxIngredients[index],
      quantite_kg: quantite,
    };
    setIngredientsModifies(nouveauxIngredients);
  };

  const handleSupprimerIngredient = (index: number) => {
    Alert.alert(
      'Supprimer l\'ingrédient',
      `Voulez-vous retirer "${ingredientsModifies[index].nom}" de la ration ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const nouveaux = ingredientsModifies.filter((_, i) => i !== index);
            setIngredientsModifies(nouveaux);
          },
        },
      ]
    );
  };

  const handleAjouterIngredient = () => {
    if (ingredientsDisponibles.length === 0) {
      Alert.alert(
        'Aucun ingrédient',
        'Veuillez d\'abord ajouter des ingrédients dans la section "Ingrédients"'
      );
      return;
    }

    // Filtrer les ingrédients déjà présents
    const ingredientsNonUtilises = ingredientsDisponibles.filter(
      (ing) => !ingredientsModifies.some((mod) => mod.nom === ing.nom)
    );

    if (ingredientsNonUtilises.length === 0) {
      Alert.alert('Information', 'Tous les ingrédients disponibles sont déjà dans la ration');
      return;
    }

    // Ouvrir la modale de sélection
    setSelectedNewIngredient('');
    setNewIngredientQuantite('1');
    setShowSelectIngredientModal(true);
  };

  const handleConfirmerAjout = () => {
    if (!selectedNewIngredient) {
      Alert.alert('Erreur', 'Veuillez sélectionner un ingrédient');
      return;
    }

    const quantite = parseFloat(newIngredientQuantite);
    if (isNaN(quantite) || quantite <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide supérieure à 0');
      return;
    }

    // Trouver l'ingrédient sélectionné
    const ingredientSelectionne = ingredientsDisponibles.find(
      (ing) => ing.nom === selectedNewIngredient
    );

    if (!ingredientSelectionne) {
      Alert.alert('Erreur', 'Ingrédient non trouvé');
      return;
    }

    // Ajouter l'ingrédient avec la quantité spécifiée
    setIngredientsModifies([
      ...ingredientsModifies,
      {
        nom: ingredientSelectionne.nom,
        quantite_kg: quantite,
        pourcentage: 0, // Sera recalculé automatiquement
        prix_unitaire: ingredientSelectionne.prix_unitaire,
        cout_total: 0, // Sera recalculé
      },
    ]);

    // Fermer la modale
    setShowSelectIngredientModal(false);
    setSelectedNewIngredient('');
    setNewIngredientQuantite('1');
  };

  const handleVoirAlternatives = (nomIngredient: string) => {
    if (!hasAlternatives(nomIngredient)) {
      Alert.alert(
        'Pas d\'alternative',
        `Aucune alternative n'est référencée pour "${nomIngredient}". \n\nVous pouvez néanmoins utiliser des ingrédients locaux similaires disponibles dans votre région.`
      );
      return;
    }

    const texteAlternatives = getAlternativesText(nomIngredient);
    Alert.alert(`Alternatives pour ${nomIngredient}`, texteAlternatives, [
      { text: 'Fermer', style: 'cancel' },
    ]);
  };

  const handleValider = () => {
    if (ingredientsModifies.length === 0) {
      Alert.alert('Erreur', 'La ration doit contenir au moins un ingrédient');
      return;
    }

    if (totalQuantiteKg === 0) {
      Alert.alert('Erreur', 'La quantité totale doit être supérieure à 0');
      return;
    }

    // Sauvegarder avec les pourcentages calculés automatiquement
    onSave(ingredientsAvecPourcentages);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* En-tête */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Modifier les ingrédients
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{rationNom}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Total quantité */}
          <View
            style={[
              styles.totalCard,
              {
                backgroundColor: colors.primary + '20',
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.text }]}>Quantité totale :</Text>
            <Text
              style={[
                styles.totalValue,
                {
                  color: colors.primary,
                },
              ]}
            >
              {totalQuantiteKg.toFixed(2)} kg
            </Text>
          </View>

          {/* Liste des ingrédients */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {ingredientsModifies.map((ingredient, index) => {
              const pourcentageCalcule = totalQuantiteKg > 0 
                ? (ingredient.quantite_kg / totalQuantiteKg) * 100 
                : 0;
              
              return (
                <View
                  key={index}
                  style={[
                    styles.ingredientCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.ingredientHeader}>
                    <Text style={[styles.ingredientNom, { color: colors.text }]}>
                      {ingredient.nom}
                    </Text>
                    <View style={styles.ingredientActions}>
                      {hasAlternatives(ingredient.nom) && (
                        <TouchableOpacity
                          style={[styles.altButton, { backgroundColor: colors.info + '20' }]}
                          onPress={() => handleVoirAlternatives(ingredient.nom)}
                        >
                          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
                        onPress={() => handleSupprimerIngredient(index)}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.quantiteRow}>
                    <Text style={[styles.quantiteLabel, { color: colors.textSecondary }]}>
                      Quantité :
                    </Text>
                    <TextInput
                      style={[
                        styles.quantiteInput,
                        { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                      ]}
                      value={ingredient.quantite_kg.toString()}
                      onChangeText={(value) => handleChangeQuantite(index, value)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                    <Text style={[styles.quantiteUnit, { color: colors.text }]}>kg</Text>
                  </View>

                  <View style={styles.ingredientInfoRow}>
                    <Text style={[styles.ingredientPrix, { color: colors.textSecondary }]}>
                      Prix: {ingredient.prix_unitaire.toFixed(0)} FCFA/kg
                    </Text>
                    <Text style={[styles.ingredientPourcentage, { color: colors.primary }]}>
                      {pourcentageCalcule.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Bouton Ajouter */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={handleAjouterIngredient}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>
                Ajouter un ingrédient
              </Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Boutons de validation */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleValider}
            >
              <Text style={styles.saveButtonText}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modale de sélection d'ingrédient */}
      <Modal
        visible={showSelectIngredientModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSelectIngredientModal(false)}
      >
        <View style={styles.selectModalOverlay}>
          <View style={[styles.selectModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.selectModalHeader}>
              <Text style={[styles.selectModalTitle, { color: colors.text }]}>
                Sélectionner un ingrédient
              </Text>
              <TouchableOpacity onPress={() => setShowSelectIngredientModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Liste des ingrédients disponibles */}
            <ScrollView style={styles.selectModalScroll}>
              {ingredientsDisponibles
                .filter((ing) => !ingredientsModifies.some((mod) => mod.nom === ing.nom))
                .map((ingredient, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.selectIngredientItem,
                      {
                        backgroundColor:
                          selectedNewIngredient === ingredient.nom
                            ? colors.primary + '20'
                            : colors.surface,
                        borderColor:
                          selectedNewIngredient === ingredient.nom ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedNewIngredient(ingredient.nom)}
                  >
                    <View style={styles.selectIngredientInfo}>
                      <Text style={[styles.selectIngredientNom, { color: colors.text }]}>
                        {ingredient.nom}
                      </Text>
                      <Text style={[styles.selectIngredientPrix, { color: colors.textSecondary }]}>
                        {ingredient.prix_unitaire.toFixed(0)} FCFA/kg
                      </Text>
                    </View>
                    {selectedNewIngredient === ingredient.nom && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Champ quantité */}
            <View style={styles.selectModalPourcentageSection}>
              <Text style={[styles.selectModalLabel, { color: colors.text }]}>
                Quantité à ajouter :
              </Text>
              <View style={styles.selectModalPourcentageInput}>
                <TextInput
                  style={[
                    styles.selectModalInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={newIngredientQuantite}
                  onChangeText={setNewIngredientQuantite}
                  keyboardType="decimal-pad"
                  placeholder="Ex: 1.5"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.selectModalUnit, { color: colors.text }]}>kg</Text>
              </View>
              <Text style={[styles.selectModalHint, { color: colors.textSecondary }]}>
                💡 Le pourcentage sera calculé automatiquement selon le total
              </Text>
            </View>

            {/* Boutons */}
            <View style={styles.selectModalFooter}>
              <TouchableOpacity
                style={[
                  styles.selectModalCancelButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setShowSelectIngredientModal(false)}
              >
                <Text style={[styles.selectModalCancelText, { color: colors.text }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectModalConfirmButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleConfirmerAjout}
              >
                <Text style={styles.selectModalConfirmText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ingredientCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientNom: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  ingredientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  altButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantiteLabel: {
    fontSize: 14,
    marginRight: 8,
    fontWeight: '500',
  },
  quantiteInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  quantiteUnit: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  ingredientInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientPrix: {
    fontSize: 12,
  },
  ingredientPourcentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Styles pour la modale de sélection
  selectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selectModalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectModalScroll: {
    maxHeight: 300,
    padding: 16,
  },
  selectIngredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  selectIngredientInfo: {
    flex: 1,
  },
  selectIngredientNom: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectIngredientPrix: {
    fontSize: 14,
  },
  selectModalPourcentageSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectModalPourcentageInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectModalInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  selectModalUnit: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  selectModalHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  selectModalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectModalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  selectModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectModalConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectModalConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

