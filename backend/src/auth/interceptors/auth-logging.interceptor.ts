/**
 * Intercepteur de logging pour l'authentification
 * Enregistre les tentatives de connexion, échecs, etc.
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

interface AuthLog {
  endpoint: string;
  method: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  error?: string;
  userId?: string;
}

@Injectable()
export class AuthLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthLoggingInterceptor.name);
  private logs: AuthLog[] = [];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.get('user-agent');

    const log: AuthLog = {
      endpoint: url,
      method,
      ip,
      userAgent,
      timestamp: new Date(),
      success: false,
    };

    return next.handle().pipe(
      tap((response) => {
        // Succès
        log.success = true;
        if (response?.user?.id) {
          log.userId = response.user.id;
        }
        this.recordLog(log);
      }),
      catchError((error) => {
        // Erreur
        log.success = false;
        log.error = error.message || 'Unknown error';
        this.recordLog(log);
        return throwError(() => error);
      })
    );
  }

  private recordLog(log: AuthLog): void {
    this.logs.push(log);

    // En production, envoyer vers un service de logging (ex: Winston, Sentry)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Envoyer vers un service de logging externe
      this.logger.log(`[AuthLog] ${JSON.stringify(log)}`);
    } else {
      this.logger.debug(`[AuthLog] ${JSON.stringify(log)}`);
    }

    // Garder seulement les 1000 derniers logs en mémoire
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  /**
   * Récupère les logs (pour monitoring/admin)
   */
  getLogs(limit: number = 100): AuthLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Récupère les statistiques
   */
  getStats(): {
    total: number;
    success: number;
    failures: number;
    failureRate: number;
  } {
    const total = this.logs.length;
    const success = this.logs.filter((log) => log.success).length;
    const failures = total - success;
    const failureRate = total > 0 ? (failures / total) * 100 : 0;

    return {
      total,
      success,
      failures,
      failureRate,
    };
  }
}
