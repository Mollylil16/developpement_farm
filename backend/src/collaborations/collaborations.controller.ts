import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CollaborationsService, CreateCollaborationDto } from './collaborations.service';

@Controller('collaborations')
export class CollaborationsController {
  constructor(private readonly service: CollaborationsService) {}

  @Post()
  create(@Body() dto: CreateCollaborationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('projet_id') projetId?: string,
    @Query('statut') statut?: string,
    @Query('role') role?: string,
    @Query('user_id') userId?: string,
  ) {
    if (userId) {
      return this.service.findByUserId(userId);
    }
    if (projetId && role) {
      return this.service.findByRole(projetId, role);
    }
    if (projetId && statut) {
      return this.service.findByStatut(projetId, statut);
    }
    if (projetId) {
      return this.service.findByProjet(projetId);
    }
    return [];
  }

  @Get('invitations-en-attente/:userId')
  findInvitationsEnAttente(@Param('userId') userId: string) {
    return this.service.findInvitationsEnAttente(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updates: Partial<CreateCollaborationDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

