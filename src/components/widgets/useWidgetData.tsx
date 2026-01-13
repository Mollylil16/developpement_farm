/**
 * Hook pour extraire les données des widgets secondaires
 * Utilise les hooks spécialisés pour chaque type de widget
 */

import { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import type {
  NutritionWidgetData,
  SanteWidgetData,
  PlanningWidgetData,
  CollaborationWidgetData,
  MortalitesWidgetData,
  ProductionWidgetData,
  MarketplaceWidgetData,
  PurchasesWidgetData,
  ExpensesWidgetData,
} from '../../hooks/widgets';
import {
  useNutritionWidget,
  useSanteWidget,
  usePlanningWidget,
  useCollaborationWidget,
  useMortalitesWidget,
  useProductionWidget,
  useMarketplaceWidget,
  usePurchasesWidget,
  useExpensesWidget,
} from '../../hooks/widgets';

type WidgetType =
  | 'nutrition'
  | 'planning'
  | 'collaboration'
  | 'mortalites'
  | 'production'
  | 'sante'
  | 'marketplace'
  | 'purchases'
  | 'expenses';

export type WidgetData =
  | NutritionWidgetData
  | SanteWidgetData
  | PlanningWidgetData
  | CollaborationWidgetData
  | MortalitesWidgetData
  | ProductionWidgetData
  | MarketplaceWidgetData
  | PurchasesWidgetData
  | ExpensesWidgetData;

export function useWidgetData() {
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });

  // Utiliser les hooks spécialisés pour les widgets producteur
  const nutritionData = useNutritionWidget(projetActif?.id);
  const santeData = useSanteWidget(projetActif?.id);
  const planningData = usePlanningWidget(projetActif?.id);
  const collaborationData = useCollaborationWidget(projetActif?.id);
  const mortalitesData = useMortalitesWidget(projetActif?.id);
  const productionData = useProductionWidget(projetActif?.id);
  const marketplaceData = useMarketplaceWidget(projetActif?.id);

  // Utiliser les hooks spécialisés pour les widgets acheteur
  const purchasesData = usePurchasesWidget();
  const expensesData = useExpensesWidget();

  // Fonction pour obtenir les données d'un widget
  const getWidgetData = useMemo(() => {
    return (type: WidgetType): WidgetData | null => {
      // Widgets acheteur (ne nécessitent pas de projet actif)
      if (type === 'purchases') {
        return purchasesData;
      }
      if (type === 'expenses') {
        return expensesData;
      }

      // Widgets producteur (nécessitent un projet actif)
      if (!projetActif) return null;

      switch (type) {
        case 'sante':
          return santeData;
        case 'nutrition':
          return nutritionData;
        case 'planning':
          return planningData;
        case 'collaboration':
          return collaborationData;
        case 'mortalites':
          return mortalitesData;
        case 'production':
          return productionData;
        case 'marketplace':
          return marketplaceData;
        default:
          return null;
      }
    };
  }, [
    projetActif,
    nutritionData,
    santeData,
    planningData,
    collaborationData,
    mortalitesData,
    productionData,
    marketplaceData,
    purchasesData,
    expensesData,
  ]);

  return getWidgetData;
}
