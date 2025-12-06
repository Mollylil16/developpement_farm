import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Activer CORS pour permettre les requêtes depuis l'app React Native
  app.enableCors({
    origin: '*', // En production, spécifier les origines autorisées
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend API démarré sur http://localhost:${port}`);
}

bootstrap();

