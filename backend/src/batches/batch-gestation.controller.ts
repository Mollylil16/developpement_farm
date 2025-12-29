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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchGestationService } from './batch-gestation.service';
import { CreateBatchGestationDto, UpdateBatchGestationDto } from './dto/create-gestation.dto';

@ApiTags('batch-gestations')
@Controller('batch-gestations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchGestationController {
  constructor(private readonly gestationService: BatchGestationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une gestation pour une truie dans une bande' })
  async createGestation(
    @Body() dto: CreateBatchGestationDto,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.createGestation(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une gestation' })
  async updateGestation(
    @Param('id') id: string,
    @Body() dto: UpdateBatchGestationDto,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.updateGestation(id, dto, user.id);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Récupérer les gestations d\'une bande' })
  async getGestationsByBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.getGestationsByBatch(batchId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une gestation par ID' })
  async getGestationById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.getGestationById(id, user.id);
  }
}

