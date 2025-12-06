import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'FarmTrack Pro API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        users: '/users',
        projets: '/projets',
        // ... autres endpoints
      },
    };
  }
}


