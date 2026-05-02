import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePeseeDto {
  @ApiPropertyOptional({ description: 'Date de la pesée (ISO string)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Poids en kg' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  poids_kg?: number;

  @ApiPropertyOptional({ description: 'Commentaire' })
  @IsOptional()
  @IsString()
  commentaire?: string;
}
