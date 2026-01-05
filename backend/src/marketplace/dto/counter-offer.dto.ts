import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CounterOfferDto {
  @ApiProperty({ description: 'Nouveau prix total proposé', example: 130000 })
  @IsNumber()
  @Min(0)
  nouveau_prix_total: number;

  @ApiPropertyOptional({
    description: 'Message optionnel pour la contre-proposition',
    example: 'Je peux vous proposer ce prix',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

