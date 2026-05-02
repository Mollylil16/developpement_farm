import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, Matches } from 'class-validator';

export class UpdateBatchDto {
  @ApiPropertyOptional({
    description: 'Nom de la loge (ex: A1, B2, etc.)',
    example: 'A1',
    pattern: '^[A-Z]\\d+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]\d+$/, {
    message: 'Le nom de la loge doit être au format A1, B2, etc.',
  })
  pen_name?: string;

  @ApiPropertyOptional({
    description: 'Catégorie de la loge',
    enum: [
      'truie_reproductrice',
      'verrat_reproducteur',
      'porcelets',
      'porcs_croissance',
      'porcs_engraissement',
    ],
  })
  @IsOptional()
  @IsEnum([
    'truie_reproductrice',
    'verrat_reproducteur',
    'porcelets',
    'porcs_croissance',
    'porcs_engraissement',
  ])
  category?: string;

  @ApiPropertyOptional({
    description: 'Position de la loge (gauche ou droite)',
    enum: ['gauche', 'droite'],
  })
  @IsOptional()
  @IsEnum(['gauche', 'droite'])
  position?: 'gauche' | 'droite';

  @ApiPropertyOptional({
    description: 'Notes sur la loge',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

