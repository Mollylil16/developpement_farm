import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async check() {
    const dbHealthy = await this.databaseService.healthCheck();
    
    return {
      status: dbHealthy ? 'ok' : 'error',
      database: dbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}

