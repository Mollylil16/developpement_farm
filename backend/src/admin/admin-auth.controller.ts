import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminService: AdminService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion administrateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() loginDto: AdminLoginDto, @Request() req: any) {
    try {
      const ipAddress = req.ip || req.connection?.remoteAddress;
      const userAgent = req.get('user-agent');
      return await this.adminService.login(loginDto.email, loginDto.password, ipAddress, userAgent);
    } catch (error) {
      throw error;
    }
  }
}

