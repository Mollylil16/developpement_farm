import { Module } from '@nestjs/common';
import { KouakouController } from './kouakou.controller';
import { KouakouService } from './kouakou.service';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [KouakouController],
  providers: [KouakouService],
})
export class KouakouModule {}

