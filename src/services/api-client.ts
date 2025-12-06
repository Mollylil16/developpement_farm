/**
 * Client API pour communiquer avec le backend NestJS
 * Remplace les appels SQLite directs
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`[API] Erreur ${options.method || 'GET'} ${endpoint}:`, error.message);
      throw error;
    }
  }

  // ========== USERS ==========
  async createUser(data: any) {
    return this.request('/users', { method: 'POST', body: JSON.stringify(data) });
  }

  async getUserById(id: string) {
    return this.request(`/users/${id}`);
  }

  async getUserByEmail(email: string) {
    return this.request(`/users/email/${encodeURIComponent(email)}`);
  }

  async getUserByTelephone(telephone: string) {
    return this.request(`/users/telephone/${encodeURIComponent(telephone)}`);
  }

  async getUserByIdentifier(identifier: string) {
    return this.request(`/users/identifier/${encodeURIComponent(identifier)}`);
  }

  async updateUser(id: string, data: any) {
    return this.request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getAllUsers() {
    return this.request('/users');
  }

  // ========== PROJETS ==========
  async createProjet(data: any) {
    return this.request('/projets', { method: 'POST', body: JSON.stringify(data) });
  }

  async getProjetById(id: string) {
    return this.request(`/projets/${id}`);
  }

  async getAllProjets(proprietaireId?: string) {
    const query = proprietaireId ? `?proprietaire_id=${proprietaireId}` : '';
    return this.request(`/projets${query}`);
  }

  async getProjetActif(userId: string) {
    return this.request(`/projets/actif?user_id=${userId}`);
  }

  async updateProjet(id: string, data: any) {
    return this.request(`/projets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteProjet(id: string) {
    return this.request(`/projets/${id}`, { method: 'DELETE' });
  }

  // ========== FINANCE ==========
  async createChargeFixe(data: any) {
    return this.request('/charges-fixes', { method: 'POST', body: JSON.stringify(data) });
  }

  async getChargesFixes(projetId: string, actives?: boolean) {
    const query = actives ? `?projet_id=${projetId}&actives=true` : `?projet_id=${projetId}`;
    return this.request(`/charges-fixes${query}`);
  }

  async createDepense(data: any) {
    return this.request('/depenses', { method: 'POST', body: JSON.stringify(data) });
  }

  async getDepenses(projetId: string, dateDebut?: string, dateFin?: string) {
    let query = `?projet_id=${projetId}`;
    if (dateDebut && dateFin) query += `&debut=${dateDebut}&fin=${dateFin}`;
    return this.request(`/depenses${query}`);
  }

  async createRevenu(data: any) {
    return this.request('/revenus', { method: 'POST', body: JSON.stringify(data) });
  }

  async getRevenus(projetId: string, dateDebut?: string, dateFin?: string) {
    let query = `?projet_id=${projetId}`;
    if (dateDebut && dateFin) query += `&debut=${dateDebut}&fin=${dateFin}`;
    return this.request(`/revenus${query}`);
  }

  // ========== REPRODUCTION ==========
  async createGestation(data: any) {
    return this.request('/gestations', { method: 'POST', body: JSON.stringify(data) });
  }

  async getGestations(projetId: string, enCours?: boolean, dateDebut?: string, dateFin?: string) {
    let query = `?projet_id=${projetId}`;
    if (enCours) query += '&en_cours=true';
    if (dateDebut && dateFin) query += `&debut=${dateDebut}&fin=${dateFin}`;
    return this.request(`/gestations${query}`);
  }

  async createSevrage(data: any) {
    return this.request('/sevrages', { method: 'POST', body: JSON.stringify(data) });
  }

  async getSevrages(projetId: string, gestationId?: string, dateDebut?: string, dateFin?: string) {
    let query = projetId ? `?projet_id=${projetId}` : '?';
    if (gestationId) query += `${projetId ? '&' : ''}gestation_id=${gestationId}`;
    if (dateDebut && dateFin) query += `${projetId || gestationId ? '&' : ''}debut=${dateDebut}&fin=${dateFin}`;
    return this.request(`/sevrages${query}`);
  }

  // ========== PRODUCTION ==========
  async createAnimal(data: any) {
    return this.request('/animaux', { method: 'POST', body: JSON.stringify(data) });
  }

  async getAnimaux(projetId: string) {
    return this.request(`/animaux?projet_id=${projetId}`);
  }

  async createPesee(data: any) {
    return this.request('/pesees', { method: 'POST', body: JSON.stringify(data) });
  }

  async getPesees(projetId: string, animalId?: string, recentes?: boolean) {
    let query = projetId ? `?projet_id=${projetId}` : '?';
    if (animalId) query += `${projetId ? '&' : ''}animal_id=${animalId}`;
    if (recentes) query += `${projetId || animalId ? '&' : ''}recentes=true`;
    return this.request(`/pesees${query}`);
  }

  async updatePesee(id: string, data: any) {
    return this.request(`/pesees/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deletePesee(id: string) {
    return this.request(`/pesees/${id}`, { method: 'DELETE' });
  }

  async createRapportCroissance(data: any) {
    return this.request('/rapports-croissance', { method: 'POST', body: JSON.stringify(data) });
  }

  async getRapportsCroissance(projetId: string, dateDebut?: string, dateFin?: string) {
    let query = projetId ? `?projet_id=${projetId}` : '?';
    if (dateDebut && dateFin) query += `${projetId ? '&' : ''}debut=${dateDebut}&fin=${dateFin}`;
    return this.request(`/rapports-croissance${query}`);
  }

  // ========== SANTE ==========
  async createVaccination(data: any) {
    return this.request('/vaccinations', { method: 'POST', body: JSON.stringify(data) });
  }

  async getVaccinations(projetId?: string, animalId?: string, enRetard?: boolean, aVenir?: boolean, jours?: number) {
    if (animalId) return this.request(`/vaccinations/animal/${animalId}`);
    if (projetId && enRetard) return this.request(`/vaccinations/retard?projet_id=${projetId}`);
    if (projetId && aVenir) return this.request(`/vaccinations/avenir?projet_id=${projetId}&jours=${jours || 7}`);
    if (projetId) return this.request(`/vaccinations?projet_id=${projetId}`);
    return [];
  }

  async createMaladie(data: any) {
    return this.request('/maladies', { method: 'POST', body: JSON.stringify(data) });
  }

  async getMaladies(projetId?: string, animalId?: string, enCours?: boolean) {
    if (animalId) return this.request(`/maladies/animal/${animalId}`);
    if (projetId && enCours) return this.request(`/maladies/en-cours?projet_id=${projetId}`);
    if (projetId) return this.request(`/maladies?projet_id=${projetId}`);
    return [];
  }

  async createTraitement(data: any) {
    return this.request('/traitements', { method: 'POST', body: JSON.stringify(data) });
  }

  async getTraitements(projetId?: string, maladieId?: string, animalId?: string, enCours?: boolean) {
    if (maladieId) return this.request(`/traitements/maladie/${maladieId}`);
    if (animalId) return this.request(`/traitements/animal/${animalId}`);
    if (projetId && enCours) return this.request(`/traitements/en-cours?projet_id=${projetId}`);
    if (projetId) return this.request(`/traitements?projet_id=${projetId}`);
    return [];
  }

  async createVisiteVeterinaire(data: any) {
    return this.request('/visites-veterinaires', { method: 'POST', body: JSON.stringify(data) });
  }

  async getVisitesVeterinaires(projetId: string, prochaine?: boolean) {
    if (prochaine) return this.request(`/visites-veterinaires/prochaine?projet_id=${projetId}`);
    return this.request(`/visites-veterinaires?projet_id=${projetId}`);
  }

  async getHistoriqueMedicalAnimal(animalId: string) {
    return this.request(`/sante/historique/animal/${animalId}`);
  }

  async getStatistiquesVaccinations(projetId: string) {
    return this.request(`/sante/statistiques/vaccinations?projet_id=${projetId}`);
  }

  async getStatistiquesMaladies(projetId: string) {
    return this.request(`/sante/statistiques/maladies?projet_id=${projetId}`);
  }

  async getStatistiquesTraitements(projetId: string) {
    return this.request(`/sante/statistiques/traitements?projet_id=${projetId}`);
  }

  async getCoutsVeterinaires(projetId: string) {
    return this.request(`/sante/couts?projet_id=${projetId}`);
  }

  async getCoutsVeterinairesPeriode(projetId: string, dateDebut: string, dateFin: string) {
    return this.request(`/sante/couts?projet_id=${projetId}&date_debut=${dateDebut}&date_fin=${dateFin}`);
  }

  async getRecommandationsSanitaires(projetId: string) {
    return this.request(`/sante/recommandations?projet_id=${projetId}`);
  }

  async getAlertesSanitaires(projetId: string) {
    return this.request(`/sante/alertes?projet_id=${projetId}`);
  }

  async getAnimauxTempsAttente(projetId: string) {
    return this.request(`/sante/animaux-temps-attente?projet_id=${projetId}`);
  }

  // ========== NUTRITION ==========
  async createIngredient(data: any) {
    return this.request('/ingredients', { method: 'POST', body: JSON.stringify(data) });
  }

  async getIngredients() {
    return this.request('/ingredients');
  }

  async createStockAliment(data: any) {
    return this.request('/stocks/aliments', { method: 'POST', body: JSON.stringify(data) });
  }

  async getStocksAliments(projetId: string, alerte?: boolean) {
    const query = alerte ? `?projet_id=${projetId}&alerte=true` : `?projet_id=${projetId}`;
    return this.request(`/stocks/aliments${query}`);
  }

  async createStockMouvement(data: any) {
    return this.request('/stocks/mouvements', { method: 'POST', body: JSON.stringify(data) });
  }

  async getStocksMouvements(projetId: string, alimentId?: string, recentes?: boolean) {
    let query = `?projet_id=${projetId}`;
    if (alimentId) query += `&aliment_id=${alimentId}`;
    if (recentes) query += '&recentes=true';
    return this.request(`/stocks/mouvements${query}`);
  }

  async createRation(data: any) {
    return this.request('/rations', { method: 'POST', body: JSON.stringify(data) });
  }

  async getRations(projetId: string) {
    return this.request(`/rations?projet_id=${projetId}`);
  }

  async createRationBudget(data: any) {
    return this.request('/rations/budget', { method: 'POST', body: JSON.stringify(data) });
  }

  async getRationsBudget(projetId: string) {
    return this.request(`/rations/budget?projet_id=${projetId}`);
  }

  // ========== COLLABORATIONS ==========
  async createCollaboration(data: any) {
    return this.request('/collaborations', { method: 'POST', body: JSON.stringify(data) });
  }

  async getCollaborations(projetId: string, statut?: string, role?: string, userId?: string) {
    let query = projetId ? `?projet_id=${projetId}` : '?';
    if (statut) query += `${projetId ? '&' : ''}statut=${statut}`;
    if (role) query += `${projetId || statut ? '&' : ''}role=${role}`;
    if (userId) query += `${projetId || statut || role ? '&' : ''}user_id=${userId}`;
    return this.request(`/collaborations${query}`);
  }

  async getInvitationsEnAttente(userId: string) {
    return this.request(`/collaborations/invitations-en-attente/${userId}`);
  }

  // ========== PLANIFICATIONS ==========
  async createPlanification(data: any) {
    return this.request('/planifications', { method: 'POST', body: JSON.stringify(data) });
  }

  async getPlanifications(projetId: string, statut?: string, aVenir?: boolean, jours?: number, dateDebut?: string, dateFin?: string) {
    if (aVenir) return this.request(`/planifications/avenir?projet_id=${projetId}&jours=${jours || 7}`);
    let query = `?projet_id=${projetId}`;
    if (statut) query += `&statut=${statut}`;
    if (dateDebut && dateFin) query += `&debut=${dateDebut}&fin=${dateFin}`;
    return this.request(`/planifications${query}`);
  }

  // ========== MORTALITES ==========
  async createMortalite(data: any) {
    return this.request('/mortalites', { method: 'POST', body: JSON.stringify(data) });
  }

  async getMortalites(projetId: string, categorie?: string, dateDebut?: string, dateFin?: string) {
    let query = projetId ? `?projet_id=${projetId}` : '?';
    if (categorie) query += `${projetId ? '&' : ''}categorie=${categorie}`;
    if (dateDebut && dateFin) query += `${projetId || categorie ? '&' : ''}debut=${dateDebut}&fin=${dateFin}`;
    return this.request(`/mortalites${query}`);
  }

  async getStatistiquesMortalite(projetId: string) {
    return this.request(`/mortalites/statistiques?projet_id=${projetId}`);
  }

  async getTauxMortaliteParCause(projetId: string) {
    return this.request(`/mortalites/taux-par-cause?projet_id=${projetId}`);
  }

  // ========== CALENDRIER & RAPPELS ==========
  async createCalendrierVaccination(data: any) {
    return this.request('/calendrier-vaccinations', { method: 'POST', body: JSON.stringify(data) });
  }

  async getCalendrierVaccinations(projetId: string) {
    return this.request(`/calendrier-vaccinations?projet_id=${projetId}`);
  }

  async getCalendrierVaccinationById(id: string) {
    return this.request(`/calendrier-vaccinations/${id}`);
  }

  async updateCalendrierVaccination(id: string, data: any) {
    return this.request(`/calendrier-vaccinations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteCalendrierVaccination(id: string) {
    return this.request(`/calendrier-vaccinations/${id}`, { method: 'DELETE' });
  }

  async createRappelVaccination(data: any) {
    return this.request('/rappels-vaccinations', { method: 'POST', body: JSON.stringify(data) });
  }

  async getRappelsVaccinations(projetId: string, aVenir?: boolean, enRetard?: boolean, jours?: number) {
    if (aVenir) return this.request(`/rappels-vaccinations/avenir?projet_id=${projetId}&jours=${jours || 7}`);
    if (enRetard) return this.request(`/rappels-vaccinations/retard?projet_id=${projetId}`);
    return this.request(`/rappels-vaccinations?projet_id=${projetId}`);
  }
}

export const apiClient = new ApiClient();

