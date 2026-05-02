import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface PredictRequest {
  image: string; // base64
  pig_id?: string;
  metadata?: {
    race?: string;
    age_days?: number;
    capture_conditions?: Record<string, any>;
  };
}

export interface BatchPredictRequest {
  image: string; // base64
  expected_pigs?: string[];
  metadata?: Record<string, any>;
}

export interface WeightEstimationResponse {
  success: boolean;
  pig_id?: string;
  detection?: {
    bbox: [number, number, number, number];
    confidence: number;
  };
  weight_estimation?: {
    weight_kg: number;
    confidence: number;
    method: string;
    interval: {
      lower: number;
      upper: number;
      margin: number;
    };
    individual_models?: Record<string, any>;
  };
  warnings?: string[];
  processing_time_ms?: number;
}

export interface BatchWeightEstimationResponse {
  success: boolean;
  total_detected: number;
  predictions: Array<{
    pig_id?: string;
    name?: string;
    weight_kg: number;
    confidence: number;
    bbox: [number, number, number, number];
    interval: {
      lower: number;
      upper: number;
      margin: number;
    };
  }>;
  unidentified?: string[];
  processing_time_ms?: number;
}

export interface VideoPredictRequest {
  video: File;
  projet_id: string;
  user_id: string;
  frame_skip?: number;
  return_annotated?: boolean;
}

export interface VideoWeightEstimationResponse {
  success: boolean;
  mode: 'video';
  total_tracks: number;
  total_frames_processed: number;
  pigs: Array<{
    track_id: number;
    pig_id?: string;
    code: string;
    name: string;
    weight_kg: number;
    weight_min: number;
    weight_max: number;
    weight_std: number;
    detections_count: number;
    duration_seconds: number;
    identified: boolean;
  }>;
  summary: {
    total_pigs: number;
    total_weight_kg: number;
    average_weight_kg: number;
    min_weight_kg: number;
    max_weight_kg: number;
  };
  timestamp: string;
}

@Injectable()
export class AiWeightService {
  private readonly logger = new Logger(AiWeightService.name);
  private readonly aiApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiApiUrl =
      this.configService.get<string>('AI_API_URL') ||
      'http://localhost:8000';
    this.logger.log(`IA API URL: ${this.aiApiUrl}`);
  }

  /**
   * Vérifie la santé du service IA
   */
  async checkHealth(): Promise<{
    status: string;
    models_loaded: boolean;
    gpu_available: boolean;
    version: string;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiApiUrl}/api/health`),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors de la vérification de santé', error);
      throw new HttpException(
        'Service IA indisponible',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Estimation de poids pour un seul porc
   */
  async predictWeight(
    request: PredictRequest,
  ): Promise<WeightEstimationResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<WeightEstimationResponse>(
          `${this.aiApiUrl}/api/predict`,
          request,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error('Erreur lors de la prédiction', {
        message: axiosError.message,
        response: axiosError.response?.data,
      });

      if (axiosError.response) {
        throw new HttpException(
          axiosError.response.data || 'Erreur lors de la prédiction',
          axiosError.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Erreur de communication avec le service IA',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Estimation de poids pour un groupe de porcs
   */
  async batchPredictWeight(
    request: BatchPredictRequest,
  ): Promise<BatchWeightEstimationResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<BatchWeightEstimationResponse>(
          `${this.aiApiUrl}/api/batch-predict`,
          request,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error('Erreur lors de la prédiction batch', {
        message: axiosError.message,
        response: axiosError.response?.data,
      });

      if (axiosError.response) {
        throw new HttpException(
          axiosError.response.data || 'Erreur lors de la prédiction batch',
          axiosError.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Erreur de communication avec le service IA',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Estimation de poids depuis une vidéo avec tracking
   */
  async predictWeightFromVideo(
    request: VideoPredictRequest,
  ): Promise<VideoWeightEstimationResponse> {
    try {
      // Créer un FormData pour envoyer la vidéo
      const formData = new FormData();
      formData.append('video', request.video);
      formData.append('projet_id', request.projet_id);
      formData.append('user_id', request.user_id);
      if (request.frame_skip !== undefined) {
        formData.append('frame_skip', request.frame_skip.toString());
      }
      if (request.return_annotated !== undefined) {
        formData.append('return_annotated', request.return_annotated.toString());
      }

      const response = await firstValueFrom(
        this.httpService.post<VideoWeightEstimationResponse>(
          `${this.aiApiUrl}/api/video-predict`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 300000, // 5 minutes pour les vidéos
          },
        ),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error('Erreur lors de la prédiction vidéo', {
        message: axiosError.message,
        response: axiosError.response?.data,
      });

      if (axiosError.response) {
        throw new HttpException(
          axiosError.response.data || 'Erreur lors de la prédiction vidéo',
          axiosError.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Erreur de communication avec le service IA',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Récupère les informations sur les modèles chargés
   */
  async getModelsInfo(): Promise<{
    detection: { model: string; version: string };
    reid: { model: string; version: string };
    weight: {
      models: string[];
      ensemble: boolean;
      version: string;
    };
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiApiUrl}/api/models`),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des modèles', error);
      throw new HttpException(
        'Impossible de récupérer les informations des modèles',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

