/**
 * Extracteur de paramètres utilisant Google Gemini pour une extraction précise
 * Complément au ParameterExtractor classique pour les cas complexes
 */

import { AgentActionType } from '../../../types/chatAgent';
import { ExtractedParams } from './ParameterExtractor';
import { logger } from '../../../utils/logger';

export class GeminiParameterExtractor {
  private apiKey: string;
  private readonly model = 'gemini-2.5-flash';
  private apiUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Utiliser l'API v1beta avec gemini-2.5-flash
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  /**
   * Extrait tous les paramètres d'un message en utilisant Google Gemini
   * Utilisé en complément du ParameterExtractor classique pour les cas complexes
   */
  async extractAll(userMessage: string, actionType: AgentActionType): Promise<ExtractedParams> {
    try {
      // Définir le schéma de paramètres selon le type d'action
      const schema = this.getParameterSchema(actionType);
      
      const prompt = `Tu es un expert en extraction de paramètres pour une application d'élevage de porcs en Côte d'Ivoire.

ACTION À ANALYSER: ${actionType}

SCHÉMA DE PARAMÈTRES ATTENDU:
${schema.description}

Extrais TOUS les paramètres du message utilisateur et réponds UNIQUEMENT avec un JSON valide selon le schéma ci-dessus.

RÈGLES D'EXTRACTION:
1. MONTANT/COÛT/POIDS: 
   - Formats: "800000", "800 000", "800k" (→ 800000), "1 million" (→ 1000000)
   - Pour poids: "45 kg", "45.5 kg", "45,5 kg" → convertir en nombre (45.5)
   - Ignore les quantités (< 100) et autres nombres non pertinents
   - Exemple: "5 porcs à 800000" → montant: 800000

2. DATE:
   - "aujourd'hui" → date actuelle (format ISO: YYYY-MM-DD)
   - "demain" → date actuelle + 1 jour (format ISO)
   - "15/01/2025" → 2025-01-15 (format ISO)
   - "hier" → date actuelle - 1 jour (format ISO)
   - Toujours retourner en format ISO (YYYY-MM-DD)

3. ACHETEUR/MOTIF/VACCIN/DESCRIPTION/NOTES:
   - Extraire le texte tel quel
   - Exemple: "vendu à Kouamé" → acheteur: "Kouamé"
   - Exemple: "consultation pour maladie" → motif: "maladie"

4. CODE ANIMAL:
   - Cherche "P001", "p001", "P-001", "PORC001"
   - Formats acceptés: P001, p001, P-001, PORC001

5. CATÉGORIE (pour create_depense):
   - "provende", "nourriture", "aliment" → "alimentation"
   - "médicament", "vaccin", "médicaments" → "medicaments"
   - "vétérinaire", "consultation", "veto" → "veterinaire"
   - "entretien", "maintenance" → "entretien"
   - "salaires", "salaire" → "salaires"
   - Autres → "autre"

Si un paramètre n'est pas trouvé dans le message, utilise null (pas undefined).
Ne retourne que les paramètres définis dans le schéma.
Retourne les nombres comme nombres (pas comme chaînes).
Retourne les dates au format ISO (YYYY-MM-DD).

Message utilisateur à analyser: "${userMessage}"

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, SANS markdown, SANS backticks, SANS texte supplémentaire.
Réponds SEULEMENT le JSON, rien d'autre.`;

      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[GeminiParameterExtractor] Erreur API Gemini:', errorData);
        return {};
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        logger.warn('[GeminiParameterExtractor] Aucune réponse texte de Gemini');
        return {};
      }

      try {
        // Extraire le JSON de la réponse (peut être dans du markdown ou texte brut)
        let jsonText = text.trim();
        
        // Nettoyer les backticks markdown
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Extraire le JSON si entouré de texte
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
        
        // Essayer de réparer un JSON potentiellement tronqué
        jsonText = jsonText.trim();
        if (!jsonText.endsWith('}')) {
          // Si le JSON est tronqué, essayer de le compléter
          const openBraces = (jsonText.match(/\{/g) || []).length;
          const closeBraces = (jsonText.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          if (missingBraces > 0) {
            // Trouver la dernière virgule ou deux-points et compléter
            const lastComma = jsonText.lastIndexOf(',');
            const lastColon = jsonText.lastIndexOf(':');
            const lastKey = Math.max(lastComma, lastColon);
            if (lastKey > 0) {
              // Si on a une valeur incomplète, la compléter avec null
              const beforeLastKey = jsonText.substring(0, lastKey + 1);
              const afterLastKey = jsonText.substring(lastKey + 1).trim();
              if (afterLastKey && !afterLastKey.match(/^["\d\[\{]/)) {
                // Valeur incomplète, la compléter
                jsonText = beforeLastKey + ' null' + '}'.repeat(missingBraces);
              } else {
                jsonText = jsonText + '}'.repeat(missingBraces);
              }
            } else {
              jsonText = jsonText + '}'.repeat(missingBraces);
            }
          }
        }

        const result = JSON.parse(jsonText);
        
        // Normaliser les types et nettoyer les valeurs
        const cleaned: ExtractedParams = {};
        
        for (const [key, value] of Object.entries(result)) {
          if (value === null || value === undefined) {
            continue; // Ignorer null/undefined
          }
          
          // Normaliser les types numériques
          if (['montant', 'poids', 'poids_kg', 'cout'].includes(key)) {
            const numValue = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '')) : Number(value);
            if (!isNaN(numValue)) {
              cleaned[key] = numValue;
            }
          } else if (key === 'date' && typeof value === 'string') {
            // Normaliser le format de date vers ISO si nécessaire
            // Accepter YYYY-MM-DD directement
            cleaned[key] = value;
          } else {
            // Garder les autres valeurs telles quelles (strings, etc.)
            cleaned[key] = value;
          }
        }
        
        return cleaned;
      } catch (parseError) {
        logger.error('[GeminiParameterExtractor] Erreur parsing JSON:', parseError, 'Réponse:', text);
        return {};
      }
    } catch (error: unknown) {
      logger.error('[GeminiParameterExtractor] Erreur extraction:', error);
      return {}; // Retourner objet vide en cas d'erreur
    }
  }

  /**
   * Retourne le schéma de paramètres selon le type d'action
   */
  private getParameterSchema(actionType: AgentActionType): {
    description: string;
    fields: string[];
  } {
    switch (actionType) {
      case 'create_revenu':
        return {
          description: `{
  "montant": number (montant en FCFA, obligatoire),
  "acheteur": string (nom de l'acheteur, optionnel),
  "date": string (format ISO YYYY-MM-DD, optionnel),
  "description": string (description de la vente, optionnel)
}`,
          fields: ['montant', 'acheteur', 'date', 'description'],
        };

      case 'create_depense':
        return {
          description: `{
  "montant": number (montant en FCFA, obligatoire),
  "categorie": string (alimentation|medicaments|veterinaire|entretien|salaires|autre, optionnel),
  "date": string (format ISO YYYY-MM-DD, optionnel),
  "description": string (description de la dépense, optionnel)
}`,
          fields: ['montant', 'categorie', 'date', 'description'],
        };

      case 'create_pesee':
        return {
          description: `{
  "animal_code": string (code de l'animal, ex: P001, optionnel),
  "poids": number (poids en kg, obligatoire),
  "date": string (format ISO YYYY-MM-DD, optionnel),
  "notes": string (notes supplémentaires, optionnel)
}`,
          fields: ['animal_code', 'poids', 'date', 'notes'],
        };

      case 'create_vaccination':
        return {
          description: `{
  "animal_code": string (code de l'animal, ex: P001, optionnel),
  "vaccin": string (nom du vaccin, optionnel),
  "date": string (format ISO YYYY-MM-DD, optionnel),
  "notes": string (notes supplémentaires, optionnel)
}`,
          fields: ['animal_code', 'vaccin', 'date', 'notes'],
        };

      case 'create_visite_veterinaire':
        return {
          description: `{
  "animal_code": string (code de l'animal, ex: P001, optionnel),
  "motif": string (motif de la visite, optionnel),
  "date": string (format ISO YYYY-MM-DD, optionnel),
  "cout": number (coût en FCFA, optionnel),
  "notes": string (notes/observations, optionnel)
}`,
          fields: ['animal_code', 'motif', 'date', 'cout', 'notes'],
        };

      default:
        // Schéma générique pour les autres actions
        return {
          description: `{
  "montant": number ou null,
  "nombre": number ou null,
  "poids_kg": number ou null,
  "date": string (format ISO YYYY-MM-DD) ou null,
  "acheteur": string ou null,
  "animal_code": string ou null,
  "categorie": string ou null,
  "libelle": string ou null,
  "description": string ou null,
  "notes": string ou null
}`,
          fields: [
            'montant',
            'nombre',
            'poids_kg',
            'date',
            'acheteur',
            'animal_code',
            'categorie',
            'libelle',
            'description',
            'notes',
          ],
        };
    }
  }
}

