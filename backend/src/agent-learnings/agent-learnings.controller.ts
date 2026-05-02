import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentLearningsService } from './agent-learnings.service';
import { CreateLearningDto } from './dto/create-learning.dto';
import { SearchLearningsDto } from './dto/search-learnings.dto';
import { RecordConversationDto } from './dto/record-conversation.dto';

@ApiTags('Agent Learnings')
@Controller('agent-learnings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentLearningsController {
  constructor(private readonly learningsService: AgentLearningsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un apprentissage' })
  async createLearning(@Body() dto: CreateLearningDto, @Request() req) {
    return this.learningsService.createLearning(dto, req.user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Rechercher des apprentissages par mots-clés' })
  async searchLearnings(@Query() dto: SearchLearningsDto) {
    return this.learningsService.searchByKeywords(dto);
  }

  @Get('similar')
  @ApiOperation({ summary: 'Trouver un apprentissage similaire' })
  async findSimilar(
    @Query('projet_id') projetId: string,
    @Query('message') message: string
  ) {
    return this.learningsService.findSimilarLearning(projetId, message);
  }

  @Post('correction')
  @ApiOperation({ summary: 'Enregistrer une correction utilisateur' })
  async recordCorrection(
    @Body() body: {
      projet_id: string;
      original_message: string;
      detected_intent?: string;
      correct_intent: string;
      correct_params?: Record<string, any>;
    },
    @Request() req
  ) {
    return this.learningsService.recordUserCorrection(
      body.projet_id,
      req.user.id,
      body.original_message,
      body.detected_intent || null,
      body.correct_intent,
      body.correct_params
    );
  }

  @Post('success')
  @ApiOperation({ summary: 'Enregistrer un succès d\'intention' })
  async recordSuccess(
    @Body() body: {
      projet_id: string;
      user_message: string;
      intent: string;
      params?: Record<string, any>;
      confidence?: number;
    },
    @Request() req
  ) {
    try {
      await this.learningsService.recordSuccessfulIntent(
        body.projet_id,
        req.user.id,
        body.user_message,
        body.intent,
        body.params,
        body.confidence
      );
      return { success: true };
    } catch (error) {
      // Retourner un objet vide pour éviter une erreur 500 côté client
      return { success: false, error: 'Erreur lors de l\'enregistrement' };
    }
  }

  @Post('failure')
  @ApiOperation({ summary: 'Enregistrer un échec d\'intention' })
  async recordFailure(
    @Body() body: {
      projet_id: string;
      user_message: string;
      detected_intent?: string;
    },
    @Request() req
  ) {
    try {
      return await this.learningsService.recordFailedIntent(
        body.projet_id,
        req.user.id,
        body.user_message,
        body.detected_intent
      );
    } catch (error) {
      // Retourner un objet vide pour éviter une erreur 500 côté client
      return { success: false, error: 'Erreur lors de l\'enregistrement' };
    }
  }

  @Post('conversation')
  @ApiOperation({ summary: 'Enregistrer un message de conversation' })
  async recordConversation(@Body() dto: RecordConversationDto, @Request() req) {
    try {
      await this.learningsService.recordConversation(dto, req.user.id);
      return { success: true };
    } catch (error) {
      // Si l'erreur indique que la table n'existe pas (code 42P01), retourner success quand même
      // car c'est une opération non-critique (fire-and-forget)
      if ((error as any)?.code === '42P01') {
        return { success: true };
      }
      // Pour toute autre erreur, retourner success quand même pour ne pas bloquer
      return { success: true };
    }
  }

  @Get('conversation-history')
  @ApiOperation({ summary: 'Récupérer l\'historique d\'une conversation' })
  async getConversationHistory(
    @Query('projet_id') projetId: string,
    @Query('conversation_id') conversationId: string,
    @Query('limit') limit?: number,
    @Request() req?: any
  ) {
    // Validation des paramètres
    if (!projetId || !conversationId) {
      return [];
    }
    
    try {
      const result = await this.learningsService.getConversationHistory(
        projetId,
        conversationId,
        limit || 100
      );
      return result;
    } catch (error) {
      // Si l'erreur indique que la table n'existe pas (code 42P01), retourner un tableau vide
      // Sinon, retourner quand même un tableau vide pour ne pas bloquer l'application
      // Retourner un tableau vide en cas d'erreur pour ne pas bloquer l'application
      return [];
    }
  }

  @Get('by-projet')
  @ApiOperation({ summary: 'Récupérer les apprentissages d\'un projet' })
  async getLearningsByProjet(
    @Query('projet_id') projetId: string,
    @Query('limit') limit?: number
  ) {
    return this.learningsService.getLearningsByProjet(projetId, limit || 100);
  }

  @Post('extract-keywords')
  @ApiOperation({ summary: 'Extraire les mots-clés d\'un message' })
  extractKeywords(@Body() body: { message: string }) {
    return {
      keywords: this.learningsService.extractKeywords(body.message),
    };
  }

  @Post('increment-usage')
  @ApiOperation({ summary: 'Incrémenter le compteur d\'utilisation d\'un apprentissage' })
  async incrementUsage(@Body() body: { learning_id: string }) {
    await this.learningsService.incrementUsageCount(body.learning_id);
    return { success: true };
  }
}

