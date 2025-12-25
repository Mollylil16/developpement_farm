/**
 * Actions liées aux stocks d'aliments
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { parseMontant } from '../../../../utils/formatters';
import apiClient from '../../../api/apiClient';

export class StockAlimentActions {
  /**
   * Récupère le statut des stocks
   */
  static async getStockStatus(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    // Récupérer tous les stocks du projet depuis l'API backend
    const stocks = await apiClient.get<any[]>(`/nutrition/stocks-aliments`, {
      params: { projet_id: context.projetId },
    });

    // Filtrer les stocks avec alerte active
    const stocksAlerte = stocks.filter((s) => s.alerte_active);

    // Calculer les totaux par catégorie
    const stocksParCategorie = stocks.reduce(
      (acc, s) => {
        const cat = s.categorie || 'autre';
        if (!acc[cat]) {
          acc[cat] = { total: 0, alertes: 0 };
        }
        acc[cat].total += s.quantite_actuelle || 0;
        if (s.alerte_active) {
          acc[cat].alertes += 1;
        }
        return acc;
      },
      {} as Record<string, { total: number; alertes: number }>
    );

    let message = `Statut des stocks-là :\n`;
    message += `- Total : ${stocks.length} type(s) d'aliment\n`;

    if (stocksAlerte.length > 0) {
      message += `- ⚠️ ${stocksAlerte.length} alerte(s) : stock faible !\n`;
      stocksAlerte.forEach((s) => {
        message += `  • ${s.nom} : ${s.quantite_actuelle} ${s.unite} (seuil : ${s.seuil_alerte} ${s.unite})\n`;
      });
    } else {
      message += `- ✅ Tous les stocks sont suffisants\n`;
    }

    return {
      success: true,
      message,
      data: {
        stocks,
        stocksAlerte,
        stocksParCategorie,
      },
    };
  }

  /**
   * Crée un ingrédient
   */
  static async createIngredient(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    if (!paramsTyped.nom || typeof paramsTyped.nom !== 'string') {
      throw new Error("Le nom de l'ingrédient est requis.");
    }

    // Extraire le prix unitaire
    let prixUnitaire = 0;
    if (paramsTyped.prix_unitaire || paramsTyped.prixUnitaire || paramsTyped.prix) {
      const prixStr = paramsTyped.prix_unitaire || paramsTyped.prixUnitaire || paramsTyped.prix;
      prixUnitaire = typeof prixStr === 'string' ? parseMontant(prixStr) : (prixStr as number);
    }

    if (isNaN(prixUnitaire) || prixUnitaire < 0) {
      throw new Error('Le prix unitaire est requis et doit être un nombre positif.');
    }

    // Mapper l'unité
    const uniteMap: Record<string, string> = {
      kg: 'kg',
      kilogramme: 'kg',
      kilogrammes: 'kg',
      g: 'g',
      gramme: 'g',
      grammes: 'g',
      sac: 'sac',
      sacs: 'sac',
      tonne: 'tonne',
      tonnes: 'tonne',
    };
    const unite = (paramsTyped.unite && typeof paramsTyped.unite === 'string' ? uniteMap[paramsTyped.unite.toLowerCase()] : undefined) || (paramsTyped.unite && typeof paramsTyped.unite === 'string' ? paramsTyped.unite : undefined) || 'kg';

    // Créer l'ingrédient via l'API backend
    const ingredient = await apiClient.post<any>('/nutrition/ingredients', {
      projet_id: context.projetId,
      nom: paramsTyped.nom,
      unite,
      prix_unitaire: prixUnitaire,
      proteine_pourcent: (paramsTyped.proteine_pourcent && typeof paramsTyped.proteine_pourcent === 'number' ? paramsTyped.proteine_pourcent : undefined) || (paramsTyped.proteine && typeof paramsTyped.proteine === 'number' ? paramsTyped.proteine : undefined) || null,
      energie_kcal: (paramsTyped.energie_kcal && typeof paramsTyped.energie_kcal === 'number' ? paramsTyped.energie_kcal : undefined) || (paramsTyped.energie && typeof paramsTyped.energie === 'number' ? paramsTyped.energie : undefined) || null,
    });

    const message = `Ingrédient créé : ${ingredient.nom} - ${prixUnitaire.toLocaleString('fr-FR')} FCFA/${unite}.`;

    return {
      success: true,
      data: ingredient,
      message,
    };
  }
}

