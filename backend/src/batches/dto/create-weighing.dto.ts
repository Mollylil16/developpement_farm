import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateWeighingDto {
  @ApiProperty({
    description: 'ID de la bande à peser',
    example: 'batch_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  batch_id: string;

  @ApiProperty({
    description: 'Nombre de porcs à peser',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Le nombre de porcs doit être au moins 1' })
  count: number;

  @ApiProperty({
    description: 'Date de la pesée',
    example: '2025-12-26T10:00:00.000Z',
  })
  @IsDateString()
  weighing_date: string;

  @ApiProperty({
    description: 'Poids moyen en kg',
    example: 85.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Le poids moyen doit être positif' })
  average_weight_kg: number;

  @ApiPropertyOptional({
    description: 'Poids minimal observé en kg',
    example: 80.0,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Le poids minimal doit être positif' })
  min_weight_kg?: number;

  @ApiPropertyOptional({
    description: 'Poids maximal observé en kg',
    example: 90.0,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Le poids maximal doit être positif' })
  max_weight_kg?: number;

  @ApiPropertyOptional({
    description: 'Notes supplémentaires sur la pesée',
    example: 'Pesée effectuée le matin, conditions normales',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

