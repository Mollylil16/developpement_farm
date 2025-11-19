/**
 * MaladiesComponentNew - Version simplifiée avec liaison auto vaccination
 * Carte récapitulative + Formulaire d'ajout de cas de maladie
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControlProps,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import {
  TypeMaladie,
  TYPE_MALADIE_LABELS,
  CreateMaladieInput,
  TRAITEMENT_TO_PROPHYLAXIE_MAPPING,
  TypeProphylaxie,
  CreateVaccinationInput,
} from '../types/sante';
import { selectAllMaladies } from '../store/selectors/santeSelectors';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { createMaladie, loadMaladies, createVaccination } from '../store/slices/santeSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import { getCurrentLocalDate } from '../utils/dateUtils';
import { getCategorieAnimal } from '../utils/animalUtils';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export default function MaladiesComponentNew({ refreshControl }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const maladies = useAppSelector((state) => selectAllMaladies(state));
  const animaux = useAppSelector((state) => selectAllAnimaux(state));

  // États du formulaire
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [animalSelectionne, setAnimalSelectionne] = useState<string>('');
  const [typeMaladie, setTypeMaladie] = useState<TypeMaladie>('diarrhee');
  const [symptomes, setSymptomes] = useState('');
  const [traitementAdministre, setTraitementAdministre] = useState('');
  const [produitUtilise, setProduitUtilise] = useState('');
  const [dosage, setDosage] = useState('');
  const [rechercheAnimal, setRechercheAnimal] = useState('');

  // Charger les données
  useEffect(() => {
    if (projetActif?.id) {
      dispatch(loadMaladies(projetActif.id));
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: false }));
    }
  }, [projetActif?.id, dispatch]);

  // Calculer les stats
  const stats = useMemo(() => {
    const animauxActifs = (animaux || []).filter((a) => a.statut === 'actif');
    const totalActifs = animauxActifs.length;

    // Maladies en cours (non guéries)
    const maladiesEnCours = (maladies || []).filter((m) => !m.gueri);
    
    // IDs uniques des animaux malades
    const animauxMaladesSet = new Set<string>();
    maladiesEnCours.forEach((m) => {
      if (m.animal_id) {
        animauxMaladesSet.add(m.animal_id);
      }
    });

    const porcsMalades = animauxMaladesSet.size;
    const tauxMaladie = totalActifs > 0 ? (porcsMalades / totalActifs) * 100 : 0;

    // Couleur du badge selon sévérité (calculée séparément pour éviter la dépendance colors)
    let badgeSeverity: 'success' | 'warning' | 'error' = 'success';
    if (tauxMaladie > 15) badgeSeverity = 'error';
    else if (tauxMaladie > 5) badgeSeverity = 'warning';

    // Maladies récurrentes (top 5 des 3 derniers mois)
    const troismoisAgo = new Date();
    troismoisAgo.setMonth(troismoisAgo.getMonth() - 3);

    const maladiesRecentes = (maladies || []).filter(
      (m) => new Date(m.date_debut) >= troismoisAgo
    );

    const countByType: Record<string, number> = {};
    maladiesRecentes.forEach((m) => {
      countByType[m.type] = (countByType[m.type] || 0) + 1;
    });

    const maladiesRecurrentes = Object.entries(countByType)
      .map(([type, count]) => ({
        type: type as TypeMaladie,
        nom: TYPE_MALADIE_LABELS[type as TypeMaladie],
        count,
        pourcentage: maladiesRecentes.length > 0 ? (count / maladiesRecentes.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recommandations pointues basées sur les maladies reportées
    const suggestions: string[] = [];
    
    // Analyse du taux de maladie
    if (tauxMaladie > 15) {
      suggestions.push('🚨 URGENT: Taux de maladie critique (>15%) - Isoler les sujets malades immédiatement');
      suggestions.push('🔬 Faire appel au vétérinaire pour diagnostic approfondi et plan d\'action');
    } else if (tauxMaladie > 10) {
      suggestions.push('⚠️ Taux de maladie élevé - Renforcer désinfection quotidienne des loges');
      suggestions.push('👥 Limiter les déplacements d\'animaux entre les zones');
    } else if (tauxMaladie > 5) {
      suggestions.push('⚡ Surveillance accrue - Contrôler température et hygrométrie 2x/jour');
    }

    // Analyse des maladies récurrentes (top 3)
    maladiesRecurrentes.slice(0, 3).forEach((maladie, index) => {
      const isTop = index === 0;
      
      switch (maladie.type) {
        case 'respiratoire':
          if (isTop) {
            suggestions.push('🌬️ Infections respiratoires dominantes - Vérifier ventilation et taux d\'ammoniac');
            suggestions.push('🌡️ Maintenir température stable (18-22°C) et éviter les courants d\'air');
    }
          if (maladie.count >= 3) {
            suggestions.push('💉 Envisager vaccination préventive contre les pathogènes respiratoires');
          }
          break;
          
        case 'diarrhee':
          if (isTop) {
            suggestions.push('💧 Diarrhées récurrentes - Analyser la qualité de l\'eau (pH, bactéries)');
            suggestions.push('🌾 Vérifier composition alimentaire et fraîcheur des aliments');
    }
          if (maladie.count >= 3) {
            suggestions.push('🦠 Risque parasitaire - Planifier déparasitage tous les porcs');
          }
          break;
          
        case 'cutanee':
          if (isTop) {
            suggestions.push('🧴 Infections cutanées fréquentes - Augmenter fréquence de nettoyage des aires de repos');
            suggestions.push('🛁 Traiter les surfaces avec désinfectant adapté (iode ou chlorhexidine)');
          }
          break;
          
        case 'gale_parasites':
          if (isTop) {
            suggestions.push('🪲 Parasites détectés - Traitement antiparasitaire OBLIGATOIRE de tout le cheptel');
            suggestions.push('🧹 Nettoyer et désinfecter toutes les installations à fond');
          }
          if (maladie.count >= 2) {
            suggestions.push('🔄 Renouveler traitement antiparasitaire après 14 jours (cycle de vie parasites)');
          }
          break;
          
        case 'boiterie':
          if (isTop) {
            suggestions.push('🦶 Boiteries récurrentes - Inspecter sols (arêtes vives, humidité excessive)');
            suggestions.push('🔧 Améliorer caillebotis et ajouter litière dans zones de repos');
          }
          break;
          
        case 'autre':
          if (isTop && maladie.count >= 2) {
            suggestions.push('🔍 Maladies non classifiées fréquentes - Consulter vétérinaire pour identification');
          }
          break;
      }
    });

    // Alerte contagion
    const maladiesContagieuses = (maladies || []).filter(m => m.contagieux && !m.gueri);
    if (maladiesContagieuses.length >= 3) {
      suggestions.push('🔴 ALERTE CONTAGION: 3+ maladies contagieuses - Quarantaine stricte requise');
    } else if (maladiesContagieuses.length >= 2) {
      suggestions.push('🟡 Risque de propagation - Isoler sujets contagieux et désinfecter matériel');
    }

    // Maladies critiques
    const maladiesCritiques = (maladies || []).filter(m => m.gravite === 'critique' && !m.gueri);
    if (maladiesCritiques.length > 0) {
      suggestions.push(`⚠️ ${maladiesCritiques.length} cas critique(s) - Suivi quotidien et traitement intensif`);
    }

    // Situation saine
    if (suggestions.length === 0) {
      suggestions.push('✅ Situation sanitaire excellente - Maintenir protocole de biosécurité');
      suggestions.push('📋 Continuer visites préventives et vaccinations selon calendrier');
    }

    return {
      totalActifs,
      porcsMalades,
      tauxMaladie,
      badgeSeverity,
      maladiesRecurrentes,
      suggestions,
    };
  }, [animaux, maladies]);

  // Convertir badgeSeverity en couleur
  const getBadgeColor = (severity: 'success' | 'warning' | 'error') => {
    switch (severity) {
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'error': return colors.error;
    }
  };

  // Toggle formulaire
  const toggleFormulaire = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFormulaireOuvert(!formulaireOuvert);
    
    if (formulaireOuvert) {
      // Réinitialiser le formulaire
      setAnimalSelectionne('');
      setTypeMaladie('diarrhee');
      setSymptomes('');
      setTraitementAdministre('');
      setProduitUtilise('');
      setDosage('');
      setRechercheAnimal('');
    }
  };

  // Détecte si le traitement correspond à un type de prophylaxie
  const detecterTypeProphylaxie = useCallback((produit: string): TypeProphylaxie | null => {
    const produitLower = produit.toLowerCase();
    
    for (const [keyword, type] of Object.entries(TRAITEMENT_TO_PROPHYLAXIE_MAPPING)) {
      if (produitLower.includes(keyword.toLowerCase())) {
        return type;
      }
    }
    
    return null;
  }, []);

  // Enregistrer le cas de maladie
  const handleEnregistrer = async () => {
    // Validation
    if (!animalSelectionne) {
      Alert.alert('Erreur', 'Veuillez sélectionner un animal');
      return;
    }
    if (!symptomes.trim()) {
      Alert.alert('Erreur', 'Veuillez décrire les symptômes');
      return;
    }

    if (!projetActif?.id) return;

    try {
      // Créer le cas de maladie
      const inputMaladie: CreateMaladieInput = {
        projet_id: projetActif.id,
        animal_id: animalSelectionne,
        type: typeMaladie,
        nom_maladie: TYPE_MALADIE_LABELS[typeMaladie],
        gravite: 'moderee',
        date_debut: getCurrentLocalDate(),
        symptomes: symptomes.trim(),
        contagieux: false,
        gueri: false,
        notes: traitementAdministre.trim() || undefined,
      };

      await dispatch(createMaladie(inputMaladie)).unwrap();

      // Liaison automatique avec vaccination si applicable
      let vaccinationLiee = false;
      if (produitUtilise.trim()) {
        const typeProphylaxie = detecterTypeProphylaxie(produitUtilise);
        
        if (typeProphylaxie) {
          try {
            const inputVaccination: CreateVaccinationInput = {
              projet_id: projetActif.id,
              animal_ids: [animalSelectionne],
              type_prophylaxie: typeProphylaxie,
              produit_administre: produitUtilise.trim(),
              date_vaccination: getCurrentLocalDate(),
              dosage: dosage.trim() || 'Non spécifié',
              raison_traitement: 'traitement_curatif',
              statut: 'effectue',
              notes: `Traitement suite à ${TYPE_MALADIE_LABELS[typeMaladie]}`,
            };

            await dispatch(createVaccination(inputVaccination)).unwrap();
            vaccinationLiee = true;
          } catch (error) {
            console.error('Erreur liaison vaccination:', error);
          }
        }
      }

      // Message de succès
      const message = vaccinationLiee
        ? `Cas enregistré avec succès !\n\n✅ Le traitement a été automatiquement ajouté aux statistiques de vaccination.`
        : 'Cas de maladie enregistré avec succès !';

      Alert.alert('Succès', message);

      // Fermer le formulaire
      toggleFormulaire();
    } catch (error: any) {
      console.error('Erreur enregistrement:', error);
      Alert.alert('Erreur', `Impossible d'enregistrer le cas de maladie:\n${error?.message || error}`);
    }
  };

  // Filtrer les animaux selon la recherche
  const animauxFiltres = useMemo(() => {
    const actifs = (animaux || []).filter((a) => a.statut === 'actif');
    
    if (!rechercheAnimal) return actifs;
    
    const searchLower = rechercheAnimal.toLowerCase();
    return actifs.filter((animal) => {
      const nom = (animal.nom || '').toLowerCase();
      const code = (animal.code || '').toLowerCase();
      const categorie = getCategorieAnimal(animal).toLowerCase();
      return nom.includes(searchLower) || code.includes(searchLower) || categorie.includes(searchLower);
    });
  }, [animaux, rechercheAnimal]);

  // Render carte récapitulative
  const renderCarteOverview = () => {
    return (
      <View style={[styles.carteOverview, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...colors.shadow.medium }]}>
        <View style={styles.overviewHeader}>
          <Ionicons name="fitness" size={24} color={colors.primary} />
          <Text style={[styles.overviewTitre, { color: colors.text }]}>
            État Sanitaire de la Ferme
          </Text>
        </View>

        {/* Stat principale */}
        <View style={styles.statPrincipale}>
          <Text style={[styles.statValue, { color: getBadgeColor(stats.badgeSeverity) }]}>
            {stats.tauxMaladie.toFixed(1)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            de porcs malades ({stats.porcsMalades} / {stats.totalActifs})
          </Text>
          <View style={[styles.badge, { backgroundColor: getBadgeColor(stats.badgeSeverity) }]}>
            <Text style={styles.badgeText}>
              {stats.tauxMaladie < 5 ? 'BON' : stats.tauxMaladie < 15 ? 'ATTENTION' : 'CRITIQUE'}
            </Text>
          </View>
        </View>

        {/* Maladies récurrentes */}
        {stats.maladiesRecurrentes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitre, { color: colors.text }]}>
              📊 Maladies récurrentes (3 derniers mois)
            </Text>
            
            {/* Graphique en camembert */}
            <View style={styles.chartContainer}>
              <PieChart
                data={stats.maladiesRecurrentes.map((maladie, index) => ({
                  name: maladie.nom,
                  population: maladie.count,
                  color: [
                    '#FF6B6B', // Rouge
                    '#4ECDC4', // Turquoise
                    '#FFE66D', // Jaune
                    '#95E1D3', // Vert clair
                    '#A8E6CF', // Vert menthe
                  ][index % 5],
                  legendFontColor: colors.text,
                  legendFontSize: 12,
                }))}
                width={Dimensions.get('window').width - SPACING.lg * 4}
                height={180}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => colors.text,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={false}
              />
            </View>

            {/* Liste avec légende colorée */}
            <View style={styles.legendeContainer}>
              {stats.maladiesRecurrentes.map((maladie, index) => {
                const couleur = [
                  '#FF6B6B',
                  '#4ECDC4',
                  '#FFE66D',
                  '#95E1D3',
                  '#A8E6CF',
                ][index % 5];
                
                return (
                  <View key={maladie.type} style={styles.legendeItem}>
                    <View style={[styles.legendeDot, { backgroundColor: couleur }]} />
                    <Text style={[styles.legendeNom, { color: colors.text }]}>
                      {maladie.nom}
                </Text>
                    <Text style={[styles.legendeCount, { color: colors.textSecondary }]}>
                  {maladie.count} cas ({maladie.pourcentage.toFixed(0)}%)
                </Text>
              </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Suggestions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitre, { color: colors.text }]}>
            💡 Points d'attention
          </Text>
          {stats.suggestions.map((suggestion, index) => (
            <Text key={index} style={[styles.suggestion, { color: colors.textSecondary }]}>
              • {suggestion}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  // Render carte formulaire
  const renderCarteFormulaire = () => {
    return (
      <View style={[styles.carteFormulaire, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...colors.shadow.small }]}>
        <TouchableOpacity
          style={styles.formulaireHeader}
          onPress={toggleFormulaire}
          activeOpacity={0.8}
        >
          <View style={styles.formulaireHeaderLeft}>
            <Ionicons name="medkit" size={24} color={colors.primary} />
            <Text style={[styles.formulaireTitre, { color: colors.text }]}>
              Enregistrer un Cas de Maladie
            </Text>
          </View>
          <Ionicons
            name={formulaireOuvert ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>

        {!formulaireOuvert && (
          <TouchableOpacity
            style={[styles.boutonAjouter, { backgroundColor: colors.primary }]}
            onPress={toggleFormulaire}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.boutonAjouterTexte}>Ajouter un cas</Text>
          </TouchableOpacity>
        )}

        {formulaireOuvert && (
          <View style={styles.formulaireContent}>
            {/* Sélection du sujet */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Sujet malade <Text style={{ color: colors.error }}>*</Text>
              </Text>

              {/* Barre de recherche */}
              <View style={[styles.rechercheContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.rechercheInput, { color: colors.text }]}
                  placeholder="Rechercher un animal..."
                  placeholderTextColor={colors.textSecondary}
                  value={rechercheAnimal}
                  onChangeText={setRechercheAnimal}
                />
              </View>

              {/* Liste des animaux */}
              <ScrollView style={[styles.listeAnimaux, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled>
                {animauxFiltres.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Aucun animal trouvé
                    </Text>
                  </View>
                ) : (
                  animauxFiltres.map((animal) => {
                    const isSelected = animalSelectionne === animal.id;
                    const nom = animal.nom || animal.code || `Porc #${animal.id.slice(0, 8)}`;
                    const categorie = getCategorieAnimal(animal);
                    
                    return (
                      <TouchableOpacity
                        key={animal.id}
                        style={[
                          styles.animalItem,
                          {
                            backgroundColor: isSelected ? `${colors.primary}15` : 'transparent',
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setAnimalSelectionne(animal.id)}
                      >
                        <View style={styles.animalItemLeft}>
                          <View style={[styles.checkbox, isSelected && { backgroundColor: colors.primary }]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.animalNom, { color: colors.text }]} numberOfLines={1}>
                              {nom}
                            </Text>
                            <Text style={[styles.animalDetails, { color: colors.textSecondary }]}>
                              {categorie}
                              {animal.code && ` • ${animal.code}`}
                              {animal.sexe && ` • ${animal.sexe}`}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {/* Type de maladie */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Type de maladie <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesList}>
                {(Object.entries(TYPE_MALADIE_LABELS) as [TypeMaladie, string][]).map(([type, label]) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: typeMaladie === type ? colors.primary : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setTypeMaladie(type)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: typeMaladie === type ? '#FFF' : colors.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Symptômes */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Symptômes <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={symptomes}
                onChangeText={setSymptomes}
                placeholder="Décrire les symptômes observés..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Traitement administré */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Traitement administré (optionnel)
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={traitementAdministre}
                onChangeText={setTraitementAdministre}
                placeholder="Description du traitement..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Produit utilisé */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Produit utilisé
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={produitUtilise}
                onChangeText={setProduitUtilise}
                placeholder="Ex: Antibiotique, Déparasitant..."
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                💡 Si le produit correspond à un type de vaccination, il sera automatiquement ajouté aux stats
              </Text>
            </View>

            {/* Dosage */}
            {produitUtilise.trim() !== '' && (
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Dosage
                </Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={dosage}
                  onChangeText={setDosage}
                  placeholder="Ex: 2ml, 1 comprimé..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}

            {/* Boutons */}
            <View style={styles.boutonsContainer}>
              <TouchableOpacity
                style={[styles.boutonAnnuler, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={toggleFormulaire}
              >
                <Text style={[styles.boutonAnnulerTexte, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.boutonValider, { backgroundColor: colors.primary }]}
                onPress={handleEnregistrer}
              >
                <Text style={styles.boutonValiderTexte}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={true}
    >
      {renderCarteOverview()}
      {renderCarteFormulaire()}
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
    paddingBottom: 100,
  },

  // Carte overview
  carteOverview: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  overviewTitre: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  statPrincipale: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  statValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  badge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  badgeText: {
    color: '#FFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  section: {
    marginTop: SPACING.md,
  },
  sectionTitre: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  maladieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  maladieNom: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  maladieCount: {
    fontSize: FONT_SIZES.sm,
  },
  suggestion: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  
  // Graphique et légende
  chartContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  legendeContainer: {
    marginTop: SPACING.sm,
  },
  legendeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  legendeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendeNom: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  legendeCount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // Carte formulaire
  carteFormulaire: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  formulaireHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formulaireHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  formulaireTitre: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  boutonAjouter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.md,
  },
  boutonAjouterTexte: {
    color: '#FFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  formulaireContent: {
    marginTop: SPACING.md,
  },

  // Formulaire
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
  textArea: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
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
    maxHeight: 200,
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
    marginRight: SPACING.sm,
  },
  animalNom: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  animalDetails: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  typesList: {
    marginVertical: SPACING.xs,
  },
  typeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginRight: SPACING.sm,
  },
  typeChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  boutonsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
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
});

