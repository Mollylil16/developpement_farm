import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO pour créer une demande de rendez-vous
 */
export class CreateAppointmentDto {
  @ApiProperty({
    description: 'ID du vétérinaire',
    example: 'user_1234567890_abc123',
  })
  @IsString()
  @IsNotEmpty()
  vetId: string;

  @ApiProperty({
    description: 'Date et heure du rendez-vous (ISO 8601)',
    example: '2026-01-25T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string;

  @ApiProperty({
    description: 'Raison du rendez-vous',
    example: 'Vaccination des porcelets - 50 sujets à vacciner',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    description: 'Lieu d\'intervention (adresse de la ferme ou autre)',
    example: 'Ferme de Yopougon, Abidjan',
    required: false,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;
}
