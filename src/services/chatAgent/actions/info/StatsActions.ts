/**
 * Actions liées aux statistiques
 * V2.0 - Support mode batch (bande) et individuel
 */

import { AgentActionResult, AgentContext } from '../../../../types/chatAgent';
import { format } from 'date-fns';
import apiClient from '../../../api/apiClient';
import { logger } from '../../../../utils/logger';

export class StatsActions {
  /**
   * Récupère les statistiques (supporte mode batch et individuel)
   */
  static async getStatistics(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    try {
      // 1. Récupérer le projet pour connaître le mode d'élevage
      let isModeBatch = false;
      try {
        const projet = await apiClient.get<any>(`/projets/${context.projetId}`);
        isModeBatch = projet?.management_method === 'batch';
        logger.debug(`[StatsActions] Mode d'élevage: ${isModeBatch ? 'batch' : 'individuel'}`);
      } catch {
        logger.warn('[StatsActions] Impossible de récupérer le projet, mode individuel par défaut');
      }

      // 2. Récupérer les données des animaux selon le mode
      let statsAnimaux = { actifs: 0, truies: 0, verrats: 0, porcelets: 0, loges: 0 };
      let statsPesees = { nombrePesees: 0, poidsMoyen: 0 };

      if (isModeBatch) {
        // MODE BATCH: Récupérer les batches et batch-weighings
        const batches = await this.safeApiGet<any[]>(`/batch-pigs/projet/${context.projetId}`, {});
        const batchWeighings = await this.safeApiGet<any[]>(`/batch-weighings/projet/${context.projetId}`, {});

        // Statistiques des animaux en mode batch
        let totalAnimaux = 0;
        let truies = 0;
        let verrats = 0;
        let porcelets = 0;

        (batches || []).forEach((batch: any) => {
          const count = (batch.male_count || 0) + (batch.female_count || 0) + (batch.castrated_count || 0);
          totalAnimaux += count;
          
          // Catégoriser selon le type de batch
          const category = batch.category?.toLowerCase() || '';
          if (category.includes('truie') || category.includes('reproductrice')) {
            truies += batch.female_count || count;
          } else if (category.includes('verrat') || category.includes('reproducteur')) {
            verrats += batch.male_count || count;
          } else if (category.includes('porcelet')) {
            porcelets += count;
          }
        });

        statsAnimaux = {
          actifs: totalAnimaux,
          truies,
          verrats,
          porcelets,
          loges: (batches || []).length,
        };

        // Statistiques des pesées en mode batch
        const weighings = batchWeighings || [];
        const totalWeight = weighings.reduce((sum: number, w: any) => sum + (w.average_weight_kg || 0), 0);
        statsPesees = {
          nombrePesees: weighings.length,
          poidsMoyen: weighings.length > 0 ? totalWeight / weighings.length : 0,
        };

      } else {
        // MODE INDIVIDUEL: Récupérer les animaux individuels
        const animaux = await this.safeApiGet<any[]>('/production/animaux', { projet_id: context.projetId });
        const pesees = await this.safeApiGet<any[]>('/production/pesees', { projet_id: context.projetId });

        statsAnimaux = {
          actifs: (animaux || []).filter((a: any) => a.statut === 'actif').length,
          truies: (animaux || []).filter((a: any) => a.sexe === 'femelle' && a.reproducteur).length,
          verrats: (animaux || []).filter((a: any) => a.sexe === 'male' && a.reproducteur).length,
          porcelets: (animaux || []).filter((a: any) => a.categorie_poids === 'porcelet').length,
          loges: 0,
        };

        const totalWeight = (pesees || []).reduce((sum: number, p: any) => sum + (p.poids_kg || 0), 0);
        statsPesees = {
          nombrePesees: (pesees || []).length,
          poidsMoyen: (pesees || []).length > 0 ? totalWeight / (pesees || []).length : 0,
        };
      }

      // 3. Statistiques financières (identique pour les deux modes)
      const revenus = await this.safeApiGet<any[]>('/finance/revenus', { projet_id: context.projetId });
      const depenses = await this.safeApiGet<any[]>('/finance/depenses-ponctuelles', { projet_id: context.projetId });

      const totalRevenus = (revenus || []).reduce((sum: number, r: any) => sum + (r.montant || 0), 0);
      const totalDepenses = (depenses || []).reduce((sum: number, d: any) => sum + (d.montant || 0), 0);
      const solde = totalRevenus - totalDepenses;

      // Statistiques des dépenses par catégorie
      const depensesParCategorie = (depenses || []).reduce(
        (acc: Record<string, number>, d: any) => {
          const cat = d.categorie || 'autre';
          acc[cat] = (acc[cat] || 0) + (d.montant || 0);
          return acc;
        },
        {} as Record<string, number>
      );

      const statistics = {
        modeElevage: isModeBatch ? 'batch' : 'individuel',
        animaux: statsAnimaux,
        finances: {
          totalRevenus,
          totalDepenses,
          solde,
          nombreVentes: (revenus || []).length,
          nombreDepenses: (depenses || []).length,
          depensesParCategorie,
        },
        pesees: statsPesees,
      };

      // 4. Construire le message selon le mode
      let message: string;
      if (isModeBatch) {
        message = `📊 **Statistiques de ton élevage (mode bande):**

🐷 **Cheptel:**
• ${statsAnimaux.loges} loges actives
• ${statsAnimaux.actifs} animaux au total
${statsAnimaux.truies > 0 ? `• ${statsAnimaux.truies} truies reproductrices` : ''}
${statsAnimaux.verrats > 0 ? `• ${statsAnimaux.verrats} verrats reproducteurs` : ''}
${statsAnimaux.porcelets > 0 ? `• ${statsAnimaux.porcelets} porcelets` : ''}

💰 **Finances:**
• Revenus: ${totalRevenus.toLocaleString('fr-FR')} FCFA
• Dépenses: ${totalDepenses.toLocaleString('fr-FR')} FCFA
• Solde: ${solde >= 0 ? '+' : ''}${solde.toLocaleString('fr-FR')} FCFA

⚖️ **Pesées:**
• ${statsPesees.nombrePesees} pesées effectuées
• Poids moyen: ${statsPesees.poidsMoyen.toFixed(1)} kg`;
      } else {
        message = `📊 **Statistiques de ton élevage:**

🐷 **Cheptel:**
• ${statsAnimaux.actifs} animaux actifs
• ${statsAnimaux.truies} truies, ${statsAnimaux.verrats} verrats
• ${statsAnimaux.porcelets} porcelets

💰 **Finances:**
• Revenus: ${totalRevenus.toLocaleString('fr-FR')} FCFA
• Dépenses: ${totalDepenses.toLocaleString('fr-FR')} FCFA
• Solde: ${solde >= 0 ? '+' : ''}${solde.toLocaleString('fr-FR')} FCFA

⚖️ **Pesées:**
• ${statsPesees.nombrePesees} pesées effectuées
• Poids moyen: ${statsPesees.poidsMoyen.toFixed(1)} kg`;
      }

      return {
        success: true,
        message,
        data: statistics,
      };
    } catch (error) {
      logger.error('[StatsActions] Erreur getStatistics:', error);
      return {
        success: false,
        message: "Désolé, je n'ai pas pu récupérer les statistiques. Vérifie ta connexion et réessaie.",
        data: null,
      };
    }
  }

