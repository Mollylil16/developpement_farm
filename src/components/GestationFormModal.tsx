/**
 * Composant formulaire modal pour gestation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, TouchableWithoutFeedback } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createGestation, updateGestation } from '../store/slices/reproductionSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { loadMortalitesParProjet } from '../store/slices/mortalitesSlice';
import { Gestation, CreateGestationInput } from '../types';
import { calculerDateMiseBasPrevue } from '../types/reproduction';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface GestationFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  gestation?: Gestation | null;
  isEditing?: boolean;
}

// Type pour les verrats (virtuels ou enregistrés)
interface VerratOption {
  id: string;
  code: string;
  nom: string;
  sexe: 'male';
  statut: 'actif' | 'mort' | 'vendu' | 'offert';
  reproducteur: boolean;
  numero: number;
  race?: string;
  projet_id?: string;
}

// Fonction helper pour obtenir la date du jour au format YYYY-MM-DD en local
const getTodayLocalDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function GestationFormModal({
  visible,
  onClose,
  onSuccess,
  gestation,
  isEditing = false,
}: GestationFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { animaux } = useAppSelector((state) => state.production);
  const { mortalites } = useAppSelector((state) => state.mortalites);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateGestationInput>({
    projet_id: projetActif?.id ?? '',
    truie_id: '',
    truie_nom: '',
    verrat_id: '',
    verrat_nom: '',
    date_sautage: getTodayLocalDate(),
    nombre_porcelets_prevu: 0,
    notes: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [directInput, setDirectInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullList, setShowFullList] = useState(false);
  const [verratSearchQuery, setVerratSearchQuery] = useState('');
  const [showVerratModal, setShowVerratModal] = useState(false);

  // Charger les animaux et mortalités au montage du composant
  useEffect(() => {
    if (projetActif && visible) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
      dispatch(loadMortalitesParProjet(projetActif.id));
    }
  }, [dispatch, projetActif, visible]);

  // Générer une liste de truies basée sur le projet actif (en soustrayant les mortalités)
  const truies = useMemo(() => {
    if (!projetActif) return [];
    
    // Calculer le nombre de truies mortes
    const mortalitesProjet = mortalites.filter((m) => m.projet_id === projetActif.id);
    const mortalitesTruies = mortalitesProjet
      .filter((m) => m.categorie === 'truie')
      .reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);
    
    // Nombre de truies actives = nombre initial - mortalités
    const nombreTruiesActives = Math.max(0, projetActif.nombre_truies - mortalitesTruies);
    
    const truiesList = [];
    for (let i = 1; i <= nombreTruiesActives; i++) {
      truiesList.push({
        id: `truie_${i}`,
        nom: `Truie ${i}`,
        numero: i,
      });
    }
    return truiesList;
  }, [projetActif, mortalites]);

  const animauxProjet = useMemo(() => {
    if (!projetActif) return [];
    return animaux.filter((a) => a.projet_id === projetActif.id);
  }, [animaux, projetActif?.id]);

  // Générer une liste de verrats basée sur le projet actif (en soustrayant les mortalités)
  // Combiner les verrats virtuels (basés sur nombre_verrats) avec les verrats enregistrés dans le cheptel
  const verrats = useMemo(() => {
    if (!projetActif) {
      console.log('No active project for verrats');
      return [];
    }

    // Calculer le nombre de verrats morts
    const mortalitesProjet = mortalites.filter((m) => m.projet_id === projetActif.id);
    const mortalitesVerrats = mortalitesProjet
      .filter((m) => m.categorie === 'verrat')
      .reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);
    
    // Nombre de verrats actifs = nombre initial - mortalités
    const nombreVerratsInitial = projetActif.nombre_verrats ?? 0;
    const nombreVerratsActifs = Math.max(0, nombreVerratsInitial - mortalitesVerrats);
    
    console.log('Calculating verrats:', {
      nombreVerratsInitial,
      mortalitesVerrats,
      nombreVerratsActifs,
    });
    
    // Créer une liste de verrats virtuels (comme pour les truies)
    const verratsVirtuels: VerratOption[] = [];
    for (let i = 1; i <= nombreVerratsActifs; i++) {
      verratsVirtuels.push({
        id: `verrat_${i}`,
        code: `VER${i}`,
        nom: `Verrat ${i}`,
        sexe: 'male' as const,
        statut: 'actif' as const,
        reproducteur: true,
        numero: i,
      });
    }

    // Récupérer les verrats réellement enregistrés dans le cheptel
    const malesActifsEnregistres = animauxProjet.filter(
      (a) =>
        a.sexe === 'male' &&
        (a.statut === 'actif' || a.id === formData.verrat_id)
    );

    // Combiner les deux listes, en évitant les doublons
    // Si un verrat enregistré a le même code qu'un virtuel, on garde l'enregistré
    const verratsCombines: VerratOption[] = [...verratsVirtuels];
    malesActifsEnregistres.forEach((verratEnregistre) => {
      const indexExistant = verratsCombines.findIndex(
        (v) => v.id === verratEnregistre.id || v.code === verratEnregistre.code
      );
      const numero = parseInt(verratEnregistre.code?.replace(/\D/g, '') || '0') || 0;
      const verratOption: VerratOption = {
        id: verratEnregistre.id,
        code: verratEnregistre.code || `VER${numero}`,
        nom: verratEnregistre.nom || `Verrat ${numero}`,
        sexe: verratEnregistre.sexe as 'male',
        statut: verratEnregistre.statut as 'actif' | 'mort' | 'vendu' | 'offert',
        reproducteur: verratEnregistre.reproducteur ?? true,
        numero: numero,
        race: verratEnregistre.race,
        projet_id: verratEnregistre.projet_id,
      };
      
      if (indexExistant >= 0) {
        // Remplacer le virtuel par l'enregistré
        verratsCombines[indexExistant] = verratOption;
      } else {
        // Ajouter le verrat enregistré
        verratsCombines.push(verratOption);
      }
    });

    // Trier : reproducteurs en premier, puis par code/nom
    const verratsTries = verratsCombines.sort((a, b) => {
      const aReproducteur = a.reproducteur ?? true; // Les virtuels sont reproducteurs par défaut
      const bReproducteur = b.reproducteur ?? true;
      
      if (aReproducteur === bReproducteur) {
        const codeA = a.code?.toLowerCase() || '';
        const codeB = b.code?.toLowerCase() || '';
        return codeA.localeCompare(codeB);
      }

      return aReproducteur ? -1 : 1;
    });
    
    console.log('Final verrats list:', verratsTries.length, verratsTries);
    return verratsTries;
  }, [animauxProjet, projetActif, mortalites, formData.verrat_id]);

  // Filtrer les verrats selon la recherche
  const verratsFiltres = useMemo(() => {
    const query = verratSearchQuery.toLowerCase().trim();
    if (!query) {
      return verrats;
    }
    return verrats.filter((verrat) => {
      const codeLower = verrat.code.toLowerCase();
      const nomLower = verrat.nom?.toLowerCase() || '';
      return codeLower.includes(query) || nomLower.includes(query);
    });
  }, [verrats, verratSearchQuery]);

  // Filtrer les truies selon la recherche ou la saisie directe
  const truiesFiltrees = useMemo(() => {
    // Si un numéro direct est saisi et valide, retourner uniquement cette truie
    if (directInput.trim()) {
      const numero = parseInt(directInput.trim());
      if (!isNaN(numero) && numero > 0 && numero <= truies.length) {
        const truieTrouvee = truies.find((t) => t.numero === numero);
        if (truieTrouvee) {
          return [truieTrouvee];
        }
      }
    }

    // Sinon, filtrer par recherche textuelle
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return truies.slice(0, 50); // Limiter à 50 résultats par défaut
    }

    const filtrees = truies.filter((truie) => {
      const nomLower = truie.nom.toLowerCase();
      const numeroStr = truie.numero.toString();
      return nomLower.includes(query) || numeroStr.includes(query);
    });

    return filtrees.slice(0, 50); // Limiter à 50 résultats
  }, [truies, searchQuery, directInput]);

  // Gérer la sélection directe par numéro
  useEffect(() => {
    if (directInput.trim()) {
      const numero = parseInt(directInput.trim());
      if (!isNaN(numero) && numero > 0 && numero <= truies.length) {
        const truieTrouvee = truies.find((t) => t.numero === numero);
        if (truieTrouvee) {
          setFormData((prev) => ({
            ...prev,
            truie_id: truieTrouvee.id,
            truie_nom: truieTrouvee.nom,
          }));
          setSearchQuery(''); // Réinitialiser la recherche
        }
      }
    }
  }, [directInput, truies]);

  useEffect(() => {
    if (gestation && isEditing) {
      const truieNumero = parseInt(gestation.truie_id.replace('truie_', ''));
      setFormData({
        projet_id: gestation.projet_id,
        truie_id: gestation.truie_id,
        truie_nom: gestation.truie_nom || '',
        verrat_id: gestation.verrat_id || '',
        verrat_nom: gestation.verrat_nom || '',
        date_sautage: gestation.date_sautage.split('T')[0],
        nombre_porcelets_prevu: gestation.nombre_porcelets_prevu,
        notes: gestation.notes || '',
      });
      if (!isNaN(truieNumero)) {
        setDirectInput(truieNumero.toString());
      }
    } else if (visible) {
      setFormData((prev) => ({
        ...prev,
        projet_id: projetActif?.id ?? '',
        truie_id: '',
        truie_nom: '',
        verrat_id: '',
        verrat_nom: '',
        date_sautage: getTodayLocalDate(),
        nombre_porcelets_prevu: 0,
        notes: '',
      }));
      setDirectInput('');
      setSearchQuery('');
      setVerratSearchQuery('');
      setShowFullList(false);
      setShowVerratModal(false);
    }
  }, [gestation, isEditing, visible, projetActif?.id]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.projet_id) {
      Alert.alert('Erreur', 'Aucun projet actif n\'est sélectionné pour cette gestation');
      return;
    }
    if (!formData.truie_id && !formData.truie_nom?.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner ou saisir le nom de la truie');
      return;
    }
    if (!formData.date_sautage) {
      Alert.alert('Erreur', 'La date de sautage est requise');
      return;
    }
    if (formData.nombre_porcelets_prevu <= 0) {
      Alert.alert('Erreur', 'Le nombre de porcelets prévu doit être supérieur à 0');
      return;
    }
    if (!formData.verrat_id && !formData.verrat_nom?.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner le verrat utilisé pour cette saillie');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && gestation) {
        await dispatch(
          updateGestation({
            id: gestation.id,
            updates: {
              ...formData,
              truie_nom: formData.truie_nom || formData.truie_id,
              verrat_nom: formData.verrat_nom || formData.verrat_id || undefined,
            },
          })
        ).unwrap();
      } else {
        await dispatch(
          createGestation({
            ...formData,
            truie_nom: formData.truie_nom || formData.truie_id,
            verrat_nom: formData.verrat_nom || formData.verrat_id || undefined,
          })
        ).unwrap();
      }
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const dateMiseBasPrevue = calculerDateMiseBasPrevue(formData.date_sautage);
  const dateMiseBas = new Date(dateMiseBasPrevue);
  const formattedDate = dateMiseBas.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <>
    {/* Sélecteur de verrat en bottom sheet - doit être rendu en premier pour être au-dessus */}
    <Modal
      visible={showVerratModal}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setShowVerratModal(false);
        setVerratSearchQuery('');
      }}
      statusBarTranslucent
    >
      <View style={styles.sheetModalContainer}>
        <TouchableWithoutFeedback
          onPress={() => {
            setShowVerratModal(false);
            setVerratSearchQuery('');
          }}
        >
          <View style={styles.sheetOverlay} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Sélectionner le verrat</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowVerratModal(false);
                  setVerratSearchQuery('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.sheetClose, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetSearchContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Rechercher un verrat</Text>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
                value={verratSearchQuery}
                onChangeText={setVerratSearchQuery}
                placeholder="Rechercher par code ou nom..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent}>
              {verratsFiltres.length === 0 ? (
                <View style={styles.noResults}>
                  <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                    {verratSearchQuery.trim()
                      ? 'Aucun verrat trouvé avec cette recherche'
                      : verrats.length === 0
                      ? `Aucun verrat disponible. Nombre de verrats dans le projet: ${projetActif?.nombre_verrats ?? 0}. Vérifiez les paramètres du projet ou ajoutez des verrats dans le module Production.`
                      : 'Aucun verrat disponible pour cette recherche.'}
                  </Text>
                </View>
              ) : (
                verratsFiltres.map((verrat) => {
                  const selected = formData.verrat_id === verrat.id;
                  return (
                    <TouchableOpacity
                      key={verrat.id}
                      style={[
                        styles.sheetOption,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary + '12' : colors.surface,
                        },
                      ]}
                      onPress={() => {
                        console.log('Verrat sélectionné:', verrat);
                        setFormData((prev) => ({
                          ...prev,
                          verrat_id: verrat.id,
                          verrat_nom: `${verrat.code}${verrat.nom ? ` (${verrat.nom})` : ''}`,
                        }));
                        setShowVerratModal(false);
                        setVerratSearchQuery('');
                      }}
                    >
                      <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>
                        {verrat.code}
                        {verrat.nom ? ` (${verrat.nom})` : ''}
                      </Text>
                      <Text style={[styles.sheetOptionSubtitle, { color: colors.textSecondary }]}>
                        {verrat.race ? `Race : ${verrat.race} • ` : ''}
                        {verrat.statut === 'actif'
                          ? 'Actif'
                          : verrat.statut === 'mort'
                          ? 'Mort'
                          : verrat.statut === 'vendu'
                          ? 'Vendu'
                          : verrat.statut === 'offert'
                          ? 'Offert'
                          : verrat.statut}
                      </Text>
                      {!verrat.reproducteur && (
                        <Text style={[styles.sheetOptionWarning, { color: colors.warning }]}>
                          Non marqué comme reproducteur
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>

    <CustomModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Modifier la gestation' : 'Nouvelle gestation'}
      confirmText={isEditing ? 'Modifier' : 'Créer'}
      onConfirm={handleSubmit}
      showButtons={true}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Truie *</Text>
          
          {/* Champ de saisie directe du numéro */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Numéro de la truie (saisie rapide)</Text>
            <TextInput
              style={[styles.directInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              value={directInput}
              onChangeText={(text) => {
                setDirectInput(text);
                setSearchQuery(''); // Réinitialiser la recherche
              }}
              placeholder="Ex: 856"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />
            {directInput.trim() && (
              <Text style={[styles.inputHint, { color: colors.primary }]}>
                {(() => {
                  const numero = parseInt(directInput.trim());
                  if (!isNaN(numero) && numero > 0 && numero <= truies.length) {
                    return `✓ Truie ${numero} trouvée`;
                  } else if (!isNaN(numero) && numero > truies.length) {
                    return `✗ Numéro invalide (max: ${truies.length})`;
                  } else {
                    return '';
                  }
                })()}
              </Text>
            )}
          </View>

          {/* Barre de recherche (si pas de saisie directe valide) */}
          {(!directInput.trim() || parseInt(directInput.trim()) > truies.length || isNaN(parseInt(directInput.trim()))) && (
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Rechercher une truie</Text>
              <TextInput
                style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher par nom ou numéro..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}

          {/* Affichage de la truie sélectionnée */}
          {formData.truie_id && (
            <View style={[styles.selectedTruieCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.selectedTruieLabel, { color: colors.textSecondary }]}>Truie sélectionnée:</Text>
              <Text style={[styles.selectedTruieValue, { color: colors.primary }]}>{formData.truie_nom}</Text>
            </View>
          )}

          {/* Liste des résultats filtrés */}
          {truies.length > 0 && (
            <View style={styles.resultsContainer}>
              {truiesFiltrees.length > 0 ? (
                <>
                  <View style={styles.resultsHeader}>
                    <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                      {truiesFiltrees.length} résultat{truiesFiltrees.length > 1 ? 's' : ''}
                      {!showFullList && truiesFiltrees.length === 50 && ` (sur ${truies.length})`}
                    </Text>
                    {!showFullList && truies.length > 50 && (
                      <TouchableOpacity
                        style={[styles.showAllButton, { backgroundColor: colors.primary }]}
                        onPress={() => setShowFullList(true)}
                      >
                        <Text style={[styles.showAllButtonText, { color: colors.textOnPrimary }]}>Voir toutes ({truies.length})</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.optionsContainer}>
                    {(showFullList ? truies : truiesFiltrees).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.option,
                          {
                            borderColor: formData.truie_id === item.id ? colors.primary : colors.border,
                            backgroundColor: formData.truie_id === item.id ? colors.primary : colors.background,
                          },
                        ]}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            truie_id: item.id,
                            truie_nom: item.nom,
                          });
                          setDirectInput(item.numero.toString());
                          setSearchQuery('');
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            {
                              color: formData.truie_id === item.id ? colors.textOnPrimary : colors.text,
                              fontWeight: formData.truie_id === item.id ? '600' : 'normal',
                            },
                          ]}
                        >
                          {item.nom}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.noResults}>
                  <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                    {searchQuery.trim() ? 'Aucun résultat trouvé' : 'Commencez à rechercher ou saisissez un numéro'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Option de saisie manuelle si aucune truie */}
          {truies.length === 0 && (
            <FormField
              label="Nom de la truie"
              value={formData.truie_nom || ''}
              onChangeText={(text) => setFormData({ ...formData, truie_nom: text })}
              placeholder="Ex: TRU015"
              required
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Verrat utilisé *</Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Sélectionnez le verrat utilisé pour cette saillie. Ce champ est obligatoire pour tracer la généalogie.
          </Text>
          <TouchableOpacity
            style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => {
              console.log('Opening verrat modal, verrats count:', verrats.length);
              console.log('Projet actif:', projetActif?.nombre_verrats);
              setShowVerratModal(true);
            }}
            disabled={!projetActif}
          >
            <Text style={[styles.selectButtonLabel, { color: colors.textSecondary }]}>Verrat</Text>
            <Text style={[styles.selectButtonValue, { color: colors.text }]}>
              {formData.verrat_nom || formData.verrat_id || 'Sélectionner un verrat *'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Date de sautage *</Text>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => {
              setDatePickerMode('date');
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {new Date(formData.date_sautage).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(formData.date_sautage)}
              mode={datePickerMode}
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate && event.type !== 'dismissed') {
                  // Convertir la date sélectionnée en format local YYYY-MM-DD
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const day = String(selectedDate.getDate()).padStart(2, '0');
                  setFormData({
                    ...formData,
                    date_sautage: `${year}-${month}-${day}`,
                  });
                }
              }}
            />
          )}
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date de mise bas prévue:</Text>
          <Text style={[styles.infoValue, { color: colors.primary }]}>{formattedDate}</Text>
          <Text style={[styles.infoNote, { color: colors.textSecondary }]}>
            (Calculée automatiquement: {formData.date_sautage} + 114 jours)
          </Text>
        </View>

        <FormField
          label="Nombre de porcelets prévu *"
          value={formData.nombre_porcelets_prevu.toString()}
          onChangeText={(text) =>
            setFormData({ ...formData, nombre_porcelets_prevu: parseInt(text) || 0 })
          }
          placeholder="Ex: 12"
          keyboardType="numeric"
          required
        />

        <FormField
          label="Notes"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Notes supplémentaires..."
          multiline
          numberOfLines={4}
        />
      </ScrollView>
    </CustomModal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 500,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  directInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 14,
  },
  inputHint: {
    fontSize: 12,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  selectedTruieCard: {
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    borderWidth: 2,
  },
  selectedTruieLabel: {
    fontSize: 12,
    marginBottom: SPACING.xs,
  },
  selectedTruieValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginTop: SPACING.md,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  showAllButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  showAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noResults: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs / 2,
  },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: SPACING.xs / 2,
    marginBottom: SPACING.sm,
    minWidth: '30%',
  },
  optionSelected: {
  },
  optionText: {
    fontSize: 14,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
  },
  dateButtonText: {
    fontSize: 16,
  },
  infoBox: {
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  infoNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  helperText: {
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  selectButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  selectButtonValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  sheetModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    maxHeight: '80%',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignSelf: 'center',
    marginVertical: SPACING.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetClose: {
    fontSize: 20,
  },
  sheetSearchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  sheetList: {
    paddingHorizontal: SPACING.lg,
  },
  sheetListContent: {
    paddingBottom: SPACING.xl,
  },
  sheetOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sheetOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  sheetOptionSubtitle: {
    fontSize: 12,
    marginBottom: SPACING.xs,
  },
  sheetOptionWarning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
});

