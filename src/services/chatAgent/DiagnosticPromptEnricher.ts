/**
 * Service pour enrichir les prompts utilisateur avec le contexte
 * Améliore la qualité des diagnostics en fournissant plus d'informations
 */

import { format } from 'date-fns';
import { getDatabase } from '../database';
import { AnimalRepository, VaccinationRepository, TraitementRepository, MaladieRepository } from '../../database/repositories';

export interface DiagnosticInput {
  pig_info: {
    id?: string;
    animal_id?: number;
    name?: string;
    age?: number;
    race?: string;
    sex?: string;
    weight?: number;
    vaccinations?: Array<{ type: string; date: string }>;
    recent_treatments?: Array<{ disease: string; date: string }>;
  };
  symptoms_text?: string;
  photos?: string[];
  farm_context: {
    total_pigs?: number;
    other_sick_pigs?: number;
    new_animal_recently?: boolean;
    recent_changes?: string;
    last_vet_visit?: string;
  };
}

export class DiagnosticPromptEnricher {
  /**
   * Construit un prompt utilisateur enrichi avec tout le contexte disponible
   */
  async buildEnrichedUserPrompt(input: DiagnosticInput): Promise<string> {
    const parts: string[] = [];

    // 1. Contexte du porc
    if (input.pig_info.animal_id) {
      const pigContext = await this.getPigContext(input.pig_info.animal_id);
      if (pigContext) {
        parts.push(this.formatPigContext(pigContext));
      }
    } else if (input.pig_info.id || input.pig_info.name) {
      parts.push(this.formatBasicPigInfo(input.pig_info));
    }

    // 2. Symptômes décrits par l'utilisateur
    if (input.symptoms_text) {
      parts.push(this.formatSymptoms(input.symptoms_text));
    }

    // 3. Photos (si présentes)
    if (input.photos && input.photos.length > 0) {
      parts.push(this.formatPhotos(input.photos.length));
    }

    // 4. Contexte ferme
    parts.push(this.formatFarmContext(input.farm_context));

    // 5. Base de connaissances pertinente
    if (input.symptoms_text) {
      const relevantDiseases = this.filterRelevantDiseases(input.symptoms_text);
      if (relevantDiseases.length > 0) {
        parts.push(this.formatRelevantDiseases(relevantDiseases));
      }
    }

    // 6. Instructions finales
    parts.push(`
---
**Maintenant, fournis ton diagnostic structuré en suivant EXACTEMENT le format et la méthodologie du prompt système.**
    `);

    return parts.join('\n\n');
  }

