import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private db: DatabaseService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Vérification de l'état du serveur" })
  async check() {
    const dbHealthy = await this.db.healthCheck();
    return {
      status: dbHealthy ? 'ok' : 'error',
      database: dbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
