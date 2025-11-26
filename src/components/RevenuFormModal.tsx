/**
 * Composant formulaire modal pour revenu avec upload photos
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, TextInput, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createRevenu, updateRevenu, calculateAndSaveMargesVente } from '../store/slices/financeSlice';
import { Revenu, CreateRevenuInput, CategorieRevenu, ProductionAnimal } from '../types';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';

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
  const { projetActif } = useAppSelector((state) => state.projet);
  const animaux = useAppSelector(selectAllAnimaux);
  const { canCreate, canUpdate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  const [poidsKg, setPoidsKg] = useState<string>('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | undefined>(animalId);
  const [searchAnimalQuery, setSearchAnimalQuery] = useState('');
  const [showAnimalSearch, setShowAnimalSearch] = useState(false);
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

  // Charger les animaux si nécessaire (pour la recherche)
  useEffect(() => {
    if (visible && projetActif && !animalId) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
    }
  }, [visible, projetActif?.id, animalId, dispatch]);

  // Filtrer les animaux pour la recherche
  const animauxFiltres = useMemo(() => {
    if (!searchAnimalQuery.trim()) {
      return animaux.filter((a) => a.statut === 'actif' || a.statut === 'vendu');
    }
    const query = searchAnimalQuery.toLowerCase();
    return animaux.filter(
      (a) =>
        (a.statut === 'actif' || a.statut === 'vendu') &&
        (a.code?.toLowerCase().includes(query) ||
          a.nom?.toLowerCase().includes(query) ||
          a.race?.toLowerCase().includes(query))
    );
  }, [animaux, searchAnimalQuery]);

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

    // Validation
    if (formData.montant <= 0) {
      Alert.alert('Erreur', 'Le montant doit être supérieur à 0');
      return;
    }
    if (formData.categorie === 'autre' && !formData.libelle_categorie?.trim()) {
      Alert.alert('Erreur', 'Veuillez préciser le libellé de la catégorie');
      return;
    }
    // Validation poids pour vente de porc
    if (formData.categorie === 'vente_porc' && poidsKg && parseFloat(poidsKg) <= 0) {
      Alert.alert('Erreur', 'Le poids doit être supérieur à 0');
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
        const result = await dispatch(
          createRevenu({ ...formData, projet_id: projetActif.id, animal_id: selectedAnimalId || animalId })
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
      
      // Réinitialiser le loading avant d'appeler onSuccess
      setLoading(false);
      
      // Fermer le modal immédiatement
      onClose();
      
      // Appeler onSuccess de manière asynchrone pour laisser le modal se fermer complètement
      setTimeout(() => {
        onSuccess();
      }, 100);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Erreur', error?.message || error || "Erreur lors de l'enregistrement");
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
          onChangeText={(text) => setFormData({ ...formData, montant: parseFloat(text) || 0 })}
          placeholder="0"
          keyboardType="numeric"
          required
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
            {/* Sélection de porc (uniquement si pas d'animalId fourni) */}
            {!animalId && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Porc vendu (optionnel)
                </Text>
                <TouchableOpacity
                  style={[
                    styles.animalSelector,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  onPress={() => setShowAnimalSearch(!showAnimalSearch)}
                >
                  <Text
                    style={[
                      styles.animalSelectorText,
                      { color: selectedAnimal ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {selectedAnimal
                      ? `${selectedAnimal.code}${selectedAnimal.nom ? ` - ${selectedAnimal.nom}` : ''}`
                      : 'Rechercher un porc...'}
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
                    <FlatList
                      data={animauxFiltres}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.animalOption,
                            {
                              backgroundColor:
                                selectedAnimalId === item.id ? colors.primary : colors.background,
                            },
                          ]}
                          onPress={() => {
                            setSelectedAnimalId(item.id);
                            setPoidsKg(item.poids_actuel?.toString() || '');
                            setShowAnimalSearch(false);
                            setSearchAnimalQuery('');
                          }}
                        >
                          <Text
                            style={[
                              styles.animalOptionText,
                              {
                                color:
                                  selectedAnimalId === item.id
                                    ? colors.textOnPrimary
                                    : colors.text,
                              },
                            ]}
                          >
                            {item.code}
                            {item.nom ? ` - ${item.nom}` : ''}
                            {item.race ? ` (${item.race})` : ''}
                            {item.poids_actuel ? ` - ${item.poids_actuel} kg` : ''}
                          </Text>
                        </TouchableOpacity>
                      )}
                      style={styles.animalList}
                      maxHeight={200}
                    />
                  </View>
                )}
                {selectedAnimal && (
                  <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 4 }]}>
                    Porc sélectionné: {selectedAnimal.code}
                    {selectedAnimal.nom ? ` (${selectedAnimal.nom})` : ''}
                    {selectedAnimal.poids_actuel
                      ? ` - Poids actuel: ${selectedAnimal.poids_actuel} kg`
                      : ''}
                  </Text>
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
              helper="Nécessaire pour calculer automatiquement la marge de production"
            />
            <Text
              style={[
                styles.helperText,
                { color: colors.textSecondary, marginTop: -8, marginBottom: 12 },
              ]}
            >
              💡 Le système calculera automatiquement le coût réel et la marge en comparant avec vos coûts de production (OPEX + CAPEX amorti).
            </Text>
          </View>
        )}

        <FormField
          label="Date"
          value={formData.date}
          onChangeText={(text) => setFormData({ ...formData, date: text })}
          placeholder="YYYY-MM-DD"
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
