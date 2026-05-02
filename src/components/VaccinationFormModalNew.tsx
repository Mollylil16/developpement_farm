/**
 * VaccinationFormModalNew - Modal d'ajout/modification de vaccination
 * Avec support photo, multi-select d'animaux, et filtres avancés
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CustomModal from './CustomModal';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { createVaccination } from '../store/slices/santeSlice';
import {
  TypeProphylaxie,
  TYPE_PROPHYLAXIE_LABELS,
  RaisonTraitement,
  RAISON_TRAITEMENT_LABELS,
  CreateVaccinationInput,
} from '../types/sante';
import { getCategorieAnimal } from '../utils/animalUtils';
import { formatLocalDate, getCurrentLocalDate } from '../utils/dateUtils';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  visible: boolean;
  onClose: () => void;
  typeProphylaxieParDefaut?: TypeProphylaxie;
}

type FiltreCategorie = 'tous' | 'porcelet' | 'truie' | 'verrat' | 'porc_croissance';

export default function VaccinationFormModalNew({
  visible,
  onClose,
  typeProphylaxieParDefaut = 'vitamine',
}: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const animaux = useAppSelector((state) => selectAllAnimaux(state));
  const loading = useAppSelector((state) => state.sante.loading.vaccinations);

  // États du formulaire
  const [dateAdministration, setDateAdministration] = useState(getCurrentLocalDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [produitAdministre, setProduitAdministre] = useState('');
  const [photoFlacon, setPhotoFlacon] = useState<string | null>(null);
  const [dosage, setDosage] = useState('');
  const [uniteDosage, setUniteDosage] = useState('ml');
  const [raisonTraitement, setRaisonTraitement] = useState<RaisonTraitement>('suivi_normal');
  const [raisonAutre, setRaisonAutre] = useState('');
  const [animauxSelectionnes, setAnimauxSelectionnes] = useState<string[]>([]);
  const [typeProphylaxie] = useState<TypeProphylaxie>(typeProphylaxieParDefaut);

  // États UI
  const [showRaisonDropdown, setShowRaisonDropdown] = useState(false);
  const [showUniteDropdown, setShowUniteDropdown] = useState(false);
  const [filtreCategorie, setFiltreCategorie] = useState<FiltreCategorie>('tous');
  const [rechercheTexte, setRechercheTexte] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);

  // Demander les permissions au montage
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission requise',
            "Nous avons besoin de la permission d'accéder à vos photos pour ajouter une image du flacon."
          );
        }
      }
    })();
  }, []);

  // Filtrer les animaux actifs
  const animauxActifs = useMemo(() => {
    return (animaux || []).filter((a) => a.statut === 'actif');
  }, [animaux]);

  // Appliquer les filtres
  const animauxFiltres = useMemo(() => {
    let filtered = animauxActifs;

    // Filtre par catégorie
    if (filtreCategorie !== 'tous') {
      filtered = filtered.filter((a) => {
        const categorie = getCategorieAnimal(a);
        return categorie === filtreCategorie;
      });
    }

    // Filtre par recherche
    if (rechercheTexte.trim()) {
      const search = rechercheTexte.toLowerCase();
      filtered = filtered.filter((a) => {
        const nom = a.nom?.toLowerCase() || '';
        const code = a.code?.toLowerCase() || '';
        return nom.includes(search) || code.includes(search);
      });
    }

    return filtered;
  }, [animauxActifs, filtreCategorie, rechercheTexte]);

  const handlePrendrePhoto = async () => {
    try {
      setPhotoLoading(true);

      // Choix: Caméra ou Galerie
      const result = await new Promise<ImagePicker.ImagePickerResult>((resolve) => {
        Alert.alert(
          'Ajouter une photo',
          'Choisissez une source',
          [
            {
              text: 'Annuler',
              style: 'cancel',
              onPress: () => resolve({ canceled: true } as ImagePicker.ImagePickerResult),
            },
            {
              text: 'Galerie',
              onPress: async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [4, 3],
                  quality: 0.7,
                });
                resolve(result);
              },
            },
            {
              text: 'Caméra',
              onPress: async () => {
                const result = await ImagePicker.launchCameraAsync({
                  allowsEditing: true,
                  aspect: [4, 3],
                  quality: 0.7,
                });
                resolve(result);
              },
            },
          ],
          { cancelable: true }
        );
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoFlacon(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', "Impossible d'ajouter la photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSupprimerPhoto = () => {
    Alert.alert('Supprimer la photo', 'Êtes-vous sûr de vouloir supprimer cette photo ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => setPhotoFlacon(null),
      },
    ]);
  };

  const toggleSelectionAnimal = (animalId: string) => {
    setAnimauxSelectionnes((prev) => {
      if (prev.includes(animalId)) {
        return prev.filter((id) => id !== animalId);
      } else {
        return [...prev, animalId];
      }
    });
  };

  const handleSelectionnerTous = () => {
    if (animauxSelectionnes.length === animauxFiltres.length) {
      // Désélectionner tous
      setAnimauxSelectionnes([]);
    } else {
      // Sélectionner tous les filtrés
      setAnimauxSelectionnes(animauxFiltres.map((a) => a.id));
    }
  };

  const handleValider = async () => {
    // Validation
    if (!produitAdministre.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du produit administré');
      return;
    }

    if (!dosage.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le dosage');
      return;
    }

    if (animauxSelectionnes.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un animal');
      return;
    }

    if (raisonTraitement === 'autre' && !raisonAutre.trim()) {
      Alert.alert('Erreur', 'Veuillez préciser la raison du traitement');
      return;
    }

    if (!projetActif?.id) {
      Alert.alert('Erreur', 'Aucun projet actif');
      return;
    }

    try {
      const input: CreateVaccinationInput = {
        projet_id: projetActif.id,
        animal_ids: animauxSelectionnes,
        type_prophylaxie: typeProphylaxie,
        produit_administre: produitAdministre.trim(),
        photo_flacon: photoFlacon || undefined,
        date_vaccination: dateAdministration,
        dosage: dosage.trim(),
        unite_dosage: uniteDosage,
        raison_traitement: raisonTraitement,
        raison_autre: raisonTraitement === 'autre' ? raisonAutre.trim() : undefined,
        statut: 'effectue',
      };

      await dispatch(createVaccination(input)).unwrap();

      Alert.alert(
        'Succès',
        `Vaccination enregistrée pour ${animauxSelectionnes.length} animal(aux)`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      Alert.alert('Erreur', "Impossible d'enregistrer la vaccination");
    }
  };

  const renderAnimalItem = ({ item }: { item: any }) => {
    const isSelected = animauxSelectionnes.includes(item.id);
    const categorie = getCategorieAnimal(item);

    return (
      <TouchableOpacity
        style={[
          styles.animalItem,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => toggleSelectionAnimal(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.animalItemLeft}>
          <View style={[styles.animalCheckbox, isSelected && { backgroundColor: colors.primary }]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <View style={styles.animalInfo}>
            <Text style={[styles.animalNom, { color: colors.text }]}>
              {item.nom || item.code || 'Sans nom'}
            </Text>
            <Text style={[styles.animalDetails, { color: colors.textSecondary }]}>
              {categorie} • {item.code || 'Pas de code'}
            </Text>
          </View>
        </View>
        {item.enclos && (
          <View style={[styles.enclosBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.enclosTexte, { color: colors.primary }]}>{item.enclos}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="Ajouter une vaccination"
      showButtons={false}
      scrollEnabled={true}
    >
      <>
        {/* Type de prophylaxie (lecture seule) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Type de traitement</Text>
          <View
            style={[
              styles.inputReadonly,
              { backgroundColor: `${colors.primary}15`, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.inputReadonlyText, { color: colors.primary }]}>
              {TYPE_PROPHYLAXIE_LABELS[typeProphylaxie]}
            </Text>
          </View>
        </View>

        {/* Date d'administration */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Date d'administration <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.inputTouchable,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color={colors.textSecondary} />
            <Text style={[styles.inputTouchableText, { color: colors.text }]}>
              {new Date(dateAdministration).toLocaleDateString('fr-FR')}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(dateAdministration)}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDateAdministration(formatLocalDate(selectedDate.toISOString()));
                }
              }}
            />
          )}
        </View>

        {/* Produit administré */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Produit administré <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={produitAdministre}
            onChangeText={setProduitAdministre}
            placeholder="Ex: Fer dextran, Vitamine AD3E..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Photo du flacon */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Photo du flacon (optionnel)</Text>
          {photoFlacon ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoFlacon }} style={styles.photoPreview} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.photoDeleteBtn, { backgroundColor: colors.error }]}
                onPress={handleSupprimerPhoto}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.photoButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handlePrendrePhoto}
              disabled={photoLoading}
            >
              {photoLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color={colors.textSecondary} />
                  <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>
                    Ajouter une photo
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Dosage et unité */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Dosage <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <View style={styles.dosageRow}>
            <TextInput
              style={[
                styles.dosageInput,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              value={dosage}
              onChangeText={setDosage}
              placeholder="Ex: 2"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[
                styles.uniteDropdown,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowUniteDropdown(!showUniteDropdown)}
            >
              <Text style={[styles.uniteTexte, { color: colors.text }]}>{uniteDosage}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {showUniteDropdown && (
            <View
              style={[
                styles.dropdown,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {['ml', 'mg', 'cc', 'g', 'UI'].map((unite) => (
                <TouchableOpacity
                  key={unite}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setUniteDosage(unite);
                    setShowUniteDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>{unite}</Text>
                  {uniteDosage === unite && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Raison du traitement */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Raison du traitement <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.inputTouchable,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => setShowRaisonDropdown(!showRaisonDropdown)}
          >
            <Text style={[styles.inputTouchableText, { color: colors.text }]}>
              {RAISON_TRAITEMENT_LABELS[raisonTraitement]}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {showRaisonDropdown && (
            <View
              style={[
                styles.dropdown,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {(Object.keys(RAISON_TRAITEMENT_LABELS) as RaisonTraitement[]).map((raison) => (
                <TouchableOpacity
                  key={raison}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setRaisonTraitement(raison);
                    setShowRaisonDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                    {RAISON_TRAITEMENT_LABELS[raison]}
                  </Text>
                  {raisonTraitement === raison && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {raisonTraitement === 'autre' && (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  marginTop: 8,
                },
              ]}
              value={raisonAutre}
              onChangeText={setRaisonAutre}
              placeholder="Précisez la raison..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          )}
        </View>

        {/* Sélection des animaux */}
        <View style={styles.section}>
          <View style={styles.selectionHeader}>
            <Text style={[styles.label, { color: colors.text }]}>
              Sélection des sujets <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <Text style={[styles.compteurSelection, { color: colors.primary }]}>
              {animauxSelectionnes.length} sélectionné(s)
            </Text>
          </View>

          {/* Barre de recherche */}
          <TextInput
            style={[
              styles.rechercheInput,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={rechercheTexte}
            onChangeText={setRechercheTexte}
            placeholder="Rechercher par nom ou code..."
            placeholderTextColor={colors.textSecondary}
          />

          {/* Filtres par catégorie */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtresContainer}
          >
            {(['tous', 'porcelet', 'truie', 'verrat', 'porc_croissance'] as FiltreCategorie[]).map(
              (cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filtreBouton,
                    {
                      backgroundColor: filtreCategorie === cat ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setFiltreCategorie(cat)}
                >
                  <Text
                    style={[
                      styles.filtreBoutonTexte,
                      { color: filtreCategorie === cat ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {cat === 'tous' ? 'Tous' : cat.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>

          {/* Bouton Sélectionner tout */}
          <TouchableOpacity
            style={[
              styles.selectionnerToutBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handleSelectionnerTous}
          >
            <Ionicons
              name={
                animauxSelectionnes.length === animauxFiltres.length ? 'checkbox' : 'square-outline'
              }
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.selectionnerToutTexte, { color: colors.text }]}>
              {animauxSelectionnes.length === animauxFiltres.length
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </Text>
          </TouchableOpacity>

          {/* Liste des animaux */}
          <View
            style={[
              styles.listeAnimaux,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {animauxFiltres.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun animal trouvé
                </Text>
              </View>
            ) : (
              <FlatList
                data={animauxFiltres}
                keyExtractor={(item) => item.id}
                renderItem={renderAnimalItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            )}
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.boutonsContainer}>
          <TouchableOpacity
            style={[
              styles.boutonAnnuler,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.boutonAnnulerTexte, { color: colors.text }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.boutonValider, { backgroundColor: colors.primary }]}
            onPress={handleValider}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.boutonValiderTexte}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  inputReadonly: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  inputReadonlyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  inputTouchableText: {
    flex: 1,
    fontSize: 15,
  },
  photoButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 14,
    marginTop: 8,
  },
  photoContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dosageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dosageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  uniteDropdown: {
    width: 80,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uniteTexte: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  dropdownItemText: {
    fontSize: 14,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compteurSelection: {
    fontSize: 14,
    fontWeight: '600',
  },
  rechercheInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  filtresContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filtreBouton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filtreBoutonTexte: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  selectionnerToutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  selectionnerToutTexte: {
    fontSize: 14,
    fontWeight: '500',
  },
  listeAnimaux: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  animalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  animalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  animalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  animalInfo: {
    flex: 1,
  },
  animalNom: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  animalDetails: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  enclosBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  enclosTexte: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  boutonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  boutonAnnuler: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  boutonAnnulerTexte: {
    fontSize: 15,
    fontWeight: '600',
  },
  boutonValider: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  boutonValiderTexte: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
