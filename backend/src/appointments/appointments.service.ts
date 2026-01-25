import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto, AppointmentStatus } from './dto/update-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { NotificationsService } from '../marketplace/notifications.service';
import { NotificationType } from '../marketplace/dto/notification.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Générer un ID unique pour un rendez-vous
   */
  private generateId(): string {
    return `appointment_${Date.now()}_${uuidv4().substr(0, 9)}`;
  }

  /**
   * Créer une demande de rendez-vous
   */
  async createAppointment(
    createAppointmentDto: CreateAppointmentDto,
    producerId: string,
  ): Promise<AppointmentResponseDto> {
    try {
      this.logger.debug(
        `[Appointments] Création d'un rendez-vous par producteur ${producerId} pour vétérinaire ${createAppointmentDto.vetId}`,
      );

      // Vérifier que le vétérinaire existe et est validé
      this.logger.debug(
        `[Appointments] Vérification vétérinaire avec ID: ${createAppointmentDto.vetId}`,
      );

      const vetCheck = await this.databaseService.query(
        `SELECT id, nom, prenom, active_role, veterinarian_validation_status 
         FROM users 
         WHERE id = $1 AND active_role = 'veterinarian' 
         AND veterinarian_validation_status = 'approved'`,
        [createAppointmentDto.vetId],
      );

      if (vetCheck.rows.length === 0) {
        this.logger.error(
          `[Appointments] Vétérinaire introuvable ou non validé: ${createAppointmentDto.vetId}`,
        );
        throw new NotFoundException('Vétérinaire introuvable ou non validé');
      }

      const vet = vetCheck.rows[0];
      this.logger.log(
        `[Appointments] Vétérinaire trouvé: ${vet.id} (${vet.prenom} ${vet.nom})`,
      );

      // Vérifier que la date est dans le futur
      const appointmentDate = new Date(createAppointmentDto.appointmentDate);
      const now = new Date();
      if (appointmentDate <= now) {
        throw new BadRequestException('La date du rendez-vous doit être dans le futur');
      }

      // Récupérer les informations du producteur
      const producerCheck = await this.databaseService.query(
        `SELECT id, nom, prenom FROM users WHERE id = $1`,
        [producerId],
      );

      if (producerCheck.rows.length === 0) {
        throw new NotFoundException('Producteur introuvable');
      }

      const producer = producerCheck.rows[0];

      // Créer le rendez-vous
      const appointmentId = this.generateId();
      const nowISO = new Date().toISOString();

      await this.databaseService.query(
        `INSERT INTO vet_appointments (
          id, producer_id, vet_id, appointment_date, reason, location,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          appointmentId,
          producerId,
          createAppointmentDto.vetId,
          appointmentDate.toISOString(),
          createAppointmentDto.reason,
          createAppointmentDto.location || null,
          'pending',
          nowISO,
          nowISO,
        ],
      );

      this.logger.log(
        `[Appointments] Rendez-vous créé: ${appointmentId} par producteur ${producerId} pour vétérinaire ${createAppointmentDto.vetId}`,
      );

      // Envoyer une notification au vétérinaire (non-bloquant)
      try {
        const producerName = `${producer.prenom || ''} ${producer.nom || ''}`.trim() || 'Un producteur';
        const vetName = `${vet.prenom || ''} ${vet.nom || ''}`.trim() || 'Vétérinaire';

        this.logger.log(
          `[Appointments] Envoi notification au vétérinaire ${createAppointmentDto.vetId} (vet.id=${vet.id}) pour RDV ${appointmentId}`,
        );

        // ✅ Vérification approfondie : vérifier que l'ID du vétérinaire correspond
        if (createAppointmentDto.vetId !== vet.id) {
          this.logger.error(
            `[Appointments] ❌ ERREUR CRITIQUE: Incohérence d'ID détectée! createAppointmentDto.vetId=${createAppointmentDto.vetId} !== vet.id=${vet.id}`,
          );
          this.logger.error(
            `[Appointments] La notification sera créée avec userId=${createAppointmentDto.vetId}, mais le vétérinaire a l'ID ${vet.id}. La notification ne sera probablement pas visible!`,
          );
        }

        // ✅ Vérification supplémentaire : vérifier que le vétérinaire existe bien avec cet ID
        const vetVerification = await this.databaseService.query(
          `SELECT id, email, telephone, active_role FROM users WHERE id = $1`,
          [createAppointmentDto.vetId],
        );

        if (vetVerification.rows.length === 0) {
          this.logger.error(
            `[Appointments] ❌ ERREUR CRITIQUE: L'ID vétérinaire ${createAppointmentDto.vetId} n'existe pas dans la table users!`,
          );
        } else {
          const verifiedVet = vetVerification.rows[0];
          this.logger.log(
            `[Appointments] ✅ Vérification: L'ID ${createAppointmentDto.vetId} correspond à l'utilisateur ${verifiedVet.email || verifiedVet.telephone} avec active_role=${verifiedVet.active_role}`,
          );

          // Vérifier que c'est bien un vétérinaire
          if (verifiedVet.active_role !== 'veterinarian') {
            this.logger.warn(
              `[Appointments] ⚠️ ATTENTION: L'utilisateur ${createAppointmentDto.vetId} n'a pas active_role='veterinarian' (actuel: ${verifiedVet.active_role})`,
            );
          }
        }

        const notificationData = {
          userId: createAppointmentDto.vetId,
          type: NotificationType.APPOINTMENT_REQUESTED,
          title: 'Nouvelle demande de rendez-vous',
          message: `${producerName} vous a demandé un rendez-vous pour le ${this.formatDate(appointmentDate)}`,
          relatedType: 'appointment',
          relatedId: appointmentId,
          actionUrl: `/appointments/${appointmentId}`,
          data: {
            appointmentId,
            producerId,
            producerName,
            appointmentDate: appointmentDate.toISOString(),
            reason: createAppointmentDto.reason,
            location: createAppointmentDto.location,
          },
        };

        this.logger.debug(
          `[Appointments] Données de notification: ${JSON.stringify(notificationData, null, 2)}`,
        );

        const notificationResult = await this.notificationsService.createNotification(notificationData);

        this.logger.log(
          `[Appointments] ✅ Notification créée avec succès: ${notificationResult.notificationId} pour vétérinaire userId=${createAppointmentDto.vetId}`,
        );
      } catch (notificationError) {
        // Log l'erreur mais ne bloque pas la création du rendez-vous
        this.logger.error(
          `[Appointments] Erreur lors de l'envoi de la notification pour le rendez-vous ${appointmentId}:`,
          notificationError,
        );
        // Log plus de détails pour le débogage
        if (notificationError instanceof Error) {
          this.logger.error(`[Appointments] Message d'erreur: ${notificationError.message}`);
          this.logger.error(`[Appointments] Stack trace: ${notificationError.stack}`);
        }
      }

      // Retourner le rendez-vous créé
      return this.findOne(appointmentId, producerId);
    } catch (error) {
      this.logger.error(
        `[Appointments] Erreur lors de la création du rendez-vous par producteur ${producerId}:`,
        error,
      );
      // Re-lancer l'erreur si c'est déjà une exception HTTP
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      // Sinon, lancer une erreur générique
      throw new BadRequestException(
        `Erreur lors de la création du rendez-vous: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
    }
  }

  /**
   * Récupérer tous les rendez-vous d'un utilisateur (producteur ou vétérinaire)
   */
  async findAll(userId: string, role: 'producer' | 'veterinarian'): Promise<AppointmentResponseDto[]> {
    const column = role === 'producer' ? 'producer_id' : 'vet_id';
    const result = await this.databaseService.query(
      `SELECT 
        a.*,
        p.nom as producer_nom, p.prenom as producer_prenom,
        v.nom as vet_nom, v.prenom as vet_prenom
       FROM vet_appointments a
       LEFT JOIN users p ON a.producer_id = p.id
       LEFT JOIN users v ON a.vet_id = v.id
       WHERE a.${column} = $1
       ORDER BY a.appointment_date DESC`,
      [userId],
    );

    return result.rows.map((row) => this.mapRowToAppointment(row));
  }

  /**
   * Récupérer un rendez-vous par ID
   */
  async findOne(appointmentId: string, userId: string): Promise<AppointmentResponseDto> {
    const result = await this.databaseService.query(
      `SELECT 
        a.*,
        p.nom as producer_nom, p.prenom as producer_prenom,
        v.nom as vet_nom, v.prenom as vet_prenom
       FROM vet_appointments a
       LEFT JOIN users p ON a.producer_id = p.id
       LEFT JOIN users v ON a.vet_id = v.id
       WHERE a.id = $1`,
      [appointmentId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Rendez-vous introuvable');
    }

    const appointment = this.mapRowToAppointment(result.rows[0]);

    // Vérifier que l'utilisateur a le droit d'accéder à ce rendez-vous
    if (appointment.producerId !== userId && appointment.vetId !== userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce rendez-vous');
    }

    return appointment;
  }

  /**
   * Mettre à jour un rendez-vous (réponse du vétérinaire)
   */
  async update(
    appointmentId: string,
    updateAppointmentDto: UpdateAppointmentDto,
    userId: string,
  ): Promise<AppointmentResponseDto> {
    // Récupérer le rendez-vous
    const appointment = await this.findOne(appointmentId, userId);

    // Vérifier que seul le vétérinaire peut mettre à jour
    if (appointment.vetId !== userId) {
      throw new ForbiddenException('Seul le vétérinaire peut répondre à cette demande');
    }

    // Vérifier que le rendez-vous est en attente
    if (appointment.status !== 'pending') {
      throw new BadRequestException('Ce rendez-vous a déjà été traité');
    }

    // Mettre à jour le rendez-vous
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateAppointmentDto.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(updateAppointmentDto.status);
      paramIndex++;
    }

    if (updateAppointmentDto.vetResponse !== undefined) {
      updates.push(`vet_response = $${paramIndex}`);
      values.push(updateAppointmentDto.vetResponse || null);
      paramIndex++;
    }

    if (updateAppointmentDto.status && updateAppointmentDto.status !== 'pending') {
      updates.push(`vet_response_at = NOW()`);
    }

    updates.push(`updated_at = NOW()`);
    values.push(appointmentId);

    await this.databaseService.query(
      `UPDATE vet_appointments 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values,
    );

    this.logger.log(
      `[Appointments] Rendez-vous ${appointmentId} mis à jour: status=${updateAppointmentDto.status}`,
    );

    // Envoyer une notification au producteur
    const updatedAppointment = await this.findOne(appointmentId, appointment.producerId);
    const producerName = updatedAppointment.producerName || 'Producteur';
    const vetName = updatedAppointment.vetName || 'Vétérinaire';

    if (updateAppointmentDto.status === 'accepted') {
      await this.notificationsService.createNotification({
        userId: appointment.producerId,
        type: 'appointment_accepted' as NotificationType,
        title: 'Rendez-vous accepté',
        message: `${vetName} a accepté votre demande de rendez-vous pour le ${this.formatDate(new Date(updatedAppointment.appointmentDate))}`,
        relatedType: 'appointment',
        relatedId: appointmentId,
        actionUrl: `/appointments/${appointmentId}`,
        data: {
          appointmentId,
          vetId: appointment.vetId,
          vetName,
          appointmentDate: updatedAppointment.appointmentDate,
          vetResponse: updateAppointmentDto.vetResponse,
        },
      });
    } else if (updateAppointmentDto.status === 'rejected') {
      await this.notificationsService.createNotification({
        userId: appointment.producerId,
        type: 'appointment_rejected' as NotificationType,
        title: 'Rendez-vous refusé',
        message: `${vetName} a refusé votre demande de rendez-vous`,
        relatedType: 'appointment',
        relatedId: appointmentId,
        actionUrl: `/appointments/${appointmentId}`,
        data: {
          appointmentId,
          vetId: appointment.vetId,
          vetName,
          vetResponse: updateAppointmentDto.vetResponse,
        },
      });
    }

    return updatedAppointment;
  }

  /**
   * Annuler un rendez-vous
   */
  async cancel(appointmentId: string, userId: string): Promise<AppointmentResponseDto> {
    const appointment = await this.findOne(appointmentId, userId);

    // Vérifier que seul le producteur ou le vétérinaire peut annuler
    if (appointment.producerId !== userId && appointment.vetId !== userId) {
      throw new ForbiddenException('Vous n\'avez pas le droit d\'annuler ce rendez-vous');
    }

    // Vérifier que le rendez-vous peut être annulé
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      throw new BadRequestException('Ce rendez-vous ne peut pas être annulé');
    }

    // Mettre à jour le statut
    await this.databaseService.query(
      `UPDATE vet_appointments 
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [appointmentId],
    );

    this.logger.log(`[Appointments] Rendez-vous ${appointmentId} annulé par ${userId}`);

    // Envoyer une notification à l'autre partie
    const otherUserId = appointment.producerId === userId ? appointment.vetId : appointment.producerId;
    const userName = appointment.producerId === userId 
      ? (appointment.producerName || 'Le producteur')
      : (appointment.vetName || 'Le vétérinaire');

    await this.notificationsService.createNotification({
      userId: otherUserId,
      type: 'appointment_cancelled' as NotificationType,
      title: 'Rendez-vous annulé',
      message: `${userName} a annulé le rendez-vous prévu pour le ${this.formatDate(new Date(appointment.appointmentDate))}`,
      relatedType: 'appointment',
      relatedId: appointmentId,
      actionUrl: `/appointments/${appointmentId}`,
      data: {
        appointmentId,
        cancelledBy: userId,
      },
    });

    return this.findOne(appointmentId, userId);
  }

  /**
   * Récupérer les rendez-vous à venir pour un utilisateur
   */
  async findUpcoming(userId: string, role: 'producer' | 'veterinarian'): Promise<AppointmentResponseDto[]> {
    const column = role === 'producer' ? 'producer_id' : 'vet_id';
    const result = await this.databaseService.query(
      `SELECT 
        a.*,
        p.nom as producer_nom, p.prenom as producer_prenom,
        v.nom as vet_nom, v.prenom as vet_prenom
       FROM vet_appointments a
       LEFT JOIN users p ON a.producer_id = p.id
       LEFT JOIN users v ON a.vet_id = v.id
       WHERE a.${column} = $1 
       AND a.status = 'accepted'
       AND a.appointment_date >= NOW()
       ORDER BY a.appointment_date ASC
       LIMIT 10`,
      [userId],
    );

    return result.rows.map((row) => this.mapRowToAppointment(row));
  }

  /**
   * Mapper une ligne de la base de données vers un AppointmentResponseDto
   */
  private mapRowToAppointment(row: any): AppointmentResponseDto {
    return {
      id: row.id,
      producerId: row.producer_id,
      vetId: row.vet_id,
      appointmentDate: row.appointment_date,
      reason: row.reason,
      location: row.location,
      status: row.status,
      vetResponse: row.vet_response,
      vetResponseAt: row.vet_response_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      producerName: row.producer_prenom && row.producer_nom
        ? `${row.producer_prenom} ${row.producer_nom}`
        : undefined,
      vetName: row.vet_prenom && row.vet_nom
        ? `${row.vet_prenom} ${row.vet_nom}`
        : undefined,
    };
  }

  /**
   * Formater une date pour l'affichage
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
