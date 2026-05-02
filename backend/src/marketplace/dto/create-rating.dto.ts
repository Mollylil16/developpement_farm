import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RatingCriteriaDto {
  @ApiProperty({ description: 'Qualité (1-5)', example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  quality: number;

  @ApiProperty({ description: 'Professionnalisme (1-5)', example: 4 })
  @IsNumber()
  @Min(1)
  @Max(5)
  professionalism: number;

  @ApiProperty({ description: 'Respect des délais (1-5)', example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  timeliness: number;

  @ApiProperty({ description: 'Communication (1-5)', example: 4 })
  @IsNumber()
  @Min(1)
  @Max(5)
  communication: number;
}

export class CreateRatingDto {
  @ApiProperty({ description: 'ID du producteur', example: 'user_123' })
  @IsString()
  @IsNotEmpty()
  producerId: string;

  @ApiProperty({ description: 'ID de la transaction', example: 'transaction_456' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ description: 'Critères de notation', type: RatingCriteriaDto })
  @IsObject()
  @ValidateNested()
  @Type(() => RatingCriteriaDto)
  ratings: RatingCriteriaDto;

  @ApiProperty({ description: 'Note globale (1-5)', example: 4.5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  overall: number;

  @ApiPropertyOptional({ description: 'Commentaire', example: 'Excellent producteur' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: 'URLs des photos',
    example: ['https://example.com/photo1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