  /**
   * Appel API sécurisé avec gestion d'erreur
   */
  private static async safeApiGet<T>(endpoint: string, params: Record<string, string | null | undefined>): Promise<T | null> {
    try {
      return await apiClient.get<T>(endpoint, { params });
    } catch (error) {
      logger.warn(`[StatsActions] Erreur API ${endpoint}:`, error);
      return null;
    }
  }

  /**
   * Récupère le détail des pesées (supporte mode batch et individuel)
   */
  static async getWeighingDetails(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    try {
      // Récupérer le mode d'élevage
      let isModeBatch = false;
      try {
        const projet = await apiClient.get<any>(`/projets/${context.projetId}`);
        isModeBatch = projet?.management_method === 'batch';
      } catch {
        // Mode individuel par défaut
      }

      let weighings: any[] = [];
      let message = '';

      if (isModeBatch) {
        // MODE BATCH
        const batches = await this.safeApiGet<any[]>(`/batch-pigs/projet/${context.projetId}`, {});
        const batchWeighings = await this.safeApiGet<any[]>(`/batch-weighings/projet/${context.projetId}`, {});

        weighings = batchWeighings || [];

        if (weighings.length === 0) {
          message = `⚖️ **Suivi des pesées (mode bande):**\n\nAucune pesée enregistrée pour le moment.\n\n💡 Tu peux enregistrer une pesée pour une loge dans Production > Suivi de pesée.`;
        } else {
          // Grouper par batch
          const weighingsByBatch = new Map<string, any[]>();
          weighings.forEach((w: any) => {
            const batchId = w.batch_id;
            if (!weighingsByBatch.has(batchId)) {
              weighingsByBatch.set(batchId, []);
            }
            weighingsByBatch.get(batchId)!.push(w);
          });

          // Construire le message
          const lines: string[] = [`⚖️ **Suivi des pesées (mode bande):**\n`];
          
          for (const [batchId, batchWeighings] of weighingsByBatch) {
            const batch = (batches || []).find((b: any) => b.id === batchId);
            const batchName = batch?.pen_name || 'Loge inconnue';
            const lastWeighing = batchWeighings.sort((a: any, b: any) => 
              new Date(b.weighing_date || b.created_at).getTime() - new Date(a.weighing_date || a.created_at).getTime()
            )[0];
            
            const avgWeight = lastWeighing?.average_weight_kg || 0;
            const totalAnimals = (batch?.male_count || 0) + (batch?.female_count || 0) + (batch?.castrated_count || 0);
            
            lines.push(`\n🐷 **${batchName}** (${totalAnimals} animaux)`);
            lines.push(`   • Dernière pesée: ${avgWeight.toFixed(1)} kg (moyenne)`);
            lines.push(`   • Nombre de pesées: ${batchWeighings.length}`);
          }

          // Statistiques globales
          const totalWeight = weighings.reduce((sum: number, w: any) => sum + (w.average_weight_kg || 0), 0);
          const globalAvg = weighings.length > 0 ? totalWeight / weighings.length : 0;
          
          lines.push(`\n📊 **Résumé global:**`);
          lines.push(`• ${weighings.length} pesées au total`);
          lines.push(`• Poids moyen global: ${globalAvg.toFixed(1)} kg`);
          lines.push(`• ${weighingsByBatch.size} loges suivies`);

          message = lines.join('\n');
        }
      } else {
        // MODE INDIVIDUEL
        const animaux = await this.safeApiGet<any[]>('/production/animaux', { projet_id: context.projetId });
        const pesees = await this.safeApiGet<any[]>('/production/pesees', { projet_id: context.projetId });

        weighings = pesees || [];

        if (weighings.length === 0) {
          message = `⚖️ **Suivi des pesées:**\n\nAucune pesée enregistrée pour le moment.\n\n💡 Tu peux enregistrer une pesée dans Production > Suivi de pesée.`;
        } else {
          // Trier par date décroissante
          weighings.sort((a: any, b: any) => 
            new Date(b.date_pesee || b.created_at).getTime() - new Date(a.date_pesee || a.created_at).getTime()
          );

          // Dernières pesées (max 5)
          const recentWeighings = weighings.slice(0, 5);
          
          const lines: string[] = [`⚖️ **Suivi des pesées:**\n`];
          lines.push(`📋 **Dernières pesées:**\n`);
          
          for (const w of recentWeighings) {
            const animal = (animaux || []).find((a: any) => a.id === w.animal_id);
            const animalName = animal?.code || animal?.nom || 'Animal inconnu';
            const date = w.date_pesee ? format(new Date(w.date_pesee), 'dd/MM/yyyy') : 'Date inconnue';
            lines.push(`• **${animalName}**: ${w.poids_kg?.toFixed(1) || 0} kg (${date})`);
          }

          // Statistiques
          const totalWeight = weighings.reduce((sum: number, p: any) => sum + (p.poids_kg || 0), 0);
          const avgWeight = weighings.length > 0 ? totalWeight / weighings.length : 0;
          
          // Trouver min et max
          const weights = weighings.map((w: any) => w.poids_kg || 0).filter((w: number) => w > 0);
          const minWeight = weights.length > 0 ? Math.min(...weights) : 0;
          const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;

          lines.push(`\n📊 **Statistiques:**`);
          lines.push(`• Total: ${weighings.length} pesées`);
          lines.push(`• Poids moyen: ${avgWeight.toFixed(1)} kg`);
          lines.push(`• Poids min: ${minWeight.toFixed(1)} kg`);
          lines.push(`• Poids max: ${maxWeight.toFixed(1)} kg`);

          message = lines.join('\n');
        }
      }

      return {
        success: true,
        message,
        data: { weighings, count: weighings.length },
      };
    } catch (error) {
      logger.error('[StatsActions] Erreur getWeighingDetails:', error);
      return {
        success: false,
        message: "Désolé, je n'ai pas pu récupérer les pesées. Vérifie ta connexion.",
        data: null,
      };
    }
  }

