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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PigMigrationService } from './pig-migration.service';
import { BatchToIndividualDto } from './dto/batch-to-individual.dto';
import { IndividualToBatchDto } from './dto/individual-to-batch.dto';
import { PreviewBatchToIndividualDto } from './dto/preview.dto';
import { PreviewIndividualToBatchDto } from './dto/preview.dto';

@ApiTags('Migration')
@Controller('migration')
@UseGuards(JwtAuthGuard)
export class MigrationController {
  constructor(private migrationService: PigMigrationService) {}

  @Post('preview/batch-to-individual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prévisualiser la conversion batch → individualisé' })
  @ApiResponse({ status: 200, description: 'Prévisualisation réussie' })
  async previewBatchToIndividual(
    @Body() dto: PreviewBatchToIndividualDto,
    @CurrentUser() user: any,
  ) {
    return await this.migrationService.previewBatchToIndividual(
      dto.batchId,
      dto.options,
      user.id,
    );
  }

  @Post('preview/individual-to-batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prévisualiser la conversion individualisé → batch' })
  @ApiResponse({ status: 200, description: 'Prévisualisation réussie' })
  async previewIndividualToBatch(
    @Body() dto: PreviewIndividualToBatchDto,
    @CurrentUser() user: any,
  ) {
    return await this.migrationService.previewIndividualToBatch(
      dto.pigIds,
      dto.options,
      user.id,
    );
  }

  @Post('convert/batch-to-individual')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convertir une bande en animaux individuels' })
  @ApiResponse({ status: 201, description: 'Conversion réussie' })
  async convertBatchToIndividual(
    @Body() dto: BatchToIndividualDto,
    @CurrentUser() user: any,
  ) {
    return await this.migrationService.convertBatchToIndividual(dto, user.id);
  }

  @Post('convert/individual-to-batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convertir des animaux individuels en bandes' })
  @ApiResponse({ status: 201, description: 'Conversion réussie' })
  async convertIndividualToBatch(
    @Body() dto: IndividualToBatchDto,
    @CurrentUser() user: any,
  ) {
    return await this.migrationService.convertIndividualToBatch(dto, user.id);
  }

  @Get('history/:projetId')
  @ApiOperation({ summary: 'Récupérer l\'historique des migrations' })
  @ApiResponse({ status: 200, description: 'Historique récupéré' })
  async getMigrationHistory(
    @Param('projetId') projetId: string,
    @CurrentUser() user: any,
  ) {
    return await this.migrationService.getMigrationHistory(projetId, user.id);
  }
}

