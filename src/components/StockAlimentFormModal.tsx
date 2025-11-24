/**
 * Formulaire modal pour la création / modification d'un aliment stocké
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createStockAliment, updateStockAliment } from '../store/slices/stocksSlice';
import { loadRationsBudget } from '../store/slices/nutritionSlice';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import CustomModal from './CustomModal';
import FormField from './FormField';
import Button from './Button';
import {
  StockAliment,
  UniteStock,
  CreateStockAlimentInput,
  RationBudget,
  getTypePorcLabel,
} from '../types';
import { useActionPermissions } from '../hooks/useActionPermissions';

interface StockAlimentFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projetId: string;
  aliment?: StockAliment | null;
  isEditing?: boolean;
}

const UNITES: UniteStock[] = ['kg', 'g', 'l', 'ml', 'sac', 'unite'];

export default function StockAlimentFormModal({
  visible,
  onClose,
  onSuccess,
  projetId,
  aliment,
  isEditing = false,
}: StockAlimentFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate } = useActionPermissions();
  const { rationsBudget } = useAppSelector((state) => state.nutrition);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateStockAlimentInput>({
    projet_id: projetId,
    nom: '',
    categorie: '',
    quantite_initiale: 0,
    unite: 'kg',
    seuil_alerte: undefined,
    notes: '',
  });

  // États pour la ration
  const [useRation, setUseRation] = useState(false);
  const [selectedRationId, setSelectedRationId] = useState<string | null>(null);
  const [typeSac, setTypeSac] = useState<25 | 50>(50);
  const [showRationSelector, setShowRationSelector] = useState(false);

  // Charger les rations disponibles
  useEffect(() => {
    if (visible && projetId && !isEditing) {
      dispatch(loadRationsBudget(projetId));
    }
  }, [visible, projetId, dispatch, isEditing]);

  useEffect(() => {
    if (visible) {
      if (aliment && isEditing) {
        setFormData({
          projet_id: projetId,
          nom: aliment.nom,
          categorie: aliment.categorie || '',
          quantite_initiale: aliment.quantite_actuelle,
          unite: aliment.unite,
          seuil_alerte: aliment.seuil_alerte,
          notes: aliment.notes || '',
        });
        setUseRation(false);
        setSelectedRationId(null);
      } else {
        setFormData({
          projet_id: projetId,
          nom: '',
          categorie: '',
          quantite_initiale: 0,
          unite: 'kg',
          seuil_alerte: undefined,
          notes: '',
        });
        setUseRation(false);
        setSelectedRationId(null);
        setTypeSac(50);
      }
    }
  }, [visible, aliment, isEditing, projetId]);

  // Calculer la quantité en sacs basée sur la ration sélectionnée
  const calculRationEnSacs = useMemo(() => {
    if (!useRation || !selectedRationId) return null;

    const ration = rationsBudget.find((r) => r.id === selectedRationId);
    if (!ration) return null;

    const quantiteTotaleKg = ration.quantite_totale_kg;
    const nombreSacsComplets = Math.floor(quantiteTotaleKg / typeSac);
    const resteKg = quantiteTotaleKg % typeSac;
    const proportionReste = resteKg / typeSac;

    // Quantité totale en sacs (avec décimales)
    const quantiteTotaleSacs = quantiteTotaleKg / typeSac;

    return {
      ration,
      quantiteTotaleKg,
      quantiteTotaleSacs,
      nombreSacsComplets,
      resteKg,
      proportionReste,
      typeSac,
    };
  }, [useRation, selectedRationId, rationsBudget, typeSac]);

  // Auto-remplir le nom de l'aliment avec le nom de la ration sélectionnée
  useEffect(() => {
    if (useRation && selectedRationId) {
      const ration = rationsBudget.find((r) => r.id === selectedRationId);
      if (ration) {
        setFormData((prev) => ({
          ...prev,
          nom: ration.nom,
          categorie: 'Aliment complet',
        }));
      }
    }
  }, [useRation, selectedRationId, rationsBudget]);

  // Auto-changer l'unité en "sac" quand un type de sac est sélectionné
  useEffect(() => {
    if (useRation && selectedRationId && typeSac) {
      setFormData((prev) => ({
        ...prev,
        unite: 'sac',
      }));
    }
  }, [useRation, selectedRationId, typeSac]);

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('nutrition')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les stocks.");
      return;
    }
    if (!isEditing && !canCreate('nutrition')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de créer des stocks.");
      return;
    }

    if (!projetId) {
      Alert.alert('Erreur', 'Aucun projet actif. Veuillez sélectionner un projet.');
      return;
    }

    if (!formData.nom.trim()) {
      Alert.alert('Champ requis', "Le nom de l'aliment est obligatoire");
      return;
    }

    if (!formData.unite) {
      Alert.alert('Champ requis', "Veuillez sélectionner l'unité");
      return;
    }

    if (!isEditing && (formData.quantite_initiale ?? 0) < 0) {
      Alert.alert('Valeur invalide', 'La quantité initiale doit être positive');
      return;
    }

    // Si utilisation d'une ration, vérifier qu'une ration est sélectionnée
    if (useRation && !selectedRationId) {
      Alert.alert(
        'Ration manquante',
        'Veuillez sélectionner une ration ou désactiver cette option'
      );
      return;
    }

    setLoading(true);
    try {
      // Déterminer la quantité finale
      let quantiteFinal = formData.quantite_initiale ?? 0;
      let notesFinales = formData.notes || '';

      if (useRation && calculRationEnSacs) {
        // Utiliser la quantité en SACS (pas en kg)
        quantiteFinal = calculRationEnSacs.quantiteTotaleSacs;

        // Ajouter les détails de la ration dans les notes
        const detailsRation =
          `\n\n📊 Basé sur la ration: ${calculRationEnSacs.ration.nom}\n` +
          `• Quantité totale: ${calculRationEnSacs.quantiteTotaleKg.toFixed(2)} kg\n` +
          `• Type de sac: ${calculRationEnSacs.typeSac} kg\n` +
          `• Nombre de sacs: ${calculRationEnSacs.quantiteTotaleSacs.toFixed(2)} sacs\n` +
          `• Sacs complets: ${calculRationEnSacs.nombreSacsComplets}\n` +
          (calculRationEnSacs.resteKg > 0
            ? `• Reste: ${calculRationEnSacs.resteKg.toFixed(2)} kg (${(calculRationEnSacs.proportionReste * 100).toFixed(1)}% d'un sac)`
            : '• Pas de reste');

        notesFinales = (notesFinales + detailsRation).trim();
      }

      if (isEditing && aliment) {
        await dispatch(
          updateStockAliment({
            id: aliment.id,
            updates: {
              nom: formData.nom,
              categorie: formData.categorie || undefined,
              unite: formData.unite,
              seuil_alerte: formData.seuil_alerte ?? null,
              notes: notesFinales || undefined,
            },
          })
        ).unwrap();
      } else {
        await dispatch(
          createStockAliment({
            projet_id: projetId,
            nom: formData.nom,
            categorie: formData.categorie || undefined,
            quantite_initiale: quantiteFinal,
            unite: formData.unite,
            seuil_alerte: formData.seuil_alerte,
            notes: notesFinales || undefined,
          })
        ).unwrap();
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde du stock:', error);
      Alert.alert('Erreur', error?.message || 'Une erreur est survenue lors de la sauvegarde');
      setLoading(false);
      return; // Ne pas appeler onSuccess en cas d'erreur
    }
    
    // Réinitialiser le loading
    setLoading(false);
    
    // Fermer le modal immédiatement en appelant onClose
    // Puis appeler onSuccess de manière asynchrone
    onClose();
    
    // Appeler onSuccess de manière asynchrone pour laisser le modal se fermer complètement
    setTimeout(() => {
      onSuccess();
    }, 50);
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier un aliment' : 'Nouvel aliment'}
      showButtons={false}
    >
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <FormField
          label="Nom de l'aliment"
          value={formData.nom}
          onChangeText={(text) => setFormData({ ...formData, nom: text })}
          placeholder="Ex: Maïs concassé"
          required
        />

        <FormField
          label="Catégorie"
          value={formData.categorie || ''}
          onChangeText={(text) => setFormData({ ...formData, categorie: text })}
          placeholder="Ex: Céréales, Concentrés..."
        />

        {!isEditing && (
          <>
            {/* Option utiliser une ration */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  {
                    backgroundColor: useRation ? `${colors.primary}15` : colors.surface,
                    borderColor: useRation ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setUseRation(!useRation);
                  if (useRation) {
                    setSelectedRationId(null);
                  }
                }}
              >
                <View style={styles.toggleLeft}>
                  <Ionicons
                    name={useRation ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={useRation ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.toggleText, { color: colors.text }]}>
                    Utiliser une ration créée
                  </Text>
                </View>
                <Ionicons name="calculator-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Sélection de la ration */}
            {useRation && (
              <>
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Ration à utiliser *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.rationSelector,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => setShowRationSelector(!showRationSelector)}
                  >
                    <View style={styles.rationSelectorContent}>
                      {selectedRationId ? (
                        <>
                          <Text style={[styles.rationSelectedText, { color: colors.text }]}>
                            {rationsBudget.find((r) => r.id === selectedRationId)?.nom}
                          </Text>
                          <Text
                            style={[styles.rationSelectedSubtext, { color: colors.textSecondary }]}
                          >
                            {getTypePorcLabel(
                              rationsBudget.find((r) => r.id === selectedRationId)?.type_porc ||
                                'porc_croissance'
                            )}{' '}
                            •{' '}
                            {rationsBudget
                              .find((r) => r.id === selectedRationId)
                              ?.quantite_totale_kg.toFixed(0)}{' '}
                            kg
                          </Text>
                        </>
                      ) : (
                        <Text style={[styles.rationPlaceholder, { color: colors.textSecondary }]}>
                          Sélectionner une ration
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name={showRationSelector ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Liste déroulante des rations */}
                  {showRationSelector && (
                    <View
                      style={[
                        styles.rationList,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      {rationsBudget.length === 0 ? (
                        <View style={styles.emptyRations}>
                          <Ionicons
                            name="document-text-outline"
                            size={32}
                            color={colors.textSecondary}
                          />
                          <Text style={[styles.emptyRationsText, { color: colors.textSecondary }]}>
                            Aucune ration disponible
                          </Text>
                          <Text
                            style={[styles.emptyRationsSubtext, { color: colors.textSecondary }]}
                          >
                            Créez une ration dans l'onglet Budgétisation
                          </Text>
                        </View>
                      ) : (
                        rationsBudget.map((ration) => (
                          <TouchableOpacity
                            key={ration.id}
                            style={[
                              styles.rationItem,
                              { borderBottomColor: colors.border },
                              selectedRationId === ration.id && {
                                backgroundColor: `${colors.primary}10`,
                              },
                            ]}
                            onPress={() => {
                              setSelectedRationId(ration.id);
                              setShowRationSelector(false);
                            }}
                          >
                            <View style={styles.rationItemContent}>
                              <Text style={[styles.rationItemNom, { color: colors.text }]}>
                                {ration.nom}
                              </Text>
                              <Text
                                style={[styles.rationItemDetails, { color: colors.textSecondary }]}
                              >
                                {getTypePorcLabel(ration.type_porc)} • {ration.nombre_porcs} porcs •{' '}
                                {ration.duree_jours} jours
                              </Text>
                              <Text style={[styles.rationItemQuantite, { color: colors.primary }]}>
                                {ration.quantite_totale_kg.toFixed(2)} kg
                              </Text>
                            </View>
                            {selectedRationId === ration.id && (
                              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>

                {/* Choix du type de sac */}
                {selectedRationId && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Type de sac *</Text>
                    <View style={styles.typeSacContainer}>
                      <TouchableOpacity
                        style={[
                          styles.typeSacButton,
                          {
                            backgroundColor: typeSac === 25 ? colors.primary : colors.surface,
                            borderColor: typeSac === 25 ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setTypeSac(25)}
                      >
                        <Text
                          style={[
                            styles.typeSacText,
                            { color: typeSac === 25 ? colors.textOnPrimary : colors.text },
                          ]}
                        >
                          25 kg
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeSacButton,
                          {
                            backgroundColor: typeSac === 50 ? colors.primary : colors.surface,
                            borderColor: typeSac === 50 ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setTypeSac(50)}
                      >
                        <Text
                          style={[
                            styles.typeSacText,
                            { color: typeSac === 50 ? colors.textOnPrimary : colors.text },
                          ]}
                        >
                          50 kg
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Affichage du calcul */}
                {calculRationEnSacs && (
                  <View
                    style={[
                      styles.calculResult,
                      {
                        backgroundColor: `${colors.success}10`,
                        borderColor: `${colors.success}30`,
                      },
                    ]}
                  >
                    <View style={styles.calculHeader}>
                      <Ionicons name="calculator" size={24} color={colors.success} />
                      <Text style={[styles.calculTitle, { color: colors.success }]}>
                        Calcul automatique
                      </Text>
                    </View>
                    <View style={styles.calculDetails}>
                      <View style={styles.calculRow}>
                        <Text style={[styles.calculLabel, { color: colors.text }]}>
                          Poids total:
                        </Text>
                        <Text style={[styles.calculValue, { color: colors.text }]}>
                          {calculRationEnSacs.quantiteTotaleKg.toFixed(2)} kg
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.calculRow,
                          {
                            backgroundColor: `${colors.primary}10`,
                            padding: SPACING.sm,
                            borderRadius: BORDER_RADIUS.md,
                            marginVertical: SPACING.xs,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.calculLabel, { color: colors.primary, fontWeight: '700' }]}
                        >
                          Quantité en stock:
                        </Text>
                        <Text
                          style={[
                            styles.calculValue,
                            { color: colors.primary, fontWeight: '700', fontSize: FONT_SIZES.lg },
                          ]}
                        >
                          {calculRationEnSacs.quantiteTotaleSacs.toFixed(2)} sacs
                        </Text>
                      </View>
                      <View style={styles.calculRow}>
                        <Text style={[styles.calculLabel, { color: colors.text }]}>
                          Sacs complets:
                        </Text>
                        <Text style={[styles.calculValue, { color: colors.text }]}>
                          {calculRationEnSacs.nombreSacsComplets} × {calculRationEnSacs.typeSac}kg
                        </Text>
                      </View>
                      {calculRationEnSacs.resteKg > 0 && (
                        <View style={styles.calculRow}>
                          <Text style={[styles.calculLabel, { color: colors.text }]}>Reste:</Text>
                          <Text style={[styles.calculValue, { color: colors.warning }]}>
                            {calculRationEnSacs.resteKg.toFixed(2)} kg (
                            {(calculRationEnSacs.proportionReste * 100).toFixed(1)}%)
                          </Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.calculInfo,
                        { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}30` },
                      ]}
                    >
                      <Ionicons name="information-circle" size={16} color={colors.info} />
                      <Text style={[styles.calculInfoText, { color: colors.text }]}>
                        Cette quantité sera enregistrée en stock avec l'unité "sac"
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Quantité manuelle si pas de ration */}
            {!useRation && (
              <FormField
                label="Quantité initiale"
                value={(formData.quantite_initiale ?? 0).toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, quantite_initiale: parseFloat(text) || 0 })
                }
                keyboardType="numeric"
                placeholder="0"
              />
            )}
          </>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Unité</Text>
          <View style={styles.optionsContainer}>
            {UNITES.map((unite) => (
              <TouchableOpacity
                key={unite}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  formData.unite === unite && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, unite })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.unite === unite && {
                      color: colors.textOnPrimary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {unite.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormField
          label="Seuil d'alerte"
          value={formData.seuil_alerte?.toString() ?? ''}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              seuil_alerte: text ? parseFloat(text) : undefined,
            })
          }
          keyboardType="numeric"
          placeholder="Ex: 100"
        />

        <FormField
          label="Notes"
          value={formData.notes || ''}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Informations complémentaires"
          multiline
          numberOfLines={3}
        />

        {!isEditing && !useRation && (
          <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>💡 Astuce</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              Vous pouvez utiliser une ration créée pour calculer automatiquement la quantité en
              sacs, ou saisir manuellement la quantité initiale.
            </Text>
          </View>
        )}

        {!isEditing && useRation && !selectedRationId && rationsBudget.length > 0 && (
          <View style={[styles.infoBox, { backgroundColor: colors.warning + '10' }]}>
            <Text style={[styles.infoTitle, { color: colors.warning }]}>⚠️ Sélection requise</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              Veuillez sélectionner une ration dans la liste ci-dessus pour calculer automatiquement
              la quantité nécessaire.
            </Text>
          </View>
        )}

        <Button
          title={isEditing ? 'Enregistrer les modifications' : 'Créer l’aliment'}
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
    maxHeight: 500,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  rationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    minHeight: 56,
  },
  rationSelectorContent: {
    flex: 1,
  },
  rationSelectedText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  rationSelectedSubtext: {
    fontSize: FONT_SIZES.sm,
  },
  rationPlaceholder: {
    fontSize: FONT_SIZES.md,
  },
  rationList: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    maxHeight: 300,
    overflow: 'hidden',
  },
  emptyRations: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyRationsText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyRationsSubtext: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  rationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  rationItemContent: {
    flex: 1,
  },
  rationItemNom: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  rationItemDetails: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  rationItemQuantite: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  typeSacContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  typeSacButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  typeSacText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  calculResult: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  calculHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  calculTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  calculDetails: {
    gap: SPACING.sm,
  },
  calculRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculLabel: {
    fontSize: FONT_SIZES.sm,
  },
  calculValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  calculInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  calculInfoText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    lineHeight: FONT_SIZES.xs * 1.4,
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
  infoBox: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});
