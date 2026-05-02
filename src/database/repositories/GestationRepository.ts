/**
 * GestationRepository - Gestion des gestations
 *
 * Responsabilités:
 * - CRUD des gestations
 * - Suivi des saillies et mises bas
 * - Alertes de mise bas imminente
 * - Statistiques de reproduction
 * 
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { Gestation } from '../../types/reproduction';
import { ProductionAnimal } from '../../types/production';
import { addDays } from 'date-fns';
import { AnimalRepository } from './AnimalRepository';
import { genererPlusieursNomsAleatoires } from '../../utils/nameGenerator';

export class GestationRepository extends BaseRepository<Gestation> {
  constructor() {
    super('gestations', '/reproduction/gestations');
  }

  /**
   * Créer une nouvelle gestation
   */
  async create(data: Partial<Gestation>): Promise<Gestation> {
    const dateSautage = data.date_sautage || new Date().toISOString();
    const dateMiseBasPrevue = addDays(new Date(dateSautage), 114).toISOString();

    const gestationData = {
      projet_id: data.projet_id,
      truie_id: data.truie_id,
      verrat_id: data.verrat_id || null,
      date_sautage: dateSautage,
      date_mise_bas_prevue: dateMiseBasPrevue,
      statut: data.statut || 'en_cours',
      nombre_porcelets_prevu: data.nombre_porcelets_prevu || null,
      notes: data.notes || null,
    };

    return this.executePost<Gestation>('/reproduction/gestations', gestationData);
  }

  /**
   * Mettre à jour une gestation
   */
  async update(id: string, data: Partial<Gestation>): Promise<Gestation> {
    const updateData: Record<string, unknown> = {};

    if (data.verrat_id !== undefined) updateData.verrat_id = data.verrat_id;
    if (data.date_sautage !== undefined) {
      updateData.date_sautage = data.date_sautage;
      updateData.date_mise_bas_prevue = addDays(new Date(data.date_sautage), 114).toISOString();
    }
    if (data.date_mise_bas_reelle !== undefined) updateData.date_mise_bas_reelle = data.date_mise_bas_reelle;
    if (data.statut !== undefined) updateData.statut = data.statut;
    if (data.nombre_porcelets_prevu !== undefined) updateData.nombre_porcelets_prevu = data.nombre_porcelets_prevu;
    if (data.nombre_porcelets_reel !== undefined) updateData.nombre_porcelets_reel = data.nombre_porcelets_reel;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await this.executePatch<Gestation>(`/reproduction/gestations/${id}`, updateData);
    
    // Si la gestation est terminée, créer les porcelets
    if (updated.statut === 'terminee' && updated.nombre_porcelets_reel) {
      await this.creerPorceletsDepuisGestation(updated);
    }

    return updated;
  }

  /**
   * Récupérer les gestations en cours d'un projet
   */
  async findEnCoursByProjet(projetId: string): Promise<Gestation[]> {
    try {
      return this.query<Gestation>('/reproduction/gestations', {
        projet_id: projetId,
        en_cours: true,
      });
    } catch (error) {
      console.error('Error finding gestations en cours:', error);
      return [];
    }
  }

  /**
   * Récupérer les gestations par truie
   */
  async findByTruie(truieId: string): Promise<Gestation[]> {
    try {
      const gestations = await this.query<Gestation>('/reproduction/gestations', {});
      return gestations.filter(g => g.truie_id === truieId)
        .sort((a, b) => new Date(b.date_sautage).getTime() - new Date(a.date_sautage).getTime());
    } catch (error) {
      console.error('Error finding gestations by truie:', error);
      return [];
    }
  }

  /**
   * Récupérer la gestation en cours d'une truie
   */
  async findGestationEnCoursForTruie(truieId: string): Promise<Gestation | null> {
    try {
      const gestations = await this.findByTruie(truieId);
      return gestations.find(g => g.statut === 'en_cours') || null;
    } catch (error) {
      console.error('Error finding gestation en cours for truie:', error);
      return null;
    }
  }

  /**
   * Récupérer les gestations nécessitant une alerte (mise bas imminente)
   */
  async findGestationsAvecAlerte(projetId: string, joursAvant: number = 7): Promise<Gestation[]> {
    try {
      const gestations = await this.findEnCoursByProjet(projetId);
      const dateLimite = addDays(new Date(), joursAvant).toISOString();
      const aujourdhui = new Date().toISOString();

      return gestations.filter(g => {
        const dateMiseBas = g.date_mise_bas_prevue;
        return dateMiseBas >= aujourdhui && dateMiseBas <= dateLimite;
      }).sort((a, b) => new Date(a.date_mise_bas_prevue).getTime() - new Date(b.date_mise_bas_prevue).getTime());
    } catch (error) {
      console.error('Error finding gestations avec alerte:', error);
      return [];
    }
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
    try {
      // Utiliser l'endpoint backend si disponible
      const result = await this.queryOne<{
        total: number;
        en_cours: number;
        terminees: number;
        annulees: number;
        moyenne_porcelets: number;
        taux_reussite: number;
      }>(`/reproduction/stats/gestations`, { projet_id: projetId });

      if (result) {
        return {
          total: result.total,
          enCours: result.en_cours,
          terminees: result.terminees,
          annulees: result.annulees,
          moyennePorcelets: result.moyenne_porcelets || 0,
          tauxReussite: result.taux_reussite || 0,
        };
      }

      // Fallback: calculer côté client
      const gestations = await this.query<Gestation>('/reproduction/gestations', { projet_id: projetId });
      
      const total = gestations.length;
      const enCours = gestations.filter(g => g.statut === 'en_cours').length;
      const terminees = gestations.filter(g => g.statut === 'terminee').length;
      const annulees = gestations.filter(g => g.statut === 'annulee').length;
      
      const gestationsTerminees = gestations.filter(g => g.statut === 'terminee' && g.nombre_porcelets_reel);
      const moyennePorcelets = gestationsTerminees.length > 0
        ? gestationsTerminees.reduce((sum, g) => sum + (g.nombre_porcelets_reel || 0), 0) / gestationsTerminees.length
        : 0;
      
      const tauxReussite = total > 0 ? (terminees / total) * 100 : 0;

      return {
        total,
        enCours,
        terminees,
        annulees,
        moyennePorcelets,
        tauxReussite,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total: 0,
        enCours: 0,
        terminees: 0,
        annulees: 0,
        moyennePorcelets: 0,
        tauxReussite: 0,
      };
    }
  }

  /**
   * Récupérer les gestations par période
   */
  async findByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Gestation[]> {
    try {
      const gestations = await this.query<Gestation>('/reproduction/gestations', { projet_id: projetId });
      return gestations.filter(g => g.date_sautage >= dateDebut && g.date_sautage <= dateFin)
        .sort((a, b) => new Date(b.date_sautage).getTime() - new Date(a.date_sautage).getTime());
    } catch (error) {
      console.error('Error finding gestations by period:', error);
      return [];
    }
  }

  /**
   * Vérifier si une truie a déjà une gestation en cours
   */
  async truieAGestationEnCours(truieId: string): Promise<boolean> {
    try {
      const gestation = await this.findGestationEnCoursForTruie(truieId);
      return gestation !== null;
    } catch (error) {
      console.error('Error checking gestation en cours:', error);
      return false;
    }
  }

  /**
   * Créer automatiquement les porcelets dans la table production_animaux
   */
  async creerPorceletsDepuisGestation(gestation: Gestation): Promise<ProductionAnimal[]> {
    if (
      gestation.statut !== 'terminee' ||
      !gestation.nombre_porcelets_reel ||
      gestation.nombre_porcelets_reel <= 0
    ) {
      return [];
    }

    const animalRepo = new AnimalRepository();
    const dateMiseBas = gestation.date_mise_bas_reelle || gestation.date_mise_bas_prevue;

    // Vérifier si les porcelets n'ont pas déjà été créés
    const animauxProjet = await animalRepo.findByProjet(gestation.projet_id);
    const porceletsExistants = animauxProjet.filter(
      a => a.mere_id === gestation.truie_id && a.date_naissance === dateMiseBas && !a.reproducteur
    );

    if (porceletsExistants.length > 0) {
      console.log(`Les porcelets pour la gestation ${gestation.id} ont déjà été créés.`);
      return porceletsExistants;
    }

    // Trouver les IDs réels des parents
    let mereIdReel: string | null = null;
    let pereIdReel: string | null = null;

    const truieTrouvee = animauxProjet.find(
      a => a.id === gestation.truie_id || a.code === gestation.truie_id
    );
    if (truieTrouvee) {
      mereIdReel = truieTrouvee.id;
    }

    if (gestation.verrat_id) {
      const verratTrouve = animauxProjet.find(
        a => a.id === gestation.verrat_id || a.code === gestation.verrat_id
      );
      if (verratTrouve) {
        pereIdReel = verratTrouve.id;
      }
    }

    // Trouver le prochain numéro de porcelet
    const codesPorcelets = animauxProjet
      .map(a => a.code)
      .filter(code => code.startsWith('P'))
      .map(code => {
        const match = code.match(/P(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num));

    const maxNumero = codesPorcelets.length > 0 ? Math.max(...codesPorcelets) : 0;
    let prochainNumero = maxNumero + 1;

    // Générer des noms uniques
    const nomsDejaUtilises = animauxProjet
      .map(a => a.nom)
      .filter((nom): nom is string => nom !== undefined && nom !== null && nom !== '');

    const nombrePorcelets = gestation.nombre_porcelets_reel;
    const nomsAleatoires = genererPlusieursNomsAleatoires(
      nombrePorcelets,
      nomsDejaUtilises,
      'tous',
      'indetermine'
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
          notes: `Né de la gestation ${gestation.truie_id}`,
        });

        porceletsCreees.push(porcelet);
        prochainNumero++;
      } catch (error) {
        console.error(`Erreur lors de la création du porcelet ${codePorcelet}:`, error);
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
    try {
      const gestations = await this.findByTruie(truieId);
      
      const nombreGestations = gestations.length;
      const nombreReussies = gestations.filter(g => g.statut === 'terminee').length;
      const nombreAnnulees = gestations.filter(g => g.statut === 'annulee').length;
      const totalPorcelets = gestations
        .filter(g => g.statut === 'terminee' && g.nombre_porcelets_reel)
        .reduce((sum, g) => sum + (g.nombre_porcelets_reel || 0), 0);
      
      const gestationsReussies = gestations.filter(g => g.statut === 'terminee' && g.nombre_porcelets_reel);
      const moyennePorceletsParPortee = gestationsReussies.length > 0
        ? totalPorcelets / gestationsReussies.length
        : 0;

      return {
        nombreGestations,
        nombreReussies,
        nombreAnnulees,
        totalPorcelets,
        moyennePorceletsParPortee,
      };
    } catch (error) {
      console.error('Error getting historique reproduction:', error);
      return {
        nombreGestations: 0,
        nombreReussies: 0,
        nombreAnnulees: 0,
        totalPorcelets: 0,
        moyennePorceletsParPortee: 0,
      };
    }
  }
}
