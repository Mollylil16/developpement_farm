import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CreateRationDto } from './dto/create-ration.dto';
import { CreateStockAlimentDto } from './dto/create-stock-aliment.dto';
import { UpdateStockAlimentDto } from './dto/update-stock-aliment.dto';
import { CreateStockMouvementDto } from './dto/create-stock-mouvement.dto';
import { CreateRationBudgetDto } from './dto/create-ration-budget.dto';
import { UpdateRationBudgetDto } from './dto/update-ration-budget.dto';

@Injectable()
export class NutritionService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : ingredient_${Date.now()}_${random}
   */
  private generateIngredientId(): string {
    return `ingredient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : ration_${Date.now()}_${random}
   */
  private generateRationId(): string {
    return `ration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : stock_${Date.now()}_${random}
   */
  private generateStockId(): string {
    return `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : mouvement_${Date.now()}_${random}
   */
  private generateMouvementId(): string {
    return `mouvement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : ration_budget_${Date.now()}_${random}
   */
  private generateRationBudgetId(): string {
    return `ration_budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

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
   * Stringify value en JSON string pour stockage
   */
  private stringifyJson(value: any): string | null {
    if (!value) return null;
    return JSON.stringify(value);
  }

  // ==================== INGREDIENTS ====================

  private mapRowToIngredient(row: any): any {
    return {
      id: row.id,
      nom: row.nom,
      unite: row.unite,
      prix_unitaire: parseFloat(row.prix_unitaire),
      proteine_pourcent: row.proteine_pourcent ? parseFloat(row.proteine_pourcent) : undefined,
      energie_kcal: row.energie_kcal ? parseFloat(row.energie_kcal) : undefined,
      date_creation: row.date_creation,
    };
  }

  async createIngredient(createIngredientDto: CreateIngredientDto) {
    const id = this.generateIngredientId();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO ingredients (id, nom, unite, prix_unitaire, proteine_pourcent, energie_kcal, date_creation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        createIngredientDto.nom,
        createIngredientDto.unite,
        createIngredientDto.prix_unitaire,
        createIngredientDto.proteine_pourcent || null,
        createIngredientDto.energie_kcal || null,
        now,
      ]
    );

    return this.mapRowToIngredient(result.rows[0]);
  }

  async findAllIngredients() {
    const result = await this.databaseService.query('SELECT * FROM ingredients ORDER BY nom ASC');
    return result.rows.map((row) => this.mapRowToIngredient(row));
  }

  async findOneIngredient(id: string) {
    const result = await this.databaseService.query('SELECT * FROM ingredients WHERE id = $1', [
      id,
    ]);
    return result.rows[0] ? this.mapRowToIngredient(result.rows[0]) : null;
  }

  async updateIngredient(id: string, updateIngredientDto: UpdateIngredientDto) {
    const existing = await this.findOneIngredient(id);
    if (!existing) {
      throw new NotFoundException('Ingrédient introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateIngredientDto.nom !== undefined) {
      fields.push(`nom = $${paramIndex}`);
      values.push(updateIngredientDto.nom);
      paramIndex++;
    }
    if (updateIngredientDto.unite !== undefined) {
      fields.push(`unite = $${paramIndex}`);
      values.push(updateIngredientDto.unite);
      paramIndex++;
    }
    if (updateIngredientDto.prix_unitaire !== undefined) {
      fields.push(`prix_unitaire = $${paramIndex}`);
      values.push(updateIngredientDto.prix_unitaire);
      paramIndex++;
    }
    if (updateIngredientDto.proteine_pourcent !== undefined) {
      fields.push(`proteine_pourcent = $${paramIndex}`);
      values.push(updateIngredientDto.proteine_pourcent || null);
      paramIndex++;
    }
    if (updateIngredientDto.energie_kcal !== undefined) {
      fields.push(`energie_kcal = $${paramIndex}`);
      values.push(updateIngredientDto.energie_kcal || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    values.push(id);
    const query = `UPDATE ingredients SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToIngredient(result.rows[0]);
  }

  async deleteIngredient(id: string) {
    const existing = await this.findOneIngredient(id);
    if (!existing) {
      throw new NotFoundException('Ingrédient introuvable');
    }

    // Vérifier qu'il n'est pas utilisé dans des rations
    const usageResult = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM ingredients_ration WHERE ingredient_id = $1',
      [id]
    );
    if (parseInt(usageResult.rows[0].count) > 0) {
      throw new BadRequestException(
        'Cet ingrédient est utilisé dans des rations et ne peut pas être supprimé'
      );
    }

    await this.databaseService.query('DELETE FROM ingredients WHERE id = $1', [id]);
    return { id };
  }

  // ==================== RATIONS ====================

  private async mapRowToRation(row: any): Promise<any> {
    // Récupérer les ingrédients de la ration
    const ingredientsResult = await this.databaseService.query(
      `SELECT ir.id, ir.ingredient_id, ir.quantite, i.nom, i.unite, i.prix_unitaire
       FROM ingredients_ration ir
       JOIN ingredients i ON ir.ingredient_id = i.id
       WHERE ir.ration_id = $1`,
      [row.id]
    );

    const ingredients = ingredientsResult.rows.map((ir: any) => ({
      id: ir.id,
      ration_id: row.id,
      ingredient_id: ir.ingredient_id,
      quantite: parseFloat(ir.quantite),
      ingredient: {
        id: ir.ingredient_id,
        nom: ir.nom,
        unite: ir.unite,
        prix_unitaire: parseFloat(ir.prix_unitaire),
      },
    }));

    return {
      id: row.id,
      projet_id: row.projet_id,
      type_porc: row.type_porc,
      poids_kg: parseFloat(row.poids_kg),
      nombre_porcs: row.nombre_porcs || undefined,
      ingredients,
      cout_total: row.cout_total ? parseFloat(row.cout_total) : undefined,
      cout_par_kg: row.cout_par_kg ? parseFloat(row.cout_par_kg) : undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
    };
  }

  async createRation(createRationDto: CreateRationDto, userId: string) {
    await this.checkProjetOwnership(createRationDto.projet_id, userId);

    const id = this.generateRationId();
    const now = new Date().toISOString();

    // Calculer le coût total
    let coutTotal = 0;
    for (const ing of createRationDto.ingredients) {
      const ingredient = await this.findOneIngredient(ing.ingredient_id);
      if (!ingredient) {
        throw new NotFoundException(`Ingrédient ${ing.ingredient_id} introuvable`);
      }
      coutTotal += ing.quantite * ingredient.prix_unitaire;
    }

    const coutParKg = createRationDto.poids_kg > 0 ? coutTotal / createRationDto.poids_kg : 0;

    // Créer la ration
    const result = await this.databaseService.query(
      `INSERT INTO rations (id, projet_id, type_porc, poids_kg, nombre_porcs, cout_total, cout_par_kg, notes, date_creation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        createRationDto.projet_id,
        createRationDto.type_porc,
        createRationDto.poids_kg,
        createRationDto.nombre_porcs || null,
        coutTotal,
        coutParKg,
        createRationDto.notes || null,
        now,
      ]
    );

    // Créer les relations ingredients_ration
    for (const ing of createRationDto.ingredients) {
      const irId = `ir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.databaseService.query(
        `INSERT INTO ingredients_ration (id, ration_id, ingredient_id, quantite)
         VALUES ($1, $2, $3, $4)`,
        [irId, id, ing.ingredient_id, ing.quantite]
      );
    }

    return this.mapRowToRation(result.rows[0]);
  }

  async findAllRations(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM rations WHERE projet_id = $1 ORDER BY date_creation DESC`,
      [projetId]
    );

    const rations = [];
    for (const row of result.rows) {
      rations.push(await this.mapRowToRation(row));
    }
    return rations;
  }

  async findOneRation(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT r.* FROM rations r
       JOIN projets p ON r.projet_id = p.id
       WHERE r.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? await this.mapRowToRation(result.rows[0]) : null;
  }

  async deleteRation(id: string, userId: string) {
    const existing = await this.findOneRation(id, userId);
    if (!existing) {
      throw new NotFoundException('Ration introuvable');
    }

    // Supprimer les relations ingredients_ration (CASCADE devrait le faire automatiquement)
    await this.databaseService.query('DELETE FROM ingredients_ration WHERE ration_id = $1', [id]);
    await this.databaseService.query('DELETE FROM rations WHERE id = $1', [id]);
    return { id };
  }

  // ==================== STOCKS ALIMENTS ====================

  private mapRowToStockAliment(row: any): any {
    // Calculer valeur_totale si prix_unitaire existe
    const valeurTotale =
      row.prix_unitaire && row.quantite_actuelle
        ? parseFloat(row.prix_unitaire) * parseFloat(row.quantite_actuelle)
        : row.valeur_totale
          ? parseFloat(row.valeur_totale)
          : 0;

    return {
      id: row.id,
      projet_id: row.projet_id,
      nom: row.nom,
      categorie: row.categorie || undefined,
      quantite_actuelle: parseFloat(row.quantite_actuelle),
      unite: row.unite,
      seuil_alerte: row.seuil_alerte ? parseFloat(row.seuil_alerte) : undefined,
      date_derniere_entree: row.date_derniere_entree || undefined,
      date_derniere_sortie: row.date_derniere_sortie || undefined,
      alerte_active: row.alerte_active || false,
      valeur_totale: valeurTotale,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async createStockAliment(createStockAlimentDto: CreateStockAlimentDto, userId: string) {
    await this.checkProjetOwnership(createStockAlimentDto.projet_id, userId);

    const id = this.generateStockId();
    const now = new Date().toISOString();
    const quantiteInitiale = createStockAlimentDto.quantite_initiale || 0;
    const alerteActive =
      createStockAlimentDto.seuil_alerte !== undefined &&
      quantiteInitiale <= createStockAlimentDto.seuil_alerte;

    const result = await this.databaseService.query(
      `INSERT INTO stocks_aliments (
        id, projet_id, nom, categorie, quantite_actuelle, unite, seuil_alerte,
        date_derniere_entree, alerte_active, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        createStockAlimentDto.projet_id,
        createStockAlimentDto.nom,
        createStockAlimentDto.categorie || null,
        quantiteInitiale,
        createStockAlimentDto.unite,
        createStockAlimentDto.seuil_alerte || null,
        quantiteInitiale > 0 ? now : null,
        alerteActive,
        createStockAlimentDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToStockAliment(result.rows[0]);
  }

  async findAllStocksAliments(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM stocks_aliments WHERE projet_id = $1 ORDER BY nom ASC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToStockAliment(row));
  }

  async findOneStockAliment(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT s.* FROM stocks_aliments s
       JOIN projets p ON s.projet_id = p.id
       WHERE s.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToStockAliment(result.rows[0]) : null;
  }

  async updateStockAliment(
    id: string,
    updateStockAlimentDto: UpdateStockAlimentDto,
    userId: string
  ) {
    const existing = await this.findOneStockAliment(id, userId);
    if (!existing) {
      throw new NotFoundException('Stock aliment introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateStockAlimentDto.nom !== undefined) {
      fields.push(`nom = $${paramIndex}`);
      values.push(updateStockAlimentDto.nom);
      paramIndex++;
    }
    if (updateStockAlimentDto.categorie !== undefined) {
      fields.push(`categorie = $${paramIndex}`);
      values.push(updateStockAlimentDto.categorie || null);
      paramIndex++;
    }
    if (updateStockAlimentDto.unite !== undefined) {
      fields.push(`unite = $${paramIndex}`);
      values.push(updateStockAlimentDto.unite);
      paramIndex++;
    }
    if (updateStockAlimentDto.seuil_alerte !== undefined) {
      fields.push(`seuil_alerte = $${paramIndex}`);
      values.push(updateStockAlimentDto.seuil_alerte || null);
      paramIndex++;
      // Recalculer alerte_active
      const seuil = updateStockAlimentDto.seuil_alerte;
      const alerteActive = seuil !== null && existing.quantite_actuelle <= seuil;
      fields.push(`alerte_active = $${paramIndex}`);
      values.push(alerteActive);
      paramIndex++;
    }
    if (updateStockAlimentDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateStockAlimentDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE stocks_aliments SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToStockAliment(result.rows[0]);
  }

  async deleteStockAliment(id: string, userId: string) {
    const existing = await this.findOneStockAliment(id, userId);
    if (!existing) {
      throw new NotFoundException('Stock aliment introuvable');
    }

    await this.databaseService.query('DELETE FROM stocks_aliments WHERE id = $1', [id]);
    return { id };
  }

  // ==================== STOCKS MOUVEMENTS ====================

  private mapRowToStockMouvement(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      aliment_id: row.aliment_id,
      type: row.type,
      quantite: parseFloat(row.quantite),
      unite: row.unite,
      date: row.date,
      origine: row.origine || undefined,
      commentaire: row.commentaire || undefined,
      cree_par: row.cree_par || undefined,
      date_creation: row.date_creation,
    };
  }

  async createStockMouvement(createStockMouvementDto: CreateStockMouvementDto, userId: string) {
    await this.checkProjetOwnership(createStockMouvementDto.projet_id, userId);

    const stock = await this.findOneStockAliment(createStockMouvementDto.aliment_id, userId);
    if (!stock) {
      throw new NotFoundException('Stock aliment introuvable');
    }

    const id = this.generateMouvementId();
    const now = new Date().toISOString();

    // Calculer la nouvelle quantité
    let nouvelleQuantite = stock.quantite_actuelle;
    if (createStockMouvementDto.type === 'entree') {
      nouvelleQuantite += createStockMouvementDto.quantite;
    } else if (createStockMouvementDto.type === 'sortie') {
      nouvelleQuantite -= createStockMouvementDto.quantite;
      if (nouvelleQuantite < 0) {
        throw new BadRequestException('Quantité insuffisante en stock');
      }
    } else if (createStockMouvementDto.type === 'ajustement') {
      nouvelleQuantite = createStockMouvementDto.quantite;
    }

    // Créer le mouvement
    await this.databaseService.query(
      `INSERT INTO stocks_mouvements (
        id, projet_id, aliment_id, type, quantite, unite, date, origine, commentaire, cree_par, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        createStockMouvementDto.projet_id,
        createStockMouvementDto.aliment_id,
        createStockMouvementDto.type,
        createStockMouvementDto.quantite,
        createStockMouvementDto.unite,
        createStockMouvementDto.date,
        createStockMouvementDto.origine || null,
        createStockMouvementDto.commentaire || null,
        createStockMouvementDto.cree_par || userId,
        now,
      ]
    );

    // Mettre à jour le stock
    const dateUpdate = createStockMouvementDto.date;
    const dateDerniereEntree =
      createStockMouvementDto.type === 'entree' ? dateUpdate : stock.date_derniere_entree;
    const dateDerniereSortie =
      createStockMouvementDto.type === 'sortie' ? dateUpdate : stock.date_derniere_sortie;
    const alerteActive = stock.seuil_alerte !== undefined && nouvelleQuantite <= stock.seuil_alerte;

    await this.databaseService.query(
      `UPDATE stocks_aliments SET
        quantite_actuelle = $1,
        date_derniere_entree = $2,
        date_derniere_sortie = $3,
        alerte_active = $4,
        derniere_modification = $5
       WHERE id = $6`,
      [
        nouvelleQuantite,
        dateDerniereEntree,
        dateDerniereSortie,
        alerteActive,
        now,
        createStockMouvementDto.aliment_id,
      ]
    );

    // Récupérer le mouvement créé
    const mouvementResult = await this.databaseService.query(
      'SELECT * FROM stocks_mouvements WHERE id = $1',
      [id]
    );
    const mouvement = this.mapRowToStockMouvement(mouvementResult.rows[0]);

    // Récupérer le stock mis à jour
    const stockUpdated = await this.findOneStockAliment(createStockMouvementDto.aliment_id, userId);

    return { mouvement, stock: stockUpdated };
  }

  async findMouvementsByAliment(alimentId: string, userId: string, limit?: number) {
    // Vérifier que le stock appartient à l'utilisateur
    const stock = await this.findOneStockAliment(alimentId, userId);
    if (!stock) {
      throw new NotFoundException('Stock aliment introuvable');
    }

    const limitClause = limit ? `LIMIT ${limit}` : '';
    const result = await this.databaseService.query(
      `SELECT * FROM stocks_mouvements
       WHERE aliment_id = $1
       ORDER BY date DESC, date_creation DESC
       ${limitClause}`,
      [alimentId]
    );
    return result.rows.map((row) => this.mapRowToStockMouvement(row));
  }

  // ==================== RATIONS BUDGET ====================

  private mapRowToRationBudget(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      nom: row.nom,
      type_porc: row.type_porc,
      poids_moyen_kg: parseFloat(row.poids_moyen_kg),
      nombre_porcs: row.nombre_porcs,
      duree_jours: row.duree_jours,
      ration_journaliere_par_porc: parseFloat(row.ration_journaliere_par_porc),
      quantite_totale_kg: parseFloat(row.quantite_totale_kg),
      cout_total: parseFloat(row.cout_total),
      cout_par_kg: parseFloat(row.cout_par_kg),
      cout_par_porc: parseFloat(row.cout_par_porc),
      ingredients: this.parseJson(row.ingredients) || [],
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async createRationBudget(createRationBudgetDto: CreateRationBudgetDto, userId: string) {
    await this.checkProjetOwnership(createRationBudgetDto.projet_id, userId);

    const id = this.generateRationBudgetId();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO rations_budget (
        id, projet_id, nom, type_porc, poids_moyen_kg, nombre_porcs, duree_jours,
        ration_journaliere_par_porc, quantite_totale_kg, cout_total, cout_par_kg, cout_par_porc,
        ingredients, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        createRationBudgetDto.projet_id,
        createRationBudgetDto.nom,
        createRationBudgetDto.type_porc,
        createRationBudgetDto.poids_moyen_kg,
        createRationBudgetDto.nombre_porcs,
        createRationBudgetDto.duree_jours,
        createRationBudgetDto.ration_journaliere_par_porc,
        createRationBudgetDto.quantite_totale_kg,
        createRationBudgetDto.cout_total,
        createRationBudgetDto.cout_par_kg,
        createRationBudgetDto.cout_par_porc,
        this.stringifyJson(createRationBudgetDto.ingredients),
        createRationBudgetDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToRationBudget(result.rows[0]);
  }

  async findAllRationsBudget(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM rations_budget WHERE projet_id = $1 ORDER BY date_creation DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToRationBudget(row));
  }

  async findOneRationBudget(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT rb.* FROM rations_budget rb
       JOIN projets p ON rb.projet_id = p.id
       WHERE rb.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToRationBudget(result.rows[0]) : null;
  }

  async updateRationBudget(
    id: string,
    updateRationBudgetDto: UpdateRationBudgetDto,
    userId: string
  ) {
    const existing = await this.findOneRationBudget(id, userId);
    if (!existing) {
      throw new NotFoundException('Ration budget introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateRationBudgetDto.nom !== undefined) {
      fields.push(`nom = $${paramIndex}`);
      values.push(updateRationBudgetDto.nom);
      paramIndex++;
    }
    if (updateRationBudgetDto.type_porc !== undefined) {
      fields.push(`type_porc = $${paramIndex}`);
      values.push(updateRationBudgetDto.type_porc);
      paramIndex++;
    }
    if (updateRationBudgetDto.poids_moyen_kg !== undefined) {
      fields.push(`poids_moyen_kg = $${paramIndex}`);
      values.push(updateRationBudgetDto.poids_moyen_kg);
      paramIndex++;
    }
    if (updateRationBudgetDto.nombre_porcs !== undefined) {
      fields.push(`nombre_porcs = $${paramIndex}`);
      values.push(updateRationBudgetDto.nombre_porcs);
      paramIndex++;
    }
    if (updateRationBudgetDto.duree_jours !== undefined) {
      fields.push(`duree_jours = $${paramIndex}`);
      values.push(updateRationBudgetDto.duree_jours);
      paramIndex++;
    }
    if (updateRationBudgetDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateRationBudgetDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE rations_budget SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToRationBudget(result.rows[0]);
  }

  async deleteRationBudget(id: string, userId: string) {
    const existing = await this.findOneRationBudget(id, userId);
    if (!existing) {
      throw new NotFoundException('Ration budget introuvable');
    }

    await this.databaseService.query('DELETE FROM rations_budget WHERE id = $1', [id]);
    return { id };
  }

  // ==================== STATISTIQUES STOCKS ====================

  async getStockStats(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Récupérer les stocks avec les prix unitaires des ingrédients associés
    const stocksResult = await this.databaseService.query(
      `SELECT s.*, i.prix_unitaire
       FROM stocks_aliments s
       LEFT JOIN ingredients i ON s.nom = i.nom
       WHERE s.projet_id = $1`,
      [projetId]
    );

    const stocks = stocksResult.rows.map((row) => this.mapRowToStockAliment(row));

    const totalAliments = stocks.length;
    const enAlerte = stocks.filter((s) => s.alerte_active).length;
    const valeurTotale = stocks.reduce((sum, s) => sum + (s.valeur_totale || 0), 0);
    const quantiteTotale = stocks.reduce((sum, s) => sum + (s.quantite_actuelle || 0), 0);

    const parCategorie: { [key: string]: number } = {};
    stocks.forEach((s) => {
      const cat = s.categorie || 'autre';
      parCategorie[cat] = (parCategorie[cat] || 0) + 1;
    });

    return {
      total_aliments: totalAliments,
      en_alerte: enAlerte,
      valeur_totale: valeurTotale,
      quantite_totale: quantiteTotale,
      par_categorie: parCategorie,
    };
  }

  async getValeurTotaleStock(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Calculer la valeur totale en multipliant quantité * prix_unitaire
    const result = await this.databaseService.query(
      `SELECT COALESCE(SUM(s.quantite_actuelle * COALESCE(i.prix_unitaire, 0)), 0) as valeur_totale
       FROM stocks_aliments s
       LEFT JOIN ingredients i ON s.nom = i.nom
       WHERE s.projet_id = $1`,
      [projetId]
    );

    return {
      valeur_totale: parseFloat(result.rows[0].valeur_totale || '0'),
    };
  }
}
