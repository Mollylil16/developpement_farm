import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginSimpleDto } from './dto/login-simple.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OAuthGoogleDto } from './dto/oauth-google.dto';
import { OAuthAppleDto } from './dto/oauth-apple.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requêtes par minute pour l'inscription
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Inscription d'un nouvel utilisateur" })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email ou téléphone déjà utilisé' })
  async register(@Body() registerDto: RegisterDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requêtes par minute pour le login (protection brute force)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connexion d'un utilisateur (avec mot de passe)" })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requêtes par minute pour le login simple
  @Post('login-simple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion simple sans mot de passe (email ou téléphone)' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Utilisateur introuvable' })
  async loginSimple(@Body() loginSimpleDto: LoginSimpleDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.loginSimple(loginSimpleDto.identifier, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rafraîchir le token d'accès" })
  @ApiResponse({ status: 200, description: 'Token rafraîchi avec succès' })
  @ApiResponse({ status: 401, description: 'Token invalide ou expiré' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.authService.refreshToken(refreshTokenDto, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Déconnexion d'un utilisateur" })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  async logout(@Body('refresh_token') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer le profil de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getProfile(@CurrentUser() user: any) {
    const fullUser = await this.authService['usersService'].findOne(user.id);
    const { password_hash, ...result } = fullUser;
    return result;
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion avec Google OAuth' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Token Google invalide' })
  async loginWithGoogle(@Body() oauthDto: OAuthGoogleDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.loginWithGoogle(oauthDto, ipAddress, userAgent);
  }

  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion avec Apple OAuth' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Token Apple invalide' })
  async loginWithApple(@Body() oauthDto: OAuthAppleDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.loginWithApple(oauthDto, ipAddress, userAgent);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requêtes par minute pour éviter l'abus de SMS
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander une réinitialisation de mot de passe' })
  @ApiResponse({ status: 200, description: 'Code de réinitialisation envoyé (si le compte existe)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(dto.telephone);
    return {
      message: 'Si ce numéro est enregistré, un code de réinitialisation a été envoyé par SMS',
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentatives par minute pour vérifier l'OTP
  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier le code OTP de réinitialisation' })
  @ApiResponse({ status: 200, description: 'Code vérifié, token de réinitialisation retourné' })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré' })
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
    const resetToken = await this.authService.verifyResetOtp(dto.telephone, dto.otp);
    return { reset_token: resetToken };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le token' })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé avec succès' })
  @ApiResponse({ status: 401, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.reset_token, dto.new_password);
    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}
