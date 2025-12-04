/**
 * GestationRepository - Gestion des gestations
 * 
 * Responsabilités:
 * - CRUD des gestations
 * - Suivi des saillies et mises bas
 * - Alertes de mise bas imminente
 * - Statistiques de reproduction
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Gestation } from '../../types/reproduction';
import { ProductionAnimal } from '../../types/production';
import uuid from 'react-native-uuid';
import { addDays, differenceInDays, parseISO } from 'date-fns';
import { AnimalRepository } from './AnimalRepository';
import { genererPlusieursNomsAleatoires } from '../../utils/nameGenerator';

export class GestationRepository extends BaseRepository<Gestation> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'gestations');
  }

  /**
   * Créer une nouvelle gestation
   */
  async create(data: Partial<Gestation>): Promise<Gestation> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    // Calculer la date de mise bas prévue (114 jours après saillie)
    const dateSautage = data.date_sautage || now;
    const dateMiseBasPrevue = addDays(new Date(dateSautage), 114).toISOString();

    await this.execute(
      `INSERT INTO gestations (
        id, projet_id, truie_id, verrat_id, date_sautage,
        date_mise_bas_prevue, statut, nombre_porcelets_prevu,
        notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.truie_id,
        data.verrat_id || null,
        dateSautage,
        dateMiseBasPrevue,
        data.statut || 'en_cours',
        data.nombre_porcelets_prevu || null,
        data.notes || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la gestation');
    }
    return created;
  }

  /**
   * Mettre à jour une gestation
   */
  async update(id: string, data: Partial<Gestation>): Promise<Gestation> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.verrat_id !== undefined) {
      fields.push('verrat_id = ?');
      values.push(data.verrat_id);
    }
    if (data.date_sautage !== undefined) {
      fields.push('date_sautage = ?');
      values.push(data.date_sautage);
      // Recalculer date_mise_bas_prevue
      fields.push('date_mise_bas_prevue = ?');
      values.push(addDays(new Date(data.date_sautage), 114).toISOString());
    }
    if (data.date_mise_bas_reelle !== undefined) {
      fields.push('date_mise_bas_reelle = ?');
      values.push(data.date_mise_bas_reelle);
    }
    if (data.statut !== undefined) {
      fields.push('statut = ?');
      values.push(data.statut);
    }
    if (data.nombre_porcelets_prevu !== undefined) {
      fields.push('nombre_porcelets_prevu = ?');
      values.push(data.nombre_porcelets_prevu);
    }
    if (data.nombre_porcelets_reel !== undefined) {
      fields.push('nombre_porcelets_reel = ?');
      values.push(data.nombre_porcelets_reel);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(
      `UPDATE gestations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Gestation introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Récupérer les gestations en cours d'un projet
   */
  async findEnCoursByProjet(projetId: string): Promise<Gestation[]> {
    return this.query<Gestation>(
      `SELECT * FROM gestations 
       WHERE projet_id = ? AND statut = 'en_cours'
       ORDER BY date_mise_bas_prevue ASC`,
      [projetId]
    );
  }

  /**
   * Récupérer les gestations par truie
   */
  async findByTruie(truieId: string): Promise<Gestation[]> {
    return this.query<Gestation>(
      `SELECT * FROM gestations 
       WHERE truie_id = ?
       ORDER BY date_sautage DESC`,
      [truieId]
    );
  }

  /**
   * Récupérer la gestation en cours d'une truie
   */
  async findGestationEnCoursForTruie(truieId: string): Promise<Gestation | null> {
    return this.queryOne<Gestation>(
      `SELECT * FROM gestations 
       WHERE truie_id = ? AND statut = 'en_cours'
       ORDER BY date_sautage DESC
       LIMIT 1`,
      [truieId]
    );
  }

  /**
   * Récupérer les gestations nécessitant une alerte (mise bas imminente)
   */
  async findGestationsAvecAlerte(projetId: string, joursAvant: number = 7): Promise<Gestation[]> {
    const dateAujourdhui = new Date().toISOString();
    const dateLimite = addDays(new Date(), joursAvant).toISOString();

    return this.query<Gestation>(
      `SELECT * FROM gestations 
       WHERE projet_id = ? 
       AND statut = 'en_cours'
       AND date_mise_bas_prevue >= ?
       AND date_mise_bas_prevue <= ?
       ORDER BY date_mise_bas_prevue ASC`,
      [projetId, dateAujourdhui, dateLimite]
    );
  }

  /**
   * Marquer une gestation comme terminée (mise bas effectuée)
   */
  async terminerGestation(
    id: string,
    dateMiseBas: string,
    nombrePorcelets: number
  ): Promise<Gestation> {
    return this.update(id, {
      statut: 'terminee',
      date_mise_bas_reelle: dateMiseBas,
      nombre_porcelets_reel: nombrePorcelets,
    });
  }

  /**
   * Annuler une gestation
   */
  async annulerGestation(id: string, raison?: string): Promise<Gestation> {
    const notes = raison ? `Annulée: ${raison}` : 'Annulée';
    return this.update(id, {
      statut: 'annulee',
      notes,
    });
  }

  /**
   * Statistiques de reproduction
   */
  async getStats(projetId: string): Promise<{
    total: number;
    enCours: number;
    terminees: number;
    annulees: number;
    moyennePorcelets: number;
    tauxReussite: number;
  }> {
    const stats = await this.queryOne<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) as enCours,
        SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END) as terminees,
        SUM(CASE WHEN statut = 'annulee' THEN 1 ELSE 0 END) as annulees,
        AVG(CASE WHEN statut = 'terminee' AND nombre_porcelets_reel IS NOT NULL 
            THEN nombre_porcelets_reel ELSE NULL END) as moyennePorcelets
       FROM gestations
       WHERE projet_id = ?`,
      [projetId]
    );

    const total = stats?.total || 0;
    const terminees = stats?.terminees || 0;
    const tauxReussite = total > 0 ? (terminees / total) * 100 : 0;

    return {
      total,
      enCours: stats?.enCours || 0,
      terminees,
      annulees: stats?.annulees || 0,
      moyennePorcelets: stats?.moyennePorcelets || 0,
      tauxReussite,
    };
  }

  /**
   * Récupérer les gestations par période
   */
  async findByPeriod(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<Gestation[]> {
    return this.query<Gestation>(
      `SELECT * FROM gestations 
       WHERE projet_id = ? 
       AND date_sautage >= ? 
       AND date_sautage <= ?
       ORDER BY date_sautage DESC`,
      [projetId, dateDebut, dateFin]
    );
  }

  /**
   * Vérifier si une truie a déjà une gestation en cours
   */
  async truieAGestationEnCours(truieId: string): Promise<boolean> {
    const result = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM gestations 
       WHERE truie_id = ? AND statut = 'en_cours'`,
      [truieId]
    );
    return (result?.count || 0) > 0;
  }

  /**
   * Créer automatiquement les porcelets dans la table production_animaux
   * lorsqu'une gestation est terminée
   * 
   * Cette méthode est appelée automatiquement lors de la mise à jour d'une gestation
   * pour créer les porcelets correspondants dans le cheptel.
   */
  async creerPorceletsDepuisGestation(gestation: Gestation): Promise<ProductionAnimal[]> {
    // Vérifier que la gestation est bien terminée
    if (
      gestation.statut !== 'terminee' ||
      !gestation.nombre_porcelets_reel ||
      gestation.nombre_porcelets_reel <= 0
    ) {
      return [];
    }

    const animalRepo = new AnimalRepository(this.db);
    const dateMiseBas = gestation.date_mise_bas_reelle || gestation.date_mise_bas_prevue;

    // Vérifier si les porcelets n'ont pas déjà été créés pour cette gestation
    const porceletsExistants = await animalRepo.query<ProductionAnimal>(
      `SELECT * FROM production_animaux 
       WHERE projet_id = ? 
       AND mere_id = ? 
       AND date_naissance = ? 
       AND reproducteur = 0`,
      [gestation.projet_id, gestation.truie_id, dateMiseBas]
    );

    if (porceletsExistants && porceletsExistants.length > 0) {
      console.log(`Les porcelets pour la gestation ${gestation.id} ont déjà été créés.`);
      return porceletsExistants;
    }

    // Récupérer tous les animaux du projet pour générer des codes uniques
    const animauxExistants = await animalRepo.findByProjet(gestation.projet_id);

    // Trouver les vrais IDs des parents dans production_animaux
    // truie_id et verrat_id dans gestations peuvent être des codes ou des IDs
    let mereIdReel: string | null = null;
    let pereIdReel: string | null = null;

    // Chercher la truie par ID ou par code
    const truieTrouvee = animauxExistants.find(
      (a) => a.id === gestation.truie_id || a.code === gestation.truie_id
    );
    if (truieTrouvee) {
      mereIdReel = truieTrouvee.id;
    }

    // Chercher le verrat par ID ou par code (si renseigné)
    if (gestation.verrat_id) {
      const verratTrouve = animauxExistants.find(
        (a) => a.id === gestation.verrat_id || a.code === gestation.verrat_id
      );
      if (verratTrouve) {
        pereIdReel = verratTrouve.id;
      }
    }

    // Trouver le prochain numéro de porcelet disponible
    const codesPorcelets = animauxExistants
      .map((a) => a.code)
      .filter((code) => code.startsWith('P'))
      .map((code) => {
        const match = code.match(/P(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => !isNaN(num));

    const maxNumero = codesPorcelets.length > 0 ? Math.max(...codesPorcelets) : 0;
    let prochainNumero = maxNumero + 1;

    // Générer des noms uniques et aléatoires pour les porcelets
    const nomsDejaUtilises = animauxExistants
      .map((a) => a.nom)
      .filter((nom): nom is string => nom !== undefined && nom !== null && nom !== '');

    const nombrePorcelets = gestation.nombre_porcelets_reel;
    const nomsAleatoires = genererPlusieursNomsAleatoires(
      nombrePorcelets,
      nomsDejaUtilises,
      'tous',
      'indetermine' // Les porcelets ont un sexe indéterminé à la naissance
    );

    // Créer les porcelets
    const porceletsCreees: ProductionAnimal[] = [];

    for (let i = 0; i < nombrePorcelets; i++) {
      const codePorcelet = `P${String(prochainNumero).padStart(3, '0')}`;
      const nomPorcelet = nomsAleatoires[i];

      try {
        const porcelet = await animalRepo.create({
          projet_id: gestation.projet_id,
          code: codePorcelet,
          nom: nomPorcelet,
          origine: 'Naissance',
          sexe: 'indetermine',
          date_naissance: dateMiseBas,
          poids_initial: undefined,
          date_entree: dateMiseBas,
          statut: 'actif',
          race: undefined,
          reproducteur: false,
          pere_id: pereIdReel,
          mere_id: mereIdReel,
          notes: `Né de la gestation ${gestation.truie_nom || gestation.truie_id}${gestation.verrat_nom ? ` x ${gestation.verrat_nom}` : ''}`,
        });

        porceletsCreees.push(porcelet);
        prochainNumero++;
      } catch (error) {
        console.error(`Erreur lors de la création du porcelet ${codePorcelet}:`, error);
        // Continuer avec les autres porcelets même en cas d'erreur
      }
    }

    console.log(
      `✅ ${porceletsCreees.length} porcelet(s) créé(s) automatiquement pour la gestation ${gestation.id}`
    );

    return porceletsCreees;
  }

  /**
   * Récupérer l'historique de reproduction d'une truie
   */
  async getHistoriqueReproduction(truieId: string): Promise<{
    nombreGestations: number;
    nombreReussies: number;
    nombreAnnulees: number;
    totalPorcelets: number;
    moyennePorceletsParPortee: number;
  }> {
    const stats = await this.queryOne<any>(
      `SELECT 
        COUNT(*) as nombreGestations,
        SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END) as nombreReussies,
        SUM(CASE WHEN statut = 'annulee' THEN 1 ELSE 0 END) as nombreAnnulees,
        SUM(CASE WHEN statut = 'terminee' AND nombre_porcelets_reel IS NOT NULL 
            THEN nombre_porcelets_reel ELSE 0 END) as totalPorcelets,
        AVG(CASE WHEN statut = 'terminee' AND nombre_porcelets_reel IS NOT NULL 
            THEN nombre_porcelets_reel ELSE NULL END) as moyennePorceletsParPortee
       FROM gestations
       WHERE truie_id = ?`,
      [truieId]
    );

    return {
      nombreGestations: stats?.nombreGestations || 0,
      nombreReussies: stats?.nombreReussies || 0,
      nombreAnnulees: stats?.nombreAnnulees || 0,
      totalPorcelets: stats?.totalPorcelets || 0,
      moyennePorceletsParPortee: stats?.moyennePorceletsParPortee || 0,
    };
  }
}
