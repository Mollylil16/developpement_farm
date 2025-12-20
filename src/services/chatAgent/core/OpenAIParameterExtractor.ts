/**
 * Extracteur de paramètres utilisant OpenAI pour une extraction 100% précise
 * Complément au ParameterExtractor classique pour les cas complexes
 */

import { ExtractedParams } from './ParameterExtractor';

export class OpenAIParameterExtractor {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.openai.com/v1';
  }

  /**
   * Extrait tous les paramètres d'un message en utilisant OpenAI
   * Utilisé en complément du ParameterExtractor classique pour les cas complexes
   */
  async extractAll(message: string, actionType: string): Promise<ExtractedParams> {
    try {
      const systemPrompt = `Tu es un expert en extraction de paramètres pour une application d'élevage de porcs.

ACTION À ANALYSER: ${actionType}

Extrais TOUS les paramètres du message utilisateur et réponds UNIQUEMENT avec un JSON valide:
{
  "montant": nombre ou null,
  "nombre": nombre ou null,
  "poids_kg": nombre ou null,
  "date": "YYYY-MM-DD" ou null,
  "acheteur": "nom" ou null,
  "animal_code": "code" ou null,
  "categorie": "alimentation|medicaments|veterinaire|entretien|salaires|autre" ou null,
  "libelle": "texte" ou null,
  "frequence": "mensuel|trimestriel|annuel" ou null
}

RÈGLES D'EXTRACTION:
1. MONTANT: Cherche après "à", "pour", "de", "montant", "prix"
   - Formats: "800000", "800 000", "800k" (→ 800000), "1 million" (→ 1000000)
   - Ignore les quantités (< 100) et poids
   - Exemple: "5 porcs à 800000" → montant: 800000, nombre: 5

2. POIDS: Cherche "X kg", "il fait X", "pèse X"
   - Formats: "45 kg", "45.5 kg", "45,5 kg"
   - Range valide: 1-1000 kg

3. QUANTITÉ: Cherche "X porcs", "X têtes", "X animaux"
   - Range valide: 1-10000

4. DATE: Cherche dates relatives ou absolues
   - "aujourd'hui" → date actuelle
   - "demain" → +1 jour
   - "15/01/2025" → 2025-01-15

5. ACHETEUR: Cherche après "à", "pour", "chez", "vendu à"
   - Exemple: "vendu à Kouamé" → acheteur: "Kouamé"

6. CODE ANIMAL: Cherche "P001", "p001", "PORC001"
   - Formats: P001, p001, P-001, PORC001

7. CATÉGORIE: Détecte depuis contexte
   - "provende", "nourriture", "aliment" → alimentation
   - "médicament", "vaccin" → medicaments
   - "vétérinaire", "consultation" → veterinaire

Si un paramètre n'est pas trouvé, utilise null (pas undefined).

Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire.`;

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.1,
          max_tokens: 300,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur OpenAI extraction: ${errorData.error?.message || response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {};
      }

      try {
        const result = JSON.parse(content);
        // Nettoyer les valeurs null
        const cleaned: ExtractedParams = {};
        for (const [key, value] of Object.entries(result)) {
          if (value !== null && value !== undefined) {
            cleaned[key] = value;
          }
        }
        return cleaned;
      } catch (parseError) {
        console.error('[OpenAIParameterExtractor] Erreur parsing JSON:', parseError);
        return {};
      }
    } catch (error: unknown) {
      console.error('[OpenAIParameterExtractor] Erreur extraction:', error);
      return {}; // Retourner objet vide en cas d'erreur
    }
  }
}
