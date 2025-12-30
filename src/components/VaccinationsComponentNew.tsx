/**
 * VaccinationsComponentNew - Version composant pour intégration dans SanteScreen
 * Interface refonte avec cartes par type de prophylaxie
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  RefreshControlProps,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectAllVaccinations } from '../store/selectors/santeSelectors';
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
import VaccinationFormModalNew from './VaccinationFormModalNew';
import CalendrierVaccinalModal from './CalendrierVaccinalModal';

const { width } = Dimensions.get('window');

interface Props {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export default function VaccinationsComponentNew({ refreshControl }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const vaccinations = useAppSelector((state) => selectAllVaccinations(state));
  const animaux = useAppSelector((state) => selectAllAnimaux(state));

  const [modalAddVisible, setModalAddVisible] = useState(false);
  const [modalCalendrierVisible, setModalCalendrierVisible] = useState(false);
  const [typeSelectionne, setTypeSelectionne] = useState<TypeProphylaxie | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Charger les données au montage
  useEffect(() => {
    if (projetActif?.id) {
      dispatch(loadVaccinations(projetActif.id));
      // Inclure les inactifs pour avoir tous les animaux (actif et autre statuts)
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true }));
    }
  }, [projetActif?.id, dispatch]);

  // Calculer les statistiques globales
  const statsGlobales = useMemo(() => {
    const totalAnimaux = (animaux || []).filter((a) => a.statut === 'actif').length;
    const totalVaccinations = (vaccinations || []).length;

    // Compter les sujets uniques en retard
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

    const tauxCouverture =
      totalAnimaux > 0 ? Math.round(((totalAnimaux - porcsEnRetard) / totalAnimaux) * 100) : 0;

    return {
      totalAnimaux,
      totalVaccinations,
      porcsEnRetard,
      tauxCouverture,
    };
  }, [animaux, vaccinations]);

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

      const porcsVaccinesSet = new Set<string>();
      vaccinationsType.forEach((v) => {
        v.animal_ids?.forEach((id) => porcsVaccinesSet.add(id));
      });

      const porcsVaccines = porcsVaccinesSet.size;
      const totalPorcs = statsGlobales.totalAnimaux;
      const tauxCouverture = totalPorcs > 0 ? Math.round((porcsVaccines / totalPorcs) * 100) : 0;

      const dernierTraitement = vaccinationsType.sort(
        (a, b) => new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime()
      )[0]?.date_vaccination;

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

  // Filtrer les types selon la recherche
  const statParTypeFiltres = useMemo(() => {
    if (!searchQuery.trim()) return statParType;

    const query = searchQuery.toLowerCase();
    return statParType.filter(
      (stat) =>
        stat.nom_type.toLowerCase().includes(query) ||
        stat.type_prophylaxie.toLowerCase().includes(query)
    );
  }, [statParType, searchQuery]);

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

  const handleOuvrirModalAjout = (type: TypeProphylaxie) => {
    setTypeSelectionne(type);
    setModalAddVisible(true);
  };

  const handleOuvrirCalendrier = (type: TypeProphylaxie) => {
    setTypeSelectionne(type);
    setModalCalendrierVisible(true);
  };

  const renderCarteRecapitulative = () => {
    return (
      <View style={[styles.carteRecap, { backgroundColor: colors.surface }]}>
        <View style={styles.headerRecap}>
          <Ionicons name="stats-chart" size={24} color={colors.primary} />
          <Text style={[styles.titreRecap, { color: colors.text }]}>Aperçu Prophylaxie</Text>
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

  const renderCarteType = (stat: StatistiquesProphylaxieParType) => {
    const couleur = getCouleurType(stat.type_prophylaxie);
    const icone = getIconeType(stat.type_prophylaxie);

    return (
      <View
        key={stat.type_prophylaxie}
        style={[styles.carteType, { backgroundColor: colors.surface }]}
      >
        <View style={styles.carteHeader}>
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
          <View style={[styles.badgeCount, { backgroundColor: `${couleur}20` }]}>
            <Text style={[styles.badgeCountTexte, { color: couleur }]}>{stat.porcs_vaccines}</Text>
          </View>
        </View>

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
            <Text style={[styles.boutonSecondaireTexte, { color: couleur }]}>Calendrier</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {renderCarteRecapitulative()}

      {/* Barre de recherche */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher un type de vaccination..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {statParTypeFiltres.map((stat) => renderCarteType(stat))}

      <View style={styles.bottomSpacer} />

      {modalAddVisible && typeSelectionne && (
        <VaccinationFormModalNew
          visible={modalAddVisible}
          onClose={() => {
            setModalAddVisible(false);
            setTypeSelectionne(null);
          }}
          typeProphylaxieParDefaut={typeSelectionne}
        />
      )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },

  // Barre de recherche
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },

  // Carte récap
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

  // Carte type
  carteType: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carteTitreContainer: {
    marginLeft: 10,
    flex: 1,
  },
  carteTypeTitre: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
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
    marginBottom: 8,
  },
  carteStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  carteStatTexte: {
    fontSize: 12,
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
