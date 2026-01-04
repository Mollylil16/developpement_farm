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
   * Pour les ventes de porcs, utilise le nouvel endpoint avec validation stricte des sujets vendus
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

    const categorie = (paramsTyped.categorie && typeof paramsTyped.categorie === 'string'
      ? paramsTyped.categorie
      : 'vente_porc') || 'vente_porc';

    // ========== VALIDATION STRICTE POUR VENTES DE PORCS ==========
    if (categorie === 'vente_porc') {
      // Récupérer le mode de gestion du projet
      let managementMethod = 'individual';
      try {
        const projet = await apiClient.get<any>(`/projets/${context.projetId}`);
        managementMethod = projet.management_method || 'individual';
      } catch (error) {
        // Si erreur, utiliser 'individual' par défaut
      }

      // Vérifier l'état de vente dans les params (passé depuis ChatAgentService)
      const venteState = paramsTyped.venteState as
        | 'demande_loges'
        | 'affichage_sujets'
        | 'selection_sujets'
        | 'demande_montant'
        | undefined;

      // Vérifier si les sujets sont identifiés
      const animalIds = paramsTyped.animal_ids as string[] | undefined;
      const animalId = paramsTyped.animal_id as string | undefined;
      const batchId = paramsTyped.batch_id as string | undefined;
      const quantite = paramsTyped.quantite as number | undefined;
      const loges = paramsTyped.loges as string[] | string | undefined;
      const logesList = Array.isArray(loges) ? loges : loges ? [loges] : undefined;

      const hasAnimalIds = (animalIds && animalIds.length > 0) || (animalId && animalId.length > 0);
      const hasBatchInfo = batchId && quantite && quantite > 0;

      // ========== NOUVEAU FLOW : DEMANDE PAR LOGES ==========
      // Si pas d'IDs et pas d'état de vente, commencer le nouveau flow
      if (!hasAnimalIds && !hasBatchInfo && !venteState) {
        // Demander les loges
        return {
          success: false,
          needsClarification: true,
          clarificationType: 'demande_loges',
          message:
            "D'accord ! Pour enregistrer cette vente, pouvez-vous me indiquer la ou les loge(s) d'où proviennent les porcs vendus ?",
          missingParams: ['loges'],
          actionType: 'create_revenu',
          data: {
            montant,
            date,
            nombre,
            acheteur,
            categorie,
            managementMethod,
            venteState: 'demande_loges',
          },
        };
      }

      // Si état = demande_loges et loges fournies, récupérer les sujets
      if (venteState === 'demande_loges' && logesList && logesList.length > 0) {
        try {
          // Récupérer les animaux des loges
          const logesParam = logesList.join(',');
          const animaux = await apiClient.get<any[]>(
            `/production/animaux/by-loges?projet_id=${context.projetId}&loges=${encodeURIComponent(logesParam)}`
          );

          if (!animaux || animaux.length === 0) {
            return {
              success: false,
              needsClarification: true,
              clarificationType: 'demande_loges',
              message: `Aucun porc actif trouvé dans les loges "${logesList.join(', ')}". Pouvez-vous vérifier les noms des loges ?`,
              missingParams: ['loges'],
              actionType: 'create_revenu',
              data: {
                montant,
                date,
                nombre,
                acheteur,
                categorie,
                managementMethod,
                venteState: 'demande_loges',
              },
            };
          }

          // Construire le message avec la liste des sujets
          let message = `Voici les porcs dans les loges sélectionnées :\n\n`;
          animaux.forEach((animal, index) => {
            const poids = animal.poids_kg ? `${animal.poids_kg} kg` : 'poids non disponible';
            const datePesee = animal.date_derniere_pesee
              ? format(new Date(animal.date_derniere_pesee), 'dd/MM/yyyy')
              : 'non disponible';
            const race = animal.race ? ` - ${animal.race}` : '';
            message += `• [ID: ${animal.id}] – ${poids} (dernière pesée : ${datePesee})${race}\n`;
          });
          message += `\nCliquez sur les IDs des porcs que vous avez vendus.`;

          return {
            success: false,
            needsClarification: true,
            clarificationType: 'selection_sujets',
            message,
            missingParams: ['animal_ids'],
            actionType: 'create_revenu',
            data: {
              montant,
              date,
              nombre,
              acheteur,
              categorie,
              managementMethod,
              venteState: 'affichage_sujets',
              sujetsDisponibles: animaux,
              loges: logesList,
            },
          };
        } catch (error: any) {
          return {
            success: false,
            needsClarification: true,
            clarificationType: 'demande_loges',
            message: `Erreur lors de la récupération des porcs : ${error.message || 'Erreur inconnue'}. Pouvez-vous réessayer ?`,
            missingParams: ['loges'],
            actionType: 'create_revenu',
            data: {
              montant,
              date,
              nombre,
              acheteur,
              categorie,
              managementMethod,
              venteState: 'demande_loges',
            },
          };
        }
      }

      // Si état = affichage_sujets et IDs sélectionnés, demander le montant
      if (venteState === 'affichage_sujets' && hasAnimalIds) {
        const selectedIds = animalIds || (animalId ? [animalId] : []);
        return {
          success: false,
          needsClarification: true,
          clarificationType: 'demande_montant',
          message: `Parfait ! Vous avez sélectionné les porcs ID: ${selectedIds.join(', ')}. Quel est le montant de la vente ?`,
          missingParams: ['montant'],
          actionType: 'create_revenu',
          data: {
            date,
            nombre: selectedIds.length,
            acheteur,
            categorie,
            managementMethod,
            venteState: 'demande_montant',
            sujetsSelectionnes: selectedIds,
          },
        };
      }

      // Si état = demande_montant et montant fourni, enregistrer la vente
      if (venteState === 'demande_montant' && hasAnimalIds && montant > 0) {
        // Continuer avec l'enregistrement normal ci-dessous
      }

      // Si les sujets ne sont toujours pas identifiés (fallback), demander clarification classique
      if (!hasAnimalIds && !hasBatchInfo && venteState !== 'demande_montant') {
        const clarificationMessage =
          managementMethod === 'batch'
            ? 'Pour enregistrer cette vente, de quelle loge/bande proviennent les porcs vendus, et quelle quantité avez-vous vendue ?'
            : 'Pour enregistrer cette vente, pouvez-vous me fournir l\'ID (ou les IDs) du/des porc(s) vendu(s) ?';

        return {
          success: false,
          needsClarification: true,
          clarificationType: 'demande_identification_sujets',
          message: clarificationMessage,
          missingParams: managementMethod === 'batch' ? ['batch_id', 'quantite'] : ['animal_ids'],
          data: {
            montant,
            date,
            nombre,
            acheteur,
            categorie,
            managementMethod,
          },
        };
      }

      // Utiliser le nouvel endpoint pour les ventes de porcs
      const venteData: any = {
        projet_id: context.projetId,
        montant,
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
      };

      // Ajouter l'identification des sujets selon le mode
      if (hasAnimalIds) {
        venteData.animal_ids = animalIds || (animalId ? [animalId] : []);
      } else if (hasBatchInfo) {
        venteData.batch_id = batchId;
        venteData.quantite = quantite;
      }

      const revenu = await apiClient.post<any>('/finance/ventes-porcs', venteData);

      const message = `✅ Vente enregistrée avec succès ! ${revenu.message || `${nombre} porc(s) vendu(s) à ${acheteur} pour ${montant.toLocaleString('fr-FR')} FCFA le ${format(new Date(date), 'dd/MM/yyyy')}.`}`;

      return {
        success: true,
        data: revenu,
        message,
      };
    }

    // Pour les autres catégories de revenus, utiliser l'endpoint classique
    const revenu = await apiClient.post<any>('/finance/revenus', {
      projet_id: context.projetId,
      montant,
      categorie,
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
   * Trouve un revenu par description/date
   */
  private static async findRevenuByDescription(
    params: Record<string, unknown>,
    context: AgentContext
  ): Promise<string | null> {
    try {
      // Récupérer les revenus récents
      const revenus = await apiClient.get<any[]>(`/finance/revenus`, {
        params: { projet_id: context.projetId },
      });

      // Filtrer par date si fournie
      if (params.date && typeof params.date === 'string') {
        const dateStr = params.date;
        const revenusParDate = revenus.filter((r) => {
          if (!r.date) return false;
          const rDate = new Date(r.date).toISOString().split('T')[0];
          return rDate === dateStr || rDate === new Date(dateStr).toISOString().split('T')[0];
        });
        if (revenusParDate.length === 1) {
          return revenusParDate[0].id;
        }
        if (revenusParDate.length > 1) {
          // Plusieurs revenus pour cette date, retourner le plus récent
          const sorted = revenusParDate.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          return sorted[0]?.id || null;
        }
      }

      // Chercher "dernier", "premier", etc.
      const description = params.description as string;
      if (description) {
        const normalized = description.toLowerCase();
        if (normalized.includes('dernier') || normalized.includes('dernière')) {
          // Trier par date décroissante
          const sorted = revenus.sort(
            (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
          );
          return sorted[0]?.id || null;
        }
        if (normalized.includes('premier') || normalized.includes('première')) {
          const sorted = revenus.sort(
            (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
          );
          return sorted[0]?.id || null;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Met à jour un revenu (vente)
   */
  static async updateRevenu(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // ID du revenu à modifier (peut être fourni directement ou cherché)
    let revenuId = paramsTyped.id || paramsTyped.revenu_id;
    
    // Si pas d'ID direct, chercher par description/date
    if (!revenuId || typeof revenuId !== 'string') {
      revenuId = await this.findRevenuByDescription(paramsTyped, context);
    }
    
    if (!revenuId || typeof revenuId !== 'string') {
      throw new Error('Impossible d\'identifier le revenu à modifier. Peux-tu préciser l\'ID, la date ou la description (ex: "la dernière vente", "celle d\'hier") ?');
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

  /**
   * Supprime un revenu (vente)
   */
  static async deleteRevenu(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Identifier le revenu à supprimer
    let revenuId = paramsTyped.id || paramsTyped.revenu_id;

    // Si pas d'ID direct, chercher par description/date
    if (!revenuId || typeof revenuId !== 'string') {
      revenuId = await this.findRevenuByDescription(paramsTyped, context);
    }

    if (!revenuId || typeof revenuId !== 'string') {
      throw new Error('Impossible d\'identifier le revenu à supprimer. Peux-tu préciser l\'ID, la date ou la description (ex: "la dernière vente", "celle d\'hier") ?');
    }

    // Supprimer via l'API
    try {
      await apiClient.delete(`/finance/revenus/${revenuId}`);
      return {
        success: true,
        message: '✅ Revenu supprimé avec succès !',
      };
    } catch (error: any) {
      const errorMessage = error?.message || error?.errorData?.message || 'Erreur lors de la suppression';
      throw new Error(`Impossible de supprimer le revenu : ${errorMessage}`);
    }
  }
}

