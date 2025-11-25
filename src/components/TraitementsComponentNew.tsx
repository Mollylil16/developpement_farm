/**
 * TraitementsComponentNew - Refonte complète
 * Section A: Inventaire des produits (vaccins + médicaments)
 * Section B: Suivi des sujets malades avec statuts
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { selectAllVaccinations, selectAllMaladies } from '../store/selectors/santeSelectors';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import { loadVaccinations, loadMaladies, updateMaladie } from '../store/slices/santeSlice';
import { loadProductionAnimaux, updateProductionAnimal } from '../store/slices/productionSlice';
import { createMortalite } from '../store/slices/mortalitesSlice';
import {
  TypeProphylaxie,
  TYPE_PROPHYLAXIE_LABELS,
  RAISON_TRAITEMENT_LABELS,
  Maladie,
} from '../types/sante';
import { ProductionAnimal } from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type StatutSuivi = 'observation' | 'gueri' | 'mort';

interface TraitementsComponentProps {
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export default function TraitementsComponentNew({ refreshControl }: TraitementsComponentProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();

  const projetActif = useAppSelector((state) => state.projet.projetActif);
  const vaccinations = useAppSelector((state) => selectAllVaccinations(state));
  const maladies = useAppSelector((state) => selectAllMaladies(state));
  const animaux = useAppSelector((state) => selectAllAnimaux(state));

  const [rechercheFiltre, setRechercheFiltre] = useState('');
  const [filtreRaison, setFiltreRaison] = useState<string>('tous');
  const [sectionActive, setSectionActive] = useState<'produits' | 'malades'>('produits');

  // Charger les données au montage
  useEffect(() => {
    if (projetActif?.id) {
      dispatch(loadVaccinations(projetActif.id));
      dispatch(loadMaladies(projetActif.id));
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: false }));
    }
  }, [projetActif?.id, dispatch]);

  // Section A: Inventaire des produits
  const inventaireProduits = useMemo(() => {
    const produitsMap = new Map<
      string,
      {
        nom: string;
        type: 'vaccin' | 'medicament';
        raison: string;
        stock: number;
        derniereUtilisation?: string;
      }
    >();

    // Récupérer produits depuis vaccinations
    (vaccinations || []).forEach((v) => {
      if (v.produit_administre) {
        const key = v.produit_administre.toLowerCase();
        if (!produitsMap.has(key)) {
          produitsMap.set(key, {
            nom: v.produit_administre,
            type: 'vaccin',
            raison: v.raison_traitement || 'suivi_normal',
            stock: 0, // TODO: Implementer avec vraie gestion stock
            derniereUtilisation: v.date_vaccination,
          });
        } else {
          const existing = produitsMap.get(key)!;
          if (v.date_vaccination > (existing.derniereUtilisation || '')) {
            existing.derniereUtilisation = v.date_vaccination;
          }
        }
      }
    });

    // Récupérer produits depuis maladies (notes contenant traitement)
    (maladies || []).forEach((m) => {
      if (m.notes) {
        // Extraire produits depuis notes (format: "Produit: Nom")
        const matches = m.notes.match(/Produit:\s*([^\n]+)/i);
        if (matches && matches[1]) {
          const produit = matches[1].trim();
          const key = produit.toLowerCase();
          if (!produitsMap.has(key)) {
            produitsMap.set(key, {
              nom: produit,
              type: 'medicament',
              raison: 'traitement_curatif',
              stock: 0,
              derniereUtilisation: m.date_debut,
            });
          }
        }
      }
    });

    return Array.from(produitsMap.values());
  }, [vaccinations, maladies]);

  // Filtrer produits
  const produitsFiltres = useMemo(() => {
    let filtered = inventaireProduits;

    if (rechercheFiltre) {
      const search = rechercheFiltre.toLowerCase();
      filtered = filtered.filter((p) => p.nom.toLowerCase().includes(search));
    }

    if (filtreRaison !== 'tous') {
      filtered = filtered.filter((p) => p.raison === filtreRaison);
    }

    return filtered;
  }, [inventaireProduits, rechercheFiltre, filtreRaison]);

  // Section B: Sujets malades (maladies non guéries)
  const sujetsMalades = useMemo(() => {
    const maladiesActives = (maladies || []).filter((m) => !m.gueri);

    return maladiesActives.map((maladie) => {
      const animal = (animaux || []).find((a) => a.id === maladie.animal_id);
      return {
        maladie,
        animal,
      };
    });
  }, [maladies, animaux]);

  // Gestion changement de statut
  const handleChangementStatut = useCallback(
    async (maladie: Maladie, animal: ProductionAnimal | undefined, nouveauStatut: StatutSuivi) => {
      if (!projetActif?.id) return;

      if (nouveauStatut === 'mort') {
        Alert.alert(
          'Confirmer le décès',
          `Êtes-vous sûr que ${animal?.nom || 'cet animal'} est décédé ?\n\nCette action va :\n- Retirer l'animal du cheptel actif\n- Enregistrer la cause du décès\n- Archiver le cas de maladie`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Confirmer',
              style: 'destructive',
              onPress: async () => {
                try {
                  if (!animal) {
                    Alert.alert('Erreur', 'Animal introuvable');
                    return;
                  }

                  // 1. Mettre à jour le statut de l'animal (mort)
                  await dispatch(
                    updateProductionAnimal({
                      id: animal.id,
                      updates: { statut: 'mort' },
                    })
                  ).unwrap();

                  // 2. Enregistrer dans mortalites
                  const categorie = animal.sexe === 'femelle' ? 'truie' : animal.sexe === 'male' ? 'verrat' : 'porcelet';
                  await dispatch(
                    createMortalite({
                      projet_id: projetActif.id,
                      nombre_porcs: 1,
                      date: new Date().toISOString().split('T')[0],
                      cause: maladie.nom_maladie || 'Maladie',
                      categorie: categorie as 'truie' | 'verrat' | 'porcelet' | 'autre',
                      animal_code: animal.code || undefined,
                      notes: `Décès suite à: ${maladie.nom_maladie}. Symptômes: ${maladie.symptomes || 'N/A'}`,
                    })
                  ).unwrap();

                  // 3. Mettre à jour la maladie comme terminée
                  await dispatch(
                    updateMaladie({
                      id: maladie.id,
                      updates: {
                        gueri: true,
                        date_fin: new Date().toISOString().split('T')[0],
                        notes: `${maladie.notes || ''}\n[DÉCÈS ENREGISTRÉ] ${new Date().toISOString().split('T')[0]}`,
                      },
                    })
                  ).unwrap();

                  Alert.alert(
                    'Décès enregistré',
                    `${animal.nom || "L'animal"} a été retiré du cheptel actif.\n\nLe cas de maladie et la cause du décès ont été archivés.`
                  );
                } catch (error: any) {
                  console.error('Erreur changement statut mort:', error);
                  Alert.alert(
                    'Erreur',
                    `Impossible d'enregistrer le décès: ${error?.message || error}`
                  );
                }
              },
            },
          ]
        );
      } else if (nouveauStatut === 'gueri') {
        try {
          await dispatch(
            updateMaladie({
              id: maladie.id,
              updates: {
                gueri: true,
                date_fin: new Date().toISOString().split('T')[0],
              },
            })
          ).unwrap();

          Alert.alert('Succès', `✅ ${animal?.nom || "L'animal"} a été marqué comme guéri !`);
        } catch (error: any) {
          console.error('Erreur changement statut guéri:', error);
          Alert.alert('Erreur', `Impossible de marquer comme guéri: ${error?.message || error}`);
        }
      }
    },
    [projetActif, dispatch]
  );

  // Render Section A: Inventaire
  const renderInventaireProduits = () => (
    <View style={styles.section}>
      <View
        style={[
          styles.carteInventaire,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            ...colors.shadow.medium,
          },
        ]}
      >
        <View style={styles.headerSection}>
          <Ionicons name="medical-outline" size={24} color={colors.primary} />
          <Text style={[styles.titreSection, { color: colors.text }]}>Inventaire des Produits</Text>
        </View>

        {/* Barre de recherche */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.background, borderColor: colors.borderLight },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher un produit..."
            placeholderTextColor={colors.textSecondary}
            value={rechercheFiltre}
            onChangeText={setRechercheFiltre}
          />
          {rechercheFiltre ? (
            <TouchableOpacity onPress={() => setRechercheFiltre('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filtres raison */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtresRaison}>
          <TouchableOpacity
            style={[
              styles.filtreChip,
              { borderColor: colors.border },
              filtreRaison === 'tous' && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setFiltreRaison('tous')}
          >
            <Text
              style={[
                styles.filtreChipText,
                { color: filtreRaison === 'tous' ? '#FFF' : colors.text },
              ]}
            >
              Tous ({inventaireProduits.length})
            </Text>
          </TouchableOpacity>
          {Object.entries(RAISON_TRAITEMENT_LABELS).map(([key, label]) => {
            const count = inventaireProduits.filter((p) => p.raison === key).length;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filtreChip,
                  { borderColor: colors.border },
                  filtreRaison === key && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFiltreRaison(key)}
              >
                <Text
                  style={[
                    styles.filtreChipText,
                    { color: filtreRaison === key ? '#FFF' : colors.text },
                  ]}
                >
                  {label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Liste produits */}
        {produitsFiltres.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun produit trouvé
            </Text>
          </View>
        ) : (
          produitsFiltres.map((produit, index) => (
            <View
              key={index}
              style={[
                styles.produitCard,
                { backgroundColor: colors.background, borderColor: colors.borderLight },
              ]}
            >
              <View style={styles.produitHeader}>
                <View style={styles.produitInfo}>
                  <Text style={[styles.produitNom, { color: colors.text }]}>{produit.nom}</Text>
                  <View style={styles.produitBadges}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            produit.type === 'vaccin' ? colors.success : colors.warning,
                        },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {produit.type === 'vaccin' ? 'Vaccin' : 'Médicament'}
                      </Text>
                    </View>
                    <Text style={[styles.produitRaison, { color: colors.textSecondary }]}>
                      {RAISON_TRAITEMENT_LABELS[
                        produit.raison as keyof typeof RAISON_TRAITEMENT_LABELS
                      ] || produit.raison}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.produitDetails}>
                <View style={styles.produitDetailItem}>
                  <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.produitDetailText, { color: colors.textSecondary }]}>
                    Stock: {produit.stock > 0 ? produit.stock : 'Non géré'}
                  </Text>
                </View>
                {produit.derniereUtilisation && (
                  <View style={styles.produitDetailItem}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.produitDetailText, { color: colors.textSecondary }]}>
                      Dernière utilisation: {produit.derniereUtilisation}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  // Render Section B: Sujets Malades
  const renderSujetsMalades = () => (
    <View style={styles.section}>
      <View
        style={[
          styles.carteMalades,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            ...colors.shadow.medium,
          },
        ]}
      >
        <View style={styles.headerSection}>
          <Ionicons name="medical" size={24} color={colors.error} />
          <Text style={[styles.titreSection, { color: colors.text }]}>
            Suivi des Sujets Malades
          </Text>
          <View style={[styles.compteur, { backgroundColor: colors.error }]}>
            <Text style={styles.compteurText}>{sujetsMalades.length}</Text>
          </View>
        </View>

        {sujetsMalades.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun animal malade actuellement
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Tous les sujets sont en bonne santé
            </Text>
          </View>
        ) : (
          sujetsMalades.map(({ maladie, animal }) => (
            <View
              key={maladie.id}
              style={[
                styles.maladeCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  ...colors.shadow.small,
                },
              ]}
            >
              <View style={styles.maladeHeader}>
                <View style={styles.maladeHeaderLeft}>
                  <Text style={[styles.maladeNom, { color: colors.text }]}>
                    {animal?.nom || animal?.code || `Porc #${maladie.animal_id?.slice(0, 8)}`}
                  </Text>
                  <Text style={[styles.maladeId, { color: colors.textSecondary }]}>
                    ID: {animal?.code || maladie.animal_id?.slice(0, 12)}
                  </Text>
                  <View
                    style={[
                      styles.graviteBadge,
                      {
                        backgroundColor:
                          maladie.gravite === 'critique'
                            ? colors.error
                            : maladie.gravite === 'grave'
                              ? '#FF6B6B'
                              : maladie.gravite === 'moderee'
                                ? colors.warning
                                : colors.success,
                      },
                    ]}
                  >
                    <Text style={styles.graviteBadgeText}>{maladie.gravite.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.maladeActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.warning + '15' }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.warning }]}>
                      Observer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.success + '15' }]}
                    onPress={() => handleChangementStatut(maladie, animal, 'gueri')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.success }]}>Guéri</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                    onPress={() => handleChangementStatut(maladie, animal, 'mort')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>Mort</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.maladieInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="bug" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    {maladie.nom_maladie}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Diagnostic: {maladie.date_debut}
                  </Text>
                </View>
                {maladie.notes && (
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text" size={16} color={colors.textSecondary} />
                    <Text
                      style={[styles.infoText, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {maladie.notes}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {/* Navigation sections */}
      <View style={styles.sectionNav}>
        <TouchableOpacity
          style={[
            styles.sectionNavButton,
            { borderColor: colors.border },
            sectionActive === 'produits' && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => setSectionActive('produits')}
        >
          <Ionicons
            name="flask"
            size={20}
            color={sectionActive === 'produits' ? '#FFF' : colors.text}
          />
          <Text
            style={[
              styles.sectionNavText,
              { color: sectionActive === 'produits' ? '#FFF' : colors.text },
            ]}
          >
            Produits ({inventaireProduits.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sectionNavButton,
            { borderColor: colors.border },
            sectionActive === 'malades' && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => setSectionActive('malades')}
        >
          <Ionicons
            name="medical"
            size={20}
            color={sectionActive === 'malades' ? '#FFF' : colors.text}
          />
          <Text
            style={[
              styles.sectionNavText,
              { color: sectionActive === 'malades' ? '#FFF' : colors.text },
            ]}
          >
            Sujets Malades ({sujetsMalades.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu selon section active */}
      {sectionActive === 'produits' ? renderInventaireProduits() : renderSujetsMalades()}

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

  // Navigation sections
  sectionNav: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionNavButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  sectionNavText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },

  // Section générale
  section: {
    marginBottom: SPACING.md,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  titreSection: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    flex: 1,
  },
  compteur: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compteurText: {
    color: '#FFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },

  // Section Inventaire
  carteInventaire: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    padding: 0,
  },
  filtresRaison: {
    marginBottom: SPACING.md,
  },
  filtreChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginRight: SPACING.xs,
  },
  filtreChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  produitCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  produitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  produitInfo: {
    flex: 1,
  },
  produitNom: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  produitBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    color: '#FFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  produitRaison: {
    fontSize: FONT_SIZES.sm,
  },
  produitDetails: {
    gap: SPACING.xs,
  },
  produitDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  produitDetailText: {
    fontSize: FONT_SIZES.sm,
  },

  // Section Malades
  carteMalades: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  maladeCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  maladeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  maladeHeaderLeft: {
    flex: 1,
  },
  maladeNom: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  maladeId: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  maladeActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  graviteBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs / 2,
  },
  graviteBadgeText: {
    color: '#FFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  maladieInfo: {
    gap: SPACING.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },

  bottomSpacer: {
    height: SPACING.xl,
  },
});
