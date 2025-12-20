import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => {
        return {
          secret: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || '',
          signOptions: {
            expiresIn: '8h', // 8h pour les admins
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, AdminJwtStrategy],
  exports: [AdminService],
})
export class AdminModule {}

