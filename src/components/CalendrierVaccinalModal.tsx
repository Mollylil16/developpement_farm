/**
 * CalendrierVaccinalModal - Affiche le calendrier vaccinal des porcs
 * Liste les animaux à vacciner avec filtres (en retard, à venir, etc.)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from './CustomModal';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { selectAllVaccinations } from '../store/selectors/santeSelectors';
import {
  TypeProphylaxie,
  TYPE_PROPHYLAXIE_LABELS,
  CALENDRIER_VACCINAL_TYPE,
  calculerAgeJours,
  CalendrierTypeAge,
} from '../types/sante';
import { getCategorieAnimal } from '../utils/animalUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  typeProphylaxie: TypeProphylaxie;
}

type FiltreStatut = 'tous' | 'en_retard' | 'a_venir_7j' | 'a_venir_30j' | 'a_jour';

interface AnimalCalendrier {
  animal_id: string;
  nom: string;
  code: string;
  categorie: string;
  age_jours: number;
  dernier_vaccin?: string; // Date
  prochain_vaccin?: string; // Date
  traitement_requis?: CalendrierTypeAge;
  statut: 'en_retard' | 'a_venir' | 'a_jour' | 'inconnu';
  jours_restants?: number; // Nombre de jours avant/après le vaccin
}

export default function CalendrierVaccinalModal({ visible, onClose, typeProphylaxie }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const animaux = useAppSelector((state) => selectAllAnimaux(state));
  const vaccinations = useAppSelector((state) => selectAllVaccinations(state));

  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous');

  // Calculer les données du calendrier pour chaque animal
  const donneesCalendrier = useMemo((): AnimalCalendrier[] => {
    const aujourdhui = new Date();
    const animauxActifs = (animaux || []).filter((a) => a.statut === 'actif');

    return animauxActifs.map((animal) => {
      if (!animal.date_naissance) {
        return {
          animal_id: animal.id,
          nom: animal.nom || animal.code || 'Sans nom',
          code: animal.code || 'N/A',
          categorie: getCategorieAnimal(animal),
          age_jours: 0,
          statut: 'inconnu' as const,
        };
      }

      const ageJours = calculerAgeJours(animal.date_naissance);

      // Trouver les traitements requis selon l'âge et le type
      const traitementsRequis = CALENDRIER_VACCINAL_TYPE.filter(
        (cal) => cal.type_prophylaxie === typeProphylaxie && cal.obligatoire
      );

      // Trouver le prochain traitement requis
      const prochainTraitement = traitementsRequis.find((t) => t.age_jours >= ageJours);
      const dernierTraitementReqis = traitementsRequis.filter((t) => t.age_jours <= ageJours).pop();

      // Vérifier si l'animal a reçu le dernier traitement requis
      const vaccinationsAnimal = (vaccinations || []).filter(
        (v) => v.animal_ids?.includes(animal.id) && v.type_prophylaxie === typeProphylaxie
      );

      const dernierVaccin = vaccinationsAnimal.sort(
        (a, b) => new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime()
      )[0];

      // Déterminer le statut
      let statut: 'en_retard' | 'a_venir' | 'a_jour' | 'inconnu' = 'a_jour';
      let joursRestants: number | undefined;

      if (dernierTraitementReqis) {
        const dateRequise = new Date(animal.date_naissance);
        dateRequise.setDate(dateRequise.getDate() + dernierTraitementReqis.age_jours);

        // Vérifier si le traitement a été fait après la date requise
        if (dernierVaccin) {
          const dateVaccin = new Date(dernierVaccin.date_vaccination);
          if (dateVaccin < dateRequise) {
            statut = 'en_retard';
            joursRestants = Math.floor(
              (aujourdhui.getTime() - dateRequise.getTime()) / (1000 * 60 * 60 * 24)
            );
          } else {
            statut = 'a_jour';
          }
        } else {
          // Pas de vaccin, en retard
          statut = 'en_retard';
          joursRestants = Math.floor(
            (aujourdhui.getTime() - dateRequise.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } else if (prochainTraitement) {
        // Prochain traitement à venir
        const dateProchaine = new Date(animal.date_naissance);
        dateProchaine.setDate(dateProchaine.getDate() + prochainTraitement.age_jours);
        joursRestants = Math.floor(
          (dateProchaine.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (joursRestants > 0 && joursRestants <= 30) {
          statut = 'a_venir';
        } else {
          statut = 'a_jour';
        }
      }

      return {
        animal_id: animal.id,
        nom: animal.nom_personnalise || animal.code_identification || 'Sans nom',
        code: animal.code_identification || 'N/A',
        categorie: getCategorieAnimal(animal),
        age_jours: ageJours,
        dernier_vaccin: dernierVaccin?.date_vaccination,
        prochain_vaccin: prochainTraitement
          ? new Date(
              new Date(animal.date_naissance).getTime() +
                prochainTraitement.age_jours * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .split('T')[0]
          : undefined,
        traitement_requis: prochainTraitement || dernierTraitementReqis,
        statut,
        jours_restants: joursRestants,
      };
    });
  }, [animaux, vaccinations, typeProphylaxie]);

  // Appliquer le filtre de statut
  const donneesFiltrees = useMemo(() => {
    let filtered = donneesCalendrier;

    switch (filtreStatut) {
      case 'en_retard':
        filtered = filtered.filter((d) => d.statut === 'en_retard');
        break;
      case 'a_venir_7j':
        filtered = filtered.filter(
          (d) => d.statut === 'a_venir' && d.jours_restants !== undefined && d.jours_restants <= 7
        );
        break;
      case 'a_venir_30j':
        filtered = filtered.filter(
          (d) => d.statut === 'a_venir' && d.jours_restants !== undefined && d.jours_restants <= 30
        );
        break;
      case 'a_jour':
        filtered = filtered.filter((d) => d.statut === 'a_jour');
        break;
      default:
        break;
    }

    // Trier par jours restants (en retard d'abord, puis à venir)
    return filtered.sort((a, b) => {
      if (a.statut === 'en_retard' && b.statut !== 'en_retard') return -1;
      if (b.statut === 'en_retard' && a.statut !== 'en_retard') return 1;

      if (a.jours_restants !== undefined && b.jours_restants !== undefined) {
        return Math.abs(a.jours_restants) - Math.abs(b.jours_restants);
      }

      return 0;
    });
  }, [donneesCalendrier, filtreStatut]);

  // Compter par statut pour afficher dans les filtres
  const compteurs = useMemo(() => {
    return {
      tous: donneesCalendrier.length,
      en_retard: donneesCalendrier.filter((d) => d.statut === 'en_retard').length,
      a_venir_7j: donneesCalendrier.filter(
        (d) => d.statut === 'a_venir' && d.jours_restants !== undefined && d.jours_restants <= 7
      ).length,
      a_venir_30j: donneesCalendrier.filter(
        (d) => d.statut === 'a_venir' && d.jours_restants !== undefined && d.jours_restants <= 30
      ).length,
      a_jour: donneesCalendrier.filter((d) => d.statut === 'a_jour').length,
    };
  }, [donneesCalendrier]);

  const getCouleurStatut = (statut: string) => {
    switch (statut) {
      case 'en_retard':
        return colors.error;
      case 'a_venir':
        return colors.warning;
      case 'a_jour':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getIconeStatut = (statut: string): keyof typeof Ionicons.glyphMap => {
    switch (statut) {
      case 'en_retard':
        return 'alert-circle';
      case 'a_venir':
        return 'time';
      case 'a_jour':
        return 'checkmark-circle';
      default:
        return 'help-circle';
    }
  };

  const handleVaccinerAnimal = (animalId: string) => {
    Alert.alert('Vacciner', 'Voulez-vous enregistrer une vaccination pour cet animal ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Oui',
        onPress: () => {
          // TODO: Ouvrir le modal de vaccination pré-rempli
          Alert.alert('À venir', 'Fonctionnalité en cours de développement');
        },
      },
    ]);
  };

  const renderAnimalItem = ({ item }: { item: AnimalCalendrier }) => {
    const couleurStatut = getCouleurStatut(item.statut);
    const iconeStatut = getIconeStatut(item.statut);

    return (
      <View style={[styles.animalCard, { backgroundColor: colors.surface }]}>
        {/* En-tête */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.animalNom, { color: colors.text }]}>{item.nom}</Text>
            <Text style={[styles.animalCode, { color: colors.textSecondary }]}>
              {item.code} • {item.categorie}
            </Text>
          </View>
          <View style={[styles.statutBadge, { backgroundColor: `${couleurStatut}15` }]}>
            <Ionicons name={iconeStatut} size={16} color={couleurStatut} />
            <Text style={[styles.statutTexte, { color: couleurStatut }]}>
              {item.statut === 'en_retard'
                ? 'En retard'
                : item.statut === 'a_venir'
                  ? 'À venir'
                  : 'À jour'}
            </Text>
          </View>
        </View>

        {/* Informations */}
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={14} color={colors.textSecondary} />
            <Text style={[styles.infoTexte, { color: colors.textSecondary }]}>
              Âge : {item.age_jours} jours
            </Text>
          </View>

          {item.dernier_vaccin && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-done" size={14} color={colors.success} />
              <Text style={[styles.infoTexte, { color: colors.textSecondary }]}>
                Dernier : {new Date(item.dernier_vaccin).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}

          {item.prochain_vaccin && (
            <View style={styles.infoRow}>
              <Ionicons name="time" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoTexte, { color: colors.textSecondary }]}>
                Prochain : {new Date(item.prochain_vaccin).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}

          {item.jours_restants !== undefined && (
            <View style={styles.infoRow}>
              <Ionicons
                name={item.statut === 'en_retard' ? 'alert-circle' : 'hourglass'}
                size={14}
                color={couleurStatut}
              />
              <Text style={[styles.infoTexte, { color: couleurStatut }]}>
                {item.statut === 'en_retard'
                  ? `${Math.abs(item.jours_restants)} jour(s) de retard`
                  : `Dans ${item.jours_restants} jour(s)`}
              </Text>
            </View>
          )}

          {item.traitement_requis && (
            <View style={[styles.traitementBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.traitementNom, { color: colors.primary }]}>
                {item.traitement_requis.nom_traitement}
              </Text>
              <Text style={[styles.traitementDesc, { color: colors.textSecondary }]}>
                {item.traitement_requis.description}
              </Text>
              {item.traitement_requis.dosage_recommande && (
                <Text style={[styles.traitementDosage, { color: colors.textSecondary }]}>
                  Dosage : {item.traitement_requis.dosage_recommande}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Bouton action */}
        {(item.statut === 'en_retard' || item.statut === 'a_venir') && (
          <TouchableOpacity
            style={[styles.boutonVacciner, { backgroundColor: colors.primary }]}
            onPress={() => handleVaccinerAnimal(item.animal_id)}
          >
            <Ionicons name="medical" size={18} color="#FFFFFF" />
            <Text style={styles.boutonVaccinerTexte}>Vacciner maintenant</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={`Calendrier - ${TYPE_PROPHYLAXIE_LABELS[typeProphylaxie]}`}
      showButtons={false}
    >
      <View style={styles.container}>
        {/* Filtres */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtresContainer}
        >
          <TouchableOpacity
            style={[
              styles.filtreBouton,
              {
                backgroundColor: filtreStatut === 'tous' ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFiltreStatut('tous')}
          >
            <Text
              style={[
                styles.filtreBoutonTexte,
                { color: filtreStatut === 'tous' ? '#FFFFFF' : colors.text },
              ]}
            >
              Tous ({compteurs.tous})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filtreBouton,
              {
                backgroundColor: filtreStatut === 'en_retard' ? colors.error : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFiltreStatut('en_retard')}
          >
            <Text
              style={[
                styles.filtreBoutonTexte,
                { color: filtreStatut === 'en_retard' ? '#FFFFFF' : colors.text },
              ]}
            >
              En retard ({compteurs.en_retard})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filtreBouton,
              {
                backgroundColor: filtreStatut === 'a_venir_7j' ? colors.warning : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFiltreStatut('a_venir_7j')}
          >
            <Text
              style={[
                styles.filtreBoutonTexte,
                { color: filtreStatut === 'a_venir_7j' ? '#FFFFFF' : colors.text },
              ]}
            >
              7 jours ({compteurs.a_venir_7j})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filtreBouton,
              {
                backgroundColor: filtreStatut === 'a_venir_30j' ? colors.warning : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFiltreStatut('a_venir_30j')}
          >
            <Text
              style={[
                styles.filtreBoutonTexte,
                { color: filtreStatut === 'a_venir_30j' ? '#FFFFFF' : colors.text },
              ]}
            >
              30 jours ({compteurs.a_venir_30j})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filtreBouton,
              {
                backgroundColor: filtreStatut === 'a_jour' ? colors.success : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFiltreStatut('a_jour')}
          >
            <Text
              style={[
                styles.filtreBoutonTexte,
                { color: filtreStatut === 'a_jour' ? '#FFFFFF' : colors.text },
              ]}
            >
              À jour ({compteurs.a_jour})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Liste */}
        <FlatList
          data={donneesFiltrees}
          keyExtractor={(item) => item.animal_id}
          renderItem={renderAnimalItem}
          contentContainerStyle={styles.liste}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucun animal trouvé
              </Text>
            </View>
          }
        />
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtresContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 60,
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
  },
  liste: {
    padding: 16,
  },
  animalCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  animalNom: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  animalCode: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statutTexte: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTexte: {
    fontSize: 13,
  },
  traitementBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  traitementNom: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  traitementDesc: {
    fontSize: 12,
    marginBottom: 4,
  },
  traitementDosage: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  boutonVacciner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  boutonVaccinerTexte: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});
