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
import { BatchDiseaseService } from './batch-disease.service';
import { CreateDiseaseDto, UpdateDiseaseDto } from './dto/create-disease.dto';

@ApiTags('batch-diseases')
@Controller('batch-diseases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchDiseaseController {
  constructor(private readonly diseaseService: BatchDiseaseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un enregistrement de maladie pour un porc dans une bande' })
  async createDisease(
    @Body() dto: CreateDiseaseDto,
    @CurrentUser() user: any,
  ) {
    return await this.diseaseService.createDisease(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une maladie' })
  async updateDisease(
    @Param('id') id: string,
    @Body() dto: UpdateDiseaseDto,
    @CurrentUser() user: any,
  ) {
    return await this.diseaseService.updateDisease(id, dto, user.id);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Récupérer les maladies d\'une bande' })
  async getDiseasesByBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.diseaseService.getDiseasesByBatch(batchId, user.id);
  }
}

