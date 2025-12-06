import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RationsService, CreateRationDto, CreateRationBudgetDto } from './rations.service';

@Controller('rations')
export class RationsController {
  constructor(private readonly service: RationsService) {}

  // ========== RATIONS ==========

  @Post()
  createRation(@Body() dto: CreateRationDto) {
    return this.service.createRation(dto);
  }

  @Get()
  findRations(@Query('projet_id') projetId?: string) {
    if (projetId) {
      return this.service.findRationsByProjet(projetId);
    }
    return [];
  }

  @Get(':id')
  findRationById(@Param('id') id: string) {
    return this.service.findRationById(id);
  }

  @Delete(':id')
  removeRation(@Param('id') id: string) {
    return this.service.removeRation(id);
  }

  // ========== RATIONS BUDGET ==========

  @Post('budget')
  createRationBudget(@Body() dto: CreateRationBudgetDto) {
    return this.service.createRationBudget(dto);
  }

  @Get('budget')
  findRationsBudget(@Query('projet_id') projetId?: string) {
    if (projetId) {
      return this.service.findRationsBudgetByProjet(projetId);
    }
    return [];
  }

  @Get('budget/:id')
  findRationBudgetById(@Param('id') id: string) {
    return this.service.findRationBudgetById(id);
  }

  @Patch('budget/:id')
  updateRationBudget(@Param('id') id: string, @Body() updates: Partial<CreateRationBudgetDto>) {
    return this.service.updateRationBudget(id, updates);
  }

  @Delete('budget/:id')
  removeRationBudget(@Param('id') id: string) {
    return this.service.removeRationBudget(id);
  }
}

