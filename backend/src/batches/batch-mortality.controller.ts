import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchMortalityService } from './batch-mortality.service';
import { CreateMortalityDto } from './dto/create-mortality.dto';

@ApiTags('batch-mortalities')
@Controller('batch-mortalities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchMortalityController {
  constructor(private readonly mortalityService: BatchMortalityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enregistrer une mortalité dans une bande' })
  async createMortality(
    @Body() dto: CreateMortalityDto,
    @CurrentUser() user: any,
  ) {
    return await this.mortalityService.createMortality(dto, user.id);
  }
}

