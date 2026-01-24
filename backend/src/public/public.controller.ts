import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Public } from '../auth/decorators/public.decorator'
import { PublicService } from './public.service'

@ApiTags('public')
@Controller('api/public')
@Public() // Toutes les routes de ce contrôleur sont publiques
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obtenir les statistiques publiques' })
  async getStats() {
    return this.publicService.getStats()
  }

  @Get('producers/top')
  @ApiOperation({ summary: 'Obtenir les meilleurs producteurs' })
  async getTopProducers(@Query('limit') limit?: string) {
    return this.publicService.getTopProducers(parseInt(limit || '6'))
  }

  @Get('testimonials')
  @ApiOperation({ summary: 'Obtenir les témoignages' })
  async getTestimonials() {
    return this.publicService.getTestimonials()
  }
}
