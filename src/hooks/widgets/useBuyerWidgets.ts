/**
 * Hook pour les widgets du dashboard acheteur
 * Fournit les données pour les widgets "Achats" et "Dépenses"
 */

import { useMemo } from 'react';
import { useRole } from '../../contexts/RoleContext';
import { useBuyerData } from '../useBuyerData';

export interface PurchasesWidgetData {
  emoji: string;
  title: string;
  primary: number | string;
  secondary: number | string;
  labelPrimary: string;
  labelSecondary: string;
}

export interface ExpensesWidgetData {
  emoji: string;
  title: string;
  primary: number | string;
  secondary: number | string;
  labelPrimary: string;
  labelSecondary: string;
}

export function usePurchasesWidget(): PurchasesWidgetData | null {
  const { currentUser } = useRole();
  const { completedTransactions, activeOffers } = useBuyerData();
  const buyerProfile = currentUser?.roles?.buyer;

  return useMemo(() => {
    if (!buyerProfile) return null;

    const totalPurchases = buyerProfile.purchaseHistory?.totalPurchases || completedTransactions.length;
    const pendingOffers = activeOffers.filter(o => o.status === 'pending' || o.status === 'countered').length;

    return {
      emoji: '🛒',
      title: 'Achats',
      primary: totalPurchases,
      secondary: pendingOffers,
      labelPrimary: 'Total',
      labelSecondary: 'En attente',
    };
  }, [buyerProfile, completedTransactions.length, activeOffers]);
}

export function useExpensesWidget(): ExpensesWidgetData | null {
  const { currentUser } = useRole();
  const { completedTransactions } = useBuyerData();
  const buyerProfile = currentUser?.roles?.buyer;

  return useMemo(() => {
    if (!buyerProfile) return null;

    const totalSpent = buyerProfile.purchaseHistory?.totalSpent || 0;
    const avgTransaction = completedTransactions.length > 0
      ? completedTransactions.reduce((sum, t) => sum + t.finalPrice, 0) / completedTransactions.length
      : 0;

    return {
      emoji: '💰',
      title: 'Dépenses',
      primary: totalSpent.toLocaleString('fr-FR'),
      secondary: avgTransaction > 0 ? Math.round(avgTransaction).toLocaleString('fr-FR') : '0',
      labelPrimary: 'Total FCFA',
      labelSecondary: 'Moyenne',
    };
  }, [buyerProfile, completedTransactions]);
}

