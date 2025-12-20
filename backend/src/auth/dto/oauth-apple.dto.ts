import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthAppleDto {
  @ApiProperty({
    description: 'Identity token Apple',
    example: 'eyJraWQiOiJlWGF1bm1...',
  })
  @IsString({ message: "L'identity token Apple doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "L'identity token Apple ne peut pas être vide." })
  identityToken: string;

  @ApiProperty({
    description: 'Authorization code Apple (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @ApiProperty({
    description: "Email de l'utilisateur (optionnel, peut être masqué par Apple)",
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: "Nom complet de l'utilisateur (optionnel)",
    required: false,
  })
  @IsOptional()
  @IsString()
  fullName?: string;
}
