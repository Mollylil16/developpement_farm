import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { IngredientsService, CreateIngredientDto } from './ingredients.service';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly service: IngredientsService) {}

  @Post()
  create(@Body() dto: CreateIngredientDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updates: Partial<CreateIngredientDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

