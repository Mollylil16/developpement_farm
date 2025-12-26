import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordConversationDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: 'ID de la conversation' })
  @IsString()
  conversation_id: string;

  @ApiProperty({ description: 'Rôle du message', enum: ['user', 'assistant'] })
  @IsString()
  @IsIn(['user', 'assistant'])
  message_role: string;

  @ApiProperty({ description: 'Contenu du message' })
  @IsString()
  message_content: string;

  @ApiPropertyOptional({ description: 'Intention détectée' })
  @IsOptional()
  @IsString()
  intent?: string;

  @ApiPropertyOptional({ description: 'Action exécutée' })
  @IsOptional()
  @IsString()
  action_executed?: string;

  @ApiPropertyOptional({ description: 'Succès de l\'action' })
  @IsOptional()
  @IsBoolean()
  action_success?: boolean;
}