  /**
   * Récupère le détail du cheptel (supporte mode batch et individuel)
   */
  static async getCheptelDetails(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    try {
      // Récupérer le mode d'élevage
      let isModeBatch = false;
      try {
        const projet = await apiClient.get<any>(`/projets/${context.projetId}`);
        isModeBatch = projet?.management_method === 'batch';
      } catch {
        // Mode individuel par défaut
      }

      let message = '';

      if (isModeBatch) {
        // MODE BATCH
        const batches = await this.safeApiGet<any[]>(`/batch-pigs/projet/${context.projetId}`, {});
        
        if (!batches || batches.length === 0) {
          message = `🐷 **Détail du cheptel (mode bande):**\n\nAucune loge enregistrée.\n\n💡 Crée une loge dans Production pour commencer le suivi.`;
        } else {
          const lines: string[] = [`🐷 **Détail du cheptel (${batches.length} loges):**\n`];
          
          let totalAnimaux = 0;
          
          for (const batch of batches) {
            const total = (batch.male_count || 0) + (batch.female_count || 0) + (batch.castrated_count || 0);
            totalAnimaux += total;
            
            lines.push(`\n📦 **${batch.pen_name || 'Loge sans nom'}**`);
            lines.push(`   • Catégorie: ${batch.category || 'Non définie'}`);
            lines.push(`   • Effectif: ${total} animaux`);
            if (batch.male_count > 0) lines.push(`   • Mâles: ${batch.male_count}`);
            if (batch.female_count > 0) lines.push(`   • Femelles: ${batch.female_count}`);
            if (batch.castrated_count > 0) lines.push(`   • Castrés: ${batch.castrated_count}`);
            if (batch.average_weight_kg > 0) lines.push(`   • Poids moyen: ${batch.average_weight_kg.toFixed(1)} kg`);
          }

          lines.push(`\n📊 **Total: ${totalAnimaux} animaux dans ${batches.length} loges**`);
          message = lines.join('\n');
        }
      } else {
        // MODE INDIVIDUEL
        const animaux = await this.safeApiGet<any[]>('/production/animaux', { projet_id: context.projetId });
        
        if (!animaux || animaux.length === 0) {
          message = `🐷 **Détail du cheptel:**\n\nAucun animal enregistré.\n\n💡 Ajoute un animal dans Production pour commencer le suivi.`;
        } else {
          const actifs = animaux.filter((a: any) => a.statut === 'actif');
          const truies = actifs.filter((a: any) => a.sexe === 'femelle' && a.reproducteur);
          const verrats = actifs.filter((a: any) => a.sexe === 'male' && a.reproducteur);
          const porcelets = actifs.filter((a: any) => a.categorie_poids === 'porcelet');
          const enCroissance = actifs.filter((a: any) => a.categorie_poids === 'croissance');
          const enFinition = actifs.filter((a: any) => a.categorie_poids === 'finition');

          const lines: string[] = [`🐷 **Détail du cheptel (${actifs.length} actifs):**\n`];
          
          if (truies.length > 0) {
            lines.push(`\n👩‍🌾 **Truies reproductrices:** ${truies.length}`);
            truies.slice(0, 3).forEach((t: any) => {
              lines.push(`   • ${t.code || t.nom || 'Sans nom'}`);
            });
            if (truies.length > 3) lines.push(`   • ... et ${truies.length - 3} autres`);
          }

          if (verrats.length > 0) {
            lines.push(`\n🐗 **Verrats reproducteurs:** ${verrats.length}`);
            verrats.slice(0, 3).forEach((v: any) => {
              lines.push(`   • ${v.code || v.nom || 'Sans nom'}`);
            });
          }

          if (porcelets.length > 0) {
            lines.push(`\n🐽 **Porcelets:** ${porcelets.length}`);
          }

          if (enCroissance.length > 0) {
            lines.push(`\n📈 **En croissance:** ${enCroissance.length}`);
          }

          if (enFinition.length > 0) {
            lines.push(`\n🎯 **En finition:** ${enFinition.length}`);
          }

          message = lines.join('\n');
        }
      }

      return {
        success: true,
        message,
        data: null,
      };
    } catch (error) {
      logger.error('[StatsActions] Erreur getCheptelDetails:', error);
      return {
        success: false,
        message: "Désolé, je n'ai pas pu récupérer le détail du cheptel.",
        data: null,
      };
    }
  }

