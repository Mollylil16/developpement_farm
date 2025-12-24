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
  Logger,
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

  @Public() // Permettre la vérification d'existence sans auth
  @Get('check/phone/:phone')
  async checkPhoneExists(@Param('phone') phone: string) {
    const user = await this.usersService.findByTelephone(phone);
    if (user) {
      return { exists: true };
    }
    // Retourner 404 si n'existe pas
    const { NotFoundException } = require('@nestjs/common');
    throw new NotFoundException('Téléphone non trouvé');
  }

  @Public() // Permettre la vérification d'existence sans auth
  @Get('check/email/:email')
  async checkEmailExists(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      return { exists: true };
    }
    // Retourner 404 si n'existe pas
    const { NotFoundException } = require('@nestjs/common');
    throw new NotFoundException('Email non trouvé');
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
    this.logger.debug(`update: mise à jour utilisateur ${id} avec ${Object.keys(updateUserDto).join(', ')}`);
    try {
      const result = await this.usersService.update(id, updateUserDto);
      this.logger.log(`update: utilisateur mis à jour avec succès, userId=${result?.id}`);
      return result;
    } catch (error: any) {
      this.logger.error(`update: erreur pour userId=${id}`, error);
      throw error;
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
