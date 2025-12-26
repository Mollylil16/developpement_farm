import { IsString, IsOptional, IsArray, IsNumber, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLearningDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ 
    description: 'Type d\'apprentissage',
    enum: ['user_correction', 'successful_intent', 'failed_intent', 'keyword_association', 'custom_response']
  })
  @IsString()
  @IsIn(['user_correction', 'successful_intent', 'failed_intent', 'keyword_association', 'custom_response'])
  learning_type: string;

  @ApiProperty({ description: 'Message original de l\'utilisateur' })
  @IsString()
  user_message: string;

  @ApiPropertyOptional({ description: 'Mots-clés extraits du message' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Intention détectée' })
  @IsOptional()
  @IsString()
  detected_intent?: string;

  @ApiPropertyOptional({ description: 'Intention correcte (après correction)' })
  @IsOptional()
  @IsString()
  correct_intent?: string;

  @ApiPropertyOptional({ description: 'Paramètres associés (JSON)' })
  @IsOptional()
  params?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Réponse mémorisée' })
  @IsOptional()
  @IsString()
  memorized_response?: string;

  @ApiPropertyOptional({ description: 'Confiance de l\'apprentissage (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

