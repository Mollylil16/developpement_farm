import {
  Controller,
  Post,
  Get,
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
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'batch-pigs.controller.ts:57',message:'getAllBatchesByProjet entry',data:{projetId,userId:user.id,projetIdType:typeof projetId,userIdType:typeof user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'); } catch(e) {}
    // #endregion
    try {
      const result = await this.batchPigsService.getAllBatchesByProjet(projetId, user.id);
      // #region agent log
      try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'batch-pigs.controller.ts:62',message:'getAllBatchesByProjet success',data:{projetId,batchesCount:result.length,batches:result.map(b=>({id:b.id,pen_name:b.pen_name,category:b.category,total_count:b.total_count}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n'); } catch(e) {}
      // #endregion
      return result;
    } catch (error: any) {
      // #region agent log
      try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'batch-pigs.controller.ts:65',message:'getAllBatchesByProjet error',data:{projetId,userId:user.id,errorMessage:error?.message,errorStack:error?.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n'); } catch(e) {}
      // #endregion
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
      this.logger.error(`getPigsByBatch: error for batchId=${batchId}, userId=${user.id}`, error.stack || error.message);
      throw error;
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

  @Post('create-batch')
  @HttpCode(HttpStatus.CREATED)
  async createBatchWithPigs(
    @Body() dto: CreateBatchWithPigsDto,
    @CurrentUser() user: any,
  ) {
    return await this.batchPigsService.createBatchWithPigs(dto, user.id);
  }
}

