import { Module } from '@nestjs/common'
import { PublicController } from './public.controller'
import { PublicService } from './public.service'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
