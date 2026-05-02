import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CreateRationDto } from './dto/create-ration.dto';
import { CreateStockAlimentDto } from './dto/create-stock-aliment.dto';
import { UpdateStockAlimentDto } from './dto/update-stock-aliment.dto';
import { CreateStockMouvementDto } from './dto/create-stock-mouvement.dto';
import { CreateRationBudgetDto } from './dto/create-ration-budget.dto';
import { UpdateRationBudgetDto } from './dto/update-ration-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('nutrition')
@Controller('nutrition')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  // ==================== INGREDIENTS ====================

  @Post('ingredients')
  @ApiOperation({ summary: 'Créer un nouvel ingrédient' })
  createIngredient(@Body() createIngredientDto: CreateIngredientDto) {
    return this.nutritionService.createIngredient(createIngredientDto);
  }

  @Get('ingredients')
  @ApiOperation({ summary: 'Récupérer tous les ingrédients' })
  findAllIngredients() {
    return this.nutritionService.findAllIngredients();
  }

  @Get('ingredients/:id')
  @ApiOperation({ summary: 'Récupérer un ingrédient par ID' })
  findOneIngredient(@Param('id') id: string) {
    return this.nutritionService.findOneIngredient(id);
  }

  @Patch('ingredients/:id')
  @ApiOperation({ summary: 'Modifier un ingrédient' })
  updateIngredient(@Param('id') id: string, @Body() updateIngredientDto: UpdateIngredientDto) {
    return this.nutritionService.updateIngredient(id, updateIngredientDto);
  }

  @Delete('ingredients/:id')
  @ApiOperation({ summary: 'Supprimer un ingrédient' })
  deleteIngredient(@Param('id') id: string) {
    return this.nutritionService.deleteIngredient(id);
  }

  // ==================== RATIONS ====================

  @Post('rations')
  @ApiOperation({ summary: 'Créer une nouvelle ration' })
  createRation(@Body() createRationDto: CreateRationDto, @CurrentUser() user: any) {
    return this.nutritionService.createRation(createRationDto, user.id);
  }

  @Get('rations')
  @ApiOperation({ summary: "Récupérer toutes les rations d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  findAllRations(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.nutritionService.findAllRations(projetId, user.id);
  }

  @Get('rations/:id')
  @ApiOperation({ summary: 'Récupérer une ration par ID' })
  findOneRation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.nutritionService.findOneRation(id, user.id);
  }

  @Delete('rations/:id')
  @ApiOperation({ summary: 'Supprimer une ration' })
  deleteRation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.nutritionService.deleteRation(id, user.id);
  }

  // ==================== STOCKS ALIMENTS ====================

  @Post('stocks-aliments')
  @ApiOperation({ summary: "Créer un nouveau stock d'aliment" })
  createStockAliment(
    @Body() createStockAlimentDto: CreateStockAlimentDto,
    @CurrentUser() user: any
  ) {
    return this.nutritionService.createStockAliment(createStockAlimentDto, user.id);
  }

  @Get('stocks-aliments')
  @ApiOperation({ summary: "Récupérer tous les stocks d'aliments d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  findAllStocksAliments(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.nutritionService.findAllStocksAliments(projetId, user.id);
  }

  @Get('stocks-aliments/:id')
  @ApiOperation({ summary: "Récupérer un stock d'aliment par ID" })
  findOneStockAliment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.nutritionService.findOneStockAliment(id, user.id);
  }

  @Patch('stocks-aliments/:id')
  @ApiOperation({ summary: "Modifier un stock d'aliment" })
  updateStockAliment(
    @Param('id') id: string,
    @Body() updateStockAlimentDto: UpdateStockAlimentDto,
    @CurrentUser() user: any
  ) {
    return this.nutritionService.updateStockAliment(id, updateStockAlimentDto, user.id);
  }

  @Delete('stocks-aliments/:id')
  @ApiOperation({ summary: "Supprimer un stock d'aliment" })
  deleteStockAliment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.nutritionService.deleteStockAliment(id, user.id);
  }

  // ==================== STOCKS MOUVEMENTS ====================

  @Post('stocks-mouvements')
  @ApiOperation({ summary: 'Créer un nouveau mouvement de stock' })
  createStockMouvement(
    @Body() createStockMouvementDto: CreateStockMouvementDto,
    @CurrentUser() user: any
  ) {
    return this.nutritionService.createStockMouvement(createStockMouvementDto, user.id);
  }

  @Get('stocks-mouvements')
  @ApiOperation({ summary: "Récupérer les mouvements d'un aliment" })
  @ApiQuery({ name: 'aliment_id', required: true, description: "ID de l'aliment" })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limite de résultats' })
  findMouvementsByAliment(
    @Query('aliment_id') alimentId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any
  ) {
    return this.nutritionService.findMouvementsByAliment(
      alimentId,
      user.id,
      limit ? parseInt(limit) : undefined
    );
  }

  // ==================== RATIONS BUDGET ====================

  @Post('rations-budget')
  @ApiOperation({ summary: 'Créer un nouveau budget de ration' })
  createRationBudget(
    @Body() createRationBudgetDto: CreateRationBudgetDto,
    @CurrentUser() user: any
  ) {
    return this.nutritionService.createRationBudget(createRationBudgetDto, user.id);
  }

  @Get('rations-budget')
  @ApiOperation({ summary: "Récupérer tous les budgets de rations d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  findAllRationsBudget(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.nutritionService.findAllRationsBudget(projetId, user.id);
  }

  @Get('rations-budget/:id')
  @ApiOperation({ summary: 'Récupérer un budget de ration par ID' })
  findOneRationBudget(@Param('id') id: string, @CurrentUser() user: any) {
    return this.nutritionService.findOneRationBudget(id, user.id);
  }

  @Patch('rations-budget/:id')
  @ApiOperation({ summary: 'Modifier un budget de ration' })
  updateRationBudget(
    @Param('id') id: string,
    @Body() updateRationBudgetDto: UpdateRationBudgetDto,
    @CurrentUser() user: any
  ) {
    return this.nutritionService.updateRationBudget(id, updateRationBudgetDto, user.id);
  }

  @Delete('rations-budget/:id')
  @ApiOperation({ summary: 'Supprimer un budget de ration' })
  deleteRationBudget(@Param('id') id: string, @CurrentUser() user: any) {
    return this.nutritionService.deleteRationBudget(id, user.id);
  }

  // ==================== STATISTIQUES STOCKS ====================

  @Get('stocks-aliments/stats/:projet_id')
  @ApiOperation({ summary: "Récupérer les statistiques des stocks d'un projet" })
  getStockStats(@Param('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.nutritionService.getStockStats(projetId, user.id);
  }

  @Get('stocks-aliments/valeur-totale/:projet_id')
  @ApiOperation({ summary: "Récupérer la valeur totale des stocks d'un projet" })
  getValeurTotaleStock(@Param('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.nutritionService.getValeurTotaleStock(projetId, user.id);
  }
}
