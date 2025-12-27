/**
 * FinanceContent - Contenu selon l'onglet actif
 * Affiche le composant correspondant à l'onglet sélectionné
 */

import React from 'react';
import FinanceGraphiquesComponent from './FinanceGraphiquesComponent';
import FinanceChargesFixesComponent from './FinanceChargesFixesComponent';
import FinanceDepensesComponent from './FinanceDepensesComponent';
import FinanceRevenusComponent from './FinanceRevenusComponent';
import FinanceBilanCompletComponent from './FinanceBilanCompletComponent';
import { FinanceOngletType } from './FinanceTabs';

interface FinanceContentProps {
  ongletActif: FinanceOngletType;
}

export default function FinanceContent({ ongletActif }: FinanceContentProps) {
  switch (ongletActif) {
    case 'vue_ensemble':
      return <FinanceGraphiquesComponent />;
    case 'charges_fixes':
      return <FinanceChargesFixesComponent />;
    case 'depenses':
      return <FinanceDepensesComponent />;
    case 'revenus':
      return <FinanceRevenusComponent />;
    case 'bilan':
      return <FinanceBilanCompletComponent />;
    default:
      return null;
  }
}
