/**
 * Composant Bilan Comptable
 * Affiche les amortissements mensuels par catégorie CAPEX
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadDepensesPonctuelles } from '../store/slices/financeSlice';
import { selectAllDepensesPonctuelles } from '../store/selectors/financeSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { logger } from '../utils/logger';
import Card from './Card';
import {
  calculateAmortissementsParCategorie,
  AmortissementParCategorie,
} from '../utils/financeCalculations';
import { CATEGORIE_DEPENSE_LABELS, CategorieDepense } from '../types/finance';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import OpexCapexChart from './finance/OpexCapexChart';

export default function FinanceBilanComptableComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const depensesPonctuelles = useAppSelector(selectAllDepensesPonctuelles);
  const loading = useAppSelector((state) => state.finance.loading);

  const [refreshing, setRefreshing] = useState(false);

  // Durée d'amortissement du projet
  const dureeAmortissementMois = projetActif?.duree_amortissement_par_defaut_mois || 36;

  useEffect(() => {
    if (projetActif?.id) {
      dispatch(loadDepensesPonctuelles(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  const onRefresh = async () => {
    if (!projetActif?.id) return;
    setRefreshing(true);
    try {
      await dispatch(loadDepensesPonctuelles(projetActif.id)).unwrap();
    } catch (error) {
      logger.error('Erreur rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculer les amortissements par catégorie
  const amortissementsParCategorie = useMemo(() => {
    if (!depensesPonctuelles || depensesPonctuelles.length === 0) {
      return [];
    }

    const resultats = calculateAmortissementsParCategorie(
      depensesPonctuelles,
      dureeAmortissementMois
    );

    // Ajouter les labels
    return resultats.map((item) => ({
      ...item,
      label: CATEGORIE_DEPENSE_LABELS[item.categorie as CategorieDepense] || item.categorie,
    }));
  }, [depensesPonctuelles, dureeAmortissementMois]);

  // Calculer les totaux globaux
  const totauxGlobaux = useMemo(() => {
    const totalInvesti = amortissementsParCategorie.reduce(
      (sum, cat) => sum + cat.montant_total,
      0
    );
    const totalAmortissementMensuel = amortissementsParCategorie.reduce(
      (sum, cat) => sum + cat.amortissement_mensuel_total,
      0
    );
    const totalInvestissements = amortissementsParCategorie.reduce(
      (sum, cat) => sum + cat.nombre_investissements,
      0
    );

    return {
      totalInvesti,
      totalAmortissementMensuel,
      totalInvestissements,
    };
  }, [amortissementsParCategorie]);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const renderCategorieCard = (item: AmortissementParCategorie & { label: string }) => {
    return (
      <Card key={item.categorie} style={styles.categorieCard}>
        <View style={styles.categorieHeader}>
          <View style={styles.categorieHeaderLeft}>
            <View style={[styles.categorieIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="business" size={24} color={colors.primary} />
            </View>
            <View style={styles.categorieInfo}>
              <Text style={[styles.categorieTitle, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.categorieSubtitle, { color: colors.textSecondary }]}>
                {item.nombre_investissements} investissement(s)
              </Text>
            </View>
          </View>
        </View>

        {/* Statistiques de la catégorie */}
        <View style={styles.categorieStats}>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Montant total investi
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatMontant(item.montant_total)} FCFA
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Amortissement mensuel
            </Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatMontant(item.amortissement_mensuel_total)} FCFA/mois
            </Text>
          </View>
        </View>

        {/* Liste des investissements */}
        {item.depenses.length > 0 && (
          <View style={styles.depensesList}>
            <Text style={[styles.depensesListTitle, { color: colors.text }]}>
              Détail des investissements
            </Text>
            {item.depenses.map((depense) => (
              <View
                key={depense.id}
                style={[
                  styles.depenseItem,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.depenseItemLeft}>
                  <Text style={[styles.depenseItemLabel, { color: colors.text }]}>
                    {depense.libelle || 'Investissement'}
                  </Text>
                  <Text style={[styles.depenseItemDate, { color: colors.textSecondary }]}>
                    Achat: {format(parseISO(depense.date), 'dd MMM yyyy', { locale: fr })}
                  </Text>
                  <Text style={[styles.depenseItemDate, { color: colors.textSecondary }]}>
                    Fin amortissement:{' '}
                    {format(parseISO(depense.date_fin_amortissement), 'dd MMM yyyy', {
                      locale: fr,
                    })}
                  </Text>
                </View>
                <View style={styles.depenseItemRight}>
                  <Text style={[styles.depenseItemMontant, { color: colors.text }]}>
                    {formatMontant(depense.montant)} FCFA
                  </Text>
                  <Text style={[styles.depenseItemAmortissement, { color: colors.success }]}>
                    {formatMontant(depense.amortissement_mensuel)} FCFA/mois
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  };

  if (loading && !depensesPonctuelles) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement du bilan...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* En-tête avec totaux globaux */}
      <Card style={styles.headerCard}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="calculator" size={28} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bilan Comptable</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Amortissements mensuels par catégorie CAPEX
        </Text>

        {/* Totaux globaux */}
        <View style={styles.totauxContainer}>
          <View style={[styles.totalBox, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              Total investi (CAPEX)
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatMontant(totauxGlobaux.totalInvesti)} FCFA
            </Text>
          </View>
          <View style={[styles.totalBox, { backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              Amortissement mensuel total
            </Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>
              {formatMontant(totauxGlobaux.totalAmortissementMensuel)} FCFA/mois
            </Text>
          </View>
          <View style={[styles.totalBox, { backgroundColor: colors.info + '15' }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              Nombre d'investissements
            </Text>
            <Text style={[styles.totalValue, { color: colors.info }]}>
              {totauxGlobaux.totalInvestissements}
            </Text>
          </View>
        </View>

        {/* Info durée d'amortissement */}
        <View
          style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Durée d'amortissement: {dureeAmortissementMois} mois (
            {Math.round(dureeAmortissementMois / 12)} ans)
          </Text>
        </View>
      </Card>

      {/* Graphique OPEX vs CAPEX Amorti */}
      <OpexCapexChart />

      {/* Liste des catégories */}
      {amortissementsParCategorie.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun investissement CAPEX enregistré
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Les investissements (aménagement bâtiment, équipement lourd, achat sujet) apparaîtront
            ici
          </Text>
        </Card>
      ) : (
        amortissementsParCategorie.map(renderCategorieCard)
      )}

      {/* Note sur la rentabilité */}
      {amortissementsParCategorie.length > 0 && (
        <Card
          style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.noteHeader}>
            <Ionicons name="bulb-outline" size={20} color={colors.warning} />
            <Text style={[styles.noteTitle, { color: colors.text }]}>
              Calcul de la rentabilité globale
            </Text>
          </View>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Les amortissements mensuels sont utilisés pour calculer la rentabilité globale du
            projet.
            {'\n\n'}
            Le coût de production par kg utilise uniquement les dépenses OPEX (opérationnelles). Les
            investissements CAPEX sont gérés séparément dans ce bilan comptable.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
  },
  headerCard: {
    marginBottom: SPACING.md,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as TextStyle['fontWeight'],
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
  },
  totauxContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  totalBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  totalLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  totalValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as TextStyle['fontWeight'],
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  infoText: {
    fontSize: FONT_SIZES.xs,
    flex: 1,
  },
  categorieCard: {
    marginBottom: SPACING.md,
  },
  categorieHeader: {
    marginBottom: SPACING.md,
  },
  categorieHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  categorieIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorieInfo: {
    flex: 1,
  },
  categorieTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semiBold as TextStyle['fontWeight'],
    marginBottom: SPACING.xs / 2,
  },
  categorieSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  categorieStats: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold as TextStyle['fontWeight'],
  },
  depensesList: {
    marginTop: SPACING.md,
  },
  depensesListTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold as TextStyle['fontWeight'],
    marginBottom: SPACING.sm,
  },
  depenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  depenseItemLeft: {
    flex: 1,
  },
  depenseItemLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as TextStyle['fontWeight'],
    marginBottom: SPACING.xs / 2,
  },
  depenseItemDate: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  depenseItemRight: {
    alignItems: 'flex-end',
  },
  depenseItemMontant: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold as TextStyle['fontWeight'],
    marginBottom: SPACING.xs / 2,
  },
  depenseItemAmortissement: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium as TextStyle['fontWeight'],
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as TextStyle['fontWeight'],
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  noteCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  noteTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold as TextStyle['fontWeight'],
  },
  noteText: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
});
