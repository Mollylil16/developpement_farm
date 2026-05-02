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
import { BatchSaleService } from './batch-sale.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@ApiTags('batch-sales')
@Controller('batch-sales')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchSaleController {
  constructor(private readonly saleService: BatchSaleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une vente pour une bande' })
  async createSale(
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: any,
  ) {
    return await this.saleService.createSale(dto, user.id);
  }

  @Get('batch/:batchId/history')
  @ApiOperation({ summary: 'Récupérer l\'historique des ventes pour une bande' })
  async getSaleHistory(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.saleService.getSaleHistory(batchId, user.id);
  }
}

