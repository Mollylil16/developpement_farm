import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthGoogleDto {
  @ApiProperty({
    description: "Token d'accès Google",
    example: 'ya29.a0AfH6SMB...',
  })
  @IsString({ message: 'Le token Google doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le token Google ne peut pas être vide.' })
  access_token: string;

  @ApiProperty({
    description: 'ID token Google (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString()
  id_token?: string;
}
