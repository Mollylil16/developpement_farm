/**
 * Composant formulaire modal pour gestation
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createGestation, updateGestation } from '../store/slices/reproductionSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { loadMortalitesParProjet } from '../store/slices/mortalitesSlice';
import type { Gestation, CreateGestationInput } from '../types/reproduction';
import type { ProductionAnimal } from '../types/production';
import type { Mortalite } from '../types/mortalites';
import { calculerDateMiseBasPrevue } from '../types/reproduction';
import CustomModal from './CustomModal';
import FormField from './FormField';
import { SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { selectAllMortalites } from '../store/selectors/mortalitesSelectors';
import { logger } from '../utils/logger';
import {
  detecterConsanguinite,
  getCouleurRisque,
  getIconeRisque,
  doitBloquerAccouplement,
  doitAfficherAvertissement,
  ResultatConsanguinite,
  RisqueConsanguinite,
} from '../utils/consanguiniteUtils';
import { validateGestation } from '../validation/reproductionSchemas';

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

function GestationFormModal({
  visible,
  onClose,
  onSuccess,
  gestation,
  isEditing = false,
}: GestationFormModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });
  const animaux: ProductionAnimal[] = useAppSelector(selectAllAnimaux);
  const mortalites: Mortalite[] = useAppSelector(selectAllMortalites);
  const { canCreate, canUpdate } = useActionPermissions();
  const [loading, setLoading] = useState(false);
  
  // Détecter le mode de gestion (individuel ou bande)
  const isModeBatch = projetActif?.management_method === 'batch';
  
  // État pour les bandes (mode bande uniquement)
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  // État pour les verrats batch (mode bande uniquement)
  const [verratsBatch, setVerratsBatch] = useState<any[]>([]);
  // État pour les truies batch individuelles (mode bande uniquement)
  const [truiesBatch, setTruiesBatch] = useState<any[]>([]);
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
  const [resultatConsanguinite, setResultatConsanguinite] = useState<ResultatConsanguinite | null>(
    null
  );

  // Charger les bandes en mode batch
  useEffect(() => {
    if (!projetActif?.id || !isModeBatch || !visible) return;

    const loadBatches = async () => {
      setLoadingBatches(true);
      try {
        const apiClient = (await import('../services/api/apiClient')).default;
        const batchesData = await apiClient.get<any[]>(`/batch-pigs/projet/${projetActif.id}`);
        // Filtrer uniquement les bandes de truies reproductrices
        const truiesBatches = batchesData.filter((b) => b.category === 'truie_reproductrice');
        setBatches(truiesBatches);
        
        // Charger les truies batch individuelles (batch_pigs dans chaque bande de truies)
        const allTruiesBatch: any[] = [];
        for (const batch of truiesBatches) {
          try {
            const batchPigs = await apiClient.get<any[]>(`/batch-pigs/batch/${batch.id}`);
            // Convertir les batch_pigs en format TruieOption
            // Note: batch_pigs utilise 'sex' (pas 'sexe') et 'health_status' (pas 'statut')
            const truiesFromBatch = batchPigs
              .filter((pig) => 
                (pig.sex === 'femelle' || pig.sexe === 'femelle') && 
                (pig.health_status !== 'dead' && pig.health_status !== 'removed')
              )
              .map((pig) => ({
                id: pig.id,
                nom: pig.name || pig.pig_code || pig.code || `Truie ${pig.id.slice(0, 8)}`,
                numero: parseInt((pig.pig_code || pig.code || pig.name || pig.id.slice(-4)).replace(/\D/g, '') || '0') || 0,
                batch: batch, // Garder la référence à la bande
                batch_id: batch.id,
                batch_name: batch.pen_name,
                code: pig.pig_code || pig.code || pig.name || `TRU-${pig.id.slice(0, 8)}`,
                race: pig.race,
              }));
            allTruiesBatch.push(...truiesFromBatch);
          } catch (error) {
            console.warn(`Erreur chargement batch_pigs pour batch truie ${batch.id}:`, error);
          }
        }
        setTruiesBatch(allTruiesBatch);
        
        // Charger les verrats batch (catégorie 'verrat_reproducteur')
        const verratsBatches = batchesData.filter((b) => b.category === 'verrat_reproducteur');
        const allVerratsBatch: any[] = [];
        for (const batch of verratsBatches) {
          try {
            const batchPigs = await apiClient.get<any[]>(`/batch-pigs/batch/${batch.id}`);
            // Convertir les batch_pigs en format VerratOption
            // Note: batch_pigs utilise 'sex' (pas 'sexe') et 'health_status' (pas 'statut')
            // Les batch_pigs sont actifs tant qu'ils existent (pas de champ statut actif/inactif)
            const verratsFromBatch = batchPigs
              .filter((pig) => 
                (pig.sex === 'male' || pig.sexe === 'male') && 
                (pig.health_status !== 'dead' && pig.health_status !== 'removed')
              )
              .map((pig) => ({
                id: pig.id,
                code: pig.pig_code || pig.code || pig.name || `VER-${pig.id.slice(0, 8)}`,
                nom: pig.name || pig.pig_code || pig.code || `Verrat ${pig.id.slice(0, 8)}`,
                sexe: 'male' as const,
                statut: 'actif' as const,
                reproducteur: true,
                numero: parseInt((pig.pig_code || pig.code || pig.name || pig.id.slice(-4)).replace(/\D/g, '') || '0') || 0,
                race: pig.race,
                projet_id: projetActif.id,
                batch_id: batch.id,
                batch_name: batch.pen_name,
              }));
            allVerratsBatch.push(...verratsFromBatch);
          } catch (error) {
            console.warn(`Erreur chargement batch_pigs pour batch verrat ${batch.id}:`, error);
          }
        }
        setVerratsBatch(allVerratsBatch);
      } catch (error) {
        console.error('Erreur lors du chargement des bandes:', error);
        setBatches([]);
        setVerratsBatch([]);
      } finally {
        setLoadingBatches(false);
      }
    };

    loadBatches();
  }, [projetActif?.id, isModeBatch, visible]);

  // Charger les animaux et mortalités au montage du composant
  // En mode batch, on charge aussi pour la détection de consanguinité
  useEffect(() => {
    if (projetActif && visible) {
      // Toujours charger les animaux pour la détection de consanguinité
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
      if (!isModeBatch) {
        dispatch(loadMortalitesParProjet(projetActif.id));
      }
    }
  }, [dispatch, projetActif?.id, visible, isModeBatch]);

  // D'abord filtrer les animaux du projet (doit être AVANT truies qui l'utilise)
  const animauxProjet = useMemo(() => {
    if (!projetActif || !animaux) return [];
    return animaux.filter((a: ProductionAnimal) => a.projet_id === projetActif.id);
  }, [animaux, projetActif?.id]);

  // Générer une liste de truies basée sur les animaux enregistrés
  // En mode batch, utiliser les truies individuelles des bandes de truies reproductrices
  const truies = useMemo(() => {
    if (!projetActif) return [];
    
    // Mode bande : utiliser les truies individuelles des bandes
    if (isModeBatch) {
      return truiesBatch;
    }

    // Mode individuel : Récupérer uniquement les truies réellement enregistrées dans le cheptel
    // Filtrer : femelles actives ET reproductrices
    if (!animauxProjet || animauxProjet.length === 0) return [];
    
    const truiesEnregistrees = animauxProjet.filter(
      (a: ProductionAnimal) =>
        a.sexe === 'femelle' &&
        a.statut?.toLowerCase() === 'actif' &&
        (a.reproducteur === true ||
          (typeof a.reproducteur === 'number' && a.reproducteur === 1) ||
          (typeof a.reproducteur === 'string' && a.reproducteur === '1')) &&
        a.projet_id === projetActif.id
    );

    // Convertir en format TruieOption
    return truiesEnregistrees.map((truie: ProductionAnimal) => {
      const numero = parseInt(truie.code?.replace(/\D/g, '') || '0') || 0;
      return {
        id: truie.id,
        nom: truie.nom || truie.code || `Truie ${numero}`,
        numero: numero,
        code: truie.code,
        race: truie.race,
      };
    });
  }, [projetActif?.id, animauxProjet, isModeBatch, truiesBatch]);

  // Générer une liste de verrats basée uniquement sur les verrats réellement enregistrés dans le cheptel
  // Ne plus créer de verrats virtuels pour éviter les verrats fantômes
  const verrats = useMemo(() => {
    if (!projetActif) {
      return [];
    }

    // Mode batch : utiliser les verrats batch
    if (isModeBatch) {
      return verratsBatch.map((v) => ({
        id: v.id,
        code: v.code,
        nom: v.nom,
        sexe: v.sexe as 'male',
        statut: v.statut as 'actif' | 'mort' | 'vendu' | 'offert',
        reproducteur: v.reproducteur ?? true,
        numero: v.numero,
        race: v.race,
        projet_id: v.projet_id,
      }));
    }

    // Mode individuel : Récupérer uniquement les verrats réellement enregistrés dans le cheptel
    // Filtrer : mâles actifs ET reproducteurs
    const verratsEnregistres = animauxProjet.filter(
      (a: ProductionAnimal) =>
        a.sexe === 'male' &&
        a.statut?.toLowerCase() === 'actif' &&
        (a.reproducteur === true ||
          (typeof a.reproducteur === 'number' && a.reproducteur === 1) ||
          (typeof a.reproducteur === 'string' && a.reproducteur === '1')) &&
        a.projet_id === projetActif.id
    );

    // Convertir en VerratOption
    const verratsOptions: VerratOption[] = verratsEnregistres.map((verrat: ProductionAnimal) => {
      const numero = parseInt(verrat.code?.replace(/\D/g, '') || '0') || 0;
      return {
        id: verrat.id,
        code: verrat.code || `VER${numero}`,
        nom: verrat.nom || `Verrat ${numero}`,
        sexe: verrat.sexe as 'male',
        statut: verrat.statut as 'actif' | 'mort' | 'vendu' | 'offert',
        reproducteur: verrat.reproducteur ?? true,
        numero: numero,
        race: verrat.race,
        projet_id: verrat.projet_id,
      };
    });

    // Si un verrat est déjà sélectionné dans le formulaire mais n'est plus actif, l'ajouter quand même
    if (formData.verrat_id) {
      const verratSelectionne = animauxProjet.find(
        (a: ProductionAnimal) => a.id === formData.verrat_id
      );
      if (verratSelectionne && !verratsOptions.find((v) => v.id === formData.verrat_id)) {
        const numero = parseInt(verratSelectionne.code?.replace(/\D/g, '') || '0') || 0;
        verratsOptions.push({
          id: verratSelectionne.id,
          code: verratSelectionne.code || `VER${numero}`,
          nom: verratSelectionne.nom || `Verrat ${numero}`,
          sexe: verratSelectionne.sexe as 'male',
          statut: verratSelectionne.statut as 'actif' | 'mort' | 'vendu' | 'offert',
          reproducteur: verratSelectionne.reproducteur ?? true,
          numero: numero,
          race: verratSelectionne.race,
          projet_id: verratSelectionne.projet_id,
        });
      }
    }

    // Trier : reproducteurs en premier, puis par code/nom
    const verratsTries = verratsOptions.sort((a, b) => {
      const aReproducteur = a.reproducteur ?? true;
      const bReproducteur = b.reproducteur ?? true;

      if (aReproducteur === bReproducteur) {
        const codeA = a.code?.toLowerCase() || '';
        const codeB = b.code?.toLowerCase() || '';
        return codeA.localeCompare(codeB);
      }

      return aReproducteur ? -1 : 1;
    });

    return verratsTries;
  }, [animauxProjet, projetActif?.id, formData.verrat_id, isModeBatch, verratsBatch]);

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
    // Mode batch : filtrer par recherche textuelle (nom, numéro ou loge)
    if (isModeBatch) {
      const query = searchQuery.toLowerCase().trim();
      if (!query) {
        return truies; // Afficher toutes les truies si pas de recherche
      }

      return truies.filter((truie) => {
        const nomLower = truie.nom.toLowerCase();
        const numeroStr = truie.numero.toString();
        const batchNameLower = (truie.batch_name || '').toLowerCase();
        return nomLower.includes(query) || numeroStr.includes(query) || batchNameLower.includes(query);
      });
    }

    // Mode individuel : Si un numéro direct est saisi et valide, retourner uniquement cette truie
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
  }, [truies, searchQuery, directInput, isModeBatch]);

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

  // Détecter automatiquement la consanguinité quand une truie et un verrat sont sélectionnés
  useEffect(() => {
    if (formData.truie_id && formData.verrat_id && animauxProjet.length > 0) {
      // Trouver la truie réelle dans le cheptel
      const truieReelle = animauxProjet.find((a) => a.id === formData.truie_id);

      if (truieReelle) {
        const resultat = detecterConsanguinite(
          formData.truie_id,
          formData.verrat_id,
          animauxProjet
        );
        setResultatConsanguinite(resultat);

        // Afficher une alerte si risque critique
        if (doitBloquerAccouplement(resultat)) {
          Alert.alert(
            '🚨 Risque de Consanguinité Critique',
            `${resultat.message}\n\n${resultat.details}\n\nCet accouplement est fortement déconseillé et peut causer de graves problèmes de santé chez les porcelets.`,
            [{ text: "J'ai compris", style: 'cancel' }]
          );
        }
      } else {
        // Si la truie n'est pas dans le cheptel (truie virtuelle), on ne peut pas détecter
        setResultatConsanguinite(null);
      }
    } else {
      setResultatConsanguinite(null);
    }
  }, [formData.truie_id, formData.verrat_id, animauxProjet]);

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
    }
  }, [gestation, isEditing, visible, projetActif?.id]);

  const handleSubmit = async () => {
    // Vérifier les permissions
    if (isEditing && !canUpdate('reproduction')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier les gestations."
      );
      return;
    }
    if (!isEditing && !canCreate('reproduction')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de créer des gestations.");
      return;
    }

    // Validation avec Yup
    // S'assurer que verrat_id est une string (même vide) pour la validation
    const validationData = {
      ...formData,
      verrat_id: formData.verrat_id || '',
    };
    const { isValid, errors: validationErrors } = await validateGestation(validationData);
    if (!isValid) {
      // Afficher la première erreur trouvée
      const firstError = Object.values(validationErrors)[0];
      Alert.alert(
        'Erreur de validation',
        firstError || 'Veuillez corriger les erreurs du formulaire'
      );
      return;
    }

    // Validation supplémentaire pour truie et verrat (peuvent être virtuels)
    if (!formData.truie_id && !formData.truie_nom?.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner ou saisir le nom de la truie');
      return;
    }
    if (!formData.verrat_id && !formData.verrat_nom?.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner le verrat utilisé pour cette saillie');
      return;
    }

    // Vérifier la consanguinité avant de soumettre
    if (resultatConsanguinite && doitBloquerAccouplement(resultatConsanguinite)) {
      Alert.alert(
        '⚠️ Confirmation requise',
        `Un risque critique de consanguinité a été détecté :\n\n${resultatConsanguinite.message}\n\n${resultatConsanguinite.details}\n\nÊtes-vous sûr de vouloir continuer ?`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => {} },
          {
            text: 'Continuer quand même',
            style: 'destructive',
            onPress: () => proceedWithSubmit(),
          },
        ]
      );
      return;
    }

    // Avertissement pour risques modérés/élevés
    if (resultatConsanguinite && doitAfficherAvertissement(resultatConsanguinite)) {
      Alert.alert(
        '⚠️ Avertissement',
        `${resultatConsanguinite.message}\n\n${resultatConsanguinite.details}\n\nVoulez-vous continuer ?`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => {} },
          {
            text: 'Continuer',
            onPress: () => proceedWithSubmit(),
          },
        ]
      );
      return;
    }

    proceedWithSubmit();
  };

  const proceedWithSubmit = async () => {
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
            projet_id: formData.projet_id,
            truie_id: formData.truie_id || '',
            truie_nom: formData.truie_nom,
            verrat_id: formData.verrat_id,
            verrat_nom: formData.verrat_nom,
            date_sautage: formData.date_sautage,
            nombre_porcelets_prevu: formData.nombre_porcelets_prevu,
            notes: formData.notes,
          })
        ).unwrap();
      }
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'enregistrement";
      Alert.alert('Erreur', errorMessage);
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
      <CustomModal
        visible={visible}
        onClose={onClose}
        title={isEditing ? 'Modifier la gestation' : 'Nouvelle gestation'}
        confirmText={isEditing ? 'Modifier' : 'Créer'}
        onConfirm={handleSubmit}
        showButtons={true}
        scrollEnabled={true}
      >
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Truie *
            </Text>
            {isModeBatch && (
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Sélectionnez une truie individuelle dans une loge de truies reproductrices
              </Text>
            )}

            {/* Champ de saisie directe du numéro (mode individuel uniquement) */}
            {!isModeBatch && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Numéro de la truie (saisie rapide)
                </Text>
              <TextInput
                style={[
                  styles.directInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                  },
                ]}
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
            )}

            {/* Barre de recherche (si pas de saisie directe valide) */}
            {!isModeBatch && (!directInput.trim() ||
              parseInt(directInput.trim()) > truies.length ||
              isNaN(parseInt(directInput.trim()))) && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Rechercher une truie
                </Text>
                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.text,
                    },
                  ]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Rechercher par nom ou numéro..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}

            {/* Barre de recherche pour les truies (mode batch) */}
            {isModeBatch && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Rechercher une truie
                </Text>
                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.text,
                    },
                  ]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Rechercher par nom, numéro ou loge..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}

            {/* Affichage de la truie sélectionnée */}
            {formData.truie_id && (
              <View
                style={[
                  styles.selectedTruieCard,
                  { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.selectedTruieLabel, { color: colors.textSecondary }]}>
                  Truie sélectionnée:
                </Text>
                <Text style={[styles.selectedTruieValue, { color: colors.primary }]}>
                  {formData.truie_nom}
                </Text>
                {isModeBatch && (() => {
                  const selectedTruie = truiesBatch.find((t) => t.id === formData.truie_id);
                  return selectedTruie && selectedTruie.batch_name ? (
                    <Text style={[styles.selectedTruieLabel, { color: colors.textSecondary, marginTop: 4 }]}>
                      Loge: {selectedTruie.batch_name}
                    </Text>
                  ) : null;
                })()}
              </View>
            )}

            {/* Liste des résultats filtrés */}
            {truies.length > 0 && (
              <View style={styles.resultsContainer}>
                {truiesFiltrees.length > 0 ? (
                  <>
                    <View style={styles.resultsHeader}>
                      <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                        {truiesFiltrees.length} {isModeBatch ? 'truie' : 'résultat'}{truiesFiltrees.length > 1 ? 's' : ''}
                        {!showFullList && truiesFiltrees.length === 50 && ` (sur ${truies.length})`}
                      </Text>
                      {!showFullList && truies.length > 50 && !isModeBatch && (
                        <TouchableOpacity
                          style={[styles.showAllButton, { backgroundColor: colors.primary }]}
                          onPress={() => setShowFullList(true)}
                        >
                          <Text style={[styles.showAllButtonText, { color: colors.textOnPrimary }]}>
                            Voir toutes ({truies.length})
                          </Text>
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
                              borderColor:
                                formData.truie_id === item.id ? colors.primary : colors.border,
                              backgroundColor:
                                formData.truie_id === item.id ? colors.primary : colors.background,
                            },
                          ]}
                          onPress={() => {
                            setFormData({
                              ...formData,
                              truie_id: item.id,
                              truie_nom: item.nom,
                            });
                            if (!isModeBatch) {
                              setDirectInput(item.numero.toString());
                            }
                            setSearchQuery('');
                          }}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              {
                                color:
                                  formData.truie_id === item.id
                                    ? colors.textOnPrimary
                                    : colors.text,
                                fontWeight: formData.truie_id === item.id ? '600' : 'normal',
                              },
                            ]}
                          >
                            {item.nom}
                            {isModeBatch && item.batch_name && (
                              <Text style={{ fontSize: 12, opacity: 0.8 }}>
                                {' '}(Loge: {item.batch_name})
                              </Text>
                            )}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={styles.noResults}>
                    <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                      {searchQuery.trim()
                        ? 'Aucun résultat trouvé'
                        : isModeBatch
                        ? 'Aucune truie disponible dans les loges de truies reproductrices'
                        : 'Commencez à rechercher ou saisissez un numéro'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Option de saisie manuelle si aucune truie/bande */}
            {truies.length === 0 && (
              <FormField
                label={isModeBatch ? "Nom de la bande" : "Nom de la truie"}
                value={formData.truie_nom || ''}
                onChangeText={(text) => setFormData({ ...formData, truie_nom: text })}
                placeholder={isModeBatch ? "Ex: Loge A - Truies" : "Ex: TRU015"}
                required
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Verrat utilisé *</Text>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Sélectionnez le verrat utilisé pour cette saillie. Ce champ est obligatoire pour
              tracer la généalogie.
            </Text>

            {/* Champ de recherche pour verrat */}
            <View style={styles.inputContainer}>
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

            {/* Affichage du verrat sélectionné */}
            {formData.verrat_id && (
              <View
                style={[
                  styles.selectedTruieCard,
                  { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.selectedTruieLabel, { color: colors.textSecondary }]}>
                  Verrat sélectionné:
                </Text>
                <Text style={[styles.selectedTruieValue, { color: colors.primary }]}>
                  {formData.verrat_nom}
                </Text>
              </View>
            )}

            {/* Liste des verrats disponibles */}
            {verrats.length > 0 && (
              <View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                  <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                    {verratsFiltres.length} verrat{verratsFiltres.length > 1 ? 's' : ''} disponible
                    {verratsFiltres.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <ScrollView
                  style={[
                    styles.verratListContainer,
                    { maxHeight: 200, borderColor: colors.border },
                  ]}
                  nestedScrollEnabled={true}
                >
                  {verratsFiltres.length > 0 ? (
                    verratsFiltres.map((verrat) => {
                      const selected = formData.verrat_id === verrat.id;

                      // Calculer le risque de consanguinité pour ce verrat si une truie est sélectionnée
                      let risqueVerrat: ResultatConsanguinite | null = null;
                      if (formData.truie_id && verrat.projet_id) {
                        // Seulement si le verrat est réellement dans le cheptel
                        risqueVerrat = detecterConsanguinite(
                          formData.truie_id,
                          verrat.id,
                          animauxProjet
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={verrat.id}
                          style={[
                            styles.option,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primary + '20' : colors.background,
                            },
                          ]}
                          onPress={() => {
                            logger.debug('Verrat sélectionné:', verrat);
                            setFormData((prev) => ({
                              ...prev,
                              verrat_id: verrat.id,
                              verrat_nom: `${verrat.code}${verrat.nom ? ` (${verrat.nom})` : ''}`,
                            }));
                            setVerratSearchQuery('');
                          }}
                        >
                          <View style={styles.verratOptionHeader}>
                            <Text
                              style={[
                                styles.optionText,
                                {
                                  color: selected ? colors.primary : colors.text,
                                  fontWeight: selected ? '600' : 'normal',
                                  flex: 1,
                                },
                              ]}
                            >
                              {verrat.code}
                              {verrat.nom ? ` - ${verrat.nom}` : ''}
                            </Text>
                            {risqueVerrat && risqueVerrat.risque !== RisqueConsanguinite.AUCUN && (
                              <Text style={{ fontSize: 18, marginLeft: SPACING.xs }}>
                                {getIconeRisque(risqueVerrat.niveau)}
                              </Text>
                            )}
                          </View>
                          {verrat.race && (
                            <Text style={[styles.optionSubtext, { color: colors.textSecondary }]}>
                              Race: {verrat.race} •{' '}
                              {verrat.statut?.toLowerCase() === 'actif' ? 'Actif' : verrat.statut}
                            </Text>
                          )}
                          {risqueVerrat && risqueVerrat.risque !== RisqueConsanguinite.AUCUN && (
                            <Text
                              style={[
                                styles.optionConsanguinite,
                                { color: getCouleurRisque(risqueVerrat.niveau) },
                              ]}
                            >
                              ⚠️ {risqueVerrat.message}
                            </Text>
                          )}
                          {!verrat.reproducteur && (
                            <Text style={[styles.optionWarning, { color: colors.warning }]}>
                              ⚠️ Non marqué comme reproducteur
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.noResults}>
                      <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                        {verratSearchQuery.trim()
                          ? 'Aucun verrat trouvé avec cette recherche'
                          : 'Aucun verrat disponible'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            {verrats.length === 0 && (
              <View
                style={[
                  styles.warningBox,
                  { backgroundColor: colors.warning + '15', borderColor: colors.warning },
                ]}
              >
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  ⚠️ Aucun verrat disponible.{' '}
                  {isModeBatch
                    ? 'Vérifiez que vous avez créé une loge de verrats reproducteurs dans le module Production avec des verrats actifs.'
                    : `Nombre de verrats dans le projet: ${projetActif?.nombre_verrats ?? 0}. Vérifiez les paramètres du projet ou ajoutez des verrats dans le module Production.`}
                </Text>
              </View>
            )}
          </View>

          {/* Alerte de consanguinité */}
          {resultatConsanguinite && resultatConsanguinite.risque !== RisqueConsanguinite.AUCUN && (
            <View
              style={[
                styles.consanguiniteBox,
                {
                  backgroundColor: getCouleurRisque(resultatConsanguinite.niveau) + '15',
                  borderColor: getCouleurRisque(resultatConsanguinite.niveau),
                  borderWidth: 2,
                },
              ]}
            >
              <View style={styles.consanguiniteHeader}>
                <Text style={[styles.consanguiniteIcone, { fontSize: 24 }]}>
                  {getIconeRisque(resultatConsanguinite.niveau)}
                </Text>
                <Text
                  style={[
                    styles.consanguiniteTitre,
                    { color: getCouleurRisque(resultatConsanguinite.niveau) },
                  ]}
                >
                  {resultatConsanguinite.message}
                </Text>
              </View>
              {resultatConsanguinite.details && (
                <Text style={[styles.consanguiniteDetails, { color: colors.text }]}>
                  {resultatConsanguinite.details}
                </Text>
              )}
              {resultatConsanguinite.niveau === 'critique' && (
                <View
                  style={[
                    styles.consanguiniteWarning,
                    { backgroundColor: getCouleurRisque('critique') },
                  ]}
                >
                  <Text style={styles.consanguiniteWarningText}>
                    ⛔ Cet accouplement n'est PAS recommandé et peut entraîner des malformations
                    graves.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Message de confirmation si aucun risque */}
          {resultatConsanguinite && resultatConsanguinite.risque === RisqueConsanguinite.AUCUN && (
            <View
              style={[
                styles.consanguiniteBox,
                {
                  backgroundColor: getCouleurRisque('aucun') + '15',
                  borderColor: getCouleurRisque('aucun'),
                },
              ]}
            >
              <View style={styles.consanguiniteHeader}>
                <Text style={[styles.consanguiniteIcone, { fontSize: 20 }]}>✓</Text>
                <Text style={[styles.consanguiniteOkText, { color: getCouleurRisque('aucun') }]}>
                  Aucun risque de consanguinité détecté
                </Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Date de sautage *</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
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
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Date de mise bas prévue:
            </Text>
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
        </>
      </CustomModal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 400,
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
  optionSelected: {},
  optionText: {
    fontSize: 14,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  optionSubtext: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  optionWarning: {
    fontSize: 11,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  verratListContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  warningBox: {
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheetContainer: {
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
  consanguiniteBox: {
    padding: SPACING.md,
    borderRadius: 12,
    marginVertical: SPACING.md,
    borderWidth: 1,
  },
  consanguiniteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  consanguiniteIcone: {
    marginRight: SPACING.sm,
  },
  consanguiniteTitre: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  consanguiniteOkText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  consanguiniteDetails: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  consanguiniteWarning: {
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.sm,
  },
  consanguiniteWarningText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  verratOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionConsanguinite: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(GestationFormModal);
