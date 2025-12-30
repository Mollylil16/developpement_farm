import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { RateLimitInterceptor } from '../common/interceptors/rate-limit.interceptor';
import { AuthLoggingInterceptor } from './interceptors/auth-logging.interceptor';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => {
        const rawExpiresIn =
          configService.get<string>('JWT_EXPIRES_IN') || process.env.JWT_EXPIRES_IN || '1h';

        function parseExpiresInToSeconds(value: string): number | null {
          const v = String(value || '').trim();
          if (!v) return null;
          if (/^\d+$/.test(v)) return Number(v);
          const m = v.match(/^(\d+)\s*([smhd])$/i);
          if (!m) return null;
          const n = Number(m[1]);
          const unit = m[2].toLowerCase();
          const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
          return n * mult;
        }

        // Safety clamp: extremely short JWTs cause constant 401 + refresh storms.
        const parsedSeconds = parseExpiresInToSeconds(rawExpiresIn);
        const minSeconds = 300; // 5 minutes

        // CRITICAL: The JWT library's `ms` package interprets "3600" as 3600 MILLISECONDS.
        // To get 3600 seconds, we must pass either a NUMBER (jwt treats as seconds) or a string like "3600s"/"1h".
        // If rawExpiresIn is a pure numeric string, convert to number; otherwise keep as-is.
        let expiresIn: string | number;
        if (parsedSeconds !== null && parsedSeconds < minSeconds) {
          expiresIn = '1h'; // clamped fallback
        } else if (/^\d+$/.test(rawExpiresIn)) {
          // Pure numeric string (e.g. "3600") → pass as number (seconds)
          expiresIn = Number(rawExpiresIn);
        } else {
          // Time string like "1h", "7d" → pass as-is
          expiresIn = rawExpiresIn;
        }

        return {
          secret: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || '',
          signOptions: {
            expiresIn: expiresIn as SignOptions['expiresIn'],
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthLoggingInterceptor,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
