import { ApiProperty } from '@nestjs/swagger';

export class CoutsProductionDto {
  @ApiProperty({
    description: 'Date de début de la période',
    example: '2025-01-01T00:00:00.000Z',
  })
  date_debut: string;

  @ApiProperty({
    description: 'Date de fin de la période',
    example: '2025-01-31T23:59:59.999Z',
  })
  date_fin: string;

  @ApiProperty({
    description: 'Total des dépenses OPEX sur la période',
    example: 500000,
  })
  total_opex: number;

  @ApiProperty({
    description: 'Total des amortissements CAPEX sur la période',
    example: 100000,
  })
  total_amortissement_capex: number;

  @ApiProperty({
    description: 'Total des kg vendus sur la période',
    example: 500.5,
  })
  total_kg_vendus: number;

  @ApiProperty({
    description: 'Coût OPEX par kilogramme',
    example: 1000.0,
  })
  cout_kg_opex: number;

  @ApiProperty({
    description: 'Coût complet (OPEX + CAPEX amorti) par kilogramme',
    example: 1200.0,
  })
  cout_kg_complet: number;
}

