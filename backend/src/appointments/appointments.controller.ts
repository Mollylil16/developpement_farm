import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { AppointmentRemindersService } from './appointment-reminders.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  private readonly logger = new Logger(AppointmentsController.name);

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly remindersService: AppointmentRemindersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Créer une demande de rendez-vous' })
  @ApiResponse({ status: 201, description: 'Rendez-vous créé avec succès', type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Vétérinaire introuvable' })
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser('id') producerId: string,
  ): Promise<AppointmentResponseDto> {
    this.logger.log(`[Appointments] Création d'un rendez-vous par producteur ${producerId}`);
    return this.appointmentsService.createAppointment(createAppointmentDto, producerId);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les rendez-vous de l\'utilisateur' })
  @ApiQuery({ name: 'role', enum: ['producer', 'veterinarian'], required: true, description: 'Rôle de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste des rendez-vous', type: [AppointmentResponseDto] })
  async findAll(
    @Query('role') role: 'producer' | 'veterinarian',
    @CurrentUser('id') userId: string,
  ): Promise<AppointmentResponseDto[]> {
    this.logger.log(`[Appointments] Récupération des rendez-vous pour ${role} ${userId}`);
    return this.appointmentsService.findAll(userId, role);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Récupérer les rendez-vous à venir' })
  @ApiQuery({ name: 'role', enum: ['producer', 'veterinarian'], required: true, description: 'Rôle de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste des rendez-vous à venir', type: [AppointmentResponseDto] })
  async findUpcoming(
    @Query('role') role: 'producer' | 'veterinarian',
    @CurrentUser('id') userId: string,
  ): Promise<AppointmentResponseDto[]> {
    this.logger.log(`[Appointments] Récupération des rendez-vous à venir pour ${role} ${userId}`);
    return this.appointmentsService.findUpcoming(userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un rendez-vous par ID' })
  @ApiResponse({ status: 200, description: 'Détails du rendez-vous', type: AppointmentResponseDto })
  @ApiResponse({ status: 404, description: 'Rendez-vous introuvable' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un rendez-vous (réponse du vétérinaire)' })
  @ApiResponse({ status: 200, description: 'Rendez-vous mis à jour', type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Rendez-vous introuvable' })
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUser('id') userId: string,
  ): Promise<AppointmentResponseDto> {
    this.logger.log(`[Appointments] Mise à jour du rendez-vous ${id} par ${userId}`);
    return this.appointmentsService.update(id, updateAppointmentDto, userId);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Annuler un rendez-vous' })
  @ApiResponse({ status: 200, description: 'Rendez-vous annulé', type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Impossible d\'annuler ce rendez-vous' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Rendez-vous introuvable' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<AppointmentResponseDto> {
    this.logger.log(`[Appointments] Annulation du rendez-vous ${id} par ${userId}`);
    return this.appointmentsService.cancel(id, userId);
  }

  @Post('reminders/send')
  @ApiOperation({ summary: 'Envoyer les rappels quotidiens (cron job)' })
  @ApiResponse({ status: 200, description: 'Rappels envoyés', schema: { properties: { sent: { type: 'number' }, errors: { type: 'number' } } } })
  async sendReminders(): Promise<{ sent: number; errors: number }> {
    this.logger.log('[Appointments] Envoi manuel des rappels quotidiens');
    return this.remindersService.sendDailyReminders();
  }
}
