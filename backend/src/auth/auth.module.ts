import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1h';
        return {
          secret: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || '',
          signOptions: {
            expiresIn: expiresIn as any, // Type StringValue accepte '1h', '2d', etc. mais TypeScript nécessite un cast
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
