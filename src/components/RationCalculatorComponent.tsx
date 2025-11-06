/**
 * Composant calculateur de rations
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadIngredients, createRation } from '../store/slices/nutritionSlice';
import { TypePorc, CreateRationInput, RECOMMANDATIONS_NUTRITION, getTypePorcLabel } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import FormField from './FormField';
import LoadingSpinner from './LoadingSpinner';
import CustomModal from './CustomModal';
import IngredientFormModal from './IngredientFormModal';

export default function RationCalculatorComponent() {
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
    ingredients: Array<{
      nom: string;
      quantite: number;
      unite: string;
      cout: number;
    }>;
  } | null>(null);

  useEffect(() => {
    dispatch(loadIngredients());
  }, [dispatch]);

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
    setSelectedIngredients(
      selectedIngredients.filter((ing) => ing.ingredient_id !== ingredientId)
    );
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

    // Calculer le coût total
    let coutTotal = 0;
    const ingredientsDetails = selectedIngredients.map((selIng) => {
      const ingredient = ingredients.find((i) => i.id === selIng.ingredient_id);
      if (ingredient) {
        const cout = selIng.quantite * ingredient.prix_unitaire;
        coutTotal += cout;
        return {
          nom: ingredient.nom,
          quantite: selIng.quantite,
          unite: ingredient.unite,
          cout,
        };
      }
      return null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const poids = parseFloat(poidsKg);
    const coutParKg = poids > 0 ? coutTotal / poids : 0;

    setResult({
      coutTotal,
      coutParKg,
      ingredients: ingredientsDetails,
    });

    setCalculating(false);
  };

  const handleSaveRation = async () => {
    if (!result) return;

    setCalculating(true);
    try {
      await dispatch(
        createRation({
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
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de l\'enregistrement');
    } finally {
      setCalculating(false);
    }
  };

  const recommandation = RECOMMANDATIONS_NUTRITION[typePorc];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Calculateur de Ration</Text>

        {/* Sélection du type de porc */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type de porc *</Text>
          <View style={styles.optionsContainer}>
            {typesPorc.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.option, typePorc === type && styles.optionSelected]}
                onPress={() => setTypePorc(type)}
              >
                <Text
                  style={[
                    styles.optionText,
                    typePorc === type && styles.optionTextSelected,
                  ]}
                >
                  {getTypePorcLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {recommandation && (
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationTitle}>Recommandations:</Text>
              <Text style={styles.recommendationText}>
                Ration quotidienne: {recommandation.ration_kg_jour} kg/jour
              </Text>
              {recommandation.proteine_pourcent && (
                <Text style={styles.recommendationText}>
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
              style={styles.addButton}
              onPress={() => setModalIngredientVisible(true)}
            >
              <Text style={styles.addButtonText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {ingredients.length === 0 ? (
            <View style={styles.emptyIngredients}>
              <Text style={styles.emptyText}>Aucun ingrédient disponible</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalIngredientVisible(true)}
              >
                <Text style={styles.addButtonText}>+ Créer un ingrédient</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {ingredients.map((ingredient) => {
                const selected = selectedIngredients.find(
                  (sel) => sel.ingredient_id === ingredient.id
                );
                return (
                  <View key={ingredient.id} style={styles.ingredientRow}>
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>{ingredient.nom}</Text>
                      <Text style={styles.ingredientPrice}>
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
                      <Text style={styles.uniteLabel}>{ingredient.unite}</Text>
                      {selected && selected.quantite > 0 && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveIngredient(ingredient.id)}
                        >
                          <Text style={styles.removeButtonText}>✕</Text>
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
          style={[styles.calculateButton, (!poidsKg || selectedIngredients.length === 0) && styles.calculateButtonDisabled]}
          onPress={handleCalculate}
          disabled={!poidsKg || selectedIngredients.length === 0 || calculating}
        >
          <Text style={styles.calculateButtonText}>
            {calculating ? 'Calcul...' : 'Calculer la ration'}
          </Text>
        </TouchableOpacity>

        {/* Résultats */}
        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Résultats</Text>

            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Coût total:</Text>
              <Text style={styles.resultValue}>
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                }).format(result.coutTotal)}
              </Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Coût par kg:</Text>
              <Text style={styles.resultValue}>
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                }).format(result.coutParKg)}
              </Text>
            </View>

            <View style={styles.ingredientsList}>
              <Text style={styles.resultLabel}>Ingrédients requis:</Text>
              {result.ingredients.map((ing, index) => (
                <View key={index} style={styles.ingredientResult}>
                  <Text style={styles.ingredientResultText}>
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
              style={styles.saveButton}
              onPress={handleSaveRation}
              disabled={calculating}
            >
              <Text style={styles.saveButtonText}>Enregistrer la ration</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <IngredientFormModal
        visible={modalIngredientVisible}
        onClose={() => setModalIngredientVisible(false)}
        onSuccess={() => {
          setModalIngredientVisible(false);
          dispatch(loadIngredients());
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
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
    color: COLORS.text,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  recommendationBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  recommendationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  recommendationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyIngredients: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
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
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ingredientPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
    color: COLORS.textSecondary,
  },
  removeButton: {
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  calculateButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  calculateButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  calculateButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  resultTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  resultLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  resultValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  ingredientsList: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ingredientResult: {
    marginBottom: SPACING.xs,
  },
  ingredientResultText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

