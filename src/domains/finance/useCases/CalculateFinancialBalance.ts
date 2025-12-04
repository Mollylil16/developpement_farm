/**
 * Use Case : Calculer le solde financier
 * 
 * Calcule le solde (revenus - dépenses) pour une période donnée
 */

import type { IFinanceRepository } from '../repositories/IFinanceRepository';

export interface FinancialBalance {
  revenus: number;
  depenses: number;
  chargesFixes: number;
  solde: number;
  margeBrute: number;
}

export interface CalculateFinancialBalanceInput {
  projetId: string;
  dateDebut: string;
  dateFin: string;
}

export class CalculateFinancialBalanceUseCase {
  constructor(private financeRepository: IFinanceRepository) {}

  async execute(input: CalculateFinancialBalanceInput): Promise<FinancialBalance> {
    // Récupérer les revenus de la période
    const revenus = await this.financeRepository.findRevenusByPeriod(
      input.projetId,
      input.dateDebut,
      input.dateFin
    );
    const totalRevenus = revenus.reduce((sum, r) => sum + r.montant, 0);

    // Récupérer les dépenses de la période
    const depenses = await this.financeRepository.findDepensesByPeriod(
      input.projetId,
      input.dateDebut,
      input.dateFin
    );
    const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);

    // Récupérer les charges fixes actives et calculer leur coût pour la période
    const chargesFixes = await this.financeRepository.findChargesFixesActives(input.projetId);
    const totalChargesFixes = this.calculateChargesFixesForPeriod(
      chargesFixes,
      input.dateDebut,
      input.dateFin
    );

    const solde = totalRevenus - totalDepenses - totalChargesFixes;
    const margeBrute = totalRevenus - totalDepenses;

    return {
      revenus: totalRevenus,
      depenses: totalDepenses,
      chargesFixes: totalChargesFixes,
      solde,
      margeBrute,
    };
  }

  /**
   * Calcule le coût des charges fixes pour une période donnée
   */
  private calculateChargesFixesForPeriod(
    charges: any[],
    dateDebut: string,
    dateFin: string
  ): number {
    let total = 0;

    for (const charge of charges) {
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      const mois = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;

      switch (charge.frequence) {
        case 'mensuel':
          total += charge.montant * mois;
          break;
        case 'trimestriel':
          total += charge.montant * Math.ceil(mois / 3);
          break;
        case 'annuel':
          total += charge.montant * Math.ceil(mois / 12);
          break;
      }
    }

    return total;
  }
}

