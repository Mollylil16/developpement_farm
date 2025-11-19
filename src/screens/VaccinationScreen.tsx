/**
 * VaccinationScreen - Refonte complète du module Vaccination
 * Interface moderne avec cartes par type de prophylaxie
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  selectAllVaccinations,
  selectSanteStatistics,
} from '../store/selectors/santeSelectors';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { loadVaccinations } from '../store/slices/santeSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';
import {
  TypeProphylaxie,
  TYPE_PROPHYLAXIE_LABELS,
  StatistiquesProphylaxieParType,
  calculerAgeJours,
  CALENDRIER_VACCINAL_TYPE,
} from '../types/sante';
import VaccinationFormModal from '../components/VaccinationFormModal';
import CalendrierVaccinalModal from '../components/CalendrierVaccinalModal';

const { width } = Dimensions.get('window');

export default function VaccinationScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const vaccinations = useAppSelector((state) => selectAllVaccinations(state));
  const animaux = useAppSelector((state) => selectAllAnimaux(state));
  const statistics = useAppSelector((state) => selectSanteStatistics(state));
  const loading = useAppSelector((state) => state.sante.loading.vaccinations);

  const [refreshing, setRefreshing] = useState(false);
  const [modalAddVisible, setModalAddVisible] = useState(false);
  const [modalCalendrierVisible, setModalCalendrierVisible] = useState(false);
  const [typeSelectionne, setTypeSelectionne] = useState<TypeProphylaxie | null>(null);

  // Charger les données au montage
  useEffect(() => {
    if (projetActif?.id) {
      chargerDonnees();
    }
  }, [projetActif?.id]);

  const chargerDonnees = async () => {
    if (!projetActif?.id) return;

    try {
      await Promise.all([
        dispatch(loadVaccinations(projetActif.id)).unwrap(),
        dispatch(loadProductionAnimaux(projetActif.id)).unwrap(),
      ]);
    } catch (error) {
      console.error('Erreur chargement données vaccination:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await chargerDonnees();
    setRefreshing(false);
  };

  // Calculer les statistiques globales de prophylaxie
  const statsGlobales = useMemo(() => {
    const totalAnimaux = (animaux || []).filter((a) => a.statut === 'actif').length;
    const totalVaccinations = (vaccinations || []).length;

    // Calculer les sujets uniques en retard (ceux qui ont au moins un traitement obligatoire manquant)
    const porcsEnRetardSet = new Set<string>();

    (animaux || []).forEach((animal) => {
      if (animal.statut !== 'actif' || !animal.date_naissance) return;

      const ageJours = calculerAgeJours(animal.date_naissance);
      
      // Vérifier si le porc devrait avoir reçu des traitements obligatoires
      const traitementsObligatoires = CALENDRIER_VACCINAL_TYPE.filter(
        (cal) => cal.obligatoire && cal.age_jours <= ageJours
      );

      // Si l'animal a au moins un traitement obligatoire manquant, il est en retard
      const aAuMoinsUnTraitementManquant = traitementsObligatoires.some((traitement) => {
        const aRecuTraitement = (vaccinations || []).some(
          (v) =>
            v.animal_ids?.includes(animal.id) &&
            v.type_prophylaxie === traitement.type_prophylaxie &&
            v.statut === 'effectue'
        );
        return !aRecuTraitement;
      });

      if (aAuMoinsUnTraitementManquant) {
        porcsEnRetardSet.add(animal.id);
      }
    });

    const porcsEnRetard = porcsEnRetardSet.size;

    // Calculer le taux de couverture (simplifié)
    const tauxCouverture = totalAnimaux > 0
      ? Math.round(((totalAnimaux - porcsEnRetard) / totalAnimaux) * 100)
      : 0;

    return {
      totalAnimaux,
      totalVaccinations,
      porcsEnRetard,
      tauxCouverture,
    };
  }, [animaux, vaccinations]);

  // Calculer les statistiques par type de prophylaxie
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
      const vaccinationsType = (vaccinations || []).filter(
        (v) => v.type_prophylaxie === type
      );

      // Compter les porcs uniques vaccinés pour ce type
      const porcsVaccinesSet = new Set<string>();
      vaccinationsType.forEach((v) => {
        v.animal_ids?.forEach((id) => porcsVaccinesSet.add(id));
      });

      const porcsVaccines = porcsVaccinesSet.size;
      const totalPorcs = statsGlobales.totalAnimaux;
      const tauxCouverture = totalPorcs > 0
        ? Math.round((porcsVaccines / totalPorcs) * 100)
        : 0;

      // Trouver la dernière vaccination
      const dernierTraitement = vaccinationsType
        .sort((a, b) => new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime())
        [0]?.date_vaccination;

      // Calculer le coût total
      const coutTotal = vaccinationsType.reduce((sum, v) => sum + (v.cout || 0), 0);

      // Compter les sujets uniques en retard (pas le nombre de traitements manquants)
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
              v.animal_ids?.includes(animal.id) &&
              v.type_prophylaxie === type &&
              v.statut === 'effectue'
          );
          return !aRecuTraitement;
        });

        if (aAuMoinsUnTraitementManquant) {
          porcsEnRetardSet.add(animal.id);
        }
      });

      const enRetard = porcsEnRetardSet.size;

      return {
        type_prophylaxie: type,
        nom_type: TYPE_PROPHYLAXIE_LABELS[type],
        total_vaccinations: vaccinationsType.length,
        porcs_vaccines: porcsVaccines,
        total_porcs: totalPorcs,
        taux_couverture: tauxCouverture,
        dernier_traitement: dernierTraitement,
        cout_total: coutTotal,
        en_retard: enRetard,
      };
    });
  }, [vaccinations, animaux, statsGlobales.totalAnimaux]);

  // Icônes par type de prophylaxie
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

  // Couleurs par type
  const getCouleurType = (type: TypeProphylaxie): string => {
    switch (type) {
      case 'vitamine':
        return '#FFA726'; // Orange
      case 'deparasitant':
        return '#AB47BC'; // Violet
      case 'fer':
        return '#EF5350'; // Rouge
      case 'antibiotique_preventif':
        return '#42A5F5'; // Bleu
      case 'vaccin_obligatoire':
        return '#66BB6A'; // Vert
      case 'autre_traitement':
        return '#78909C'; // Gris-bleu
      default:
        return colors.primary;
    }
  };

  const handleOuvrirModalAjout = (type: TypeProphylaxie) => {
    setTypeSelectionne(type);
    setModalAddVisible(true);
  };

  const handleOuvrirCalendrier = (type: TypeProphylaxie) => {
    setTypeSelectionne(type);
    setModalCalendrierVisible(true);
  };

  // Render de la carte récapitulative
  const renderCarteRecapitulative = () => {
    return (
      <View style={[styles.carteRecap, { backgroundColor: colors.card }]}>
        <View style={styles.headerRecap}>
          <Ionicons name="stats-chart" size={24} color={colors.primary} />
          <Text style={[styles.titreRecap, { color: colors.text }]}>
            Aperçu Prophylaxie
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {statsGlobales.totalAnimaux}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Porcs actifs
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {statsGlobales.totalVaccinations}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Traitements
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: statsGlobales.porcsEnRetard > 5 ? colors.error : colors.warning }]}>
              {statsGlobales.porcsEnRetard}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              En retard
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {statsGlobales.tauxCouverture}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Couverture
            </Text>
          </View>
        </View>

        {/* Barre de progression */}
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

        {/* Alerte si retards */}
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

  // Render d'une carte de type de prophylaxie
  const renderCarteType = (stat: StatistiquesProphylaxieParType) => {
    const couleur = getCouleurType(stat.type_prophylaxie);
    const icone = getIconeType(stat.type_prophylaxie);

    return (
      <View
        key={stat.type_prophylaxie}
        style={[styles.carteType, { backgroundColor: colors.card }]}
      >
        {/* Header */}
        <View style={styles.carteHeader}>
          <View style={styles.carteHeaderLeft}>
            <View style={[styles.iconeBadge, { backgroundColor: `${couleur}20` }]}>
              <Ionicons name={icone} size={24} color={couleur} />
            </View>
            <View style={styles.carteTitreContainer}>
              <Text style={[styles.carteTypeTitre, { color: colors.text }]}>
                {stat.nom_type}
              </Text>
              {stat.en_retard > 0 && (
                <View style={[styles.badgeRetard, { backgroundColor: colors.error }]}>
                  <Text style={styles.badgeRetardTexte}>
                    {stat.en_retard} en retard
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.badgeCount, { backgroundColor: `${couleur}20` }]}>
            <Text style={[styles.badgeCountTexte, { color: couleur }]}>
              {stat.porcs_vaccines}
            </Text>
          </View>
        </View>

        {/* Stats */}
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

        {/* Boutons d'action */}
        <View style={styles.carteBoutons}>
          <TouchableOpacity
            style={[styles.boutonPrimaire, { backgroundColor: couleur }]}
            onPress={() => handleOuvrirModalAjout(stat.type_prophylaxie)}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.boutonPrimaireTexte}>Ajouter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.boutonSecondaire, { borderColor: couleur }]}
            onPress={() => handleOuvrirCalendrier(stat.type_prophylaxie)}
          >
            <Ionicons name="list" size={20} color={couleur} />
            <Text style={[styles.boutonSecondaireTexte, { color: couleur }]}>
              Calendrier
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Prophylaxie & Vaccination
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Gestion complète des traitements préventifs
          </Text>
        </View>

        {/* Carte récapitulative */}
        {renderCarteRecapitulative()}

        {/* Titre section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Par type de traitement
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {statParType.length} catégories disponibles
          </Text>
        </View>

        {/* Cartes par type */}
        {statParType.map((stat) => renderCarteType(stat))}

        {/* Espace en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal d'ajout de vaccination */}
      {modalAddVisible && typeSelectionne && (
        <VaccinationFormModal
          visible={modalAddVisible}
          onClose={() => {
            setModalAddVisible(false);
            setTypeSelectionne(null);
          }}
          typeProphylaxieParDefaut={typeSelectionne}
        />
      )}

      {/* Modal du calendrier vaccinal */}
      {modalCalendrierVisible && typeSelectionne && (
        <CalendrierVaccinalModal
          visible={modalCalendrierVisible}
          onClose={() => {
            setModalCalendrierVisible(false);
            setTypeSelectionne(null);
          }}
          typeProphylaxie={typeSelectionne}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },

  // Carte récapitulative
  carteRecap: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRecap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  titreRecap: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  alerteRetard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  alerteTexte: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },

  // Section header
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
  },

  // Carte type
  carteType: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  badgeCount: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeCountTexte: {
    fontSize: 16,
    fontWeight: 'bold',
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
  carteBoutons: {
    flexDirection: 'row',
    gap: 12,
  },
  boutonPrimaire: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  boutonPrimaireTexte: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  boutonSecondaire: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 8,
  },
  boutonSecondaireTexte: {
    fontSize: 14,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 32,
  },
});

