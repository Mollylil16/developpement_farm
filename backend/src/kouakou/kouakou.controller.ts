import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { KouakouService } from './kouakou.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('api/kouakou')
export class KouakouController {
  private readonly logger = new Logger(KouakouController.name);

  constructor(private readonly kouakouService: KouakouService) {}

  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto) {
    try {
      this.logger.log(`[chat] Requête reçue de ${chatRequest.userId}`);

      const response = await this.kouakouService.processMessage(
        chatRequest.message,
        chatRequest.userId,
        chatRequest.context,
      );

      return {
        success: true,
        data: response,
      };
      
    } catch (error) {
      this.logger.error(`[chat] Erreur:`, error);
      return {
        success: false,
        error: error.message || 'Erreur interne du serveur',
      };
    }
  }
}

