/**
 * Actions liées aux stocks d'aliments
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { parseMontant } from '../../../../utils/formatters';
import { FORMULES_RECOMMANDEES } from '../../../../types/nutrition';
import type { TypePorc } from '../../../../types/nutrition';
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

  /**
   * Propose une composition alimentaire personnalisée
   */
  static async proposeCompositionAlimentaire(
    params: unknown,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Déterminer le type de porc
    let typePorc: TypePorc = 'porc_croissance';
    const typeStr = (paramsTyped.type_porc || paramsTyped.type || paramsTyped.stade || '').toString().toLowerCase();

    if (typeStr.includes('porcelet') || typeStr.includes('porcelet')) {
      typePorc = 'porcelet';
    } else if (typeStr.includes('truie') && (typeStr.includes('gestante') || typeStr.includes('gestation'))) {
      typePorc = 'truie_gestante';
    } else if (typeStr.includes('truie') && (typeStr.includes('allaitante') || typeStr.includes('lactation'))) {
      typePorc = 'truie_allaitante';
    } else if (typeStr.includes('verrat')) {
      typePorc = 'verrat';
    } else {
      typePorc = 'porc_croissance';
    }

    // Récupérer la formule recommandée
    const formule = FORMULES_RECOMMANDEES[typePorc];

    if (!formule) {
      return {
        success: false,
        message: `Type de porc non reconnu : ${typeStr}`,
      };
    }

    // Récupérer les ingrédients disponibles dans les stocks
    const ingredients = await apiClient.get<any[]>(`/nutrition/ingredients`, {
      params: { projet_id: context.projetId },
    });

    // Adapter la composition avec les ingrédients disponibles
    const compositionAdaptee = formule.composition.map((comp) => {
      // Chercher un ingrédient correspondant dans les stocks
      const ingredientDisponible = ingredients.find(
        (ing) =>
          ing.nom.toLowerCase().includes(comp.nom.toLowerCase()) ||
          comp.nom.toLowerCase().includes(ing.nom.toLowerCase())
      );

      return {
        ...comp,
        ingredient_id: ingredientDisponible?.id || '',
        nom: ingredientDisponible?.nom || comp.nom,
        prix_unitaire: ingredientDisponible?.prix_unitaire || 0,
        disponible: !!ingredientDisponible,
      };
    });

    // Construire le message
    let message = `Composition alimentaire recommandée pour ${formule.nom} :\n\n`;
    message += `${formule.description}\n\n`;
    message += `Composition (adaptée aux ingrédients locaux disponibles) :\n`;

    compositionAdaptee.forEach((comp) => {
      const disponible = comp.disponible ? '✅' : '⚠️';
      message += `${disponible} ${comp.nom} : ${comp.pourcentage}%`;
      if (comp.prix_unitaire > 0) {
        message += ` (${comp.prix_unitaire.toLocaleString('fr-FR')} FCFA/kg)`;
      }
      if (!comp.disponible) {
        message += ` (non disponible dans tes stocks)`;
      }
      message += '\n';
    });

    // Conseils spécifiques pour le climat ivoirien
    message += `\nConseils pour le climat ivoirien :\n`;
    message += `• Utilise des ingrédients locaux disponibles (maïs, soja, son de blé)\n`;
    message += `• Assure-toi d'avoir de l'eau propre en permanence\n`;
    message += `• Stocke les aliments dans un endroit sec et aéré\n`;
    message += `• Évite les aliments moisis ou contaminés`;

    return {
      success: true,
      message,
      data: {
        type_porc: typePorc,
        formule: {
          ...formule,
          composition: compositionAdaptee,
        },
        ingredients_disponibles: ingredients.length,
      },
    };
  }

  /**
   * Calcule la consommation moyenne d'aliments
   */
  static async calculateConsommationMoyenne(
    params: unknown,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;
    const periodeJours = (paramsTyped.jours && typeof paramsTyped.jours === 'number' ? paramsTyped.jours : undefined) || 30;

    // Récupérer les stocks et leurs mouvements
    const stocks = await apiClient.get<any[]>(`/nutrition/stocks-aliments`, {
      params: { projet_id: context.projetId },
    });

    // Récupérer les animaux actifs
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: context.projetId },
    });

    const animauxActifs = animaux.filter((a) => a.statut === 'actif');

    if (animauxActifs.length === 0) {
      return {
        success: false,
        message: 'Aucun animal actif trouvé.',
      };
    }

    // Calculer la consommation totale (approximation basée sur les stocks)
    // Note: Cette méthode est une approximation. Pour une mesure précise, il faudrait
    // enregistrer les sorties de stocks avec dates.
    const consommationTotale = stocks.reduce((sum, stock) => {
      // Estimation basée sur la quantité initiale - quantité actuelle
      // (si disponible dans les données)
      const consommationStock = stock.quantite_initial || 0 - (stock.quantite_actuelle || 0);
      return sum + Math.max(0, consommationStock);
    }, 0);

    // Consommation moyenne par animal
    const consommationMoyenneParAnimal = consommationTotale / animauxActifs.length;
    const consommationMoyenneParJour = consommationMoyenneParAnimal / periodeJours;

    // Consommation moyenne par catégorie
    const consommationParCategorie: Record<string, number> = {};
    animauxActifs.forEach((animal) => {
      const categorie = animal.categorie_poids || 'autre';
      if (!consommationParCategorie[categorie]) {
        consommationParCategorie[categorie] = 0;
      }
      // Estimation basée sur la catégorie (porcelet consomme moins, truie allaitante plus)
      let facteur = 1;
      if (categorie === 'porcelet') {
        facteur = 0.3;
      } else if (categorie === 'truie_allaitante') {
        facteur = 1.5;
      } else if (categorie === 'truie_gestante') {
        facteur = 1.2;
      }
      consommationParCategorie[categorie] += consommationMoyenneParJour * facteur;
    });

    let message = `Consommation moyenne d'aliments (${periodeJours} derniers jours) :\n\n`;
    message += `• Animaux actifs : ${animauxActifs.length}\n`;
    message += `• Consommation totale estimée : ${consommationTotale.toFixed(1)} kg\n`;
    message += `• Consommation moyenne par animal : ${consommationMoyenneParAnimal.toFixed(2)} kg\n`;
    message += `• Consommation moyenne par jour/animal : ${consommationMoyenneParJour.toFixed(2)} kg\n\n`;

    message += `Consommation par catégorie (estimation) :\n`;
    Object.entries(consommationParCategorie).forEach(([categorie, consommation]) => {
      const nombreAnimaux = animauxActifs.filter((a) => (a.categorie_poids || 'autre') === categorie).length;
      if (nombreAnimaux > 0) {
        message += `• ${categorie} (${nombreAnimaux} animal(s)) : ${(consommation / nombreAnimaux).toFixed(2)} kg/jour/animal\n`;
      }
    });

    message += `\nNote : Ces valeurs sont des estimations. Pour une mesure précise, enregistre les sorties de stocks avec dates.`;

    return {
      success: true,
      message,
      data: {
        periode_jours: periodeJours,
        animaux_actifs: animauxActifs.length,
        consommation_totale: consommationTotale,
        consommation_moyenne_par_animal: consommationMoyenneParAnimal,
        consommation_moyenne_par_jour: consommationMoyenneParJour,
        consommation_par_categorie: consommationParCategorie,
      },
    };
  }
}

