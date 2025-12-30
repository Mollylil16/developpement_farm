import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Headers de sécurité HTTP (Phase 5 - Priorité Haute)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI nécessite unsafe-inline
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Swagger UI nécessite unsafe-eval
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Désactivé pour compatibilité avec Swagger
  }));

  // Compression HTTP (gzip/brotli) pour réduire la taille des réponses
  app.use(compression());

  // CORS - Configuration pour autoriser le frontend admin
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (comme Postman, curl, etc.) uniquement en dev
      if (!origin) {
        return callback(null, !isProduction);
      }
      // Vérifier si l'origine est autorisée
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // En production, rejeter les origines non autorisées
        // En développement, autoriser toutes les origines
        callback(null, !isProduction);
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    credentials: true,
    maxAge: 86400, // 24 heures
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('FarmTrack Pro API')
    .setDescription("API REST pour l'application FarmTrack Pro - Gestion de ferme porcine")
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Entrez votre token JWT',
        in: 'header',
      },
      'JWT-auth' // Nom du schéma d'authentification
    )
    .addTag('app', 'Informations générales')
    .addTag('auth', 'Authentification')
    .addTag('users', 'Gestion des utilisateurs')
    .addTag('projets', 'Gestion des projets')
    .addTag('production', 'Production (animaux et pesées)')
    .addTag('reproduction', 'Reproduction (gestations et sevrages)')
    .addTag('finance', 'Finance (revenus, dépenses, charges fixes)')
    .addTag('nutrition', 'Nutrition (ingrédients, rations, stocks)')
    .addTag('sante', 'Santé (vaccinations, maladies, traitements, visites)')
    .addTag('collaborations', 'Collaborations entre utilisateurs')
    .addTag('planifications', 'Planifications de tâches')
    .addTag('mortalites', 'Gestion des mortalités')
    .addTag('reports', 'Rapports de croissance')
    .addTag('marketplace', 'Marketplace (listings, offers, transactions)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Garder le token JWT après rafraîchissement
    },
  });

  // Guard global JWT est configuré dans AppModule via APP_GUARD

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  
  const serverUrl = isProduction 
    ? process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://${host}:${port}`
    : `http://${host}:${port}`;
  
  const logger = new Logger('Bootstrap');
  logger.log(`Backend API démarré sur ${serverUrl}`);
  logger.log(`Swagger: ${serverUrl}/api/docs`);
  if (!isProduction) {
    logger.debug('Mode développement - accessible depuis le réseau local');
  }
}

bootstrap();