  /**
   * Calcule les coûts
   */
  static async calculateCosts(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Période de calcul (par défaut : dernier mois)
    const dateFin = (paramsTyped.date_fin && typeof paramsTyped.date_fin === 'string' ? paramsTyped.date_fin : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
    const dateDebut =
      (paramsTyped.date_debut && typeof paramsTyped.date_debut === 'string' ? paramsTyped.date_debut : undefined) ||
      (() => {
        const d = new Date(dateFin);
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
      })();

    // Récupérer les dépenses de la période depuis l'API backend
    const allDepenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
      params: { projet_id: context.projetId },
    });
    const depenses = allDepenses.filter(
      (d) => d.date >= dateDebut && d.date <= dateFin
    );

    // Récupérer les charges fixes depuis l'API backend
    const chargesFixes = await apiClient.get<any[]>(`/finance/charges-fixes`, {
      params: { projet_id: context.projetId },
    });

    // Calculer les coûts par catégorie
    const coutsParCategorie = depenses.reduce(
      (acc, d) => {
        const cat = d.categorie || 'autre';
        acc[cat] = (acc[cat] || 0) + (d.montant || 0);
        return acc;
      },
      {} as Record<string, number>
    );

    // Total des dépenses ponctuelles
    const totalDepensesPonctuelles = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);

    // Total des charges fixes (convertir en mensuel selon la fréquence)
    const totalChargesFixes = chargesFixes.reduce((sum, c) => {
      let montantMensuel = 0;
      switch (c.frequence) {
        case 'mensuel':
          montantMensuel = c.montant;
          break;
        case 'trimestriel':
          montantMensuel = c.montant / 3;
          break;
        case 'annuel':
          montantMensuel = c.montant / 12;
          break;
      }
      return sum + montantMensuel;
    }, 0);

    // Coût total
    const coutTotal = totalDepensesPonctuelles + totalChargesFixes;

    const message = `Calcul des coûts (${format(new Date(dateDebut), 'dd/MM/yyyy')} - ${format(new Date(dateFin), 'dd/MM/yyyy')}) :
• Dépenses ponctuelles : ${totalDepensesPonctuelles.toLocaleString('fr-FR')} FCFA
• Charges fixes : ${totalChargesFixes.toLocaleString('fr-FR')} FCFA/mois
• Coût total : ${coutTotal.toLocaleString('fr-FR')} FCFA`;

    return {
      success: true,
      message,
      data: {
        periode: { dateDebut, dateFin },
        totalDepensesPonctuelles,
        totalChargesFixes,
        coutTotal,
        coutsParCategorie,
      },
    };
  }
}

