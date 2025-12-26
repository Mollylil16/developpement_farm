import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'ID du contenu' })
  @IsString()
  knowledge_id: string;

  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ 
    description: 'Type de feedback',
    enum: ['helpful', 'not_helpful', 'incomplete', 'incorrect']
  })
  @IsString()
  @IsIn(['helpful', 'not_helpful', 'incomplete', 'incorrect'])
  feedback_type: string;

  @ApiPropertyOptional({ description: 'Commentaire optionnel' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Question originale de l\'utilisateur' })
  @IsOptional()
  @IsString()
  original_question?: string;
}

