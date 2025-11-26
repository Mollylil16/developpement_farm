/**
 * Formulaire modal pour l'enregistrement des mouvements de stock
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAppDispatch } from '../store/hooks';
import { createStockMouvement, loadMouvementsParAliment } from '../store/slices/stocksSlice';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import CustomModal from './CustomModal';
import FormField from './FormField';
import Button from './Button';
import { StockAliment, TypeMouvementStock, UniteStock } from '../types';
import { useActionPermissions } from '../hooks/useActionPermissions';

interface StockMovementFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  aliment: StockAliment;
}

const TYPES_MOUVEMENT: TypeMouvementStock[] = ['entree', 'sortie', 'ajustement'];

export default function StockMovementFormModal({
  visible,
  onClose,
  onSuccess,
  aliment,
}: StockMovementFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<TypeMouvementStock>('entree');
  const [quantite, setQuantite] = useState<number>(0);
  const [stockRestant, setStockRestant] = useState<number>(aliment.quantite_actuelle); // Pour les sorties
  const [unite, setUnite] = useState<UniteStock>(aliment.unite);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [origine, setOrigine] = useState<string>('');
  const [commentaire, setCommentaire] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setType('entree');
      setQuantite(0);
      setStockRestant(aliment.quantite_actuelle);
      setUnite(aliment.unite);
      setDate(new Date().toISOString().split('T')[0]);
      setOrigine('');
      setCommentaire('');
    }
  }, [visible, aliment]);

  const handleTypeChange = (newType: TypeMouvementStock) => {
    setType(newType);

    switch (newType) {
      case 'entree':
        setQuantite(0);
        break;
      case 'sortie':
        setStockRestant(aliment.quantite_actuelle); // Pour une sortie, on entre le stock restant actuel
        break;
      case 'ajustement':
        setQuantite(aliment.quantite_actuelle);
        break;
      default:
        break;
    }
  };

  // Calculer la quantité sortie automatiquement (stock actuel - stock restant)
  const quantiteSortie =
    type === 'sortie' ? Math.max(0, aliment.quantite_actuelle - stockRestant) : 0;

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (!canCreate('nutrition')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission d'effectuer des mouvements de stock."
      );
      return;
    }

    if (type === 'entree' && quantite <= 0) {
      Alert.alert('Valeur invalide', 'La quantité doit être supérieure à 0');
      return;
    }

    if (type === 'sortie') {
      if (stockRestant < 0) {
        Alert.alert('Valeur invalide', 'Le stock restant ne peut pas être négatif');
        return;
      }

      if (stockRestant > aliment.quantite_actuelle) {
        Alert.alert(
          'Valeur invalide',
          `Le stock restant (${stockRestant}) ne peut pas être supérieur au stock actuel (${aliment.quantite_actuelle} ${aliment.unite})`
        );
        return;
      }

      if (quantiteSortie <= 0) {
        Alert.alert(
          'Valeur invalide',
          'Aucune sortie détectée. Le stock restant est identique au stock actuel.'
        );
        return;
      }
    }

    if (type === 'ajustement' && quantite < 0) {
      Alert.alert('Valeur invalide', 'La nouvelle quantité ne peut pas être négative');
      return;
    }

    // Déterminer la quantité du mouvement selon le type
    const quantiteMouvement = type === 'sortie' ? quantiteSortie : quantite;

    setLoading(true);
    try {
      await dispatch(
        createStockMouvement({
          projet_id: aliment.projet_id,
          aliment_id: aliment.id,
          type,
          quantite: quantiteMouvement,
          unite,
          date,
          origine: origine || undefined,
          commentaire: commentaire || undefined,
        })
      ).unwrap();

      await dispatch(loadMouvementsParAliment({ alimentId: aliment.id })).unwrap();

      onSuccess();
    } catch (error: any) {
      console.error('Erreur lors de la création du mouvement:', error);
      Alert.alert(
        'Erreur',
        error?.message || "Une erreur est survenue lors de l'enregistrement du mouvement"
      );
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (t: TypeMouvementStock) => {
    switch (t) {
      case 'entree':
        return 'Entrée';
      case 'sortie':
        return 'Sortie';
      case 'ajustement':
        return 'Ajustement';
      default:
        return t;
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={`Nouveau mouvement - ${aliment.nom}`}
      confirmText="Enregistrer"
      onConfirm={handleSubmit}
      showButtons
      loading={loading}
      scrollEnabled={true}
    >
      <>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Type de mouvement</Text>
          <View style={styles.optionsContainer}>
            {TYPES_MOUVEMENT.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  type === t && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleTypeChange(t)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    type === t && {
                      color: colors.textOnPrimary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {getTypeLabel(t)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {type === 'sortie' ? (
          <FormField
            label={`Stock restant actuel (${aliment.unite})`}
            value={stockRestant.toString()}
            onChangeText={(text) => setStockRestant(text ? parseFloat(text) : 0)}
            keyboardType="numeric"
            placeholder={aliment.quantite_actuelle.toString()}
            required
          />
        ) : (
          <FormField
            label={type === 'ajustement' ? 'Nouvelle quantité' : 'Quantité'}
            value={quantite.toString()}
            onChangeText={(text) => setQuantite(text ? parseFloat(text) : 0)}
            keyboardType="numeric"
            placeholder={type === 'ajustement' ? aliment.quantite_actuelle.toString() : '0'}
            required
          />
        )}

        <FormField
          label="Unité"
          value={unite}
          onChangeText={(text) => setUnite(text as UniteStock)}
          placeholder={aliment.unite}
        />

        <FormField
          label="Date"
          value={date}
          onChangeText={(text) => setDate(text)}
          placeholder="YYYY-MM-DD"
        />

        <FormField
          label="Origine / Fournisseur"
          value={origine}
          onChangeText={(text) => setOrigine(text)}
          placeholder="Ex: Fournisseur, Autre source..."
        />

        <FormField
          label="Commentaire"
          value={commentaire}
          onChangeText={(text) => setCommentaire(text)}
          placeholder="Informations supplémentaires"
          multiline
          numberOfLines={3}
        />

        <View style={[styles.summaryBox, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.summaryTitle, { color: colors.primary }]}>
            {type === 'sortie' ? '📊 Calcul automatique' : 'Stock actuel'}
          </Text>

          {type === 'sortie' ? (
            <>
              <View style={styles.calculRow}>
                <Text style={[styles.calculLabel, { color: colors.text }]}>
                  Stock avant contrôle:
                </Text>
                <Text style={[styles.calculValue, { color: colors.text }]}>
                  {aliment.quantite_actuelle} {aliment.unite}
                </Text>
              </View>
              <View style={styles.calculRow}>
                <Text style={[styles.calculLabel, { color: colors.text }]}>
                  Stock restant constaté:
                </Text>
                <Text style={[styles.calculValue, { color: colors.text }]}>
                  {stockRestant} {aliment.unite}
                </Text>
              </View>
              <View
                style={[
                  styles.calculRow,
                  styles.calculHighlight,
                  { backgroundColor: colors.error + '15' },
                ]}
              >
                <Text style={[styles.calculLabel, { color: colors.error, fontWeight: '700' }]}>
                  Quantité sortie:
                </Text>
                <Text
                  style={[
                    styles.calculValue,
                    { color: colors.error, fontWeight: '700', fontSize: FONT_SIZES.lg },
                  ]}
                >
                  {quantiteSortie.toFixed(2)} {aliment.unite}
                </Text>
              </View>
              <Text
                style={[styles.summaryInfo, { color: colors.textSecondary, marginTop: SPACING.sm }]}
              >
                {aliment.seuil_alerte !== undefined && aliment.seuil_alerte !== null
                  ? `Seuil d'alerte: ${aliment.seuil_alerte} ${aliment.unite}`
                  : 'Aucun seuil défini'}
              </Text>
              {aliment.seuil_alerte !== undefined &&
                aliment.seuil_alerte !== null &&
                stockRestant <= aliment.seuil_alerte && (
                  <Text
                    style={[
                      styles.summaryInfo,
                      { color: colors.error, fontWeight: '600', marginTop: SPACING.xs },
                    ]}
                  >
                    ⚠️ Stock sous le seuil d'alerte
                  </Text>
                )}
            </>
          ) : (
            <>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {aliment.quantite_actuelle} {aliment.unite}
              </Text>
              <Text style={[styles.summaryInfo, { color: colors.textSecondary }]}>
                {aliment.seuil_alerte !== undefined && aliment.seuil_alerte !== null
                  ? `Seuil d'alerte: ${aliment.seuil_alerte} ${aliment.unite}`
                  : 'Aucun seuil défini'}
              </Text>
            </>
          )}
        </View>

        <Button
          title="Enregistrer le mouvement"
          onPress={handleSubmit}
          loading={loading}
          variant="primary"
        />
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 520,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginHorizontal: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
  },
  summaryBox: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  summaryInfo: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  calculRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  calculLabel: {
    fontSize: FONT_SIZES.sm,
  },
  calculValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  calculHighlight: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
});
