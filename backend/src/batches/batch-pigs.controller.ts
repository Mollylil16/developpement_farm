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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchPigsService } from './batch-pigs.service';
import {
  CreateBatchPigDto,
  TransferPigDto,
  RemovePigDto,
} from './dto';

@Controller('batch-pigs')
@UseGuards(JwtAuthGuard)
export class BatchPigsController {
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

  @Get('batch/:batchId')
  async getPigsByBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.batchPigsService.getPigsByBatch(batchId, user.id);
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
}

