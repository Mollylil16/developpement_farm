/**
 * Composant pour la gestion des ingrédients
 * Section dédiée à la liste et gestion CRUD des ingrédients avec leurs prix
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadIngredients,
  deleteIngredient,
  createIngredient,
} from '../store/slices/nutritionSlice';
import type { Ingredient } from '../types/nutrition';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import IngredientFormModal from './IngredientFormModal';
import PriceScannerModal from './PriceScannerModal';
import LoadingSpinner from './LoadingSpinner';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { FORMULES_RECOMMANDEES, getValeursNutritionnelles } from '../types/nutrition';

export default function IngredientsComponent() {
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canDelete, canUpdate } = useActionPermissions();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { ingredients, loading } = useAppSelector((state) => state.nutrition);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadIngredients(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  // Enrichir automatiquement la liste avec les ingrédients des formulations industrielles
  useEffect(() => {
    if (!projetActif || !canCreate('nutrition') || ingredients.length === 0) {
      return;
    }

    const enrichirIngredients = async () => {
      // Extraire tous les ingrédients uniques des formulations recommandées
      const ingredientsFormulations = new Set<string>();
      Object.values(FORMULES_RECOMMANDEES).forEach((formule) => {
        formule.composition.forEach((comp) => {
          ingredientsFormulations.add(comp.nom);
        });
      });

      // Vérifier quels ingrédients manquent
      const ingredientsExistants = new Set(ingredients.map((ing) => ing.nom.toLowerCase().trim()));
      const ingredientsManquants = Array.from(ingredientsFormulations).filter(
        (nom) => !ingredientsExistants.has(nom.toLowerCase().trim())
      );

      // Créer les ingrédients manquants
      if (ingredientsManquants.length > 0) {
        let successCount = 0;
        for (const nomIngredient of ingredientsManquants) {
          try {
            // Vérifier à nouveau si l'ingrédient n'existe pas (éviter les doublons)
            const existeDeja = ingredients.some(
              (ing) => ing.nom.toLowerCase().trim() === nomIngredient.toLowerCase().trim()
            );
            if (existeDeja) continue;

            // Obtenir les valeurs nutritionnelles si disponibles
            const valeursNutri = getValeursNutritionnelles(nomIngredient);

            await dispatch(
              createIngredient({
                nom: nomIngredient,
                unite: 'kg', // Par défaut, l'utilisateur pourra modifier
                prix_unitaire: 0, // L'utilisateur devra renseigner le prix
                proteine_pourcent: valeursNutri?.proteine_pourcent,
                energie_kcal: valeursNutri?.energie_kcal,
              })
            ).unwrap();
            successCount++;
          } catch (error) {
            // Ignorer les erreurs silencieusement
            console.warn(`Erreur lors de la création de ${nomIngredient}:`, error);
          }
        }

        // Recharger la liste si des ingrédients ont été créés
        if (successCount > 0) {
          dispatch(loadIngredients(projetActif.id));
        }
      }
    };

    // Attendre un peu pour éviter les conflits avec le chargement initial
    const timer = setTimeout(() => {
      enrichirIngredients();
    }, 1000);

    return () => clearTimeout(timer);
  }, [projetActif?.id, ingredients.length, canCreate, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      await dispatch(loadIngredients(projetActif.id)).unwrap();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, projetActif?.id]);

  // Filtrer les ingrédients
  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) return ingredients;
    const query = searchQuery.toLowerCase();
    return ingredients.filter((ing) => ing.nom.toLowerCase().includes(query));
  }, [ingredients, searchQuery]);

  // Statistiques
  const stats = useMemo(() => {
    const total = ingredients.length;
    const prixMoyen =
      total > 0 ? ingredients.reduce((sum, ing) => sum + ing.prix_unitaire, 0) / total : 0;
    return { total, prixMoyen };
  }, [ingredients]);

  const handleEditIngredient = (ingredient: Ingredient) => {
    if (!canUpdate('nutrition')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier des ingrédients."
      );
      return;
    }
    setSelectedIngredient(ingredient);
    setIsEditing(true);
    setShowIngredientModal(true);
  };

  const handleDeleteIngredient = (ingredient: Ingredient) => {
    if (!canDelete('nutrition')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de supprimer des ingrédients."
      );
      return;
    }

    Alert.alert(
      "Supprimer l'ingrédient",
      `Êtes-vous sûr de vouloir supprimer "${ingredient.nom}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteIngredient(ingredient.id)).unwrap();
              Alert.alert('Succès', 'Ingrédient supprimé avec succès');
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression';
              Alert.alert('Erreur', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowIngredientModal(false);
    setSelectedIngredient(null);
    setIsEditing(false);
  };

  const handleSuccessModal = () => {
    handleCloseModal();
    if (projetActif) {
      dispatch(loadIngredients(projetActif.id));
    }
  };

  /**
   * Import des prix scannés depuis la photo
   */
  const handleImportScannedPrices = async (
    prices: Array<{ ingredient: string; prix: number; unite: 'kg' | 'sac' }>
  ) => {
    if (!projetActif || !canCreate('nutrition')) {
      Alert.alert('Erreur', "Impossible d'importer les prix");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const price of prices) {
      try {
        await dispatch(
          createIngredient({
            nom: price.ingredient,
            unite: price.unite,
            prix_unitaire: price.prix,
            proteine_pourcent: undefined,
            energie_kcal: undefined,
          })
        ).unwrap();
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Erreur pour ${price.ingredient}:`, error);
      }
    }

    // Recharger la liste
    dispatch(loadIngredients(projetActif.id));

    // Message de confirmation
    if (successCount > 0) {
      Alert.alert(
        '✅ Import réussi',
        `${successCount} ingrédient(s) importé(s)${errorCount > 0 ? `\n${errorCount} erreur(s)` : ''}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Erreur', "Aucun ingrédient n'a pu être importé");
    }
  };

  const renderIngredientCard = ({ item }: { item: Ingredient }) => {
    const getUniteDisplay = (unite: string) => {
      if (unite === 'sac') return 'sac (50kg)';
      return unite;
    };

    return (
      <TouchableOpacity
        onLongPress={() => {
          Alert.alert(item.nom, 'Que voulez-vous faire ?', [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Modifier',
              onPress: () => handleEditIngredient(item),
            },
            {
              text: 'Supprimer',
              onPress: () => handleDeleteIngredient(item),
              style: 'destructive',
            },
          ]);
        }}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.ingredientCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.ingredientHeader}>
            <View style={styles.ingredientInfo}>
              <Text style={[styles.ingredientNom, { color: colors.text }]}>{item.nom}</Text>
              <View style={styles.ingredientDetails}>
                <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {getUniteDisplay(item.unite)}
                  </Text>
                </View>
                {item.proteine_pourcent && item.proteine_pourcent > 0 && (
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    🥩 {item.proteine_pourcent}% protéines
                  </Text>
                )}
                {item.energie_kcal && item.energie_kcal > 0 && (
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    ⚡ {item.energie_kcal} kcal/kg
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.actionButtons}>
              {canUpdate('nutrition') && (
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => handleEditIngredient(item)}
                >
                  <Text style={[styles.editButtonText, { color: colors.primary }]}>✏️</Text>
                </TouchableOpacity>
              )}
              {canDelete('nutrition') && (
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: colors.error + '15' }]}
                  onPress={() => handleDeleteIngredient(item)}
                >
                  <Text style={[styles.deleteButtonText, { color: colors.error }]}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View
            style={[
              styles.prixContainer,
              { backgroundColor: colors.success + '10', borderColor: colors.success + '30' },
            ]}
          >
            <Text style={[styles.prixLabel, { color: colors.textSecondary }]}>Prix unitaire</Text>
            <Text style={[styles.prixValue, { color: colors.success }]}>
              {item.prix_unitaire.toLocaleString('fr-FR')} FCFA/{getUniteDisplay(item.unite)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des ingrédients..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>📦 Ingrédients</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Gérez vos ingrédients et leurs prix
          </Text>
        </View>
        {canCreate('nutrition') && (
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: colors.success }]}
            onPress={() => setShowScannerModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.scanButtonIcon}>📸</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ingrédients</Text>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.statValue, { color: colors.success }]}>
            {stats.prixMoyen.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>FCFA/kg moyen</Text>
        </View>
      </View>

      {/* Bouton Ajouter */}
      {canCreate('nutrition') && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setSelectedIngredient(null);
            setIsEditing(false);
            setShowIngredientModal(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>➕ Ajouter un ingrédient</Text>
        </TouchableOpacity>
      )}

      {/* Liste des ingrédients */}
      {filteredIngredients.length > 0 ? (
        <FlatList
          data={filteredIngredients}
          renderItem={renderIngredientCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery ? 'Aucun ingrédient trouvé' : 'Aucun ingrédient'}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
            Commencez par ajouter des ingrédients avec leurs prix
          </Text>
        </View>
      )}

      {/* Modal Ajout/Modification Ingrédient */}
      <IngredientFormModal
        visible={showIngredientModal}
        onClose={handleCloseModal}
        onSuccess={handleSuccessModal}
        ingredient={selectedIngredient}
        isEditing={isEditing}
      />

      {/* Modal Scanner de Prix */}
      <PriceScannerModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onImport={handleImportScannedPrices}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scanButtonIcon: {
    fontSize: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
  addButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  listContainer: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  ingredientCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientNom: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  ingredientDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  detailText: {
    fontSize: FONT_SIZES.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 18,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },
  prixContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  prixLabel: {
    fontSize: FONT_SIZES.sm,
  },
  prixValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
});
