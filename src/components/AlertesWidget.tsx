/**
 * Widget d'alertes pour le Dashboard
 * Affiche les alertes importantes : gestations proches, stocks faibles, tâches en retard
 */

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useNavigation } from '@react-navigation/native';
import { SCREENS } from '../navigation/types';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { differenceInDays, parseISO, isPast, addDays } from 'date-fns';
import { doitGenererAlerte } from '../types/reproduction';
import { loadStocks } from '../store/slices/stocksSlice';
import { loadPlanificationsParProjet } from '../store/slices/planificationSlice';
import { loadSevrages } from '../store/slices/reproductionSlice';

export interface Alerte {
  id: string;
  type: 'warning' | 'error' | 'info';
  icon: string;
  message: string;
  action: () => void;
  priority: number; // 1 = haute, 2 = moyenne, 3 = basse
}

export default function AlertesWidget() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { gestations, sevrages } = useAppSelector((state) => state.reproduction);
  const { stocks } = useAppSelector((state) => state.stocks);
  const { planifications } = useAppSelector((state) => state.planification);

  // Charger les données nécessaires
  useEffect(() => {
    if (projetActif) {
      dispatch(loadStocks(projetActif.id));
      dispatch(loadPlanificationsParProjet(projetActif.id));
      dispatch(loadSevrages(projetActif.id));
    }
  }, [dispatch, projetActif]);

  // Filtrer les stocks en alerte
  const stocksEnAlerte = useMemo(() => {
    return stocks.filter((stock) => stock.alerte_active);
  }, [stocks]);

  const alertes = useMemo(() => {
    const alerts: Alerte[] = [];

    // 1. Gestations proches (calcul local)
    gestations
      .filter((g) => g.statut === 'en_cours')
      .forEach((g) => {
        if (doitGenererAlerte(g.date_mise_bas_prevue)) {
          const daysUntil = differenceInDays(
            parseISO(g.date_mise_bas_prevue),
            new Date()
          );
          
          alerts.push({
            id: `gestation_${g.id}`,
            type: daysUntil <= 3 ? 'error' : 'warning',
            icon: '🐷',
            message: `Mise bas prévue pour ${g.truie_nom || 'truie'} dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`,
            action: () => {
              // @ts-ignore - navigation typée
              navigation.navigate('Main', { screen: SCREENS.REPRODUCTION });
            },
            priority: daysUntil <= 3 ? 1 : daysUntil <= 5 ? 2 : 3,
          });
        }
      });

    // 2. Stocks faibles (déjà calculé dans la base de données)
    stocksEnAlerte.forEach((stock) => {
      alerts.push({
        id: `stock_${stock.id}`,
        type: 'error',
        icon: '⚠️',
        message: `Stock faible : ${stock.nom} (${stock.quantite_actuelle.toFixed(1)} ${stock.unite} / seuil ${stock.seuil_alerte} ${stock.unite})`,
        action: () => {
          // @ts-ignore - navigation typée
          navigation.navigate('Main', { 
            screen: SCREENS.NUTRITION,
            params: { initialScreen: 'Stocks' }
          });
        },
        priority: stock.seuil_alerte && stock.quantite_actuelle <= stock.seuil_alerte * 0.5 ? 1 : 2,
      });
    });

    // 3. Sevrages proches (calcul local)
    // Détecter les gestations terminées sans sevrage qui approchent de la date de sevrage prévisionnelle
    gestations
      .filter((g) => g.statut === 'terminee' && g.date_mise_bas_reelle)
      .forEach((g) => {
        // Vérifier si un sevrage existe déjà pour cette gestation
        const hasSevrage = sevrages.some((s) => s.gestation_id === g.id);
        if (hasSevrage) return;

        // Calculer la date prévisionnelle de sevrage (28 jours après la mise bas)
        try {
          const dateMiseBas = parseISO(g.date_mise_bas_reelle);
          const dateSevragePrevue = addDays(dateMiseBas, 28);
          const joursRestants = differenceInDays(dateSevragePrevue, new Date());

          // Générer une alerte si le sevrage est prévu dans les 7 prochains jours
          if (joursRestants <= 7 && joursRestants >= 0) {
            alerts.push({
              id: `sevrage_${g.id}`,
              type: joursRestants <= 3 ? 'error' : 'warning',
              icon: '🍼',
              message: `Sevrage prévu dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''} pour ${g.truie_nom || 'truie'} (${g.nombre_porcelets_reel || g.nombre_porcelets_prevu} porcelets). Pensez aux aliments adaptés !`,
              action: () => {
                // @ts-ignore - navigation typée
                navigation.navigate('Main', { 
                  screen: SCREENS.REPRODUCTION,
                  params: { initialScreen: 'Sevrages' }
                });
              },
              priority: joursRestants <= 3 ? 1 : joursRestants <= 5 ? 2 : 3,
            });
          }
        } catch (error) {
          // Ignorer les erreurs de parsing de date
        }
      });

    // 4. Tâches en retard (calcul local)
    planifications
      .filter((p) => p.statut === 'a_faire' && p.date_echeance && isPast(parseISO(p.date_echeance)))
      .forEach((p) => {
        if (!p.date_echeance) return;
        const daysOverdue = differenceInDays(
          new Date(),
          parseISO(p.date_echeance)
        );
        
        alerts.push({
          id: `planification_${p.id}`,
          type: 'error',
          icon: '📅',
          message: `Tâche en retard : ${p.titre} (${daysOverdue} jour${daysOverdue > 1 ? 's' : ''} de retard)`,
          action: () => {
            // @ts-ignore - navigation typée
            navigation.navigate('Main', { screen: SCREENS.PLANIFICATION });
          },
          priority: daysOverdue > 7 ? 1 : daysOverdue > 3 ? 2 : 3,
        });
      });

    // 4. Tâches à faire aujourd'hui (info)
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const demain = new Date(aujourdhui);
    demain.setDate(demain.getDate() + 1);

    planifications
      .filter((p) => {
        if (p.statut !== 'a_faire' || !p.date_echeance) return false;
        const dateEcheance = parseISO(p.date_echeance);
        return dateEcheance >= aujourdhui && dateEcheance < demain;
      })
      .forEach((p) => {
        alerts.push({
          id: `planification_today_${p.id}`,
          type: 'info',
          icon: '📋',
          message: `Tâche à faire aujourd'hui : ${p.titre}`,
          action: () => {
            // @ts-ignore - navigation typée
            navigation.navigate('Main', { screen: SCREENS.PLANIFICATION });
          },
          priority: 3,
        });
      });

    // Trier par priorité (1 = haute priorité en premier)
    return alerts.sort((a, b) => a.priority - b.priority);
  }, [gestations, stocksEnAlerte, planifications, navigation]);

  if (alertes.length === 0) {
    return null; // Ne rien afficher s'il n'y a pas d'alertes
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.warning + '30', ...colors.shadow.medium }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          ⚠️ {alertes.length} alerte{alertes.length > 1 ? 's' : ''}
        </Text>
        {alertes.length > 3 && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {alertes.length - 3} autre{alertes.length - 3 > 1 ? 's' : ''} non affichée{alertes.length - 3 > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {alertes.slice(0, 3).map((alerte) => (
          <TouchableOpacity
            key={alerte.id}
            style={[
              styles.alerteCard,
              {
                backgroundColor: colors.background,
                ...colors.shadow.small,
                ...(alerte.type === 'error' && {
                  borderColor: colors.error,
                  backgroundColor: colors.error + '10',
                }),
                ...(alerte.type === 'warning' && {
                  borderColor: colors.warning,
                  backgroundColor: colors.warning + '10',
                }),
                ...(alerte.type === 'info' && {
                  borderColor: colors.info,
                  backgroundColor: colors.info + '10',
                }),
              },
            ]}
            onPress={alerte.action}
            activeOpacity={0.7}
          >
            <Text style={styles.alerteIcon}>{alerte.icon}</Text>
            <Text style={[styles.alerteMessage, { color: colors.text }]} numberOfLines={3}>
              {alerte.message}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {alertes.length > 3 && (
        <TouchableOpacity
          style={[styles.voirToutButton, { borderTopColor: colors.border }]}
          onPress={() => {
            // TODO: Naviguer vers une page dédiée aux alertes
            // Pour l'instant, on peut naviguer vers le module le plus prioritaire
            const alertePrioritaire = alertes[0];
            if (alertePrioritaire) {
              alertePrioritaire.action();
            }
          }}
        >
          <Text style={[styles.voirToutText, { color: colors.primary }]}>
            Voir toutes les alertes ({alertes.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    minHeight: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
  },
  scrollContent: {
    paddingRight: SPACING.md,
  },
  alerteCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginRight: SPACING.md,
    minWidth: 200,
    maxWidth: 280,
    minHeight: 100,
    borderWidth: 2,
    justifyContent: 'center',
  },
  alerteIcon: {
    fontSize: FONT_SIZES.xxl,
    marginBottom: SPACING.sm,
  },
  alerteMessage: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 22,
  },
  voirToutButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  voirToutText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

