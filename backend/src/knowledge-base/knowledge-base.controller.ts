import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeDto, UpdateKnowledgeDto } from './dto/create-knowledge.dto';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto';
import { CreateFeedbackDto } from './dto/feedback.dto';

@ApiTags('Knowledge Base')
@Controller('knowledge-base')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KnowledgeBaseController {
  constructor(private readonly knowledgeService: KnowledgeBaseService) {}

  // ============================================
  // ENDPOINTS PUBLICS (lecture seule)
  // ============================================

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Rechercher dans la base de connaissances' })
  async search(@Query() dto: SearchKnowledgeDto) {
    try {
      // Essayer d'abord avec la fonction PostgreSQL
      return await this.knowledgeService.search(dto);
    } catch (error) {
      // Fallback sur recherche simple si la fonction n'existe pas
      return await this.knowledgeService.searchSimple(
        dto.query, 
        dto.projet_id, 
        dto.limit || 5
      );
    }
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Lister les catégories disponibles' })
  async getCategories(@Query('projet_id') projetId?: string) {
    return this.knowledgeService.getCategories(projetId);
  }

  @Get('by-category/:category')
  @Public()
  @ApiOperation({ summary: 'Lister les contenus par catégorie' })
  async getByCategory(
    @Param('category') category: string,
    @Query('projet_id') projetId?: string
  ) {
    return this.knowledgeService.findByCategory(category, projetId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Récupérer un contenu par ID' })
  async getById(@Param('id') id: string) {
    return this.knowledgeService.findByIdAndIncrementViews(id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lister tous les contenus' })
  async getAll(
    @Query('projet_id') projetId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.knowledgeService.findAll(projetId, limit || 100, offset || 0);
  }

  // ============================================
  // ENDPOINTS PROTÉGÉS (écriture)
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau contenu' })
  async create(@Body() dto: CreateKnowledgeDto, @Request() req) {
    return this.knowledgeService.create(dto, req.user?.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour un contenu' })
  async update(@Param('id') id: string, @Body() dto: UpdateKnowledgeDto) {
    return this.knowledgeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un contenu (soft delete)' })
  async delete(@Param('id') id: string) {
    await this.knowledgeService.delete(id);
    return { success: true };
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Enregistrer un feedback utilisateur' })
  async createFeedback(@Body() dto: CreateFeedbackDto, @Request() req) {
    await this.knowledgeService.createFeedback(dto, req.user.id);
    return { success: true };
  }

  @Get('stats/count')
  @Public()
  @ApiOperation({ summary: 'Compter le nombre de contenus' })
  async count(@Query('projet_id') projetId?: string) {
    const count = await this.knowledgeService.count(projetId);
    return { count };
  }
}

