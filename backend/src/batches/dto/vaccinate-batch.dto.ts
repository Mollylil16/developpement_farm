import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VaccinateBatchDto {
  @ApiProperty({ description: 'ID de la bande' })
  @IsString()
  batch_id: string;

  @ApiProperty({ description: 'Nombre de porcs à vacciner' })
  @IsNumber()
  @Min(1)
  count: number;

  @ApiProperty({
    description: 'Type de vaccin',
    enum: ['vitamines', 'deparasitant', 'fer', 'antibiotiques', 'autre'],
  })
  @IsEnum(['vitamines', 'deparasitant', 'fer', 'antibiotiques', 'autre'])
  vaccine_type: string;

  @ApiProperty({ description: 'Nom du produit utilisé' })
  @IsString()
  product_name: string;

  @ApiPropertyOptional({ description: 'Dosage' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiProperty({ description: 'Date de vaccination (ISO string)' })
  @IsDateString()
  vaccination_date: string;

  @ApiProperty({
    description: 'Raison de la vaccination',
    enum: ['suivi_normal', 'renforcement', 'prevention', 'urgence'],
  })
  @IsEnum(['suivi_normal', 'renforcement', 'prevention', 'urgence'])
  reason: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}


