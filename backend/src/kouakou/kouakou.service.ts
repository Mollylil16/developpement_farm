import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class KouakouService {
  private readonly logger = new Logger(KouakouService.name);

  constructor(private readonly geminiService: GeminiService) {}

  async processMessage(message: string, userId: string, context?: any) {
    try {
      this.logger.debug(`[processMessage] Message de ${userId}: ${message}`);

      // Enrichir le prompt avec le contexte utilisateur si disponible
      const enrichedPrompt = this.enrichPromptWithContext(message, context);

      // Appeler Gemini
      const response = await this.geminiService.chat(enrichedPrompt);

      return {
        response,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      this.logger.error(`[processMessage] Erreur:`, error);
      throw error;
    }
  }

  private enrichPromptWithContext(message: string, context?: any): string {
    if (!context) return message;

    let enrichedPrompt = message;

    if (context.farmId) {
      enrichedPrompt += `\n\nContexte: L'utilisateur travaille sur la ferme ${context.farmId}.`;
    }

    if (context.recentTransactions) {
      enrichedPrompt += `\n\nTransactions récentes: ${JSON.stringify(context.recentTransactions)}`;
    }

    return enrichedPrompt;
  }
}

