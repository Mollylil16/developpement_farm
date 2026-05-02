import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class RecalculerMargesDto {
  @ApiProperty({
    description: 'Date de début de la période (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'La date de début doit être au format ISO 8601' })
  @IsNotEmpty({ message: 'La date de début est requise' })
  date_debut: string;

  @ApiProperty({
    description: 'Date de fin de la période (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z',
  })
  @IsDateString({}, { message: 'La date de fin doit être au format ISO 8601' })
  @IsNotEmpty({ message: 'La date de fin est requise' })
  date_fin: string;
}
