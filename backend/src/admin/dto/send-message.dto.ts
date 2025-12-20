import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Sujet du message' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Contenu du message (HTML supporté)' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ 
    description: 'Type de message',
    enum: ['support', 'announcement', 'gift', 'promotion', 'warning', 'congratulations']
  })
  @IsEnum(['support', 'announcement', 'gift', 'promotion', 'warning', 'congratulations'])
  type: 'support' | 'announcement' | 'gift' | 'promotion' | 'warning' | 'congratulations';

  @ApiProperty({ 
    description: 'Audience cible',
    enum: ['all', 'active_users', 'new_users', 'specific_users', 'by_role']
  })
  @IsEnum(['all', 'active_users', 'new_users', 'specific_users', 'by_role'])
  target_audience: 'all' | 'active_users' | 'new_users' | 'specific_users' | 'by_role';

  @ApiProperty({ description: 'IDs des utilisateurs ciblés (si target_audience = specific_users)', required: false })
  @IsOptional()
  @IsArray()
  target_user_ids?: string[];

  @ApiProperty({ description: 'Rôles ciblés (si target_audience = by_role)', required: false })
  @IsOptional()
  @IsArray()
  target_roles?: string[];
}

