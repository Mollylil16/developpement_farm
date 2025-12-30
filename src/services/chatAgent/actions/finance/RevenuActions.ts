/**
 * Actions liées aux revenus (ventes)
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format } from 'date-fns';
import { parseMontant, extractMontantFromText } from '../../../../utils/formatters';
import { MontantExtractor } from '../../core/extractors/MontantExtractor';
import apiClient from '../../../api/apiClient';

export class RevenuActions {
  /**
   * Crée un revenu (vente)
   */
  static async createRevenu(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Extraire le montant (plusieurs méthodes)
    let montant = 0;
    if (paramsTyped.montant) {
      montant =
        typeof paramsTyped.montant === 'string'
          ? parseMontant(paramsTyped.montant)
          : (paramsTyped.montant as number);
    } else {
      // Essayer de calculer ou extraire depuis le texte
      montant = this.calculateMontant(paramsTyped);
      if (isNaN(montant) || montant <= 0) {
        // Si on a un texte de description, essayer d'extraire le montant
        if (paramsTyped.description || paramsTyped.commentaire) {
          const text = `${paramsTyped.description || ''} ${paramsTyped.commentaire || ''}`;
          const extracted = extractMontantFromText(text);
          if (extracted) montant = extracted;
        }
        // Si toujours pas de montant, essayer depuis le message utilisateur original (si disponible)
        if (
          (isNaN(montant) || montant <= 0) &&
          paramsTyped.userMessage &&
          typeof paramsTyped.userMessage === 'string'
        ) {
          const extracted = extractMontantFromText(paramsTyped.userMessage);
          if (extracted && extracted > 100) {
            // Ignorer les petits nombres (probablement des quantités)
            montant = extracted;
          }
        }
      }
    }

    if (isNaN(montant) || montant <= 0) {
      throw new Error(
        'Le montant de la vente est requis. Veuillez préciser le montant (ex: "800 000 FCFA" ou "800000").'
      );
    }

    const date =
      (paramsTyped.date && typeof paramsTyped.date === 'string'
        ? paramsTyped.date
        : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
    const nombre =
      (paramsTyped.nombre as number) ||
      (paramsTyped.nombre_porcs as number) ||
      (paramsTyped.quantite as number) ||
      1;
    const acheteur =
      (paramsTyped.acheteur && typeof paramsTyped.acheteur === 'string'
        ? paramsTyped.acheteur
        : undefined) ||
      (paramsTyped.client && typeof paramsTyped.client === 'string' ? paramsTyped.client : undefined) ||
      (paramsTyped.buyer && typeof paramsTyped.buyer === 'string' ? paramsTyped.buyer : undefined) ||
      'client';

    const revenu = await apiClient.post<any>('/finance/revenus', {
      projet_id: context.projetId,
      montant,
      categorie: (paramsTyped.categorie && typeof paramsTyped.categorie === 'string'
        ? paramsTyped.categorie
        : 'vente_porc') || 'vente_porc',
      date,
      description:
        (paramsTyped.description && typeof paramsTyped.description === 'string'
          ? paramsTyped.description
          : undefined) || `Vente de ${nombre} porc(s) à ${acheteur}`,
      commentaire:
        paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string'
          ? paramsTyped.commentaire
          : undefined,
      poids_kg:
        (paramsTyped.poids_total as number) ||
        (paramsTyped.poids as number) ||
        (paramsTyped.poids_kg as number) ||
        undefined,
      animal_id:
        paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string'
          ? paramsTyped.animal_id
          : undefined,
    });

    const message = `Vente enregistrée : ${nombre} porc(s) vendu(s) à ${acheteur} pour ${montant.toLocaleString('fr-FR')} FCFA le ${format(new Date(date), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: revenu,
      message,
    };
  }

  /**
   * Calcule un montant depuis différents paramètres
   */
  private static calculateMontant(params: unknown): number {
    const paramsTyped = params as Record<string, unknown>;

    // Montant direct
    if (paramsTyped.montant_total) return Number(paramsTyped.montant_total);
    if (paramsTyped.montant) return Number(paramsTyped.montant);

    // Calcul pour les ventes (nombre × poids × prix)
    if (paramsTyped.nombre && paramsTyped.poids && paramsTyped.prix_unitaire) {
      return Number(paramsTyped.nombre) * Number(paramsTyped.poids) * Number(paramsTyped.prix_unitaire);
    }

    // Calcul pour les ventes (poids total × prix)
    if (paramsTyped.poids_total && paramsTyped.prix_unitaire) {
      return Number(paramsTyped.poids_total) * Number(paramsTyped.prix_unitaire);
    }

    throw new Error('Impossible de calculer le montant. Informations manquantes.');
  }

  /**
   * Récupère les ventes
   */
  static async getVentes(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;
    const joursRecents = (paramsTyped.jours && typeof paramsTyped.jours === 'number' ? paramsTyped.jours : undefined) || 90;

    // Récupérer les revenus avec catégorie "vente_porc"
    const revenus = await apiClient.get<any[]>(`/finance/revenus`, {
      params: { projet_id: context.projetId },
    });

    // Filtrer les ventes
    const ventes = revenus.filter((r) => r.categorie === 'vente_porc' || r.categorie === 'vente');

    // Filtrer par période
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - joursRecents);

    const ventesRecentes = ventes.filter((v) => {
      if (v.date) {
        const dateVente = new Date(v.date);
        return dateVente >= dateLimite;
      }
      return true;
    });

    if (ventesRecentes.length === 0) {
      return {
        success: true,
        message: `Aucune vente enregistrée dans les ${joursRecents} derniers jours.`,
        data: [],
      };
    }

    // Calculer les totaux
    const totalVentes = ventesRecentes.reduce((sum, v) => sum + (v.montant || 0), 0);
    const nombrePorcsVendus = ventesRecentes.reduce((sum, v) => {
      // Extraire le nombre depuis la description ou utiliser 1 par défaut
      const desc = v.description || '';
      const match = desc.match(/(\d+)\s*porc/i);
      return sum + (match ? parseInt(match[1]) : 1);
    }, 0);

    let message = `Ventes (${joursRecents} derniers jours) :\n`;
    message += `• Nombre de ventes : ${ventesRecentes.length}\n`;
    message += `• Porcs vendus : ${nombrePorcsVendus}\n`;
    message += `• Montant total : ${totalVentes.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Prix moyen par porc : ${(totalVentes / nombrePorcsVendus).toLocaleString('fr-FR')} FCFA\n\n`;

    message += `Dernières ventes :\n`;
    ventesRecentes.slice(0, 5).forEach((v) => {
      message += `• ${format(new Date(v.date), 'dd/MM/yyyy')} : ${v.montant.toLocaleString('fr-FR')} FCFA`;
      if (v.description) {
        message += ` (${v.description})`;
      }
      message += '\n';
    });

    return {
      success: true,
      message,
      data: {
        ventes: ventesRecentes,
        total_ventes: ventesRecentes.length,
        nombre_porcs_vendus: nombrePorcsVendus,
        montant_total: totalVentes,
        prix_moyen_par_porc: totalVentes / nombrePorcsVendus,
      },
    };
  }

  /**
   * Analyse les ventes
   */
  static async analyzeVentes(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    // Récupérer les ventes
    const ventesResult = await this.getVentes(params, context);

    if (!ventesResult.success || !ventesResult.data) {
      return ventesResult;
    }

    const data = ventesResult.data as {
      ventes: any[];
      total_ventes: number;
      nombre_porcs_vendus: number;
      montant_total: number;
      prix_moyen_par_porc: number;
    };

    // Analyser les tendances
    const ventes = data.ventes;
    if (ventes.length === 0) {
      return {
        success: true,
        message: 'Aucune vente à analyser.',
        data: null,
      };
    }

    // Ventes par mois
    const ventesParMois: Record<string, { nombre: number; montant: number }> = {};
    ventes.forEach((v) => {
      const mois = format(new Date(v.date), 'MMM yyyy');
      if (!ventesParMois[mois]) {
        ventesParMois[mois] = { nombre: 0, montant: 0 };
      }
      ventesParMois[mois].nombre += 1;
      ventesParMois[mois].montant += v.montant || 0;
    });

    // Tendance
    const mois = Object.keys(ventesParMois).sort();
    let tendance = 'stable';
    if (mois.length >= 2) {
      const premierMois = ventesParMois[mois[0]];
      const dernierMois = ventesParMois[mois[mois.length - 1]];
      const evolution = ((dernierMois.montant - premierMois.montant) / premierMois.montant) * 100;
      if (evolution > 10) {
        tendance = 'hausse';
      } else if (evolution < -10) {
        tendance = 'baisse';
      }
    }

    let message = `Analyse des ventes :\n\n`;
    message += `• Total : ${data.total_ventes} ventes, ${data.nombre_porcs_vendus} porcs, ${data.montant_total.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Prix moyen par porc : ${data.prix_moyen_par_porc.toLocaleString('fr-FR')} FCFA\n`;
    message += `• Tendance : ${tendance}\n\n`;

    message += `Ventes par mois :\n`;
    Object.entries(ventesParMois).forEach(([mois, stats]) => {
      message += `• ${mois} : ${stats.nombre} vente(s), ${stats.montant.toLocaleString('fr-FR')} FCFA\n`;
    });

    return {
      success: true,
      message,
      data: {
        ...data,
        ventes_par_mois: ventesParMois,
        tendance,
      },
    };
  }

  /**
   * Met à jour un revenu (vente)
   */
  static async updateRevenu(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // ID du revenu à modifier (requis)
    const revenuId = paramsTyped.id || paramsTyped.revenu_id;
    if (!revenuId || typeof revenuId !== 'string') {
      throw new Error('L\'ID du revenu à modifier est requis. Veuillez préciser quel revenu modifier.');
    }

    // Construire l'objet de mise à jour avec seulement les champs fournis
    const updateData: Record<string, unknown> = {};

    if (paramsTyped.montant !== undefined) {
      const montant = typeof paramsTyped.montant === 'string'
        ? parseMontant(paramsTyped.montant)
        : (paramsTyped.montant as number);
      if (!isNaN(montant) && montant > 0) {
        updateData.montant = montant;
      }
    }

    if (paramsTyped.date && typeof paramsTyped.date === 'string') {
      updateData.date = paramsTyped.date;
    }

    if (paramsTyped.acheteur || paramsTyped.client) {
      const acheteur = paramsTyped.acheteur || paramsTyped.client;
      if (typeof acheteur === 'string') {
        updateData.description = `Vente à ${acheteur}`;
      }
    }

    if (paramsTyped.description && typeof paramsTyped.description === 'string') {
      updateData.description = paramsTyped.description;
    }

    if (paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string') {
      updateData.commentaire = paramsTyped.commentaire;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('Aucune modification à apporter. Veuillez préciser ce que tu veux modifier (montant, date, etc.).');
    }

    // Appeler l'API backend pour mettre à jour
    const revenu = await apiClient.patch<any>(`/finance/revenus/${revenuId}`, updateData);

    const message = `✅ Revenu modifié avec succès ! ${updateData.montant ? `Nouveau montant : ${(updateData.montant as number).toLocaleString('fr-FR')} FCFA.` : ''}`;

    return {
      success: true,
      data: revenu,
      message,
    };
  }
}

