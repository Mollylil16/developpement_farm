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
import { BatchVaccinationService } from './batch-vaccination.service';
import { VaccinateBatchDto } from './dto/vaccinate-batch.dto';

@ApiTags('batch-vaccinations')
@Controller('batch-vaccinations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchVaccinationController {
  constructor(private readonly vaccinationService: BatchVaccinationService) {}

  @Post('vaccinate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vacciner des porcs dans une bande' })
  async vaccinateBatch(
    @Body() dto: VaccinateBatchDto,
    @CurrentUser() user: any,
  ) {
    return await this.vaccinationService.vaccinateBatch(dto, user.id);
  }

  @Get('batch/:batchId/status')
  @ApiOperation({ summary: 'Récupérer le statut des vaccinations pour une bande' })
  async getVaccinationStatus(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.vaccinationService.getVaccinationStatus(batchId, user.id);
  }

  @Get('batch/:batchId/history')
  @ApiOperation({ summary: 'Récupérer l\'historique des vaccinations pour une bande' })
  async getVaccinationHistory(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.vaccinationService.getVaccinationHistory(batchId, user.id);
  }
}


