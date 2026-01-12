import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, Min, Max, IsInt } from 'class-validator';
import { FINANCE_WEIGHT_LIMITS } from '../config/finance-validation.config';

export class CalculerMargesDto {
  @ApiProperty({
    description: `Poids du porc vendu en kg (${FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG} - ${FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG} kg)`,
    example: 120,
    minimum: FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG,
    maximum: FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG,
  })
  @IsNumber({}, { message: 'Le poids doit être un nombre' })
  @IsInt({ message: 'Le poids doit être un nombre entier (en kg)' })
  @IsNotEmpty({ message: 'Le poids est requis' })
  @Min(FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG, {
    message: `Le poids doit être d'au moins ${FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG} kg`,
  })
  @Max(FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG, {
    message: `Le poids ne peut pas dépasser ${FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG} kg`,
  })
  poids_kg: number;
}
