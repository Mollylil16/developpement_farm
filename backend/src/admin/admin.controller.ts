import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Obtenir les statistiques du dashboard' })
  async getDashboardStats(
    @CurrentAdmin() admin: any,
    @Query('period') period?: string,
  ) {
    return this.adminService.getDashboardStats(period);
  }

  @Get('finance/stats')
  @ApiOperation({ summary: 'Obtenir les statistiques financières' })
  async getFinanceStats(
    @CurrentAdmin() admin: any,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    return this.adminService.getFinanceStats(period || 'month');
  }

  @Get('finance/transactions')
  @ApiOperation({ summary: 'Obtenir la liste des transactions' })
  async getTransactions(
    @CurrentAdmin() admin: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('payment_method') paymentMethod?: string,
  ) {
    return this.adminService.getTransactions(
      parseInt(page || '1'),
      parseInt(limit || '50'),
      {
        status,
        payment_method: paymentMethod,
      },
    );
  }

  @Get('users/subscriptions')
  @ApiOperation({ summary: 'Obtenir la liste des utilisateurs avec leurs abonnements' })
  async getUsersWithSubscriptions(
    @CurrentAdmin() admin: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('has_subscription') hasSubscription?: string,
    @Query('subscription_status') subscriptionStatus?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsersWithSubscriptions(
      parseInt(page || '1'),
      parseInt(limit || '50'),
      {
        has_subscription: hasSubscription === 'true' ? true : hasSubscription === 'false' ? false : undefined,
        subscription_status: subscriptionStatus,
        role,
        search,
      },
    );
  }

  @Get('profile')
  @ApiOperation({ summary: 'Obtenir le profil de l\'administrateur connecté' })
  async getProfile(@CurrentAdmin() admin: any) {
    const adminData = await this.adminService.findOne(admin.id);
    // Retourner uniquement les données nécessaires (sans password_hash)
    return {
      id: adminData.id,
      email: adminData.email,
      nom: adminData.nom,
      prenom: adminData.prenom,
    };
  }

  @Get('projects')
  @ApiOperation({ summary: 'Obtenir la liste des projets' })
  async getProjects(
    @CurrentAdmin() admin: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('statut') statut?: string,
    @Query('user_id') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getProjects(
      parseInt(page || '1'),
      parseInt(limit || '50'),
      { statut, user_id: userId, search },
    );
  }

  // ==================== VALIDATION VÉTÉRINAIRES ====================
  // IMPORTANT: Ces routes doivent être déclarées AVANT les routes /users/:userId
  // pour éviter que "veterinarians" soit interprété comme un userId

  @Get('users/veterinarians')
  @ApiOperation({ summary: 'Obtenir la liste des vétérinaires pour validation' })
  async getVeterinariansForValidation(
    @CurrentAdmin() admin: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getVeterinariansForValidation(
      parseInt(page || '1'),
      parseInt(limit || '50'),
      { status, search },
    );
  }

  @Get('users/veterinarians/:userId/documents')
  @ApiOperation({ summary: 'Obtenir les documents d\'un vétérinaire' })
  async getVeterinarianDocuments(
    @CurrentAdmin() admin: any,
    @Param('userId') userId: string,
  ) {
    return this.adminService.getVeterinarianDocuments(userId);
  }

  @Post('users/veterinarians/:userId/approve')
  @ApiOperation({ summary: 'Approuver un vétérinaire' })
  async approveVeterinarian(
    @CurrentAdmin() admin: any,
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.approveVeterinarian(userId, admin.id, reason);
  }

  @Post('users/veterinarians/:userId/reject')
  @ApiOperation({ summary: 'Rejeter un vétérinaire' })
  async rejectVeterinarian(
    @CurrentAdmin() admin: any,
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.rejectVeterinarian(userId, admin.id, reason);
  }

  // ==================== USERS ====================

  @Get('users/:userId')
  @ApiOperation({ summary: 'Obtenir les détails d\'un utilisateur' })
  async getUserDetail(
    @CurrentAdmin() admin: any,
    @Param('userId') userId: string,
  ) {
    return this.adminService.getUserDetail(userId);
  }

  @Put('users/:userId/status')
  @ApiOperation({ summary: 'Modifier le statut d\'un utilisateur' })
  async updateUserStatus(
    @CurrentAdmin() admin: any,
    @Param('userId') userId: string,
    @Body('is_active') isActive: boolean,
  ) {
    return this.adminService.updateUserStatus(userId, isActive);
  }

  @Put('users/:userId/subscription/:subscriptionId')
  @ApiOperation({ summary: 'Modifier l\'abonnement d\'un utilisateur' })
  async updateUserSubscription(
    @CurrentAdmin() admin: any,
    @Param('userId') userId: string,
    @Param('subscriptionId') subscriptionId: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateUserSubscription(userId, subscriptionId, status);
  }

  @Get('revenue/trend')
  @ApiOperation({ summary: 'Obtenir la tendance des revenus' })
  async getRevenueTrend(
    @CurrentAdmin() admin: any,
    @Query('months') months?: string,
  ) {
    return this.adminService.getRevenueTrend(parseInt(months || '6'));
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Obtenir les notifications' })
  async getNotifications(
    @CurrentAdmin() admin: any,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getNotifications(parseInt(limit || '10'));
  }

  @Get('search')
  @ApiOperation({ summary: 'Recherche globale' })
  async globalSearch(
    @CurrentAdmin() admin: any,
    @Query('q') query: string,
  ) {
    return this.adminService.globalSearch(query);
  }

  // ==================== COMMUNICATION ====================

  @Post('messages/send')
  @ApiOperation({ summary: 'Envoyer un message aux utilisateurs' })
  async sendMessage(
    @CurrentAdmin() admin: any,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.adminService.sendMessage(
      admin.id,
      sendMessageDto.subject,
      sendMessageDto.content,
      sendMessageDto.type,
      sendMessageDto.target_audience,
      sendMessageDto.target_user_ids,
      sendMessageDto.target_roles,
    );
  }

  @Get('messages')
  @ApiOperation({ summary: 'Obtenir l\'historique des messages envoyés' })
  async getMessages(
    @CurrentAdmin() admin: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getMessages(
      parseInt(page || '1'),
      parseInt(limit || '50'),
    );
  }

  @Post('users/congratulate')
  @ApiOperation({ summary: 'Féliciter les utilisateurs actifs avec un cadeau' })
  async congratulateActiveUsers(
    @CurrentAdmin() admin: any,
    @Body() body: { message: string; gift_description?: string },
  ) {
    return this.adminService.congratulateActiveUsers(
      admin.id,
      body.message,
      body.gift_description,
    );
  }

  // ==================== PROMOTIONS ====================

  @Post('promotions')
  @ApiOperation({ summary: 'Créer une nouvelle promotion' })
  async createPromotion(
    @CurrentAdmin() admin: any,
    @Body() createPromotionDto: CreatePromotionDto,
  ) {
    return this.adminService.createPromotion(admin.id, createPromotionDto);
  }

  @Get('promotions')
  @ApiOperation({ summary: 'Obtenir la liste des promotions' })
  async getPromotions(
    @CurrentAdmin() admin: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('is_active') isActive?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.getPromotions(
      parseInt(page || '1'),
      parseInt(limit || '50'),
      {
        is_active: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        type,
      },
    );
  }

  @Get('promotions/:id')
  @ApiOperation({ summary: 'Obtenir les détails d\'une promotion' })
  async getPromotion(
    @CurrentAdmin() admin: any,
    @Param('id') id: string,
  ) {
    return this.adminService.getPromotion(id);
  }

  @Put('promotions/:id/status')
  @ApiOperation({ summary: 'Activer/désactiver une promotion' })
  async updatePromotionStatus(
    @CurrentAdmin() admin: any,
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
  ) {
    return this.adminService.updatePromotionStatus(id, isActive);
  }
}

