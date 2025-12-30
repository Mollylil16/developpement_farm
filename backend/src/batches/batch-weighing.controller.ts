import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchWeighingService } from './batch-weighing.service';
import { CreateWeighingDto } from './dto/create-weighing.dto';

@ApiTags('batch-weighings')
@Controller('batch-weighings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchWeighingController {
  constructor(private readonly weighingService: BatchWeighingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une pesée collective pour une bande' })
  async createWeighing(
    @Body() dto: CreateWeighingDto,
    @CurrentUser() user: any,
  ) {
    return await this.weighingService.createWeighing(dto, user.id);
  }

  @Get('projet/:projetId')
  @ApiOperation({ summary: 'Récupérer toutes les pesées de batch pour un projet' })
  async getWeighingsByProjet(
    @Param('projetId') projetId: string,
    @CurrentUser() user: any,
  ) {
    return await this.weighingService.getWeighingsByProjet(projetId, user.id);
  }

  @Get('batch/:batchId/history')
  @ApiOperation({ summary: 'Récupérer l\'historique des pesées pour une bande' })
  async getWeighingHistory(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.weighingService.getWeighingHistory(batchId, user.id);
  }

  @Get(':weighingId/details')
  @ApiOperation({ summary: 'Détails complets d\'une pesée collective' })
  async getWeighingDetails(
    @Param('weighingId') weighingId: string,
    @CurrentUser() user: any,
  ) {
    return await this.weighingService.getWeighingDetails(weighingId, user.id);
  }
}

