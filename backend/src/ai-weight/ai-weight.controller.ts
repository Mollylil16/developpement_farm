import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiWeightService, PredictRequest, BatchPredictRequest } from './ai-weight.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

// Interface pour le fichier uploadé (compatible avec multer)
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@Controller('ai-weight')
@UseGuards(JwtAuthGuard)
export class AiWeightController {
  constructor(private readonly aiWeightService: AiWeightService) {}

  @Get('health')
  async checkHealth() {
    try {
      return await this.aiWeightService.checkHealth();
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la vérification',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('predict')
  async predictWeight(@Body() request: PredictRequest) {
    try {
      // Validation basique
      if (!request.image) {
        throw new HttpException(
          'Image requise (base64)',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.aiWeightService.predictWeight(request);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Erreur lors de la prédiction',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('batch-predict')
  async batchPredictWeight(@Body() request: BatchPredictRequest) {
    try {
      // Validation basique
      if (!request.image) {
        throw new HttpException(
          'Image requise (base64)',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.aiWeightService.batchPredictWeight(request);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Erreur lors de la prédiction batch',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('video-predict')
  @UseInterceptors(FileInterceptor('video'))
  async predictWeightFromVideo(
    @UploadedFile() video: UploadedFile,
    @Body() body: { projet_id: string; user_id: string; frame_skip?: string; return_annotated?: string },
    @Req() req: Request,
  ) {
    try {
      // Validation
      if (!video) {
        throw new HttpException(
          'Vidéo requise',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!body.projet_id || !body.user_id) {
        throw new HttpException(
          'projet_id et user_id sont obligatoires',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Récupérer l'user_id depuis le token si disponible
      const userId = body.user_id || (req.user as any)?.id;

      return await this.aiWeightService.predictWeightFromVideo({
        video: video as any,
        projet_id: body.projet_id,
        user_id: userId,
        frame_skip: body.frame_skip ? parseInt(body.frame_skip, 10) : 5,
        return_annotated: body.return_annotated === 'true',
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Erreur lors de la prédiction vidéo',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models')
  async getModelsInfo() {
    try {
      return await this.aiWeightService.getModelsInfo();
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la récupération',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

