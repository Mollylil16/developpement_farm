/**
 * Composant pour la configuration des prix de vente
 */

import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ViewStyle } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateProjet } from '../../store/slices/projetSlice';
import { SPACING, FONT_SIZES } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import FormField from '../FormField';
import Button from '../Button';

interface PriceConfigCardProps {
  onPriceUpdate?: () => void;
}

export default function PriceConfigCard({ onPriceUpdate }: PriceConfigCardProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);

  const [isEditingPrix, setIsEditingPrix] = useState(false);
  const [prixVif, setPrixVif] = useState<string>('');
  const [prixCarcasse, setPrixCarcasse] = useState<string>('');

  const PRIX_KG_VIF_DEFAUT = 1000;
  const PRIX_KG_CARCASSE_DEFAUT = 1300;

  // Initialiser les prix depuis le projet
  useEffect(() => {
    if (projetActif && !isEditingPrix) {
      setPrixVif(projetActif.prix_kg_vif?.toString() || '');
      setPrixCarcasse(projetActif.prix_kg_carcasse?.toString() || '');
    }
  }, [projetActif?.id, isEditingPrix]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSavePrix = async () => {
    if (!projetActif) return;

    const prixVifNum = parseFloat(prixVif);
    const prixCarcasseNum = parseFloat(prixCarcasse);

    if (isNaN(prixVifNum) || prixVifNum < 0) {
      Alert.alert('Erreur', 'Le prix du kg vif doit être un nombre positif');
      return;
    }

    if (isNaN(prixCarcasseNum) || prixCarcasseNum < 0) {
      Alert.alert('Erreur', 'Le prix du kg carcasse doit être un nombre positif');
      return;
    }

    try {
      await dispatch(
        updateProjet({
          id: projetActif.id,
          updates: {
            prix_kg_vif: prixVifNum,
            prix_kg_carcasse: prixCarcasseNum,
          },
        })
      ).unwrap();

      setIsEditingPrix(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPriceUpdate?.();
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de la mise à jour des prix');
    }
  };

  if (!projetActif) return null;

  return (
    <Card style={StyleSheet.flatten([styles.configCard, { backgroundColor: colors.surface }])}>
      <View style={styles.configHeader}>
        <Text style={[styles.configTitle, { color: colors.text }]}>
          Configuration des prix de vente
        </Text>
        {!isEditingPrix && (
          <TouchableOpacity
            accessible={true}
            accessibilityLabel="Modifier les prix de vente"
            accessibilityRole="button"
            onPress={() => setIsEditingPrix(true)}
          >
            <Text style={[styles.editButton, { color: colors.primary }]}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>
      {isEditingPrix ? (
        <View style={styles.configForm}>
          <FormField
            label="Prix du kg vif (XOF)"
            value={prixVif}
            onChangeText={setPrixVif}
            keyboardType="numeric"
            placeholder="Ex: 1000"
          />
          <FormField
            label="Prix du kg carcasse (XOF)"
            value={prixCarcasse}
            onChangeText={setPrixCarcasse}
            keyboardType="numeric"
            placeholder="Ex: 1300"
          />
          <View style={styles.configButtons}>
            <Button
              title="Annuler"
              onPress={() => {
                setIsEditingPrix(false);
                setPrixVif(projetActif.prix_kg_vif?.toString() || '');
                setPrixCarcasse(projetActif.prix_kg_carcasse?.toString() || '');
              }}
              variant="outline"
              style={styles.configButton}
            />
            <Button title="Enregistrer" onPress={handleSavePrix} style={styles.configButton} />
          </View>
        </View>
      ) : (
        <View style={styles.configDisplay}>
          <View style={styles.configRow}>
            <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
              Prix du kg vif:
            </Text>
            <Text style={[styles.configValue, { color: colors.text }]}>
              {formatAmount(projetActif.prix_kg_vif || PRIX_KG_VIF_DEFAUT)}
            </Text>
          </View>
          <View style={styles.configRow}>
            <Text style={[styles.configLabel, { color: colors.textSecondary }]}>
              Prix du kg carcasse:
            </Text>
            <Text style={[styles.configValue, { color: colors.text }]}>
              {formatAmount(projetActif.prix_kg_carcasse || PRIX_KG_CARCASSE_DEFAUT)}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  configCard: {
    marginBottom: SPACING.lg,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  configTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  editButton: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  configForm: {
    gap: SPACING.md,
  },
  configButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  configButton: {
    flex: 1,
  },
  configDisplay: {
    gap: SPACING.sm,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: FONT_SIZES.md,
  },
  configValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
