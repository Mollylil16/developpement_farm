import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Configuration du transporteur email
    // En production, utiliser des variables d'environnement
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true pour 465, false pour autres ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
      this.logger.log('Service email configuré');
    } else {
      this.logger.warn('SMTP non configuré - les emails ne seront pas envoyés');
    }
  }

  async sendEmail(to: string, subject: string, htmlContent: string, textContent?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email non envoyé (SMTP non configuré) à: ${to}`);
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@farmtrackpro.com',
        to,
        subject,
        html: htmlContent,
        text: textContent || htmlContent.replace(/<[^>]*>/g, ''), // Version texte sans HTML
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email envoyé à ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi d'email à ${to}:`, error);
      return false;
    }
  }

  async sendBulkEmails(
    recipients: Array<{ email: string; name?: string }>,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const personalizedContent = htmlContent
        .replace(/\{\{name\}\}/g, recipient.name || 'Cher utilisateur')
        .replace(/\{\{email\}\}/g, recipient.email);

      const success = await this.sendEmail(recipient.email, subject, personalizedContent, textContent);
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Petite pause pour éviter de surcharger le serveur SMTP
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { sent, failed };
  }

  generateEmailTemplate(type: string, content: string, userName?: string): string {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #14b8a6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>FarmtrackPro</h1>
          </div>
          <div class="content">
            ${userName ? `<p>Bonjour ${userName},</p>` : '<p>Bonjour,</p>'}
            ${content}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} FarmtrackPro. Tous droits réservés.</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return baseTemplate;
  }
}

