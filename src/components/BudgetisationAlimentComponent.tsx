/**
 * Composant Budgétisation Aliment
 * Permet de créer, gérer et visualiser plusieurs rations budget
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadIngredients,
  loadRationsBudget,
  createRationBudget,
  deleteRationBudget,
  updateRationBudget,
} from '../store/slices/nutritionSlice';
import {
  getTypePorcLabel,
  RECOMMANDATIONS_NUTRITION,
  FORMULES_RECOMMANDEES,
} from '../types/nutrition';
import type {
  TypePorc,
  RationBudget,
  CreateRationBudgetInput,
  FormuleAlimentaire,
} from '../types/nutrition';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import FormField from './FormField';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import CustomModal from './CustomModal';
import ModifierIngredientsRationModal from './ModifierIngredientsRationModal';
import { logger } from '../utils/logger';

export default function BudgetisationAlimentComponent() {
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { ingredients, rationsBudget, loading } = useAppSelector((state) => state.nutrition);

  // États pour le modal de création/édition
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [rationEnEdition, setRationEnEdition] = useState<RationBudget | null>(null);
  const [nomRation, setNomRation] = useState('');
  const [typePorc, setTypePorc] = useState<TypePorc>('porc_croissance');
  const [poidsMoyen, setPoidsMoyen] = useState('');
  const [nombrePorcs, setNombrePorcs] = useState('');
  const [dureeJours, setDureeJours] = useState('30');

  // État pour la modale de modification d'ingrédients
  const [showModifierIngredientsModal, setShowModifierIngredientsModal] = useState(false);
  const [rationAModifier, setRationAModifier] = useState<RationBudget | null>(null);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadIngredients(projetActif.id));
      dispatch(loadRationsBudget(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  const typesPorc: TypePorc[] = [
    'porcelet',
    'truie_gestante',
    'truie_allaitante',
    'verrat',
    'porc_croissance',
  ];

  /**
   * Statistiques globales
   */
  const statistiques = useMemo(() => {
    if (rationsBudget.length === 0) {
      return {
        nombreRations: 0,
        coutTotal: 0,
        coutMoyenParKg: 0,
        coutMoyenParPorc: 0,
      };
    }

    const nombreRations = rationsBudget.length;
    const coutTotal = rationsBudget.reduce((sum, r) => sum + r.cout_total, 0);

    // Coût moyen par ration
    const coutMoyenRation = coutTotal / nombreRations;

    // Coût moyen par kg (moyenne pondérée)
    const quantiteTotale = rationsBudget.reduce((sum, r) => sum + r.quantite_totale_kg, 0);
    const coutMoyenParKg = quantiteTotale > 0 ? coutTotal / quantiteTotale : 0;

    // Coût moyen par porc (moyenne des coûts par porc)
    const coutMoyenParPorc =
      rationsBudget.reduce((sum, r) => sum + r.cout_par_porc, 0) / nombreRations;

    return {
      nombreRations,
      coutTotal,
      coutMoyenRation,
      coutMoyenParKg,
      coutMoyenParPorc,
    };
  }, [rationsBudget]);

  /**
   * Matcher les ingrédients de la formule avec ceux en base de données
   * Convertit automatiquement le prix par sac en prix par kg
   */
  const matcherIngredients = (formule: FormuleAlimentaire): FormuleAlimentaire => {
    const formuleAvecPrix = { ...formule };
    formuleAvecPrix.composition = formule.composition.map((comp) => {
      const ingredientTrouve = ingredients.find(
        (ing) =>
          ing.nom.toLowerCase().includes(comp.nom.toLowerCase()) ||
          comp.nom.toLowerCase().includes(ing.nom.toLowerCase())
      );

      // Convertir le prix si l'unité est "sac" (50kg)
      let prixParKg = ingredientTrouve?.prix_unitaire || 0;
      if (ingredientTrouve?.unite === 'sac') {
        prixParKg = prixParKg / 50; // Un sac = 50kg
      }

      return {
        ...comp,
        ingredient_id: ingredientTrouve?.id || '',
        prix_unitaire: prixParKg,
      };
    });
    return formuleAvecPrix;
  };

  /**
   * Créer ou modifier une ration budget
   */
  const handleCreerRation = async () => {
    if (!nomRation.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour la ration');
      return;
    }
    if (!poidsMoyen || parseFloat(poidsMoyen) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un poids moyen valide');
      return;
    }
    if (!nombrePorcs || parseInt(nombrePorcs) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un nombre de porcs valide');
      return;
    }
    if (!dureeJours || parseInt(dureeJours) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir une durée valide');
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert(
        'Aucun ingrédient',
        'Veuillez d\'abord ajouter des ingrédients avec leurs prix dans la section "Ingrédients"',
        [{ text: 'OK' }]
      );
      return;
    }

    const poidsMoyenKg = parseFloat(poidsMoyen);
    const nbPorcs = parseInt(nombrePorcs);
    const duree = parseInt(dureeJours);

    // Récupérer la recommandation nutritionnelle
    const recommandation = RECOMMANDATIONS_NUTRITION[typePorc];
    const rationJournaliere = recommandation.ration_kg_jour || 2.5;

    // Récupérer la formule alimentaire recommandée
    const formuleBase = FORMULES_RECOMMANDEES[typePorc];
    const formuleAvecPrix = matcherIngredients(formuleBase);

    // Calculer la quantité totale d'aliment nécessaire
    const quantiteTotaleKg = rationJournaliere * nbPorcs * duree;

    // Calculer les quantités et coûts par ingrédient
    const detailsIngredients = formuleAvecPrix.composition.map((comp) => {
      const quantiteKg = (quantiteTotaleKg * comp.pourcentage) / 100;
      const coutTotal = quantiteKg * comp.prix_unitaire;
      return {
        nom: comp.nom,
        pourcentage: comp.pourcentage,
        quantite_kg: quantiteKg,
        prix_unitaire: comp.prix_unitaire,
        cout_total: coutTotal,
      };
    });

    // Calculer les totaux
    const coutTotal = detailsIngredients.reduce((sum, ing) => sum + ing.cout_total, 0);
    const coutParKg = quantiteTotaleKg > 0 ? coutTotal / quantiteTotaleKg : 0;
    const coutParPorc = nbPorcs > 0 ? coutTotal / nbPorcs : 0;

    // Créer l'input pour la ration budget
    const input: CreateRationBudgetInput = {
      projet_id: projetActif!.id,
      nom: nomRation.trim(),
      type_porc: typePorc,
      poids_moyen_kg: poidsMoyenKg,
      nombre_porcs: nbPorcs,
      duree_jours: duree,
      ration_journaliere_par_porc: rationJournaliere,
      quantite_totale_kg: quantiteTotaleKg,
      cout_total: coutTotal,
      cout_par_kg: coutParKg,
      cout_par_porc: coutParPorc,
      ingredients: detailsIngredients,
    };

    try {
      if (isEditing && rationEnEdition) {
        // Mode édition : supprimer l'ancienne et créer la nouvelle
        // Utiliser une approche séquentielle pour éviter les conflits
        try {
          // D'abord supprimer l'ancienne ration
          await dispatch(deleteRationBudget(rationEnEdition.id)).unwrap();

          // Ensuite créer la nouvelle avec les données mises à jour
          await dispatch(createRationBudget(input)).unwrap();

          Alert.alert('✅ Succès', 'Ration modifiée avec succès');
        } catch (error: unknown) {
          logger.error('Erreur lors de la modification de la ration:', error);
          const errorMessage = error?.message || error || 'Impossible de modifier la ration';
          Alert.alert('Erreur', errorMessage);
          // Ne pas fermer le modal en cas d'erreur pour permettre à l'utilisateur de réessayer
          return;
        }
      } else {
        // Mode création
        await dispatch(createRationBudget(input)).unwrap();
        Alert.alert('✅ Succès', 'Ration créée avec succès');
      }

      // Recharger les rations pour mettre à jour la liste
      if (projetActif) {
        await dispatch(loadRationsBudget(projetActif.id)).unwrap();
      }

      // Réinitialiser le formulaire et fermer le modal
      resetForm();
      setShowModal(false);
    } catch (error: unknown) {
      logger.error('Erreur lors de la création/modification de la ration:', error);
      const errorMessage =
        error?.message ||
        error ||
        (isEditing ? 'Impossible de modifier la ration' : 'Impossible de créer la ration');
      Alert.alert('Erreur', errorMessage);
    }
  };

  const resetForm = () => {
    setNomRation('');
    setPoidsMoyen('');
    setNombrePorcs('');
    setDureeJours('30');
    setTypePorc('porc_croissance');
    setIsEditing(false);
    setRationEnEdition(null);
  };

  const handleModifierRation = (ration: RationBudget) => {
    setIsEditing(true);
    setRationEnEdition(ration);
    setNomRation(ration.nom);
    setTypePorc(ration.type_porc);
    setPoidsMoyen(ration.poids_moyen_kg.toString());
    setNombrePorcs(ration.nombre_porcs.toString());
    setDureeJours(ration.duree_jours.toString());
    setShowModal(true);
  };

  const handleModifierIngredients = (ration: RationBudget) => {
    setRationAModifier(ration);
    setShowModifierIngredientsModal(true);
  };

  const handleSauvegarderIngredientsModifies = async (ingredientsModifies: unknown[]) => {
    if (!rationAModifier) return;

    try {
      // Recalculer les quantités et coûts avec les nouveaux ingrédients
      const detailsIngredients = ingredientsModifies.map((ing) => {
        const quantiteKg = (rationAModifier.quantite_totale_kg * ing.pourcentage) / 100;
        const coutTotal = quantiteKg * ing.prix_unitaire;
        return {
          nom: ing.nom,
          pourcentage: ing.pourcentage,
          quantite_kg: quantiteKg,
          prix_unitaire: ing.prix_unitaire,
          cout_total: coutTotal,
        };
      });

      // Calculer les nouveaux totaux
      const coutTotal = detailsIngredients.reduce((sum, ing) => sum + ing.cout_total, 0);
      const coutParKg =
        rationAModifier.quantite_totale_kg > 0 ? coutTotal / rationAModifier.quantite_totale_kg : 0;
      const coutParPorc =
        rationAModifier.nombre_porcs > 0 ? coutTotal / rationAModifier.nombre_porcs : 0;

      // Créer l'input de mise à jour
      const input: CreateRationBudgetInput = {
        projet_id: rationAModifier.projet_id,
        nom: rationAModifier.nom,
        type_porc: rationAModifier.type_porc,
        poids_moyen_kg: rationAModifier.poids_moyen_kg,
        nombre_porcs: rationAModifier.nombre_porcs,
        duree_jours: rationAModifier.duree_jours,
        ration_journaliere_par_porc: rationAModifier.ration_journaliere_par_porc,
        quantite_totale_kg: rationAModifier.quantite_totale_kg,
        cout_total: coutTotal,
        cout_par_kg: coutParKg,
        cout_par_porc: coutParPorc,
        ingredients: detailsIngredients,
      };

      // Supprimer l'ancienne et créer la nouvelle
      await dispatch(deleteRationBudget(rationAModifier.id)).unwrap();
      await dispatch(createRationBudget(input)).unwrap();

      Alert.alert('✅ Succès', 'Ingrédients de la ration modifiés avec succès');
      setRationAModifier(null);
    } catch (error: unknown) {
      Alert.alert('Erreur', error || 'Impossible de modifier les ingrédients');
    }
  };

  const handleRecalculerRation = async (ration: RationBudget) => {
    Alert.alert(
      'Recalculer la ration',
      'Voulez-vous recalculer cette ration avec les prix actuels des ingrédients ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Recalculer',
          onPress: async () => {
            try {
              // Récupérer la formule recommandée pour ce type de porc
              const formuleBase = FORMULES_RECOMMANDEES[ration.type_porc];
              const formuleAvecPrix = matcherIngredients(formuleBase);

              // Recalculer les quantités et coûts avec les prix actuels
              const detailsIngredients = formuleAvecPrix.composition.map((comp) => {
                const quantiteKg = (ration.quantite_totale_kg * comp.pourcentage) / 100;
                const coutTotal = quantiteKg * comp.prix_unitaire;
                return {
                  nom: comp.nom,
                  pourcentage: comp.pourcentage,
                  quantite_kg: quantiteKg,
                  prix_unitaire: comp.prix_unitaire,
                  cout_total: coutTotal,
                };
              });

              // Calculer les nouveaux totaux
              const coutTotal = detailsIngredients.reduce((sum, ing) => sum + ing.cout_total, 0);
              const coutParKg =
                ration.quantite_totale_kg > 0 ? coutTotal / ration.quantite_totale_kg : 0;
              const coutParPorc = ration.nombre_porcs > 0 ? coutTotal / ration.nombre_porcs : 0;

              // Créer l'input de mise à jour
              const input: CreateRationBudgetInput = {
                projet_id: ration.projet_id,
                nom: ration.nom,
                type_porc: ration.type_porc,
                poids_moyen_kg: ration.poids_moyen_kg,
                nombre_porcs: ration.nombre_porcs,
                duree_jours: ration.duree_jours,
                ration_journaliere_par_porc: ration.ration_journaliere_par_porc,
                quantite_totale_kg: ration.quantite_totale_kg,
                cout_total: coutTotal,
                cout_par_kg: coutParKg,
                cout_par_porc: coutParPorc,
                ingredients: detailsIngredients,
              };

              // Supprimer l'ancienne et créer la nouvelle (avec les mêmes données mais coûts mis à jour)
              await dispatch(deleteRationBudget(ration.id)).unwrap();
              await dispatch(createRationBudget(input)).unwrap();

              Alert.alert('✅ Succès', 'Ration recalculée avec les prix actuels');
            } catch (error: unknown) {
              Alert.alert('Erreur', error || 'Impossible de recalculer la ration');
            }
          },
        },
      ]
    );
  };

  const handleSupprimerRation = (ration: RationBudget) => {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer la ration "${ration.nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteRationBudget(ration.id)).unwrap();
              Alert.alert('✅ Succès', 'Ration supprimée');
            } catch (error: unknown) {
              Alert.alert('Erreur', error || 'Impossible de supprimer la ration');
            }
          },
        },
      ]
    );
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const renderRationCard = ({ item }: { item: RationBudget }) => (
    <View
      style={[styles.rationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* En-tête */}
      <View style={styles.rationHeader}>
        <View style={styles.rationHeaderLeft}>
          <Text style={[styles.rationNom, { color: colors.text }]}>{item.nom}</Text>
          <Text style={[styles.rationType, { color: colors.textSecondary }]}>
            {getTypePorcLabel(item.type_porc)}
          </Text>
        </View>
        <View style={styles.rationHeaderButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
            onPress={() => handleModifierRation(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: colors.success }]}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.info + '20' }]}
            onPress={() => handleModifierIngredients(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: colors.info }]}>🥕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
            onPress={() => handleRecalculerRation(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => handleSupprimerRation(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: colors.error }]}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Informations */}
      <View style={styles.rationInfo}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nombre de porcs:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{item.nombre_porcs}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Durée:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{item.duree_jours} jours</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Quantité totale:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {item.quantite_totale_kg.toFixed(0)} kg
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            Ration journalière:
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {item.ration_journaliere_par_porc.toFixed(1)} kg/jour/porc
          </Text>
        </View>
      </View>

      {/* Composition alimentaire */}
      <View
        style={[
          styles.compositionSection,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.compositionTitle, { color: colors.text }]}>
          🍽️ Composition alimentaire
        </Text>
        {item.ingredients.map((ing, index) => (
          <View key={index} style={styles.ingredientRow}>
            <View style={styles.ingredientLeft}>
              <Text style={[styles.ingredientNom, { color: colors.text }]}>{ing.nom}</Text>
              <Text style={[styles.ingredientDetail, { color: colors.textSecondary }]}>
                {ing.pourcentage.toFixed(1)}% • {ing.quantite_kg.toFixed(1)} kg
              </Text>
            </View>
            <View style={styles.ingredientRight}>
              <Text style={[styles.ingredientPrix, { color: colors.text }]}>
                {formatMontant(ing.cout_total)} F
              </Text>
              <Text style={[styles.ingredientPrixUnit, { color: colors.textSecondary }]}>
                ({formatMontant(ing.prix_unitaire)} F/kg)
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Coûts */}
      <View
        style={[
          styles.rationCouts,
          { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
        ]}
      >
        <View style={styles.coutItem}>
          <Text style={[styles.coutLabel, { color: colors.textSecondary }]}>Coût total</Text>
          <Text style={[styles.coutValue, { color: colors.primary }]}>
            {formatMontant(item.cout_total)} F
          </Text>
        </View>
        <View style={styles.coutItem}>
          <Text style={[styles.coutLabel, { color: colors.textSecondary }]}>Par kg</Text>
          <Text style={[styles.coutValue, { color: colors.text }]}>
            {formatMontant(item.cout_par_kg)} F
          </Text>
        </View>
        <View style={styles.coutItem}>
          <Text style={[styles.coutLabel, { color: colors.textSecondary }]}>Par porc</Text>
          <Text style={[styles.coutValue, { color: colors.text }]}>
            {formatMontant(item.cout_par_porc)} F
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading && rationsBudget.length === 0) {
    return <LoadingSpinner message="Chargement..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête avec statistiques */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Carte récapitulative */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: colors.text }]}>📊 Récapitulatif</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Nombre de rations
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {statistiques.nombreRations}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Coût total</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {formatMontant(statistiques.coutTotal)} F
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Coût moyen/ration
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatMontant(statistiques.coutMoyenRation || 0)} F
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Coût moyen/kg
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatMontant(statistiques.coutMoyenParKg)} F
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Coût moyen/porc
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatMontant(statistiques.coutMoyenParPorc)} F
              </Text>
            </View>
          </View>
        </View>

        {/* Bouton Créer une ration */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.createButtonText}>➕ Créer une ration</Text>
        </TouchableOpacity>

        {/* Liste des rations */}
        {rationsBudget.length === 0 ? (
          <EmptyState
            icon="🧮"
            title="Aucune ration"
            message="Créez votre première ration pour commencer la budgétisation"
          />
        ) : (
          <View style={styles.listContainer}>
            {rationsBudget.map((item) => (
              <View key={item.id}>{renderRationCard({ item })}</View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de création/édition */}
      <CustomModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={isEditing ? '✏️ Modifier la Ration' : '➕ Nouvelle Ration'}
        showButtons={false}
        scrollEnabled={false}
      >
        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentContainer}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {/* Nom de la ration */}
          <FormField
            label="Nom de la ration *"
            value={nomRation}
            onChangeText={setNomRation}
            placeholder="Ex: Porcelets - Bâtiment A"
          />

          {/* Type de porc */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Type de porc *</Text>
            <View style={styles.typeGrid}>
              {typesPorc.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: typePorc === type ? colors.primary : colors.surface,
                      borderColor: typePorc === type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setTypePorc(type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      { color: typePorc === type ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {getTypePorcLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Poids moyen */}
          <FormField
            label="Poids moyen (kg) *"
            value={poidsMoyen}
            onChangeText={setPoidsMoyen}
            keyboardType="decimal-pad"
            placeholder="Ex: 50"
          />

          {/* Nombre de porcs */}
          <FormField
            label="Nombre de porcs *"
            value={nombrePorcs}
            onChangeText={setNombrePorcs}
            keyboardType="number-pad"
            placeholder="Ex: 20"
          />

          {/* Durée */}
          <FormField
            label="Durée (jours) *"
            value={dureeJours}
            onChangeText={setDureeJours}
            keyboardType="number-pad"
            placeholder="Ex: 30"
          />

          {/* Boutons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.confirmButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleCreerRation}
            >
              <Text style={styles.confirmButtonText}>{isEditing ? 'Modifier' : 'Créer'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </CustomModal>

      {/* Modale de modification d'ingrédients */}
      {rationAModifier && (
        <ModifierIngredientsRationModal
          visible={showModifierIngredientsModal}
          onClose={() => {
            setShowModifierIngredientsModal(false);
            setRationAModifier(null);
          }}
          rationNom={rationAModifier.nom}
          ingredients={rationAModifier.ingredients}
          ingredientsDisponibles={ingredients}
          onSave={handleSauvegarderIngredientsModifies}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  summaryCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  summaryItem: {
    width: '50%',
    padding: SPACING.xs,
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  listContainer: {
    gap: SPACING.md,
  },
  rationCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  rationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  rationHeaderLeft: {
    flex: 1,
  },
  rationNom: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  rationType: {
    fontSize: FONT_SIZES.sm,
  },
  rationHeaderButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  actionButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: FONT_SIZES.lg,
  },
  deleteButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  deleteButtonText: {
    fontSize: FONT_SIZES.md,
  },
  rationInfo: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  compositionSection: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  compositionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  ingredientLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  ingredientNom: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  ingredientDetail: {
    fontSize: FONT_SIZES.xs,
  },
  ingredientRight: {
    alignItems: 'flex-end',
  },
  ingredientPrix: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  ingredientPrixUnit: {
    fontSize: FONT_SIZES.xs,
  },
  rationCouts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  coutItem: {
    flex: 1,
    alignItems: 'center',
  },
  coutLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  coutValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  createButton: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContent: {
    maxHeight: 500,
  },
  modalContentContainer: {
    paddingBottom: SPACING.lg,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  typeButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  confirmButton: {
    // backgroundColor défini dans le JSX
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyStateButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  emptyStateButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
