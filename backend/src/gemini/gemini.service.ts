import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY non configurée dans .env');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    this.logger.log('Service Gemini initialisé avec succès');
  }

  async chat(prompt: string, systemInstruction?: string) {
    try {
      this.logger.debug(`[chat] Envoi prompt: ${prompt.substring(0, 50)}...`);
      
      const chat = this.model.startChat({
        history: [],
        systemInstruction: systemInstruction || this.getDefaultSystemInstruction(),
      });

      const result = await chat.sendMessage(prompt);
      const response = result.response.text();
      
      this.logger.debug(`[chat] Réponse reçue: ${response.substring(0, 50)}...`);
      return response;
      
    } catch (error) {
      this.logger.error(`[chat] Erreur Gemini:`, error);
      throw new Error('Erreur lors de la communication avec Gemini');
    }
  }

  async chatWithFunctions(
    prompt: string,
    tools: any[],
    systemInstruction?: string
  ) {
    try {
      const chat = this.model.startChat({
        history: [],
        systemInstruction: systemInstruction || this.getDefaultSystemInstruction(),
        tools,
      });

      const result = await chat.sendMessage(prompt);
      return result.response;
      
    } catch (error) {
      this.logger.error(`[chatWithFunctions] Erreur:`, error);
      throw error;
    }
  }

  private getDefaultSystemInstruction(): string {
    return `Tu es Kouakou, un assistant financier personnel francophone spécialisé dans la gestion de porcherie.
    
Tes capacités :
- Créer et modifier des dépenses et revenus
- Collecter des informations sur les transactions
- Répondre aux questions sur la base de connaissances
- Naviguer dans les données de l'exploitation

Ton style :
- Amical mais professionnel
- Concis et actionnable
- Toujours en français
- Demande confirmation avant toute modification ou suppression`;
  }
}