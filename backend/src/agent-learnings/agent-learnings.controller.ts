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
    await this.learningsService.recordSuccessfulIntent(
      body.projet_id,
      req.user.id,
      body.user_message,
      body.intent,
      body.params,
      body.confidence
    );
    return { success: true };
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
    return this.learningsService.recordFailedIntent(
      body.projet_id,
      req.user.id,
      body.user_message,
      body.detected_intent
    );
  }

  @Post('conversation')
  @ApiOperation({ summary: 'Enregistrer un message de conversation' })
  async recordConversation(@Body() dto: RecordConversationDto, @Request() req) {
    await this.learningsService.recordConversation(dto, req.user.id);
    return { success: true };
  }

  @Get('conversation-history')
  @ApiOperation({ summary: 'Récupérer l\'historique d\'une conversation' })
  async getConversationHistory(
    @Query('projet_id') projetId: string,
    @Query('conversation_id') conversationId: string,
    @Query('limit') limit?: number
  ) {
    return this.learningsService.getConversationHistory(
      projetId,
      conversationId,
      limit || 10
    );
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
}

