import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer les notifications de l'utilisateur" })
  @ApiQuery({ name: 'unread_only', required: false, type: Boolean, description: 'Récupérer uniquement les non lues' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre maximum de notifications (défaut: 50)' })
  @ApiResponse({ status: 200, description: 'Liste des notifications.' })
  async getUserNotifications(
    @CurrentUser('id') userId: string,
    @Query('unread_only') unreadOnly?: string,
    @Query('limit') limit?: string
  ) {
    const unreadOnlyBool = unreadOnly === 'true' || unreadOnly === '1';
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.notificationsService.getUserNotifications(userId, unreadOnlyBool, limitNum);
  }

  @Get('unread-count')
  @ApiOperation({ summary: "Récupérer le nombre de notifications non lues" })
  @ApiResponse({ status: 200, description: 'Nombre de notifications non lues.' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiResponse({ status: 204, description: 'Notification marquée comme lue.' })
  @ApiResponse({ status: 404, description: 'Notification introuvable.' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    await this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  @ApiResponse({ status: 200, description: 'Nombre de notifications marquées comme lues.' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.markAllAsRead(userId);
    return { count, message: `${count} notification(s) marquée(s) comme lue(s)` };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une notification' })
  @ApiResponse({ status: 204, description: 'Notification supprimée.' })
  @ApiResponse({ status: 404, description: 'Notification introuvable.' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    await this.notificationsService.deleteNotification(id, userId);
  }
}
