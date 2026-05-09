/**
 * Composant Calculateur de Ration avec Recommandations Automatiques
 * Génère des recommandations alimentaires et calcule les coûts
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useProjetEffectif } from '../hooks/useProjetEffectif';
import { loadIngredients } from '../store/slices/nutritionSlice';
import type {
  TypePorc,
  ResultatCalculRation,
  FormuleAlimentaire,
  Ingredient,
} from '../types/nutrition';
import { getTypePorcLabel, RECOMMANDATIONS_NUTRITION, FORMULES_RECOMMANDEES } from '../types/nutrition';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import FormField from './FormField';
import LoadingSpinner from './LoadingSpinner';

export default function CalculateurRationComponent() {
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const { ingredients = [], loading = false } = useAppSelector((state) => state.nutrition ?? { ingredients: [], loading: false });

  // États du formulaire
  const [typePorc, setTypePorc] = useState<TypePorc>('porc_croissance');
  const [poidsMoyen, setPoidsMoyen] = useState('');
  const [nombrePorcs, setNombrePorcs] = useState('');
  const [dureeJours, setDureeJours] = useState('30'); // 1 mois par défaut

  // Résultat du calcul
  const [resultat, setResultat] = useState<ResultatCalculRation | null>(null);

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

  /**
   * Fonction pour matcher les ingrédients de la formule avec ceux en base de données
   */
  const matcherIngredients = (formule: FormuleAlimentaire): FormuleAlimentaire => {
    const formuleAvecPrix = { ...formule };
    formuleAvecPrix.composition = formule.composition.map((comp) => {
      // Chercher l'ingrédient correspondant dans la BDD
      const ingredientTrouve = ingredients.find(
        (ing: any) =>
          ing.nom.toLowerCase().includes(comp.nom.toLowerCase()) ||
          comp.nom.toLowerCase().includes(ing.nom.toLowerCase())
      );

      return {
        ...comp,
        ingredient_id: ingredientTrouve?.id || '',
        prix_unitaire: ingredientTrouve?.prix_unitaire || 0,
      };
    });
    return formuleAvecPrix;
  };

  /**
   * Calcule la ration avec recommandations automatiques
   */
  const calculerRation = () => {
    // Validations
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

    const poidsMoyenKg = parseFloat(poidsMoyen);
    const nbPorcs = parseInt(nombrePorcs);
    const duree = parseInt(dureeJours);

    // Vérifier qu'il y a des ingrédients
    if (ingredients.length === 0) {
      Alert.alert(
        'Aucun ingrédient',
        'Veuillez d\'abord ajouter des ingrédients avec leurs prix dans la section "Ingrédients"',
        [{ text: 'OK' }]
      );
      return;
    }

    // 1. Récupérer la recommandation nutritionnelle
    const recommandation = RECOMMANDATIONS_NUTRITION[typePorc];
    const rationJournaliere = recommandation.ration_kg_jour || 2.5;

    // 2. Récupérer la formule alimentaire recommandée
    const formuleBase = FORMULES_RECOMMANDEES[typePorc];
    const formuleAvecPrix = matcherIngredients(formuleBase);

    // 3. Calculer la quantité totale d'aliment nécessaire
    const quantiteTotaleKg = rationJournaliere * nbPorcs * duree;

    // 4. Calculer les quantités et coûts par ingrédient
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

    // 5. Calculer les totaux
    const coutTotal = detailsIngredients.reduce((sum, ing) => sum + ing.cout_total, 0);
    const coutParKg = quantiteTotaleKg > 0 ? coutTotal / quantiteTotaleKg : 0;
    const coutParPorc = nbPorcs > 0 ? coutTotal / nbPorcs : 0;

    // 6. Créer le résultat
    const resultatCalcul: ResultatCalculRation = {
      type_porc: typePorc,
      poids_moyen_kg: poidsMoyenKg,
      nombre_porcs: nbPorcs,
      duree_jours: duree,
      ration_journaliere_par_porc: rationJournaliere,
      formule_recommandee: formuleAvecPrix,
      details_ingredients: detailsIngredients,
      quantite_totale_kg: quantiteTotaleKg,
      cout_total: coutTotal,
      cout_par_kg: coutParKg,
      cout_par_porc: coutParPorc,
    };

    setResultat(resultatCalcul);

    // Vérifier si certains ingrédients n'ont pas de prix
    const ingredientsSansPrix = detailsIngredients.filter((ing) => ing.prix_unitaire === 0);
    if (ingredientsSansPrix.length > 0) {
      Alert.alert(
        '⚠️ Prix manquants',
        `Certains ingrédients n'ont pas de prix défini :\n\n${ingredientsSansPrix.map((i) => '• ' + i.nom).join('\n')}\n\nAjoutez-les dans la section "Ingrédients" pour un calcul précis.`,
        [{ text: 'Compris' }]
      );
    }
  };

  const resetCalcul = () => {
    setResultat(null);
    setPoidsMoyen('');
    setNombrePorcs('');
    setDureeJours('30');
  };

  if (loading) {
    return <LoadingSpinner message="Chargement..." />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🧮 Calculateur de Ration</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Recommandations automatiques et calcul des coûts
        </Text>
      </View>

      {/* Formulaire */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>📝 Informations</Text>

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
          label="Durée d'alimentation (jours) *"
          value={dureeJours}
          onChangeText={setDureeJours}
          keyboardType="number-pad"
          placeholder="Ex: 30"
        />

        {/* Bouton Calculer */}
        <TouchableOpacity
          style={[styles.calculateButton, { backgroundColor: colors.primary }]}
          onPress={calculerRation}
          activeOpacity={0.7}
        >
          <Text style={styles.calculateButtonText}>🧮 Calculer la ration</Text>
        </TouchableOpacity>
      </View>

      {/* Résultat */}
      {resultat && (
        <>
          {/* Recommandation nutritionnelle */}
          <View
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              💡 Recommandation Nutritionnelle
            </Text>
            <View
              style={[
                styles.infoBox,
                { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
              ]}
            >
              <Text style={[styles.infoText, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>Formule : </Text>
                {resultat.formule_recommandee.nom}
              </Text>
              <Text style={[styles.infoTextSmall, { color: colors.textSecondary }]}>
                {resultat.formule_recommandee.description}
              </Text>
              <View style={styles.separator} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                <Text style={{ fontWeight: 'bold' }}>Ration journalière : </Text>
                {resultat.ration_journaliere_par_porc.toFixed(2)} kg/jour/porc
              </Text>
            </View>
          </View>

          {/* Composition de la formule */}
          <View
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              📊 Composition Recommandée
            </Text>
            {resultat.details_ingredients.map((ing, index) => (
              <View
                key={index}
                style={[styles.ingredientRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.ingredientInfo}>
                  <Text style={[styles.ingredientNom, { color: colors.text }]}>{ing.nom}</Text>
                  <Text style={[styles.ingredientPourcentage, { color: colors.primary }]}>
                    {ing.pourcentage}%
                  </Text>
                </View>
                <View style={styles.ingredientData}>
                  <Text style={[styles.ingredientQuantite, { color: colors.text }]}>
                    {ing.quantite_kg.toFixed(1)} kg
                  </Text>
                  <Text
                    style={[
                      styles.ingredientPrix,
                      { color: ing.prix_unitaire > 0 ? colors.success : colors.error },
                    ]}
                  >
                    {ing.prix_unitaire > 0
                      ? `${ing.prix_unitaire.toLocaleString('fr-FR')} FCFA/kg`
                      : 'Prix non défini'}
                  </Text>
                  {ing.prix_unitaire > 0 && (
                    <Text style={[styles.ingredientCout, { color: colors.success }]}>
                      = {ing.cout_total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Résumé des coûts */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.success + '10', borderColor: colors.success + '30' },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>💰 Résumé des Coûts</Text>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>
                Quantité totale requise
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {resultat.quantite_totale_kg.toFixed(0)} kg
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Coût total</Text>
              <Text style={[styles.summaryValueLarge, { color: colors.success }]}>
                {resultat.cout_total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>
                Coût par kg d'aliment
              </Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {resultat.cout_par_kg.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA/kg
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>
                Coût par porc ({resultat.duree_jours} jours)
              </Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {resultat.cout_par_porc.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
              </Text>
            </View>
          </View>

          {/* Bouton Nouveau calcul */}
          <TouchableOpacity
            style={[
              styles.resetButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={resetCalcul}
            activeOpacity={0.7}
          >
            <Text style={[styles.resetButtonText, { color: colors.primary }]}>
              🔄 Nouveau calcul
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Message si pas d'ingrédients */}
      {ingredients.length === 0 && !resultat && (
        <View
          style={[
            styles.warningBox,
            { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' },
          ]}
        >
          <Text style={[styles.warningText, { color: colors.warning }]}>
            ⚠️ Aucun ingrédient disponible
          </Text>
          <Text style={[styles.warningTextSmall, { color: colors.textSecondary }]}>
            Ajoutez des ingrédients avec leurs prix dans la section "Ingrédients" pour utiliser le
            calculateur.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
  },
  card: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.md,
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
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  calculateButton: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  infoBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  infoText: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs,
  },
  infoTextSmall: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  separator: {
    height: 1,
    backgroundColor: '#00000015',
    marginVertical: SPACING.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientNom: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  ingredientPourcentage: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
  },
  ingredientData: {
    alignItems: 'flex-end',
  },
  ingredientQuantite: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  ingredientPrix: {
    fontSize: FONT_SIZES.xs,
    marginBottom: 2,
  },
  ingredientCout: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.md,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  summaryValueLarge: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  resetButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: SPACING.xl,
  },
  resetButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  warningBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  warningText: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  warningTextSmall: {
    fontSize: FONT_SIZES.sm,
  },
});
