import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateRapportCroissanceDto } from './dto/create-rapport-croissance.dto';
import { UpdateRapportCroissanceDto } from './dto/update-rapport-croissance.dto';

@Injectable()
export class ReportsService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : rapport_${Date.now()}_${random}
   */
  private generateRapportId(): string {
    return `rapport_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkProjetOwnership(projetId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }
    const rawProprietaireId = result.rows[0].proprietaire_id;
    const proprietaireId = String(rawProprietaireId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    if (proprietaireId !== normalizedUserId) {
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Mappe une ligne de base de données vers un objet RapportCroissance
   */
  private mapRowToRapport(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      date: row.date ? new Date(row.date).toISOString() : undefined,
      poids_moyen: row.poids_moyen ? parseFloat(row.poids_moyen) : undefined,
      nombre_porcs: row.nombre_porcs,
      gain_quotidien: row.gain_quotidien ? parseFloat(row.gain_quotidien) : undefined,
      poids_cible: row.poids_cible ? parseFloat(row.poids_cible) : undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation ? new Date(row.date_creation).toISOString() : undefined,
    };
  }

  async create(createRapportDto: CreateRapportCroissanceDto, userId: string) {
    await this.checkProjetOwnership(createRapportDto.projet_id, userId);

    const id = this.generateRapportId();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO rapports_croissance (
        id, projet_id, date, poids_moyen, nombre_porcs,
        gain_quotidien, poids_cible, notes, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        createRapportDto.projet_id,
        createRapportDto.date,
        createRapportDto.poids_moyen,
        createRapportDto.nombre_porcs,
        createRapportDto.gain_quotidien || null,
        createRapportDto.poids_cible || null,
        createRapportDto.notes || null,
        now,
      ]
    );

    return this.mapRowToRapport(result.rows[0]);
  }

  async findAll(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Colonnes nécessaires pour mapRowToRapport (optimisation: éviter SELECT *)
    const rapportColumns = `id, projet_id, date, poids_moyen, nombre_porcs, 
      gain_quotidien, poids_cible, notes, date_creation`;

    const result = await this.databaseService.query(
      `SELECT ${rapportColumns} FROM rapports_croissance 
       WHERE projet_id = $1 
       ORDER BY date DESC`,
      [projetId]
    );

    return result.rows.map((row) => this.mapRowToRapport(row));
  }

  async findOne(id: string, userId: string) {
    // Colonnes nécessaires pour mapRowToRapport (optimisation: éviter SELECT *)
    const rapportColumns = `r.id, r.projet_id, r.date, r.poids_moyen, r.nombre_porcs, 
      r.gain_quotidien, r.poids_cible, r.notes, r.date_creation`;

    const result = await this.databaseService.query(
      `SELECT ${rapportColumns} FROM rapports_croissance r
       INNER JOIN projets p ON r.projet_id = p.id
       WHERE r.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Rapport de croissance introuvable');
    }

    return this.mapRowToRapport(result.rows[0]);
  }

  async update(id: string, updateRapportDto: UpdateRapportCroissanceDto, userId: string) {
    const existingRapport = await this.findOne(id, userId);

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const key in updateRapportDto) {
      if (updateRapportDto.hasOwnProperty(key) && updateRapportDto[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updateRapportDto[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return existingRapport;
    }

    values.push(id);
    values.push(userId);

    const query = `
      UPDATE rapports_croissance r
      SET ${fields.join(', ')}
      FROM projets p
      WHERE r.id = $${paramIndex} 
        AND r.projet_id = p.id 
        AND p.proprietaire_id = $${paramIndex + 1}
      RETURNING r.*
    `;

    const result = await this.databaseService.query(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundException('Rapport de croissance introuvable ou non autorisé');
    }

    return this.mapRowToRapport(result.rows[0]);
  }

  async delete(id: string, userId: string) {
    const result = await this.databaseService.query(
      `DELETE FROM rapports_croissance r
       USING projets p
       WHERE r.id = $1 
         AND r.projet_id = p.id 
         AND p.proprietaire_id = $2
       RETURNING r.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Rapport de croissance introuvable ou non autorisé');
    }

    return { id: result.rows[0].id };
  }

  // ==================== CALCUL DES INDICATEURS DE PERFORMANCE ====================

  /**
   * Parse JSON string ou retourne undefined
   */
  private parseJson(value: any): any {
    if (!value) return undefined;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    }
    return value;
  }

  /**
   * Calcule la quantité totale d'alimentation consommée en kg
   * Prend en compte les RationBudget (qui ont quantite_totale_kg) et les Ration simples
   */
  private async calculerAlimentationConsommeeKg(
    projetId: string,
    periodeDebut?: Date,
    periodeFin?: Date
  ): Promise<number> {
    let totalKg = 0;

    // 1. Récupérer les RationBudget (qui ont quantite_totale_kg directement)
    let queryRationsBudget = `SELECT quantite_totale_kg, date_creation 
                              FROM rations_budget 
                              WHERE projet_id = $1`;
    const paramsRationsBudget: any[] = [projetId];

    if (periodeDebut || periodeFin) {
      if (periodeDebut) {
        queryRationsBudget += ` AND date_creation >= $${paramsRationsBudget.length + 1}`;
        paramsRationsBudget.push(periodeDebut.toISOString());
      }
      if (periodeFin) {
        queryRationsBudget += ` AND date_creation <= $${paramsRationsBudget.length + 1}`;
        paramsRationsBudget.push(periodeFin.toISOString());
      }
    }

    const resultRationsBudget = await this.databaseService.query(
      queryRationsBudget,
      paramsRationsBudget
    );

    for (const row of resultRationsBudget.rows) {
      totalKg += parseFloat(row.quantite_totale_kg) || 0;
    }

    // 2. Pour les Ration simples, calculer la quantité totale à partir des ingrédients
    let queryRations = `SELECT r.id, r.date_creation 
                        FROM rations r 
                        WHERE r.projet_id = $1`;
    const paramsRations: any[] = [projetId];

    if (periodeDebut || periodeFin) {
      if (periodeDebut) {
        queryRations += ` AND r.date_creation >= $${paramsRations.length + 1}::timestamp`;
        paramsRations.push(periodeDebut.toISOString());
      }
      if (periodeFin) {
        queryRations += ` AND r.date_creation <= $${paramsRations.length + 1}::timestamp`;
        paramsRations.push(periodeFin.toISOString());
      }
    }

    const resultRations = await this.databaseService.query(queryRations, paramsRations);

    for (const rationRow of resultRations.rows) {
      // Récupérer les ingrédients de cette ration
      const ingredientsResult = await this.databaseService.query(
        `SELECT ir.quantite, i.unite 
         FROM ingredients_ration ir
         JOIN ingredients i ON ir.ingredient_id = i.id
         WHERE ir.ration_id = $1`,
        [rationRow.id]
      );

      for (const ingRow of ingredientsResult.rows) {
        let quantiteKg = parseFloat(ingRow.quantite) || 0;
        const unite = ingRow.unite;

        // Convertir selon l'unité
        if (unite === 'g') {
          quantiteKg = quantiteKg / 1000;
        } else if (unite === 'l') {
          quantiteKg = quantiteKg; // 1L ≈ 1kg pour les liquides
        } else if (unite === 'ml') {
          quantiteKg = quantiteKg / 1000;
        } else if (unite === 'sac') {
          quantiteKg = quantiteKg * 50; // Sac de 50kg
        }
        // Si l'unité est déjà en kg, on garde la valeur telle quelle

        totalKg += quantiteKg;
      }
    }

    return totalKg;
  }

  /**
   * Calcule le gain de poids total sur une période donnée
   */
  private async calculerGainPoidsTotal(
    projetId: string,
    periodeDebut: Date,
    periodeFin: Date
  ): Promise<number> {
    // Récupérer tous les animaux actifs non reproducteurs du projet
    const animauxResult = await this.databaseService.query(
      `SELECT id FROM production_animaux 
       WHERE projet_id = $1 
         AND statut = 'actif' 
         AND (reproducteur = 0 OR reproducteur = false)`,
      [projetId]
    );

    let gainTotal = 0;

    for (const animalRow of animauxResult.rows) {
      // Récupérer les pesées de cet animal dans la période
      const peseesResult = await this.databaseService.query(
        `SELECT date, poids_kg 
         FROM production_pesees 
         WHERE animal_id = $1 
           AND date >= $2::timestamp 
           AND date <= $3::timestamp 
         ORDER BY date ASC`,
        [animalRow.id, periodeDebut.toISOString(), periodeFin.toISOString()]
      );

      if (peseesResult.rows.length >= 2) {
        const premierePesee = parseFloat(peseesResult.rows[0].poids_kg) || 0;
        const dernierePesee =
          parseFloat(peseesResult.rows[peseesResult.rows.length - 1].poids_kg) || 0;

        if (premierePesee > 0) {
          gainTotal += dernierePesee - premierePesee;
        }
      }
    }

    return gainTotal;
  }

  /**
   * Calcule le taux de croissance basé sur le gain de poids réel
   */
  private async calculerTauxCroissance(
    projetId: string,
    periodeJours: number = 30
  ): Promise<number> {
    const dateFin = new Date();
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - periodeJours);

    // Récupérer tous les animaux actifs non reproducteurs
    const animauxResult = await this.databaseService.query(
      `SELECT id FROM production_animaux 
       WHERE projet_id = $1 
         AND statut = 'actif' 
         AND (reproducteur = 0 OR reproducteur = false)`,
      [projetId]
    );

    let totalTaux = 0;
    let nombreAnimauxAvecPesees = 0;

    for (const animalRow of animauxResult.rows) {
      // Récupérer toutes les pesées de cet animal
      const peseesResult = await this.databaseService.query(
        `SELECT date, poids_kg 
         FROM production_pesees 
         WHERE animal_id = $1 
         ORDER BY date ASC`,
        [animalRow.id]
      );

      if (peseesResult.rows.length >= 2) {
        // Trouver la première pesée dans la période
        let premierePesee = null;
        for (const pesee of peseesResult.rows) {
          const datePesee = pesee.date instanceof Date ? pesee.date : new Date(pesee.date);
          if (datePesee >= dateDebut && datePesee <= dateFin) {
            premierePesee = pesee;
            break;
          }
        }
        // Si aucune pesée dans la période, prendre la première disponible
        if (!premierePesee && peseesResult.rows.length > 0) {
          premierePesee = peseesResult.rows[0];
        }

        // Dernière pesée dans la période
        let dernierePesee = null;
        for (let i = peseesResult.rows.length - 1; i >= 0; i--) {
          const pesee = peseesResult.rows[i];
          const datePesee = pesee.date instanceof Date ? pesee.date : new Date(pesee.date);
          if (datePesee >= dateDebut && datePesee <= dateFin) {
            dernierePesee = pesee;
            break;
          }
        }
        // Si aucune pesée dans la période, prendre la dernière disponible
        if (!dernierePesee && peseesResult.rows.length > 0) {
          dernierePesee = peseesResult.rows[peseesResult.rows.length - 1];
        }

        if (premierePesee && dernierePesee) {
          const poidsInitial = parseFloat(premierePesee.poids_kg) || 0;
          const poidsFinal = parseFloat(dernierePesee.poids_kg) || 0;

          if (poidsInitial > 0) {
            const taux = ((poidsFinal - poidsInitial) / poidsInitial) * 100;
            totalTaux += taux;
            nombreAnimauxAvecPesees++;
          }
        }
      }
    }

    return nombreAnimauxAvecPesees > 0 ? totalTaux / nombreAnimauxAvecPesees : 0;
  }

  /**
   * Calcule l'efficacité alimentaire (Gain de poids / Alimentation consommée)
   */
  private async calculerEfficaciteAlimentaire(
    projetId: string,
    periodeJours: number = 30
  ): Promise<number> {
    const dateFin = new Date();
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - periodeJours);

    const alimentationConsommeeKg = await this.calculerAlimentationConsommeeKg(
      projetId,
      dateDebut,
      dateFin
    );

    const gainPoidsTotal = await this.calculerGainPoidsTotal(projetId, dateDebut, dateFin);

    // Efficacité = Gain de poids / Alimentation consommée
    // Plus la valeur est élevée, meilleure est l'efficacité
    return alimentationConsommeeKg > 0 ? gainPoidsTotal / alimentationConsommeeKg : 0;
  }

  /**
   * Calcule tous les indicateurs de performance pour un projet
   */
  async calculerIndicateursPerformance(
    projetId: string,
    userId: string,
    periodeJours: number = 30
  ) {
    await this.checkProjetOwnership(projetId, userId);

    const dateFin = new Date();
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - periodeJours);

    // Calculer les différents indicateurs en parallèle
    const [
      tauxCroissance,
      efficaciteAlimentaire,
      alimentationConsommeeKg,
      gainPoidsTotal,
    ] = await Promise.all([
      this.calculerTauxCroissance(projetId, periodeJours),
      this.calculerEfficaciteAlimentaire(projetId, periodeJours),
      this.calculerAlimentationConsommeeKg(projetId, dateDebut, dateFin),
      this.calculerGainPoidsTotal(projetId, dateDebut, dateFin),
    ]);

    // Calculer l'Indice de Consommation (IC) = inverse de l'efficacité
    const indiceConsommation = gainPoidsTotal > 0 ? alimentationConsommeeKg / gainPoidsTotal : 0;

    // Récupérer les statistiques de base
    const animauxResult = await this.databaseService.query(
      `SELECT 
         COUNT(*) FILTER (WHERE statut = 'actif') as nombre_actifs,
         COUNT(*) FILTER (WHERE statut = 'mort') as nombre_morts,
         COUNT(*) FILTER (WHERE statut = 'vendu') as nombre_vendus,
         COUNT(*) as nombre_total
       FROM production_animaux 
       WHERE projet_id = $1`,
      [projetId]
    );

    const stats = animauxResult.rows[0] || {};
    const nombrePorcsActifs = parseInt(stats.nombre_actifs) || 0;
    const nombrePorcsMorts = parseInt(stats.nombre_morts) || 0;
    const nombrePorcsVendus = parseInt(stats.nombre_vendus) || 0;
    const nombrePorcsTotal = parseInt(stats.nombre_total) || 0;

    // Calculer le taux de mortalité
    const tauxMortalite = nombrePorcsTotal > 0 ? (nombrePorcsMorts / nombrePorcsTotal) * 100 : 0;

    // Calculer le poids total actuel (dernières pesées)
    const poidsTotalResult = await this.databaseService.query(
      `SELECT COALESCE(SUM(p.poids_kg), 0) as poids_total
       FROM (
         SELECT DISTINCT ON (animal_id) poids_kg
         FROM production_pesees
         WHERE animal_id IN (
           SELECT id FROM production_animaux 
           WHERE projet_id = $1 AND statut = 'actif'
         )
         ORDER BY animal_id, date DESC
       ) p`,
      [projetId]
    );

    const poidsTotal = parseFloat(poidsTotalResult.rows[0]?.poids_total) || 0;

    return {
      taux_mortalite: tauxMortalite,
      taux_croissance: tauxCroissance,
      efficacite_alimentaire: efficaciteAlimentaire,
      indice_consommation: indiceConsommation,
      nombre_porcs_total: nombrePorcsActifs,
      nombre_porcs_vivants: nombrePorcsVendus,
      nombre_porcs_morts: nombrePorcsMorts,
      poids_total: poidsTotal,
      alimentation_totale: alimentationConsommeeKg,
      gain_poids_total: gainPoidsTotal,
      periode_jours: periodeJours,
      date_debut: dateDebut.toISOString(),
      date_fin: dateFin.toISOString(),
    };
  }

  // ==================== CALCUL DE LA PERFORMANCE GLOBALE ====================

  /**
   * Calcule la performance globale de l'élevage
   * Compare le coût de production avec le prix du marché
   */
  async calculerPerformanceGlobale(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // 1. Récupérer le projet pour obtenir le prix du marché et la durée d'amortissement
    const projetResult = await this.databaseService.query(
      'SELECT prix_kg_carcasse, duree_amortissement_par_defaut_mois FROM projets WHERE id = $1',
      [projetId]
    );

    if (projetResult.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }

    const projet = projetResult.rows[0];
    const prixKgMarche = parseFloat(projet.prix_kg_carcasse) || 1300;
    const dureeAmortissementMois = parseInt(projet.duree_amortissement_par_defaut_mois) || 36;

    // 2. Charger toutes les dépenses ponctuelles
    // Colonnes nécessaires (optimisation: éviter SELECT *)
    const depenseColumns = `id, montant, date, type_opex_capex, duree_amortissement_mois`;
    
    const depensesResult = await this.databaseService.query(
      `SELECT ${depenseColumns} FROM depenses_ponctuelles 
       WHERE projet_id = $1 
       ORDER BY date ASC`,
      [projetId]
    );

    const depenses = depensesResult.rows.map((row) => ({
      id: row.id,
      montant: parseFloat(row.montant),
      date: row.date,
      type_depense: row.type_opex_capex || 'OPEX',
      duree_amortissement_mois: row.duree_amortissement_mois
        ? parseInt(row.duree_amortissement_mois)
        : null,
    }));

    // 3. Charger toutes les ventes de porcs (revenus avec catégorie 'vente_porc')
    // Colonnes nécessaires (optimisation: éviter SELECT *)
    const revenuColumns = `id, poids_kg, date`;
    
    const ventesResult = await this.databaseService.query(
      `SELECT ${revenuColumns} FROM revenus 
       WHERE projet_id = $1 
       AND categorie = 'vente_porc'
       ORDER BY date ASC`,
      [projetId]
    );

    const ventes = ventesResult.rows.map((row) => ({
      id: row.id,
      poids_kg: row.poids_kg ? parseFloat(row.poids_kg) : 0,
      date: row.date,
    }));

    // 4. Calculer total_kg_vendus_global
    const totalKgVendusGlobal = ventes.reduce((sum, v) => sum + (v.poids_kg || 0), 0);

    if (totalKgVendusGlobal === 0) {
      return null; // Pas assez de données
    }

    // 5. Calculer total_opex_global (dépenses OPEX uniquement)
    const depensesOpex = depenses.filter(
      (d) => !d.type_depense || d.type_depense.toUpperCase() === 'OPEX'
    );
    const totalOpexGlobal = depensesOpex.reduce((sum, d) => sum + d.montant, 0);

    // 6. Trouver la période de production (première vente à aujourd'hui)
    const datesVentes = ventes.map((v) => new Date(v.date));
    const dateDebutProduction =
      datesVentes.length > 0
        ? new Date(Math.min(...datesVentes.map((d) => d.getTime())))
        : new Date();
    const dateFinProduction = new Date();

    // 7. Calculer total_amortissement_capex_global
    const depensesCapex = depenses.filter(
      (d) => d.type_depense && d.type_depense.toUpperCase() === 'CAPEX'
    );

    let totalAmortissementCapexGlobal = 0;
    for (const depense of depensesCapex) {
      const dateDepense = new Date(depense.date);
      const dureeAmortissement =
        depense.duree_amortissement_mois || dureeAmortissementMois;

      // Date de fin d'amortissement
      const dateFinAmortissement = new Date(dateDepense);
      dateFinAmortissement.setMonth(dateFinAmortissement.getMonth() + dureeAmortissement);

      // Amortissement mensuel
      const amortissementMensuel = depense.montant / dureeAmortissement;

      // Calculer le nombre de mois où cette dépense CAPEX a été amortie durant la période
      const debutAmortissement =
        dateDepense > dateDebutProduction ? dateDepense : dateDebutProduction;
      const finAmortissement =
        dateFinAmortissement < dateFinProduction ? dateFinAmortissement : dateFinProduction;

      if (debutAmortissement < finAmortissement) {
        const moisAmortis = Math.max(
          1,
          Math.floor(
            (finAmortissement.getTime() - debutAmortissement.getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          ) + 1
        );
        totalAmortissementCapexGlobal += amortissementMensuel * moisAmortis;
      }
    }

    // 8. Calculer coûts par kg
    const coutKgOpexGlobal = totalOpexGlobal / totalKgVendusGlobal;
    const coutKgCompletGlobal =
      (totalOpexGlobal + totalAmortissementCapexGlobal) / totalKgVendusGlobal;

    // 9. Calculer écarts
    const ecartAbsolu = prixKgMarche - coutKgCompletGlobal;
    const ecartPourcentage = (ecartAbsolu / prixKgMarche) * 100;

    // 10. Déterminer le statut
    let statut: 'rentable' | 'fragile' | 'perte';
    if (coutKgCompletGlobal > prixKgMarche) {
      statut = 'perte';
    } else if (Math.abs(ecartPourcentage) <= 5) {
      statut = 'fragile';
    } else {
      statut = 'rentable';
    }

    // 11. Générer le message de diagnostic
    const marge = prixKgMarche - coutKgCompletGlobal;
    const margePourcentage = prixKgMarche > 0 ? ((marge / prixKgMarche) * 100).toFixed(1) : '0';
    let messageDiagnostic: string;

    switch (statut) {
      case 'rentable':
        messageDiagnostic = `Votre coût de production (${coutKgCompletGlobal.toFixed(0)} FCFA/kg) est inférieur au prix du marché (${prixKgMarche.toFixed(0)} FCFA/kg). Marge: ${marge.toFixed(0)} FCFA/kg (${margePourcentage}%). Vous travaillez avec une marge positive. 🎉`;
        break;
      case 'fragile':
        messageDiagnostic = `Votre coût de production (${coutKgCompletGlobal.toFixed(0)} FCFA/kg) est très proche du prix du marché (${prixKgMarche.toFixed(0)} FCFA/kg). Marge: ${marge.toFixed(0)} FCFA/kg (${margePourcentage}%). Votre marge est faible, prudence. ⚠️`;
        break;
      case 'perte':
        messageDiagnostic = `Votre coût de production (${coutKgCompletGlobal.toFixed(0)} FCFA/kg) est supérieur au prix du marché (${prixKgMarche.toFixed(0)} FCFA/kg). Perte: ${Math.abs(marge).toFixed(0)} FCFA/kg. Vous travaillez à perte. 🚨`;
        break;
      default:
        messageDiagnostic = 'Données insuffisantes pour établir un diagnostic.';
    }

    // 12. Générer des suggestions
    const suggestions: string[] = [];
    switch (statut) {
      case 'perte':
        suggestions.push(
          "Réduire le coût de l'aliment en optimisant la formulation des rations",
          'Améliorer la croissance (GMQ) pour vendre des porcs plus lourds',
          'Analyser les mortalités pour réduire les pertes',
          'Revoir le prix de vente si le marché local le permet'
        );
        break;
      case 'fragile':
        suggestions.push(
          "Surveiller l'évolution du coût de l'aliment",
          'Limiter les dépenses non essentielles (OPEX)',
          'Optimiser les performances par lot'
        );
        break;
      case 'rentable':
        suggestions.push(
          "Vos performances sont bonnes. Vous pouvez envisager d'augmenter le volume",
          'Continuez à suivre vos coûts pour maintenir cette rentabilité'
        );
        break;
    }

    return {
      total_kg_vendus_global: totalKgVendusGlobal,
      total_opex_global: totalOpexGlobal,
      total_amortissement_capex_global: totalAmortissementCapexGlobal,
      cout_kg_opex_global: coutKgOpexGlobal,
      cout_kg_complet_global: coutKgCompletGlobal,
      prix_kg_marche: prixKgMarche,
      ecart_absolu: ecartAbsolu,
      ecart_pourcentage: ecartPourcentage,
      statut,
      message_diagnostic: messageDiagnostic,
      suggestions,
    };
  }
}
