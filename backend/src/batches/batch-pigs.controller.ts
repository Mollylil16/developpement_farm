import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchPigsService } from './batch-pigs.service';
import {
  CreateBatchPigDto,
  TransferPigDto,
  RemovePigDto,
  CreateBatchWithPigsDto,
  UpdateBatchSettingsDto,
} from './dto';

@Controller('batch-pigs')
@UseGuards(JwtAuthGuard)
export class BatchPigsController {
  private readonly logger = new Logger(BatchPigsController.name);

  constructor(private readonly batchPigsService: BatchPigsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addPig(
    @Body() dto: CreateBatchPigDto,
    @CurrentUser() user: any,
  ) {
    return await this.batchPigsService.addPigToBatch(dto, user.id);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transferPig(
    @Body() dto: TransferPigDto,
    @CurrentUser() user: any,
  ) {
    return await this.batchPigsService.transferPig(dto, user.id);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  async removePig(
    @Body() dto: RemovePigDto,
    @CurrentUser() user: any,
  ) {
    await this.batchPigsService.removePig(dto, user.id);
    return { message: 'Porc retiré avec succès' };
  }

  @Get('projet/:projetId')
  async getAllBatchesByProjet(
    @Param('projetId') projetId: string,
    @CurrentUser() user: any,
  ) {
try {
      const result = await this.batchPigsService.getAllBatchesByProjet(projetId, user.id);
return result;
    } catch (error: any) {
this.logger.error(`getAllBatchesByProjet: error for projetId=${projetId}, userId=${user.id}`, error.stack || error.message);
      throw error;
    }
  }

  @Get('batch/:batchId')
  async getPigsByBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.debug(`getPigsByBatch: batchId=${batchId}, userId=${user.id}`);
    try {
      const result = await this.batchPigsService.getPigsByBatch(batchId, user.id);
      this.logger.debug(`getPigsByBatch: success, returned ${result.length} pigs`);
      return result;
    } catch (error: any) {
      this.logger.error(
        `getPigsByBatch: error for batchId=${batchId}, userId=${user.id}`,
        error.stack || error.message,
      );
      // Si c'est une exception NestJS (NotFoundException, ForbiddenException, etc.), la relancer telle quelle
      if (error.statusCode || error.status) {
        throw error;
      }
      // Sinon, encapsuler dans une erreur générique avec plus de détails
      this.logger.error(`getPigsByBatch: unexpected error`, {
        batchId,
        userId: user.id,
        errorName: error?.constructor?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
      });
      throw new Error(
        `Erreur lors de la récupération des porcs de la bande: ${error.message || 'Erreur inconnue'}`,
      );
    }
  }

  @Get(':pigId/movements')
  async getPigMovements(
    @Param('pigId') pigId: string,
    @CurrentUser() user: any,
  ) {
    return await this.batchPigsService.getPigMovements(pigId, user.id);
  }

  @Get('batch/:batchId/stats')
  async getBatchStats(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.batchPigsService.getBatchStats(batchId, user.id);
  }

  @Patch('batch/:batchId/settings')
  async updateBatchSettings(
    @Param('batchId') batchId: string,
    @Body() dto: UpdateBatchSettingsDto,
    @CurrentUser() user: any,
  ) {
    return await this.batchPigsService.updateBatchSettings(
      batchId,
      dto,
      user.id,
    );
  }

  @Post('create-batch')
  @HttpCode(HttpStatus.CREATED)
  async createBatchWithPigs(
    @Body() dto: CreateBatchWithPigsDto,
    @CurrentUser() user: any,
  ) {
    return await this.batchPigsService.createBatchWithPigs(dto, user.id);
  }

  @Get('projet/:projetId/next-pen-name')
  async getNextPenName(
    @Param('projetId') projetId: string,
    @CurrentUser() user: any,
  ) {
    const nextPenName = await this.batchPigsService.getNextPenName(
      projetId,
      user.id,
    );
    return { pen_name: nextPenName };
  }
}

