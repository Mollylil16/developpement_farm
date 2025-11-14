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

export default function StockMovementFormModal({ visible, onClose, onSuccess, aliment }: StockMovementFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<TypeMouvementStock>('entree');
  const [quantite, setQuantite] = useState<number>(0);
  const [unite, setUnite] = useState<UniteStock>(aliment.unite);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [origine, setOrigine] = useState<string>('');
  const [commentaire, setCommentaire] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setType('entree');
      setQuantite(0);
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
        setQuantite(0); // Pour une sortie, on entre la quantité à sortir (pas le stock restant)
        break;
      case 'ajustement':
        setQuantite(aliment.quantite_actuelle);
        break;
      default:
        break;
    }
  };

  // Calculer le stock restant après sortie (pour affichage)
  const stockRestantApresSortie =
    type === 'sortie' ? Math.max(0, aliment.quantite_actuelle - quantite) : aliment.quantite_actuelle;

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (!canCreate('nutrition')) {
      Alert.alert('Permission refusée', 'Vous n\'avez pas la permission d\'effectuer des mouvements de stock.');
      return;
    }

    if (type === 'entree' && quantite <= 0) {
      Alert.alert('Valeur invalide', 'La quantité doit être supérieure à 0');
      return;
    }

    if (type === 'sortie') {
      if (quantite <= 0) {
        Alert.alert('Valeur invalide', 'La quantité à sortir doit être supérieure à 0');
        return;
      }
      
      if (quantite > aliment.quantite_actuelle) {
        Alert.alert(
          'Valeur invalide',
          `La quantité à sortir (${quantite}) ne peut pas être supérieure au stock actuel (${aliment.quantite_actuelle} ${aliment.unite})`
        );
        return;
      }
    }

    if (type === 'ajustement' && quantite < 0) {
      Alert.alert('Valeur invalide', 'La nouvelle quantité ne peut pas être négative');
      return;
    }

    // Pour une sortie, la quantité du mouvement est directement la quantité à sortir
    // La base de données calculera automatiquement le stock restant
    const quantiteMouvement = quantite;

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
      Alert.alert('Erreur', error?.message || 'Une erreur est survenue lors de l\'enregistrement du mouvement');
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
    >
      <ScrollView style={styles.scroll}>
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

        <FormField
          label={
            type === 'ajustement'
              ? 'Nouvelle quantité'
              : type === 'sortie'
              ? 'Quantité à sortir'
              : 'Quantité'
          }
          value={quantite.toString()}
          onChangeText={(text) => setQuantite(text ? parseFloat(text) : 0)}
          keyboardType="numeric"
          placeholder={
            type === 'sortie'
              ? '0'
              : type === 'ajustement'
              ? aliment.quantite_actuelle.toString()
              : '0'
          }
          required
        />

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
          <Text style={[styles.summaryTitle, { color: colors.primary }]}>Stock actuel</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {aliment.quantite_actuelle} {aliment.unite}
          </Text>
          <Text style={[styles.summaryInfo, { color: colors.textSecondary }]}>
            {aliment.seuil_alerte !== undefined && aliment.seuil_alerte !== null
              ? `Seuil d'alerte: ${aliment.seuil_alerte} ${aliment.unite}`
              : 'Aucun seuil défini'}
          </Text>
          {type === 'sortie' && quantite > 0 && (
            <>
              <Text style={[styles.summaryInfo, { color: colors.text }]}>
                Stock après sortie : {stockRestantApresSortie} {aliment.unite}
              </Text>
              {aliment.seuil_alerte !== undefined &&
                aliment.seuil_alerte !== null &&
                stockRestantApresSortie <= aliment.seuil_alerte && (
                  <Text style={[styles.summaryInfo, { color: colors.error, fontWeight: '600' }]}>
                    ⚠️ Stock sous le seuil d'alerte après cette sortie
                  </Text>
                )}
            </>
          )}
        </View>

        <Button
          title="Enregistrer le mouvement"
          onPress={handleSubmit}
          loading={loading}
          variant="primary"
        />
      </ScrollView>
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
});


