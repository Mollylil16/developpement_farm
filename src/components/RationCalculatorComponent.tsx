/**
 * Composant calculateur de rations
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadIngredients, createRation } from '../store/slices/nutritionSlice';
import { TypePorc, CreateRationInput, RECOMMANDATIONS_NUTRITION, getTypePorcLabel } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import FormField from './FormField';
import LoadingSpinner from './LoadingSpinner';
import CustomModal from './CustomModal';
import IngredientFormModal from './IngredientFormModal';

export default function RationCalculatorComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { ingredients, loading } = useAppSelector((state) => state.nutrition);
  const [typePorc, setTypePorc] = useState<TypePorc>('porc_croissance');
  const [poidsKg, setPoidsKg] = useState<string>('');
  const [nombrePorcs, setNombrePorcs] = useState<string>('');
  const [selectedIngredients, setSelectedIngredients] = useState<
    { ingredient_id: string; quantite: number }[]
  >([]);
  const [modalIngredientVisible, setModalIngredientVisible] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<{
    coutTotal: number;
    coutParKg: number;
    poidsTotal: number;
    ingredients: Array<{
      nom: string;
      quantite: number;
      unite: string;
      cout: number;
    }>;
  } | null>(null);

  const { projetActif } = useAppSelector((state) => state.projet);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadIngredients(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  const typesPorc: TypePorc[] = [
    'porcelet',
    'truie_gestante',
    'truie_allaitante',
    'verrat',
    'porc_croissance',
  ];

  const handleAddIngredient = (ingredientId: string, quantite: number) => {
    const existingIndex = selectedIngredients.findIndex(
      (ing) => ing.ingredient_id === ingredientId
    );
    if (existingIndex >= 0) {
      const updated = [...selectedIngredients];
      updated[existingIndex].quantite = quantite;
      setSelectedIngredients(updated);
    } else {
      setSelectedIngredients([...selectedIngredients, { ingredient_id: ingredientId, quantite }]);
    }
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setSelectedIngredients(selectedIngredients.filter((ing) => ing.ingredient_id !== ingredientId));
  };

  const handleCalculate = () => {
    if (!poidsKg || parseFloat(poidsKg) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un poids valide');
      return;
    }

    if (selectedIngredients.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un ingrédient');
      return;
    }

    setCalculating(true);

    // Calculer le coût total et le poids total
    let coutTotal = 0;
    let poidsTotal = 0; // Poids total en kg

    const ingredientsDetails = selectedIngredients
      .map((selIng) => {
        const ingredient = ingredients.find((i) => i.id === selIng.ingredient_id);
        if (ingredient) {
          const cout = selIng.quantite * ingredient.prix_unitaire;
          coutTotal += cout;

          // Convertir toutes les quantités en kg pour calculer le poids total
          let quantiteEnKg = selIng.quantite;
          if (ingredient.unite === 'g') {
            quantiteEnKg = selIng.quantite / 1000; // Convertir g en kg
          } else if (ingredient.unite === 'l') {
            quantiteEnKg = selIng.quantite; // 1L ≈ 1kg pour les liquides
          } else if (ingredient.unite === 'ml') {
            quantiteEnKg = selIng.quantite / 1000; // Convertir ml en kg (approximation)
          }
          // Si l'unité est déjà en kg, on garde la valeur telle quelle
          poidsTotal += quantiteEnKg;

          return {
            nom: ingredient.nom,
            quantite: selIng.quantite,
            unite: ingredient.unite,
            cout,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const poids = parseFloat(poidsKg);
    const coutParKg = poids > 0 ? coutTotal / poids : 0;

    setResult({
      coutTotal,
      coutParKg,
      poidsTotal,
      ingredients: ingredientsDetails,
    });

    setCalculating(false);
  };

  const handleSaveRation = async () => {
    if (!result) return;
    if (!projetActif) {
      Alert.alert('Erreur', 'Aucun projet actif. Veuillez sélectionner un projet.');
      return;
    }

    setCalculating(true);
    try {
      await dispatch(
        createRation({
          projet_id: projetActif.id,
          type_porc: typePorc,
          poids_kg: parseFloat(poidsKg),
          nombre_porcs: nombrePorcs ? parseInt(nombrePorcs) : undefined,
          ingredients: selectedIngredients,
        })
      ).unwrap();

      Alert.alert('Succès', 'Ration enregistrée avec succès');
      // Reset
      setPoidsKg('');
      setNombrePorcs('');
      setSelectedIngredients([]);
      setResult(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error) || "Erreur lors de l'enregistrement";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setCalculating(false);
    }
  };

  const recommandation = RECOMMANDATIONS_NUTRITION[typePorc];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Calculateur de Ration</Text>

        {/* Sélection du type de porc */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type de porc *</Text>
          <View style={styles.optionsContainer}>
            {typesPorc.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  typePorc === type && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setTypePorc(type)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    typePorc === type && { color: colors.background, fontWeight: '600' },
                  ]}
                >
                  {getTypePorcLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {recommandation && (
            <View style={[styles.recommendationBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.recommendationTitle, { color: colors.text }]}>
                Recommandations:
              </Text>
              <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                Ration quotidienne: {recommandation.ration_kg_jour} kg/jour
              </Text>
              {recommandation.proteine_pourcent && (
                <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                  Protéines: {recommandation.proteine_pourcent}%
                </Text>
              )}
            </View>
          )}
        </View>

        <FormField
          label="Poids (kg) *"
          value={poidsKg}
          onChangeText={setPoidsKg}
          placeholder="Ex: 45"
          keyboardType="decimal-pad"
          required
        />

        <FormField
          label="Nombre de porcs (optionnel)"
          value={nombrePorcs}
          onChangeText={setNombrePorcs}
          placeholder="Ex: 10"
          keyboardType="numeric"
        />

        {/* Gestion des ingrédients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingrédients</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setModalIngredientVisible(true)}
            >
              <Text style={[styles.addButtonText, { color: colors.background }]}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {ingredients.length === 0 ? (
            <View style={[styles.emptyIngredients, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucun ingrédient disponible
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => setModalIngredientVisible(true)}
              >
                <Text style={[styles.addButtonText, { color: colors.background }]}>
                  + Créer un ingrédient
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {ingredients.map((ingredient) => {
                const selected = selectedIngredients.find(
                  (sel) => sel.ingredient_id === ingredient.id
                );
                return (
                  <View
                    key={ingredient.id}
                    style={[styles.ingredientRow, { backgroundColor: colors.surface }]}
                  >
                    <View style={styles.ingredientInfo}>
                      <Text style={[styles.ingredientName, { color: colors.text }]}>
                        {ingredient.nom}
                      </Text>
                      <Text style={[styles.ingredientPrice, { color: colors.textSecondary }]}>
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XOF',
                        }).format(ingredient.prix_unitaire)}
                        /{ingredient.unite}
                      </Text>
                    </View>
                    <View style={styles.ingredientInput}>
                      <FormField
                        label=""
                        value={selected?.quantite.toString() || ''}
                        onChangeText={(text) =>
                          handleAddIngredient(ingredient.id, parseFloat(text) || 0)
                        }
                        placeholder="0"
                        keyboardType="decimal-pad"
                        style={styles.quantiteInput}
                      />
                      <Text style={[styles.uniteLabel, { color: colors.textSecondary }]}>
                        {ingredient.unite}
                      </Text>
                      {selected && selected.quantite > 0 && (
                        <TouchableOpacity
                          style={[styles.removeButton, { backgroundColor: colors.error }]}
                          onPress={() => handleRemoveIngredient(ingredient.id)}
                        >
                          <Text style={[styles.removeButtonText, { color: colors.background }]}>
                            ✕
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* Bouton calculer */}
        <TouchableOpacity
          style={[
            styles.calculateButton,
            { backgroundColor: colors.primary },
            (!poidsKg || selectedIngredients.length === 0) && {
              backgroundColor: colors.textSecondary,
              opacity: 0.5,
            },
          ]}
          onPress={handleCalculate}
          disabled={!poidsKg || selectedIngredients.length === 0 || calculating}
        >
          <Text style={[styles.calculateButtonText, { color: colors.background }]}>
            {calculating ? 'Calcul...' : 'Calculer la ration'}
          </Text>
        </TouchableOpacity>

        {/* Résultats */}
        {result && (
          <View style={[styles.resultContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Résultats</Text>

            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Coût total:</Text>
              <Text style={[styles.resultValue, { color: colors.primary }]}>
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                }).format(result.coutTotal)}
              </Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                Poids total:
              </Text>
              <Text style={[styles.resultValue, { color: colors.primary }]}>
                {result.poidsTotal.toFixed(2)} kg
              </Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                Coût par kg:
              </Text>
              <Text style={[styles.resultValue, { color: colors.primary }]}>
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                }).format(result.coutParKg)}
              </Text>
            </View>

            <View style={[styles.ingredientsList, { borderTopColor: colors.border }]}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                Ingrédients requis:
              </Text>
              {result.ingredients.map((ing, index) => (
                <View key={index} style={styles.ingredientResult}>
                  <Text style={[styles.ingredientResultText, { color: colors.text }]}>
                    {ing.nom}: {ing.quantite} {ing.unite} (
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF',
                    }).format(ing.cout)}
                    )
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.secondary }]}
              onPress={handleSaveRation}
              disabled={calculating}
            >
              <Text style={[styles.saveButtonText, { color: colors.background }]}>
                Enregistrer la ration
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <IngredientFormModal
        visible={modalIngredientVisible}
        onClose={() => setModalIngredientVisible(false)}
        onSuccess={() => {
          setModalIngredientVisible(false);
          if (projetActif) {
            dispatch(loadIngredients(projetActif.id));
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg + 10,
    paddingBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
  },
  recommendationBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  recommendationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  recommendationText: {
    fontSize: FONT_SIZES.sm,
  },
  emptyIngredients: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
  },
  addButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  ingredientPrice: {
    fontSize: FONT_SIZES.sm,
  },
  ingredientInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  quantiteInput: {
    width: 80,
    marginBottom: 0,
  },
  uniteLabel: {
    fontSize: FONT_SIZES.sm,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  calculateButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  calculateButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  resultContainer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  resultTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  resultLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  resultValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },
  ingredientsList: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  ingredientResult: {
    marginBottom: SPACING.xs,
  },
  ingredientResultText: {
    fontSize: FONT_SIZES.sm,
  },
  saveButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
