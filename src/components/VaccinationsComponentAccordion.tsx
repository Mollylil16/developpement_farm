/**
 * VaccinationsComponentAccordion - Version avec accordéon (sans modals)
 * Les formulaires se déplient directement dans les cartes
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  RefreshControlProps,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { selectAllVaccinations } from '../store/selectors/santeSelectors';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { selectAllDepensesPonctuelles } from '../store/selectors/financeSelectors';
import {
  loadVaccinations,
  createVaccination,
  updateVaccination,
  deleteVaccination,
  genererRappelsAutomatiques,
} from '../store/slices/santeSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import {
  TypeProphylaxie,
  TYPE_PROPHYLAXIE_LABELS,
  RAISON_TRAITEMENT_LABELS,
  RaisonTraitement,
  StatistiquesProphylaxieParType,
  calculerAgeJours,
  CALENDRIER_VACCINAL_TYPE,
  CreateVaccinationInput,
  Vaccination,
} from '../types/sante';
import { getCategorieAnimal } from '../utils/animalUtils';
import { formatLocalDate, getCurrentLocalDate } from '../utils/dateUtils';
import { parseAnimalIds, animalIncludedInVaccination } from '../utils/vaccinationUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useModeElevage } from '../hooks/useModeElevage';
import BatchSelector from './sante/BatchSelector';
import { Batch } from '../types/batch';
import apiClient from '../services/api/apiClient';
import BandeEnRetardGroup from './sante/BandeEnRetardGroup';
import AnimauxSansBandeGroup from './sante/AnimauxSansBandeGroup';
import AnimalEnRetardItem from './sante/AnimalEnRetardItem';

// Activer LayoutAnimation sur Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

type SectionOuverte = TypeProphylaxie | `${TypeProphylaxie}_calendrier` | null;

export default function VaccinationsComponentAccordion({ refreshControl }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const modeElevage = useModeElevage();
  const isModeBatch = modeElevage === 'bande';

  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const vaccinations = useAppSelector(selectAllVaccinations);
  const animaux = useAppSelector(selectAllAnimaux);
  const allDepensesPonctuelles = useAppSelector(selectAllDepensesPonctuelles);

  const [sectionOuverte, setSectionOuverte] = useState<SectionOuverte>(null);
  const [historiqueOuvert, setHistoriqueOuvert] = useState<Set<TypeProphylaxie>>(new Set());
  const [vaccinationEnEdition, setVaccinationEnEdition] = useState<string | null>(null);

  // États du formulaire
  const [produitAdministre, setProduitAdministre] = useState('');
  const [dosage, setDosage] = useState('');
  const [uniteDosage, setUniteDosage] = useState('ml');
  const [cout, setCout] = useState('');
  const [raisonTraitement, setRaisonTraitement] = useState<RaisonTraitement>('suivi_normal');
  const [animauxSelectionnes, setAnimauxSelectionnes] = useState<string[]>([]);
  const [rechercheAnimal, setRechercheAnimal] = useState('');
  // Mode batch : sélection de la bande
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [nombreSujetsVaccines, setNombreSujetsVaccines] = useState('');
  // Mapping animal_id -> batch_id pour le mode bande
  const [animalBatchMap, setAnimalBatchMap] = useState<Map<string, string>>(new Map());
  
  // État pour génération des rappels
  const [generatingRappels, setGeneratingRappels] = useState(false);

  // Générer les rappels automatiques selon les standards porcins
  const handleGenererRappels = useCallback(async () => {
    if (!projetActif?.id) return;
    
    setGeneratingRappels(true);
    try {
      const result = await dispatch(genererRappelsAutomatiques(projetActif.id)).unwrap();
      Alert.alert(
        '✅ Rappels configurés',
        `${result.rappels_crees} rappel(s) créé(s) selon les standards de l'élevage porcin.\n\n` +
        `Standards appliqués:\n` +
        `• Mycoplasme: 14 jours\n` +
        `• Rouget: 6 mois\n` +
        `• Parvovirose: 21 jours\n` +
        `• Leptospirose: 6 mois\n` +
        `• PRRS: 4 mois\n` +
        `• Vermifuge: 2 mois`,
        [{ text: 'OK' }]
      );
      // Recharger les vaccinations pour voir les dates de rappel mises à jour
      dispatch(loadVaccinations(projetActif.id));
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de la génération des rappels');
    } finally {
      setGeneratingRappels(false);
    }
  }, [dispatch, projetActif?.id]);

  // Charger les données uniquement quand l'écran est visible (useFocusEffect)
  useFocusEffect(
    useCallback(() => {
      if (!projetActif?.id) return;

      // Charger les vaccinations et animaux uniquement quand l'écran est visible
      dispatch(loadVaccinations(projetActif.id));
      // Inclure les inactifs pour avoir tous les animaux (actif et autre statuts)
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true }));
    }, [projetActif?.id, dispatch])
  );

  // Charger les bandes en mode batch uniquement quand l'écran est visible
  useFocusEffect(
    useCallback(() => {
      if (!isModeBatch || !projetActif?.id) {
        setBatches([]);
        setAnimalBatchMap(new Map());
        return;
      }

      let cancelled = false;

      const loadBatches = async () => {
        try {
          const data = await apiClient.get<Batch[]>(`/batch-pigs/projet/${projetActif.id}`);
          if (!cancelled) {
            setBatches(data || []);
            
            // Charger les batch_pigs pour créer le mapping animal_id -> batch_id
            const map = new Map<string, string>();
            for (const batch of data || []) {
              try {
                const batchPigs = await apiClient.get<any[]>(`/batch-pigs/batch/${batch.id}`);
                batchPigs.forEach((pig) => {
                  if (pig.id) {
                    map.set(pig.id, batch.id);
                  }
                });
              } catch (error) {
                console.warn(`[VaccinationsComponentAccordion] Erreur chargement batch_pigs pour batch ${batch.id}:`, error);
              }
            }
            if (!cancelled) {
              setAnimalBatchMap(map);
            }
          }
        } catch (error) {
          if (!cancelled) {
            console.error('[VaccinationsComponentAccordion] Erreur chargement bandes:', error);
            setBatches([]);
            setAnimalBatchMap(new Map());
          }
        }
      };

      loadBatches();

      return () => {
        cancelled = true;
      };
    }, [isModeBatch, projetActif?.id])
  );

  // Debug removed to prevent "Text must be rendered" errors

  // Filtrer les dépenses pour le calcul automatique du coût (mémorisé pour éviter les re-renders)
  const depensesPonctuelles = useMemo(() => {
    return allDepensesPonctuelles.filter(
      (d) => d.categorie === 'medicaments' || d.categorie === 'veterinaire'
    );
  }, [allDepensesPonctuelles]);

  // Calculer le coût moyen automatique par vaccination
  const calculerCoutMoyenAutomatique = useCallback(() => {
    // Filtrer les dépenses de type "medicaments" et "veterinaire"
    const depensesProphylaxie = depensesPonctuelles.filter(
      (d) => d.categorie === 'medicaments' || d.categorie === 'veterinaire'
    );

    // Calculer le total des dépenses
    const totalDepenses = depensesProphylaxie.reduce((sum, d) => sum + (d.montant || 0), 0);

    // Compter le nombre total de vaccinations effectuées
    const totalVaccinations = (vaccinations || []).filter((v) => v.statut === 'effectue').length;

    // Calculer le coût moyen
    if (totalVaccinations === 0) return 0;
    return Math.round(totalDepenses / totalVaccinations);
  }, [depensesPonctuelles, vaccinations]);

  // Calculer les statistiques globales
  const statsGlobales = useMemo(() => {
    // En mode batch, calculer le total à partir des bandes
    const totalAnimaux = isModeBatch
      ? batches.reduce((sum, batch) => sum + (batch.total_count || 0), 0)
      : (animaux || []).filter((a) => a.statut === 'actif').length;
    const totalVaccinations = (vaccinations || []).length;

    let porcsEnRetard = 0;
    let tauxCouverture = 0;

    if (isModeBatch) {
      // Mode batch : calculer la couverture basée sur les vaccinations par bande
      // Une bande est "couverte" si elle a au moins une vaccination effectuée
      const bandesVaccineesSet = new Set<string>();
      let totalSujetsVaccines = 0;

      (vaccinations || []).forEach((v) => {
        if (v.statut === 'effectue' && v.batch_id) {
          bandesVaccineesSet.add(v.batch_id);
          // Utiliser nombre_sujets_vaccines si défini, sinon le total de la bande
          if (v.nombre_sujets_vaccines) {
            totalSujetsVaccines += v.nombre_sujets_vaccines;
          } else {
            const batch = batches.find((b) => b.id === v.batch_id);
            totalSujetsVaccines += batch?.total_count || 0;
          }
        }
      });

      // Éviter les doublons : prendre le minimum entre sujets vaccinés et total
      const sujetsVaccinesUniques = Math.min(totalSujetsVaccines, totalAnimaux);
      porcsEnRetard = Math.max(0, totalAnimaux - sujetsVaccinesUniques);
      tauxCouverture = totalAnimaux > 0 ? Math.round((sujetsVaccinesUniques / totalAnimaux) * 100) : 0;
    } else {
      // Mode individuel : compter les sujets uniques en retard
      const porcsEnRetardSet = new Set<string>();

      (animaux || []).forEach((animal) => {
        if (animal.statut !== 'actif' || !animal.date_naissance) return;

        const ageJours = calculerAgeJours(animal.date_naissance);
        const traitementsObligatoires = CALENDRIER_VACCINAL_TYPE.filter(
          (cal) => cal.obligatoire && cal.age_jours <= ageJours
        );

        // Si l'animal a au moins un traitement obligatoire manquant, il est en retard
        const aAuMoinsUnTraitementManquant = traitementsObligatoires.some((traitement) => {
          const aRecuTraitement = (vaccinations || []).some(
            (v) =>
              animalIncludedInVaccination(v.animal_ids, animal.id) &&
              v.type_prophylaxie === traitement.type_prophylaxie &&
              v.statut === 'effectue'
          );
          return !aRecuTraitement;
        });

        if (aAuMoinsUnTraitementManquant) {
          porcsEnRetardSet.add(animal.id);
        }
      });

      porcsEnRetard = porcsEnRetardSet.size;
      tauxCouverture = totalAnimaux > 0 ? Math.round(((totalAnimaux - porcsEnRetard) / totalAnimaux) * 100) : 0;
    }

    return {
      totalAnimaux,
      totalVaccinations,
      porcsEnRetard,
      tauxCouverture,
    };
  }, [animaux, vaccinations, isModeBatch, batches]);

  // Statistiques par type
  const statParType = useMemo((): StatistiquesProphylaxieParType[] => {
    const types: TypeProphylaxie[] = [
      'vitamine',
      'deparasitant',
      'fer',
      'antibiotique_preventif',
      'vaccin_obligatoire',
      'autre_traitement',
    ];

    return types.map((type) => {
      const vaccinationsType = (vaccinations || []).filter((v) => v.type_prophylaxie === type);

      // En mode batch, calculer le total des sujets vaccinés à partir des vaccinations
      let porcsVaccines = 0;
      if (isModeBatch) {
        // Comptabiliser les sujets vaccinés par batch
        vaccinationsType.forEach((v) => {
          if (v.nombre_sujets_vaccines) {
            porcsVaccines += v.nombre_sujets_vaccines;
          } else if (v.batch_id) {
            // Si pas de nombre spécifié, utiliser le total de la bande
            const batch = batches.find((b) => b.id === v.batch_id);
            porcsVaccines += batch?.total_count || 0;
          }
        });
      } else {
        // Mode individuel : compter les animaux uniques
        const porcsVaccinesSet = new Set<string>();
        vaccinationsType.forEach((v) => {
          const animalIds = parseAnimalIds(v.animal_ids);
          animalIds.forEach((id) => porcsVaccinesSet.add(id));
        });
        porcsVaccines = porcsVaccinesSet.size;
      }
      const totalPorcs = statsGlobales.totalAnimaux;
      // Limiter porcsVaccines au total pour éviter des taux > 100%
      const porcsVaccinesLimites = Math.min(porcsVaccines, totalPorcs);
      const tauxCouverture = totalPorcs > 0 ? Math.round((porcsVaccinesLimites / totalPorcs) * 100) : 0;

      const dernierTraitement = vaccinationsType.sort(
        (a, b) => new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime()
      )[0]?.date_vaccination;

      const coutTotal = vaccinationsType.reduce((sum, v) => sum + (v.cout || 0), 0);

      // Compter les sujets en retard
      let enRetard = 0;
      if (isModeBatch) {
        // En mode batch : sujets non vaccinés pour ce type = total - vaccinés (limité à 0 minimum)
        enRetard = Math.max(0, totalPorcs - porcsVaccinesLimites);
      } else {
        // Mode individuel : compter les sujets uniques en retard
        const porcsEnRetardSet = new Set<string>();
        (animaux || []).forEach((animal) => {
          if (animal.statut !== 'actif' || !animal.date_naissance) return;

          const ageJours = calculerAgeJours(animal.date_naissance);
          const traitementsObligatoiresType = CALENDRIER_VACCINAL_TYPE.filter(
            (cal) => cal.obligatoire && cal.type_prophylaxie === type && cal.age_jours <= ageJours
          );

          // Si l'animal a au moins un traitement obligatoire manquant, il est en retard
          const aAuMoinsUnTraitementManquant = traitementsObligatoiresType.some((traitement) => {
            const aRecuTraitement = (vaccinations || []).some(
              (v) =>
                animalIncludedInVaccination(v.animal_ids, animal.id) &&
                v.type_prophylaxie === type &&
                v.statut === 'effectue'
            );
            return !aRecuTraitement;
          });

          if (aAuMoinsUnTraitementManquant) {
            porcsEnRetardSet.add(animal.id);
          }
        });
        enRetard = porcsEnRetardSet.size;
      }

      return {
        type_prophylaxie: type,
        nom_type: TYPE_PROPHYLAXIE_LABELS[type],
        total_vaccinations: vaccinationsType.length,
        porcs_vaccines: porcsVaccinesLimites,
        total_porcs: totalPorcs,
        taux_couverture: tauxCouverture,
        dernier_traitement: dernierTraitement,
        cout_total: coutTotal,
        en_retard: enRetard,
      };
    });
  }, [vaccinations, animaux, statsGlobales.totalAnimaux, isModeBatch, batches]);

  const getIconeType = (type: TypeProphylaxie): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'vitamine':
        return 'nutrition';
      case 'deparasitant':
        return 'bug';
      case 'fer':
        return 'magnet';
      case 'antibiotique_preventif':
        return 'shield-checkmark';
      case 'vaccin_obligatoire':
        return 'medical';
      case 'autre_traitement':
        return 'flask';
      default:
        return 'medical';
    }
  };

  const getCouleurType = (type: TypeProphylaxie): string => {
    switch (type) {
      case 'vitamine':
        return '#FFA726';
      case 'deparasitant':
        return '#AB47BC';
      case 'fer':
        return '#EF5350';
      case 'antibiotique_preventif':
        return '#42A5F5';
      case 'vaccin_obligatoire':
        return '#66BB6A';
      case 'autre_traitement':
        return '#78909C';
      default:
        return colors.primary;
    }
  };

  const toggleSection = (type: TypeProphylaxie) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (sectionOuverte === type) {
      setSectionOuverte(null);
      reinitialiserFormulaire();
    } else {
      setSectionOuverte(type);
      // Si on ouvre une autre section, réinitialiser aussi
      if (sectionOuverte !== null) {
        reinitialiserFormulaire();
      }
    }
  };

  const toggleAnimal = (animalId: string) => {
    setAnimauxSelectionnes((prev) => {
      if (prev.includes(animalId)) {
        return prev.filter((id) => id !== animalId);
      } else {
        return [...prev, animalId];
      }
    });
  };

  const initialiserFormulaireAvecVaccination = (vaccination: Vaccination) => {
    const animalIds = parseAnimalIds(vaccination.animal_ids);
    setVaccinationEnEdition(vaccination.id);
    setProduitAdministre(vaccination.produit_administre || '');
    setDosage(vaccination.dosage || '');
    setUniteDosage(vaccination.unite_dosage || 'ml');
    setCout(vaccination.cout ? vaccination.cout.toString() : '');
    setRaisonTraitement(vaccination.raison_traitement || 'suivi_normal');
    setAnimauxSelectionnes(animalIds);
    setSectionOuverte(vaccination.type_prophylaxie);
    // Restaurer la bande sélectionnée en mode batch
    if (vaccination.batch_id && batches.length > 0) {
      const batch = batches.find((b) => b.id === vaccination.batch_id);
      setSelectedBatch(batch || null);
    } else {
      setSelectedBatch(null);
    }
    // Restaurer le nombre de sujets vaccinés
    setNombreSujetsVaccines(vaccination.nombre_sujets_vaccines ? vaccination.nombre_sujets_vaccines.toString() : '');
    // Ouvrir l'historique pour voir la vaccination modifiée
    setHistoriqueOuvert((prev) => {
      const nouveau = new Set(prev);
      nouveau.add(vaccination.type_prophylaxie);
      return nouveau;
    });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const reinitialiserFormulaire = () => {
    setVaccinationEnEdition(null);
    setProduitAdministre('');
    setDosage('');
    setUniteDosage('ml');
    setCout('');
    setRaisonTraitement('suivi_normal');
    setAnimauxSelectionnes([]);
    setRechercheAnimal('');
    setSelectedBatch(null);
    setNombreSujetsVaccines('');
  };

  const handleSupprimerVaccination = (vaccinationId: string, typeProphylaxie: TypeProphylaxie) => {
    Alert.alert(
      'Supprimer la vaccination',
      'Êtes-vous sûr de vouloir supprimer cette vaccination ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteVaccination(vaccinationId)).unwrap();
              Alert.alert('Succès', 'Vaccination supprimée avec succès');

              // Recharger les vaccinations
              if (projetActif?.id) {
                dispatch(loadVaccinations(projetActif.id));
              }
            } catch (error: unknown) {
              Alert.alert('Erreur', 'Impossible de supprimer la vaccination');
            }
          },
        },
      ]
    );
  };

  const handleEnregistrer = async () => {
    if (!sectionOuverte || !projetActif?.id) return;

    // Validation
    if (!produitAdministre.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du produit administré');
      return;
    }

    if (!dosage.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le dosage');
      return;
    }

    // Validation selon le mode
    if (isModeBatch) {
      if (!selectedBatch) {
        Alert.alert('Erreur', 'Veuillez sélectionner une loge');
        return;
      }
    } else {
      if (animauxSelectionnes.length === 0) {
        Alert.alert('Erreur', 'Veuillez sélectionner au moins un animal');
        return;
      }
    }

    try {
      // Déterminer le coût : manuel ou automatique
      let coutFinal: number | undefined = undefined;
      if (cout && cout.trim() !== '') {
        // L'utilisateur a renseigné un coût manuel
        coutFinal = parseFloat(cout);
      } else {
        // Calcul automatique basé sur les dépenses
        const coutAuto = calculerCoutMoyenAutomatique();
        if (coutAuto > 0) {
          coutFinal = coutAuto;
        }
      }

      if (vaccinationEnEdition) {
        // Mise à jour d'une vaccination existante
        const updates: Partial<Vaccination> = {
          animal_ids: isModeBatch ? [] : animauxSelectionnes,
          batch_id: isModeBatch && selectedBatch ? selectedBatch.id : undefined,
          nombre_sujets_vaccines: isModeBatch && nombreSujetsVaccines ? parseInt(nombreSujetsVaccines) : undefined,
          produit_administre: produitAdministre.trim(),
          dosage: dosage.trim(),
          unite_dosage: uniteDosage,
          raison_traitement: raisonTraitement,
          cout: coutFinal,
        };

        await dispatch(updateVaccination({ id: vaccinationEnEdition, updates })).unwrap();

        Alert.alert('Succès', 'Vaccination modifiée avec succès');

        // Recharger les vaccinations
        if (projetActif?.id) {
          dispatch(loadVaccinations(projetActif.id));
        }

        // Réinitialiser et fermer
        reinitialiserFormulaire();
        toggleSection(sectionOuverte);
      } else {
        // Création d'une nouvelle vaccination
        const dateVaccination = getCurrentLocalDate();

        // Extraire le type de base si c'est un type calendrier
        const typeProphylaxie: TypeProphylaxie = sectionOuverte.endsWith('_calendrier')
          ? (sectionOuverte.replace('_calendrier', '') as TypeProphylaxie)
          : (sectionOuverte as TypeProphylaxie);

        const input: CreateVaccinationInput = {
          projet_id: projetActif.id,
          animal_ids: isModeBatch ? [] : animauxSelectionnes,
          batch_id: isModeBatch && selectedBatch ? selectedBatch.id : undefined,
          nombre_sujets_vaccines: isModeBatch && nombreSujetsVaccines ? parseInt(nombreSujetsVaccines) : undefined,
          type_prophylaxie: typeProphylaxie,
          produit_administre: produitAdministre.trim(),
          date_vaccination: dateVaccination,
          dosage: dosage.trim(),
          unite_dosage: uniteDosage,
          raison_traitement: raisonTraitement,
          cout: coutFinal,
          statut: 'effectue',
        };

        await dispatch(createVaccination(input)).unwrap();

        const nombreSujets = isModeBatch && nombreSujetsVaccines 
          ? parseInt(nombreSujetsVaccines) 
          : (isModeBatch && selectedBatch ? selectedBatch.total_count : animauxSelectionnes.length);
        const messageSucces =
          coutFinal && !cout
            ? `Vaccination enregistrée pour ${nombreSujets} sujet(s)\n💡 Coût calculé automatiquement: ${coutFinal} FCFA`
            : `Vaccination enregistrée pour ${nombreSujets} sujet(s)`;

        Alert.alert('Succès', messageSucces);

        // Réinitialiser et fermer
        reinitialiserFormulaire();
        toggleSection(sectionOuverte);
      }
    } catch (error: unknown) {
      console.error('=== ERREUR ENREGISTREMENT ===');
      console.error('Type erreur:', typeof error);
      console.error('Erreur complète:', error);
      const errorObj = error instanceof Error ? error : null;
      console.error('Error message:', errorObj?.message);
      console.error('Error stack:', errorObj?.stack);
      console.error('Error name:', errorObj?.name);

      const errorMessage = errorObj?.message || String(error) || 'Erreur inconnue';
      Alert.alert(
        'Erreur',
        `Impossible d'enregistrer la vaccination\n\nDétails: ${errorMessage}\n\nVoir les logs pour plus d'informations`
      );
    }
  };

  const renderCarteRecapitulative = () => {
    return (
      <View
        style={[
          styles.carteRecap,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            ...colors.shadow.medium,
          },
        ]}
      >
        <View style={styles.headerRecap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="stats-chart" size={24} color={colors.primary} />
            <Text style={[styles.titreRecap, { color: colors.text }]}>Aperçu Prophylaxie</Text>
          </View>
          <TouchableOpacity
            onPress={handleGenererRappels}
            disabled={generatingRappels}
            style={[
              styles.btnConfigRappels,
              { 
                backgroundColor: colors.primary,
                opacity: generatingRappels ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons 
              name={generatingRappels ? "hourglass" : "calendar-outline"} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.btnConfigRappelsText}>
              {generatingRappels ? 'Config...' : 'Rappels auto'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {statsGlobales.totalAnimaux}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Porcs actifs</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {statsGlobales.totalVaccinations}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Traitements</Text>
          </View>

          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: statsGlobales.porcsEnRetard > 5 ? colors.error : colors.warning },
              ]}
            >
              {statsGlobales.porcsEnRetard}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En retard</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {statsGlobales.tauxCouverture}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Couverture</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${statsGlobales.tauxCouverture}%`,
                },
              ]}
            />
          </View>
        </View>

        {statsGlobales.porcsEnRetard > 5 && (
          <View style={[styles.alerteRetard, { backgroundColor: `${colors.error}15` }]}>
            <Ionicons name="warning" size={20} color={colors.error} />
            <Text style={[styles.alerteTexte, { color: colors.error }]}>
              {statsGlobales.porcsEnRetard} porcs en retard sur le calendrier vaccinal
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderFormulaire = (type: TypeProphylaxie, couleur: string) => {
    if (sectionOuverte !== type) return null;

    const animauxActifs = (animaux || []).filter((a) => a.statut === 'actif');

    // Debug removed

    return (
      <View style={[styles.formulaire, { backgroundColor: colors.background }]}>
        {/* Indicateur de mode édition */}
        {vaccinationEnEdition && (
          <View
            style={[
              styles.modeEditionBadge,
              { backgroundColor: `${couleur}15`, borderColor: couleur },
            ]}
          >
            <Ionicons name="create-outline" size={16} color={couleur} />
            <Text style={[styles.modeEditionText, { color: couleur }]}>
              Mode édition - Modification d'une vaccination existante
            </Text>
            <TouchableOpacity
              onPress={() => {
                reinitialiserFormulaire();
                toggleSection(type);
              }}
            >
              <Ionicons name="close-circle" size={18} color={couleur} />
            </TouchableOpacity>
          </View>
        )}

        {/* Produit */}
        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>
            Produit administré <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.formInput,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={produitAdministre}
            onChangeText={setProduitAdministre}
            placeholder="Ex: Fer dextran, Vitamine AD3E..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Dosage */}
        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>
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
            <View
              style={[
                styles.uniteContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.uniteTexte, { color: colors.text }]}>{uniteDosage}</Text>
            </View>
          </View>
        </View>

        {/* Coût */}
        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Coût (FCFA) - optionnel</Text>
          <TextInput
            style={[
              styles.formInput,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={cout}
            onChangeText={setCout}
            placeholder="Ex: 5000"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
          <Text style={[styles.formHint, { color: colors.textSecondary }]}>
            💡 Laissez vide pour calcul automatique depuis dépenses
            {!cout && calculerCoutMoyenAutomatique() > 0 && (
              <Text style={{ color: colors.success, fontWeight: '600' }}>
                {' '}
                • Coût moyen: {calculerCoutMoyenAutomatique()} FCFA
              </Text>
            )}
          </Text>
        </View>

        {/* Sélection : Bande (mode batch) ou Animaux (mode individuel) */}
        {isModeBatch ? (
          /* Mode Batch : Sélection de bande */
          <View style={styles.formSection}>
            <BatchSelector
              selectedBatchId={selectedBatch?.id || null}
              onBatchSelect={(batch) => setSelectedBatch(batch)}
              label="Sélectionner une loge *"
            />
            {selectedBatch && (
              <>
                <View style={[styles.batchSelectedInfo, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                  <Ionicons name="home" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.batchSelectedName, { color: colors.primary }]}>
                      {selectedBatch.pen_name}
                    </Text>
                    <Text style={[styles.batchSelectedMeta, { color: colors.textSecondary }]}>
                      {selectedBatch.total_count} sujet(s) • {(selectedBatch.average_weight_kg || 0).toFixed(1)} kg moy.
                    </Text>
                  </View>
                </View>
                {/* Nombre de sujets vaccinés */}
                <Text style={[styles.formLabel, { color: colors.text, marginTop: SPACING.sm }]}>
                  Nombre de sujets vaccinés
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                  ]}
                  value={nombreSujetsVaccines}
                  onChangeText={setNombreSujetsVaccines}
                  placeholder={`Tous les ${selectedBatch.total_count} sujet(s) par défaut`}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                  💡 Laissez vide pour vacciner tous les sujets de la loge
                </Text>
              </>
            )}
          </View>
        ) : (
          /* Mode Individuel : Sélection d'animaux */
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.text }]}>
              Sélectionner les animaux <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <Text style={[styles.compteur, { color: colors.primary }]}>
              {animauxSelectionnes.length} sélectionné(s)
            </Text>

            {/* Info si pas de noms */}
            {animauxActifs.length > 0 && !animauxActifs[0].nom && (
              <Text style={[styles.formHint, { color: colors.warning, marginBottom: 8 }]}>
                💡 Astuce : Ajoutez des noms à vos animaux dans Production pour les identifier
                facilement
              </Text>
            )}

          {/* Barre de recherche */}
          <View
            style={[
              styles.rechercheContainer,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.rechercheInput, { color: colors.text }]}
              placeholder="Rechercher par nom, ID..."
              placeholderTextColor={colors.textSecondary}
              value={rechercheAnimal}
              onChangeText={setRechercheAnimal}
            />
            {rechercheAnimal.length > 0 && (
              <TouchableOpacity onPress={() => setRechercheAnimal('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={[
              styles.listeAnimaux,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            nestedScrollEnabled
          >
            {animauxActifs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun animal actif
                </Text>
              </View>
            ) : (
              (() => {
                // Filtrer selon la recherche
                const animauxFiltres = animauxActifs.filter((animal) => {
                  if (!rechercheAnimal) return true;
                  const searchLower = rechercheAnimal.toLowerCase();
                  const nom = (animal.nom || '').toLowerCase();
                  const code = (animal.code || '').toLowerCase();
                  const categorie = getCategorieAnimal(animal).toLowerCase();
                  return (
                    nom.includes(searchLower) ||
                    code.includes(searchLower) ||
                    categorie.includes(searchLower)
                  );
                });

                if (animauxFiltres.length === 0) {
                  return (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        Aucun résultat pour "{rechercheAnimal}"
                      </Text>
                    </View>
                  );
                }

                return animauxFiltres.map((animal) => {
                  const isSelected = animauxSelectionnes.includes(animal.id);

                  // Utiliser les bonnes propriétés du type ProductionAnimal
                  const nomAnimal = animal.nom; // Pas nom_personnalise
                  const codeAnimal = animal.code; // Pas code_identification
                  const animalId = animal.id;

                  // Construire le nom de façon plus robuste
                  let nom = 'Sans nom';
                  if (nomAnimal && nomAnimal.trim() !== '' && nomAnimal !== 'undefined') {
                    nom = nomAnimal;
                  } else if (codeAnimal && codeAnimal.trim() !== '' && codeAnimal !== 'undefined') {
                    nom = codeAnimal;
                  } else if (animalId) {
                    // Utiliser l'ID mais le rendre plus lisible
                    const shortId = animalId.replace('animal_', '').slice(0, 12);
                    nom = `Porc #${shortId}`;
                  }

                  const categorie = getCategorieAnimal(animal);
                  return (
                    <TouchableOpacity
                      key={animal.id}
                      style={[
                        styles.animalItem,
                        {
                          backgroundColor: isSelected ? `${couleur}15` : 'transparent',
                          borderColor: isSelected ? couleur : colors.border,
                        },
                      ]}
                      onPress={() => toggleAnimal(animal.id)}
                    >
                      <View style={styles.animalItemLeft}>
                        <View style={[styles.checkbox, isSelected && { backgroundColor: couleur }]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.animalNom, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {nom}
                          </Text>
                          <Text style={[styles.animalDetails, { color: colors.textSecondary }]}>
                            {categorie}
                            {codeAnimal ? ` • ${codeAnimal}` : ''}
                            {animal.sexe
                              ? ` • ${animal.sexe === 'male' ? 'Mâle' : animal.sexe === 'femelle' ? 'Femelle' : animal.sexe}`
                              : ''}
                            {animal.reproducteur ? ' • Reprod.' : ''}
                          </Text>
                        </View>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={couleur} />}
                    </TouchableOpacity>
                  );
                });
              })()
            )}
          </ScrollView>
          </View>
        )}

        {/* Boutons */}
        <View style={styles.boutonsContainer}>
          <TouchableOpacity
            style={[
              styles.boutonAnnuler,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => toggleSection(type)}
          >
            <Text style={[styles.boutonAnnulerTexte, { color: colors.text }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.boutonValider, { backgroundColor: couleur }]}
            onPress={handleEnregistrer}
          >
            <Text style={styles.boutonValiderTexte}>
              {vaccinationEnEdition ? 'Modifier' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const toggleHistorique = (type: TypeProphylaxie) => {
    setHistoriqueOuvert((prev) => {
      const nouveau = new Set(prev);
      if (nouveau.has(type)) {
        nouveau.delete(type);
      } else {
        nouveau.add(type);
      }
      return nouveau;
    });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const renderHistorique = (type: TypeProphylaxie, couleur: string) => {
    const vaccinationsType = (vaccinations || [])
      .filter((v) => v.type_prophylaxie === type)
      .sort(
        (a, b) => new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime()
      );

    if (vaccinationsType.length === 0) {
      return (
        <View style={styles.historiqueEmpty}>
          <Text style={[styles.historiqueEmptyText, { color: colors.textSecondary }]}>
            Aucune vaccination enregistrée
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.historiqueContainer}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {vaccinationsType.map((v) => {
          const animalIds = parseAnimalIds(v.animal_ids);
          const animauxVaccines = (animaux || []).filter((a) => animalIds.includes(a.id));

          return (
            <View
              key={v.id}
              style={[
                styles.historiqueItem,
                {
                  backgroundColor: colors.background,
                  borderLeftColor: couleur,
                },
              ]}
            >
              {/* Header avec date */}
              <View style={styles.historiqueItemHeader}>
                <View style={styles.historiqueItemHeaderLeft}>
                  <Ionicons name="calendar" size={14} color={couleur} />
                  <Text style={[styles.historiqueItemDate, { color: colors.text }]}>
                    {format(new Date(v.date_vaccination), 'dd MMM yyyy', { locale: fr })}
                  </Text>
                </View>
                {v.cout && (
                  <Text style={[styles.historiqueItemCout, { color: colors.textSecondary }]}>
                    {v.cout.toLocaleString('fr-FR')} FCFA
                  </Text>
                )}
              </View>

              {/* Produit */}
              <View style={styles.historiqueItemRow}>
                <Ionicons name="flask" size={14} color={couleur} />
                <Text style={[styles.historiqueItemLabel, { color: colors.textSecondary }]}>
                  Produit:
                </Text>
                <Text style={[styles.historiqueItemValue, { color: colors.text }]}>
                  {v.produit_administre || 'Non spécifié'}
                </Text>
              </View>

              {/* Dosage */}
              <View style={styles.historiqueItemRow}>
                <Ionicons name="medical" size={14} color={couleur} />
                <Text style={[styles.historiqueItemLabel, { color: colors.textSecondary }]}>
                  Dosage:
                </Text>
                <Text style={[styles.historiqueItemValue, { color: colors.text }]}>
                  {v.dosage || 'Non spécifié'} {v.unite_dosage || ''}
                </Text>
              </View>

              {/* Animaux vaccinés */}
              <View style={styles.historiqueItemRow}>
                <Ionicons name="paw" size={14} color={couleur} />
                <Text style={[styles.historiqueItemLabel, { color: colors.textSecondary }]}>
                  Animaux ({animauxVaccines.length}):
                </Text>
              </View>
              <View style={styles.historiqueAnimauxList}>
                {animauxVaccines.length > 0 ? (
                  <View style={styles.historiqueAnimauxTags}>
                    {animauxVaccines.map((animal) => {
                      const nom = animal.nom || animal.code || `Animal ${animal.id.slice(0, 6)}`;
                      return (
                        <View
                          key={animal.id}
                          style={[
                            styles.historiqueAnimalTag,
                            { backgroundColor: `${couleur}15`, borderColor: `${couleur}40` },
                          ]}
                        >
                          <Text style={[styles.historiqueAnimalText, { color: couleur }]}>
                            {nom}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.historiqueItemValue, { color: colors.textSecondary }]}>
                    Aucun animal trouvé
                  </Text>
                )}
              </View>

              {/* Boutons Modifier/Supprimer */}
              <View style={[styles.historiqueActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.historiqueActionButton,
                    { backgroundColor: `${couleur}15`, borderColor: couleur },
                  ]}
                  onPress={() => initialiserFormulaireAvecVaccination(v)}
                >
                  <Ionicons name="create-outline" size={16} color={couleur} />
                  <Text style={[styles.historiqueActionText, { color: couleur }]}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.historiqueActionButton,
                    { backgroundColor: `${colors.error}15`, borderColor: colors.error },
                  ]}
                  onPress={() => handleSupprimerVaccination(v.id, type)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text style={[styles.historiqueActionText, { color: colors.error }]}>
                    Supprimer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderCarteType = (stat: StatistiquesProphylaxieParType) => {
    const couleur = getCouleurType(stat.type_prophylaxie);
    const icone = getIconeType(stat.type_prophylaxie);
    const isOuverte = sectionOuverte === stat.type_prophylaxie;
    const isHistoriqueOuvert = historiqueOuvert.has(stat.type_prophylaxie);

    return (
      <View
        key={stat.type_prophylaxie}
        style={[
          styles.carteType,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            ...colors.shadow.small,
          },
        ]}
      >
        {/* Header - Toujours visible */}
        <TouchableOpacity
          style={styles.carteHeader}
          onPress={() => toggleSection(stat.type_prophylaxie)}
          activeOpacity={0.7}
        >
          <View style={styles.carteHeaderLeft}>
            <View style={[styles.iconeBadge, { backgroundColor: `${couleur}20` }]}>
              <Ionicons name={icone} size={24} color={couleur} />
            </View>
            <View style={styles.carteTitreContainer}>
              <Text style={[styles.carteTypeTitre, { color: colors.text }]}>{stat.nom_type}</Text>
              {stat.en_retard > 0 && (
                <View style={[styles.badgeRetard, { backgroundColor: colors.error }]}>
                  <Text style={styles.badgeRetardTexte}>{stat.en_retard} en retard</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name={isOuverte ? 'chevron-up' : 'chevron-down'} size={24} color={couleur} />
        </TouchableOpacity>

        {/* Stats - Toujours visible */}
        <View style={styles.carteStats}>
          <View style={styles.carteStatRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.textSecondary} />
            <Text style={[styles.carteStatTexte, { color: colors.textSecondary }]}>
              {stat.porcs_vaccines} / {stat.total_porcs} porcs vaccinés
            </Text>
          </View>

          {stat.dernier_traitement && (
            <View style={styles.carteStatRow}>
              <Ionicons name="calendar" size={16} color={colors.textSecondary} />
              <Text style={[styles.carteStatTexte, { color: colors.textSecondary }]}>
                Dernier : {new Date(stat.dernier_traitement).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}

          <View style={styles.carteStatRow}>
            <Ionicons name="cash" size={16} color={colors.textSecondary} />
            <Text style={[styles.carteStatTexte, { color: colors.textSecondary }]}>
              Coût : {stat.cout_total.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>

        {/* Barre de progression */}
        <View style={styles.carteProgressContainer}>
          <View style={[styles.carteProgressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.carteProgressFill,
                {
                  backgroundColor: couleur,
                  width: `${stat.taux_couverture}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.carteProgressTexte, { color: colors.textSecondary }]}>
            {stat.taux_couverture}%
          </Text>
        </View>

        {/* Bouton Historique */}
        <TouchableOpacity
          style={[
            styles.boutonHistorique,
            { backgroundColor: `${couleur}10`, borderColor: couleur },
          ]}
          onPress={() => toggleHistorique(stat.type_prophylaxie)}
        >
          <Ionicons name="time-outline" size={18} color={couleur} />
          <Text style={[styles.boutonHistoriqueTexte, { color: couleur }]}>
            {isHistoriqueOuvert ? "Masquer l'historique" : "Voir l'historique"}
          </Text>
          <Ionicons
            name={isHistoriqueOuvert ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={couleur}
          />
        </TouchableOpacity>

        {/* Historique dépliable */}
        {isHistoriqueOuvert && renderHistorique(stat.type_prophylaxie, couleur)}

        {/* Formulaire dépliable */}
        {renderFormulaire(stat.type_prophylaxie, couleur)}

        {/* Bouton calendrier */}
        <TouchableOpacity
          style={[
            styles.boutonCalendrier,
            { backgroundColor: `${couleur}15`, borderColor: couleur },
          ]}
          onPress={() => {
            const calendrierKey: SectionOuverte = `${stat.type_prophylaxie}_calendrier`;
            setSectionOuverte(sectionOuverte === calendrierKey ? null : calendrierKey);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          }}
        >
          <Ionicons name="calendar-outline" size={20} color={couleur} />
          <Text style={[styles.boutonCalendrierTexte, { color: couleur }]}>
            {sectionOuverte === `${stat.type_prophylaxie}_calendrier`
              ? 'Masquer le calendrier'
              : 'Voir le calendrier'}
          </Text>
          <Ionicons
            name={
              sectionOuverte === `${stat.type_prophylaxie}_calendrier`
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={20}
            color={couleur}
          />
        </TouchableOpacity>

        {/* Calendrier dépliable */}
        {sectionOuverte === `${stat.type_prophylaxie}_calendrier` &&
          renderCalendrier(stat.type_prophylaxie, couleur)}
      </View>
    );
  };

  // Fonction utilitaire pour calculer les animaux en retard
  interface AnimalCalendrier {
    animal: any;
    nom: string;
    categorie: string;
    ageJours: number;
    prochainTraitement?: any;
    dernierTraitement?: Vaccination;
    enRetard: boolean;
  }

  const calculerAnimauxCalendrier = useCallback(
    (type: TypeProphylaxie, animauxActifs: any[]): AnimalCalendrier[] => {
      return animauxActifs
        .map((animal) => {
          if (!animal.date_naissance) return null;

          const ageJours = calculerAgeJours(animal.date_naissance);
          const traitementsType = CALENDRIER_VACCINAL_TYPE.filter(
            (cal) => cal.type_prophylaxie === type
          );

          const prochainTraitement = traitementsType.find((traitement) => {
            const aRecuTraitement = (vaccinations || []).some(
              (v) =>
                animalIncludedInVaccination(v.animal_ids, animal.id) &&
                v.type_prophylaxie === traitement.type_prophylaxie &&
                v.statut === 'effectue'
            );
            return !aRecuTraitement && traitement.age_jours <= ageJours + 7;
          });

          const dernierTraitement = (vaccinations || [])
            .filter(
              (v) =>
                animalIncludedInVaccination(v.animal_ids, animal.id) && v.type_prophylaxie === type
            )
            .sort(
              (a, b) =>
                new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime()
            )[0];

          if (!prochainTraitement && !dernierTraitement) return null;

          const nom = animal.nom || animal.code || `Animal ${animal.id.slice(0, 6)}`;
          const categorie = getCategorieAnimal(animal);

          return {
            animal,
            nom,
            categorie,
            ageJours,
            prochainTraitement,
            dernierTraitement,
            enRetard: prochainTraitement && prochainTraitement.age_jours < ageJours,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => {
          // En retard d'abord
          if (a.enRetard && !b.enRetard) return -1;
          if (!a.enRetard && b.enRetard) return 1;
          // Puis par âge décroissant
          return b.ageJours - a.ageJours;
        });
    },
    [vaccinations]
  );

  // Mode individuel : affichage liste plate
  const renderCalendrierIndividuel = (
    type: TypeProphylaxie,
    couleur: string,
    animauxActifs: any[]
  ) => {
    const animauxCalendrier = calculerAnimauxCalendrier(type, animauxActifs);

    return (
      <View
        style={[
          styles.calendrierContainer,
          { backgroundColor: `${couleur}10`, borderColor: couleur },
        ]}
      >
        <Text style={[styles.calendrierTitre, { color: colors.text }]}>
          📅 Calendrier de vaccination - {TYPE_PROPHYLAXIE_LABELS[type]}
        </Text>

        {animauxCalendrier.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun animal nécessitant ce traitement
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.calendrierListe} nestedScrollEnabled>
            {animauxCalendrier.map((item) => (
              <AnimalEnRetardItem
                key={item.animal.id}
                item={item}
                couleur={couleur}
                showVaccinerButton={true}
                onVacciner={(animalId) => {
                  setAnimauxSelectionnes([animalId]);
                  if (item.prochainTraitement) {
                    setProduitAdministre(item.prochainTraitement.nom_traitement);
                    setDosage(item.prochainTraitement.dosage_recommande || '');
                  }
                  toggleSection(type);
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  // Mode bande : affichage groupé par bande
  const renderCalendrierBande = (
    type: TypeProphylaxie,
    couleur: string,
    animauxActifs: any[]
  ) => {
    // Calculer les animaux en retard
    const animauxCalendrier = calculerAnimauxCalendrier(type, animauxActifs);
    const animauxEnRetard = animauxCalendrier.filter((item) => item.enRetard);

    // ✅ CORRECTION: Supprimer useMemo car on est dans une fonction de rendu
    // Les hooks ne peuvent pas être appelés dans des fonctions de rendu régulières
    // Grouper par batch_id
    const grouped: { [batchId: string]: AnimalCalendrier[] } = {};
    const sansBande: AnimalCalendrier[] = [];

    animauxEnRetard.forEach((item) => {
      const batchId = animalBatchMap.get(item.animal.id);
      if (!batchId) {
        sansBande.push(item);
        return;
      }

      if (!grouped[batchId]) {
        grouped[batchId] = [];
      }
      grouped[batchId].push(item);
    });

    const animauxParBande = { grouped, sansBande };

    // Récupérer les informations des bandes
    const bandesAvecRetards = Object.entries(animauxParBande.grouped).map(([batchId, animauxGroupe]) => {
      const batch = batches.find((b) => b.id === batchId);
      return {
        batchId,
        batch: batch || null,
        animaux: animauxGroupe,
        nombreEnRetard: animauxGroupe.length,
      };
    });

    // Trier : bandes avec le plus de retards en premier
    bandesAvecRetards.sort((a, b) => b.nombreEnRetard - a.nombreEnRetard);

    return (
      <View
        style={[
          styles.calendrierContainer,
          { backgroundColor: `${couleur}10`, borderColor: couleur },
        ]}
      >
        <Text style={[styles.calendrierTitre, { color: colors.text }]}>
          📅 Calendrier de vaccination - {TYPE_PROPHYLAXIE_LABELS[type]}
        </Text>

        {bandesAvecRetards.length === 0 && animauxParBande.sansBande.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun sujet en retard pour ce traitement
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.calendrierListe} nestedScrollEnabled>
            {/* Afficher les bandes avec retards */}
            {bandesAvecRetards.map((bandeData) => (
              <BandeEnRetardGroup
                key={bandeData.batchId}
                bandeData={bandeData}
                type={type}
                couleur={couleur}
                onVaccinerBande={(batchId, animauxIds) => {
                  const batch = batches.find((b) => b.id === batchId);
                  setSelectedBatch(batch || null);
                  setNombreSujetsVaccines(animauxIds.length.toString());
                  toggleSection(type);
                }}
              />
            ))}

            {/* Afficher les animaux sans bande */}
            {animauxParBande.sansBande.length > 0 && (
              <AnimauxSansBandeGroup
                animaux={animauxParBande.sansBande}
                type={type}
                couleur={couleur}
                onVaccinerAnimal={(animalId) => {
                  setAnimauxSelectionnes([animalId]);
                  toggleSection(type);
                }}
              />
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  // Fonction principale adaptative
  const renderCalendrier = (type: TypeProphylaxie, couleur: string) => {
    const animauxActifs = (animaux || []).filter((a) => a.statut === 'actif');

    if (isModeBatch) {
      return renderCalendrierBande(type, couleur, animauxActifs);
    } else {
      return renderCalendrierIndividuel(type, couleur, animauxActifs);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {renderCarteRecapitulative()}

      {statParType.map((stat) => renderCarteType(stat))}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },

  // Carte récap - Style harmonisé avec l'app
  carteRecap: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    // Utilise colors.shadow.medium depuis le composant
  },
  headerRecap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  titreRecap: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  btnConfigRappels: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  btnConfigRappelsText: {
    color: '#fff',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
  },
  progressContainer: {
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: BORDER_RADIUS.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.xs,
  },
  alerteRetard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
  },
  alerteTexte: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Carte type - Style harmonisé
  carteType: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    // Utilise colors.shadow.small depuis le composant
  },
  carteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  carteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconeBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carteTitreContainer: {
    marginLeft: 12,
    flex: 1,
  },
  carteTypeTitre: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeRetard: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRetardTexte: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  carteStats: {
    marginBottom: 12,
  },
  carteStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  carteStatTexte: {
    fontSize: 13,
    marginLeft: 8,
  },
  carteProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  carteProgressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  carteProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  carteProgressTexte: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },

  // Formulaire - Style harmonisé
  formulaire: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  modeEditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  modeEditionText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  formHint: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  dosageRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dosageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  uniteContainer: {
    width: 60,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uniteTexte: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  compteur: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  rechercheContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  rechercheInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  listeAnimaux: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    maxHeight: 250,
  },
  emptyState: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
  },
  animalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xs,
    marginBottom: 6,
    borderWidth: 1,
  },
  animalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  animalNom: {
    fontSize: 14,
    fontWeight: '500',
  },
  animalDetails: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  boutonsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  boutonAnnuler: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  boutonAnnulerTexte: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  boutonValider: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  boutonValiderTexte: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  bottomSpacer: {
    height: SPACING.xl,
  },

  // Calendrier - Style harmonisé
  boutonCalendrier: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  boutonCalendrierTexte: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginHorizontal: SPACING.sm,
  },
  calendrierContainer: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  calendrierTitre: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  calendrierListe: {
    maxHeight: 300,
  },
  calendrierItem: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    // Utilise colors.shadow.small depuis le composant
  },
  calendrierItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  calendrierItemNom: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  calendrierItemDetails: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  calendrierItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  calendrierItemTexte: {
    fontSize: FONT_SIZES.sm,
    marginLeft: 6,
  },
  boutonVaccinerMaintenant: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xs,
    marginTop: SPACING.sm,
  },
  boutonVaccinerMaintenantTexte: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 6,
  },

  // Historique - Style compact et esthétique
  boutonHistorique: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  boutonHistoriqueTexte: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  historiqueContainer: {
    marginTop: SPACING.sm,
    maxHeight: 400,
  },
  historiqueEmpty: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  historiqueEmptyText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  historiqueItem: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    marginBottom: SPACING.xs,
    gap: SPACING.xs / 2,
  },
  historiqueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs / 2,
  },
  historiqueItemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  historiqueItemDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  historiqueItemCout: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  historiqueItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  historiqueItemLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  historiqueItemValue: {
    fontSize: FONT_SIZES.xs,
    flex: 1,
  },
  historiqueAnimauxList: {
    marginTop: SPACING.xs / 2,
    paddingLeft: 20, // Align with icon
  },
  historiqueAnimauxTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs / 2,
  },
  historiqueAnimalTag: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
  },
  historiqueAnimalText: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
  },
  historiqueActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  historiqueActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    gap: SPACING.xs / 2,
  },
  historiqueActionText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  // Mode batch - Informations de la bande sélectionnée
  batchSelectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  batchSelectedName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  batchSelectedMeta: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
});
