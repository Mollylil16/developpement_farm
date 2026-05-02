import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: "Informations sur l'API" })
  getRoot() {
    return {
      message: 'FarmTrack Pro API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        auth: '/auth',
        users: '/users',
        projets: '/projets',
        production: '/animaux, /pesees',
        finance: '/charges-fixes, /depenses, /revenus',
        sante: '/vaccinations, /maladies, /traitements',
        nutrition: '/ingredients, /rations, /stocks',
        collaborations: '/collaborations',
        planifications: '/planifications',
        mortalites: '/mortalites',
      },
      documentation: '/api/docs',
    };
  }
}
