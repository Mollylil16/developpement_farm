import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS - Configuration pour autoriser le frontend admin
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (comme Postman, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }
      // Vérifier si l'origine est autorisée
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Pour le développement, autoriser toutes les origines
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
  const host = process.env.HOST || '0.0.0.0'; // Écouter sur toutes les interfaces pour permettre l'accès depuis le réseau local
  await app.listen(port, host);
  console.log(`🚀 Backend API démarré sur http://${host}:${port}`);
  console.log(`📚 Swagger: http://${host}:${port}/api/docs`);
  console.log(`🌐 Accessible depuis le réseau local sur http://192.168.0.214:${port}`);
}

bootstrap();
