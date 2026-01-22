/**
 * Composant formulaire modal pour revenu avec upload photos
 * Intègre la validation Yup pour une robustesse maximale
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createRevenu,
  updateRevenu,
  calculateAndSaveMargesVente,
} from '../store/slices/financeSlice';
import type { Revenu, CreateRevenuInput, CategorieRevenu } from '../types/finance';
import type { ProductionAnimal } from '../types/production';
import { selectAllAnimaux, selectPeseesRecents } from '../store/selectors/productionSelectors';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import apiClient from '../services/api/apiClient';
import type { Batch } from '../types/batch';
import CustomModal from './CustomModal';
import FormField from './FormField';
import DatePickerField from './DatePickerField';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { logger } from '../utils/logger';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { revenuSchema, validateWithSchema, validateField } from '../validation/financeSchemas';

interface RevenuFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  revenu?: Revenu | null;
  isEditing?: boolean;
  animalId?: string; // ID de l'animal vendu (pour ouverture automatique depuis cheptel)
  animalPoids?: number; // Poids de l'animal vendu (pour pré-remplir le champ)
}

export default function RevenuFormModal({
  visible,
  onClose,
  onSuccess,
  revenu,
  isEditing = false,
  animalId,
  animalPoids,
}: RevenuFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });
  const animaux = useAppSelector(selectAllAnimaux);
  const peseesRecents = useAppSelector(selectPeseesRecents);
  const { canCreate, canUpdate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  const [poidsKg, setPoidsKg] = useState<string>('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | undefined>(animalId);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>(animalId ? [animalId] : []); // Multi-sélection pour mode individuel
  const [searchAnimalQuery, setSearchAnimalQuery] = useState('');
  const [showAnimalSearch, setShowAnimalSearch] = useState(false);
  // Mode bande
  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>(undefined);
  const [batchQuantite, setBatchQuantite] = useState<string>('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // Détecter le mode de gestion
  const isModeBatch = projetActif?.management_method === 'batch';
  const [formData, setFormData] = useState<
    Omit<CreateRevenuInput, 'projet_id'> & { photos: string[] }
  >({
    montant: 0,
    categorie: 'vente_porc',
    libelle_categorie: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    commentaire: '',
    photos: [],
  });

  // Réinitialiser les erreurs quand le modal se ferme/ouvre
  useEffect(() => {
    if (!visible) {
      setValidationErrors({});
      setTouched({});
    }
  }, [visible]);

  useEffect(() => {
    if (revenu && isEditing) {
      setFormData({
        montant: revenu.montant,
        categorie: revenu.categorie,
        libelle_categorie: revenu.libelle_categorie || '',
        date: revenu.date.split('T')[0],
        description: revenu.description || '',
        commentaire: revenu.commentaire || '',
        photos: revenu.photos || [],
      });
      setPoidsKg(revenu.poids_kg?.toString() || '');
      setSelectedAnimalId(revenu.animal_id);
    } else {
      // Reset form
      setFormData({
        montant: 0,
        categorie: 'vente_porc',
        libelle_categorie: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        commentaire: '',
        photos: [],
      });
      // Si animalId est fourni, pré-remplir avec le poids de l'animal
      setPoidsKg(animalPoids ? animalPoids.toString() : '');
    }
  }, [revenu, isEditing, visible, animalId, animalPoids]);

  /**
   * Validation d'un champ individuel (temps réel)
   */
  const validateSingleField = useCallback(
    async (fieldName: keyof typeof formData, value: unknown) => {
      try {
        const error = await validateField(revenuSchema, fieldName, value, {
          ...formData,
          poids_kg: poidsKg ? parseFloat(poidsKg) : null,
        });

        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          if (error) {
            newErrors[fieldName] = error;
          } else {
            delete newErrors[fieldName];
          }
          return newErrors;
        });
      } catch (err) {
        logger.error('Erreur validation champ:', err);
      }
    },
    [formData, poidsKg]
  );

  /**
   * Marquer un champ comme touché (pour afficher les erreurs après blur)
   */
  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  // Charger les animaux si nécessaire (pour la recherche)
  useEffect(() => {
    if (visible && projetActif && !animalId) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
    }
  }, [visible, projetActif?.id, animalId, dispatch]);

  // Charger les batches en mode bande
  useEffect(() => {
    if (visible && projetActif && isModeBatch && formData.categorie === 'vente_porc') {
      const loadBatches = async () => {
        try {
          setLoadingBatches(true);
          const batchesData = await apiClient.get<Batch[]>(`/batch-pigs/projet/${projetActif.id}`);
          // Filtrer les batches non reproducteurs (disponibles pour la vente)
          const batchesVendables = batchesData.filter(
            (b) => b.category !== 'truie_reproductrice' && b.category !== 'verrat_reproducteur'
          );
          setBatches(batchesVendables);
        } catch (error) {
          logger.error('Erreur chargement batches:', error);
        } finally {
          setLoadingBatches(false);
        }
      };
      loadBatches();
    }
  }, [visible, projetActif?.id, isModeBatch, formData.categorie]);

  // Filtrer les animaux pour la recherche (uniquement actifs pour les ventes)
  const animauxFiltres = useMemo(() => {
    // Pour les ventes, on ne veut que les animaux actifs (pas vendus)
    const animauxActifs = animaux.filter((a) => a.statut === 'actif' && a.projet_id === projetActif?.id);
    if (!searchAnimalQuery.trim()) {
      return animauxActifs;
    }
    const query = searchAnimalQuery.toLowerCase();
    return animauxActifs.filter(
      (a) =>
        a.code?.toLowerCase().includes(query) ||
        a.nom?.toLowerCase().includes(query) ||
        a.race?.toLowerCase().includes(query)
    );
  }, [animaux, searchAnimalQuery, projetActif?.id]);

  // Trouver l'animal sélectionné
  const selectedAnimal = useMemo(() => {
    return selectedAnimalId ? animaux.find((a) => a.id === selectedAnimalId) : null;
  }, [animaux, selectedAnimalId]);

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "L'application a besoin de l'accès à vos photos pour ajouter des factures."
      );
      return false;
    }
    return true;
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "L'application a besoin de l'accès à la caméra pour prendre des photos de factures."
      );
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const currentPhotos = formData.photos || [];
      const remainingSlots = 3 - currentPhotos.length;
      if (remainingSlots > 0) {
        setFormData({
          ...formData,
          photos: [...currentPhotos, result.assets[0].uri],
        });
      } else {
        Alert.alert('Limite atteinte', 'Vous pouvez ajouter maximum 3 photos.');
      }
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const currentPhotos = formData.photos || [];
      const remainingSlots = 3 - currentPhotos.length;
      if (remainingSlots > 0) {
        setFormData({
          ...formData,
          photos: [...currentPhotos, result.assets[0].uri],
        });
      } else {
        Alert.alert('Limite atteinte', 'Vous pouvez ajouter maximum 3 photos.');
      }
    }
  };

  const removePhoto = (index: number) => {
    const currentPhotos = formData.photos || [];
    const newPhotos = currentPhotos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
  };

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('finance')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les revenus.");
      return;
    }
    if (!isEditing && !canCreate('finance')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de créer des revenus.");
      return;
    }

    // Validation Yup complète
    const dataToValidate = {
      ...formData,
      poids_kg: poidsKg ? parseFloat(poidsKg) : null,
    };

    const { isValid, errors } = await validateWithSchema(revenuSchema, dataToValidate);

    if (!isValid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      const allTouched = Object.keys(errors).reduce((acc, key) => ({ ...acc, [key]: true }), {});
      setTouched(allTouched);
      setValidationErrors(errors);

      // Afficher la première erreur dans une alerte
      const firstError = Object.values(errors)[0];
      Alert.alert('Erreur de validation', firstError);
      return;
    }

    // Validation stricte pour les ventes de porcs : identification obligatoire des sujets
    if (formData.categorie === 'vente_porc' && !isEditing) {
      if (isModeBatch) {
        // Mode bande : batch_id et quantite_vendue obligatoires
        if (!selectedBatchId || !batchQuantite || parseInt(batchQuantite) <= 0) {
          Alert.alert(
            'Identification obligatoire',
            'Pour enregistrer une vente, vous devez obligatoirement identifier les porcs vendus (loge/bande + quantité).'
          );
          setValidationErrors((prev) => ({
            ...prev,
            batch_id: 'La loge/bande est obligatoire',
            quantite_vendue: 'La quantité est obligatoire',
          }));
          setTouched((prev) => ({ ...prev, batch_id: true, quantite_vendue: true }));
          return;
        }
        // Vérifier que la quantité ne dépasse pas le nombre disponible dans la batch
        const selectedBatch = batches.find((b) => b.id === selectedBatchId);
        if (selectedBatch && parseInt(batchQuantite) > selectedBatch.total_count) {
          Alert.alert(
            'Erreur',
            `La quantité demandée (${batchQuantite}) dépasse le nombre disponible dans cette loge (${selectedBatch.total_count}).`
          );
          setValidationErrors((prev) => ({
            ...prev,
            quantite_vendue: `Quantité maximale: ${selectedBatch.total_count}`,
          }));
          setTouched((prev) => ({ ...prev, quantite_vendue: true }));
          return;
        }
      } else {
        // Mode individuel : animal_ids obligatoires
        if (!selectedAnimalIds || selectedAnimalIds.length === 0) {
          Alert.alert(
            'Identification obligatoire',
            'Pour enregistrer une vente, vous devez obligatoirement identifier les porcs vendus (ID ou IDs des porcs).'
          );
          setValidationErrors((prev) => ({
            ...prev,
            animal_ids: 'Au moins un porc doit être sélectionné',
          }));
          setTouched((prev) => ({ ...prev, animal_ids: true }));
          return;
        }
      }
    }

    // Validation poids pour vente de porc (règle métier supplémentaire)
    if (formData.categorie === 'vente_porc' && poidsKg && parseFloat(poidsKg) <= 0) {
      Alert.alert('Erreur', 'Le poids doit être supérieur à 0');
      setValidationErrors((prev) => ({ ...prev, poids_kg: 'Le poids doit être supérieur à 0' }));
      setTouched((prev) => ({ ...prev, poids_kg: true }));
      return;
    }

    if (!projetActif && !isEditing) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && revenu) {
        await dispatch(
          updateRevenu({
            id: revenu.id,
            updates: {
              montant: formData.montant,
              categorie: formData.categorie,
              libelle_categorie: formData.libelle_categorie,
              date: formData.date,
              description: formData.description,
              commentaire: formData.commentaire,
              photos: formData.photos || [],
              animal_id: selectedAnimalId || animalId,
              poids_kg: poidsKg ? parseFloat(poidsKg) : undefined,
            },
          })
        ).unwrap();

        // Si vente de porc avec poids, calculer les marges
        if (formData.categorie === 'vente_porc' && poidsKg && parseFloat(poidsKg) > 0) {
          await dispatch(
            calculateAndSaveMargesVente({
              venteId: revenu.id,
              poidsKg: parseFloat(poidsKg),
            })
          ).unwrap();
        }
      } else {
        if (!projetActif) {
          Alert.alert('Erreur', 'Aucun projet actif');
          setLoading(false);
          return;
        }

        // Pour les ventes de porcs, utiliser le nouvel endpoint dédié
        if (formData.categorie === 'vente_porc') {
          try {
            const venteData: any = {
              projet_id: projetActif.id,
              montant: formData.montant,
              date: formData.date,
              description: formData.description || undefined,
              commentaire: formData.commentaire || undefined,
              poids_kg: poidsKg ? parseFloat(poidsKg) : undefined,
            };

            if (isModeBatch) {
              venteData.batch_id = selectedBatchId;
              venteData.quantite = parseInt(batchQuantite); // Correction: le DTO attend "quantite", pas "quantite_vendue"
            } else {
              venteData.animal_ids = selectedAnimalIds;
            }

            await apiClient.post('/finance/ventes-porcs', venteData);

            Alert.alert(
              'Succès',
              `Vente enregistrée avec succès. Le cheptel a été mis à jour : ${isModeBatch ? `${batchQuantite} porc(s) retirés de la loge` : `${selectedAnimalIds.length} porc(s) marqués comme vendus`}.`
            );
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error) || "Erreur lors de l'enregistrement";
            Alert.alert('Erreur', errorMessage);
            setLoading(false);
            return;
          }
        } else {
          // Pour les autres catégories, utiliser l'endpoint classique
          const result = await dispatch(
            createRevenu({
              ...formData,
              projet_id: projetActif.id,
              animal_id: selectedAnimalId || animalId,
              poids_kg: poidsKg ? parseFloat(poidsKg) : undefined,
            })
          ).unwrap();

          // Si vente de porc avec poids, calculer les marges
          if (formData.categorie === 'vente_porc' && poidsKg && parseFloat(poidsKg) > 0) {
            await dispatch(
              calculateAndSaveMargesVente({
                venteId: result.id,
                poidsKg: parseFloat(poidsKg),
              })
            ).unwrap();
          }
        }
      }

      // Réinitialiser le loading avant d'appeler onSuccess
      setLoading(false);

      // Fermer le modal immédiatement
      onClose();

      // Appeler onSuccess de manière asynchrone pour laisser le modal se fermer complètement
      setTimeout(() => {
        onSuccess();
      }, 100);
    } catch (error: unknown) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error) || "Erreur lors de l'enregistrement";
      Alert.alert('Erreur', errorMessage);
    }
  };

  const categories: CategorieRevenu[] = ['vente_porc', 'vente_autre', 'subvention', 'autre'];

  const getCategoryLabel = (cat: CategorieRevenu): string => {
    const labels: Record<CategorieRevenu, string> = {
      vente_porc: 'Vente de porc',
      vente_autre: 'Vente autre',
      subvention: 'Subvention',
      autre: 'Autre',
    };
    return labels[cat];
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier le revenu' : 'Nouveau revenu'}
      confirmText={isEditing ? 'Modifier' : 'Enregistrer'}
      onConfirm={handleSubmit}
      showButtons={true}
      loading={loading}
      scrollEnabled={true}
    >
      <>
        <FormField
          label="Montant (CFA)"
          value={formData.montant.toString()}
          onChangeText={(text) => {
            const newMontant = parseFloat(text) || 0;
            setFormData({ ...formData, montant: newMontant });
            if (touched.montant) {
              validateSingleField('montant', newMontant);
            }
          }}
          onBlur={() => {
            handleFieldBlur('montant');
            validateSingleField('montant', formData.montant);
          }}
          placeholder="0"
          keyboardType="numeric"
          required
          error={touched.montant ? validationErrors.montant : undefined}
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Catégorie</Text>
          <View style={styles.optionsContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                  formData.categorie === cat && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFormData({ ...formData, categorie: cat })}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    formData.categorie === cat && {
                      color: colors.background,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {getCategoryLabel(cat)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {formData.categorie === 'autre' && (
          <FormField
            label="Libellé de la catégorie"
            value={formData.libelle_categorie || ''}
            onChangeText={(text) => setFormData({ ...formData, libelle_categorie: text })}
            placeholder="Précisez la catégorie"
            required
          />
        )}

        {formData.categorie === 'vente_porc' && (
          <View>
            {/* Sélection des sujets vendus - OBLIGATOIRE */}
            {!animalId && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Sujets vendus *
                  {touched.animal_ids || touched.batch_id ? (
                    <Text style={{ color: colors.error, fontSize: 12 }}>
                      {' '}
                      {validationErrors.animal_ids || validationErrors.batch_id}
                    </Text>
                  ) : null}
                </Text>
                <Text style={[styles.helperText, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
                  {isModeBatch
                    ? 'Sélectionnez la loge/bande et la quantité de porcs vendus'
                    : 'Sélectionnez un ou plusieurs porcs vendus'}
                </Text>
                {isModeBatch ? (
                  // MODE BANDE : Sélection batch + quantité
                  <>
                    <TouchableOpacity
                      style={[
                        styles.animalSelector,
                        {
                          borderColor: touched.batch_id && validationErrors.batch_id ? colors.error : colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      onPress={() => setShowBatchPicker(!showBatchPicker)}
                    >
                      <Text
                        style={[
                          styles.animalSelectorText,
                          {
                            color: selectedBatchId
                              ? colors.text
                              : colors.textSecondary,
                          }]
                        }
                      >
                        {selectedBatchId
                          ? batches.find((b) => b.id === selectedBatchId)?.pen_name || 'Bande sélectionnée'
                          : 'Sélectionner une loge/bande...'}
                      </Text>
                      <Text style={[styles.animalSelectorIcon, { color: colors.textSecondary }]}>
                        {showBatchPicker ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                    {showBatchPicker && (
                      <View
                        style={[
                          styles.animalSearchContainer,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                      >
                        <View style={[styles.animalList, { maxHeight: 200 }]}>
                          <FlatList
                            data={batches}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={[
                                  styles.animalOption,
                                  {
                                    backgroundColor:
                                      selectedBatchId === item.id ? colors.primary : colors.background,
                                  },
                                ]}
                                onPress={() => {
                                  setSelectedBatchId(item.id);
                                  setShowBatchPicker(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.animalOptionText,
                                    {
                                      color:
                                        selectedBatchId === item.id ? colors.textOnPrimary : colors.text,
                                    },
                                  ]}
                                >
                                  {item.pen_name} ({item.category}) - {item.total_count} porc(s)
                                </Text>
                              </TouchableOpacity>
                            )}
                          />
                        </View>
                      </View>
                    )}
                    {selectedBatchId && (
                      <FormField
                        label="Quantité vendue"
                        value={batchQuantite}
                        onChangeText={setBatchQuantite}
                        keyboardType="numeric"
                        placeholder="Ex: 5"
                        required
                        error={touched.quantite_vendue ? validationErrors.quantite_vendue : undefined}
                        onBlur={() => handleFieldBlur('quantite_vendue')}
                      />
                    )}
                  </>
                ) : (
                  // MODE INDIVIDUEL : Sélection multi-ID
                  <>
                    <TouchableOpacity
                      style={[
                        styles.animalSelector,
                        {
                          borderColor: touched.animal_ids && validationErrors.animal_ids ? colors.error : colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      onPress={() => setShowAnimalSearch(!showAnimalSearch)}
                    >
                      <Text
                        style={[
                          styles.animalSelectorText,
                          {
                            color: selectedAnimalIds.length > 0 ? colors.text : colors.textSecondary,
                          }]
                        }
                      >
                        {selectedAnimalIds.length > 0
                          ? `${selectedAnimalIds.length} porc(s) sélectionné(s)`
                          : 'Rechercher et sélectionner des porcs...'}
                      </Text>
                      <Text style={[styles.animalSelectorIcon, { color: colors.textSecondary }]}>
                        {showAnimalSearch ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                    {showAnimalSearch && (
                      <View
                        style={[
                          styles.animalSearchContainer,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                      >
                        <TextInput
                          style={[
                            styles.animalSearchInput,
                            { color: colors.text, borderColor: colors.border },
                          ]}
                          placeholder="Rechercher par code, nom ou race..."
                          placeholderTextColor={colors.textSecondary}
                          value={searchAnimalQuery}
                          onChangeText={setSearchAnimalQuery}
                        />
                        <View style={[styles.animalList, { maxHeight: 200 }]}>
                          <FlatList
                            data={animauxFiltres}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                              const isSelected = selectedAnimalIds.includes(item.id);
                              return (
                                <TouchableOpacity
                                  style={[
                                    styles.animalOption,
                                    {
                                      backgroundColor: isSelected ? colors.primary : colors.background,
                                    },
                                  ]}
                                  onPress={() => {
                                    if (isSelected) {
                                      setSelectedAnimalIds(selectedAnimalIds.filter((id) => id !== item.id));
                                    } else {
                                      setSelectedAnimalIds([...selectedAnimalIds, item.id]);
                                    }
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.animalOptionText,
                                      {
                                        color: isSelected ? colors.textOnPrimary : colors.text,
                                      },
                                    ]}
                                  >
                                    {isSelected ? '✓ ' : '  '}
                                    {item.code}
                                    {item.nom ? ` - ${item.nom}` : ''}
                                    {item.race ? ` (${item.race})` : ''}
                                    {(() => {
                                      const poidsActuel =
                                        peseesRecents.find((p) => p.animal_id === item.id)?.poids_kg ||
                                        item.poids_initial ||
                                        0;
                                      return poidsActuel > 0 ? ` - ${poidsActuel} kg` : '';
                                    })()}
                                  </Text>
                                </TouchableOpacity>
                              );
                            }}
                          />
                        </View>
                      </View>
                    )}
                    {selectedAnimalIds.length > 0 && (
                      <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 4 }]}>
                        {selectedAnimalIds.length} porc(s) sélectionné(s)
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}
            {animalId && selectedAnimal && (
              <View style={[styles.infoBox, { backgroundColor: `${colors.info}20` }]}>
                <Text style={[styles.infoText, { color: colors.info }]}>
                  Porc vendu: {selectedAnimal.code}
                  {selectedAnimal.nom ? ` (${selectedAnimal.nom})` : ''}
                </Text>
              </View>
            )}
            <FormField
              label="Poids du porc (kg)"
              value={poidsKg}
              onChangeText={setPoidsKg}
              keyboardType="numeric"
              placeholder="120"
            />
            <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: -8, marginBottom: 8 }]}>
              Nécessaire pour calculer automatiquement la marge de production
            </Text>
            <Text
              style={[
                styles.helperText,
                { color: colors.textSecondary, marginTop: -8, marginBottom: 12 },
              ]}
            >
              💡 Le système calculera automatiquement le coût réel et la marge en comparant avec vos
              coûts de production (OPEX + CAPEX amorti).
            </Text>
          </View>
        )}

        <DatePickerField
          label="Date"
          value={formData.date}
          onChange={(date) => setFormData({ ...formData, date })}
          maximumDate={new Date()}
        />

        <FormField
          label="Description (ex: nombre de porcs vendus)"
          value={formData.description || ''}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Description optionnelle..."
          multiline
          numberOfLines={2}
        />

        <FormField
          label="Commentaire"
          value={formData.commentaire || ''}
          onChangeText={(text) => setFormData({ ...formData, commentaire: text })}
          placeholder="Commentaire optionnel..."
          multiline
          numberOfLines={4}
        />

        {/* Section Photos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Photos de la facture ({(formData.photos || []).length}/3)
          </Text>
          <View style={styles.photosContainer}>
            {(formData.photos || []).map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={[styles.removePhotoButton, { backgroundColor: colors.error }]}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={[styles.removePhotoText, { color: colors.background }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {(formData.photos || []).length < 3 && (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[
                  styles.photoButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={takePhoto}
              >
                <Text style={[styles.photoButtonText, { color: colors.text }]}>
                  📷 Prendre une photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.photoButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={pickImageFromGallery}
              >
                <Text style={[styles.photoButtonText, { color: colors.text }]}>
                  📂 Choisir depuis la galerie
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  photoItem: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  photoButton: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
  },
  animalSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  animalSelectorText: {
    fontSize: 14,
    flex: 1,
  },
  animalSelectorIcon: {
    fontSize: 12,
    marginLeft: SPACING.xs,
  },
  animalSearchContainer: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.xs,
    padding: SPACING.xs,
  },
  animalSearchInput: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    marginBottom: SPACING.xs,
    fontSize: 14,
  },
  animalList: {
    maxHeight: 200,
  },
  animalOption: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  animalOptionText: {
    fontSize: 14,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
});
