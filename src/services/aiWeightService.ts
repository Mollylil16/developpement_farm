/**
 * Service React Native pour l'IA de pesée
 * Selon spécifications README
 */

import apiClient from './api/apiClient';

export interface PredictWeightRequest {
  image: string; // base64
  pig_id?: string;
  metadata?: {
    race?: string;
    age_days?: number;
    capture_conditions?: Record<string, any>;
  };
}

export interface BatchPredictWeightRequest {
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

export interface VideoPredictWeightRequest {
  videoUri: string;
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

class AiWeightService {
  private baseUrl = '/ai-weight';

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
      const response = await apiClient.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la vérification de santé IA:', error);
      throw error;
    }
  }

  /**
   * Estimation de poids pour un seul porc
   */
  async predictWeight(
    request: PredictWeightRequest,
  ): Promise<WeightEstimationResponse> {
    try {
      const response = await apiClient.post<WeightEstimationResponse>(
        `${this.baseUrl}/predict`,
        request,
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la prédiction de poids:', error);
      throw error;
    }
  }

  /**
   * Estimation de poids pour un groupe de porcs
   */
  async batchPredictWeight(
    request: BatchPredictWeightRequest,
  ): Promise<BatchWeightEstimationResponse> {
    try {
      const response = await apiClient.post<BatchWeightEstimationResponse>(
        `${this.baseUrl}/batch-predict`,
        request,
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la prédiction batch:', error);
      throw error;
    }
  }

  /**
   * Estimation de poids depuis une vidéo avec tracking
   */
  async predictWeightFromVideo(
    request: VideoPredictWeightRequest,
  ): Promise<VideoWeightEstimationResponse> {
    try {
      // Créer un FormData pour envoyer la vidéo
      const formData = new FormData();
      
      // Ajouter la vidéo
      formData.append('video', {
        uri: request.videoUri,
        type: 'video/mp4',
        name: 'pesee.mp4',
      } as any);
      
      // Ajouter les paramètres
      formData.append('projet_id', request.projet_id);
      formData.append('user_id', request.user_id);
      if (request.frame_skip !== undefined) {
        formData.append('frame_skip', request.frame_skip.toString());
      }
      if (request.return_annotated !== undefined) {
        formData.append('return_annotated', request.return_annotated.toString());
      }
      
      const response = await apiClient.post<VideoWeightEstimationResponse>(
        `${this.baseUrl}/video-predict`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la prédiction vidéo:', error);
      throw error;
    }
  }

  /**
   * Récupère les informations sur les modèles
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
      const response = await apiClient.get(`${this.baseUrl}/models`);
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la récupération des modèles:', error);
      throw error;
    }
  }

  /**
   * Convertit une image en base64
   * Note: expo-file-system doit être installé pour utiliser cette fonction
   */
  async imageToBase64(imageUri: string): Promise<string> {
    try {
      // Pour React Native, utiliser expo-file-system
      // Note: Utilisation de declare pour éviter les erreurs TypeScript si le package n'est pas installé
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const FileSystem = require('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Erreur lors de la conversion image en base64:', error);
      throw error;
    }
  }
}

export default new AiWeightService();

