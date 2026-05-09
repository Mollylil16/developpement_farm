/**
 * Service de diagnostic amélioré utilisant les prompts enrichis
 * Combine l'analyse locale avec le prompt enrichi pour meilleure précision
 */

import { DiagnosticService } from './DiagnosticService';
import { DiagnosticPromptEnricher, DiagnosticInput } from './DiagnosticPromptEnricher';
import { FULL_VETERINARY_PROMPT } from '../../config/aiPrompts';
import { ChatAgentAPI } from './ChatAgentAPI';
import { AgentConfig } from '../../types/chatAgent';

export interface EnhancedDiagnosticResult {
  // Résultat de l'analyse locale
  localDiagnostic: {
    disease: any;
    confidence: number;
    matchedKeywords: string[];
    matchedSymptoms: string[];
  };
  // Prompt enrichi généré
  enrichedPrompt: string;
  // Réponse de l'IA si API disponible
  aiResponse?: string;
  // Recommandation finale
  recommendation: string;
  contextualQuestions?: string[];
}

export class EnhancedDiagnosticService {
  private diagnosticService: DiagnosticService;
  private promptEnricher: DiagnosticPromptEnricher;
  private aiAPI?: ChatAgentAPI;

  constructor(config?: AgentConfig) {
    this.diagnosticService = new DiagnosticService();
    this.diagnosticService.initialize();
    this.promptEnricher = new DiagnosticPromptEnricher();
    
    // Initialiser l'API IA si config fournie
    if (config?.apiKey) {
      this.aiAPI = new ChatAgentAPI(config);
    }
  }

  /**
   * Diagnostic amélioré avec contexte enrichi
   */
  async diagnoseWithContext(input: DiagnosticInput): Promise<EnhancedDiagnosticResult> {
    // 1. Analyse locale rapide
    const localDiagnostic = this.diagnosticService.analyzeSymptoms(
      input.symptoms_text || ''
    );

    // 2. Générer le prompt enrichi
    const enrichedPrompt = await this.promptEnricher.buildEnrichedUserPrompt(input);

    // 3. Si API IA disponible, l'utiliser avec le prompt enrichi
    let aiResponse: string | undefined;
    if (this.aiAPI && input.symptoms_text) {
      try {
        const messages = [
          {
            role: 'system' as const,
            content: FULL_VETERINARY_PROMPT,
          },
          {
            role: 'user' as const,
            content: enrichedPrompt,
          },
        ];
        
        aiResponse = await this.aiAPI.sendMessage(messages);
        console.log('[EnhancedDiagnosticService] Réponse IA reçue:', aiResponse.substring(0, 200));
      } catch (error) {
        console.error('[EnhancedDiagnosticService] Erreur appel API IA:', error);
        // Continuer avec l'analyse locale en cas d'erreur
      }
    }

    // 4. Combiner les résultats
    const recommendation = this.combineResults(localDiagnostic, aiResponse);

    return {
      localDiagnostic: {
        disease: localDiagnostic.disease,
        confidence: localDiagnostic.confidence,
        matchedKeywords: localDiagnostic.matchedKeywords,
        matchedSymptoms: localDiagnostic.matchedSymptoms,
      },
      enrichedPrompt,
      aiResponse,
      recommendation,
      contextualQuestions: localDiagnostic.contextualQuestions,
    };
  }

  /**
   * Combine les résultats de l'analyse locale et de l'IA
   */
  private combineResults(localDiagnostic: any, aiResponse?: string): string {
    // Si on a une réponse de l'IA, la prioriser
    if (aiResponse) {
      return aiResponse;
    }

    // Sinon, utiliser l'analyse locale avec le format amélioré
    if (localDiagnostic.disease) {
      const urgency = this.getUrgencyLevel(localDiagnostic.disease.gravity, localDiagnostic.confidence);
      const urgencyEmoji = urgency === 'critique' ? '🔴' : urgency === 'urgent' ? '🟠' : urgency === 'important' ? '🟡' : '🟢';
      
      return `${urgencyEmoji} **${urgency.toUpperCase()}** - Action ${this.getActionTiming(urgency)}

## ${localDiagnostic.disease.name} - Probabilité : ${Math.round(localDiagnostic.confidence * 100)}%

**Pourquoi ce diagnostic :**
${localDiagnostic.matchedSymptoms.map((s: string) => `- ✅ ${s}`).join('\n')}
${localDiagnostic.matchedKeywords.map((k: string) => `- ✅ ${k}`).join('\n')}

**Gravité :** ${this.mapGravity(localDiagnostic.disease.gravity)}
**Contagiosité :** ${this.getContagiosity(localDiagnostic.disease.gravity)}

${localDiagnostic.recommendation}

⚠️ **IMPORTANT** : Ceci est une indication basée sur les symptômes décrits. Seul un vétérinaire peut confirmer le diagnostic !`;
    }

    return localDiagnostic.recommendation || 'Je n\'ai pas pu identifier de maladie spécifique avec les symptômes décrits.';
  }

  private getUrgencyLevel(gravity: string, confidence: number): 'critique' | 'urgent' | 'important' | 'normal' {
    if (gravity === 'Haut') return 'critique';
    if (gravity === 'Moyen-Haut' || confidence > 0.7) return 'urgent';
    if (gravity === 'Moyen' || confidence > 0.4) return 'important';
    return 'normal';
  }

  private getActionTiming(urgency: string): string {
    switch (urgency) {
      case 'critique': return 'dans l\'heure';
      case 'urgent': return 'dans les 24h';
      case 'important': return 'dans 2-3 jours';
      default: return 'sans urgence';
    }
  }

  private mapGravity(gravity: string): string {
    switch (gravity) {
      case 'Haut': return 'CRITIQUE';
      case 'Moyen-Haut': return 'Élevée';
      case 'Moyen': return 'Moyenne';
      case 'Bas-Moyen': return 'Faible';
      default: return 'Moyenne';
    }
  }

  private getContagiosity(gravity: string): string {
    if (gravity === 'Haut' || gravity === 'Moyen-Haut') return 'ÉLEVÉE';
    if (gravity === 'Moyen') return 'Moyenne';
    return 'Faible';
  }
}

