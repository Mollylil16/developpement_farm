import { ApiProperty } from '@nestjs/swagger';

export class IndicateursPerformanceDto {
  @ApiProperty({
    description: 'Taux de mortalité en pourcentage',
    example: 5.2,
  })
  taux_mortalite: number;

  @ApiProperty({
    description: 'Taux de croissance basé sur le gain de poids réel en pourcentage',
    example: 15.8,
  })
  taux_croissance: number;

  @ApiProperty({
    description: "Efficacité alimentaire (Gain de poids / Alimentation consommée). Plus la valeur est élevée, meilleure est l'efficacité",
    example: 0.32,
  })
  efficacite_alimentaire: number;

  @ApiProperty({
    description: "Indice de Consommation (IC) = Alimentation consommée / Gain de poids. Plus la valeur est faible, meilleure est l'efficacité",
    example: 3.12,
  })
  indice_consommation: number;

  @ApiProperty({
    description: 'Nombre total de porcs actifs',
    example: 50,
  })
  nombre_porcs_total: number;

  @ApiProperty({
    description: 'Nombre de porcs vendus',
    example: 10,
  })
  nombre_porcs_vivants: number;

  @ApiProperty({
    description: 'Nombre de porcs morts',
    example: 5,
  })
  nombre_porcs_morts: number;

  @ApiProperty({
    description: 'Poids total actuel du cheptel en kg (basé sur les dernières pesées)',
    example: 2500.5,
  })
  poids_total: number;

  @ApiProperty({
    description: 'Alimentation totale consommée en kg sur la période',
    example: 1500.75,
  })
  alimentation_totale: number;

  @ApiProperty({
    description: 'Gain de poids total en kg sur la période',
    example: 480.25,
  })
  gain_poids_total: number;

  @ApiProperty({
    description: 'Période de calcul en jours',
    example: 30,
  })
  periode_jours: number;

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
}

