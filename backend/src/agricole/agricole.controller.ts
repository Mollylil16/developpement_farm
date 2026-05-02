import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgricoleService } from './agricole.service';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';

@ApiTags('admin-agricole')
@Controller('admin/agricole')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AgricoleController {
  constructor(private readonly agricoleService: AgricoleService) {}

  @Get('performances')
  @ApiOperation({ summary: 'Obtenir les données de performances zootechniques' })
  async getPerformances(
    @CurrentAdmin() admin: any,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.agricoleService.getPerformancesData(period || 'month');
  }

  @Get('sante')
  @ApiOperation({ summary: 'Obtenir les données sanitaires' })
  async getSante(
    @CurrentAdmin() admin: any,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.agricoleService.getSanteData(period || 'month');
  }

  @Get('reproduction')
  @ApiOperation({ summary: 'Obtenir les données de reproduction' })
  async getReproduction(@CurrentAdmin() admin: any) {
    return this.agricoleService.getReproductionData();
  }

  @Get('nutrition')
  @ApiOperation({ summary: 'Obtenir les données de nutrition' })
  async getNutrition(@CurrentAdmin() admin: any) {
    return this.agricoleService.getNutritionData();
  }

  @Get('vaccination')
  @ApiOperation({ summary: 'Obtenir les données de vaccination' })
  async getVaccination(@CurrentAdmin() admin: any) {
    return this.agricoleService.getVaccinationData();
  }

  @Get('tracabilite')
  @ApiOperation({ summary: 'Obtenir les données de traçabilité' })
  async getTracabilite(@CurrentAdmin() admin: any) {
    return this.agricoleService.getTracabiliteData();
  }

  @Get('economie')
  @ApiOperation({ summary: 'Obtenir les données économiques' })
  async getEconomie(@CurrentAdmin() admin: any) {
    return this.agricoleService.getEconomieData();
  }

  @Get('cartographie')
  @ApiOperation({ summary: 'Obtenir les données de cartographie' })
  async getCartographie(@CurrentAdmin() admin: any) {
    return this.agricoleService.getCartographieData();
  }

  @Get('certifications')
  @ApiOperation({ summary: 'Obtenir les données de certifications' })
  async getCertifications(@CurrentAdmin() admin: any) {
    return this.agricoleService.getCertificationsData();
  }
}
