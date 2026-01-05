import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PeseeMode {
  INDIVIDUEL = 'individuel',
  BANDE = 'bande',
}

export enum PeriodeType {
  J7 = '7j',
  J30 = '30j',
  J90 = '90j',
  TOUT = 'tout',
}

export class PeseesStatsDto {
  @ApiProperty({ description: 'ID du projet', example: 'uuid' })
  @IsString()
  projet_id: string;

  @ApiProperty({ 
    description: 'Mode de suivi', 
    enum: PeseeMode,
    example: PeseeMode.INDIVIDUEL
  })
  @IsEnum(PeseeMode)
  mode: PeseeMode;

  @ApiPropertyOptional({ 
    description: 'Période de calcul', 
    enum: PeriodeType,
    default: PeriodeType.J30
  })
  @IsOptional()
  @IsEnum(PeriodeType)
  periode?: PeriodeType;
}

