import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../marketplace/notifications.service';
import { NotificationType } from '../marketplace/dto/notification.dto';

@Injectable()
export class AppointmentRemindersService {
  private readonly logger = new Logger(AppointmentRemindersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Envoyer des rappels pour les rendez-vous du jour
   * À appeler via un cron job ou une tâche planifiée
   */
  async sendDailyReminders(): Promise<{ sent: number; errors: number }> {
    this.logger.log('[AppointmentReminders] Démarrage de l\'envoi des rappels quotidiens');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Récupérer tous les rendez-vous acceptés du jour qui n'ont pas encore reçu de rappel
    const result = await this.databaseService.query(
      `SELECT 
        a.*,
        p.nom as producer_nom, p.prenom as producer_prenom,
        v.nom as vet_nom, v.prenom as vet_prenom
       FROM vet_appointments a
       LEFT JOIN users p ON a.producer_id = p.id
       LEFT JOIN users v ON a.vet_id = v.id
       WHERE a.status = 'accepted'
       AND a.appointment_date >= $1
       AND a.appointment_date < $2
       AND (a.reminder_sent = FALSE OR a.reminder_sent IS NULL)`,
      [today.toISOString(), tomorrow.toISOString()],
    );

    const appointments = result.rows;
    let sent = 0;
    let errors = 0;

    this.logger.log(
      `[AppointmentReminders] ${appointments.length} rendez-vous trouvé(s) pour aujourd'hui`,
    );

    for (const appointment of appointments) {
      try {
        const appointmentDate = new Date(appointment.appointment_date);
        const producerName = `${appointment.producer_prenom || ''} ${appointment.producer_nom || ''}`.trim() || 'Producteur';
        const vetName = `${appointment.vet_prenom || ''} ${appointment.vet_nom || ''}`.trim() || 'Vétérinaire';

        // Envoyer une notification au producteur
        await this.notificationsService.createNotification({
          userId: appointment.producer_id,
          type: 'appointment_reminder' as NotificationType,
          title: 'Rappel : Rendez-vous aujourd\'hui',
          message: `Vous avez un rendez-vous avec ${vetName} aujourd'hui à ${this.formatTime(appointmentDate)}`,
          relatedType: 'appointment',
          relatedId: appointment.id,
          actionUrl: `/appointments/${appointment.id}`,
          data: {
            appointmentId: appointment.id,
            vetId: appointment.vet_id,
            vetName,
            appointmentDate: appointmentDate.toISOString(),
            reason: appointment.reason,
            location: appointment.location,
          },
        });

        // Envoyer une notification au vétérinaire
        await this.notificationsService.createNotification({
          userId: appointment.vet_id,
          type: 'appointment_reminder' as NotificationType,
          title: 'Rappel : Rendez-vous aujourd\'hui',
          message: `Vous avez un rendez-vous avec ${producerName} aujourd'hui à ${this.formatTime(appointmentDate)}`,
          relatedType: 'appointment',
          relatedId: appointment.id,
          actionUrl: `/appointments/${appointment.id}`,
          data: {
            appointmentId: appointment.id,
            producerId: appointment.producer_id,
            producerName,
            appointmentDate: appointmentDate.toISOString(),
            reason: appointment.reason,
            location: appointment.location,
          },
        });

        // Marquer le rappel comme envoyé
        await this.databaseService.query(
          `UPDATE vet_appointments 
           SET reminder_sent = TRUE, reminder_sent_at = NOW()
           WHERE id = $1`,
          [appointment.id],
        );

        sent++;
        this.logger.log(
          `[AppointmentReminders] Rappel envoyé pour le rendez-vous ${appointment.id}`,
        );
      } catch (error: any) {
        errors++;
        this.logger.error(
          `[AppointmentReminders] Erreur lors de l'envoi du rappel pour ${appointment.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `[AppointmentReminders] Rappels envoyés: ${sent} succès, ${errors} erreurs`,
    );

    return { sent, errors };
  }

  /**
   * Formater l'heure pour l'affichage
   */
  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
