/**
 * VaccinationRepository - Gestion des vaccinations
 *
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { Vaccination } from '../../types/veterinaire';

export class VaccinationRepository extends BaseRepository<Vaccination> {
  constructor() {
    super('vaccinations', '/sante/vaccinations');
  }

  async create(data: Partial<Vaccination>): Promise<Vaccination> {
    const vaccinationData = {
      projet_id: data.projet_id,
      animal_ids: data.animal_ids || [],
      vaccin: data.vaccin || data.type_vaccin || null,
      nom_vaccin: data.nom_vaccin || null,
      date_vaccination: data.date_vaccination || data.date_administration || new Date().toISOString(),
      numero_lot_vaccin: data.numero_lot_vaccin || data.lot_numero || null,
      veterinaire: data.veterinaire || data.veterinaire_id || null,
      date_rappel: data.date_rappel || null,
      notes: data.notes || null,
      type_prophylaxie: data.type_prophylaxie || 'vitamine',
      produit_administre: data.produit_administre || null,
      dosage: data.dosage || null,
      unite_dosage: data.unite_dosage || 'ml',
      cout: data.cout || null,
      statut: data.statut || 'effectue',
      raison_traitement: data.raison_traitement || 'suivi_normal',
    };

    return this.executePost<Vaccination>('/sante/vaccinations', vaccinationData);
  }

  async update(id: string, data: Partial<Vaccination>): Promise<Vaccination> {
    const updateData: Record<string, unknown> = {};

    if (data.animal_ids !== undefined) updateData.animal_ids = data.animal_ids;
    if (data.vaccin !== undefined || data.type_vaccin !== undefined) updateData.vaccin = data.vaccin || data.type_vaccin;
    if (data.nom_vaccin !== undefined) updateData.nom_vaccin = data.nom_vaccin;
    if (data.date_vaccination !== undefined || data.date_administration !== undefined) {
      updateData.date_vaccination = data.date_vaccination || data.date_administration;
    }
    if (data.numero_lot_vaccin !== undefined || data.lot_numero !== undefined) {
      updateData.numero_lot_vaccin = data.numero_lot_vaccin || data.lot_numero;
    }
    if (data.veterinaire !== undefined || data.veterinaire_id !== undefined) {
      updateData.veterinaire = data.veterinaire || data.veterinaire_id;
    }
    if (data.date_rappel !== undefined) updateData.date_rappel = data.date_rappel;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.type_prophylaxie !== undefined) updateData.type_prophylaxie = data.type_prophylaxie;
    if (data.produit_administre !== undefined) updateData.produit_administre = data.produit_administre;
    if (data.dosage !== undefined) updateData.dosage = data.dosage;
    if (data.unite_dosage !== undefined) updateData.unite_dosage = data.unite_dosage;
    if (data.cout !== undefined) updateData.cout = data.cout;
    if (data.statut !== undefined) updateData.statut = data.statut;
    if (data.raison_traitement !== undefined) updateData.raison_traitement = data.raison_traitement;

    return this.executePatch<Vaccination>(`/sante/vaccinations/${id}`, updateData);
  }

  async findByProjet(projetId: string): Promise<Vaccination[]> {
    try {
      return this.query<Vaccination>('/sante/vaccinations', { projet_id: projetId });
    } catch (error) {
      console.error('Error finding vaccinations by projet:', error);
      return [];
    }
  }

  async findByAnimal(animalId: string): Promise<Vaccination[]> {
    try {
      const vaccinations = await this.query<Vaccination>('/sante/vaccinations', {});
      return vaccinations.filter(v => {
        try {
          const animalIds = typeof v.animal_ids === 'string' ? JSON.parse(v.animal_ids) : v.animal_ids;
          return Array.isArray(animalIds) && animalIds.includes(animalId);
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error('Error finding vaccinations by animal:', error);
      return [];
    }
  }

  async findByType(projetId: string, typeVaccin: string): Promise<Vaccination[]> {
    try {
      const vaccinations = await this.findByProjet(projetId);
      return vaccinations.filter(v => (v.vaccin || v.type_vaccin) === typeVaccin);
    } catch (error) {
      console.error('Error finding vaccinations by type:', error);
      return [];
    }
  }

  async findRappelsDus(projetId: string, joursAvance: number = 7): Promise<Vaccination[]> {
    try {
      const vaccinations = await this.findByProjet(projetId);
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() + joursAvance);
      
      return vaccinations.filter(v => 
        v.date_rappel && 
        v.date_rappel >= new Date().toISOString() && 
        v.date_rappel <= dateLimite.toISOString() &&
        v.statut !== 'annule'
      ).sort((a, b) => new Date(a.date_rappel || '').getTime() - new Date(b.date_rappel || '').getTime());
    } catch (error) {
      console.error('Error finding rappels dus:', error);
      return [];
    }
  }

  async findEnRetard(projetId: string): Promise<Vaccination[]> {
    try {
      const vaccinations = await this.findByProjet(projetId);
      const today = new Date().toISOString().split('T')[0];
      
      return vaccinations.filter(v => 
        v.date_rappel && 
        v.date_rappel < today && 
        v.statut !== 'annule'
      ).sort((a, b) => new Date(a.date_rappel || '').getTime() - new Date(b.date_rappel || '').getTime());
    } catch (error) {
      console.error('Error finding vaccinations en retard:', error);
      return [];
    }
  }

  async findAVenir(projetId: string, joursAvance: number = 7): Promise<Vaccination[]> {
    return this.findRappelsDus(projetId, joursAvance);
  }

  async findByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Vaccination[]> {
    try {
      const vaccinations = await this.findByProjet(projetId);
      return vaccinations.filter(v => v.date_vaccination >= dateDebut && v.date_vaccination <= dateFin)
        .sort((a, b) => new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime());
    } catch (error) {
      console.error('Error finding vaccinations by period:', error);
      return [];
    }
  }

  async getStatistiquesVaccinations(projetId: string): Promise<{
    total: number;
    effectuees: number;
    enAttente: number;
    enRetard: number;
    tauxCouverture: number;
    coutTotal: number;
  }> {
    try {
      const vaccinations = await this.findByProjet(projetId);
      const total = vaccinations.length;
      const effectuees = vaccinations.filter(v => v.statut === 'effectue').length;
      const enAttente = vaccinations.filter(v => v.statut === 'planifiee').length;
      const enRetard = vaccinations.filter(v => v.statut === 'planifiee' && v.date_vaccination < new Date().toISOString()).length;
      const coutTotal = vaccinations.reduce((sum, v) => sum + (v.cout || 0), 0);
      const tauxCouverture = total > 0 ? (effectuees / total) * 100 : 0;

      return {
        total,
        effectuees,
        enAttente,
        enRetard,
        tauxCouverture,
        coutTotal,
      };
    } catch (error) {
      console.error('Error getting statistiques vaccinations:', error);
      return {
        total: 0,
        effectuees: 0,
        enAttente: 0,
        enRetard: 0,
        tauxCouverture: 0,
        coutTotal: 0,
      };
    }
  }

  async getStats(projetId: string): Promise<{
    total: number;
    parType: Record<string, number>;
    dernierMois: number;
    rappelsDus: number;
  }> {
    try {
      const vaccinations = await this.findByProjet(projetId);
      const total = vaccinations.length;

      const parType: Record<string, number> = {};
      vaccinations.forEach(v => {
        const type = v.vaccin || v.type_vaccin || 'autre';
        parType[type] = (parType[type] || 0) + 1;
      });

      const dateDebut = new Date();
      dateDebut.setMonth(dateDebut.getMonth() - 1);
      const dernierMois = vaccinations.filter(v => v.date_vaccination >= dateDebut.toISOString()).length;

      const rappelsDus = vaccinations.filter(v => 
        v.date_rappel && v.date_rappel <= new Date().toISOString()
      ).length;

      return {
        total,
        parType,
        dernierMois,
        rappelsDus,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total: 0,
        parType: {},
        dernierMois: 0,
        rappelsDus: 0,
      };
    }
  }

  async getCouvertureVaccinale(projetId: string): Promise<{
    nombreAnimauxVaccines: number;
    nombreAnimauxTotal: number;
    tauxCouverture: number;
  }> {
    try {
      const vaccinations = await this.findByProjet(projetId);
      const animauxVaccinesSet = new Set<string>();

      vaccinations.forEach(v => {
        try {
          const animalIds = typeof v.animal_ids === 'string' ? JSON.parse(v.animal_ids) : v.animal_ids;
          if (Array.isArray(animalIds)) {
            animalIds.forEach(id => animauxVaccinesSet.add(id));
          }
        } catch {
          // Ignorer les erreurs de parsing
        }
      });

      const nombreAnimauxVaccines = animauxVaccinesSet.size;
      
      // Note: Pour obtenir le nombre total d'animaux, il faudrait accéder à AnimalRepository
      // Pour l'instant, on retourne 0
      const nombreAnimauxTotal = 0;
      const tauxCouverture = nombreAnimauxTotal > 0 ? (nombreAnimauxVaccines / nombreAnimauxTotal) * 100 : 0;

      return {
        nombreAnimauxVaccines,
        nombreAnimauxTotal,
        tauxCouverture,
      };
    } catch (error) {
      console.error('Error getting couverture vaccinale:', error);
      return {
        nombreAnimauxVaccines: 0,
        nombreAnimauxTotal: 0,
        tauxCouverture: 0,
      };
    }
  }

  async effectuerRappel(vaccinationOriginaleId: string): Promise<Vaccination> {
    const originale = await this.findById(vaccinationOriginaleId);
    if (!originale) {
      throw new Error('Vaccination originale introuvable');
    }

    return this.create({
      projet_id: originale.projet_id,
      animal_ids: typeof originale.animal_ids === 'string' ? JSON.parse(originale.animal_ids) : originale.animal_ids,
      vaccin: originale.vaccin || originale.type_vaccin,
      nom_vaccin: originale.nom_vaccin,
      date_vaccination: new Date().toISOString(),
      veterinaire: originale.veterinaire || originale.veterinaire_id,
      notes: `Rappel de vaccination ${originale.id}`,
    });
  }
}
