import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthGoogleDto {
  @ApiProperty({
    description: 'ID token Google obtenu via OAuth',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
  })
  @IsString({ message: 'Le ID token Google doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le ID token Google ne peut pas être vide.' })
  id_token: string;
}
