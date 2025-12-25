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

  @Get('batch/:batchId/history')
  @ApiOperation({ summary: 'Récupérer l\'historique des pesées pour une bande' })
  async getWeighingHistory(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.weighingService.getWeighingHistory(batchId, user.id);
  }
}

