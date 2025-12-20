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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public() // Permettre la création d'utilisateur sans auth (via register)
  @Post()
  create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Public() // Permettre la vérification d'email sans auth (pour onboarding)
  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    // Retourner un objet vide au lieu de null pour éviter les erreurs de parsing JSON
    return user || null;
  }

  @Public() // Permettre la vérification de téléphone sans auth (pour onboarding)
  @Get('telephone/:telephone')
  async findByTelephone(@Param('telephone') telephone: string) {
    const user = await this.usersService.findByTelephone(telephone);
    // Retourner un objet vide au lieu de null pour éviter les erreurs de parsing JSON
    return user || null;
  }

  @Get('identifier/:identifier')
  findByIdentifier(@Param('identifier') identifier: string) {
    return this.usersService.findByIdentifier(identifier);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    console.log('[UsersController] update: mise à jour utilisateur', id, 'avec', Object.keys(updateUserDto));
    try {
      const result = await this.usersService.update(id, updateUserDto);
      console.log('[UsersController] update: utilisateur mis à jour avec succès', result?.id);
      return result;
    } catch (error: any) {
      console.error('[UsersController] update: erreur', error.message);
      throw error;
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