  /**
   * Récupère le contexte complet d'un porc depuis la base de données
   */
  private async getPigContext(animalId: number): Promise<any> {
    try {
      const db = await getDatabase();
      const animalRepo = new AnimalRepository(db);
      const vaccinationRepo = new VaccinationRepository(db);
      const traitementRepo = new TraitementRepository(db);
      const maladieRepo = new MaladieRepository(db);

      const animal = await animalRepo.findById(animalId);
      if (!animal) return null;

      // Récupérer vaccinations récentes (6 derniers mois)
      const vaccinations = await vaccinationRepo.findByAnimalId(animalId);
      const recentVaccinations = vaccinations
        .filter(v => {
          const vaccDate = new Date(v.date_vaccination);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return vaccDate >= sixMonthsAgo;
        })
        .map(v => ({
          type: v.type_vaccin || 'Vaccin',
          date: v.date_vaccination,
        }));

      // Récupérer traitements récents (3 derniers mois)
      const traitements = await traitementRepo.findByAnimalId(animalId);
      const recentTreatments = traitements
        .filter(t => {
          const treatDate = new Date(t.date_debut);
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          return treatDate >= threeMonthsAgo;
        })
        .map(t => ({
          disease: t.nom_maladie || 'Traitement',
          date: t.date_debut,
        }));

      // Récupérer maladies récentes (6 derniers mois)
      const maladies = await maladieRepo.findByAnimalId(animalId);
      const recentMaladies = maladies
        .filter(m => {
          const maladieDate = new Date(m.date_debut);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return maladieDate >= sixMonthsAgo;
        })
        .map(m => ({
          disease: m.nom_maladie,
          date: m.date_debut,
        }));

      // Calculer l'âge approximatif
      const ageMonths = animal.date_naissance
        ? Math.floor((Date.now() - new Date(animal.date_naissance).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : null;

      return {
        id: animal.id,
        name: animal.nom || animal.code_animal,
        age: ageMonths,
        race: animal.race,
        sex: animal.sexe,
        weight: null, // À récupérer depuis pesées si nécessaire
        vaccinations: recentVaccinations,
        recent_treatments: [...recentTreatments, ...recentMaladies],
      };
    } catch (error) {
      console.error('[DiagnosticPromptEnricher] Erreur récupération contexte porc:', error);
      return null;
    }
  }

  /**
   * Formate les informations du porc
   */
  private formatPigContext(pig: any): string {
    return `
## INFORMATIONS DU PORC

- **ID** : ${pig.id}
- **Nom** : ${pig.name || 'Non renseigné'}
${pig.age ? `- **Âge** : ${pig.age} mois` : ''}
${pig.race ? `- **Race** : ${pig.race}` : ''}
${pig.sex ? `- **Sexe** : ${pig.sex}` : ''}
${pig.weight ? `- **Poids actuel** : ${pig.weight} kg` : ''}
- **Statut vaccinal** : ${pig.vaccinations?.length || 0} vaccin(s) récent(s)
${pig.vaccinations?.length > 0
  ? pig.vaccinations.map((v: any) => `  - ${v.type} (${format(new Date(v.date), 'dd/MM/yyyy')})`).join('\n')
  : '  Aucun vaccin récent'}
- **Historique médical récent** :
${pig.recent_treatments?.length
  ? pig.recent_treatments.map((t: any) => `  - ${t.disease} traité le ${format(new Date(t.date), 'dd/MM/yyyy')}`).join('\n')
  : '  Aucun traitement récent'}
    `;
  }

  /**
   * Formate les informations basiques du porc (si pas d'ID)
   */
  private formatBasicPigInfo(pig: any): string {
    return `
## INFORMATIONS DU PORC

- **Identifiant** : ${pig.id || pig.name || 'Non spécifié'}
${pig.age ? `- **Âge** : ${pig.age} mois` : ''}
${pig.race ? `- **Race** : ${pig.race}` : ''}
${pig.sex ? `- **Sexe** : ${pig.sex}` : ''}
${pig.weight ? `- **Poids** : ${pig.weight} kg` : ''}
    `;
  }

  /**
   * Formate les symptômes avec extraction de mots-clés
   */
  private formatSymptoms(text: string): string {
    const keywords = this.extractKeywords(text);
    return `
## SYMPTÔMES DÉCRITS PAR L'ÉLEVEUR

"${text}"

**Mots-clés détectés automatiquement :**
${keywords.length > 0 ? keywords.map(kw => `- ${kw}`).join('\n') : '- Analyse globale nécessaire'}
    `;
  }

  /**
   * Formate les informations sur les photos
   */
  private formatPhotos(count: number): string {
    return `
## PHOTOS FOURNIES

${count} photo(s) du porc malade.

**Instructions d'analyse des photos :**

1. Examine chaque photo méthodiquement (peau, yeux, posture, etc.)
2. Note tous les signes visuels anormaux
3. Compare avec la description textuelle pour cohérence
4. Si divergence description/photo, mentionne-le et demande clarification
    `;
  }

  /**
   * Formate le contexte de la ferme
   */
  private formatFarmContext(context: any): string {
    return `
## CONTEXTE DE LA FERME

${context.total_pigs ? `- **Nombre total de porcs** : ${context.total_pigs}` : ''}
${context.other_sick_pigs !== undefined
  ? `- **Autres porcs malades ?** : ${context.other_sick_pigs > 0 ? `Oui (${context.other_sick_pigs})` : 'Non'}`
  : ''}
${context.new_animal_recently !== undefined
  ? `- **Nouvel animal introduit récemment ?** : ${context.new_animal_recently ? 'Oui' : 'Non'}`
  : ''}
${context.recent_changes ? `- **Changements récents** : ${context.recent_changes}` : ''}
${context.last_vet_visit
  ? `- **Dernière visite vétérinaire** : ${format(new Date(context.last_vet_visit), 'dd/MM/yyyy')}`
  : ''}
    `;
  }

  /**
   * Filtre les maladies pertinentes selon les symptômes
   */
  private filterRelevantDiseases(symptomsText: string): any[] {
    // Import dynamique pour éviter dépendance circulaire
    const porcineDiseases = require('../../data/porcineDiseases.json');
    const normalized = symptomsText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const relevant: any[] = [];

    for (const disease of porcineDiseases) {
      let score = 0;

      // Vérifier mots-clés
      for (const keyword of disease.keywords || []) {
        if (normalized.includes(keyword.toLowerCase())) {
          score += 2;
        }
      }

      // Vérifier symptômes
      for (const symptom of disease.symptoms || []) {
        if (normalized.includes(symptom.toLowerCase())) {
          score += 3;
        }
      }

      if (score > 0) {
        relevant.push({
          ...disease,
          relevanceScore: score,
        });
      }
    }

    // Trier par score et retourner top 5
    return relevant.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  /**
   * Formate les maladies pertinentes
   */
  private formatRelevantDiseases(diseases: any[]): string {
    return `
## BASE DE CONNAISSANCES (Maladies pertinentes)

Voici les maladies les plus susceptibles de correspondre aux symptômes décrits :

${diseases
  .map(
    (d) => `
**${d.name}** (Score de pertinence: ${d.relevanceScore})
- Symptômes: ${d.symptoms.join(', ')}
- Gravité: ${d.gravity}
- Mots-clés: ${d.keywords.join(', ')}
`
  )
  .join('\n')}

**Note** : Ces maladies ont été pré-filtrées selon les symptômes. Tu peux aussi considérer d'autres maladies si les symptômes ne correspondent pas parfaitement.
    `;
  }

  /**
   * Extrait les mots-clés catégorisés depuis le texte
   */
  private extractKeywords(text: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'Symptômes cutanés': ['tache', 'rouge', 'croûte', 'plaie', 'grattage', 'peau', 'gale', 'parasite', 'bouton', 'plaque', 'lésion'],
      'Symptômes digestifs': ['diarrhée', 'diarrhee', 'vomit', 'mange pas', 'appétit', 'appetit', 'maigre', 'ventre', 'caca', 'selles'],
      'Symptômes respiratoires': ['tousse', 'toux', 'respire mal', 'nez', 'éternue', 'eternue', 'souffle', 'respiration'],
      'Symptômes généraux': ['fièvre', 'fievre', 'fatigué', 'fatigue', 'couché', 'couche', 'bouge pas', 'faible', 'tremble'],
      'Symptômes neurologiques': ['convulsion', 'paralysé', 'paralyse', 'titube', 'tourne', 'tombe'],
      'Symptômes oculaires': ['yeux', 'rouge', 'larme', 'pus', 'aveugle', 'écoulement', 'ecoulement'],
    };

    const detected: string[] = [];
    const lowerText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const [category, keywords] of Object.entries(keywordMap)) {
      const matches = keywords.filter((kw) => lowerText.includes(kw));
      if (matches.length > 0) {
        detected.push(`${category}: ${matches.join(', ')}`);
      }
    }

    return detected.length > 0 ? detected : ['Aucun mot-clé spécifique détecté - analyse globale nécessaire'];
  }
}

