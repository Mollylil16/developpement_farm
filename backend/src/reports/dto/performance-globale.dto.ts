import { ApiProperty } from '@nestjs/swagger';

export class PerformanceGlobaleDto {
  @ApiProperty({
    description: 'Total des kg vendus depuis le début',
    example: 5000.5,
  })
  total_kg_vendus_global: number;

  @ApiProperty({
    description: 'Total des dépenses OPEX (charges d exploitation)',
    example: 7500000,
  })
  total_opex_global: number;

  @ApiProperty({
    description: 'Total de l amortissement CAPEX sur la période',
    example: 1200000,
  })
  total_amortissement_capex_global: number;

  @ApiProperty({
    description: 'Coût OPEX par kilogramme',
    example: 1500.0,
  })
  cout_kg_opex_global: number;

  @ApiProperty({
    description: 'Coût complet (OPEX + CAPEX amorti) par kilogramme',
    example: 1740.0,
  })
  cout_kg_complet_global: number;

  @ApiProperty({
    description: 'Prix du marché par kilogramme carcasse',
    example: 2000.0,
  })
  prix_kg_marche: number;

  @ApiProperty({
    description: 'Écart absolu entre prix du marché et coût complet',
    example: 260.0,
  })
  ecart_absolu: number;

  @ApiProperty({
    description: 'Écart en pourcentage',
    example: 13.0,
  })
  ecart_pourcentage: number;

  @ApiProperty({
    description: 'Statut de performance',
    enum: ['rentable', 'fragile', 'perte'],
    example: 'rentable',
  })
  statut: 'rentable' | 'fragile' | 'perte';

  @ApiProperty({
    description: 'Message de diagnostic',
    example: 'Votre coût de production est inférieur au prix du marché...',
  })
  message_diagnostic: string;

  @ApiProperty({
    description: 'Suggestions d amélioration',
    type: [String],
    example: ['Réduire le coût de l aliment...'],
  })
  suggestions: string[];
}

